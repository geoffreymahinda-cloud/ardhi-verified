"""
Ardhi Verified — OpenStreetMap Building Footprint Loader
=========================================================
Downloads building footprints from the Overpass API for Nairobi
and loads them into the parcels table as reference geometry.

These are NOT title deed boundaries — they are building outlines
from OpenStreetMap. They serve as visual context on the parcel
report map until proper cadastral boundaries are available.

Usage:
    python3 scripts/load_osm_buildings.py
    python3 scripts/load_osm_buildings.py --dry-run
    python3 scripts/load_osm_buildings.py --bbox -1.35,36.75,-1.25,36.85

Dependencies:
    pip install requests psycopg2-binary
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

PROJECT_DIR = Path(__file__).parent.parent
OUTPUT_FILE = Path(__file__).parent / "osm_buildings_output.json"

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Nairobi bounding box split into grid cells to avoid timeout
# Full Nairobi: -1.45,36.65,-1.15,37.10
NAIROBI_GRID = []
lat_start, lat_end = -1.45, -1.15
lng_start, lng_end = 36.65, 37.10
cell_size = 0.05  # ~5.5km cells — 36 cells total

lat = lat_start
while lat < lat_end:
    lng = lng_start
    while lng < lng_end:
        NAIROBI_GRID.append((
            round(lat, 4),
            round(lng, 4),
            round(min(lat + cell_size, lat_end), 4),
            round(min(lng + cell_size, lng_end), 4),
        ))
        lng += cell_size
    lat += cell_size

HEADERS = {
    "User-Agent": "ArdhiVerified-OSMBot/1.0 (hello@ardhiverified.com; building footprint research)",
}

REQUEST_DELAY = 15  # Overpass API requests heavy rate limiting — be very respectful


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


def query_overpass(bbox):
    """Query Overpass API for buildings in a bounding box."""
    south, west, north, east = bbox
    query = f"""
    [out:json][timeout:120];
    (
      way["building"]({south},{west},{north},{east});
    );
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


def osm_to_polygons(data):
    """Convert Overpass JSON to list of polygon features."""
    if not data or "elements" not in data:
        return []

    # Build node lookup
    nodes = {}
    for el in data["elements"]:
        if el["type"] == "node":
            nodes[el["id"]] = (el["lon"], el["lat"])

    # Build polygons from ways
    features = []
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

        # Ensure closed polygon
        if coords[0] != coords[-1]:
            coords.append(coords[0])

        tags = el.get("tags", {})
        name = tags.get("name") or tags.get("addr:housename") or tags.get("addr:street", "")
        building_type = tags.get("building", "yes")
        addr = tags.get("addr:full") or tags.get("addr:street", "")

        features.append({
            "osm_id": el["id"],
            "name": name,
            "building_type": building_type,
            "address": addr,
            "geometry": {
                "type": "Polygon",
                "coordinates": [coords],
            },
        })

    return features


def main():
    global requests
    import requests as _requests
    requests = _requests

    parser = argparse.ArgumentParser(description="Load OSM building footprints for Nairobi")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--bbox", type=str, help="Custom bbox: south,west,north,east")
    parser.add_argument("--limit-cells", type=int, default=0, help="Limit number of grid cells (0=all)")
    args = parser.parse_args()

    print("=" * 60)
    print("  OSM Building Footprint Loader — Nairobi")
    print("=" * 60)

    env = load_env()
    database_url = env.get("DATABASE_URL")
    if not database_url and not args.dry_run:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    # Determine grid cells
    if args.bbox:
        parts = [float(x) for x in args.bbox.split(",")]
        grid = [tuple(parts)]
    else:
        grid = NAIROBI_GRID

    if args.limit_cells > 0:
        grid = grid[:args.limit_cells]

    print(f"  Grid cells: {len(grid)}")
    print(f"  Delay between requests: {REQUEST_DELAY}s")
    print(f"  Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")

    # Load existing output for incremental processing
    all_features = []
    processed_cells = set()
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE) as f:
                saved = json.load(f)
            all_features = saved.get("features", [])
            processed_cells = set(tuple(c) for c in saved.get("processed_cells", []))
            print(f"  Resuming: {len(all_features)} features from {len(processed_cells)} cells")
        except (json.JSONDecodeError, IOError):
            pass

    # Query each grid cell
    new_features = 0
    for i, bbox in enumerate(grid):
        if tuple(bbox) in processed_cells:
            continue

        print(f"\n  [{i+1}/{len(grid)}] BBOX: {bbox}")

        if args.dry_run:
            print("    DRY RUN — skipping query")
            continue

        data = query_overpass(bbox)
        if data:
            features = osm_to_polygons(data)
            print(f"    Buildings found: {len(features)}")
            all_features.extend(features)
            new_features += len(features)
        else:
            print("    No data returned")

        processed_cells.add(tuple(bbox))

        # Incremental save
        save_data = {
            "metadata": {
                "source": "OpenStreetMap Overpass API",
                "total_features": len(all_features),
            },
            "processed_cells": [list(c) for c in processed_cells],
            "features": all_features,
        }
        with open(OUTPUT_FILE, "w") as f:
            json.dump(save_data, f)

        time.sleep(REQUEST_DELAY)

    print(f"\n  Total buildings: {len(all_features)} ({new_features} new)")

    if args.dry_run:
        print("  DRY RUN complete")
        return

    # Load to database
    if not all_features:
        print("  No features to load")
        return

    print(f"\n  Loading {len(all_features)} buildings to database...")

    import psycopg2

    conn = psycopg2.connect(database_url)
    cur = conn.cursor()

    loaded = 0
    errors = 0
    for feature in all_features:
        try:
            geojson = json.dumps(feature["geometry"])
            ref = f"OSM-{feature['osm_id']}"
            name = feature.get("name") or feature.get("address") or None

            cur.execute("""
                INSERT INTO parcels (parcel_reference, owner_name, country, county_district,
                    land_use, tenure_type, data_source, geom)
                VALUES (%s, %s, 'Kenya', 'Nairobi', %s, 'osm_building',
                    'osm', ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))
                ON CONFLICT (parcel_reference) DO UPDATE SET
                    geom = ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326),
                    data_source = 'osm'
            """, (ref, name, feature.get("building_type", "building"), geojson, geojson))
            loaded += 1
        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"    Error: {str(e)[:80]}")
            conn.rollback()
            continue

        if loaded % 500 == 0:
            conn.commit()
            print(f"    Loaded {loaded}...")

    conn.commit()
    cur.close()
    conn.close()

    print(f"\n  Results: {loaded} loaded, {errors} errors")
    print("  Done!")


if __name__ == "__main__":
    main()
