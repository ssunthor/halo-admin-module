from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ClearCacheRequest(BaseModel):
    project_name: str

class ReleaseRequest(BaseModel):
    project_name: str
    source_branch: str
    target_branch: str
    author: str
    release_only: bool = False

class RetryRequest(BaseModel):
    project_name: str
    pipeline_id: int
    merge_id: int
    author: str

class DeleteRequest(BaseModel):
    project_name: str
    branch_name: str = ""
    container_tag: str = ""
    author: str = "Unknown"

class UpdateCustomizationRequest(BaseModel):
    tenant_slug: str
    tenant_category: str = ""
    tenant_tier: str = ""
    update_policy: str = ""
    owner: str = ""
    purpose: str = ""
    maintenance_window: str = ""
    configuration_payload: str = ""


class SiteInfoSchema(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    facility: Optional[str] = None
    category: Optional[str] = None
    physical_address: Optional[str] = None
    shipping_address: Optional[str] = None
    status: Optional[str] = None
    cmd_fac_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    country: Optional[str] = None

class CmdInfoSchema(BaseModel):
    slid: Optional[str] = None
    gnid: Optional[str] = None

class ConfigHistorySchema(BaseModel):
    date: Optional[str] = None
    hash: Optional[str] = None
    path: Optional[str] = None
    type: Optional[str] = None
    created_at: Optional[str] = None
    download_url: Optional[str] = None  # Added by external.py

class ConfigDataSchema(BaseModel):
    filename: Optional[str] = None
    history: List[ConfigHistorySchema] = []

class AuditDataSchema(BaseModel):
    validation_status: Optional[str] = None
    is_client_match: Optional[bool] = None
    is_address_match: Optional[bool] = None
    segment_id: Optional[int] = None
    segment_data: Optional[Dict[str, Any]] = None
    gnid_data: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class AssociatedIpSchema(BaseModel):
    address: Optional[str] = None
    interface_name: Optional[str] = None
    is_primary: Optional[bool] = None

class AssociatedPrefixSchema(BaseModel):
    prefix: Optional[str] = None
    network_category: Optional[str] = None

class TenantInfoSchema(BaseModel):
    name: Optional[str] = None
    acronym: Optional[str] = None
    slug: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class DeviceSchema(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    tenant_acronym: Optional[str] = None
    netbox_id: Optional[int] = None
    netbox_type: Optional[str] = None
    alias: Optional[str] = None
    cmd: Optional[CmdInfoSchema] = None
    platform: Optional[str] = None
    os_build: Optional[str] = None
    model: Optional[str] = None
    category: Optional[str] = None
    role: Optional[str] = None
    manufacturer: Optional[str] = None
    serial_number: Optional[str] = None
    site: Optional[SiteInfoSchema] = None
    cluster_name: Optional[str] = None
    primary_ip: Optional[str] = None
    status: Optional[str] = None
    config: Optional[ConfigDataSchema] = None
    netbox_created_at: Optional[str] = None
    netbox_updated_at: Optional[str] = None
    tenant_info: Optional[TenantInfoSchema] = None
    audit: Optional[AuditDataSchema] = None
    associated_ips: List[AssociatedIpSchema] = []
    associated_prefixes: List[AssociatedPrefixSchema] = []
    
    audit_status: Optional[str] = None
    has_ip: Optional[bool] = None
    has_config: Optional[bool] = None
    site_code: Optional[str] = None
    country: Optional[str] = None
    
    device_url: Optional[str] = None

class PaginationSchema(BaseModel):
    limit: int
    offset: int
    total: int
    next_page_url: Optional[str] = None

class TenantTopologySchema(BaseModel):
    slug: Optional[str] = None
    acronym: Optional[str] = None
    name: Optional[str] = None
    netbox_id: Optional[int] = None
    device_count: Optional[int] = None
    last_config_sync_at: Optional[str] = None
    last_netbox_sync_at: Optional[str] = None
    last_cmd_sync_at: Optional[str] = None
    devices: List[DeviceSchema] = []
    
    tenant_url: Optional[str] = None
    config_url: Optional[str] = None
    pagination: Optional[PaginationSchema] = None

class TenantTopologyResponseSchema(BaseModel):
    success: bool
    data: List[TenantTopologySchema]
    
class SingleTenantTopologyResponseSchema(BaseModel):
    success: bool
    data: TenantTopologySchema

class DeviceResponseSchema(BaseModel):
    success: bool
    data: DeviceSchema

class LightweightDeviceSchema(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    audit_status: Optional[str] = None
    has_ip: Optional[bool] = None
    has_config: Optional[bool] = None
    site_code: Optional[str] = None
    country: Optional[str] = None
    tenant_acronym: Optional[str] = None

class LightweightTenantTopologySchema(BaseModel):
    slug: Optional[str] = None
    acronym: Optional[str] = None
    name: Optional[str] = None
    netbox_id: Optional[int] = None
    device_count: Optional[int] = None
    last_config_sync_at: Optional[str] = None
    last_netbox_sync_at: Optional[str] = None
    last_cmd_sync_at: Optional[str] = None
    devices: List[LightweightDeviceSchema] = []
    
    tenant_url: Optional[str] = None
    config_url: Optional[str] = None
    pagination: Optional[PaginationSchema] = None

class LightweightTenantTopologyResponseSchema(BaseModel):
    success: bool
    data: List[LightweightTenantTopologySchema]

class SingleLightweightTenantTopologyResponseSchema(BaseModel):
    success: bool
    data: LightweightTenantTopologySchema
