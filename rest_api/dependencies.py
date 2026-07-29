from typing import Optional, Dict, Any
from fastapi import Header

async def get_current_username(x_forwarded_user: Optional[str] = Header(None)) -> str:
    return x_forwarded_user or "unknown_user"

async def get_current_display_name(x_forwarded_display_name: Optional[str] = Header(None)) -> str:
    return x_forwarded_display_name or "Guest"

def get_current_user(
    x_forwarded_user: Optional[str] = Header(None),
    x_forwarded_display_name: Optional[str] = Header(None),
    x_forwarded_groups: Optional[str] = Header(None)
) -> Dict[str, Any]:
    groups = x_forwarded_groups.split(',') if x_forwarded_groups else []
    username = x_forwarded_user or "unknown_user"
    is_admin = "SERA-Role-Admins" in groups or "SERA-App-SAM-Admins" in groups
    
    role = "user"
    if is_admin:
        role = "admin"
        
    return {
        "username": username,
        "display_name": x_forwarded_display_name or "Guest",
        "groups": groups,
        "role": role,
        "permissions": {
            "can_delete_events": is_admin,
            "can_run_benchmarks": is_admin,
            "can_push_amu": is_admin
        }
    }