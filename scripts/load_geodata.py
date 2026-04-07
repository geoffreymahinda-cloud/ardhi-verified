"""
Ardhi Verified — Load Kenya County Boundaries to Supabase
==========================================================
Downloads Kenya ADM1 (county-level) boundary GeoJSON from
OCHA/HumData, then inserts all 47 counties into a
county_intelligence table in Supabase.

Usage:
    python3 scripts/load_geodata.py

Prerequisites:
    pip install supabase requests

The script also outputs a SQL migration that creates the
table with RLS (public read access) — run this in the
Supabase SQL editor first.
"""

import json
import io
import os
import sys
import zipfile

import requests
from supabase import create_client

# ── CONFIGURATION ───────────────────────────────────────────────────────────

GEOJSON_ZIP_URL = (
    "https://data.humdata.org/dataset/2c0b7571-4bef-4347-9b81-b2174c13f9ef"
    "/resource/27fbee5d-19a5-4bb4-8a52-83093271c5bb"
    "/download/ken_admin_boundaries.geojson.zip"
)
ADM1_FILENAME = "ken_admin1.geojson"

HEADERS = {
    "User-Agent": "ArdhiVerified-GeoBot/1.0 (hello@ardhiverified.com)"
}

# SQL migration to create the table — run this in Supabase SQL editor first
MIGRATION_SQL = """
-- County intelligence table for geospatial data
CREATE TABLE IF NOT EXISTS county_intelligence (
    id SERIAL PRIMARY KEY,
    county_name TEXT NOT NULL UNIQUE,
    county_code TEXT NOT NULL UNIQUE,
    geometry JSONB NOT NULL,
    center_lat DOUBLE PRECISION,
    center_lon DOUBLE PRECISION,
    area_sqkm DOUBLE PRECISION,
    population INTEGER,
    avg_land_price_kes NUMERIC,
    infrastructure_score NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE county_intelligence ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access" ON county_intelligence
    FOR SELECT USING (true);

-- Only service role can insert/update
CREATE POLICY "Service role write access" ON county_intelligence
    FOR ALL USING (auth.role() = 'service_role');
"""


# ── ENV LOADER ──────────────────────────────────────────────────────────────

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


# ── DOWNLOAD + PARSE ───────────────────────────────────────────────────────

def download_geojson() -> dict:
    """Download the Kenya admin boundaries GeoJSON zip and extract ADM1."""
    print("Downloading Kenya county boundaries...")
    response = requests.get(GEOJSON_ZIP_URL, headers=HEADERS, timeout=60)
    response.raise_for_status()

    print("  Downloaded {} bytes".format(len(response.content)))

    with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
        names = zf.namelist()
        print("  Files in zip: {}".format(", ".join(names)))

        # Find the ADM1 file
        adm1_path = None
        for name in names:
            if ADM1_FILENAME in name:
                adm1_path = name
                break

        if not adm1_path:
            print("ERROR: {} not found in zip".format(ADM1_FILENAME))
            sys.exit(1)

        with zf.open(adm1_path) as f:
            data = json.load(f)

    print("  Loaded {} features from {}".format(len(data["features"]), adm1_path))
    return data


def parse_counties(geojson: dict) -> list:
    """Extract county records from GeoJSON features."""
    counties = []

    for feature in geojson["features"]:
        props = feature["properties"]
        counties.append({
            "county_name": props["adm1_name"],
            "county_code": props["adm1_pcode"],
            "geometry": feature["geometry"],
            "center_lat": props.get("center_lat"),
            "center_lon": props.get("center_lon"),
            "area_sqkm": props.get("area_sqkm"),
            "population": None,
            "avg_land_price_kes": None,
            "infrastructure_score": None,
        })

    # Sort alphabetically
    counties.sort(key=lambda c: c["county_name"])
    return counties


# ── MAIN ────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("ARDHI VERIFIED — Load Kenya County Geodata to Supabase")
    print("=" * 60)

    # Step 1: Load env
    env = load_env()
    supabase_url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        print("ERROR: Missing SUPABASE_URL or key in .env.local")
        sys.exit(1)

    key_type = "service_role" if "SERVICE_ROLE" in (env.get("SUPABASE_SERVICE_ROLE_KEY") or "") else "anon"
    print("  Supabase URL: {}".format(supabase_url))
    print("  Using key: {}".format(key_type))

    # Step 2: Print migration SQL for user to run first
    print("\n" + "-" * 60)
    print("STEP 1: Run this SQL in the Supabase SQL editor first:")
    print("-" * 60)
    print(MIGRATION_SQL)
    print("-" * 60)

    # Ask user to confirm
    try:
        answer = input("\nHave you run the migration SQL above? (y/n): ").strip().lower()
        if answer != "y":
            print("Please run the SQL migration first, then re-run this script.")
            # Also save it to a file for convenience
            migration_path = os.path.join(os.path.dirname(__file__), "..", "supabase-migration-county-intelligence.sql")
            with open(migration_path, "w") as f:
                f.write(MIGRATION_SQL)
            print("  Migration saved to: supabase-migration-county-intelligence.sql")
            return
    except EOFError:
        # Non-interactive mode — save SQL and proceed
        migration_path = os.path.join(os.path.dirname(__file__), "..", "supabase-migration-county-intelligence.sql")
        with open(migration_path, "w") as f:
            f.write(MIGRATION_SQL)
        print("  Non-interactive mode — migration saved to: supabase-migration-county-intelligence.sql")
        print("  Proceeding with data load...")

    # Step 3: Download and parse GeoJSON
    print()
    geojson = download_geojson()
    counties = parse_counties(geojson)
    print("\n  Parsed {} counties".format(len(counties)))

    # Step 4: Connect to Supabase and insert
    print("\nConnecting to Supabase...")
    supabase = create_client(supabase_url, supabase_key)

    inserted = 0
    errors = 0

    print("Inserting county records...\n")
    for county in counties:
        try:
            supabase.table("county_intelligence").upsert(
                county, on_conflict="county_code"
            ).execute()
            inserted += 1
            print("  {} — {} ({}, {:.0f} sq km)".format(
                county["county_code"],
                county["county_name"],
                "lat {:.4f}, lon {:.4f}".format(
                    county["center_lat"], county["center_lon"]
                ) if county["center_lat"] else "no center",
                county["area_sqkm"] or 0,
            ))
        except Exception as e:
            errors += 1
            print("  ERROR {}: {}".format(county["county_name"], str(e)[:100]))

    # Summary
    print("\n" + "=" * 60)
    print("DONE")
    print("  Inserted: {}".format(inserted))
    print("  Errors:   {}".format(errors))
    print("  Total:    {} counties".format(len(counties)))
    print("=" * 60)


if __name__ == "__main__":
    main()
