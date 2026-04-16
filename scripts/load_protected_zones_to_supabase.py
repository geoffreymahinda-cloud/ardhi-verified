"""
Ardhi Verified — Load Protected Zones to Supabase
===================================================
Reads scraped OSM data from protected_zones_output.json
and upserts into the protected_zones table.

Usage:
    python3 scripts/load_protected_zones_to_supabase.py

Dependencies:
    pip install supabase
"""

import json
import os
import sys

from supabase import create_client


INPUT_FILE = os.path.join(os.path.dirname(__file__), "protected_zones_output.json")


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
    print("ARDHI VERIFIED — Load Protected Zones to Supabase")
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
            data = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: {INPUT_FILE} not found. Run scrape_protected_zones.py first.")
        sys.exit(1)

    zones = data.get("zones", [])
    print(f"\n  Zones in file: {len(zones)}")

    print("\n  Connecting to Supabase...")
    supabase = create_client(supabase_url, supabase_key)

    inserted = 0
    errors = 0

    for i, z in enumerate(zones):
        row = {
            "name": z["name"],
            "osm_id": z["osm_id"],
            "osm_type": z["osm_type"],
            "designation": z.get("designation"),
            "boundary": z.get("boundary"),
            "protection_title": z.get("protection_title"),
            "area_hectares": z.get("area_hectares"),
            "source": z.get("source", "openstreetmap"),
            "source_url": z.get("source_url"),
            "geometry": z.get("geometry"),
            "tags": z.get("tags"),
            "scraped_at": z.get("scraped_at"),
        }
        try:
            supabase.table("protected_zones").upsert(
                row, on_conflict="osm_type,osm_id"
            ).execute()
            inserted += 1
            if inserted % 25 == 0:
                print(f"    {inserted} upserted...")
        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"    ERROR on {z['name'][:40]}: {str(e)[:120]}")

    # Summary
    by_designation = {}
    for z in zones:
        d = z.get("designation", "unknown")
        by_designation[d] = by_designation.get(d, 0) + 1

    print(f"\n{'=' * 60}")
    print(f"  Done!")
    print(f"  Upserted: {inserted}")
    print(f"  Errors:   {errors}")
    print(f"  Total:    {len(zones)}")
    print(f"\n  By designation:")
    for d, c in sorted(by_designation.items(), key=lambda x: -x[1]):
        print(f"    {d}: {c}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
