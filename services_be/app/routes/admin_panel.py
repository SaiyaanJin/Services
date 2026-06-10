import json
import logging
import requests
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status, BackgroundTasks
from app.db import db
from app.middleware.auth import get_current_user, require_admin
from app.utils import parse_request_payload
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# ──────────────────────────────────────────────────────────────
# USERS
# ──────────────────────────────────────────────────────────────

@router.get("/admin/users")
def get_users(current_user: dict = Depends(get_current_user)):
    """
    Returns employee list from SSO /emp_data endpoint.
    Used for assignment picker and watchers autocomplete.
    Available to all authenticated users (needed for assignment UI).
    """
    try:
        res = requests.get(
            f"{settings.SSO_BASE_URL}/emp_data",
            headers={"Data": settings.SSO_API_KEY},
            timeout=8
        )
        if res.status_code == 200:
            employees = res.json()
            # Return only safe fields
            return [
                {
                    "emp_id": str(e.get("Emp_id", "")),
                    "name": e.get("Name", ""),
                    "email": e.get("Mail", ""),
                    "department": e.get("Department", "")
                }
                for e in employees if e.get("Emp_id") and e.get("Name")
            ]
        return []
    except Exception as e:
        logger.error(f"Failed to fetch employee list from SSO: {e}")
        return []


# ──────────────────────────────────────────────────────────────
# TEMPLATES
# ──────────────────────────────────────────────────────────────

@router.get("/admin/templates")
def get_templates(current_user: dict = Depends(get_current_user)):
    """Returns all ticket templates"""
    try:
        templates = list(db.ticket_templates_collection.find({}, {"_id": 1, "name": 1, "department": 1, "default_subject": 1, "default_description": 1, "created_by": 1, "created_at": 1}))
        for t in templates:
            t["id"] = str(t.pop("_id"))
            if isinstance(t.get("created_at"), datetime):
                t["created_at"] = t["created_at"].isoformat()
        return templates
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch templates: {e}")


@router.post("/admin/templates")
def create_template(request: Request, current_user: dict = Depends(require_admin)):
    """Admin only. Creates a new ticket template."""
    payload = parse_request_payload(request)
    if not payload:
        raise HTTPException(status_code=400, detail="Missing payload")
    if isinstance(payload, str):
        payload = json.loads(payload)

    name = payload.get("name", "").strip()
    department = payload.get("department", "").strip()
    default_subject = payload.get("default_subject", "").strip()
    default_description = payload.get("default_description", "").strip()

    if not name or not department or not default_subject:
        raise HTTPException(status_code=400, detail="name, department, and default_subject are required")

    try:
        result = db.ticket_templates_collection.insert_one({
            "name": name,
            "department": department,
            "default_subject": default_subject,
            "default_description": default_description,
            "created_by": current_user["name"],
            "created_at": datetime.now()
        })
        return {"status": "ok", "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create template: {e}")


