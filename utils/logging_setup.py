import os
import logging
from typing import Dict, Any

class EndpointFilter(logging.Filter):
    def __init__(self, path_to_filter: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.path_to_filter = path_to_filter

    def filter(self, record: logging.LogRecord) -> bool:
        if hasattr(record, 'args') and isinstance(record.args, tuple) and len(record.args) >= 3:
            path = record.args[2]
            if self.path_to_filter in path:
                return False
        return True

def get_logging_config(config: Dict[str, Any]) -> Dict[str, Any]:
    log_cfg = config["logging"]
    base_log_dir = log_cfg["directory"]
    console_level = log_cfg["level"].upper()
    
    os.makedirs(base_log_dir, exist_ok=True)
    
    api_log_file = os.path.join(base_log_dir, log_cfg["app_log_filename"])
    api_err_log_file = os.path.join(base_log_dir, log_cfg["error_log_filename"])

    return {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "filter_health": {
                "()": "utils.logging_setup.EndpointFilter",
                "path_to_filter": "/health"
            }
        },
        "formatters": {
            "standard": {
                "format": "%(asctime)s [%(levelname)-5s] [%(name)s] (%(module)s.%(funcName)s:%(lineno)d): %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "access": {
                "()": "uvicorn.logging.AccessFormatter",
                "fmt": '%(levelprefix)s %(asctime)s [%(name)s] :: %(client_addr)s - "%(request_line)s" %(status_code)s',
            },
        },
        "handlers": {
            "console": {
                "formatter": "standard",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
            "access_console": {
                "formatter": "access",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
                "filters": ["filter_health"] 
            },
            "file_app": {
                "class": "logging.handlers.TimedRotatingFileHandler",
                "formatter": "standard",
                "filename": api_log_file,
                "when": "midnight",
                "interval": 1,
                "backupCount": 14,
                "encoding": "utf-8",
            },
            "file_err": {
                "class": "logging.handlers.TimedRotatingFileHandler",
                "formatter": "standard",
                "filename": api_err_log_file,
                "level": "WARNING",
                "when": "midnight",
                "interval": 1,
                "backupCount": 14,
                "encoding": "utf-8"
            },
        },
        "loggers": {
            "": {"handlers": ["console", "file_app", "file_err"], "level": console_level},
            "uvicorn": {"handlers": ["console"], "level": "INFO", "propagate": False},
            "uvicorn.error": {"level": "INFO"},
            "uvicorn.access": {"handlers": ["access_console", "file_app"], "level": "INFO", "propagate": False},
        },
    }