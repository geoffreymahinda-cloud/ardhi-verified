"""
Ardhi Verified — Road Corridor Acquisition Extractor
========================================================
Extracts road corridor compulsory acquisition notices from
the existing gazette_notices table into road_acquisition_notices.

Targets notices mentioning:
  - KeNHA / Kenya National Highways Authority
  - KURA / Kenya Urban Roads Authority
  - KeRRA / Kenya Rural Roads Authority
  - construction of road, road corridor, dualling
  - bypass, highway expansion

Usage:
    python3 scripts/extract_road_acquisitions.py
"""

import os
import re
import sys
from typing import List, Dict, Optional

from supabase import create_client


ROAD_AGENCY_PATTERN = re.compile(
    r"(Kenya\s+National\s+Highways\s+Authority|KeNHA|"
    r"Kenya\s+Urban\s+Roads\s+Authority|KURA|"
    r"Kenya\s+Rural\s+Roads\s+Authority|KeRRA|"
    r"Kenya\s+Roads\s+Board|KRB|"
    r"Ministry\s+of\s+Roads|Ministry\s+of\s+Transport)",
    re.IGNORECASE,
)

ROAD_CODE_PATTERN = re.compile(
    r"\b([ABCDEFGP]\d{1,5})\b"
)

KENYA_COUNTIES = [
    "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu",
    "Garissa", "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho",
    "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui",
    "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
    "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi",
    "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri",
    "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi",
    "Trans-Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
]
COUNTY_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(c) for c in KENYA_COUNTIES) + r")\b",
    re.IGNORECASE,
)

# Description patterns for road project purposes
CONSTRUCTION_PATTERN = re.compile(
    r"(construction|dualling|rehabilitation|expansion|upgrading|widening|"
    r"improvement|tarmacking|maintenance)\s+of\s+([^.,;]{5,200}(?:road|highway|bypass|corridor|dual\s+carriageway))",
    re.IGNORECASE,
)


def load_env():
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    env = {}
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                env[key.strip()] = value.strip()
    return env


def extract_from_notice(notice: Dict) -> List[Dict]:
    raw_text = notice.get("raw_text") or ""
    if not raw_text or len(raw_text) < 50:
        return []

    # Must contain road keyword AND (agency OR construction pattern)
    if not re.search(r"\broad\b|\bhighway\b|\bbypass\b|\bdual\s*carriage", raw_text, re.IGNORECASE):
        return []

    agency_match = ROAD_AGENCY_PATTERN.search(raw_text)
    construction_match = CONSTRUCTION_PATTERN.search(raw_text)

    if not agency_match and not construction_match:
        return []

    records = []

    # Extract agency
    agency = agency_match.group(1).strip() if agency_match else "Unspecified road agency"

    # Extract county
    county = notice.get("county")
    if not county:
        cm = COUNTY_PATTERN.search(raw_text[:3000])
        if cm:
            county = cm.group(1)

    # Extract road codes mentioned
    road_codes = list(set(ROAD_CODE_PATTERN.findall(raw_text[:5000])))[:5]

    # Build description from construction pattern or first relevant sentence
    description = None
    if construction_match:
        description = construction_match.group(0).strip()[:400]
    else:
        # Find first sentence mentioning road
        sentences = re.split(r"[.!?]\s+", raw_text[:3000])
        for s in sentences:
            if re.search(r"\broad\b|\bhighway\b", s, re.IGNORECASE) and len(s) > 30:
                description = s.strip()[:400]
                break

    if not description:
        return []

    # One record per notice (dedup'd by notice id)
    records.append({
        "description": description,
        "road_agency": agency,
        "county": county,
        "gazette_year": notice.get("gazette_year"),
        "gazette_notice_number": notice.get("gazette_notice_number"),
        "parcel_references": road_codes,
        "source_url": notice.get("gazette_url"),
    })

    return records


def main():
    print("=" * 60)
    print("ROAD CORRIDOR ACQUISITION EXTRACTOR")
    print("=" * 60)

    env = load_env()
    sb = create_client(
        env["NEXT_PUBLIC_SUPABASE_URL"],
        env.get("SUPABASE_SERVICE_ROLE_KEY"),
    )

    print("\nFetching road-related gazette notices...")
    all_notices = []
    seen_ids = set()

    queries = [
        ("KeNHA", "%KeNHA%"),
        ("Kenya National Highways", "%Kenya National Highways%"),
        ("construction of road", "%construction of%road%"),
        ("dualling", "%dualling%"),
        ("road corridor", "%road corridor%"),
        ("KURA", "%KURA%"),
    ]

    for label, pattern in queries:
        print("  Searching: {}".format(label))
        page = 0
        PAGE = 500
        while True:
            try:
                res = sb.table("gazette_notices").select(
                    "id, raw_text, gazette_year, gazette_notice_number, gazette_url, county"
                ).ilike("raw_text", pattern).range(page * PAGE, (page + 1) * PAGE - 1).execute()
            except Exception as e:
                print("    Error: {}".format(str(e)[:80]))
                break

            if not res.data:
                break
            for n in res.data:
                if n["id"] not in seen_ids:
                    seen_ids.add(n["id"])
                    all_notices.append(n)
            if len(res.data) < PAGE:
                break
            page += 1

    print("  Unique notices: {}".format(len(all_notices)))

    # Extract records
    print("\nExtracting road acquisition records...")
    all_records = []
    for notice in all_notices:
        recs = extract_from_notice(notice)
        all_records.extend(recs)

    print("  Extracted {} records".format(len(all_records)))

    # Insert
    print("\nInserting into road_acquisition_notices...")
    inserted = 0
    errors = 0
    err_samples = []

    for r in all_records:
        try:
            sb.table("road_acquisition_notices").insert(r).execute()
            inserted += 1
            if inserted % 25 == 0:
                print("  {} inserted...".format(inserted))
        except Exception as e:
            errors += 1
            if len(err_samples) < 3:
                err_samples.append(str(e)[:100])

    for e in err_samples:
        print("  ERR: {}".format(e))

    # Stats
    from collections import Counter
    counties = Counter(r.get("county") or "Unknown" for r in all_records)
    agencies = Counter(r.get("road_agency") or "?" for r in all_records)

    print("\n" + "=" * 60)
    print("DONE")
    print("  Inserted: {}".format(inserted))
    print("  Errors: {}".format(errors))
    print("\n  Top counties:")
    for c, n in counties.most_common(10):
        print("    {}: {}".format(c, n))
    print("\n  Top agencies:")
    for a, n in agencies.most_common(5):
        print("    {}: {}".format(a, n))
    print("=" * 60)


if __name__ == "__main__":
    main()
