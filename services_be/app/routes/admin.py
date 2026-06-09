from fastapi import APIRouter, Depends, Request, HTTPException, status
from app.db import db
from app.middleware.auth import get_current_user, require_admin
from app.utils import parse_request_payload, get_normalized_departments

router = APIRouter()

@router.api_route("/ExportDataAdmin", methods=["GET", "POST"])
def export_data_admin(request: Request, current_user: dict = Depends(require_admin)):
    """
    Returns ALL tickets in the system.
    Restricted to Admin users only.
    """
    try:
        response = list(db.tickets_collection.find(filter={"is_deleted": {"$ne": True}}, projection={"_id": 0}))
        
        # Format response data to handle empty file attachments and Ticket_Closed state
        for item in response:
            if "File" not in item or not item["File"]:
                item["File"] = "No file was Uploaded"
            
            # Auto close check compatibility
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

        # Sort: first by Docket_Number descending, then by priority/status status order
        unique_tickets = sorted(unique_tickets, key=lambda x: x.get("Docket_Number", 0), reverse=True)

        status_order = ["New Service Request", "Under Progress", "Can not be Resolved", "Working (No Action Required)", "Resolved"]
        def get_status_index(t):
            status = t.get("Present_Status", "New Service Request")
            return status_order.index(status) if status in status_order else 99

        unique_tickets = sorted(unique_tickets, key=get_status_index)
        return unique_tickets

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {e}")


@router.api_route("/ExportDataDepartmentAdmin", methods=["GET", "POST"])
def export_data_department_admin(request: Request, current_user: dict = Depends(require_admin)):
    """
    Returns tickets for a specific department.
    Restricted to Admins. Fixes the original query logic bug which fetched all tickets.
    """
    dept_query = parse_request_payload(request)
    if not dept_query:
        # Fallback to query body if headers were empty
        try:
            body = request.json()
            dept_query = body.get("Data") or body.get("department")
        except:
            pass

    if not dept_query:
        raise HTTPException(status_code=400, detail="Missing target department filter")

    # Map SSO/frontend department name to backend sub-departments
    departments = get_normalized_departments(dept_query)

    try:
        final_list = []
        for item in departments:
            # FIX: Filter by department instead of empty filter {}
            res = list(db.tickets_collection.find(
                filter={"Department": item, "is_deleted": {"$ne": True}}, 
                projection={"_id": 0}
            ))
            final_list.extend(res)

        for item in final_list:
            if "File" not in item or not item["File"]:
                item["File"] = "No file was Uploaded"
            
            if item.get("Present_Status") == "Resolved" and item.get("Old_Status") == "Resolved":
                item["Ticket_Closed"] = True
            else:
                item["Ticket_Closed"] = item.get("Ticket_Closed", False)

        # Deduplicate
        unique_tickets = []
        seen = set()
        for item in final_list:
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


@router.api_route("/ExportDataDepartment", methods=["GET", "POST"])
def export_data_department(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Returns tickets for the logged-in user's department.
    Enforces authorization: users can only fetch their own department tickets, admins can fetch any.
    """
    requested_dept = parse_request_payload(request)
    if not requested_dept:
        # Check standard headers
        requested_dept = current_user.get("department")

    if not requested_dept:
        raise HTTPException(status_code=400, detail="Target department not specified")

    # Enforce departmental authorization
    is_admin = current_user.get("role") == "admin"
    user_sso_dept = current_user.get("department")
    allowed_user_depts = get_normalized_departments(user_sso_dept)
    
    # Check if requested department resolves to one of the user's allowed departments
    requested_normalized = get_normalized_departments(requested_dept)
    
    # Verify authorization
    if not is_admin and not any(d in allowed_user_depts for d in requested_normalized):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not belong to the requested department queue"
        )

    try:
        final_list = []
        for item in requested_normalized:
            res = list(db.tickets_collection.find(
                filter={"Department": item, "is_deleted": {"$ne": True}},
                projection={"_id": 0}
            ))
            final_list.extend(res)

        for item in final_list:
            if "File" not in item or not item["File"]:
                item["File"] = "No file was Uploaded"
            
            if item.get("Present_Status") == "Resolved" and item.get("Old_Status") == "Resolved":
                item["Ticket_Closed"] = True
            else:
                item["Ticket_Closed"] = item.get("Ticket_Closed", False)

        # Deduplicate
        unique_tickets = []
        seen = set()
        for item in final_list:
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
