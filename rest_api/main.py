import os
import time
import logging
import asyncio
from logging.config import dictConfig
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from utils.config_loader import load_config
from utils.logging_setup import get_logging_config
from core.connectors.hau_connector import HAUConnector

from core.database.database import get_engine, get_session_factory, init_db
from core.io_handlers.redis_handler import RedisHandler

from rest_api.routers import inventory, users, docs, gitops
import random

config = load_config()
dictConfig(get_logging_config(config))
logger = logging.getLogger(__name__)

def sync_gitops_task(state):
    try:
        connector = state.hau_connector
        redis = state.redis_handler

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
        redis.set_json("ham:gitops:releases:all", all_releases, ex=3600)
    except Exception as e:
        logger.error(f"GitOps background sync failed: {e}", exc_info=True)

async def gitops_daemon(app: FastAPI):
    await asyncio.sleep(random.uniform(2.0, 5.0))
    redis = app.state.redis_handler
    
    while True:
        try:
            if redis.acquire_lock("ham:daemon:gitops_lock", str(os.getpid()), ex=3600):
                redis.refresh_lock("ham:daemon:gitops_lock", ex=3600)
                await asyncio.to_thread(sync_gitops_task, app.state)
            else:
                logger.debug(f"Worker {os.getpid()} is follower for GitOps. Skipping.")
        except Exception as e:
            logger.error(f"GitOps daemon error: {e}", exc_info=True)
        await asyncio.sleep(3600)

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.config = config
    try:
        redis_url = config.get('redis', {}).get('url')
        app.state.redis_handler = RedisHandler(redis_url)
        
        app.state.hau_connector = HAUConnector(config)
        
        db_dsn = config.get('database', {}).get('write_dsn')
        engine = get_engine(db_dsn)
        init_db(engine)
        session_factory = get_session_factory(engine)
        app.state.session_factory = session_factory
        
        asyncio.create_task(gitops_daemon(app))
        
    except Exception as e:
        logger.critical(f"Initialization failed: {e}", exc_info=True)
    yield

app = FastAPI(
    title="Halo Admin Module API", 
    lifespan=lifespan,
    docs_url="/api/swagger",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": "Validation Error", "body": exc.errors()})

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    if not request.url.path.startswith("/assets"):
        logger.info(f"REQ | {request.method} {request.url.path} | Status: {response.status_code} | Time: {process_time:.2f}ms")
    return response

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(inventory.router)
app.include_router(users.router)
app.include_router(docs.router)
app.include_router(gitops.router)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
STATIC_DIR = os.path.join(PROJECT_ROOT, "ui/dist")
CUSTOM_STATIC_DIR = os.path.join(PROJECT_ROOT, "static")

if os.path.exists(CUSTOM_STATIC_DIR):
    app.mount("/static", StaticFiles(directory=CUSTOM_STATIC_DIR), name="static")

if os.path.exists(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")
    
    @app.get("/{full_path:path}", response_class=FileResponse, include_in_schema=False)
    async def serve_react_app(full_path: str):
        if full_path.startswith("api/"): raise HTTPException(status_code=404, detail="API route not found")
        path = os.path.join(STATIC_DIR, full_path)
        if os.path.exists(path) and os.path.isfile(path): return FileResponse(path)
        index_path = os.path.join(STATIC_DIR, "index.html")
        if os.path.exists(index_path): return FileResponse(index_path)
        return JSONResponse(status_code=404, content={"detail": "Frontend build not found."})
else:
    @app.get("/")
    def root_fallback(): return {"detail": "API is running, but frontend is not built."}