#!/usr/bin/env python3
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

try:
    import bootstrap_helper
    bootstrap_helper.bootstrap_and_reexecute_if_needed()
except ImportError:
    pass

from utils.config_loader import load_config
from core.database.database import get_engine
from sqlalchemy import text

def main():
    config = load_config()
    db_dsn = config.get('database', {}).get('write_dsn')
    
    if not db_dsn:
        print("[!] No database DSN found in settings.yaml")
        sys.exit(1)

    print(f"Connecting to database to add pod_name column to incidents table...")
    engine = get_engine(db_dsn)
    
    with engine.connect() as conn:
        try:
            # We use IF NOT EXISTS just in case it was already added
            conn.execute(text("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS pod_name VARCHAR(255);"))
            conn.commit()
            print("Successfully added pod_name column to incidents table!")
        except Exception as e:
            # If the dialect doesn't support IF NOT EXISTS, we handle the duplicate column error
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("Column pod_name already exists in incidents table.")
            else:
                print(f"[!] Failed to execute alter table: {e}")
                sys.exit(1)

if __name__ == "__main__":
    main()
