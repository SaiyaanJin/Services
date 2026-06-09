from fastapi import APIRouter, Depends, Request
from app.db import db
from app.middleware.auth import get_current_user
from app.utils import parse_request_payload

router = APIRouter()

@router.api_route("/Dashboard", methods=["GET", "POST"])
def get_dashboard_data(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Returns ticket metrics per department.
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
    return final_output
