# --- FILE: /ai/sera_admin_module/core/database/default_rules.py ---
import logging
from core.database.models import EventRule

logger = logging.getLogger(__name__)

SYSTEM_EVENT_DEFINITIONS = [
    {
        "incident_type": "HARDWARE_FAULT",
        "rule_name": "Global Hardware Failure",
        "trigger_description": "Triggers when the DCGM exporter reports an XID error code > 0 on any physical GPU node.",
        "default_cooldown": 60,
        "prompt_name": "GPU_DIAGNOSTIC_PROMPT",
        "requires_ai": True 
    },
    {
        "incident_type": "HEALTH_DEGRADED",
        "rule_name": "Global Inference Unhealthy",
        "trigger_description": "Triggers when the internal engine reports failures in Readiness, Identity, or Inference.",
        "default_cooldown": 5,
        "prompt_name": "TRAFFIC_DIAGNOSTIC_PROMPT",
        "requires_ai": True 
    },
    {
        "incident_type": "LATENCY_ISSUE",
        "rule_name": "High Latency / Timeouts",
        "trigger_description": "Triggers when HAProxy/F5 latency exceeds 4000ms.",
        "default_cooldown": 5,
        "prompt_name": None,
        "requires_ai": False 
    },
    {
        "incident_type": "TRAFFIC_SATURATION",
        "rule_name": "Global HAProxy Queue Depth",
        "trigger_description": "Triggers when HAProxy reports a connection queue depth > 0.",
        "default_cooldown": 5,
        "prompt_name": None,
        "requires_ai": False 
    },
    {
        "incident_type": "LARGE_BATCH_DETECTED",
        "rule_name": "KV Cache / Large Batch Warning",
        "trigger_description": "Triggers when the batching engine processes payloads > 75% of max batched tokens.",
        "default_cooldown": 5,
        "prompt_name": None,
        "requires_ai": False 
    },
    {
        "incident_type": "NODE_CORDONED",
        "rule_name": "Node Maintenance (Cordoned)",
        "trigger_description": "Triggers when a physical node is marked as unschedulable (cordoned) in Kubernetes.",
        "default_cooldown": 60, 
        "prompt_name": None,
        "requires_ai": False 
    },
    {
        "incident_type": "ZOMBIE_MODEL",
        "rule_name": "Configuration Drift (Zombie Model)",
        "trigger_description": "Triggers when a model has running pods but a missing/invalid HAProxy ingress class, degrading traffic observability.",
        "default_cooldown": 60,
        "prompt_name": "CONFIG_DRIFT_DIAGNOSTIC_PROMPT",
        "requires_ai": True 
    },
    {
        "incident_type": "DEAD_ROUTE",
        "rule_name": "Configuration Drift (Dead Route)",
        "trigger_description": "Triggers when HAProxy is advertising a route, but 0 pods exist.",
        "default_cooldown": 60,
        "prompt_name": None,
        "requires_ai": False 
    },
    {
        "incident_type": "TRITON_MEMORY_FAULT",
        "rule_name": "Triton Memory Pool Exhaustion",
        "trigger_description": "Triggers when Triton logs indicate CNMEM OOM or pinned memory allocation failures, causing CPU fallback.",
        "default_cooldown": 60,
        "prompt_name": "TRITON_DIAGNOSTIC_PROMPT",
        "requires_ai": True 
    },
    {
        "incident_type": "DEGRADED_POD",
        "rule_name": "Kubernetes Pod Degraded",
        "trigger_description": "Triggers when a model pod is running but fails to pass readiness checks or enters a degraded state (e.g., CrashLoopBackOff, OOMKilled).",
        "default_cooldown": 30,
        "prompt_name": "DEGRADED_POD_DIAGNOSTIC_PROMPT",
        "requires_ai": True 
    }
]

def sync_default_rules(session_factory):
    valid_incident_types = [r["incident_type"] for r in SYSTEM_EVENT_DEFINITIONS]
    
    with session_factory() as session:
        for rule_def in SYSTEM_EVENT_DEFINITIONS:
            existing = session.query(EventRule).filter_by(incident_type=rule_def["incident_type"]).first()
            if existing:
                existing.rule_name = rule_def["rule_name"]
                existing.trigger_description = rule_def["trigger_description"]
                existing.requires_ai_analysis = rule_def["requires_ai"]
                existing.prompt_name = rule_def["prompt_name"]
                existing.cooldown_minutes = rule_def["default_cooldown"] 
            else:
                new_rule = EventRule(
                    incident_type=rule_def["incident_type"],
                    rule_name=rule_def["rule_name"],
                    trigger_description=rule_def["trigger_description"],
                    cooldown_minutes=rule_def["default_cooldown"],
                    prompt_name=rule_def["prompt_name"],
                    requires_ai_analysis=rule_def["requires_ai"],
                    is_active=True
                )
                session.add(new_rule)
                
        session.query(EventRule).filter(EventRule.incident_type.not_in(valid_incident_types)).delete(synchronize_session=False)
        session.commit()
        logger.info("Synchronized SRE Event Rules from Python source into PostgreSQL.")