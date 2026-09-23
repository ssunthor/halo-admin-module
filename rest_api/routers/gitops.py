import logging
import time
import uuid
import json
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
from rest_api.schemas import ReleaseRequest, RetryRequest, DeleteRequest, ClearCacheRequest
from rest_api.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/gitops", tags=["GitOps Inventory"])

def get_hau_connector(request: Request):
    if not hasattr(request.app.state, "hau_connector"):
        raise HTTPException(status_code=503, detail="HAU Connector not initialized")
    return request.app.state.hau_connector

def get_redis_handler(request: Request):
    if not hasattr(request.app.state, "redis_handler"):
        raise HTTPException(status_code=503, detail="Redis Handler not initialized")
    return request.app.state.redis_handler

def background_fetch_and_cache(connector, redis, project_name: str, cache_key: str):
    try:
        logger.debug(f"Starting background fetch for GitOps inventory: {project_name}")
        if project_name:
            try:
                connector.sync_git_inventory(project_name=project_name)
            except Exception as sync_e:
                logger.error(f"Failed to sync git inventory before fetch: {sync_e}")
        live_data = connector.get_git_inventory(project_name=project_name)
        # Cache for 5 minutes, UI will keep triggering background refreshes every 1 min
        redis.set_json(cache_key, live_data, ex=300)
        logger.debug(f"Successfully refreshed GitOps inventory cache: {cache_key}")
    except Exception as e:
        logger.error(f"Background fetch for gitops failed: {e}")

@router.get("/inventory")
def get_gitops_inventory(request: Request, background_tasks: BackgroundTasks, project_name: str = ""):
    connector = get_hau_connector(request)
    redis = get_redis_handler(request)
    
    cache_key = f"ham:gitops:inventory:{project_name}"
    
    # 1. Immediate Cache Return
    cached_data = redis.get_json(cache_key)
    if cached_data:
        # Spawn background task to refresh the data silently for subsequent requests
        background_tasks.add_task(background_fetch_and_cache, connector, redis, project_name, cache_key)
        return {"success": True, "data": cached_data}
        
    # 2. Cache Miss (First load after redis restart) - synchronous wait
    try:
        live_data = connector.get_git_inventory(project_name=project_name)
        redis.set_json(cache_key, live_data, ex=300)
        return {"success": True, "data": live_data}
    except Exception as e:
        logger.error(f"Failed to fetch gitops inventory synchronously: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cache/clear")
def clear_gitops_cache(request: Request, body: ClearCacheRequest):
    redis = get_redis_handler(request)
    if body.project_name:
        redis.client.delete(f"ham:gitops:inventory:{body.project_name}")
        redis.client.delete(f"ham:gitops:audit:{body.project_name}")
    redis.client.delete("ham:gitops:inventory:")
    redis.client.delete("ham:gitops:releases:all")
    return {"success": True, "message": "Cache cleared successfully"}

@router.post("/sync")
def sync_gitops_endpoint(request: Request):
    connector = get_hau_connector(request)
    def stream_generator():
        try:
            for item in connector.sync_git_inventory():
                import json
                yield json.dumps(item) + "\n"
        except Exception as e:
            import json
            yield json.dumps({"success": False, "message": str(e)}) + "\n"
            
    return StreamingResponse(stream_generator(), media_type="application/x-ndjson")

