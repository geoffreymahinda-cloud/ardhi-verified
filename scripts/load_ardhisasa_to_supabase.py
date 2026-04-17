"""
Ardhi Verified --- Load Ardhisasa Parcel Data to Supabase
==========================================================
Reads extracted parcel features from ardhisasa_output.json
and upserts into the parcels table in Supabase/PostGIS.

The parcels table schema:
  id, parcel_reference, owner_name, country, county_district,
  land_use, area_ha, tenure_type, hati_score, geom (POLYGON, 4326),
  lr_number, block_number, area_sqm, data_source, confidence_score

Geometry is stored via PostGIS ST_GeomFromGeoJSON.

Usage:
    python3 scripts/load_ardhisasa_to_supabase.py
    python3 scripts/load_ardhisasa_to_supabase.py --dry-run

Dependencies:
    pip install supabase psycopg2-binary python-dotenv
"""

import json
import logging
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

SCRIPT_DIR = Path(__file__).parent
INPUT_FILE = SCRIPT_DIR / "ardhisasa_output.json"
ERROR_LOG = SCRIPT_DIR / "ardhisasa_loader_errors.log"

# Maximum batch size for Supabase upsert
BATCH_SIZE = 50

# -- LOGGING -----------------------------------------------------------------

logger = logging.getLogger("ardhisasa_loader")
logger.setLevel(logging.DEBUG)

_fh = logging.FileHandler(ERROR_LOG, encoding="utf-8")
_fh.setLevel(logging.WARNING)
_fh.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
logger.addHandler(_fh)

_sh = logging.StreamHandler()
_sh.setLevel(logging.INFO)
_sh.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(_sh)


# -- ENV LOADING -------------------------------------------------------------

def load_env() -> Dict[str, str]:
    """Parse .env.local for Supabase credentials and DATABASE_URL."""
    env_path = SCRIPT_DIR.parent / ".env.local"
    env = {}
    try:
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    env[key.strip()] = value.strip()
    except FileNotFoundError:
        print("ERROR: .env.local not found at {}".format(env_path))
        sys.exit(1)
    return env


# -- VALIDATION --------------------------------------------------------------

# Reject obviously bad values
_REJECT_PATTERNS = [
    re.compile(r"^[0\s]+$"),
    re.compile(r"test", re.I),
    re.compile(r"sample", re.I),
    re.compile(r"^n/?a$", re.I),
    re.compile(r"^-+$"),
    re.compile(r"^null$", re.I),
    re.compile(r"^none$", re.I),
    re.compile(r"^undefined$", re.I),
]


def is_valid_string(val: Optional[str]) -> bool:
    """Check that a string value is non-empty and not obviously junk."""
    if not val or not val.strip():
        return False
    for pat in _REJECT_PATTERNS:
        if pat.search(val.strip()):
            return False
    return True


def validate_geometry(geom: Optional[Dict]) -> bool:
    """Basic validation that a GeoJSON geometry has coordinates."""
    if not geom:
        return False
    geom_type = geom.get("type", "")
    if geom_type not in ("Polygon", "MultiPolygon"):
        return False
    coords = geom.get("coordinates")
    if not coords:
        return False
    # Check that coordinates are not empty arrays
    if geom_type == "Polygon":
        if not coords or not coords[0] or len(coords[0]) < 4:
            return False
    elif geom_type == "MultiPolygon":
        if not coords or not coords[0] or not coords[0][0] or len(coords[0][0]) < 4:
            return False
    return True


