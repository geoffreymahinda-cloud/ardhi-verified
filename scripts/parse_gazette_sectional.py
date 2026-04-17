"""
Ardhi Verified — Gazette Sectional Title Parser
=================================================
Scans all gazette notices in the database for sectional title keywords
and extracts development name, unit number, floor level, sectional plan
number, and gazette reference. Loads into sectional_units and
sectional_encumbrances tables.

Keywords detected:
  'Unit No.', 'Sectional Plan', 'sectional property', 'S.P. No.'

Usage:
    python3 scripts/parse_gazette_sectional.py
    python3 scripts/parse_gazette_sectional.py --dry-run
"""

import argparse
import os
import re
import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).parent.parent

SECTIONAL_KEYWORDS = [
    r'unit\s*no\.?\s*',
    r'sectional\s*plan',
    r'sectional\s*propert',
    r's\.?\s*p\.?\s*no\.?\s*',
    r'sectional\s*title',
]

SECTIONAL_REGEX = re.compile(
    '|'.join(SECTIONAL_KEYWORDS),
    re.IGNORECASE,
)

# Extract sectional plan number: "S.P. No. 1234" or "Sectional Plan No. 1234"
SP_NO_PATTERN = re.compile(
    r'(?:S\.?\s*P\.?\s*No\.?|Sectional\s+Plan\s+(?:No\.?))\s*(\w[\w\-/]+)',
    re.IGNORECASE,
)

# Extract unit number: "Unit No. 5", "Unit 12A", "UNIT NO.5"
UNIT_NO_PATTERN = re.compile(
    r'Unit\s*No\.?\s*(\w[\w\-/]*)',
    re.IGNORECASE,
)

# Extract floor: "Floor 3", "3rd Floor", "Ground Floor"
FLOOR_PATTERN = re.compile(
    r'(?:(\d+)(?:st|nd|rd|th)?\s*[Ff]loor|[Ff]loor\s*(\d+)|[Gg]round\s*[Ff]loor)',
    re.IGNORECASE,
)

# Extract development name: typically before "Sectional Plan" or in quotes
DEV_NAME_PATTERN = re.compile(
    r'(?:known\s+as|called|named|at|of)\s+["\']?([A-Z][A-Za-z\s\-\']+?)(?:\s*["\']?\s*(?:Sectional|Unit|,|\.|\())',
    re.IGNORECASE,
)

# Encumbrance keywords
ENCUMBRANCE_KEYWORDS = ['charge', 'caveat', 'caution', 'restriction', 'inhibition', 'mortgage']


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


def extract_sectional_data(raw_text, description, notice_type, gazette_ref):
    """Extract sectional title data from a gazette notice."""
    text = f"{raw_text or ''} {description or ''}"

    if not SECTIONAL_REGEX.search(text):
        return None

    result = {
        "sectional_plan_no": None,
        "unit_numbers": [],
        "floor_level": None,
        "development_name": None,
        "is_encumbrance": False,
        "encumbrance_type": None,
        "gazette_reference": gazette_ref,
    }

    # Extract sectional plan number
    sp_match = SP_NO_PATTERN.search(text)
    if sp_match:
        result["sectional_plan_no"] = sp_match.group(1).strip()

    # Extract unit numbers (can be multiple)
    for m in UNIT_NO_PATTERN.finditer(text):
        unit = m.group(1).strip()
        if unit and unit not in result["unit_numbers"]:
            result["unit_numbers"].append(unit)

    # Extract floor level
    floor_match = FLOOR_PATTERN.search(text)
    if floor_match:
        if 'ground' in (floor_match.group(0) or '').lower():
            result["floor_level"] = 0
        else:
            level = floor_match.group(1) or floor_match.group(2)
            if level:
                result["floor_level"] = int(level)

    # Extract development name
    dev_match = DEV_NAME_PATTERN.search(text)
    if dev_match:
        name = dev_match.group(1).strip()
        if len(name) > 3 and len(name) < 100:
            result["development_name"] = name

    # Check if this is an encumbrance notice
    notice_lower = (notice_type or '').lower()
    text_lower = text.lower()
    for keyword in ENCUMBRANCE_KEYWORDS:
        if keyword in notice_lower or keyword in text_lower:
            result["is_encumbrance"] = True
            result["encumbrance_type"] = keyword
            break

    # Only return if we found meaningful data
    if result["unit_numbers"] or result["sectional_plan_no"] or result["development_name"]:
        return result

    return None


