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
