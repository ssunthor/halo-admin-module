from fastapi import APIRouter, Depends
from typing import Dict, Any
from rest_api.dependencies import get_current_user

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("/me")
def get_user_me(user: Dict[str, Any] = Depends(get_current_user)):
    return user