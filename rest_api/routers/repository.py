from fastapi import APIRouter, Depends, Request, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
import json
import logging

from rest_api.dependencies import get_current_user
from rest_api.schemas import TenantTopologyResponseSchema, LightweightTenantTopologyResponseSchema, DeviceResponseSchema, UpdateDeviceAliasesSchema
from typing import Union

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/repository",
    tags=["repository"],
    dependencies=[Depends(get_current_user)]
)

def update_tenants_cache(hru, redis, cache_key: str, expand_devices: bool):
    try:
        data = hru.get_tenant_topology(expand_devices=expand_devices)
        if data:
            redis.set_json(cache_key, data, ex=3600)
    except Exception as e:
        logger.error(f"Background cache update failed: {e}")

@router.get("/tenants", responses={200: {"model": Union[TenantTopologyResponseSchema, LightweightTenantTopologyResponseSchema]}})
def get_tenants(request: Request, background_tasks: BackgroundTasks, expand_devices: bool = False, force_refresh: bool = False):
    hru = request.app.state.hru_connector
    redis = getattr(request.app.state, "redis_handler", None)
    
    cache_key = f"ham:repository:tenants:expanded_{expand_devices}"
    
    try:
        if redis and not force_refresh:
            cached_data = redis.get_json(cache_key)
            if cached_data:
                # Trigger a background refresh so it's fresh for next time
                background_tasks.add_task(update_tenants_cache, hru, redis, cache_key, expand_devices)
                if expand_devices:
                    return TenantTopologyResponseSchema(success=True, data=cached_data)
                return LightweightTenantTopologyResponseSchema(success=True, data=cached_data)
                
        # If cache missed or forced refresh, fetch live
        data = hru.get_tenant_topology(expand_devices=expand_devices)
        if redis and data:
            redis.set_json(cache_key, data, ex=3600)
            
        if expand_devices:
            return TenantTopologyResponseSchema(success=True, data=data)
        return LightweightTenantTopologyResponseSchema(success=True, data=data)
    except Exception as e:
        logger.error(f"Failed to fetch tenants from HRU: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync/{tenant_acronym}")
def sync_tenant(request: Request, tenant_acronym: str):
    hru = request.app.state.hru_connector
    def event_stream():
        for update in hru.sync_tenant(tenant_acronym):
            yield f"data: {json.dumps(update)}\n\n"
    return StreamingResponse(event_stream(), media_type="text/event-stream")

@router.get("/device/{device_name}", response_model=DeviceResponseSchema)
def get_device_details(request: Request, device_name: str):
    hru = request.app.state.hru_connector
    try:
        data = hru.get_netbox_device(device_name)
        if not data:
            raise HTTPException(status_code=404, detail="Device not found")
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Failed to fetch device details for {device_name} from HRU: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/device/{device_name}/aliases")
def patch_device_aliases(request: Request, device_name: str, payload: UpdateDeviceAliasesSchema):
    hru = request.app.state.hru_connector
    try:
        result = hru.update_device_aliases(device_name, payload.aliases)
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("message", "Failed to update aliases"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update aliases for {device_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
