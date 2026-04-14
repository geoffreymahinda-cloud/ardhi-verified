"""
Ardhi Verified — Load Geofabrik Kenya Roads to Supabase
=========================================================
Loads OpenStreetMap road data from Geofabrik Kenya extract
into the road_reserves table with native PostGIS geometry via psycopg2.

Data source:
  https://download.geofabrik.de/africa/kenya.html
  Download: kenya-latest-free.shp.zip → gis_osm_roads_free_1.shp

Prerequisites:
    pip install geopandas fiona shapely psycopg2-binary

Usage:
    python3 scripts/load_geofabrik_roads.py --shapefile data/gis_osm_roads_free_1.shp
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

import geopandas as gpd
import psycopg2
import psycopg2.extras
from shapely.geometry import MultiLineString

# ── CONFIGURATION ───────────────────────────────────────────────────────────

# Kenya Roads Act — reserve widths by road class (metres each side)
ROAD_CLASS_RESERVES = {
    "motorway": 60,       # Class A
    "trunk": 60,          # Class A
    "primary": 40,        # Class B
    "secondary": 25,      # Class S/C
    "tertiary": 15,       # County roads
    "residential": 10,    # Urban
    "unclassified": 15,
    "track": 6,
    "service": 6,
}

# OSM fclass → Kenya road class mapping
FCLASS_TO_CLASS = {
    "motorway": "A",
    "motorway_link": "A",
    "trunk": "A",
    "trunk_link": "A",
    "primary": "B",
    "primary_link": "B",
    "secondary": "C",
    "secondary_link": "C",
    "tertiary": "D",
    "tertiary_link": "D",
    "residential": "urban",
    "unclassified": "E",
    "track": "track",
    "service": "service",
    "living_street": "urban",
}

BATCH_SIZE = 100


# ── ENV LOADER ──────────────────────────────────────────────────────────────

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


# ── MAIN ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Load Geofabrik Kenya roads into road_reserves"
    )
    parser.add_argument(
        "--shapefile", required=True,
        help="Path to Geofabrik roads shapefile (gis_osm_roads_free_1.shp)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Parse only — do not insert into Supabase"
    )
    parser.add_argument(
        "--min-class", default="tertiary",
        help="Minimum road class to load (default: tertiary). "
             "Options: motorway, trunk, primary, secondary, tertiary"
    )
    args = parser.parse_args()

    print("=" * 60)
    print("ARDHI VERIFIED — Load Geofabrik Kenya Roads")
    print("=" * 60)

    # ── Read shapefile ──────────────────────────────────────────────────
    print(f"\n  Reading shapefile: {args.shapefile}")
    if not os.path.exists(args.shapefile):
        print(f"  ERROR: File not found: {args.shapefile}")
        print("  Download from: https://download.geofabrik.de/africa/kenya.html")
        sys.exit(1)

    gdf = gpd.read_file(args.shapefile)
    print(f"  Total road features: {len(gdf)}")

    # Ensure WGS84
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        print(f"  Reprojecting from {gdf.crs} to EPSG:4326...")
        gdf = gdf.to_crs(epsg=4326)

    # ── Filter by road class ────────────────────────────────────────────
    road_ranks = ["motorway", "trunk", "primary", "secondary", "tertiary"]
    min_rank = road_ranks.index(args.min_class) if args.min_class in road_ranks else 4
    keep_classes = set(road_ranks[:min_rank + 1])
    keep_classes.update([f"{c}_link" for c in list(keep_classes)])

    fclass_col = None
    for col in ["fclass", "highway", "type", "FCLASS"]:
        if col in gdf.columns:
            fclass_col = col
            break

    if fclass_col:
        gdf_filtered = gdf[gdf[fclass_col].isin(keep_classes)].copy()
        print(f"  Filtered to {len(gdf_filtered)} roads (>= {args.min_class})")
    else:
        print("  WARNING: No road class column found — loading all features")
        gdf_filtered = gdf.copy()

    # ── Build records ───────────────────────────────────────────────────
    print("  Building records...")
    records = []
    now_iso = datetime.now(timezone.utc).isoformat()

    for _, row in gdf_filtered.iterrows():
        geom = row.geometry
        if geom is None or geom.is_empty:
            continue

        fclass = str(row.get(fclass_col, "unclassified") or "unclassified")
        road_class = FCLASS_TO_CLASS.get(fclass, "E")
        reserve_width = ROAD_CLASS_RESERVES.get(fclass, 15)

        name = str(row.get("name", "") or row.get("NAME", "") or "").strip()
        if not name or name in ["None", "0"]:
            name = f"OSM Road ({fclass})"

        ref = str(row.get("ref", "") or "").strip() or None

        osm_id = row.get("osm_id") or row.get("OSM_ID") or row.get("osm_way_id")
        if osm_id is not None:
            osm_id = int(osm_id)

        # Convert LineString to MultiLineString for consistency
        if geom.geom_type == "LineString":
            geom = MultiLineString([geom])

        records.append({
            "road_name": name,
            "road_number": ref,
            "road_class": road_class,
            "road_category": fclass,
            "route_description": None,
            "counties": "{}",
            "region": None,
            "road_length_km": round(geom.length * 111, 2),
            "reserve_width_metres": reserve_width,
            "osm_id": osm_id,
            "wkt": geom.wkt,
            "source": "geofabrik_osm",
            "source_url": "https://download.geofabrik.de/africa/kenya.html",
            "scraped_at": now_iso,
        })

    print(f"  Records to load: {len(records)}")

    # Stats by class
    class_counts = {}
    for r in records:
        c = r["road_class"]
        class_counts[c] = class_counts.get(c, 0) + 1
    for cls, count in sorted(class_counts.items()):
        print(f"    Class {cls}: {count} roads")

    if args.dry_run:
        print("\n  [DRY RUN] No data inserted.")
        return

    # ── Insert via psycopg2 (direct PostGIS geometry) ──────────────────
    env = load_env()
    database_url = env.get("DATABASE_URL")
    if not database_url:
        print("  ERROR: DATABASE_URL missing from .env.local")
        print("  Find it in Supabase Dashboard → Settings → Database → Connection string")
        sys.exit(1)

    conn = psycopg2.connect(database_url, connect_timeout=30)
    conn.autocommit = False
    cur = conn.cursor()
    cur.execute("SET statement_timeout = '300000'")
    conn.commit()
    print(f"  Connected to database")

    print(f"\n  Inserting {len(records)} records into road_reserves...")
    inserted = 0
    errors = 0

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        values = [
            (r["road_name"], r["road_number"], r["road_class"], r["road_category"],
             r["route_description"], r["counties"], r["region"], r["road_length_km"],
             r["reserve_width_metres"], r["osm_id"], r["wkt"],
             r["source"], r["source_url"], r["scraped_at"])
            for r in batch
        ]

        try:
            psycopg2.extras.execute_values(
                cur,
                """INSERT INTO road_reserves
                       (road_name, road_number, road_class, road_category,
                        route_description, counties, region, road_length_km,
                        reserve_width_metres, osm_id, geom, source, source_url, scraped_at)
                   VALUES %s
                   ON CONFLICT (osm_id, source) WHERE osm_id IS NOT NULL
                   DO UPDATE SET
                       road_name = EXCLUDED.road_name,
                       road_class = EXCLUDED.road_class,
                       geom = EXCLUDED.geom""",
                values,
                template="(%s, %s, %s, %s, %s, %s::text[], %s, %s, %s, %s, "
                         "ST_SetSRID(ST_GeomFromText(%s), 4326), %s, %s, %s)",
                page_size=BATCH_SIZE,
            )
            conn.commit()
            inserted += len(batch)
            if inserted % 500 == 0 or i + BATCH_SIZE >= len(records):
                print(f"    {inserted} inserted...", flush=True)
        except Exception as e:
            conn.rollback()
            errors += len(batch)
            if errors <= 500:
                print(f"    Batch error at {i}: {str(e)[:120]}", flush=True)

    cur.close()
    conn.close()

    print(f"\n{'=' * 60}")
    print(f"  Done!")
    print(f"  Inserted:  {inserted}")
    print(f"  Errors:    {errors}")
    print(f"  PostGIS geom column: POPULATED (no backfill needed)")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