def validate_feature(feature: Dict) -> Dict[str, Any]:
    """
    Validate and clean a feature for insertion.
    Returns dict with 'valid' bool and cleaned 'row' data.
    """
    issues = []

    # Must have geometry
    geom = feature.get("geometry")
    if not validate_geometry(geom):
        return {"valid": False, "reason": "invalid_geometry", "row": None}

    # Clean values
    parcel_ref = feature.get("parcel_reference")
    if parcel_ref and not is_valid_string(parcel_ref):
        parcel_ref = None

    owner_name = feature.get("owner_name")
    if owner_name and not is_valid_string(owner_name):
        owner_name = None

    lr_number = feature.get("lr_number")
    if lr_number and not is_valid_string(lr_number):
        lr_number = None

    block_number = feature.get("block_number")
    if block_number and not is_valid_string(block_number):
        block_number = None

    land_use = feature.get("land_use")
    if land_use and not is_valid_string(land_use):
        land_use = None

    # Must have at least a parcel reference or LR number for the row to be useful
    if not parcel_ref and not lr_number:
        return {"valid": False, "reason": "no_parcel_ref_or_lr", "row": None}

    # Area validation
    area_ha = feature.get("area_ha")
    area_sqm = feature.get("area_sqm")
    if area_ha is not None:
        try:
            area_ha = round(float(area_ha), 4)
            if area_ha <= 0 or area_ha > 100000:  # sanity check
                area_ha = None
        except (ValueError, TypeError):
            area_ha = None

    if area_sqm is not None:
        try:
            area_sqm = round(float(area_sqm), 2)
            if area_sqm <= 0 or area_sqm > 1e9:
                area_sqm = None
        except (ValueError, TypeError):
            area_sqm = None

    row = {
        "parcel_reference": (parcel_ref or "")[:200] if parcel_ref else None,
        "owner_name": (owner_name or "")[:500] if owner_name else None,
        "country": "Kenya",
        "county_district": feature.get("county_district", "Nairobi"),
        "land_use": (land_use or "")[:200] if land_use else None,
        "area_ha": area_ha,
        "area_sqm": area_sqm,
        "tenure_type": None,
        "hati_score": None,
        "lr_number": (lr_number or "")[:100] if lr_number else None,
        "block_number": (block_number or "")[:100] if block_number else None,
        "data_source": "ardhisasa",
        "confidence_score": 0.7,
        "geom_geojson": json.dumps(geom),  # will be converted via PostGIS
    }

    return {"valid": True, "reason": None, "row": row}


# -- DATABASE LOADING (PostgREST / Supabase) --------------------------------

def load_via_supabase(env: Dict, rows: List[Dict], dry_run: bool):
    """
    Load rows via the Supabase Python client.
    Note: Supabase/PostgREST does not natively handle GeoJSON geometry.
    We use an RPC function or raw SQL to insert geometry properly.
    """
    supabase_url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        print("ERROR: Missing SUPABASE_URL or key in .env.local")
        sys.exit(1)

    print("  Supabase URL: {}".format(supabase_url))
    print("  Using key: {}".format(
        "service_role" if env.get("SUPABASE_SERVICE_ROLE_KEY") else "anon"
    ))

    if dry_run:
        print("\n  DRY RUN -- showing what would be inserted:\n")
        for i, row in enumerate(rows[:20]):
            geom_preview = row.get("geom_geojson", "")[:60]
            print("    {:4d}. ref={} lr={} block={} geom={}...".format(
                i + 1,
                row.get("parcel_reference", "?")[:30],
                row.get("lr_number", "?"),
                row.get("block_number", "?"),
                geom_preview,
            ))
        if len(rows) > 20:
            print("    ... and {} more".format(len(rows) - 20))

        # Summary stats
        with_ref = sum(1 for r in rows if r.get("parcel_reference"))
        with_owner = sum(1 for r in rows if r.get("owner_name"))
        with_lr = sum(1 for r in rows if r.get("lr_number"))
        with_block = sum(1 for r in rows if r.get("block_number"))
        with_area = sum(1 for r in rows if r.get("area_ha"))

        print("\n  Summary:")
        print("    Total rows to insert:   {}".format(len(rows)))
        print("    With parcel reference:  {}".format(with_ref))
        print("    With owner name:        {}".format(with_owner))
        print("    With LR number:         {}".format(with_lr))
        print("    With block number:      {}".format(with_block))
        print("    With area:              {}".format(with_area))
        print("\n  Run without --dry-run to write to Supabase.")
        return

    # For geometry insertion, we need to use PostgREST RPC or direct SQL.
    # Attempt 1: Use an RPC function if available
    # Attempt 2: Fall back to psycopg2 direct connection

    database_url = env.get("DATABASE_URL")
    if database_url:
        print("\n  DATABASE_URL found -- using direct PostgreSQL connection")
        load_via_psycopg2(database_url, rows)
    else:
        print("\n  No DATABASE_URL -- using Supabase RPC")
        load_via_supabase_rpc(supabase_url, supabase_key, rows)


