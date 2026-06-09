import json
import logging
from fastapi import Request, HTTPException, status
from typing import Any

logger = logging.getLogger(__name__)

def parse_request_payload(request: Request) -> Any:
    """
    Parses request payload from either JSON body or legacy headers ('Data' or 'datas').
    This ensures complete backward compatibility with the existing frontend.
    """
    # 1. Try reading from headers (legacy client sends data in headers)
    header_data = request.headers.get("Data") or request.headers.get("datas")
    if header_data:
        try:
            # Check if it's JSON string
            return json.loads(header_data)
        except json.JSONDecodeError:
            # If not JSON, return the raw string (e.g. user details string)
            return header_data

    # 2. Try parsing JSON body (standard modern client)
    try:
        # Check if Content-Type is json
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            # Use await request.json() in endpoints, but we can do a sync check here if needed.
            # We will handle JSON body directly in endpoints if headers are not present.
            pass
    except Exception as e:
        logger.error(f"Error checking content type: {e}")

    return None

# Map SSO department codes to normalized backend department list
DEPARTMENT_MAP = {
    "HR": ["Human Resource : Human Resource"],
    "CS": ["Contract Services: Contract services", "Contract Services : Contract Services"],
    "F&A": ["Finance: Finance & Accounts", "Finance : Finance & Accounts"],
    "CYBER SECURITY": ["Cyber Security: Cyber Security", "Cyber Security : Cyber Security"],
    "SO": [
        "System Operation : Post Despatch",
        "System Operation : Real Time Operation",
        "System Operation : Operational Planning"
    ],
    "MO": [
        "Market Operation : Open Access",
        "Market Operation : Market Coordination",
        "Market Operation : Interface Energy Metering, Accounting & Settlement",
        "Market Operation : Regulatory Affairs, Market Operation planning & Coordination"
    ],
    "TS": ["Logistics : TS"],
    "IT": ["Logistics : IT"],
    "COMMUNICATION": ["Logistics : Communication"],
    "SCADA": ["Logistics : OT (Decision Support)"],
}

def get_normalized_departments(sso_dept: str) -> list:
    """Returns list of backend department strings corresponding to the user's SSO department"""
    if not sso_dept:
        return []
    
    # Try direct mapping
    sso_upper = sso_dept.upper().strip()
    if sso_upper in DEPARTMENT_MAP:
        return DEPARTMENT_MAP[sso_upper]
        
    # Partial matching fallback
    if "IT" in sso_upper:
        return DEPARTMENT_MAP["IT"] + DEPARTMENT_MAP["CYBER SECURITY"]
    if "CONTRACT" in sso_upper:
        return DEPARTMENT_MAP["CS"]
    if "FINANCE" in sso_upper or "ACCOUNTS" in sso_upper:
        return DEPARTMENT_MAP["F&A"]
    if "MARKET" in sso_upper:
        return DEPARTMENT_MAP["MO"]
    if "SYSTEM" in sso_upper:
        return DEPARTMENT_MAP["SO"]
        
    return [sso_dept]
