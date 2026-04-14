"""
Ardhi Verified — Load HydroSHEDS River Network to Supabase
============================================================
Loads HydroSHEDS river network shapefiles into the riparian_zones
table with native PostGIS geometry via psycopg2.

HydroSHEDS data source:
  https://www.hydrosheds.org/products/hydrorivers
  Download: af_riv_15s.shp (Africa river network, 15 arc-second)

Prerequisites:
    pip install geopandas fiona shapely psycopg2-binary

Usage:
    python3 scripts/load_hydrosheds_rivers.py --shapefile data/af_riv_15s.shp
"""

import argparse
import os
import sys
from datetime import datetime, timezone

import geopandas as gpd
import psycopg2
from psycopg2.extras import execute_values

# ── CONFIGURATION ───────────────────────────────────────────────────────────

# Kenya bounding box (WGS84)
KENYA_BBOX = (33.9, -4.7, 41.9, 5.5)

# Kenya Water Act 2016 — riparian buffer zones (metres)
BUFFER_ZONES = {
    "river": 30,
    "stream": 6,
    "lake": 50,
    "reservoir": 50,
    "wetland": 50,
    "dam": 50,
    "ocean": 100,
}

# HydroSHEDS ORD_STRA (Strahler order) to water type mapping
STRAHLER_MAP = {
    1: "stream",
    2: "stream",
    3: "river",
    4: "river",
    5: "river",
    6: "river",
    7: "river",
}

BATCH_SIZE = 500


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
        description="Load HydroSHEDS river shapefiles into riparian_zones"
    )
    parser.add_argument(
        "--shapefile", required=True,
        help="Path to HydroSHEDS file (.shp or .gdb, e.g. data/HydroRIVERS_v10_af.gdb)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Parse and filter only — do not insert into Supabase"
    )
    args = parser.parse_args()

    print("=" * 60)
    print("ARDHI VERIFIED — Load HydroSHEDS Rivers")
    print("=" * 60)

    # ── Read shapefile ──────────────────────────────────────────────────
    print(f"\n  Reading shapefile: {args.shapefile}")
    if not os.path.exists(args.shapefile):
        print(f"  ERROR: File not found: {args.shapefile}")
        print("  Download from: https://www.hydrosheds.org/products/hydrorivers")
        sys.exit(1)

    gdf = gpd.read_file(args.shapefile, bbox=KENYA_BBOX)
    print(f"  Features in Kenya bbox: {len(gdf)}")

    if gdf.empty:
        print("  No features found in Kenya — check shapefile extent")
        sys.exit(0)

    # Ensure WGS84
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        print(f"  Reprojecting from {gdf.crs} to EPSG:4326...")
        gdf = gdf.to_crs(epsg=4326)

    # ── Classify and build records ──────────────────────────────────────
    print("  Classifying water features...")
    records = []
    now_iso = datetime.now(timezone.utc).isoformat()

    for _, row in gdf.iterrows():
        geom = row.geometry
        if geom is None or geom.is_empty:
            continue

        # Classify by Strahler stream order if available
        strahler = int(row.get("ORD_STRA", 3)) if "ORD_STRA" in gdf.columns else 3
        water_type = STRAHLER_MAP.get(strahler, "river")
        buffer_m = BUFFER_ZONES[water_type]

        name = str(row.get("RIVER_NAME", "") or row.get("NAME", "") or "").strip()
        if not name or name in ["None", "0"]:
            name = f"HydroSHEDS River (order {strahler})"

        # Buffer the line geometry to create a riparian polygon
        # ~111km per degree at equator — acceptable for Kenya (near equator)
        buffer_deg = buffer_m / 111_000
        buffered = geom.buffer(buffer_deg)

        basin_val = str(row.get("MAIN_BAS", "") or "").strip() or None

        records.append((
            name,
            water_type,
            buffer_m,
            None,       # county — spatially joined later
            basin_val,
            buffered.wkt,
            "hydrosheds",
            "https://www.hydrosheds.org/products/hydrorivers",
            now_iso,
        ))

    print(f"  Records to load: {len(records)}")

    # Stats
    type_counts = {}
    for r in records:
        t = r[1]  # water_type
        type_counts[t] = type_counts.get(t, 0) + 1
    for wtype, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"    {wtype}: {count} features ({BUFFER_ZONES[wtype]}m buffer)")

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

    conn = psycopg2.connect(database_url)
    cur = conn.cursor()

    print(f"\n  Inserting {len(records)} records into riparian_zones...")
    inserted = 0
    errors = 0

    sql = """
        INSERT INTO riparian_zones
            (name, water_type, buffer_metres, county, basin, geom, source, source_url, scraped_at)
        VALUES %s
        ON CONFLICT DO NOTHING
    """

    template = (
        "(%(name)s, %(water_type)s, %(buffer_metres)s, %(county)s, %(basin)s, "
        "ST_SetSRID(ST_GeomFromText(%(wkt)s), 4326), "
        "%(source)s, %(source_url)s, %(scraped_at)s)"
    )

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        rows = []
        for r in batch:
            rows.append({
                "name": r[0],
                "water_type": r[1],
                "buffer_metres": r[2],
                "county": r[3],
                "basin": r[4],
                "wkt": r[5],
                "source": r[6],
                "source_url": r[7],
                "scraped_at": r[8],
            })

        try:
            cur.executemany(
                """INSERT INTO riparian_zones
                       (name, water_type, buffer_metres, county, basin, geom, source, source_url, scraped_at)
                   VALUES (
                       %(name)s, %(water_type)s, %(buffer_metres)s, %(county)s, %(basin)s,
                       ST_SetSRID(ST_GeomFromText(%(wkt)s), 4326),
                       %(source)s, %(source_url)s, %(scraped_at)s
                   )""",
                rows,
            )
            conn.commit()
            inserted += len(rows)
            if inserted % 1000 == 0 or i + BATCH_SIZE >= len(records):
                print(f"    {inserted} inserted...")
        except Exception as e:
            conn.rollback()
            errors += len(rows)
            print(f"    Batch error at {i}: {str(e)[:120]}")

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
