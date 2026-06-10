import json
import logging
import re
import jwt as pyjwt
import requests
from datetime import datetime, timedelta
from bson import ObjectId
from fastapi import APIRouter, Depends, Request, HTTPException, status, BackgroundTasks
from app.db import db
from app.middleware.auth import get_current_user
from app.utils import parse_request_payload, get_normalized_departments, get_sso_department_code
from app.services.email_service import email_service
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory cache for employee directory to avoid querying SSO on every email update
EMP_DIRECTORY_CACHE = {"data": None, "expiry": 0}
CACHE_DURATION = 1800  # Cache employee directory for 30 minutes


def get_employee_email(emp_name: str, emp_id: str) -> str:
    """Helper to look up an employee's email address from ERLDC SSO employee directory"""
    import time
    now = time.time()

    if EMP_DIRECTORY_CACHE["data"] and EMP_DIRECTORY_CACHE["expiry"] > now:
        emp_list = EMP_DIRECTORY_CACHE["data"]
    else:
        try:
            res = requests.get(
                f"{settings.SSO_BASE_URL}/emp_data",
                headers={"Data": settings.SSO_API_KEY},
                timeout=5
            )
            if res.status_code == 200:
                emp_list = res.json()
                EMP_DIRECTORY_CACHE["data"] = emp_list
                EMP_DIRECTORY_CACHE["expiry"] = now + CACHE_DURATION
            else:
                logger.error(f"Failed to fetch employee list from SSO: HTTP {res.status_code}")
                emp_list = []
        except Exception as e:
            logger.error(f"Error calling SSO employee data endpoint: {e}")
            emp_list = []

    for item in emp_list:
        if item.get("Name", "").strip().lower() == emp_name.strip().lower() and \
           str(item.get("Emp_id", "")).strip() == str(emp_id).strip():
            return item.get("Mail", "")
    return ""


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


def _format_ticket(item: dict) -> dict:
    """Normalize ticket fields for API response"""
    if "File" not in item or not item["File"]:
        item["File"] = "No file was Uploaded"
    if item.get("Present_Status") == "Resolved" and item.get("Old_Status") == "Resolved":
        item["Ticket_Closed"] = True
    else:
        item["Ticket_Closed"] = item.get("Ticket_Closed", False)
    # Serialize SLA_Deadline to ISO string
    if isinstance(item.get("SLA_Deadline"), datetime):
        item["SLA_Deadline"] = item["SLA_Deadline"].isoformat()
    return item


def _notify_watchers(ticket: dict, message: str, notif_type: str, exclude_emp_id: str = None):
    """Create in-app notifications for all watchers of a ticket"""
    watchers = ticket.get("Watchers", [])
    for watcher in watchers:
        watcher_id = watcher.get("emp_id")
        if watcher_id and watcher_id != exclude_emp_id:
            db.create_notification(
                recipient_emp_id=watcher_id,
                recipient_name=watcher.get("name", ""),
                docket_number=ticket.get("Docket_Number"),
                notif_type=notif_type,
                message=message
            )


# ──────────────────────────────────────────────────────────────
# CREATE TICKET
# ──────────────────────────────────────────────────────────────

