import os
import yaml
import logging
import zipfile
import io
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, PlainTextResponse, StreamingResponse
from utils.config_loader import load_config

logger = logging.getLogger(__name__)

config = load_config()
router = APIRouter(prefix="/api/docs", tags=["Documentation"])

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "../../"))

LOCAL_DOCS_DIR = os.path.join(PROJECT_ROOT, "docs")
GLOBAL_DOCS_DIR = config.get("paths", {}).get("docs_base_path", "/ai/assets/guides")

def get_file_for_module(module_id: str, file_key: str) -> str:
    for mod in config.get("registered_modules", []):
        if mod.get("id") == module_id:
            return mod.get(file_key)
    return None

def resolve_file_path(filename: str) -> str:
    local_path = os.path.join(LOCAL_DOCS_DIR, filename)
    if os.path.exists(local_path):
        return local_path
        
    global_path = os.path.join(GLOBAL_DOCS_DIR, filename)
    if os.path.exists(global_path):
        return global_path
        
    return None

@router.get("/config")
def get_docs_config():
    return config.get("registered_modules", [])

@router.get("/content/{module_id}", response_class=PlainTextResponse)
def get_doc_content(module_id: str):
    file_path = get_file_for_module(module_id, "docs_file")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Module documentation file not found.")
        
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()

@router.get("/changelog")
def get_changelog(request: Request):
    modules = config.get("registered_modules", [])
    all_releases = []
    
    for mod in modules:
        file_path = mod.get("changelog_file")
        if file_path and os.path.exists(file_path):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                    if data:
                        for release in data:
                            release["service"] = mod.get("name", "Unknown Service")
                            release["id"] = mod.get("id", "UNK")
                            all_releases.append(release)
            except Exception as e:
                logger.error(f"Failed to parse changelog {file_path}: {e}")
                
    all_releases.sort(key=lambda x: x.get("date", "1970-01-01"), reverse=True)
    
    return all_releases

@router.get("/download/changelogs/all")
def download_all_changelogs():
    modules = config.get("registered_modules", [])
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for mod in modules:
            file_path = mod.get("changelog_file")
            mod_id = mod.get("id", "UNK").upper()
            
            if file_path and os.path.exists(file_path):
                # Rename the file inside the zip archive
                archive_name = f"{mod_id}_CHANGELOG.yaml"
                zip_file.write(file_path, arcname=archive_name)
                
    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=sera_ecosystem_changelogs.zip"}
    )

@router.get("/download/{module_id}")
def download_doc(module_id: str):
    file_path = get_file_for_module(module_id, "docs_file")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(file_path, filename=os.path.basename(file_path))