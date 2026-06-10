from fastapi import APIRouter, Depends, Request
from app.db import db
from app.middleware.auth import get_current_user
from app.utils import parse_request_payload
import re
from datetime import datetime, timedelta

router = APIRouter()

def parse_date(date_str):
    if not date_str:
        return None
    date_str = re.sub(r'\s+', ' ', str(date_str).strip())
    formats = [
        "%d-%m-%Y %I:%M %p",
        "%d-%m-%Y %I:%M%p",
        "%d-%m-%Y %H:%M",
        "%d-%m-%Y %H:%M:%S",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str.upper(), fmt)
        except ValueError:
            pass
    return None


@router.api_route("/Dashboard", methods=["GET", "POST"])
def get_dashboard_data(
    request: Request,
    date_from: str = None,
    date_to: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns ticket metrics per department and last 7 days trends.
    Computes real avg_response_time from audit_logs.
    Supports optional date_from/date_to query params (YYYY-MM-DD format).
    """
    def parse_date_range(s):
        if not s:
            return None
        for fmt in ["%Y-%m-%d", "%d-%m-%Y"]:
            try:
                return datetime.strptime(s, fmt)
            except ValueError:
                pass
        return None

    d_from = parse_date_range(date_from)
    d_to = parse_date_range(date_to)

    # Build department stats via aggregation
    match_filter = {"is_deleted": {"$ne": True}}
    pipeline = [
        {"$match": match_filter},
        {"$group": {
            "_id": {"department": "$Department", "status": "$Present_Status"},
            "count": {"$sum": 1}
        }}
    ]

    cursor = db.tickets_collection.aggregate(pipeline)
    dept_stats = {}
    for doc in cursor:
        dept = doc["_id"]["department"]
        status = doc["_id"]["status"]
        count = doc["count"]
        if not dept:
            continue
        if dept not in dept_stats:
            dept_stats[dept] = {"Total": 0, "Resolved": 0, "Pending": 0}
        dept_stats[dept]["Total"] += count
        if status not in ("New Service Request", "Under Progress"):
            dept_stats[dept]["Resolved"] += count
        else:
            dept_stats[dept]["Pending"] += count

    final_output = []
    for dept, stats in dept_stats.items():
        stats["Department"] = dept
        final_output.append(stats)

    if not final_output:
        default_depts = [
            "Human Resource : Human Resource",
            "Contract Services : Contract Services",
            "Finance : Finance & Accounts",
            "Cyber Security : Cyber Security",
            "System Operation : Post Despatch",
            "System Operation : Real Time Operation",
            "System Operation : Operational Planning",
            "Market Operation : Open Access",
            "Market Operation : Market Coordination",
            "Market Operation : Interface Energy Metering, Accounting & Settlement",
            "Market Operation : Regulatory Affairs, Market Operation planning & Coordination",
            "Logistics : TS",
            "Logistics : IT",
            "Logistics : Communication",
            "Logistics : OT (Decision Support)"
        ]
        final_output = [{"Total": 0, "Resolved": 0, "Pending": 0, "Department": d} for d in default_depts]

    final_output = sorted(final_output, key=lambda x: x["Total"], reverse=True)

    # 7-day trends
    now = datetime.now()
    seven_days_ago = now - timedelta(days=7)

    tickets_cursor = db.tickets_collection.find({"is_deleted": {"$ne": True}})

    new_tickets_7d = 0
    resolved_tickets_7d = 0
    pending_tickets_7d = 0

    for t in tickets_cursor:
        input_date = parse_date(t.get("Input_Date"))
        status_val = t.get("Present_Status")

        if input_date and seven_days_ago <= input_date <= now:
            new_tickets_7d += 1
            if status_val in ("New Service Request", "Under Progress"):
                pending_tickets_7d += 1

        if status_val not in ("New Service Request", "Under Progress"):
            resolved_in_7d = False
            if input_date and seven_days_ago <= input_date <= now:
                resolved_in_7d = True
            else:
                actions = t.get("Actions_Taken") or []
                flat_actions = []
                if isinstance(actions, list):
                    for act in actions:
                        if isinstance(act, list):
                            flat_actions.extend(act)
                        else:
                            flat_actions.append(act)
                for act in flat_actions:
                    if isinstance(act, dict):
                        act_date = parse_date(act.get("Date"))
                        if act_date and seven_days_ago <= act_date <= now:
                            resolved_in_7d = True
                            break
            if resolved_in_7d:
                resolved_tickets_7d += 1

    # Real avg response time from audit_logs (time from ticket creation to first StatusChange)
    avg_response_hours = None
    try:
        # Get all resolved tickets
        resolved_tickets = list(db.tickets_collection.find(
            {"Present_Status": {"$nin": ["New Service Request", "Under Progress"]}, "is_deleted": {"$ne": True}},
            {"Docket_Number": 1, "Input_Date": 1, "_id": 0}
        ).limit(500))

        response_times = []
        for t in resolved_tickets:
            created = parse_date(t.get("Input_Date"))
            if not created:
                continue
            first_action = db.audit_logs_collection.find_one(
                {"docket_number": t["Docket_Number"], "action": "status_change"},
                sort=[("timestamp", 1)]
            )
            if first_action:
                delta_hours = (first_action["timestamp"] - created).total_seconds() / 3600
                if delta_hours >= 0:
                    response_times.append(delta_hours)

        if response_times:
            avg_response_hours = round(sum(response_times) / len(response_times), 1)
    except Exception:
        pass

    # Volume by day for last 30 days
    volume_by_day = []
    try:
        vol_pipeline = [
            {"$match": {"is_deleted": {"$ne": True}}},
            {"$addFields": {
                "parsed_date": {
                    "$dateFromString": {
                        "dateString": "$Input_Date",
                        "format": "%d-%m-%Y %H:%M:%S",
                        "onError": None,
                        "onNull": None
                    }
                }
            }},
            {"$match": {"parsed_date": {"$ne": None}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$parsed_date"}},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}},
            {"$limit": 30}
        ]
        vol_docs = list(db.tickets_collection.aggregate(vol_pipeline))
        volume_by_day = [{"date": d["_id"], "count": d["count"]} for d in vol_docs]
    except Exception:
        pass

    # Priority breakdown
    priority_breakdown = {}
    try:
        prio_pipeline = [
            {"$match": {"is_deleted": {"$ne": True}}},
            {"$group": {"_id": "$Priority", "count": {"$sum": 1}}}
        ]
        for doc in db.tickets_collection.aggregate(prio_pipeline):
            priority_breakdown[doc["_id"] or "Medium"] = doc["count"]
    except Exception:
        pass

    # My personal stats
    user_str = f"{current_user['name']} ({current_user['emp_id']})"
    my_tickets = list(db.tickets_collection.find(
        {"Data_Filled_by": user_str, "is_deleted": {"$ne": True}},
        {"Present_Status": 1, "SLA_Deadline": 1, "_id": 0}
    ))
    my_total = len(my_tickets)
    my_resolved = sum(1 for t in my_tickets if t.get("Present_Status") not in ["New Service Request", "Under Progress"])
    my_overdue = sum(
        1 for t in my_tickets
        if isinstance(t.get("SLA_Deadline"), datetime)
        and t["SLA_Deadline"] < now
        and t.get("Present_Status") in ["New Service Request", "Under Progress"]
    )

    return {
        "department_stats": final_output,
        "trends": {
            "new_tickets_7d": new_tickets_7d,
            "resolved_tickets_7d": resolved_tickets_7d,
            "pending_tickets_7d": pending_tickets_7d
        },
        "avg_response_hours": avg_response_hours,
        "volume_by_day": volume_by_day,
        "priority_breakdown": priority_breakdown,
        "my_stats": {
            "total": my_total,
            "resolved": my_resolved,
            "overdue": my_overdue
        }
    }