@router.get("/releases")
def get_all_gitops_releases(request: Request, background_tasks: BackgroundTasks):
    redis = get_redis_handler(request)
    cache_key = "ham:gitops:releases:all"
    
    cached_data = redis.get_json(cache_key)
    if cached_data is not None:
        return cached_data
        
    connector = get_hau_connector(request)
    try:
        inventory = connector.get_git_inventory(project_name="")
        projects = inventory.get("projects", [])
        
        all_releases = []
        for proj in projects:
            proj_name = proj.get("name")
            if not proj_name: continue
            
            if proj.get("type") == "INFORMATIONAL":
                continue
            
            try:
                raw_yaml = connector.get_changelog(project_name=proj_name)
                import yaml
                data = yaml.safe_load(raw_yaml) if raw_yaml else []
                for release in data:
                    release["id"] = proj_name
                    all_releases.append(release)
            except Exception as e:
                logger.warning(f"Failed to fetch changelog for {proj_name}: {e}")
                
        all_releases.sort(key=lambda x: x.get("date", "1970-01-01"), reverse=True)
        redis.set_json(cache_key, all_releases, ex=900)
        return all_releases
    except Exception as e:
        logger.error(f"Failed to fetch all releases: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/changelog/{project_name}")
def get_project_changelog(request: Request, background_tasks: BackgroundTasks, project_name: str):
    connector = get_hau_connector(request)
    redis = get_redis_handler(request)
    cache_key = f"ham:gitops:changelog:{project_name}"
    
    cached_data = redis.get_json(cache_key)
    if cached_data is not None:
        return {"success": True, "data": cached_data}
        
    try:
        raw_yaml = connector.get_changelog(project_name=project_name)
        import yaml
        data = yaml.safe_load(raw_yaml) if raw_yaml else []
        redis.set_json(cache_key, data, ex=600)
        
        background_tasks.add_task(redis.update_changelog_in_cache, project_name, data)
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Failed to fetch changelog for {project_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documentation/{project_name}")
def get_project_documentation(request: Request, project_name: str):
    connector = get_hau_connector(request)
    redis = get_redis_handler(request)
    cache_key = f"ham:gitops:docs:{project_name}"
    
    cached_data = redis.get_json(cache_key)
    if cached_data is not None:
        return {"success": True, "data": cached_data}
        
    try:
        docs = connector.get_documentation(project_name=project_name)
        redis.set_json(cache_key, docs, ex=600)
        return {"success": True, "data": docs}
    except Exception as e:
        logger.error(f"Failed to fetch docs for {project_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/audit")
def get_project_audit_logs(request: Request, project_name: str):
    connector = get_hau_connector(request)
    redis = get_redis_handler(request)
    cache_key = f"ham:gitops:audit:{project_name}"
    
    cached_data = redis.get_json(cache_key)
    if cached_data is not None:
        return {"success": True, "data": cached_data}
        
    try:
        # pass project_name to get all audit logs for the project
        audit_logs = connector.get_git_audit(project_name=project_name)
        redis.set_json(cache_key, audit_logs, ex=300)
        return {"success": True, "data": audit_logs}
    except Exception as e:
        logger.error(f"Failed to fetch audit logs for {project_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def stream_logs_to_redis(redis, task_id: str, stream_generator):
    cache_key = f"ham:gitops:task:{task_id}:logs"
    status_key = f"ham:gitops:task:{task_id}:status"
    
    redis.client.set(status_key, "RUNNING", ex=3600)
    
    try:
        for resp in stream_generator:
            log_entry = {
                "ts": time.time(),
                "success": resp.success,
                "message": resp.message,
                "stage": resp.stage if hasattr(resp, 'stage') else ""
            }
            # Append log to redis list
            redis.client.rpush(cache_key, json.dumps(log_entry))
            redis.client.expire(cache_key, 3600)
            
            if not resp.success:
                redis.client.set(status_key, "FAILED", ex=3600)
                return
                
        redis.client.set(status_key, "COMPLETED", ex=3600)
    except Exception as e:
        logger.error(f"Stream error: {e}")
        redis.client.set(status_key, "FAILED", ex=3600)
        redis.client.rpush(cache_key, json.dumps({
            "ts": time.time(),
            "success": False,
            "message": f"Stream failed: {e}",
            "stage": "STREAM_ERROR"
        }))

@router.post("/release")
def trigger_release(request: Request, body: ReleaseRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    connector = get_hau_connector(request)
    redis = get_redis_handler(request)
    task_id = str(uuid.uuid4())
    
    actor_name = current_user.get("full_name") or current_user.get("display_name") or current_user.get("username") or "Unknown"
    
    try:
        stream = connector.trigger_git_release(
            project_name=body.project_name,
            source_branch=body.source_branch,
            target_branch=body.target_branch,
            author=actor_name,
            release_only=body.release_only
        )
        
        # Save task mapping to project
        task_list_key = f"ham:gitops:tasks:{body.project_name}"
        redis.client.lpush(task_list_key, task_id)
        redis.client.ltrim(task_list_key, 0, 9) # keep last 10
        
        background_tasks.add_task(stream_logs_to_redis, redis, task_id, stream)
        return {"success": True, "task_id": task_id}
    except Exception as e:
        logger.error(f"Failed to trigger release: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/retry")
def trigger_retry(request: Request, body: RetryRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    connector = get_hau_connector(request)
    redis = get_redis_handler(request)
    task_id = str(uuid.uuid4())
    
    actor_name = current_user.get("full_name") or current_user.get("display_name") or current_user.get("username") or "Unknown"
    
    try:
        stream = connector.trigger_git_retry(
            project_name=body.project_name,
            pipeline_id=body.pipeline_id,
            merge_id=body.merge_id,
            author=actor_name
        )
        
        task_list_key = f"ham:gitops:tasks:{body.project_name}"
        redis.client.lpush(task_list_key, task_id)
        redis.client.ltrim(task_list_key, 0, 9)
        
        background_tasks.add_task(stream_logs_to_redis, redis, task_id, stream)
        return {"success": True, "task_id": task_id}
    except Exception as e:
        logger.error(f"Failed to trigger retry: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/delete")
def trigger_delete(request: Request, body: DeleteRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    connector = get_hau_connector(request)
    
    actor_name = current_user.get("full_name") or current_user.get("display_name") or current_user.get("username") or "Unknown"
    
    try:
        response = connector.trigger_git_delete(
            project_name=body.project_name,
            branch_name=body.branch_name,
            container_tag=body.container_tag,
            author=actor_name
        )
        if response.get("success"):
            redis = get_redis_handler(request)
            redis.client.delete(f"ham:gitops:inventory:{body.project_name}")
            redis.client.delete(f"ham:gitops:audit:{body.project_name}")
            redis.client.delete(f"ham:gitops:inventory:") # Clear the global inventory cache too if needed, but project-specific is key
            
        return response
    except Exception as e:
        logger.error(f"Failed to trigger delete: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks")
def get_project_tasks(request: Request, project_name: str):
    redis = get_redis_handler(request)
    task_list_key = f"ham:gitops:tasks:{project_name}"
    
    task_ids = redis.client.lrange(task_list_key, 0, -1)
    if not task_ids:
        raise HTTPException(status_code=404, detail="No tasks found for project")
        
    tasks = []
    for tid in task_ids:
        tid_str = tid.decode('utf-8') if isinstance(tid, bytes) else tid
        status = redis.client.get(f"ham:gitops:task:{tid_str}:status") or "UNKNOWN"
        tasks.append({"task_id": tid_str, "status": status.decode('utf-8') if isinstance(status, bytes) else status})
        
    return {"success": True, "tasks": tasks}

@router.get("/tasks/{task_id}/logs")
def get_task_logs(request: Request, task_id: str):
    redis = get_redis_handler(request)
    
    cache_key = f"ham:gitops:task:{task_id}:logs"
    status_key = f"ham:gitops:task:{task_id}:status"
    
    logs_raw = redis.client.lrange(cache_key, 0, -1)
    status_raw = redis.client.get(status_key)
    
    logs = [json.loads(l) for l in logs_raw] if logs_raw else []
    status = status_raw.decode('utf-8') if isinstance(status_raw, bytes) else (status_raw or "UNKNOWN")
    
    return {"success": True, "task_id": task_id, "status": status, "logs": logs}
