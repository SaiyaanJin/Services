import time
import jwt
import requests
import logging
from fastapi import Header, HTTPException, Depends, status, Query
from app.config import settings

logger = logging.getLogger(__name__)

# Simple in-memory cache for SSO token verification to optimize performance
# format: { sso_token: { "user_data": { ... }, "expiry": float } }
TOKEN_CACHE = {}
CACHE_TTL_SECONDS = 300  # Cache SSO token verifications for 5 minutes

def get_current_user(authorization: str = Header(None), token: str = Query(None)) -> dict:
    """
    FastAPI dependency that extracts and validates the SSO token.
    Returns the decoded user information dictionary.
    """
    if not authorization and token:
        authorization = f"Bearer {token}"

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing or invalid. Must be Bearer <token>"
        )
    
    token = authorization.split(" ")[1]
    
    # Check cache first
    now = time.time()
    if token in TOKEN_CACHE:
        cache_entry = TOKEN_CACHE[token]
        if cache_entry["expiry"] > now:
            return cache_entry["user_data"]
        else:
            del TOKEN_CACHE[token]

    # Verify token against SSO verify API
    try:
        verify_url = f"{settings.SSO_BASE_URL}/verify"
        # SSO expects the token in the 'Token' header
        response = requests.get(verify_url, headers={"Token": token}, timeout=5)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="SSO authentication server returned an error"
            )
            
        data = response.json() if isinstance(response.json, dict) else response.text
        
        # SSO verify endpoint can return "User has logout" or "Bad Token"
        if response.text == "User has logout" or response.text == "Bad Token":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"SSO verification failed: {response.text}"
            )
            
        # Parse json response
        resp_data = response.json()
        final_token = resp_data.get("Final_Token")
        
        if not final_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="SSO response missing Final_Token"
            )
            
        # Decode the final JWT token.
        # We try to verify the signature using the SSO_JWT_SECRET.
        # If signature verification fails or key is different, we log it and fallback to unverified decode
        # since it was already validated by the SSO server itself via the API.
        try:
            decoded = jwt.decode(final_token, settings.SSO_JWT_SECRET, algorithms=["HS256"])
        except jwt.InvalidSignatureError:
            logger.warning("SSO JWT signature verification failed with secret, decoding without signature verification")
            decoded = jwt.decode(final_token, options={"verify_signature": False})
        except Exception as e:
            logger.error(f"JWT decode error: {e}")
            decoded = jwt.decode(final_token, options={"verify_signature": False})
            
        # Check if the user session is expired
        if not decoded.get("Login") or decoded.get("Reason") == "Session Expired":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="SSO session expired"
            )
            
        # Check if the user is in admin_roles database
        is_admin = False
        emp_id = decoded.get("User")
        name = decoded.get("Person_Name")
        
        if (emp_id == "00162" and name == "Sanjay Kumar") or emp_id == "60004":
            is_admin = True
        else:
            try:
                from app.db import db
                if db.admin_roles_collection is not None:
                    role_doc = db.admin_roles_collection.find_one({"emp_id": str(emp_id)})
                    if role_doc and role_doc.get("role") == "admin":
                        is_admin = True
            except Exception as e:
                logger.error(f"Error checking admin role in db: {e}")

        user_data = {
            "emp_id": emp_id,
            "name": name,
            "department": decoded.get("Department"),
            "email": decoded.get("Mail") or decoded.get("Email") or "",
            "role": "admin" if is_admin else "user"
        }
        
        # Cache the result
        TOKEN_CACHE[token] = {
            "user_data": user_data,
            "expiry": now + CACHE_TTL_SECONDS
        }
        
        return user_data
        
    except requests.RequestException as e:
        logger.error(f"SSO verify request failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SSO verification service is currently unreachable"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication middleware error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token structure"
        )

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    FastAPI dependency that enforces admin access.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Admin role required"
        )
    return current_user
