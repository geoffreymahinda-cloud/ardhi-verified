"""
Ardhi Verified — NLC Compulsory Acquisition Extractor
========================================================
Extracts structured compulsory acquisition and historical
land injustice records from the existing gazette_notices
table, producing the nlc_acquisitions table.

Targets gazette notices mentioning:
  - compulsory acquisition
  - National Land Commission / NLC
  - HLI (historical land injustice) case numbers
  - Public purpose declarations
  - Adjudication notices

Usage:
    python3 scripts/extract_nlc_acquisitions.py

Dependencies:
    pip install supabase
"""

import os
import re
import sys
from typing import List, Dict, Optional

from supabase import create_client


# Patterns to extract structured data from gazette text
NLC_CASE_PATTERN = re.compile(r"(NLC/HLI/\d+/\d{4})", re.IGNORECASE)
GAZETTE_REF_PATTERN = re.compile(
    r"(?:Gazette\s+Notice(?:\s+No\.?)?\s*)(\d+[\s/]\w*\d*)",
    re.IGNORECASE,
)
ACQUIRING_AUTH_PATTERN = re.compile(
    r"(Kenya\s+National\s+Highways\s+Authority|KeNHA|"
    r"Kenya\s+Railways|KenGen|Kenya\s+Power|"
    r"Kenya\s+Urban\s+Roads\s+Authority|KURA|"
    r"Kenya\s+Rural\s+Roads\s+Authority|KeRRA|"
    r"Kenya\s+Pipeline\s+Company|"
    r"Ministry\s+of\s+[A-Z][a-z]+(?:\s+and\s+[A-Z][a-z]+)*|"
    r"County\s+Government\s+of\s+[A-Z][a-z]+|"
    r"Kenya\s+Forest\s+Service|KFS|"
    r"Kenya\s+Ports\s+Authority|"
    r"National\s+Land\s+Commission|NLC)",
    re.IGNORECASE,
)
PURPOSE_PATTERN = re.compile(
    r"(?:for\s+(?:the\s+)?purpose\s+of|for\s+(?:the\s+)?(?:construction|building|expansion|development|rehabilitation)\s+of)\s+([^.,;]{5,200})",
    re.IGNORECASE,
)

# Kenya counties
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


def extract_acquisitions_from_notice(notice: Dict) -> List[Dict]:
    """Extract structured acquisition records from a single gazette notice."""
    raw_text = notice.get("raw_text") or ""
    if not raw_text:
        return []

    acquisitions = []

    # Split into blocks around case mentions, paragraphs, or NLC markers
    # Try each NLC/HLI case found in the text as an anchor
    case_matches = list(NLC_CASE_PATTERN.finditer(raw_text))

    if case_matches:
        # Multiple cases in one notice — extract each with context
        for i, cm in enumerate(case_matches):
            case_num = cm.group(1)
            # Context window: 400 chars before + 600 after
            start = max(0, cm.start() - 200)
            end = min(len(raw_text), cm.end() + 800)
            context = raw_text[start:end]

            acq = build_acquisition(context, notice, case_num)
            acquisitions.append(acq)
    else:
        # No NLC case number — check for compulsory acquisition keywords
        if re.search(r"compulsory\s+acquisition|public\s+purpose|adjudication", raw_text, re.IGNORECASE):
            # Take first 2000 chars as context
            acq = build_acquisition(raw_text[:2000], notice, None)
            acquisitions.append(acq)

    return acquisitions


