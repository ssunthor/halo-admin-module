import logging
import sys
import os

# Add the project root to the python path so imports work
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

import bootstrap_helper
bootstrap_helper.bootstrap_and_reexecute_if_needed()

from utils.config_loader import load_config
from core.llm_interface import vLLMClient

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    logger.info("Loading SAM configuration...")
    try:
        config = load_config()
    except Exception as e:
        logger.error(f"Failed to load configuration: {e}")
        sys.exit(1)

    llm_engines = config.get("llm_engines", {})
    if not llm_engines:
        logger.warning("No `llm_engines` found in configuration.")
        sys.exit(0)

    auth_cfg = config.get("auth", {})

    logger.info(f"Found {len(llm_engines)} configured LLM engines. Testing using vLLMClient wrapper...")
    
    for alias, cfg in llm_engines.items():
        print(f"\n{'-'*50}")
        if cfg.get("provider") != "vllm":
            logger.warning(f"⚠️ Skipping non-vLLM model alias '{alias}' (Provider: {cfg.get('provider')}) since SAM's core client is vLLMClient.")
            continue
            
        logger.info(f"Initializing vLLMClient for '{alias}' (Model: {cfg['model']})")
        try:
            client = vLLMClient(cfg, auth_cfg=auth_cfg)
        except Exception as e:
            logger.error(f"❌ Failed to initialize client: {e}", exc_info=True)
            continue
            
        logger.info("Testing get_chat_completion()...")
        try:
            messages = [{"role": "user", "content": "Reply with exactly 'OK'."}]
            response = client.get_chat_completion(messages=messages, json_mode=False, max_retries=1)
            if response and "content" in response:
                reply = response.get("content", "")
                logger.info(f"✅ Success! Reply: {reply}")
            else:
                logger.error(f"❌ Failed: get_chat_completion() returned invalid or empty response: {response}")
        except Exception as e:
            logger.error(f"❌ Failed: {e}", exc_info=True)

if __name__ == "__main__":
    main()
