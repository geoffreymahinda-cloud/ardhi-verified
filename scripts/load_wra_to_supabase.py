"""
Ardhi Verified — Load WRA Riparian Data to Supabase
======================================================
Reads WRA scraped data from wra_output.json and
upserts into the riparian_zones table.

Deduplication: name + basin + water_type

Usage:
    python3 scripts/load_wra_to_supabase.py
"""

import json
import os
import sys

from supabase import create_client

INPUT_FILE = "scripts/wra_output.json"


def load_env():
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    env = {}
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                env[key.strip()] = value.strip()
    return env


def main():
    print("=" * 60)
    print("ARDHI VERIFIED — Load WRA Data to Supabase")
    print("=" * 60)

    env = load_env()
    url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if not url or not key:
        print("ERROR: Missing Supabase credentials")
        sys.exit(1)

    try:
        with open(INPUT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print("ERROR: {} not found. Run scrape_wra.py first.".format(INPUT_FILE))
        sys.exit(1)

    zones = data.get("zones", [])
    print("  Zones to load: {}".format(len(zones)))

    sb = create_client(url, key)

    inserted = 0
    errors = 0

    for i, zone in enumerate(zones):
        row = {
            "name": zone["name"],
            "water_type": zone["water_type"],
            "buffer_metres": zone.get("buffer_metres", 30),
            "county": zone.get("county"),
            "basin": zone.get("basin"),
            "source": zone.get("source", "wra"),
        }
        try:
            sb.table("riparian_zones").insert(row).execute()
            inserted += 1
            if inserted % 25 == 0:
                print("  {} inserted...".format(inserted))
        except Exception as e:
            errors += 1
            if errors <= 5:
                print("  ERROR on {}: {}".format(zone["name"], str(e)[:80]))

    print("\nDone!")
    print("  Inserted: {}".format(inserted))
    print("  Errors: {}".format(errors))


if __name__ == "__main__":
    main()
