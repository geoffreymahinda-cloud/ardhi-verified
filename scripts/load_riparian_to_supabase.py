"""
Ardhi Verified — Load Riparian Zones to Supabase
==================================================
Reads scraped riparian data from riparian_output.json
and inserts it into the riparian_zones table.

Usage:
    python3 scripts/load_riparian_to_supabase.py
"""

import json
import os
import sys

from supabase import create_client


INPUT_FILE = "scripts/riparian_output.json"


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
    print("ARDHI VERIFIED — Load Riparian Zones to Supabase")
    print("=" * 60)

    env = load_env()
    supabase_url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        print("ERROR: Missing SUPABASE_URL or key in .env.local")
        sys.exit(1)

    print(f"  Supabase URL: {supabase_url}")
    print(f"  Using key: {'service_role' if env.get('SUPABASE_SERVICE_ROLE_KEY') else 'anon'}")

    try:
        with open(INPUT_FILE, "r", encoding="utf-8") as f:
            records = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: {INPUT_FILE} not found. Run scrape_riparian_data.py first.")
        sys.exit(1)

    print(f"\n  Records in file: {len(records)}")

    print("\n  Connecting to Supabase...")
    supabase = create_client(supabase_url, supabase_key)

    inserted = 0
    errors = 0

    # Batch insert for speed — 50 at a time
    BATCH_SIZE = 50
    batch = []

    print(f"  Inserting records...\n")
    for i, record in enumerate(records):
        row = {
            "name": record.get("name", "Unknown"),
            "water_type": record.get("water_type", "river"),
            "buffer_metres": record.get("buffer_metres", 30),
            "county": record.get("county"),
            "basin": record.get("basin"),
            "geometry": record.get("geometry"),
            "source": record.get("source", "rcmrd_rivers"),
            "scraped_at": record.get("scraped_at"),
        }
        batch.append(row)

        if len(batch) >= BATCH_SIZE or i == len(records) - 1:
            try:
                supabase.table("riparian_zones").insert(batch).execute()
                inserted += len(batch)
                if inserted % 500 == 0 or i == len(records) - 1:
                    print(f"    {inserted} inserted so far...")
            except Exception as e:
                errors += len(batch)
                if errors <= 250:
                    print(f"    Batch error at {i+1}: {str(e)[:120]}")
            batch = []

    print(f"\n{'=' * 60}")
    print(f"  Done!")
    print(f"  Inserted:  {inserted}")
    print(f"  Errors:    {errors}")
    print(f"  Total:     {len(records)}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
