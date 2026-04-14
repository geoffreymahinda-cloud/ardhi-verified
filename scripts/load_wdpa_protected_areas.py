"""
Ardhi Verified — Load WDPA Protected Areas to Supabase
========================================================
Loads World Database on Protected Areas (WDPA) shapefiles
into the protected_zones table with native PostGIS geometry via psycopg2.

Data source:
  https://www.protectedplanet.net/en/thematic-areas/wdpa
  Download: WDPA_WDOECM_<month>_Public_KEN_shp.zip

Prerequisites:
    pip install geopandas fiona shapely psycopg2-binary

Usage:
    python3 scripts/load_wdpa_protected_areas.py --shapefile data/WDPA_KEN.shp
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

# WDPA IUCN category → Ardhi designation mapping
IUCN_MAP = {
    "Ia": "strict_nature_reserve",
    "Ib": "wilderness_area",
    "II": "national_park",
    "III": "natural_monument",
    "IV": "habitat_management",
    "V": "protected_landscape",
    "VI": "sustainable_use",
    "Not Reported": "unknown",
    "Not Applicable": "other",
    "Not Assigned": "other",
}

# Kenya bounding box
KENYA_BBOX = (33.9, -4.7, 41.9, 5.5)

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
        description="Load WDPA protected areas into protected_zones"
    )
    parser.add_argument(
        "--shapefile", required=True,
        help="Path to WDPA shapefile for Kenya"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Parse only — do not insert into Supabase"
    )
    args = parser.parse_args()

    print("=" * 60)
    print("ARDHI VERIFIED — Load WDPA Protected Areas")
    print("=" * 60)

    # ── Read shapefile ──────────────────────────────────────────────────
    print(f"\n  Reading shapefile: {args.shapefile}")
    if not os.path.exists(args.shapefile):
        print(f"  ERROR: File not found: {args.shapefile}")
        print("  Download from: https://www.protectedplanet.net/en")
        sys.exit(1)

    gdf = gpd.read_file(args.shapefile, bbox=KENYA_BBOX)
    print(f"  Features in Kenya extent: {len(gdf)}")

    if gdf.empty:
        print("  No features found — check shapefile")
        sys.exit(0)

    # Ensure WGS84
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        print(f"  Reprojecting from {gdf.crs} to EPSG:4326...")
        gdf = gdf.to_crs(epsg=4326)

    # ── Build records ───────────────────────────────────────────────────
    print("  Building records...")
    records = []
    now_iso = datetime.now(timezone.utc).isoformat()

    # Detect data source: WDPA vs OSM/Geofabrik
    is_osm = "fclass" in gdf.columns or "osm_id" in gdf.columns
    if is_osm:
        print("  Detected OSM/Geofabrik protected areas format")

    for _, row in gdf.iterrows():
        geom = row.geometry
        if geom is None or geom.is_empty:
            continue

        # Normalize to MultiPolygon
        if geom.geom_type == "Polygon":
            geom = MultiPolygon([geom])
        elif geom.geom_type != "MultiPolygon":
            continue

        if is_osm:
            # OSM/Geofabrik format: osm_id, code, fclass
            fclass = str(row.get("fclass", "") or "").strip()
            osm_id = str(row.get("osm_id", "") or "").strip()

            designation = fclass if fclass else "other"
            name = f"OSM Protected Area ({fclass}, {osm_id})"
            area_ha = None
            tags = {
                "osm_id": osm_id,
                "osm_code": str(row.get("code", "") or ""),
                "fclass": fclass,
            }
            source = "geofabrik_osm"
            source_url = f"https://www.openstreetmap.org/way/{osm_id}" if osm_id else None
        else:
            # WDPA format
            name = str(row.get("NAME", "") or row.get("name", "") or "").strip()
            if not name or name in ["None", "0", "Not Reported"]:
                name = "Unnamed Protected Area"

            iucn_cat = str(row.get("IUCN_CAT", "Not Reported") or "Not Reported")
            designation = IUCN_MAP.get(iucn_cat, "other")

            desig_eng = str(row.get("DESIG_ENG", "") or "").strip().lower()
            if "national park" in desig_eng:
                designation = "national_park"
            elif "forest" in desig_eng:
                designation = "forest"
            elif "nature reserve" in desig_eng:
                designation = "nature_reserve"
            elif "marine" in desig_eng:
                designation = "marine_reserve"
            elif "community" in desig_eng:
                designation = "community_conservancy"

            area_ha = None
            if "REP_AREA" in gdf.columns:
                try:
                    area_ha = float(row["REP_AREA"])
                except (ValueError, TypeError):
                    pass

            wdpa_id = row.get("WDPAID") or row.get("WDPA_PID")
            tags = {
                "wdpa_id": str(wdpa_id) if wdpa_id else None,
                "iucn_cat": iucn_cat,
                "status": str(row.get("STATUS", "") or ""),
                "gov_type": str(row.get("GOV_TYPE", "") or ""),
                "mang_auth": str(row.get("MANG_AUTH", "") or ""),
            }
            source = "wdpa"
            source_url = f"https://www.protectedplanet.net/{wdpa_id}" if wdpa_id else None

        records.append({
            "name": name,
            "designation": designation,
            "boundary": str(row.get("DESIG_ENG", "") or ""),
            "protection_title": str(row.get("DESIG_TYPE", "") or ""),
            "county": None,  # spatially joined later
            "area_hectares": area_ha,
            "source": source,
            "source_url": source_url,
            "wkt": geom.wkt,
            "tags": json.dumps(tags),
            "scraped_at": now_iso,
        })

    print(f"  Records to load: {len(records)}")

    # Stats by designation
    desig_counts = {}
    for r in records:
        d = r["designation"]
        desig_counts[d] = desig_counts.get(d, 0) + 1
    for desig, count in sorted(desig_counts.items(), key=lambda x: -x[1]):
        print(f"    {desig}: {count}")

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

    print(f"\n  Inserting {len(records)} records into protected_zones...")
    inserted = 0
    errors = 0

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]

        try:
            cur.executemany(
                """INSERT INTO protected_zones
                       (name, designation, boundary, protection_title,
                        county, area_hectares, source, source_url,
                        geom, tags, scraped_at)
                   VALUES (
                       %(name)s, %(designation)s, %(boundary)s, %(protection_title)s,
                       %(county)s, %(area_hectares)s, %(source)s, %(source_url)s,
                       ST_SetSRID(ST_GeomFromText(%(wkt)s), 4326),
                       %(tags)s::jsonb, %(scraped_at)s
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
