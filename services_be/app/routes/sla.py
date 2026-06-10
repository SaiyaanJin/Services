import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from app.db import db
from app.middleware.auth import get_current_user, require_admin
from app.utils import parse_request_payload

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/sla/policies")
def get_sla_policies(current_user: dict = Depends(get_current_user)):
    """Returns all SLA policies (hours per department)"""
    try:
        policies = list(db.sla_policies_collection.find({}, {"_id": 0}))
        return policies
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch SLA policies: {e}")


@router.put("/sla/policies")
def update_sla_policy(request: Request, current_user: dict = Depends(require_admin)):
    """Admin only. Updates SLA policy for a department. Body: { department, sla_hours }"""
    payload = parse_request_payload(request)
    if not payload:
        raise HTTPException(status_code=400, detail="Missing payload")

    if isinstance(payload, str):
        import json
        payload = json.loads(payload)

    department = payload.get("department")
    sla_hours = payload.get("sla_hours")

    if not department or sla_hours is None:
        raise HTTPException(status_code=400, detail="Both 'department' and 'sla_hours' are required")

    try:
        sla_hours = int(sla_hours)
        if sla_hours < 1:
            raise ValueError("SLA hours must be positive")
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="'sla_hours' must be a positive integer")

    try:
        db.sla_policies_collection.update_one(
            {"department": department},
            {"$set": {"sla_hours": sla_hours}},
            upsert=True
        )
        return {"status": "ok", "department": department, "sla_hours": sla_hours}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update SLA policy: {e}")


@router.get("/sla/breached")
def get_breached_tickets(current_user: dict = Depends(require_admin)):
    """Admin only. Returns all tickets that have breached their SLA deadline and are still open."""
    from datetime import datetime
    try:
        now = datetime.now()
        breached = list(db.tickets_collection.find(
            {
                "SLA_Deadline": {"$lt": now},
                "Present_Status": {"$in": ["New Service Request", "Under Progress"]},
                "is_deleted": {"$ne": True}
            },
            {"_id": 0, "Docket_Number": 1, "Subject": 1, "Department": 1,
             "Present_Status": 1, "Input_Date": 1, "SLA_Deadline": 1, "Priority": 1}
        ).sort("SLA_Deadline", 1))

        for t in breached:
            if isinstance(t.get("SLA_Deadline"), datetime):
                t["SLA_Deadline"] = t["SLA_Deadline"].isoformat()
        return breached
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch breached tickets: {e}")
