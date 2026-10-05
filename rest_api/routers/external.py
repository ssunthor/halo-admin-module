import logging
from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import JSONResponse, FileResponse
import urllib.parse
import os
import base64
from typing import Union
from rest_api.schemas import (
    TenantTopologyResponseSchema, 
    SingleTenantTopologyResponseSchema,
    LightweightTenantTopologyResponseSchema,
    SingleLightweightTenantTopologyResponseSchema,
    DeviceResponseSchema
)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/external")
def external_api_root(request: Request):
    """External API Root for HAM."""
    host = request.headers.get("x-forwarded-host", request.url.hostname)
    proto = request.headers.get("x-forwarded-proto", "https")
    base_url = f"{proto}://{host}/api/ham"
    return {
        "tenants": f"{base_url}/tenants",
        "config": f"{base_url}/config",
        "device": f"{base_url}/device/{{device_name}}",
        "docs": f"{base_url}/docs",
    }

@router.get("/external/docs", include_in_schema=False)
async def custom_swagger_ui_html(request: Request):
    host = request.headers.get("x-forwarded-host", request.url.hostname)
    proto = request.headers.get("x-forwarded-proto", "https")
    return get_swagger_ui_html(
        openapi_url=f"{proto}://{host}/api/ham/openapi.json",
        title="HAM External API",
    )

@router.get("/external/openapi.json", include_in_schema=False)
async def get_openapi_json(request: Request):
    openapi_schema = request.app.openapi()
    
    filtered_paths = {}
    for path, path_item in openapi_schema.get("paths", {}).items():
        if path.startswith("/api/external") and path != "/api/external" and not path.endswith("openapi.json") and not path.endswith("docs"):
            new_path = path.replace("/api/external", "")
            if not new_path.startswith("/"):
                new_path = "/" + new_path
            filtered_paths[new_path] = path_item
            
    filtered_schema = openapi_schema.copy()
    filtered_schema["paths"] = filtered_paths
    filtered_schema["info"] = {
        "title": "HAM External API",
        "version": "1.0.0",
        "description": "External API endpoints for Halo Admin Module"
    }
    
    host = request.headers.get("x-forwarded-host", request.url.hostname)
    proto = request.headers.get("x-forwarded-proto", "https")
    filtered_schema["servers"] = [{"url": f"{proto}://{host}/api/ham"}]
    
    return JSONResponse(filtered_schema)

@router.get("/external/tenants", responses={200: {"model": LightweightTenantTopologyResponseSchema}})
def external_tenants(
    request: Request
):
    """Get the lightweight list of all tenants and device counts."""
    hru = request.app.state.hru_connector
    try:
        data = hru.get_tenant_topology(tenant_acronym="", expand_devices=False, omit_devices=True)
        
        host = request.headers.get("x-forwarded-host", request.url.hostname)
        proto = request.headers.get("x-forwarded-proto", "https")
        base_url = f"{proto}://{host}/api/ham"
        
        for t in data:
            t["tenant_url"] = f"{base_url}/tenants/{t['slug']}?expand=True"
            t["config_url"] = f"{base_url}/config/{t['slug']}"
            
        return LightweightTenantTopologyResponseSchema(
            success=True,
            data=data
        )
    except Exception as e:
        logger.error(f"Failed to fetch external tenants: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/external/tenants/{acronym}", responses={200: {"model": Union[SingleTenantTopologyResponseSchema, SingleLightweightTenantTopologyResponseSchema]}})