def load_via_psycopg2(database_url: str, rows: List[Dict]):
    """
    Load rows directly via psycopg2, using ST_GeomFromGeoJSON for geometry.
    This is the most reliable way to insert PostGIS geometry.
    """
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
        print("       Or set DATABASE_URL and use direct connection.")
        sys.exit(1)

    print("  Connecting to PostgreSQL...")
    try:
        conn = psycopg2.connect(database_url)
        conn.autocommit = False
        cur = conn.cursor()
    except Exception as e:
        print("ERROR: Could not connect to database: {}".format(e))
        sys.exit(1)

    insert_sql = """
        INSERT INTO parcels (
            parcel_reference, owner_name, country, county_district,
            land_use, area_ha, area_sqm, tenure_type, hati_score,
            lr_number, block_number, data_source, confidence_score, geom
        ) VALUES (
            %(parcel_reference)s, %(owner_name)s, %(country)s, %(county_district)s,
            %(land_use)s, %(area_ha)s, %(area_sqm)s, %(tenure_type)s, %(hati_score)s,
            %(lr_number)s, %(block_number)s, %(data_source)s, %(confidence_score)s,
            ST_SetSRID(ST_GeomFromGeoJSON(%(geom_geojson)s), 4326)
        )
        ON CONFLICT (parcel_reference) WHERE parcel_reference IS NOT NULL
        DO UPDATE SET
            owner_name = COALESCE(EXCLUDED.owner_name, parcels.owner_name),
            land_use = COALESCE(EXCLUDED.land_use, parcels.land_use),
            area_ha = COALESCE(EXCLUDED.area_ha, parcels.area_ha),
            area_sqm = COALESCE(EXCLUDED.area_sqm, parcels.area_sqm),
            lr_number = COALESCE(EXCLUDED.lr_number, parcels.lr_number),
            block_number = COALESCE(EXCLUDED.block_number, parcels.block_number),
            geom = EXCLUDED.geom,
            data_source = 'ardhisasa',
            confidence_score = EXCLUDED.confidence_score
    """

    inserted = 0
    updated = 0
    errors = 0
    error_messages = []

    print("  Inserting {} rows...".format(len(rows)))

    for i, row in enumerate(rows):
        try:
            cur.execute(insert_sql, row)
            if cur.statusmessage and "UPDATE" in cur.statusmessage:
                updated += 1
            else:
                inserted += 1
        except Exception as e:
            errors += 1
            err_msg = str(e).strip()
            if len(error_messages) < 10:
                error_messages.append("Row {}: {}".format(i, err_msg[:150]))
            logger.error("Insert error row %d ref=%s: %s",
                         i, row.get("parcel_reference", "?"), err_msg[:200])
            conn.rollback()
            # Continue with remaining rows
            cur = conn.cursor()
            continue

        # Commit in batches
        if (i + 1) % BATCH_SIZE == 0:
            conn.commit()
            print("    {}/{} processed ({} new, {} updated, {} errors)".format(
                i + 1, len(rows), inserted, updated, errors,
            ))

    # Final commit
    conn.commit()
    cur.close()
    conn.close()

    print("\n  Done!")
    print("  Inserted: {}".format(inserted))
    print("  Updated:  {}".format(updated))
    print("  Errors:   {}".format(errors))

    if error_messages:
        print("\n  Error samples:")
        for msg in error_messages[:5]:
            print("    {}".format(msg))
        print("  Full error log: {}".format(ERROR_LOG))


