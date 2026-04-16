"""
Confidence Score Computation Engine
====================================
Computes parcels.confidence_score (0.00 to 1.00) based on how many
official data sources confirm a parcel's data.

Scoring weights (from brief Section 7):
    Ardhisasa/NLIMS confirmed title   +0.40
    Nairobi GIS Hub survey plan        +0.20
    Gazette-verified transaction       +0.15
    County GIS confirmed boundary      +0.10
    OSM building footprint on parcel   +0.05
    Zoning record exists               +0.05
    Aerial/satellite imagery match     +0.05

Usage:
    python3 pipeline/enrichment/compute_confidence.py
    python3 pipeline/enrichment/compute_confidence.py --parcel-id 123
    python3 pipeline/enrichment/compute_confidence.py --dry-run
"""

import argparse
import os
import sys

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


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


# ── Confidence score weights ────────────────────────────────────────────────

WEIGHTS = {
    "ardhisasa":  0.40,  # NLIMS confirmed title
    "gis_hub":    0.20,  # Nairobi GIS Hub survey plan
    "gazette":    0.15,  # Gazette-verified transaction
    "county_gis": 0.10,  # County GIS confirmed boundary
    "osm":        0.05,  # OSM building footprint on parcel
    "zoning":     0.05,  # Zoning record exists
    "imagery":    0.05,  # Aerial/satellite imagery match
}


def compute_for_parcel(cur, parcel_id, parcel_ref):
    """Compute confidence score for a single parcel."""
    score = 0.0
    sources = []

    # Check data_source field on the parcel itself
    cur.execute("SELECT data_source FROM parcels WHERE id = %s", (parcel_id,))
    row = cur.fetchone()
    if row and row[0]:
        ds = row[0].lower()
        if "ardhisasa" in ds or "nlims" in ds:
            score += WEIGHTS["ardhisasa"]
            sources.append("ardhisasa")
        if "gis_hub" in ds or "nairobi_gis" in ds:
            score += WEIGHTS["gis_hub"]
            sources.append("gis_hub")
        if "county" in ds:
            score += WEIGHTS["county_gis"]
            sources.append("county_gis")
        if "osm" in ds:
            score += WEIGHTS["osm"]
            sources.append("osm")

    # Check gazette_notices for this parcel reference
    if parcel_ref:
        cur.execute(
            "SELECT COUNT(*) FROM gazette_notices WHERE %s = ANY(parcel_reference)",
            (parcel_ref,),
        )
        gazette_count = cur.fetchone()[0]
        if gazette_count > 0:
            score += WEIGHTS["gazette"]
            sources.append("gazette")

    # Check intelligence_layers for zoning
    cur.execute(
        "SELECT zoning_class FROM intelligence_layers WHERE parcel_id = %s",
        (parcel_id,),
    )
    il_row = cur.fetchone()
    if il_row and il_row[0]:
        score += WEIGHTS["zoning"]
        sources.append("zoning")

    # Check parcel_rim_records for survey plan confirmation
    if parcel_ref:
        cur.execute(
            "SELECT boundary_match_status FROM parcel_rim_records WHERE parcel_reference = %s AND boundary_match_status = 'confirmed' LIMIT 1",
            (parcel_ref,),
        )
        if cur.fetchone():
            # RIM confirmed = proxy for GIS Hub if not already counted
            if "gis_hub" not in sources:
                score += WEIGHTS["gis_hub"]
                sources.append("gis_hub_rim")

    # Clamp to 1.00
    score = min(score, 1.00)

    return round(score, 2), sources


def main():
    parser = argparse.ArgumentParser(description="Compute parcel confidence scores")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--parcel-id", type=int, help="Compute for a single parcel")
    args = parser.parse_args()

    print("=" * 60)
    print("  Confidence Score Computation")
    print("=" * 60)

    env = load_env()
    database_url = env.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    import psycopg2

    conn = psycopg2.connect(database_url)
    cur = conn.cursor()

    # Get parcels to process
    if args.parcel_id:
        cur.execute(
            "SELECT id, parcel_reference FROM parcels WHERE id = %s",
            (args.parcel_id,),
        )
    else:
        cur.execute("SELECT id, parcel_reference FROM parcels ORDER BY id")

    parcels = cur.fetchall()
    print(f"  Processing {len(parcels)} parcels...")

    updated = 0
    for parcel_id, parcel_ref in parcels:
        score, sources = compute_for_parcel(cur, parcel_id, parcel_ref)

        if args.dry_run:
            print(f"  Parcel {parcel_id} ({parcel_ref}): {score} — sources: {', '.join(sources) or 'none'}")
            continue

        cur.execute(
            "UPDATE parcels SET confidence_score = %s, last_updated = now() WHERE id = %s",
            (score, parcel_id),
        )
        updated += 1

    if not args.dry_run:
        conn.commit()
        print(f"  Updated {updated} parcels")
    else:
        print(f"  DRY RUN: Would update {len(parcels)} parcels")

    cur.close()
    conn.close()
    print("  Done!")


if __name__ == "__main__":
    main()
