import json
import logging
import asyncio
from fastapi import Request, HTTPException, status
from typing import Any

logger = logging.getLogger(__name__)

# Global reference to the main thread's event loop to resolve loop mismatches for large payloads
MAIN_EVENT_LOOP = None

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
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None

            if loop and loop.is_running():
                # If there's already a running loop in the current thread,
                # check if Starlette has already parsed it and cached it.
                if hasattr(request, "_json"):
                    return request._json
                # If not cached, run request.json() in a separate thread/loop to avoid blocking the current loop
                from concurrent.futures import ThreadPoolExecutor
                with ThreadPoolExecutor() as executor:
                    future = executor.submit(asyncio.run, request.json())
                    return future.result()
            else:
                # We are in a synchronous endpoint running on a threadpool thread.
                # Use run_coroutine_threadsafe to schedule request.json() on the main loop.
                if MAIN_EVENT_LOOP and MAIN_EVENT_LOOP.is_running():
                    future = asyncio.run_coroutine_threadsafe(request.json(), MAIN_EVENT_LOOP)
                    return future.result()
                else:
                    return asyncio.run(request.json())
    except Exception as e:
        logger.error(f"Error parsing JSON body in parse_request_payload: {e}")

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


BACKEND_TO_SSO_MAP = {
    "HUMAN RESOURCE": "HR",
    "CONTRACTS & SERVICES": "CS",
    "CONTRACT SERVICES": "CS",
    "FINANCE & ACCOUNTS": "F&A",
    "FINANCE": "F&A",
    "INFORMATION TECHNOLOGY": "IT",
    "LOGISTICS- IT SERVICES": "IT",
    "LOGISTICS : IT": "IT",
    "CYBER SECURITY": "IT",
    "COMMUNICATION": "COMMUNICATION",
    "LOGISTICS- COMMUNICATION": "COMMUNICATION",
    "SCADA": "SCADA",
    "LOGISTICS- OT (DECISION SUPPORT)": "SCADA",
    "LOGISTICS : OT (DECISION SUPPORT)": "SCADA",
    "TECHNICAL SERVICES": "TS",
    "LOGISTICS- TECHNICAL SERVICES": "TS",
    "LOGISTICS : TS": "TS",
    "MARKET OPERATION": "MO",
    "SYSTEM OPERATION": "SO"
}

def get_sso_department_code(display_name: str) -> str:
    """Resolves a department display name or backend category name back to its SSO short code"""
    if not display_name:
        return ""
    name_upper = display_name.upper().strip()
    
    if name_upper in BACKEND_TO_SSO_MAP:
        return BACKEND_TO_SSO_MAP[name_upper]
        
    for k, v in BACKEND_TO_SSO_MAP.items():
        if k in name_upper or name_upper in k:
            return v
            
    return display_name