def main():
    parser = argparse.ArgumentParser(description="Parse gazette notices for sectional titles")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    print("=" * 60)
    print("  Gazette Sectional Title Parser")
    print("=" * 60)

    env = load_env()
    database_url = env.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    import psycopg2

    conn = psycopg2.connect(database_url)
    cur = conn.cursor()

    # Fetch all gazette notices with sectional keywords
    print("  Scanning gazette notices for sectional keywords...")
    cur.execute("""
        SELECT id, notice_type, raw_text, description, gazette_notice_number,
               affected_party, county, alert_level
        FROM gazette_notices
        WHERE raw_text ILIKE '%unit no%'
           OR raw_text ILIKE '%sectional plan%'
           OR raw_text ILIKE '%sectional property%'
           OR raw_text ILIKE '%s.p. no%'
           OR description ILIKE '%unit no%'
           OR description ILIKE '%sectional plan%'
           OR description ILIKE '%sectional property%'
           OR description ILIKE '%s.p. no%'
    """)

    notices = cur.fetchall()
    print(f"  Found {len(notices)} notices with sectional keywords")

    developments_created = 0
    units_created = 0
    encumbrances_created = 0

    for notice in notices:
        notice_id, notice_type, raw_text, description, gazette_ref, affected_party, county, alert_level = notice

        extracted = extract_sectional_data(raw_text, description, notice_type, gazette_ref)
        if not extracted:
            continue

        if args.dry_run:
            print(f"\n  Notice {notice_id}:")
            print(f"    Plan: {extracted['sectional_plan_no']}")
            print(f"    Units: {extracted['unit_numbers']}")
            print(f"    Dev: {extracted['development_name']}")
            print(f"    Floor: {extracted['floor_level']}")
            print(f"    Encumbrance: {extracted['is_encumbrance']} ({extracted['encumbrance_type']})")
            continue

        # Find or create development
        dev_id = None
        dev_name = extracted["development_name"] or f"Development (SP {extracted['sectional_plan_no'] or 'Unknown'})"

        if extracted["sectional_plan_no"]:
            cur.execute(
                "SELECT id FROM sectional_developments WHERE sectional_plan_no = %s LIMIT 1",
                (extracted["sectional_plan_no"],)
            )
            row = cur.fetchone()
            if row:
                dev_id = row[0]

        if not dev_id:
            # Look up county_id
            county_id = None
            if county:
                cur.execute("SELECT id FROM counties WHERE name ILIKE %s LIMIT 1", (county,))
                county_row = cur.fetchone()
                if county_row:
                    county_id = county_row[0]

            cur.execute("""
                INSERT INTO sectional_developments
                    (development_name, sectional_plan_no, county_id, location_description,
                     data_source, confidence_score)
                VALUES (%s, %s, %s, %s, 'gazette', 0.35)
                ON CONFLICT DO NOTHING
                RETURNING id
            """, (dev_name, extracted["sectional_plan_no"], county_id, county))

            row = cur.fetchone()
            if row:
                dev_id = row[0]
                developments_created += 1
            else:
                # Already exists by name, find it
                cur.execute(
                    "SELECT id FROM sectional_developments WHERE development_name = %s LIMIT 1",
                    (dev_name,)
                )
                row = cur.fetchone()
                if row:
                    dev_id = row[0]

        if not dev_id:
            continue

        # Create units
        for unit_number in extracted["unit_numbers"]:
            cur.execute("""
                INSERT INTO sectional_units
                    (development_id, unit_number, floor_level, gazette_reference)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                RETURNING id
            """, (dev_id, unit_number, extracted["floor_level"], extracted["gazette_reference"]))

            unit_row = cur.fetchone()
            if unit_row:
                unit_id = unit_row[0]
                units_created += 1

                # If encumbrance, create encumbrance record
                if extracted["is_encumbrance"] and extracted["encumbrance_type"]:
                    cur.execute("""
                        INSERT INTO sectional_encumbrances
                            (unit_id, encumbrance_type, holder, gazette_reference)
                        VALUES (%s, %s, %s, %s)
                    """, (unit_id, extracted["encumbrance_type"], affected_party, extracted["gazette_reference"]))
                    encumbrances_created += 1

        conn.commit()

    if not args.dry_run:
        conn.commit()

    cur.close()
    conn.close()

    print(f"\n  Results:")
    print(f"    Developments created: {developments_created}")
    print(f"    Units created: {units_created}")
    print(f"    Encumbrances created: {encumbrances_created}")
    print("  Done!")


if __name__ == "__main__":
    main()