@router.api_route("/DataInsert", methods=["GET", "POST"])
def insert_ticket(request: Request, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """
    Creates a new ticket.
    Generates an atomic docket number, stores it in MongoDB, and triggers email notifications.
    Now supports: Priority, Tags, SLA_Deadline computation.
    """
    payload = parse_request_payload(request)
    if not payload:
        raise HTTPException(status_code=400, detail="Missing ticket payload data")

    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid ticket JSON data")

    docket_num = db.get_next_docket_number()
    payload["Docket_Number"] = docket_num

    user_string = f"{current_user['name']} ({current_user['emp_id']})"
    payload["Data_Filled_by"] = user_string
    payload["User_Department"] = current_user["department"]
    payload["is_deleted"] = False

    if "Input_Date" not in payload or not payload["Input_Date"]:
        payload["Input_Date"] = datetime.now().strftime("%d-%m-%Y %I:%M %p")

    # New fields with defaults
    payload.setdefault("Priority", "Medium")
    payload.setdefault("Tags", [])
    payload.setdefault("Watchers", [])
    payload.setdefault("Assigned_To", None)
    payload.setdefault("Merged_Into", None)
    payload.setdefault("Transfer_History", [])

    # Compute SLA deadline
    created_at = parse_date(payload["Input_Date"]) or datetime.now()
    department = payload.get("Department", "")
    payload["SLA_Deadline"] = db.get_sla_deadline(department, created_at)

    try:
        db.tickets_collection.insert_one(payload)
        logger.info(f"Ticket Docket No {docket_num} successfully created by {user_string}")

        # Write audit log
        db.write_audit_log(
            docket_number=docket_num,
            user_emp_id=current_user["emp_id"],
            user_name=current_user["name"],
            action="created",
            field="status",
            new_value="New Service Request"
        )

        email_service.send_new_ticket_email(payload, background_tasks, cc_email=current_user.get("email"))

        return ["Data Inserted SuccessFully", docket_num]
    except Exception as e:
        logger.error(f"Failed to save ticket into MongoDB: {e}")
        return ["Duplicate Data"]


# ──────────────────────────────────────────────────────────────
# SEARCH (full-text + autocomplete)
# ──────────────────────────────────────────────────────────────

@router.get("/tickets/search")
def search_tickets(q: str = "", current_user: dict = Depends(get_current_user)):
    """
    Full-text search across Subject and Breif fields.
    Returns top 10 matching open tickets. Used for duplicate detection and command palette.
    """
    if not q or len(q.strip()) < 2:
        return []

    try:
        # MongoDB $text search
        results = list(db.tickets_collection.find(
            {
                "$text": {"$search": q},
                "is_deleted": {"$ne": True},
                "Present_Status": {"$in": ["New Service Request", "Under Progress"]}
            },
            {
                "_id": 0,
                "Docket_Number": 1,
                "Subject": 1,
                "Present_Status": 1,
                "Department": 1,
                "Input_Date": 1,
                "score": {"$meta": "textScore"}
            }
        ).sort([("score", {"$meta": "textScore"})]).limit(10))

        return results
    except Exception as e:
        # Fallback: regex search if text index not available
        logger.warning(f"Text search fallback to regex: {e}")
        try:
            regex = {"$regex": re.escape(q), "$options": "i"}
            results = list(db.tickets_collection.find(
                {
                    "$or": [{"Subject": regex}, {"Breif": regex}],
                    "is_deleted": {"$ne": True},
                    "Present_Status": {"$in": ["New Service Request", "Under Progress"]}
                },
                {"_id": 0, "Docket_Number": 1, "Subject": 1, "Present_Status": 1, "Department": 1, "Input_Date": 1}
            ).limit(10))
            return results
        except Exception as e2:
            logger.error(f"Search fallback also failed: {e2}")
            return []


# ──────────────────────────────────────────────────────────────
# READ TICKETS
# ──────────────────────────────────────────────────────────────

@router.api_route("/ExportData", methods=["GET", "POST"])
def export_user_tickets(request: Request, current_user: dict = Depends(get_current_user)):
    """Returns tickets submitted by the logged-in user."""
    user_string = f"{current_user['name']} ({current_user['emp_id']})"

    try:
        response = list(db.tickets_collection.find(
            filter={"Data_Filled_by": user_string, "is_deleted": {"$ne": True}},
            projection={"_id": 0}
        ))

        for item in response:
            _format_ticket(item)

        unique_tickets = []
        seen = set()
        for item in response:
            docket = item.get("Docket_Number")
            if docket not in seen:
                seen.add(docket)
                unique_tickets.append(item)

        unique_tickets = sorted(unique_tickets, key=lambda x: x.get("Docket_Number", 0), reverse=True)
        status_order = ["New Service Request", "Under Progress", "Can not be Resolved", "Working (No Action Required)", "Resolved"]
        unique_tickets = sorted(unique_tickets, key=lambda x: status_order.index(x.get("Present_Status")) if x.get("Present_Status") in status_order else 99)

        return unique_tickets

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {e}")


@router.api_route("/ExportDataAlluser", methods=["GET", "POST"])
def export_department_user_tickets(request: Request, current_user: dict = Depends(get_current_user)):
    """Returns tickets from the logged-in user's department."""
    dept_param = parse_request_payload(request)
    if not dept_param:
        dept_param = current_user.get("department")

    sso_code = get_sso_department_code(dept_param)
    user_sso_dept = current_user.get("department")
    if current_user.get("role") != "admin" and sso_code.upper().strip() != user_sso_dept.upper().strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You can only query tickets for your own department"
        )

    try:
        response = list(db.tickets_collection.find(
            filter={"User_Department": sso_code, "is_deleted": {"$ne": True}},
            projection={"_id": 0}
        ))

        for item in response:
            _format_ticket(item)

        unique_tickets = []
        seen = set()
        for item in response:
            docket = item.get("Docket_Number")
            if docket not in seen:
                seen.add(docket)
                unique_tickets.append(item)

        unique_tickets = sorted(unique_tickets, key=lambda x: x.get("Docket_Number", 0), reverse=True)
        status_order = ["New Service Request", "Under Progress", "Can not be Resolved", "Working (No Action Required)", "Resolved"]
        unique_tickets = sorted(unique_tickets, key=lambda x: status_order.index(x.get("Present_Status")) if x.get("Present_Status") in status_order else 99)

        return unique_tickets

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {e}")


