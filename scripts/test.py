#!/usr/bin/env python3
import os
import sys

# Setup paths for SAM core
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
sys.path.insert(0, PROJECT_ROOT)

try:
    import bootstrap_helper
    bootstrap_helper.bootstrap_and_reexecute_if_needed()
except ImportError:
    pass

from utils.config_loader import load_config
from core.database.database import get_engine, get_session_factory
from core.database.models import Incident, IncidentAnalysis

def main():
    config = load_config()
    db_dsn = config.get('database', {}).get('write_dsn')
    engine = get_engine(db_dsn)
    Session = get_session_factory(engine)

    with Session() as session:
        if len(sys.argv) > 1 and sys.argv[1] == "--delete-all":
            print("⚠️ Deleting all incidents and analyses...")
            session.query(IncidentAnalysis).delete()
            session.query(Incident).delete()
            session.commit()
            print("✅ Database cleared.")
            return

        # List recent events
        print(f"{'ID':<5} | {'TYPE':<20} | {'MODEL/HOST':<25} | {'STATUS':<10} | {'SEVERITY'}")
        print("-" * 80)
        
        incidents = session.query(Incident).order_by(Incident.created_at.desc()).limit(20).all()
        
        for inc in incidents:
            severity = inc.analysis.severity if inc.analysis else "PENDING"
            target = inc.model_name if inc.model_name else inc.hostname
            print(f"{inc.id:<5} | {inc.incident_type:<20} | {target:<25} | {inc.status:<10} | {severity}")

        # Specific check for Gemma-4-31b
        gemma_event = session.query(Incident).filter(
            Incident.model_name == "gemma-4-31B-it",
            Incident.status == "ACTIVE"
        ).first()

        print("\n--- Gemma-4-31B-it Verification ---")
        if gemma_event:
            print(f"✅ Found ACTIVE event (ID: {gemma_event.id})")
            if not gemma_event.analysis:
                print("⏳ Analysis: PENDING (LLM is likely processing the large batch context...)")
            else:
                print(f"🧠 AI Diagnosis: {gemma_event.analysis.severity}")
        else:
            print("❌ No active traffic incident found in DB for gemma-4-31B-it.")

if __name__ == "__main__":
    main()