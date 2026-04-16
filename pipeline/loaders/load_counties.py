"""
Load all 47 Kenya counties into the counties table.
Uses geoBoundaries GeoJSON (already in data/ directory) for geometry.

Usage:
    python3 pipeline/loaders/load_counties.py
    python3 pipeline/loaders/load_counties.py --dry-run
"""

import json
import os
import sys
import argparse

# Add project root to path for shared env loading
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, PROJECT_DIR)

# ── Kenya's 47 counties with their codes ────────────────────────────────────
# Code is the 3-digit number used by KNBS and IEBC

COUNTIES = [
    {"name": "Mombasa", "code": "001"},
    {"name": "Kwale", "code": "002"},
    {"name": "Kilifi", "code": "003"},
    {"name": "Tana River", "code": "004"},
    {"name": "Lamu", "code": "005"},
    {"name": "Taita Taveta", "code": "006"},
    {"name": "Garissa", "code": "007"},
    {"name": "Wajir", "code": "008"},
    {"name": "Mandera", "code": "009"},
    {"name": "Marsabit", "code": "010"},
    {"name": "Isiolo", "code": "011"},
    {"name": "Meru", "code": "012"},
    {"name": "Tharaka Nithi", "code": "013"},
    {"name": "Embu", "code": "014"},
    {"name": "Kitui", "code": "015"},
    {"name": "Machakos", "code": "016"},
    {"name": "Makueni", "code": "017"},
    {"name": "Nyandarua", "code": "018"},
    {"name": "Nyeri", "code": "019"},
    {"name": "Kirinyaga", "code": "020"},
    {"name": "Murang'a", "code": "021"},
    {"name": "Kiambu", "code": "022"},
    {"name": "Turkana", "code": "023"},
    {"name": "West Pokot", "code": "024"},
    {"name": "Samburu", "code": "025"},
    {"name": "Trans Nzoia", "code": "026"},
    {"name": "Uasin Gishu", "code": "027"},
    {"name": "Elgeyo Marakwet", "code": "028"},
    {"name": "Nandi", "code": "029"},
    {"name": "Baringo", "code": "030"},
    {"name": "Laikipia", "code": "031"},
    {"name": "Nakuru", "code": "032"},
    {"name": "Narok", "code": "033"},
    {"name": "Kajiado", "code": "034"},
    {"name": "Kericho", "code": "035"},
    {"name": "Bomet", "code": "036"},
    {"name": "Kakamega", "code": "037"},
    {"name": "Vihiga", "code": "038"},
    {"name": "Bungoma", "code": "039"},
    {"name": "Busia", "code": "040"},
    {"name": "Siaya", "code": "041"},
    {"name": "Kisumu", "code": "042"},
    {"name": "Homa Bay", "code": "043"},
    {"name": "Migori", "code": "044"},
    {"name": "Kisii", "code": "045"},
    {"name": "Nyamira", "code": "046"},
    {"name": "Nairobi", "code": "047"},
]


def load_env():
    env_path = os.path.join(PROJECT_DIR, ".env.local")
    env = {}
    try:
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    env[key.strip()] = value.strip()
    except FileNotFoundError:
        print("ERROR: .env.local not found in project root")
        sys.exit(1)
    return env


def load_geojson_geometries(geojson_path):
    """Load county geometries from geoBoundaries GeoJSON."""
    if not os.path.exists(geojson_path):
        print(f"  WARNING: GeoJSON not found at {geojson_path}")
        print("  Counties will be inserted without geometry.")
        print("  Download from: https://www.geoboundaries.org/downloadCGAZ.html")
        return {}

    with open(geojson_path) as f:
        data = json.load(f)

    geometries = {}
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        # geoBoundaries uses shapeName for the county/region name
        name = props.get("shapeName", "").strip()
        geom = feature.get("geometry")
        if name and geom:
            geometries[name.lower()] = json.dumps(geom)

    print(f"  Loaded {len(geometries)} county geometries from GeoJSON")
    return geometries


def main():
    parser = argparse.ArgumentParser(description="Load Kenya counties")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--geojson",
        default=os.path.join(PROJECT_DIR, "data", "geoBoundaries-KEN-ADM1.geojson"),
        help="Path to geoBoundaries ADM1 GeoJSON",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("  Loading Kenya Counties")
    print("=" * 60)

    env = load_env()
    database_url = env.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not set in .env.local")
        sys.exit(1)

    # Load geometries from GeoJSON
    geometries = load_geojson_geometries(args.geojson)

    if args.dry_run:
        print(f"\n  DRY RUN: Would insert {len(COUNTIES)} counties")
        for c in COUNTIES:
            has_geom = c["name"].lower() in geometries
            print(f"    {c['code']} {c['name']} {'(with geometry)' if has_geom else '(no geometry)'}")
        return

    import psycopg2

    conn = psycopg2.connect(database_url)
    cur = conn.cursor()

    inserted = 0
    updated = 0
    for county in COUNTIES:
        name = county["name"]
        code = county["code"]
        geom_json = geometries.get(name.lower())

        if geom_json:
            cur.execute(
                """
                INSERT INTO counties (name, code, geometry)
                VALUES (%s, %s, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)))
                ON CONFLICT (name) DO UPDATE SET
                    code = EXCLUDED.code,
                    geometry = EXCLUDED.geometry
                RETURNING (xmax = 0) AS is_insert
                """,
                (name, code, geom_json),
            )
        else:
            cur.execute(
                """
                INSERT INTO counties (name, code)
                VALUES (%s, %s)
                ON CONFLICT (name) DO UPDATE SET
                    code = EXCLUDED.code
                RETURNING (xmax = 0) AS is_insert
                """,
                (name, code),
            )

        row = cur.fetchone()
        if row and row[0]:
            inserted += 1
        else:
            updated += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"\n  Results: {inserted} inserted, {updated} updated")
    print(f"  Total counties: {len(COUNTIES)}")
    print("  Done!")


if __name__ == "__main__":
    main()
