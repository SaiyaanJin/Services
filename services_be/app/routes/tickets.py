import json
import logging
import requests
from datetime import datetime
from fastapi import APIRouter, Depends, Request, HTTPException, status, BackgroundTasks
from app.db import db
from app.middleware.auth import get_current_user
from app.utils import parse_request_payload, get_normalized_departments
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
    
    # Check if cache is valid
    if EMP_DIRECTORY_CACHE["data"] and EMP_DIRECTORY_CACHE["expiry"] > now:
        emp_list = EMP_DIRECTORY_CACHE["data"]
    else:
        try:
            # Query SSO employee directory using shared secret
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

    # Match employee by Name and Emp_id
    for item in emp_list:
        # Match names (case-insensitive) and employee IDs
        if item.get("Name", "").strip().lower() == emp_name.strip().lower() and \
           str(item.get("Emp_id", "")).strip() == str(emp_id).strip():
            return item.get("Mail", "")
            
    # Return a fallback email structure if lookup failed
    return ""

@router.api_route("/DataInsert", methods=["GET", "POST"])
def insert_ticket(request: Request, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """
    Creates a new ticket.
    Generates an atomic docket number, stores it in MongoDB, and triggers email notifications.
    """
    payload = parse_request_payload(request)
    if not payload:
        raise HTTPException(status_code=400, detail="Missing ticket payload data")

    # Double-check data integrity
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid ticket JSON data")

    # Generate atomic docket number
    docket_num = db.get_next_docket_number()
    payload["Docket_Number"] = docket_num
    
    # Overwrite submission details to match authenticated user for safety
    user_string = f"{current_user['name']} ({current_user['emp_id']})"
    payload["Data_Filled_by"] = user_string
    payload["User_Department"] = current_user["department"]
    payload["is_deleted"] = False
    
    # Add creation date if not present
    if "Input_Date" not in payload or not payload["Input_Date"]:
        payload["Input_Date"] = datetime.now().strftime("%d-%m-%Y %I:%M %p")

    try:
        db.tickets_collection.insert_one(payload)
        logger.info(f"Ticket Docket No {docket_num} successfully created by {user_string}")
        
        # Trigger asynchronous email notification to department in the background
        email_service.send_new_ticket_email(payload, background_tasks)
        
        return ["Data Inserted SuccessFully", docket_num]
    except Exception as e:
        logger.error(f"Failed to save ticket into MongoDB: {e}")
        return ["Duplicate Data"]


@router.api_route("/ExportData", methods=["GET", "POST"])
def export_user_tickets(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Returns tickets submitted by the logged-in user.
    """
    user_string = f"{current_user['name']} ({current_user['emp_id']})"

    try:
        response = list(db.tickets_collection.find(
            filter={"Data_Filled_by": user_string, "is_deleted": {"$ne": True}},
            projection={"_id": 0}
        ))

        # Format compatibility fields
        for item in response:
            if "File" not in item or not item["File"]:
                item["File"] = "No file was Uploaded"
            
            # Resolve ticket closed state
            if item.get("Present_Status") == "Resolved" and item.get("Old_Status") == "Resolved":
                item["Ticket_Closed"] = True
            else:
                item["Ticket_Closed"] = item.get("Ticket_Closed", False)

        # Remove duplicates
        unique_tickets = []
        seen = set()
        for item in response:
            docket = item.get("Docket_Number")
            if docket not in seen:
                seen.add(docket)
                unique_tickets.append(item)

        # Sort: docket number descending, status ranking
        unique_tickets = sorted(unique_tickets, key=lambda x: x.get("Docket_Number", 0), reverse=True)
        status_order = ["New Service Request", "Under Progress", "Can not be Resolved", "Working (No Action Required)", "Resolved"]
        unique_tickets = sorted(unique_tickets, key=lambda x: status_order.index(x.get("Present_Status")) if x.get("Present_Status") in status_order else 99)

        return unique_tickets

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {e}")


@router.api_route("/ExportDataAlluser", methods=["GET", "POST"])
def export_department_user_tickets(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Returns tickets from the logged-in user's department.
    Enforces authorization to avoid leak of other departments' tickets.
    """
    dept_param = parse_request_payload(request)
    if not dept_param:
        dept_param = current_user.get("department")

    # Enforce authorization
    user_sso_dept = current_user.get("department")
    if current_user.get("role") != "admin" and dept_param.upper().strip() != user_sso_dept.upper().strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You can only query tickets for your own department"
        )

    try:
        response = list(db.tickets_collection.find(
            filter={"User_Department": dept_param, "is_deleted": {"$ne": True}},
            projection={"_id": 0}
        ))

        for item in response:
            if "File" not in item or not item["File"]:
                item["File"] = "No file was Uploaded"
            
            if item.get("Present_Status") == "Resolved" and item.get("Old_Status") == "Resolved":
                item["Ticket_Closed"] = True
            else:
                item["Ticket_Closed"] = item.get("Ticket_Closed", False)

        # Deduplicate
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


@router.api_route("/UserInputupdate", methods=["GET", "POST"])
def update_user_input(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Saves generic ticket fields.
    """
    payload = parse_request_payload(request)
    if not payload:
        raise HTTPException(status_code=400, detail="Missing payload")

    if isinstance(payload, str):
        payload = json.loads(payload)

    try:
        # Extract first element from array
        ticket_data = payload[0] if isinstance(payload, list) else payload
        docket_no = ticket_data.get("Docket_Number")
        
        if not docket_no:
            raise HTTPException(status_code=400, detail="Docket_Number missing")

        # Strip fields that shouldn't be edited directly this way
        ticket_data.pop("Old_Status", None)
        ticket_data.pop("Present_Status", None)

        result = db.tickets_collection.update_one(
            {"Docket_Number": docket_no},
            {"$set": ticket_data}
        )

        return "Success"
    except Exception as e:
        logger.error(f"Failed to update ticket: {e}")
        return "Error"


@router.api_route("/UserBreifupdate", methods=["GET", "POST"])
def update_user_brief(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Modifies description field.
    """
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

        result = db.tickets_collection.update_one(
            {"Docket_Number": docket_no},
            {"$set": {"Breif": ticket_data.get("Breif")}}
        )

        return "Success"
    except Exception as e:
        logger.error(f"Failed to update brief: {e}")
        return "Error"


@router.api_route("/UserInputStatusupdate", methods=["GET", "POST"])
def update_ticket_status(request: Request, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """
    Updates status and emails the ticket creator.
    """
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

        # Fetch the original ticket first to get the creator info
        orig_ticket = db.tickets_collection.find_one({"Docket_Number": docket_no})
        if not orig_ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")

        # Save updates to MongoDB
        db.tickets_collection.update_one(
            {"Docket_Number": docket_no},
            {"$set": ticket_data}
        )

        # Parse user details and send email notification
        creator_string = orig_ticket.get("Data_Filled_by", "")
        
        # Format "Name (EmpID)"
        creator_name = ""
        creator_id = ""
        if "(" in creator_string and creator_string.endswith(")"):
            parts = creator_string.split("(")
            creator_name = parts[0].strip()
            creator_id = parts[1][:-1].strip()

        # Find creator email
        creator_email = get_employee_email(creator_name, creator_id)

        # Get display editor name
        editor_display = current_user.get("name")
        if not editor_display and "." in edited_by:
            # Fallback legacy parsing: "1.Name (ID) Dept status" -> Name
            try:
                editor_display = edited_by.split(".")[1].split("(")[0].strip()
            except:
                editor_display = edited_by

        if creator_email:
            email_service.send_status_update_email(
                orig_ticket,
                new_status,
                editor_display,
                creator_email,
                background_tasks
            )
        else:
            logger.warning(f"Could not resolve creator email for user {creator_string}. Skip status email.")

        return "Success"
    except Exception as e:
        logger.error(f"Failed to update ticket status: {e}")
        return "Error"