def external_tenant_details(
    request: Request,
    acronym: str,
    expand: bool = False,
    limit: int = Query(50, ge=1, le=1000),
    offset: int = 0
):
    """Get the full topology for a specific tenant with optional device expansion."""
    hru = request.app.state.hru_connector
    try:
        data = hru.get_tenant_topology(tenant_acronym=acronym, expand_devices=expand, limit=limit, offset=offset)
        if not data:
            raise HTTPException(status_code=404, detail="Tenant not found")
            
        tenant_data = data[0] if isinstance(data, list) and len(data) > 0 else data
        
        host = request.headers.get("x-forwarded-host", request.url.hostname)
        proto = request.headers.get("x-forwarded-proto", "https")
        base_url = f"{proto}://{host}/api/ham"
        
        tenant_data["tenant_url"] = f"{base_url}/tenants/{tenant_data.get('slug', acronym)}"
        tenant_data["config_url"] = f"{base_url}/config/{tenant_data.get('slug', acronym)}"
        
        if "devices" in tenant_data:
            total_devices = tenant_data.get("device_count", 0)
            paginated_devices = tenant_data["devices"]  # Already paginated by HRU
            
            redis = request.app.state.redis_handler
            
            for device in paginated_devices:
                device["device_url"] = f"{base_url}/device/{device['name']}"
                if "config" in device and "history" in device["config"]:
                    for h in device["config"]["history"]:
                        if h.get("path") and h["path"] != "N/A" and h.get("hash"):
                            # Store mapping of hash -> path in Redis for 7 days
                            redis.client.set(f"ham:download:{h['hash']}", h["path"], ex=604800)
                            h["download_url"] = f"{base_url}/download/{h['hash']}"
                            
            tenant_data["pagination"] = {
                "limit": limit,
                "offset": offset,
                "total": total_devices,
                "next_page_url": f"{base_url}/tenants/{acronym}?expand={expand}&limit={limit}&offset={offset+limit}" if offset + limit < total_devices else None
            }

        if expand:
            return SingleTenantTopologyResponseSchema(
                success=True,
                data=tenant_data
            )
        return SingleLightweightTenantTopologyResponseSchema(
            success=True,
            data=tenant_data
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch external tenant details: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/external/device/{device_name}", responses={200: {"model": DeviceResponseSchema}})
def external_device_details(request: Request, device_name: str):
    """Get the full metadata of a specific device."""
    hru = request.app.state.hru_connector
    try:
        data = hru.get_netbox_device(device_name)
        if not data:
            raise HTTPException(status_code=404, detail="Device not found")
        
        host = request.headers.get("x-forwarded-host", request.url.hostname)
        proto = request.headers.get("x-forwarded-proto", "https")
        base_url = f"{proto}://{host}/api/ham"
        
        data["device_url"] = f"{base_url}/device/{data['name']}"
        
        if "config" in data and "history" in data["config"]:
            redis = request.app.state.redis_handler
            for h in data["config"]["history"]:
                if h.get("path") and h["path"] != "N/A" and h.get("hash"):
                    redis.client.set(f"ham:download:{h['hash']}", h["path"], ex=604800)
                    h["download_url"] = f"{base_url}/download/{h['hash']}"
                    
        return DeviceResponseSchema(
            success=True,
            data=data
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch external device details: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/external/config")
def external_config_tenants(request: Request):
    """List all tenants with their configuration backup stats."""
    hru = request.app.state.hru_connector
    try:
        data = hru.get_tenant_configs(tenant_acronym="")
        host = request.headers.get("x-forwarded-host", request.url.hostname)
        proto = request.headers.get("x-forwarded-proto", "https")
        base_url = f"{proto}://{host}/api/ham"
        
        for t in data:
            t["config_url"] = f"{base_url}/config/{t['slug']}"
            t["tenant_url"] = f"{base_url}/tenants/{t['slug']}?expand=True"
            
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        logger.error(f"Failed to fetch external config tenants: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/external/config/{acronym}")
def external_tenant_config(
    request: Request,
    acronym: str,
    limit: int = Query(50, ge=1, le=1000),
    offset: int = 0
):
    """Get just the devices and their config history for a specific tenant."""
    hru = request.app.state.hru_connector
    try:
        data = hru.get_tenant_configs(tenant_acronym=acronym, limit=limit, offset=offset)
        if not data:
            raise HTTPException(status_code=404, detail="Tenant not found")
            
        tenant_data = data[0] if isinstance(data, list) and len(data) > 0 else data
        
        host = request.headers.get("x-forwarded-host", request.url.hostname)
        proto = request.headers.get("x-forwarded-proto", "https")
        base_url = f"{proto}://{host}/api/ham"
        
        tenant_data["tenant_url"] = f"{base_url}/tenants/{tenant_data.get('slug', acronym)}?expand=True"
        
        if "devices" in tenant_data:
            total_devices = tenant_data.get("device_count", 0)
            redis = request.app.state.redis_handler
            
            for device in tenant_data["devices"]:
                if "config" in device and "history" in device["config"]:
                    for h in device["config"]["history"]:
                        if h.get("path") and h["path"] != "N/A" and h.get("hash"):
                            redis.client.set(f"ham:download:{h['hash']}", h["path"], ex=604800)
                            h["download_url"] = f"{base_url}/download/{h['hash']}"
                            
            tenant_data["pagination"] = {
                "limit": limit,
                "offset": offset,
                "total": total_devices,
                "next_page_url": f"{base_url}/config/{acronym}?limit={limit}&offset={offset+limit}" if offset + limit < total_devices else None
            }

        return {
            "success": True,
            "data": tenant_data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch external tenant config: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/external/download/{file_hash}")
def download_file(request: Request, file_hash: str):
    """Download a config file by its hash."""
    redis = request.app.state.redis_handler
    
    # Check if the hash is valid and map it to a file path
    filepath = redis.client.get(f"ham:download:{file_hash}")
    if not filepath:
        raise HTTPException(status_code=404, detail="File link expired or not found. Please refresh the tenant topology to generate a new link.")
        
    real_path = os.path.abspath(filepath)
    if not real_path.startswith("/ai/assets/vault"):
        raise HTTPException(status_code=403, detail="Forbidden path")
    if not os.path.exists(real_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    filename = os.path.basename(real_path)
    is_binary = filename.endswith(('.tgz', '.gz', '.zip', '.bin', '.tar'))
    is_base64 = False
    
    try:
        if is_binary:
            with open(real_path, "rb") as f:
                content = base64.b64encode(f.read()).decode('utf-8')
            is_base64 = True
        else:
            with open(real_path, "r", errors="ignore") as f:
                content = f.read()
    except Exception as e:
        logger.error(f"Failed to read file {real_path}: {e}")
        raise HTTPException(status_code=500, detail="Failed to read file content")
        
    return {
        "success": True,
        "data": {
            "filename": filename,
            "raw_config": content,
            "is_base64": is_base64
        }
    }
