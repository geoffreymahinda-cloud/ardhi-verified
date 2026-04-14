"""
Ardhi Verified — Load geoBoundaries Kenya Admin Boundaries to Supabase
=======================================================================
Loads geoBoundaries Kenya county (ADM1) or sub-county (ADM2) boundaries
into the parcels table (tenure_type = 'administrative_boundary') with
native PostGIS geometry via psycopg2.

These boundaries are used for spatial joins — populating the county
field on road_reserves, riparian_zones, protected_zones, and flood_zones.

Data source:
  https://www.geoboundaries.org/index.html#getdata
  Licence: CC BY 4.0 — fully open for commercial use
  Format: GeoJSON with columns: shapeName, shapeISO, shapeID, shapeGroup, shapeType

Prerequisites:
    pip install geopandas psycopg2-binary

Usage:
    python3 scripts/load_gadm_boundaries.py --shapefile data/geoBoundaries-KEN-ADM1.geojson
    python3 scripts/load_gadm_boundaries.py --shapefile data/geoBoundaries-KEN-ADM2.geojson --level 2
"""

import argparse
import os
import sys

import geopandas as gpd
import psycopg2


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
        description="Load geoBoundaries Kenya admin boundaries into parcels table"
    )
    parser.add_argument(
        "--shapefile", required=True,
        help="Path to geoBoundaries GeoJSON (e.g. data/geoBoundaries-KEN-ADM1.geojson)"
    )
    parser.add_argument(
        "--level", type=int, default=1, choices=[1, 2],
        help="Admin level: 1=county, 2=sub-county (default: 1)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Parse only — do not insert into Supabase"
    )
    args = parser.parse_args()

    print("=" * 60)
    print(f"ARDHI VERIFIED — Load geoBoundaries Kenya (ADM{args.level})")
    print("=" * 60)

    # ── Read file ───────────────────────────────────────────────────────
    print(f"\n  Reading: {args.shapefile}")
    if not os.path.exists(args.shapefile):
        print(f"  ERROR: File not found: {args.shapefile}")
        print("  Download from: https://www.geoboundaries.org/index.html#getdata")
        sys.exit(1)

    gdf = gpd.read_file(args.shapefile)
    print(f"  Features loaded: {len(gdf)}")
    print(f"  Columns: {list(gdf.columns)}")
    print(f"  Licence: CC BY 4.0 (geoBoundaries)")

    # Ensure WGS84
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        print(f"  Reprojecting from {gdf.crs} to EPSG:4326...")
        gdf = gdf.to_crs(epsg=4326)

    # ── Detect column format ────────────────────────────────────────────
    # geoBoundaries: shapeName, shapeISO, shapeID, shapeGroup, shapeType
    # GADM fallback: NAME_1, GID_1, etc.
    if "shapeName" in gdf.columns:
        name_col = "shapeName"
        iso_col = "shapeISO"
        id_col = "shapeID"
        print(f"  Format: geoBoundaries (shapeName, shapeISO, shapeID)")
    elif f"NAME_{args.level}" in gdf.columns:
        name_col = f"NAME_{args.level}"
        iso_col = None
        id_col = f"GID_{args.level}"
        print(f"  Format: GADM (NAME_{args.level})")
    else:
        # Try generic fallbacks
        for col in ["NAME", "name", "ADM1_EN", "adm1_name", "COUNTY"]:
            if col in gdf.columns:
                name_col = col
                iso_col = None
                id_col = None
                break
        else:
            print(f"  ERROR: No name column found. Available: {list(gdf.columns)}")
            sys.exit(1)
        print(f"  Format: generic ({name_col})")

    # ── Build records ───────────────────────────────────────────────────
    print("  Building records...")
    records = []

    for _, row in gdf.iterrows():
        geom = row.geometry
        if geom is None or geom.is_empty:
            continue

        name = str(row.get(name_col, "") or "").strip()
        if not name:
            continue

        iso = str(row.get(iso_col, "") or "").strip() if iso_col else ""
        shape_id = str(row.get(id_col, "") or "").strip() if id_col else ""

        # Build parcel reference
        safe_name = name.upper().replace(" ", "_").replace("'", "")
        parcel_ref = f"GB-KEN-{iso or safe_name}"

        county_name = name  # ADM1 = county name directly

        records.append({
            "parcel_reference": parcel_ref,
            "owner_name": f"County Government of {name}",
            "country": "Kenya",
            "county_district": county_name,
            "land_use": "administrative",
            "area_ha": None,
            "tenure_type": "administrative_boundary",
            "hati_score": None,
            "wkt": geom.wkt,
        })

    print(f"  Records to load: {len(records)}")
    for r in records[:10]:
        print(f"    {r['parcel_reference']}: {r['county_district']}")
    if len(records) > 10:
        print(f"    ... and {len(records) - 10} more")

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

    # First, remove old GADM entries if they exist
    cur.execute(
        "DELETE FROM parcels WHERE parcel_reference LIKE 'GADM-KEN-%' AND tenure_type = 'administrative_boundary'"
    )
    deleted = cur.rowcount
    conn.commit()
    if deleted > 0:
        print(f"\n  Removed {deleted} old GADM boundary records")

    print(f"\n  Inserting {len(records)} records into parcels...")
    inserted = 0
    errors = 0

    for r in records:
        try:
            cur.execute(
                """INSERT INTO parcels
                       (parcel_reference, owner_name, country, county_district,
                        land_use, area_ha, tenure_type, hati_score, geom)
                   VALUES (
                       %(parcel_reference)s, %(owner_name)s, %(country)s,
                       %(county_district)s, %(land_use)s, %(area_ha)s,
                       %(tenure_type)s, %(hati_score)s,
                       ST_SetSRID(ST_GeomFromText(%(wkt)s), 4326)
                   )
                   ON CONFLICT (parcel_reference) DO UPDATE SET
                       geom = ST_SetSRID(ST_GeomFromText(%(wkt)s), 4326),
                       county_district = EXCLUDED.county_district,
                       owner_name = EXCLUDED.owner_name""",
                r,
            )
            conn.commit()
            inserted += 1
            print(f"    + {r['county_district']}")
        except Exception as e:
            conn.rollback()
            errors += 1
            print(f"    ERROR {r['county_district']}: {str(e)[:120]}")

    cur.close()
    conn.close()

    print(f"\n{'=' * 60}")
    print(f"  Done!")
    print(f"  Inserted:  {inserted}")
    print(f"  Errors:    {errors}")
    print(f"  PostGIS geom column: POPULATED (no backfill needed)")
    print(f"  Licence: CC BY 4.0 (geoBoundaries — commercial use OK)")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
