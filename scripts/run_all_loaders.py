"""
Ardhi Verified — Master Spatial Data Loader
=============================================
Orchestrates all GIS shapefile loaders in the correct order
and runs PostGIS spatial joins to populate county fields.

Prerequisites:
    pip install geopandas fiona shapely psycopg2-binary

Usage:
    # Run all loaders (requires shapefiles in data/ directory)
    python3 scripts/run_all_loaders.py

    # Dry run — validate shapefiles without inserting
    python3 scripts/run_all_loaders.py --dry-run

    # Run only specific loaders
    python3 scripts/run_all_loaders.py --only roads,rivers

    # Skip loaders — only run PostGIS spatial joins
    python3 scripts/run_all_loaders.py --spatial-joins-only
"""

import argparse
import os
import subprocess
import sys
from datetime import datetime, timezone

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPTS_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, "data")

# ── LOADER REGISTRY ─────────────────────────────────────────────────────────
# Order matters: boundaries first (for county spatial joins), then overlays

LOADERS = [
    {
        "key": "boundaries",
        "name": "geoBoundaries Kenya Counties",
        "script": "load_gadm_boundaries.py",
        "shapefile": "geoBoundaries-KEN-ADM1.geojson",
        "args": ["--level", "1"],
        "required": True,
        "description": "Kenya county boundaries (CC BY 4.0) — needed for spatial joins",
    },
    {
        "key": "roads",
        "name": "Geofabrik Kenya Roads",
        "script": "load_geofabrik_roads.py",
        "shapefile": "kenya-260411-free/gis_osm_roads_free_1.shp",
        "args": ["--min-class", "tertiary"],
        "required": False,
        "description": "OpenStreetMap classified road network",
    },
    {
        "key": "rivers",
        "name": "HydroRIVERS River Network",
        "script": "load_hydrosheds_rivers.py",
        "shapefile": "HydroRIVERS_v10_af/HydroRIVERS_v10_af.gdb",
        "args": [],
        "required": False,
        "description": "HydroRIVERS river network with riparian buffers",
    },
    {
        "key": "protected",
        "name": "OSM Protected Areas",
        "script": "load_wdpa_protected_areas.py",
        "shapefile": "kenya-260411-free/gis_osm_protected_areas_a_free_1.shp",
        "args": [],
        "required": False,
        "description": "National parks, forests, nature reserves (from OSM/Geofabrik)",
    },
    {
        "key": "floods",
        "name": "Flood Extent Zones",
        "script": "load_flood_zones.py",
        "shapefile": "floodextent01/FloodExtent01.shp",
        "args": ["--source", "flood_extent"],
        "required": False,
        "description": "Flood extent / risk zones",
    },
]

# ── PostGIS SPATIAL JOIN SQL ───────────────────────────────────────────────
# After all data is loaded, populate county fields via spatial intersection
# with the GADM administrative boundaries in the parcels table.

SPATIAL_JOIN_SQL = [
    (
        "Riparian zones → county",
        """UPDATE riparian_zones rz
           SET county = p.county_district
           FROM parcels p
           WHERE rz.county IS NULL
             AND rz.geom IS NOT NULL
             AND p.geom IS NOT NULL
             AND p.tenure_type = 'administrative_boundary'
             AND ST_Intersects(rz.geom, p.geom)""",
    ),
    (
        "Protected zones → county",
        """UPDATE protected_zones pz
           SET county = p.county_district
           FROM parcels p
           WHERE pz.county IS NULL
             AND pz.geom IS NOT NULL
             AND p.geom IS NOT NULL
             AND p.tenure_type = 'administrative_boundary'
             AND ST_Intersects(pz.geom, p.geom)""",
    ),
    (
        "Flood zones → county",
        """UPDATE flood_zones fz
           SET county = ci.county_name
           FROM county_intelligence ci
           WHERE fz.county IS NULL
             AND fz.geom IS NOT NULL
             AND ci.geometry IS NOT NULL
             AND ST_Intersects(
                 fz.geom,
                 ST_SetSRID(ST_GeomFromGeoJSON(ci.geometry::text), 4326)
             )""",
    ),
]

VERIFY_SQL = """
SELECT
  'road_reserves' AS layer,
  COUNT(*) AS total,
  COUNT(geom) AS with_geom
FROM road_reserves
UNION ALL
SELECT 'riparian_zones', COUNT(*), COUNT(geom) FROM riparian_zones
UNION ALL
SELECT 'protected_zones', COUNT(*), COUNT(geom) FROM protected_zones
UNION ALL
SELECT 'parcels', COUNT(*), COUNT(geom) FROM parcels
UNION ALL
SELECT 'flood_zones', COUNT(*), COUNT(geom) FROM flood_zones;
"""


# ── ENV LOADER ──────────────────────────────────────────────────────────────

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
        print("ERROR: .env.local not found")
        sys.exit(1)
    return env


def run_spatial_joins(database_url):
    """Run PostGIS spatial joins to populate county fields."""
    import psycopg2

    print(f"\n{'─' * 70}")
    print("  PostGIS Spatial Joins")
    print(f"{'─' * 70}")

    conn = psycopg2.connect(database_url)
    cur = conn.cursor()

    for name, sql in SPATIAL_JOIN_SQL:
        try:
            print(f"\n  Running: {name}")
            cur.execute(sql)
            updated = cur.rowcount
            conn.commit()
            print(f"    Updated {updated} rows")
        except Exception as e:
            conn.rollback()
            print(f"    ERROR: {str(e)[:120]}")

    # Verify
    print(f"\n{'─' * 70}")
    print("  Geometry Coverage Report")
    print(f"{'─' * 70}")
    try:
        cur.execute(VERIFY_SQL)
        rows = cur.fetchall()
        print(f"  {'Layer':<20} {'Total':>8} {'With Geom':>10} {'Coverage':>10}")
        print(f"  {'─' * 50}")
        for layer, total, with_geom in rows:
            pct = f"{(with_geom / total * 100):.1f}%" if total > 0 else "N/A"
            print(f"  {layer:<20} {total:>8} {with_geom:>10} {pct:>10}")
    except Exception as e:
        print(f"  Verify error: {str(e)[:120]}")

    cur.close()
    conn.close()


