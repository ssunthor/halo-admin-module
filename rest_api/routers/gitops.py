import logging
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks

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

def background_fetch_and_cache(connector, redis, group_path: str, cache_key: str):
    try:
        logger.debug(f"Starting background fetch for GitOps inventory: {group_path}")
        live_data = connector.get_git_inventory(group_path=group_path)
        # Cache for 5 minutes, UI will keep triggering background refreshes every 1 min
        redis.set_json(cache_key, live_data, ex=300)
        logger.debug(f"Successfully refreshed GitOps inventory cache: {cache_key}")
    except Exception as e:
        logger.error(f"Background fetch for gitops failed: {e}")

@router.get("/inventory")
def get_gitops_inventory(request: Request, background_tasks: BackgroundTasks, group_path: str = "ai/halo"):
    connector = get_hau_connector(request)
    redis = get_redis_handler(request)
    
    cache_key = f"ham:gitops:inventory:{group_path}"
    
    # 1. Immediate Cache Return
    cached_data = redis.get_json(cache_key)
    if cached_data:
        # Spawn background task to refresh the data silently for subsequent requests
        background_tasks.add_task(background_fetch_and_cache, connector, redis, group_path, cache_key)
        return {"success": True, "data": cached_data}
        
    # 2. Cache Miss (First load after redis restart) - synchronous wait
    try:
        live_data = connector.get_git_inventory(group_path=group_path)
        redis.set_json(cache_key, live_data, ex=300)
        return {"success": True, "data": live_data}
    except Exception as e:
        logger.error(f"Failed to fetch gitops inventory synchronously: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/releases")
def get_all_gitops_releases(request: Request, background_tasks: BackgroundTasks):
    redis = get_redis_handler(request)
    cache_key = "ham:gitops:releases:all"
    
    cached_data = redis.get_json(cache_key)
    if cached_data is not None:
        return cached_data
        
    connector = get_hau_connector(request)
    try:
        inventory = connector.get_git_inventory(group_path="ai/halo")
        projects = inventory.get("projects", [])
        
        all_releases = []
        for proj in projects:
            proj_name = proj.get("name")
            if not proj_name: continue
            
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

