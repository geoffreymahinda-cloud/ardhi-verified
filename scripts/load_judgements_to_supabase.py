"""
Ardhi Verified — Load ELC Judgements to Supabase
=================================================
Reads full judgment texts from elc_judgements.json
and inserts them into the elc_judgements table.

Deduplicates on source_url.

Usage:
    python3 scripts/load_judgements_to_supabase.py

Dependencies:
    pip install supabase
"""

import json
import os
import sys

from supabase import create_client

INPUT_FILE = "scripts/elc_judgements.json"
BATCH_SIZE = 50  # Smaller batches — full_text rows are large


def load_env():
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    env = {}
    try:
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    env[key.strip()] = value.strip()
    except FileNotFoundError:
        print("ERROR: .env.local not found")
        sys.exit(1)
    return env


def main():
    print("=" * 60)
    print("ARDHI VERIFIED — Load ELC Judgements to Supabase")
    print("=" * 60)

    env = load_env()
    supabase_url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        print("ERROR: Missing Supabase credentials in .env.local")
        sys.exit(1)

    key_type = "service_role" if env.get("SUPABASE_SERVICE_ROLE_KEY") else "anon"
    print("  Using key: {}".format(key_type))

    try:
        with open(INPUT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print("ERROR: {} not found. Run scrape_elc.py first.".format(INPUT_FILE))
        sys.exit(1)

    judgements = data.get("judgements", [])
    print("  Judgements to load: {}".format(len(judgements)))

    if not judgements:
        print("  Nothing to load.")
        return

    supabase = create_client(supabase_url, supabase_key)

    inserted = 0
    errors = 0

    for i in range(0, len(judgements), BATCH_SIZE):
        batch = judgements[i:i + BATCH_SIZE]
        rows = []
        for j in batch:
            rows.append({
                "case_number": j.get("case_number", ""),
                "case_title": j.get("case_title", ""),
                "parties": j.get("parties", ""),
                "judgement_date": j.get("judgement_date", ""),
                "full_text": j.get("full_text", ""),
                "parcel_references": j.get("parcel_references", []),
                "outcome": j.get("outcome", ""),
                "source_url": j["source_url"],
                "court_station": j.get("court_station", ""),
                "judge": j.get("judge", ""),
            })

        try:
            supabase.table("elc_judgements").upsert(
                rows, on_conflict="source_url"
            ).execute()
            inserted += len(rows)
            print("  {}/{} upserted...".format(inserted, len(judgements)))
        except Exception as e:
            errors += len(rows)
            if errors <= 5 * BATCH_SIZE:
                print("  ERROR at batch {}: {}".format(i, str(e)[:100]))

    print("\nDone!")
    print("  Inserted: {}".format(inserted))
    print("  Errors: {}".format(errors))
    print("  Total: {}".format(len(judgements)))


if __name__ == "__main__":
    main()
