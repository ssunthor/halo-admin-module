from pydantic import BaseModel

class ReleaseRequest(BaseModel):
    project_name: str
    source_branch: str
    target_branch: str
    author: str

class RetryRequest(BaseModel):
    project_name: str
    pipeline_id: int
    merge_id: int
    author: str
