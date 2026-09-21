from pydantic import BaseModel

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
