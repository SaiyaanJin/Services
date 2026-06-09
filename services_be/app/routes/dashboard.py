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
    date_str = re.sub(r'\s+', ' ', date_str.strip())
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

def get_first_action_date(action_batch):
    if not action_batch:
        return None
    if isinstance(action_batch, list):
        for item in action_batch:
            d = get_first_action_date(item)
            if d:
                return d
    elif isinstance(action_batch, dict):
        return action_batch.get("Date")
    return None

@router.api_route("/Dashboard", methods=["GET", "POST"])
def get_dashboard_data(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Returns ticket metrics per department and last 7 days trends.
    Uses MongoDB aggregation to compute total, resolved, and pending counts in a single query.
    """
    pipeline = [
        # Filter out soft-deleted tickets if any
        {"$match": {"is_deleted": {"$ne": True}}},
        # Group by department and status
        {
            "$group": {
                "_id": {
                    "department": "$Department",
                    "status": "$Present_Status"
                },
                "count": {"$sum": 1}
            }
        }
    ]

    cursor = db.tickets_collection.aggregate(pipeline)
    
    # Process aggregation results
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
        
        # In original app, status other than "New Service Request" and "Under Progress" is considered "Resolved"
        if status not in ("New Service Request", "Under Progress"):
            dept_stats[dept]["Resolved"] += count
        else:
            dept_stats[dept]["Pending"] += count

    # Format output list
    final_output = []
    for dept, stats in dept_stats.items():
        stats["Department"] = dept
        final_output.append(stats)

    # If database is empty, return empty list or departments with zero stats
    if not final_output:
        # Fallback list of departments to return
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
        final_output = [
            {"Total": 0, "Resolved": 0, "Pending": 0, "Department": d}
            for d in default_depts
        ]

    # Sort by Total tickets descending
    final_output = sorted(final_output, key=lambda x: x["Total"], reverse=True)

    # Calculate real KPI trends
    now = datetime.now()
    seven_days_ago = now - timedelta(days=7)
    
    tickets_cursor = db.tickets_collection.find({"is_deleted": {"$ne": True}})
    
    new_tickets_7d = 0
    resolved_tickets_7d = 0
    pending_tickets_7d = 0
    
    for t in tickets_cursor:
        input_date = parse_date(t.get("Input_Date"))
        status = t.get("Present_Status")
        
        # Check if created in last 7 days
        if input_date and seven_days_ago <= input_date <= now:
            new_tickets_7d += 1
            if status in ("New Service Request", "Under Progress"):
                pending_tickets_7d += 1
                
        # Check if resolved in last 7 days
        if status not in ("New Service Request", "Under Progress"):
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

    return {
        "department_stats": final_output,
        "trends": {
            "new_tickets_7d": new_tickets_7d,
            "resolved_tickets_7d": resolved_tickets_7d,
            "pending_tickets_7d": pending_tickets_7d
        }
    }

