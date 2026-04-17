"""
Ardhi Verified — OSM Apartment Building Loader
================================================
Queries Overpass API for Nairobi buildings tagged as apartments,
residential, commercial, or mixed_use. Loads footprints into
sectional_developments.building_footprint.

Priority areas: Kilimani, Westlands, Kileleshwa, Lavington,
Parklands, Upper Hill, CBD, South B, South C, Embakasi.

Usage:
    python3 scripts/load_osm_apartments.py
    python3 scripts/load_osm_apartments.py --dry-run
    python3 scripts/load_osm_apartments.py --area kilimani
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

PROJECT_DIR = Path(__file__).parent.parent
OUTPUT_FILE = Path(__file__).parent / "osm_apartments_output.json"

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
REQUEST_DELAY = 15

HEADERS = {
    "User-Agent": "ArdhiVerified-OSMBot/1.0 (hello@ardhiverified.com; apartment building research)",
}

# Priority Nairobi areas with approximate bounding boxes
AREAS = {
    "kilimani":    (-1.295, 36.775, -1.275, 36.800),
    "westlands":   (-1.270, 36.795, -1.255, 36.820),
    "kileleshwa":  (-1.280, 36.770, -1.265, 36.790),
    "lavington":   (-1.285, 36.755, -1.270, 36.780),
    "parklands":   (-1.265, 36.810, -1.250, 36.830),
    "upper_hill":  (-1.300, 36.810, -1.285, 36.830),
    "cbd":         (-1.295, 36.810, -1.275, 36.830),
    "south_b":     (-1.310, 36.835, -1.295, 36.855),
    "south_c":     (-1.320, 36.825, -1.305, 36.845),
    "embakasi":    (-1.335, 36.880, -1.295, 36.920),
}

BUILDING_TYPES = ["apartments", "residential", "commercial", "mixed_use"]


def load_env():
    env_path = PROJECT_DIR / ".env.local"
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


def query_apartments(bbox, building_types):
    """Query Overpass for apartment buildings in a bbox."""
    import requests

    south, west, north, east = bbox
    type_filters = "".join(
        f'  way["building"="{bt}"]({south},{west},{north},{east});\n'
        for bt in building_types
    )

    query = f"""
    [out:json][timeout:120];
    (
{type_filters}    );
    out body;
    >;
    out skel qt;
    """

    try:
        r = requests.post(OVERPASS_URL, data={"data": query}, headers=HEADERS, timeout=180)
        if r.status_code == 429:
            print("    Rate limited — waiting 60s...")
            time.sleep(60)
            return None
        if r.status_code != 200:
            print(f"    HTTP {r.status_code}")
            return None
        return r.json()
    except Exception as e:
        print(f"    Error: {str(e)[:80]}")
        return None


def osm_to_developments(data, area_name):
    """Convert Overpass JSON to sectional development records."""
    if not data or "elements" not in data:
        return []

    nodes = {}
    for el in data["elements"]:
        if el["type"] == "node":
            nodes[el["id"]] = (el["lon"], el["lat"])

    developments = []
    for el in data["elements"]:
        if el["type"] != "way":
            continue
        if "nodes" not in el or len(el["nodes"]) < 4:
            continue

        coords = []
        for nid in el["nodes"]:
            if nid in nodes:
                coords.append(list(nodes[nid]))

        if len(coords) < 4:
            continue

        if coords[0] != coords[-1]:
            coords.append(coords[0])

        tags = el.get("tags", {})
        name = tags.get("name") or tags.get("addr:housename") or tags.get("addr:street", "")
        building_type = tags.get("building", "apartments")
        levels = tags.get("building:levels")
        addr = tags.get("addr:full") or tags.get("addr:street", "")

        # Skip unnamed buildings without levels info — likely not significant developments
        if not name and not levels:
            continue

        total_floors = int(levels) if levels and levels.isdigit() else None

        developments.append({
            "osm_id": el["id"],
            "development_name": name or f"Building at {addr}" if addr else f"OSM-{el['id']}",
            "building_type": building_type,
            "total_floors": total_floors,
            "location_description": f"{area_name.replace('_', ' ').title()}, Nairobi" + (f" — {addr}" if addr else ""),
            "geometry": {
                "type": "Polygon",
                "coordinates": [coords],
            },
        })

    return developments


def main():
    import requests as _req
    global requests
    requests = _req

    parser = argparse.ArgumentParser(description="Load OSM apartment buildings for Nairobi")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--area", type=str, help=f"Single area: {','.join(AREAS.keys())}")
    args = parser.parse_args()

    print("=" * 60)
    print("  OSM Apartment Building Loader — Nairobi")
    print("=" * 60)

    env = load_env()
    database_url = env.get("DATABASE_URL")
    if not database_url and not args.dry_run:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    areas = {args.area: AREAS[args.area]} if args.area and args.area in AREAS else AREAS

    print(f"  Areas: {len(areas)}")
    print(f"  Building types: {BUILDING_TYPES}")

    # Load previous progress
    processed_areas = set()
    all_devs = []
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE) as f:
                saved = json.load(f)
            all_devs = saved.get("developments", [])
            processed_areas = set(saved.get("processed_areas", []))
            print(f"  Resuming: {len(all_devs)} developments from {len(processed_areas)} areas")
        except (json.JSONDecodeError, IOError):
            pass

    new_count = 0
    for area_name, bbox in areas.items():
        if area_name in processed_areas:
            print(f"\n  [{area_name}] Already processed — skipping")
            continue

        print(f"\n  [{area_name}] BBOX: {bbox}")

        if args.dry_run:
            print("    DRY RUN — skipping query")
            continue

        data = query_apartments(bbox, BUILDING_TYPES)
        if data:
            devs = osm_to_developments(data, area_name)
            print(f"    Apartment buildings found: {len(devs)}")
            all_devs.extend(devs)
            new_count += len(devs)
        else:
            print("    No data returned")

        processed_areas.add(area_name)

        # Incremental save
        save_data = {
            "metadata": {"source": "OpenStreetMap Overpass API", "total": len(all_devs)},
            "processed_areas": list(processed_areas),
            "developments": all_devs,
        }
        with open(OUTPUT_FILE, "w") as f:
            json.dump(save_data, f)

        time.sleep(REQUEST_DELAY)

    print(f"\n  Total apartment buildings: {len(all_devs)} ({new_count} new)")

    if args.dry_run or not all_devs:
        print("  Done!")
        return

    # Load to database
    print(f"\n  Loading {len(all_devs)} developments to sectional_developments...")

    import psycopg2

    conn = psycopg2.connect(database_url)
    cur = conn.cursor()

    # Get Nairobi county_id
    cur.execute("SELECT id FROM counties WHERE name ILIKE 'nairobi' LIMIT 1")
    nairobi_row = cur.fetchone()
    nairobi_county_id = nairobi_row[0] if nairobi_row else None

    loaded = 0
    errors = 0
    for dev in all_devs:
        try:
            geojson = json.dumps(dev["geometry"])
            cur.execute("""
                INSERT INTO sectional_developments
                    (development_name, county_id, location_description,
                     building_footprint, total_floors, data_source, confidence_score)
                VALUES (%s, %s, %s,
                    ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326),
                    %s, 'osm', 0.20)
                ON CONFLICT DO NOTHING
            """, (
                dev["development_name"],
                nairobi_county_id,
                dev["location_description"],
                geojson,
                dev["total_floors"],
            ))
            loaded += 1
        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"    Error: {str(e)[:80]}")
            conn.rollback()
            continue

        if loaded % 100 == 0:
            conn.commit()
            print(f"    Loaded {loaded}...")

    conn.commit()
    cur.close()
    conn.close()

    print(f"\n  Results: {loaded} loaded, {errors} errors")
    print("  Done!")


if __name__ == "__main__":
    main()
