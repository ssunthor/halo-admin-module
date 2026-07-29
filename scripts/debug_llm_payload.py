#!/usr/bin/env python3
import os
import sys
import argparse

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
from core.database.database import get_engine, get_session_factory
from core.database.models import Incident, IncidentAnalysis

def main():
    parser = argparse.ArgumentParser(description="Dump the EXACT raw prompt and response for an incident.")
    parser.add_argument("--limit", type=int, default=1, help="Number of recent prompts to show.")
    args = parser.parse_args()

    config = load_config()
    db_dsn = config.get('database', {}).get('write_dsn')
    
    if not db_dsn:
        print("[!] No database DSN found in settings.yaml")
        sys.exit(1)

    engine = get_engine(db_dsn)
    Session = get_session_factory(engine)

    with Session() as session:
        analyses = session.query(IncidentAnalysis).order_by(IncidentAnalysis.created_at.desc()).limit(args.limit).all()
        
        if not analyses:
            print("No LLM analyses found in the database. Trigger a diagnosis from the UI first.")
            sys.exit(0)

        for analysis in analyses:
            incident = analysis.incident
            print("=" * 100)
            print(f"REAL LLM PAYLOAD DUMP | Incident ID: {incident.id}")
            print(f"Target: {incident.hostname} (GPU {incident.gpu_id}) | Error: {incident.error_code}")
            print(f"Generated At: {analysis.created_at}")
            print("=" * 100 + "\n")
            
            print(analysis.raw_prompt)
            
            print("\n" + "=" * 40 + " LLM REASONING " + "=" * 40 + "\n")
            print(analysis.reasoning if analysis.reasoning else "[No reasoning trace returned. Is enable_thinking=true?]")
            
            print("\n" + "=" * 41 + " LLM OUTPUT " + "=" * 41 + "\n")
            print(analysis.content)
            print("\n" + "=" * 100 + "\n")

if __name__ == "__main__":
    main()