def check_ticket_edit_permission(ticket: dict, user: dict):
    is_admin = user.get("role") == "admin"
    creator_string = ticket.get("Data_Filled_by", "")
    is_creator = f"({user['emp_id']})" in creator_string
    
    user_sso_dept = user.get("department", "")
    ticket_dept = ticket.get("Department", "")
    
    is_dept_staff = False
    if user_sso_dept and ticket_dept:
        allowed_depts = get_normalized_departments(user_sso_dept)
        allowed_depts_lower = [d.lower().strip() for d in allowed_depts]
        is_dept_staff = ticket_dept.lower().strip() in allowed_depts_lower

    if not is_admin and not is_creator and not is_dept_staff:
        raise HTTPException(status_code=403, detail="Access forbidden: You do not have permission to edit this ticket")


@router.api_route("/UserInputupdate", methods=["GET", "POST"])
def update_user_input(request: Request, current_user: dict = Depends(get_current_user)):
    """Saves generic ticket fields."""
    payload = parse_request_payload(request)
    if not payload:
        raise HTTPException(status_code=400, detail="Missing payload")

    if isinstance(payload, str):
        payload = json.loads(payload)

    try:
        ticket_data = payload[0] if isinstance(payload, list) else payload
        docket_no = ticket_data.get("Docket_Number")

        if not docket_no:
            raise HTTPException(status_code=400, detail="Docket_Number missing")

        old_ticket = db.tickets_collection.find_one({"Docket_Number": docket_no})
        if not old_ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")

        check_ticket_edit_permission(old_ticket, current_user)

        ticket_data.pop("Old_Status", None)
        ticket_data.pop("Present_Status", None)

        # Serialize SLA_Deadline back to datetime if string
        if "SLA_Deadline" in ticket_data and isinstance(ticket_data["SLA_Deadline"], str):
            try:
                ticket_data["SLA_Deadline"] = datetime.fromisoformat(ticket_data["SLA_Deadline"])
            except Exception:
                ticket_data.pop("SLA_Deadline", None)

        db.tickets_collection.update_one({"Docket_Number": docket_no}, {"$set": ticket_data})
        return "Success"
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to update ticket: {e}")
        return "Error"


@router.api_route("/UserBreifupdate", methods=["GET", "POST"])
def update_user_brief(request: Request, current_user: dict = Depends(get_current_user)):
    """Modifies description field."""
    payload = parse_request_payload(request)
    if not payload:
        raise HTTPException(status_code=400, detail="Missing payload")

    if isinstance(payload, str):
        payload = json.loads(payload)

    try:
        ticket_data = payload[0] if isinstance(payload, list) else payload
        docket_no = ticket_data.get("Docket_Number")

        if not docket_no:
            raise HTTPException(status_code=400, detail="Docket_Number missing")

        old_ticket = db.tickets_collection.find_one({"Docket_Number": docket_no})
        if not old_ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")

        check_ticket_edit_permission(old_ticket, current_user)

        old_desc = old_ticket.get("Breif")
        new_desc = ticket_data.get("Breif")

        db.tickets_collection.update_one({"Docket_Number": docket_no}, {"$set": {"Breif": new_desc}})

        db.write_audit_log(
            docket_number=docket_no,
            user_emp_id=current_user["emp_id"],
            user_name=current_user["name"],
            action="description_edited",
            field="Breif",
            old_value=old_desc,
            new_value=new_desc
        )

        return "Success"
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to update brief: {e}")
        return "Error"