# ── MAIN ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Master spatial data loader for Ardhi Verified"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Validate shapefiles without inserting data"
    )
    parser.add_argument(
        "--only", type=str, default=None,
        help="Comma-separated list of loaders to run: "
             + ",".join(l["key"] for l in LOADERS)
    )
    parser.add_argument(
        "--data-dir", type=str, default=DATA_DIR,
        help=f"Directory containing shapefiles (default: {DATA_DIR})"
    )
    parser.add_argument(
        "--spatial-joins-only", action="store_true",
        help="Skip loaders — only run PostGIS spatial joins"
    )
    args = parser.parse_args()

    print("=" * 70)
    print("  ARDHI VERIFIED — Master Spatial Data Loader")
    print(f"  {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 70)

    # ── Validate environment ────────────────────────────────────────────
    env = load_env()
    database_url = env.get("DATABASE_URL")
    if not database_url:
        print("  ERROR: DATABASE_URL missing from .env.local")
        print("  Find it in Supabase Dashboard → Settings → Database → Connection string")
        print("  Add to .env.local: DATABASE_URL=postgresql://postgres:PASSWORD@HOST:5432/postgres")
        sys.exit(1)
    print(f"  Database: connected via DATABASE_URL")

    if args.spatial_joins_only:
        run_spatial_joins(database_url)
        print(f"\n{'=' * 70}")
        print("  Done!")
        print(f"{'=' * 70}")
        return

    # ── Check data directory ────────────────────────────────────────────
    data_dir = args.data_dir
    if not os.path.isdir(data_dir):
        print(f"\n  WARNING: Data directory not found: {data_dir}")
        print(f"  Create it and place shapefiles there:")
        print(f"    mkdir -p {data_dir}")
        for loader in LOADERS:
            print(f"    # {loader['name']}: {loader['shapefile']}")
        if not args.dry_run:
            sys.exit(1)

    # ── Filter loaders ──────────────────────────────────────────────────
    if args.only:
        selected = set(args.only.split(","))
        loaders = [l for l in LOADERS if l["key"] in selected]
        unknown = selected - {l["key"] for l in LOADERS}
        if unknown:
            print(f"  WARNING: Unknown loaders: {', '.join(unknown)}")
    else:
        loaders = LOADERS

    # ── Pre-flight: check shapefiles exist ──────────────────────────────
    print(f"\n  Pre-flight check ({len(loaders)} loaders):")
    all_ready = True
    for loader in loaders:
        shapefile_path = os.path.join(data_dir, loader["shapefile"])
        exists = os.path.exists(shapefile_path)
        status = "FOUND" if exists else "MISSING"
        icon = "+" if exists else "-"
        print(f"    [{icon}] {loader['name']}: {loader['shapefile']} — {status}")
        if not exists and loader["required"]:
            all_ready = False

    if not all_ready and not args.dry_run:
        print("\n  ERROR: Required shapefiles are missing.")
        print("  Download them and place in:", data_dir)
        sys.exit(1)

    # ── Run loaders ─────────────────────────────────────────────────────
    print(f"\n{'─' * 70}")
    results = []

    for loader in loaders:
        shapefile_path = os.path.join(data_dir, loader["shapefile"])
        if not os.path.exists(shapefile_path):
            print(f"\n  SKIP: {loader['name']} — shapefile not found")
            results.append({"name": loader["name"], "status": "skipped"})
            continue

        print(f"\n  RUNNING: {loader['name']}")
        print(f"  {loader['description']}")
        print(f"  {'─' * 50}")

        script_path = os.path.join(SCRIPTS_DIR, loader["script"])
        cmd = [
            sys.executable, script_path,
            "--shapefile", shapefile_path,
        ] + loader["args"]

        if args.dry_run:
            cmd.append("--dry-run")

        try:
            result = subprocess.run(
                cmd,
                cwd=PROJECT_DIR,
                capture_output=False,
                text=True,
                timeout=600,
            )
            status = "success" if result.returncode == 0 else "failed"
            results.append({"name": loader["name"], "status": status})
        except subprocess.TimeoutExpired:
            print(f"  TIMEOUT: {loader['name']} exceeded 10 minutes")
            results.append({"name": loader["name"], "status": "timeout"})
        except Exception as e:
            print(f"  ERROR: {e}")
            results.append({"name": loader["name"], "status": "error"})

    # ── Summary ─────────────────────────────────────────────────────────
    print(f"\n{'=' * 70}")
    print("  LOADER SUMMARY")
    print(f"{'=' * 70}")
    for r in results:
        icon = "+" if r["status"] == "success" else "-"
        print(f"  [{icon}] {r['name']}: {r['status']}")

    # ── PostGIS spatial joins ──────────────────────────────────────────
    if not args.dry_run:
        successful = sum(1 for r in results if r["status"] == "success")
        if successful > 0:
            run_spatial_joins(database_url)

    print(f"\n{'=' * 70}")
    print("  Done!")
    print(f"{'=' * 70}")


if __name__ == "__main__":
    main()
