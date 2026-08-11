import json
import logging
import redis
from typing import Any, Callable, Dict, Optional

logger = logging.getLogger(__name__)

class RedisHandler:
    def __init__(self, redis_url: str):
        try:
            self.client = redis.from_url(redis_url, decode_responses=True)
            self.client.set("__SERA_DB_OWNER__", "HAM - Cache")
            logger.info("Connected to Redis cache successfully.")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.client = None

    def get_json(self, key: str) -> Any:
        if not self.client: return None
        try:
            data = self.client.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            logger.error(f"Redis get_json error for key {key}: {e}")
            return None

    def set_json(self, key: str, data: Any, ex: int = 120) -> bool:
        if not self.client: return False
        try:
            return self.client.set(key, json.dumps(data), ex=ex)
        except Exception as e:
            logger.error(f"Redis set_json error for key {key}: {e}")
            return False

    def acquire_lock(self, lock_key: str, lock_value: str, ex: int = 300) -> bool:
        if not self.client: return False
        return bool(self.client.set(lock_key, lock_value, ex=ex, nx=True))

    def refresh_lock(self, lock_key: str, ex: int = 300) -> bool:
        if not self.client: return False
        return bool(self.client.expire(lock_key, ex))

    def fetch_or_cache(self, key: str, live_func: Callable, ex: int = 120) -> Any:
        cached = self.get_json(key)
        if cached:
            return cached
            
        logger.debug(f"Cache miss for {key}. Fetching live via gRPC/DB.") 
        
        try:
            live_data = live_func()
            self.set_json(key, live_data, ex=ex)
            return live_data
        except Exception as e:
            logger.error(f"Failed to fetch live data for {key}: {e}")
            return {"error": str(e)}

    def update_changelog_in_cache(self, project_name: str, new_releases: list):
        if not self.client: return
        try:
            cached_releases = self.get_json("ham:gitops:releases:all")
            if cached_releases is not None:
                updated_releases = [r for r in cached_releases if r.get("id") != project_name]
                for release in new_releases:
                    release_copy = release.copy()
                    release_copy["id"] = project_name
                    updated_releases.append(release_copy)
                
                updated_releases.sort(key=lambda x: x.get("date", "1970-01-01"), reverse=True)
                self.set_json("ham:gitops:releases:all", updated_releases, ex=3600)
        except Exception as e:
            logger.error(f"Failed to update ecosystem changelog cache for {project_name}: {e}")