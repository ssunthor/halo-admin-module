import logging
from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/inventory", tags=["HALO Inventory"])

def get_hau_connector(request: Request):
    if not hasattr(request.app.state, "hau_connector"):
        raise HTTPException(status_code=503, detail="HAU Connector not initialized")
    return request.app.state.hau_connector

@router.get("")
def get_inventory(request: Request, tenant: str = ""):
    connector = get_hau_connector(request)
    try:
        data = connector.get_inventory(tenant_slug=tenant)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from rest_api.schemas import UpdateCustomizationRequest

@router.post("/update-customization")
def update_customization(request: Request, payload: UpdateCustomizationRequest):
    connector = get_hau_connector(request)
    try:
        result = connector.update_tenant_customization(payload.dict())
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("message"))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
