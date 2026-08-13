import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/configuration", tags=["Configuration"])

def get_hau_connector(request: Request):
    if not hasattr(request.app.state, "hau_connector"):
        raise HTTPException(status_code=503, detail="HAU Connector not initialized")
    return request.app.state.hau_connector

class FeatureUpsertRequest(BaseModel):
    feature_name: str
    description: str = ""
    product_category: str
    ui_grouping: str
    env_variable: str
    gitops_dependencies_json: str = "{}"
    is_paid_addon: bool = False
    enabled_by_default: bool = False
    pricing_tiers_json: str = "{}"

@router.get("/features")
def get_features(request: Request):
    connector = get_hau_connector(request)
    try:
        features = connector.list_features()
        return {"success": True, "data": features}
    except Exception as e:
        logger.error(f"Failed to list features: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/features")
def upsert_feature(request: Request, body: FeatureUpsertRequest):
    connector = get_hau_connector(request)
    try:
        response = connector.upsert_feature(body.model_dump())
    except AttributeError:
        # Pydantic v1 fallback
        response = connector.upsert_feature(body.dict())
    except Exception as e:
        logger.error(f"Failed to upsert feature: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    return response