@router.delete("/admin/templates/{template_id}")
def delete_template(template_id: str, current_user: dict = Depends(require_admin)):
    """Admin only. Deletes a template."""
    try:
        result = db.ticket_templates_collection.delete_one({"_id": ObjectId(template_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Template not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete template: {e}")


# ──────────────────────────────────────────────────────────────
# TAGS
# ──────────────────────────────────────────────────────────────

@router.get("/admin/tags")
def get_tags(current_user: dict = Depends(get_current_user)):
    """Returns all configured tags"""
    try:
        tags = list(db.tag_config_collection.find({}, {"_id": 1, "name": 1, "color": 1}))
        for t in tags:
            t["id"] = str(t.pop("_id"))
        return tags
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tags: {e}")


@router.post("/admin/tags")
def create_tag(request: Request, current_user: dict = Depends(require_admin)):
    """Admin only. Creates a new tag."""
    payload = parse_request_payload(request)
    if not payload:
        raise HTTPException(status_code=400, detail="Missing payload")
    if isinstance(payload, str):
        payload = json.loads(payload)

    name = payload.get("name", "").strip().lower().replace(" ", "-")
    color = payload.get("color", "#6366f1")

    if not name:
        raise HTTPException(status_code=400, detail="Tag name is required")

    if db.tag_config_collection.find_one({"name": name}):
        raise HTTPException(status_code=409, detail=f"Tag '{name}' already exists")

    try:
        result = db.tag_config_collection.insert_one({
            "name": name,
            "color": color,
            "created_at": datetime.now()
        })
        return {"status": "ok", "id": str(result.inserted_id), "name": name, "color": color}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create tag: {e}")


@router.delete("/admin/tags/{tag_id}")
def delete_tag(tag_id: str, current_user: dict = Depends(require_admin)):
    """Admin only. Deletes a tag."""
    try:
        result = db.tag_config_collection.delete_one({"_id": ObjectId(tag_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Tag not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete tag: {e}")


# ──────────────────────────────────────────────────────────────
# ADMIN ROLES
# ──────────────────────────────────────────────────────────────

@router.get("/admin/roles")
def get_admin_roles(current_user: dict = Depends(require_admin)):
    """Returns list of users with custom roles from admin_roles collection"""
    try:
        roles = list(db.admin_roles_collection.find({}, {"_id": 0}))
        return roles
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch roles: {e}")


@router.post("/admin/roles")
def set_admin_role(request: Request, current_user: dict = Depends(require_admin)):
    """Admin only. Grants or revokes admin role for an employee."""
    payload = parse_request_payload(request)
    if not payload:
        raise HTTPException(status_code=400, detail="Missing payload")
    if isinstance(payload, str):
        payload = json.loads(payload)

    emp_id = str(payload.get("emp_id", "")).strip()
    name = payload.get("name", "").strip()
    role = payload.get("role", "user")

    if not emp_id:
        raise HTTPException(status_code=400, detail="emp_id is required")
    if role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="role must be 'admin' or 'user'")

    try:
        db.admin_roles_collection.update_one(
            {"emp_id": emp_id},
            {"$set": {"emp_id": emp_id, "name": name, "role": role, "granted_by": current_user["name"], "granted_at": datetime.now()}},
            upsert=True
        )
        
        # Clear token cache for the target user to apply role changes immediately
        try:
            from app.middleware.auth import TOKEN_CACHE
            tokens_to_remove = [
                token_key for token_key, entry in TOKEN_CACHE.items()
                if entry.get("user_data", {}).get("emp_id") == emp_id
            ]
            for token_key in tokens_to_remove:
                TOKEN_CACHE.pop(token_key, None)
            logger.info(f"Cleared token cache for user {emp_id} after role update to {role}")
        except Exception as ce:
            logger.error(f"Failed to clear token cache for user {emp_id}: {ce}")
            
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set role: {e}")


# ──────────────────────────────────────────────────────────────
# FULL ANALYTICS
# ──────────────────────────────────────────────────────────────

@router.get("/admin/stats/full")
def get_full_stats(
    date_from: str = None,
    date_to: str = None,
    current_user: dict = Depends(require_admin)
):
    """
    Admin only. Returns comprehensive analytics computed from real data:
    - Avg time-to-first-response per department (from audit_logs)
    - Avg time-to-resolution per department (from audit_logs)
    - Volume by day (last 30 days)
    - CSAT scores per department
    - SLA breach count per department
    - Priority distribution
    """
    from datetime import timedelta
    import re

    def parse_date_str(s):
        if not s:
            return None
        for fmt in ["%Y-%m-%d", "%d-%m-%Y"]:
            try:
                return datetime.strptime(s, fmt)
            except ValueError:
                pass
        return None

    now = datetime.now()
    d_from = parse_date_str(date_from) or (now - timedelta(days=30))
    d_to = parse_date_str(date_to) or now

    try:
        # Volume by day
        pipeline_volume = [
            {"$match": {"is_deleted": {"$ne": True}}},
            {"$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": {"$toDate": "$Input_Date"}
                    }
                },
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}},
            {"$limit": 60}
        ]

        # Priority breakdown
        priority_pipeline = [
            {"$match": {"is_deleted": {"$ne": True}}},
            {"$group": {"_id": "$Priority", "count": {"$sum": 1}}}
        ]
        priority_docs = list(db.tickets_collection.aggregate(priority_pipeline))
        priority_breakdown = {doc["_id"] or "Medium": doc["count"] for doc in priority_docs}

        # CSAT per department
        csat_pipeline = [
            {"$match": {"CSAT_Rating": {"$exists": True}, "is_deleted": {"$ne": True}}},
            {"$group": {
                "_id": "$Department",
                "avg_csat": {"$avg": "$CSAT_Rating"},
                "count": {"$sum": 1}
            }}
        ]
        csat_docs = list(db.tickets_collection.aggregate(csat_pipeline))
        csat_by_dept = {
            doc["_id"]: {"avg": round(doc["avg_csat"], 2), "count": doc["count"]}
            for doc in csat_docs if doc["_id"]
        }

        # SLA breach count per department
        now_dt = datetime.now()
        sla_breach_pipeline = [
            {"$match": {
                "SLA_Deadline": {"$lt": now_dt},
                "Present_Status": {"$in": ["New Service Request", "Under Progress"]},
                "is_deleted": {"$ne": True}
            }},
            {"$group": {"_id": "$Department", "breach_count": {"$sum": 1}}}
        ]
        sla_breach_docs = list(db.tickets_collection.aggregate(sla_breach_pipeline))
        sla_breaches = {doc["_id"]: doc["breach_count"] for doc in sla_breach_docs if doc["_id"]}

        # Avg resolution time per department from audit_logs
        # We look for pairs: ticket creation -> first StatusChange action
        dept_resolution = {}
        all_tickets = list(db.tickets_collection.find(
            {"Present_Status": {"$nin": ["New Service Request", "Under Progress"]}, "is_deleted": {"$ne": True}},
            {"Docket_Number": 1, "Department": 1, "Input_Date": 1, "_id": 0}
        ))

        def parse_date(date_str):
            if not date_str:
                return None
            date_str = re.sub(r'\s+', ' ', str(date_str).strip())
            formats = ["%d-%m-%Y %I:%M %p", "%d-%m-%Y %I:%M%p", "%d-%m-%Y %H:%M", "%d-%m-%Y %H:%M:%S"]
            for fmt in formats:
                try:
                    return datetime.strptime(date_str.upper(), fmt)
                except ValueError:
                    pass
            return None

        for t in all_tickets:
            dept = t.get("Department")
            created = parse_date(t.get("Input_Date"))
            if not dept or not created:
                continue

            # Find first resolution audit log entry
            first_resolution = db.audit_logs_collection.find_one(
                {"docket_number": t["Docket_Number"], "action": "status_change"},
                sort=[("timestamp", 1)]
            )
            if first_resolution:
                resolution_time = first_resolution["timestamp"]
                hours = (resolution_time - created).total_seconds() / 3600
                if dept not in dept_resolution:
                    dept_resolution[dept] = []
                dept_resolution[dept].append(hours)

        avg_resolution = {
            dept: round(sum(times) / len(times), 1)
            for dept, times in dept_resolution.items()
            if times
        }

        # My stats for the current user
        user_str = f"{current_user['name']} ({current_user['emp_id']})"
        my_tickets = list(db.tickets_collection.find(
            {"Data_Filled_by": user_str, "is_deleted": {"$ne": True}},
            {"Present_Status": 1, "SLA_Deadline": 1, "_id": 0}
        ))
        my_total = len(my_tickets)
        my_resolved = sum(1 for t in my_tickets if t.get("Present_Status") not in ["New Service Request", "Under Progress"])
        my_overdue = sum(
            1 for t in my_tickets
            if t.get("SLA_Deadline") and isinstance(t.get("SLA_Deadline"), datetime)
            and t["SLA_Deadline"] < now_dt
            and t.get("Present_Status") in ["New Service Request", "Under Progress"]
        )

        return {
            "priority_breakdown": priority_breakdown,
            "csat_by_department": csat_by_dept,
            "sla_breaches_by_department": sla_breaches,
            "avg_resolution_hours_by_department": avg_resolution,
            "my_stats": {
                "total": my_total,
                "resolved": my_resolved,
                "overdue": my_overdue
            }
        }

    except Exception as e:
        logger.error(f"Full stats error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to compute stats: {e}")


# ──────────────────────────────────────────────────────────────
# ANNOUNCEMENTS
# ──────────────────────────────────────────────────────────────

@router.post("/admin/announce")
def send_announcement(request: Request, background_tasks: BackgroundTasks, current_user: dict = Depends(require_admin)):
    """Admin only. Sends an announcement email to all employees."""
    payload = parse_request_payload(request)
    if not payload:
        raise HTTPException(status_code=400, detail="Missing payload")
    if isinstance(payload, str):
        payload = json.loads(payload)

    subject = payload.get("subject", "").strip()
    body = payload.get("body", "").strip()

    if not subject or not body:
        raise HTTPException(status_code=400, detail="Both 'subject' and 'body' are required")

    try:
        # Fetch all employee emails from SSO
        res = requests.get(
            f"{settings.SSO_BASE_URL}/emp_data",
            headers={"Data": settings.SSO_API_KEY},
            timeout=8
        )
        employees = res.json() if res.status_code == 200 else []
        all_emails = [e.get("Mail") for e in employees if e.get("Mail") and "@" in str(e.get("Mail", ""))]

        if not all_emails:
            raise HTTPException(status_code=500, detail="Could not fetch employee list from SSO")

        from app.services.email_service import email_service
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #fff; padding: 20px; text-align: center;">
                    <h2 style="margin: 0;">📢 ERLDC Services Announcement</h2>
                </div>
                <div style="padding: 24px; background: #fff;">
                    <p style="margin-top: 0; white-space: pre-wrap;">{body}</p>
                    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #64748b;">Sent by {current_user['name']} via ERLDC Services Portal.</p>
                </div>
            </div>
        </body>
        </html>
        """
        background_tasks.add_task(
            email_service._send_exchange_mail,
            subject=f"[ERLDC Services] {subject}",
            html_body=html_body,
            to_recipients=all_emails[:1],  # Primary recipient
            cc_recipients=all_emails[1:]   # Rest as CC to avoid spam filters
        )
        return {"status": "ok", "recipients": len(all_emails)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send announcement: {e}")


# ──────────────────────────────────────────────────────────────
# RECURRING TICKETS
# ──────────────────────────────────────────────────────────────

@router.get("/admin/recurring")
def get_recurring_tickets(current_user: dict = Depends(require_admin)):
    """Admin only. Returns all recurring ticket schedules."""
    try:
        schedules = list(db.recurring_tickets_collection.find({}))
        for s in schedules:
            s["id"] = str(s.pop("_id"))
            if isinstance(s.get("next_run"), datetime):
                s["next_run"] = s["next_run"].isoformat()
            if isinstance(s.get("created_at"), datetime):
                s["created_at"] = s["created_at"].isoformat()
        return schedules
    except Exception as e:
        logger.error(f"Failed to fetch recurring tickets: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch recurring tickets")


@router.post("/admin/recurring")
def create_recurring_ticket(request: Request, current_user: dict = Depends(require_admin)):
    """Admin only. Configures a new recurring ticket from a template."""
    payload = parse_request_payload(request)
    if not payload:
        raise HTTPException(status_code=400, detail="Missing payload")
    if isinstance(payload, str):
        payload = json.loads(payload)

    template_id = payload.get("template_id", "").strip()
    cron_schedule = payload.get("cron_schedule", "daily").strip().lower()
    priority = payload.get("priority", "Medium").strip()
    tags = payload.get("tags", [])

    if not template_id:
        raise HTTPException(status_code=400, detail="template_id is required")

    # Verify template exists
    template = db.ticket_templates_collection.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    try:
        now = datetime.now()
        # Calculate initial next run (e.g. tomorrow)
        next_run = now + timedelta(days=1)
        if "weekly" in cron_schedule:
            next_run = now + timedelta(weeks=1)
        elif "monthly" in cron_schedule:
            next_run = now + timedelta(days=30)

        result = db.recurring_tickets_collection.insert_one({
            "template_id": template_id,
            "template_name": template.get("name"),
            "cron_schedule": cron_schedule,
            "priority": priority,
            "tags": tags,
            "next_run": next_run,
            "created_by": current_user["name"],
            "created_at": now
        })
        return {"status": "ok", "id": str(result.inserted_id)}
    except Exception as e:
        logger.error(f"Failed to create recurring ticket schedule: {e}")
        raise HTTPException(status_code=500, detail="Failed to create recurring ticket schedule")


@router.delete("/admin/recurring/{schedule_id}")
def delete_recurring_ticket(schedule_id: str, current_user: dict = Depends(require_admin)):
    """Admin only. Removes a recurring ticket schedule."""
    try:
        result = db.recurring_tickets_collection.delete_one({"_id": ObjectId(schedule_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Recurring ticket schedule not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete recurring ticket schedule {schedule_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete schedule")


@router.get("/auth/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """Returns the authenticated user details with their resolved database role"""
    return current_user

