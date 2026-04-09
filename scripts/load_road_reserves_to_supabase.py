"""
Ardhi Verified — Load Road Reserves to Supabase
=================================================
Reads scraped road reserve data from road_reserves_output.json
and inserts it into the road_reserves table in Supabase.

Usage:
    python3 scripts/load_road_reserves_to_supabase.py
"""

import json
import os
import sys

from supabase import create_client


INPUT_FILE = "scripts/road_reserves_output.json"


def load_env():
    """Parse .env.local file for Supabase credentials."""
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
    print("ARDHI VERIFIED — Load Road Reserves to Supabase")
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
        print(f"ERROR: {INPUT_FILE} not found. Run scrape_road_reserves.py first.")
        sys.exit(1)

    print(f"\n  Records in file: {len(records)}")

    print("\n  Connecting to Supabase...")
    supabase = create_client(supabase_url, supabase_key)

    inserted = 0
    skipped = 0
    errors = 0

    print(f"  Upserting records...\n")
    for i, record in enumerate(records):
        row = {
            "road_name": record.get("road_name", "Unknown"),
            "road_number": record.get("road_number"),
            "road_class": record.get("road_class"),
            "road_category": record.get("road_category"),
            "route_description": record.get("route_description"),
            "counties": record.get("counties", []),
            "region": record.get("region"),
            "road_length_km": record.get("road_length_km"),
            "reserve_width_metres": record.get("reserve_width_metres", 15),
            "geometry": record.get("geometry"),
            "source": record.get("source", "kenha"),
            "source_url": record.get("source_url"),
            "scraped_at": record.get("scraped_at"),
        }

        try:
            supabase.table("road_reserves").upsert(
                row, on_conflict="road_name,source"
            ).execute()
            inserted += 1
            if inserted % 100 == 0:
                print(f"    {inserted} upserted so far...")
        except Exception as e:
            error_msg = str(e)
            if "duplicate" in error_msg.lower():
                skipped += 1
            else:
                errors += 1
                if errors <= 5:
                    print(f"    Error on record {i+1}: {error_msg[:120]}")

    print(f"\n{'=' * 60}")
    print(f"  Done!")
    print(f"  Inserted:  {inserted}")
    print(f"  Skipped:   {skipped} (duplicates)")
    print(f"  Errors:    {errors}")
    print(f"  Total:     {len(records)}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