def load_via_supabase_rpc(supabase_url: str, supabase_key: str, rows: List[Dict]):
    """
    Load rows via Supabase PostgREST.
    Since PostgREST cannot call ST_GeomFromGeoJSON directly,
    we create an RPC function and call it.

    Requires the following SQL function to exist in the database:

    CREATE OR REPLACE FUNCTION insert_parcel_with_geojson(
        p_parcel_reference TEXT,
        p_owner_name TEXT,
        p_country TEXT,
        p_county_district TEXT,
        p_land_use TEXT,
        p_area_ha FLOAT,
        p_area_sqm FLOAT,
        p_tenure_type TEXT,
        p_lr_number TEXT,
        p_block_number TEXT,
        p_data_source TEXT,
        p_confidence_score FLOAT,
        p_geojson TEXT
    ) RETURNS VOID LANGUAGE plpgsql AS $$
    BEGIN
        INSERT INTO parcels (
            parcel_reference, owner_name, country, county_district,
            land_use, area_ha, area_sqm, tenure_type,
            lr_number, block_number, data_source, confidence_score, geom
        ) VALUES (
            p_parcel_reference, p_owner_name, p_country, p_county_district,
            p_land_use, p_area_ha, p_area_sqm, p_tenure_type,
            p_lr_number, p_block_number, p_data_source, p_confidence_score,
            ST_SetSRID(ST_GeomFromGeoJSON(p_geojson), 4326)
        )
        ON CONFLICT (parcel_reference) WHERE parcel_reference IS NOT NULL
        DO UPDATE SET
            owner_name = COALESCE(EXCLUDED.owner_name, parcels.owner_name),
            geom = EXCLUDED.geom,
            data_source = 'ardhisasa';
    END;
    $$;
    """
    try:
        from supabase import create_client
    except ImportError:
        print("ERROR: supabase package not installed. Run: pip install supabase")
        sys.exit(1)

    print("  Connecting to Supabase...")
    supabase = create_client(supabase_url, supabase_key)

    inserted = 0
    errors = 0
    error_messages = []

    for i, row in enumerate(rows):
        try:
            supabase.rpc("insert_parcel_with_geojson", {
                "p_parcel_reference": row.get("parcel_reference"),
                "p_owner_name": row.get("owner_name"),
                "p_country": row.get("country", "Kenya"),
                "p_county_district": row.get("county_district", "Nairobi"),
                "p_land_use": row.get("land_use"),
                "p_area_ha": row.get("area_ha"),
                "p_area_sqm": row.get("area_sqm"),
                "p_tenure_type": row.get("tenure_type"),
                "p_lr_number": row.get("lr_number"),
                "p_block_number": row.get("block_number"),
                "p_data_source": row.get("data_source", "ardhisasa"),
                "p_confidence_score": row.get("confidence_score", 0.7),
                "p_geojson": row.get("geom_geojson"),
            }).execute()
            inserted += 1
        except Exception as e:
            errors += 1
            err_msg = str(e)
            if len(error_messages) < 10:
                error_messages.append("Row {}: {}".format(i, err_msg[:150]))
            logger.error("RPC error row %d ref=%s: %s",
                         i, row.get("parcel_reference", "?"), err_msg[:200])

        if (i + 1) % 50 == 0:
            print("    {}/{} processed ({} inserted, {} errors)".format(
                i + 1, len(rows), inserted, errors,
            ))

    print("\n  Done!")
    print("  Inserted: {}".format(inserted))
    print("  Errors:   {}".format(errors))

    if error_messages:
        print("\n  Error samples:")
        for msg in error_messages[:5]:
            print("    {}".format(msg))


# -- MAIN -------------------------------------------------------------------

