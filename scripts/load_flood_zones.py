"""
Ardhi Verified — Load Flood Zone Data to Supabase
===================================================
Loads flood risk zone shapefiles into the flood_zones table
with native PostGIS geometry via psycopg2.

Supported data sources:
  - FEWS NET: https://fews.net/data (flood hazard shapefiles)
  - Global Flood Database: https://global-flood-database.cloudtostreet.ai/
  - Kenya NDMA: National Drought Management Authority flood maps
  - HydroSHEDS floodplain delineation

Prerequisites:
    pip install geopandas fiona shapely psycopg2-binary

Usage:
    python3 scripts/load_flood_zones.py --shapefile data/kenya_flood_zones.shp
    python3 scripts/load_flood_zones.py --shapefile data/fews_flood_hazard.shp --source fews
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

import geopandas as gpd
import psycopg2
from shapely.geometry import MultiPolygon

# ── CONFIGURATION ───────────────────────────────────────────────────────────

# Kenya bounding box
KENYA_BBOX = (33.9, -4.7, 41.9, 5.5)

# Flood risk classification thresholds
RISK_CLASSIFICATION = {
    "high": ["high", "very high", "extreme", "3", "4", "5"],
    "medium": ["medium", "moderate", "2"],
    "low": ["low", "minimal", "1"],
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


def classify_risk(value):
    """Classify flood risk from various attribute formats."""
    if value is None:
        return "medium"
    val = str(value).strip().lower()
    for level, keywords in RISK_CLASSIFICATION.items():
        if val in keywords:
            return level
    return "medium"


def classify_risk_from_water_class(water_class):
    """Classify risk from FloodExtent Water_Clas field.
    Water_Clas: 1=permanent water, 2=flood water, 3=seasonal flood."""
    try:
        wc = int(water_class)
        if wc == 1:
            return "high"    # permanent water body
        elif wc == 2:
            return "high"    # active flood water
        elif wc == 3:
            return "medium"  # seasonal flood
        return "medium"
    except (ValueError, TypeError):
        return "medium"


def classify_zone_type(row):
    """Infer flood zone type from shapefile attributes."""
    # FloodExtent format
    if "Water_Clas" in dict(row):
        try:
            wc = int(row.get("Water_Clas", 0))
            if wc == 1:
                return "floodplain"   # permanent water
            elif wc == 2:
                return "riverine"     # flood water
            elif wc == 3:
                return "floodplain"   # seasonal
        except (ValueError, TypeError):
            pass
        return "floodplain"

    for col in ["TYPE", "type", "ZONE_TYPE", "zone_type", "FLD_ZONE", "DFIRM_ID"]:
        val = str(row.get(col, "") or "").lower()
        if val:
            if "coastal" in val:
                return "coastal"
            if "flash" in val:
                return "flash"
            if "river" in val or "fluvial" in val:
                return "riverine"
            if "plain" in val or "pluvial" in val:
                return "floodplain"
    return "floodplain"


# ── MAIN ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Load flood zone shapefiles into flood_zones table"
    )
    parser.add_argument(
        "--shapefile", required=True,
        help="Path to flood zone shapefile"
    )
    parser.add_argument(
        "--source", default="fews",
        help="Data source identifier (default: fews)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Parse only — do not insert into Supabase"
    )
    args = parser.parse_args()

    print("=" * 60)
    print("ARDHI VERIFIED — Load Flood Zones")
    print("=" * 60)

    # ── Read shapefile ──────────────────────────────────────────────────
    print(f"\n  Reading shapefile: {args.shapefile}")
    if not os.path.exists(args.shapefile):
        print(f"  ERROR: File not found: {args.shapefile}")
        print("  Supported sources:")
        print("    - FEWS NET: https://fews.net/data")
        print("    - Global Flood Database: https://global-flood-database.cloudtostreet.ai/")
        print("    - Kenya NDMA flood maps")
        sys.exit(1)

    gdf = gpd.read_file(args.shapefile, bbox=KENYA_BBOX)
    print(f"  Features in Kenya extent: {len(gdf)}")

    if gdf.empty:
        print("  No features found in Kenya — check shapefile extent")
        sys.exit(0)

    # Ensure WGS84
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        print(f"  Reprojecting from {gdf.crs} to EPSG:4326...")
        gdf = gdf.to_crs(epsg=4326)

    # ── Build records ───────────────────────────────────────────────────
    print("  Building records...")
    records = []
    now_iso = datetime.now(timezone.utc).isoformat()

    for _, row in gdf.iterrows():
        geom = row.geometry
        if geom is None or geom.is_empty:
            continue

        # Normalize to MultiPolygon
        if geom.geom_type == "Polygon":
            geom = MultiPolygon([geom])
        elif geom.geom_type != "MultiPolygon":
            continue

        # Detect FloodExtent format (Water_Clas, EventCode, etc.)
        is_flood_extent = "Water_Clas" in gdf.columns

        if is_flood_extent:
            event_code = str(row.get("EventCode", "") or "").strip()
            notes = str(row.get("Notes", "") or "").strip()
            name = notes if notes else (event_code if event_code else None)
            zone_type = classify_zone_type(row)
            risk_level = classify_risk_from_water_class(row.get("Water_Clas"))
            return_period = None
            basin = None
        else:
            name = str(row.get("NAME", "") or row.get("name", "") or "").strip()
            if not name or name in ["None", "0"]:
                name = None
            zone_type = classify_zone_type(row)

            risk_val = None
            for col in ["RISK", "risk", "RISK_LEVEL", "FLD_RISK", "HAZARD"]:
                if col in gdf.columns:
                    risk_val = row.get(col)
                    break
            risk_level = classify_risk(risk_val)

            return_period = None
            for col in ["RETURN_PER", "RP", "return_period"]:
                if col in gdf.columns:
                    try:
                        return_period = str(int(float(row[col])))
                    except (ValueError, TypeError):
                        pass
                    break

            basin = None
            for col in ["BASIN", "basin", "RIVER_BAS", "CATCHMENT"]:
                if col in gdf.columns:
                    basin = str(row.get(col, "") or "").strip() or None
                    break

        records.append({
            "name": name,
            "zone_type": zone_type,
            "risk_level": risk_level,
            "return_period": return_period,
            "county": None,  # spatially joined later
            "source": args.source,
            "wkt": geom.wkt,
            "scraped_at": now_iso,
        })

    print(f"  Records to load: {len(records)}")

    # Stats
    risk_counts = {}
    type_counts = {}
    for r in records:
        risk_counts[r["risk_level"]] = risk_counts.get(r["risk_level"], 0) + 1
        type_counts[r["zone_type"]] = type_counts.get(r["zone_type"], 0) + 1

    print("  By risk level:")
    for level, count in sorted(risk_counts.items()):
        print(f"    {level}: {count}")
    print("  By zone type:")
    for ztype, count in sorted(type_counts.items()):
        print(f"    {ztype}: {count}")

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

    print(f"\n  Inserting {len(records)} records into flood_zones...")
    inserted = 0
    errors = 0

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]

        try:
            cur.executemany(
                """INSERT INTO flood_zones
                       (name, zone_type, risk_level, return_period,
                        country, source, geom, scraped_at)
                   VALUES (
                       %(name)s, %(zone_type)s, %(risk_level)s, %(return_period)s,
                       'Kenya', %(source)s,
                       ST_SetSRID(ST_GeomFromText(%(wkt)s), 4326),
                       %(scraped_at)s
                   )""",
                batch,
            )
            conn.commit()
            inserted += len(batch)
            if inserted % 200 == 0 or i + BATCH_SIZE >= len(records):
                print(f"    {inserted} inserted...")
        except Exception as e:
            conn.rollback()
            errors += len(batch)
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