@router.api_route("/UserInputStatusupdate", methods=["GET", "POST"])
def update_ticket_status(request: Request, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Updates status and emails the ticket creator. Also notifies watchers and writes audit log."""
    payload = parse_request_payload(request)
    if not payload:
        raise HTTPException(status_code=400, detail="Missing payload")

    if isinstance(payload, str):
        payload = json.loads(payload)

    try:
        ticket_data = payload[0] if isinstance(payload, list) else payload
        docket_no = ticket_data.get("Docket_Number")
        new_status = ticket_data.get("Present_Status")
        edited_by = ticket_data.get("Data_Edited_by", "")

        if not docket_no or not new_status:
            raise HTTPException(status_code=400, detail="Docket_Number or Present_Status missing")

        orig_ticket = db.tickets_collection.find_one({"Docket_Number": docket_no})
        if not orig_ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")

        old_status = orig_ticket.get("Present_Status", "")

        # Serialize SLA_Deadline back to datetime if present as string
        if "SLA_Deadline" in ticket_data and isinstance(ticket_data["SLA_Deadline"], str):
            try:
                ticket_data["SLA_Deadline"] = datetime.fromisoformat(ticket_data["SLA_Deadline"])
            except Exception:
                ticket_data.pop("SLA_Deadline", None)

        db.tickets_collection.update_one({"Docket_Number": docket_no}, {"$set": ticket_data})

        # Write audit log for status change
        db.write_audit_log(
            docket_number=docket_no,
            user_emp_id=current_user["emp_id"],
            user_name=current_user["name"],
            action="status_change",
            field="Present_Status",
            old_value=old_status,
            new_value=new_status
        )

        # In-app notifications for creator
        creator_string = orig_ticket.get("Data_Filled_by", "")
        creator_emp_id = ""
        creator_name = ""
        creator_id = ""
        if "(" in creator_string and creator_string.endswith(")"):
            parts = creator_string.split("(")
            creator_name = parts[0].strip()
            creator_id = parts[1][:-1].strip()
            creator_emp_id = creator_id

        if creator_emp_id and creator_emp_id != current_user["emp_id"]:
            db.create_notification(
                recipient_emp_id=creator_emp_id,
                recipient_name=creator_name,
                docket_number=docket_no,
                notif_type="status_change",
                message=f"Your Docket #{docket_no} status changed to '{new_status}' by {current_user['name']} ({orig_ticket.get('Department', '')})"
            )

        # Notify assigned persons if different
        assigned_to = orig_ticket.get("Assigned_To")
        if assigned_to:
            assignees = assigned_to if isinstance(assigned_to, list) else [assigned_to]
            for assignee in assignees:
                if assignee and assignee.get("emp_id") and assignee["emp_id"] != current_user["emp_id"]:
                    db.create_notification(
                        recipient_emp_id=assignee["emp_id"],
                        recipient_name=assignee.get("name", ""),
                        docket_number=docket_no,
                        notif_type="status_change",
                        message=f"Docket #{docket_no} (assigned to you) status changed to '{new_status}'"
                    )

        # Notify all watchers
        _notify_watchers(
            orig_ticket,
            f"Docket #{docket_no}: Status changed to '{new_status}'",
            "status_change",
            exclude_emp_id=current_user["emp_id"]
        )

        # Email creator
        creator_email = get_employee_email(creator_name, creator_id)
        editor_display = current_user.get("name") or edited_by
        if creator_email:
            email_service.send_status_update_email(
                orig_ticket, new_status, editor_display,
                creator_email, background_tasks, cc_email=current_user.get("email")
            )

        # Send watcher emails
        email_service.send_watcher_notification(
            ticket=orig_ticket,
            new_status=new_status,
            changed_by=current_user["name"],
            background_tasks=background_tasks,
            exclude_email=creator_email
        )

        return "Success"
    except Exception as e:
        logger.error(f"Failed to update ticket status: {e}")
        return "Error"


# ──────────────────────────────────────────────────────────────
# TICKET ASSIGNMENT
# ──────────────────────────────────────────────────────────────

@router.post("/tickets/{docket_number}/assign")
def assign_ticket(docket_number: int, request: Request, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Assigns ticket to one or more employees. Notifies the assignees."""
    try:
        body = {}
        import asyncio
        loop = asyncio.get_event_loop()
        if not loop.is_running():
            body = loop.run_until_complete(request.json())
    except Exception:
        pass

    if not body:
        payload = parse_request_payload(request)
        if payload:
            body = json.loads(payload) if isinstance(payload, str) else payload

    # Accept either single assignee (emp_id/name) or list of assignees or dict with "assignees" list
    assignees_input = []
    if isinstance(body, list):
        assignees_input = body
    elif isinstance(body, dict):
        if "assignees" in body and isinstance(body["assignees"], list):
            assignees_input = body["assignees"]
        elif body.get("emp_id"):
            assignees_input = [body]

    # Clean and validate assignees
    new_assigned = []
    for emp in assignees_input:
        if emp:
            emp_id = str(emp.get("emp_id", "")).strip()
            emp_name = emp.get("name", "").strip()
            emp_email = emp.get("email", "").strip()
            if emp_id and emp_name:
                new_assigned.append({"emp_id": emp_id, "name": emp_name, "email": emp_email})

    ticket = db.tickets_collection.find_one({"Docket_Number": docket_number, "is_deleted": {"$ne": True}})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Check permissions: admin or target department staff only
    is_admin = current_user.get("role") == "admin"
    user_sso_dept = current_user.get("department", "")
    ticket_dept = ticket.get("Department", "")
    
    is_dept_staff = False
    if user_sso_dept and ticket_dept:
        allowed_depts = get_normalized_departments(user_sso_dept)
        allowed_depts_lower = [d.lower().strip() for d in allowed_depts]
        is_dept_staff = ticket_dept.lower().strip() in allowed_depts_lower

    if not is_admin and not is_dept_staff:
        raise HTTPException(status_code=403, detail="Access forbidden: Only department staff or admins can assign this ticket")

    old_assigned = ticket.get("Assigned_To")

    db.tickets_collection.update_one(
        {"Docket_Number": docket_number},
        {"$set": {"Assigned_To": new_assigned}}
    )

    # Prepare audit log values
    if isinstance(old_assigned, list):
        old_val = ", ".join(u.get("name", "") for u in old_assigned if u)
    elif isinstance(old_assigned, dict):
        old_val = old_assigned.get("name", "")
    else:
        old_val = None

    new_val = ", ".join(u["name"] for u in new_assigned) if new_assigned else "Unassigned"

    db.write_audit_log(
        docket_number=docket_number,
        user_emp_id=current_user["emp_id"],
        user_name=current_user["name"],
        action="assigned",
        field="Assigned_To",
        old_value=old_val,
        new_value=new_val
    )

    # Notify assignees
    old_emp_ids = set()
    if old_assigned:
        if isinstance(old_assigned, list):
            old_emp_ids = {u.get("emp_id") for u in old_assigned if u and u.get("emp_id")}
        elif isinstance(old_assigned, dict):
            old_emp_ids = {old_assigned.get("emp_id")}

    for emp in new_assigned:
        emp_id = emp["emp_id"]
        emp_name = emp["name"]
        emp_email = emp["email"]
        
        # Only notify and email if they were not already assigned
        if emp_id not in old_emp_ids:
            db.create_notification(
                recipient_emp_id=emp_id,
                recipient_name=emp_name,
                docket_number=docket_number,
                notif_type="assigned",
                message=f"Docket #{docket_number} has been assigned to you by {current_user['name']}"
            )

            # Send assignment email
            if emp_email and "@" in emp_email:
                email_service.send_assignment_notification(
                    ticket=ticket, assignee_name=emp_name,
                    assignee_email=emp_email, assigned_by=current_user["name"],
                    background_tasks=background_tasks
                )

    return {"status": "ok", "assigned_to": new_assigned}


# ──────────────────────────────────────────────────────────────
# WATCHERS
# ──────────────────────────────────────────────────────────────

@router.post("/tickets/{docket_number}/watch")
def watch_ticket(docket_number: int, current_user: dict = Depends(get_current_user)):
    """Adds current user to ticket Watchers list (idempotent)."""
    ticket = db.tickets_collection.find_one({"Docket_Number": docket_number, "is_deleted": {"$ne": True}})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    watcher = {
        "emp_id": current_user["emp_id"],
        "name": current_user["name"],
        "email": current_user.get("email", "")
    }

    # Avoid duplicate watchers
    db.tickets_collection.update_one(
        {"Docket_Number": docket_number, "Watchers.emp_id": {"$ne": current_user["emp_id"]}},
        {"$push": {"Watchers": watcher}}
    )
    return {"status": "watching"}


@router.delete("/tickets/{docket_number}/watch")
def unwatch_ticket(docket_number: int, current_user: dict = Depends(get_current_user)):
    """Removes current user from ticket Watchers list."""
    ticket = db.tickets_collection.find_one({"Docket_Number": docket_number, "is_deleted": {"$ne": True}})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    db.tickets_collection.update_one(
        {"Docket_Number": docket_number},
        {"$pull": {"Watchers": {"emp_id": current_user["emp_id"]}}}
    )
    return {"status": "unwatched"}


# ──────────────────────────────────────────────────────────────
# TICKET TRANSFER
# ──────────────────────────────────────────────────────────────

@router.post("/tickets/{docket_number}/transfer")
def transfer_ticket(docket_number: int, request: Request, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Transfers ticket to another department. Retains full history."""
    payload = parse_request_payload(request)
    if not payload:
        raise HTTPException(status_code=400, detail="Missing payload")
    if isinstance(payload, str):
        payload = json.loads(payload)

    new_department = payload.get("department", "").strip()
    reason = payload.get("reason", "").strip()

    if not new_department:
        raise HTTPException(status_code=400, detail="Target department is required")

    ticket = db.tickets_collection.find_one({"Docket_Number": docket_number, "is_deleted": {"$ne": True}})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    old_department = ticket.get("Department", "")
    transfer_record = {
        "from_department": old_department,
        "to_department": new_department,
        "reason": reason,
        "transferred_by": current_user["name"],
        "transferred_at": datetime.now().strftime("%d-%m-%Y %I:%M %p")
    }

    db.tickets_collection.update_one(
        {"Docket_Number": docket_number},
        {
            "$set": {"Department": new_department},
            "$push": {"Transfer_History": transfer_record}
        }
    )

    db.write_audit_log(
        docket_number=docket_number,
        user_emp_id=current_user["emp_id"],
        user_name=current_user["name"],
        action="transferred",
        field="Department",
        old_value=old_department,
        new_value=new_department
    )

    # Notify watchers and creator
    _notify_watchers(
        ticket,
        f"Docket #{docket_number} has been transferred from {old_department} to {new_department}",
        "transferred"
    )

    creator_string = ticket.get("Data_Filled_by", "")
    if "(" in creator_string and creator_string.endswith(")"):
        parts = creator_string.split("(")
        creator_name = parts[0].strip()
        creator_id = parts[1][:-1].strip()
        creator_emp_id = creator_id
        db.create_notification(
            recipient_emp_id=creator_emp_id,
            recipient_name=creator_name,
            docket_number=docket_number,
            notif_type="transferred",
            message=f"Your Docket #{docket_number} has been transferred to {new_department}"
        )

    return {"status": "ok", "from": old_department, "to": new_department}


# ──────────────────────────────────────────────────────────────
# TICKET MERGE
# ──────────────────────────────────────────────────────────────

@router.post("/tickets/{docket_number}/merge")
def merge_tickets(docket_number: int, request: Request, current_user: dict = Depends(get_current_user)):
    """
    Merges one or more child tickets into a parent ticket.
    Body: { child_dockets: [int, int, ...] }
    Child tickets are marked with Merged_Into = parent docket number.
    """
    payload = parse_request_payload(request)
    if not payload:
        raise HTTPException(status_code=400, detail="Missing payload")
    if isinstance(payload, str):
        payload = json.loads(payload)

    child_dockets = payload.get("child_dockets", [])
    if not child_dockets:
        raise HTTPException(status_code=400, detail="child_dockets list is required")

    parent = db.tickets_collection.find_one({"Docket_Number": docket_number, "is_deleted": {"$ne": True}})
    if not parent:
        raise HTTPException(status_code=404, detail="Parent ticket not found")

    merged = []
    for child_docket in child_dockets:
        child = db.tickets_collection.find_one({"Docket_Number": child_docket, "is_deleted": {"$ne": True}})
        if not child:
            continue

        db.tickets_collection.update_one(
            {"Docket_Number": child_docket},
            {"$set": {"Merged_Into": docket_number, "Present_Status": "Resolved", "Ticket_Closed": True}}
        )

        db.write_audit_log(
            docket_number=child_docket,
            user_emp_id=current_user["emp_id"],
            user_name=current_user["name"],
            action="merged",
            field="Merged_Into",
            new_value=str(docket_number)
        )

        # Notify creator of child ticket
        creator_string = child.get("Data_Filled_by", "")
        if "(" in creator_string and creator_string.endswith(")"):
            parts = creator_string.split("(")
            creator_emp_id = parts[1][:-1].strip()
            creator_name = parts[0].strip()
            db.create_notification(
                recipient_emp_id=creator_emp_id,
                recipient_name=creator_name,
                docket_number=child_docket,
                notif_type="merged",
                message=f"Your Docket #{child_docket} has been merged into Docket #{docket_number}"
            )

        merged.append(child_docket)

    # Update parent with merged children list
    db.tickets_collection.update_one(
        {"Docket_Number": docket_number},
        {"$addToSet": {"Merged_Tickets": {"$each": merged}}}
    )

    return {"status": "ok", "parent": docket_number, "merged": merged}


# ──────────────────────────────────────────────────────────────
# AUDIT TRAIL
# ──────────────────────────────────────────────────────────────

@router.get("/tickets/{docket_number}/audit")
def get_audit_trail(docket_number: int, current_user: dict = Depends(get_current_user)):
    """Returns the full audit trail for a specific ticket."""
    try:
        logs = list(db.audit_logs_collection.find(
            {"docket_number": docket_number},
            {"_id": 0, "docket_number": 0}
        ).sort("timestamp", 1))

        for log in logs:
            if isinstance(log.get("timestamp"), datetime):
                log["timestamp"] = log["timestamp"].isoformat()

        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch audit trail: {e}")


# ──────────────────────────────────────────────────────────────
# BULK STATUS UPDATE
# ──────────────────────────────────────────────────────────────

@router.post("/tickets/bulk-status")
def bulk_update_status(request: Request, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """
    Bulk updates status for multiple tickets.
    Body: { docket_numbers: [int, ...], status: str }
    """
    payload = parse_request_payload(request)
    if not payload:
        raise HTTPException(status_code=400, detail="Missing payload")
    if isinstance(payload, str):
        payload = json.loads(payload)

    docket_numbers = payload.get("docket_numbers", [])
    new_status = payload.get("status", "").strip()

    if not docket_numbers or not new_status:
        raise HTTPException(status_code=400, detail="docket_numbers and status are required")

    status_order = ["New Service Request", "Under Progress", "Can not be Resolved", "Working (No Action Required)", "Resolved"]
    if new_status not in status_order:
        raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")

    updated = 0
    for docket_no in docket_numbers:
        result = db.tickets_collection.update_one(
            {"Docket_Number": docket_no, "is_deleted": {"$ne": True}},
            {"$set": {"Present_Status": new_status, "Old_Status": None}}
        )
        if result.matched_count > 0:
            db.write_audit_log(
                docket_number=docket_no,
                user_emp_id=current_user["emp_id"],
                user_name=current_user["name"],
                action="bulk_status_change",
                field="Present_Status",
                new_value=new_status
            )
            updated += 1

    return {"status": "ok", "updated": updated}


# ──────────────────────────────────────────────────────────────
# CSAT RATING
# ──────────────────────────────────────────────────────────────

@router.post("/tickets/csat")
def submit_csat(request: Request):
    """
    Public endpoint (no auth). Validates a signed JWT token and stores CSAT rating.
    Body: { token: str, rating: int (1-5), comment: str }
    """
    import asyncio
    loop = asyncio.new_event_loop()
    try:
        body = {}
        payload_str = parse_request_payload(request)
        if payload_str:
            body = json.loads(payload_str) if isinstance(payload_str, str) else payload_str
    except Exception:
        pass

    token = body.get("token", "")
    rating = body.get("rating")
    comment = body.get("comment", "")

    if not token or rating is None:
        raise HTTPException(status_code=400, detail="token and rating are required")

    try:
        rating = int(rating)
        if not 1 <= rating <= 5:
            raise ValueError("Rating must be 1-5")
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="rating must be an integer between 1 and 5")

    try:
        decoded = pyjwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        docket_number = decoded.get("docket")
        if not docket_number:
            raise HTTPException(status_code=400, detail="Invalid CSAT token")
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="CSAT link has expired")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid CSAT token")

    # Check if already rated
    existing = db.tickets_collection.find_one({"Docket_Number": docket_number, "CSAT_Rating": {"$exists": True}})
    if existing:
        raise HTTPException(status_code=409, detail="CSAT rating already submitted for this ticket")

    db.tickets_collection.update_one(
        {"Docket_Number": docket_number},
        {"$set": {"CSAT_Rating": rating, "CSAT_Comment": comment, "CSAT_Submitted_At": datetime.now()}}
    )

    return {"status": "ok", "message": "Thank you for your feedback!"}


# ──────────────────────────────────────────────────────────────
# REMINDERS (existing)
# ──────────────────────────────────────────────────────────────

@router.api_route("/SendTicketReminder", methods=["GET", "POST"])
async def send_ticket_reminder(request: Request, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Sends a manual reminder email to the concerned department of a ticket."""
    docket_param = parse_request_payload(request)
    if not docket_param:
        try:
            body = await request.json()
            docket_param = body.get("Docket_Number") or body.get("docket_number")
        except Exception:
            pass

    if not docket_param:
        docket_param = request.query_params.get("Docket_Number") or request.query_params.get("docket_number")

    if not docket_param:
        raise HTTPException(status_code=400, detail="Missing Docket_Number parameter")

    try:
        docket_no = int(docket_param)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Docket_Number format")

    ticket = db.tickets_collection.find_one({"Docket_Number": docket_no, "is_deleted": {"$ne": True}})
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket Docket No {docket_no} not found")

    from app.services.reminder_service import parse_date as parse_reminder_date, send_reminder_email

    input_date = parse_reminder_date(ticket.get("Input_Date"))
    if not input_date:
        raise HTTPException(status_code=400, detail="Ticket has invalid creation date format")

    now = datetime.now()

    if input_date.date() == now.date():
        raise HTTPException(status_code=400, detail="Reminders can only be sent starting tomorrow.")

    today_str = now.strftime("%d-%m-%Y")
    if ticket.get("Last_Manual_Reminder_Date") == today_str:
        raise HTTPException(status_code=400, detail="Only one reminder can be sent per day.")

    days_elapsed = (now - input_date).days

    success = send_reminder_email(ticket, days_elapsed, background_tasks, cc_email=current_user.get("email"))
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email")

    db.tickets_collection.update_one(
        {"Docket_Number": docket_no},
        {"$set": {
            "Last_Manual_Reminder_Date": today_str,
            "Last_Reminder_Date": now.strftime("%d-%m-%Y %I:%M %p")
        }}
    )

    return "Success"


@router.api_route("/SendBulkReminder", methods=["GET", "POST"])
async def send_bulk_reminder(request: Request, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Sends a reminder email to all departments with new service requests. Admin only."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Only admins can send bulk reminders.")

    tickets = list(db.tickets_collection.find({
        "Present_Status": "New Service Request",
        "is_deleted": {"$ne": True}
    }))

    if not tickets:
        return {"status": "Success", "sent_count": 0}

    from app.services.reminder_service import parse_date as parse_reminder_date, send_reminder_email

    sent_count = 0
    for ticket in tickets:
        input_date = parse_reminder_date(ticket.get("Input_Date"))
        if not input_date:
            continue
        days_elapsed = (datetime.now() - input_date).days
        success = send_reminder_email(ticket, days_elapsed, background_tasks, cc_email=current_user.get("email"))
        if success:
            sent_count += 1

    return {"status": "Success", "sent_count": sent_count}