def build_acquisition(context: str, notice: Dict, nlc_case: Optional[str]) -> Dict:
    """Build a single acquisition record from a text context."""
    # Extract county
    county = notice.get("county")
    if not county:
        cm = COUNTY_PATTERN.search(context)
        if cm:
            county = cm.group(1)

    # Extract gazette ref
    gazette_ref = None
    gm = GAZETTE_REF_PATTERN.search(context)
    if gm:
        gazette_ref = "GN {}".format(gm.group(1).strip())
    elif notice.get("gazette_notice_number"):
        year = notice.get("gazette_year") or ""
        gazette_ref = "GN {}/{}".format(notice["gazette_notice_number"], year)

    # Extract acquiring authority
    acquiring = None
    am = ACQUIRING_AUTH_PATTERN.search(context)
    if am:
        acquiring = am.group(1).strip()

    # Extract purpose
    purpose = None
    pm = PURPOSE_PATTERN.search(context)
    if pm:
        purpose = pm.group(1).strip()[:300]

    # Build location description — use parties text or first sentence
    location = None
    # Try to extract from "X vs Y" pattern
    vs_match = re.search(r"([A-Z][A-Za-z\s&,]+?)(?:\s+vs?\.?\s+|\s+v\s+)([A-Z][A-Za-z\s&]+)", context[:500])
    if vs_match:
        location = vs_match.group(1).strip()[:300]

    if not location:
        # Take first meaningful sentence
        first_sent = re.search(r"[A-Z][^.!?]{20,200}[.!?]", context)
        if first_sent:
            location = first_sent.group(0).strip()[:300]

    return {
        "location_description": location,
        "county": county,
        "gazette_ref": gazette_ref,
        "gazette_date": None,
        "gazette_year": notice.get("gazette_year"),
        "gazette_notice_number": notice.get("gazette_notice_number"),
        "acquiring_authority": acquiring,
        "purpose": purpose,
        "nlc_case_number": nlc_case,
        "source": "gazette_extraction",
        "source_url": notice.get("gazette_url"),
        "raw_snippet": context[:2000],
    }


def main():
    print("=" * 60)
    print("NLC COMPULSORY ACQUISITION EXTRACTOR")
    print("=" * 60)

    env = load_env()
    sb = create_client(
        env["NEXT_PUBLIC_SUPABASE_URL"],
        env.get("SUPABASE_SERVICE_ROLE_KEY"),
    )

    # Fetch all gazette notices matching any NLC-related keyword
    # Paginate by id range
    print("\nFetching relevant gazette notices...")
    all_notices = []
    seen_ids = set()

    # Use several queries to cover patterns
    queries = [
        ("compulsory acquisition", "%compulsory%"),
        ("NLC/HLI case", "%NLC/HLI%"),
        ("National Land Commission", "%National Land Commission%"),
        ("public purpose", "%public purpose%"),
    ]

    for label, pattern in queries:
        print("  Searching: {}".format(label))
        page = 0
        PAGE = 1000
        while True:
            try:
                res = sb.table("gazette_notices").select(
                    "id, raw_text, gazette_year, gazette_notice_number, gazette_url, county, notice_type"
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

    print("  Total unique notices: {}".format(len(all_notices)))

    # Extract acquisitions
    print("\nExtracting acquisition records...")
    all_acquisitions = []
    for notice in all_notices:
        acqs = extract_acquisitions_from_notice(notice)
        all_acquisitions.extend(acqs)

    print("  Extracted {} acquisition records".format(len(all_acquisitions)))

    # Deduplicate by (nlc_case_number, gazette_year)
    seen = set()
    unique = []
    for a in all_acquisitions:
        key = (a.get("nlc_case_number"), a.get("gazette_year"), a.get("location_description"))
        if key in seen:
            continue
        seen.add(key)
        unique.append(a)

    print("  Unique: {}".format(len(unique)))

    # Insert into nlc_acquisitions
    print("\nInserting into nlc_acquisitions...")
    inserted = 0
    errors = 0

    for i, a in enumerate(unique):
        try:
            sb.table("nlc_acquisitions").insert(a).execute()
            inserted += 1
            if inserted % 50 == 0:
                print("  {} inserted...".format(inserted))
        except Exception as e:
            errors += 1
            if errors <= 3:
                print("  ERROR: {}".format(str(e)[:100]))

    # Stats
    counties = {}
    with_case = 0
    with_purpose = 0
    with_auth = 0
    for a in unique:
        c = a.get("county") or "Unknown"
        counties[c] = counties.get(c, 0) + 1
        if a.get("nlc_case_number"):
            with_case += 1
        if a.get("purpose"):
            with_purpose += 1
        if a.get("acquiring_authority"):
            with_auth += 1

    print("\n" + "=" * 60)
    print("DONE")
    print("  Inserted: {}".format(inserted))
    print("  Errors: {}".format(errors))
    print("  With NLC case number: {}".format(with_case))
    print("  With purpose: {}".format(with_purpose))
    print("  With acquiring authority: {}".format(with_auth))
    print("")
    print("  Top counties:")
    for c, n in sorted(counties.items(), key=lambda x: -x[1])[:15]:
        print("    {}: {}".format(c, n))
    print("=" * 60)


if __name__ == "__main__":
    main()