def main():
    dry_run = "--dry-run" in sys.argv

    print("=" * 60)
    print("ARDHI VERIFIED -- Load Ardhisasa Parcels to Supabase")
    if dry_run:
        print("MODE: DRY RUN (no writes to database)")
    print("=" * 60)

    env = load_env()

    # Load extracted data
    print("\n  Loading data from {}...".format(INPUT_FILE))
    try:
        with open(INPUT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print("  Input file not found.")
        if dry_run:
            print("  Creating sample data for dry-run validation...")
            data = _create_sample_data()
        else:
            print("  ERROR: Run scrape_ardhisasa.py first.")
            sys.exit(1)
    except json.JSONDecodeError as e:
        print("ERROR: {} is corrupt: {}".format(INPUT_FILE, e))
        sys.exit(1)

    # The output can be a list (direct features) or dict with "features" key
    if isinstance(data, list):
        features = data
    elif isinstance(data, dict):
        features = data.get("features", data.get("parcels", []))
    else:
        print("ERROR: Unexpected data format in {}".format(INPUT_FILE))
        sys.exit(1)

    print("  Features in file: {}".format(len(features)))

    if not features:
        if dry_run:
            print("  No features found. Creating sample for dry-run...")
            features = _create_sample_data()
        else:
            print("  No features to load.")
            return

    # Validate and filter
    valid_rows = []
    invalid_counts = {"invalid_geometry": 0, "no_parcel_ref_or_lr": 0, "other": 0}

    for feat in features:
        result = validate_feature(feat)
        if result["valid"]:
            valid_rows.append(result["row"])
        else:
            reason = result.get("reason", "other")
            invalid_counts[reason] = invalid_counts.get(reason, 0) + 1

    # Deduplicate by parcel_reference
    seen = set()
    deduped = []
    for row in valid_rows:
        key = row.get("parcel_reference") or row.get("lr_number") or id(row)
        if key not in seen:
            seen.add(key)
            deduped.append(row)
    dup_count = len(valid_rows) - len(deduped)
    valid_rows = deduped

    print("\n  Valid rows:     {}".format(len(valid_rows)))
    for reason, count in invalid_counts.items():
        if count > 0:
            print("  Skipped ({}): {}".format(reason, count))
    if dup_count:
        print("  Skipped (duplicate): {}".format(dup_count))

    if not valid_rows:
        print("\n  No valid rows to load.")
        return

    # Load to database
    load_via_supabase(env, valid_rows, dry_run)

    print("\n" + "=" * 60)


def _create_sample_data() -> List[Dict]:
    """Create sample parcel data for dry-run testing."""
    return [
        {
            "parcel_reference": "LR 209/12345",
            "owner_name": "Sample Owner A",
            "country": "Kenya",
            "county_district": "Nairobi",
            "land_use": "Residential",
            "area_ha": 0.05,
            "area_sqm": 500.0,
            "lr_number": "LR 209/12345",
            "block_number": "45/78",
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [36.8219, -1.2921],
                        [36.8225, -1.2921],
                        [36.8225, -1.2927],
                        [36.8219, -1.2927],
                        [36.8219, -1.2921],
                    ]
                ],
            },
            "data_source": "ardhisasa",
        },
        {
            "parcel_reference": "LR 209/67890",
            "owner_name": "Sample Owner B",
            "country": "Kenya",
            "county_district": "Nairobi",
            "land_use": "Commercial",
            "area_ha": 0.12,
            "area_sqm": 1200.0,
            "lr_number": "LR 209/67890",
            "block_number": "45/79",
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [36.8230, -1.2921],
                        [36.8240, -1.2921],
                        [36.8240, -1.2930],
                        [36.8230, -1.2930],
                        [36.8230, -1.2921],
                    ]
                ],
            },
            "data_source": "ardhisasa",
        },
        {
            "parcel_reference": None,
            "owner_name": None,
            "country": "Kenya",
            "county_district": "Nairobi",
            "land_use": None,
            "lr_number": None,
            "block_number": None,
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[36.82, -1.29], [36.83, -1.29], [36.83, -1.30], [36.82, -1.30], [36.82, -1.29]]],
            },
            "data_source": "ardhisasa",
        },
    ]


if __name__ == "__main__":
    main()
