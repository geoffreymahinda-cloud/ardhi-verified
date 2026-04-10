"""
Ardhi Verified — Kenya Forest Reserves Scraper
================================================
Builds the forest_reserves table from two sources:

1. RCMRD forest reserve records already in riparian_zones
   (268 reserves with name and geometry)

2. Kenya Forest Conservation and Management Act 2016
   First Schedule (downloaded from kenyalaw.org PDF) —
   extracts every gazetted reserve with gazette reference

Deduplicates on reserve name (case-insensitive).

Usage:
    python3 scripts/scrape_forest_reserves.py

Dependencies:
    pip install requests pdfplumber supabase
"""

import json
import re
import sys
import os
from datetime import datetime
from pathlib import Path
from typing import List, Dict

import requests
from supabase import create_client

# ── CONFIGURATION ───────────────────────────────────────────────────────────

FOREST_ACT_URL = "https://kenyalaw.org/kl/fileadmin/pdfdownloads/Acts/ForestConservationandManagementActNo34of2016.pdf"
PDF_CACHE = Path(__file__).parent / "forest_act_2016.pdf"
OUTPUT_FILE = Path(__file__).parent / "forest_reserves_output.json"

HEADERS = {
    "User-Agent": "ArdhiVerified-ForestBot/1.0 (hello@ardhiverified.com)"
}


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


def download_forest_act() -> Path:
    """Download the Forest Act 2016 PDF (cached)."""
    if PDF_CACHE.exists():
        print("  PDF cached at {}".format(PDF_CACHE))
        return PDF_CACHE

    print("  Downloading Forest Act 2016 PDF...")
    r = requests.get(FOREST_ACT_URL, headers=HEADERS, timeout=60, stream=True)
    r.raise_for_status()
    with open(PDF_CACHE, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)
    print("  Saved {} bytes".format(PDF_CACHE.stat().st_size))
    return PDF_CACHE


def extract_pdf_text(path: Path) -> str:
    try:
        import pdfplumber
    except ImportError:
        print("ERROR: pdfplumber not installed")
        sys.exit(1)

    parts = []
    with pdfplumber.open(path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text:
                parts.append(text)
    return "\n".join(parts)


def parse_first_schedule(text: str) -> List[Dict]:
    """
    Extract forest reserves from the Forest Act 2016 First Schedule.
    Format typically:
        <REGION>
        1. Reserve Name — Gazette Notice No. X of YYYY
        2. Another Reserve — GN No. Y of YYYY
    """
    reserves = []

    # Find the First Schedule section
    schedule_match = re.search(
        r"FIRST\s+SCHEDULE.*?(?=SECOND\s+SCHEDULE|$)",
        text,
        re.DOTALL | re.IGNORECASE,
    )
    if not schedule_match:
        print("  No First Schedule section found")
        return reserves

    schedule_text = schedule_match.group(0)
    print("  First Schedule section: {} chars".format(len(schedule_text)))

    # Region detection — headings like "CENTRAL CONSERVANCY", "WESTERN CONSERVANCY", etc.
    current_region = None
    region_pattern = re.compile(
        r"^\s*(CENTRAL|EASTERN|WESTERN|COAST|RIFT\s+VALLEY|NORTH\s+EASTERN|NORTHERN|NAIROBI|NYANZA|MAU|MT\s+KENYA|EWASO)"
        r"\s*(?:CONSERVANCY|REGION|HIGHLANDS|COMPLEX)?",
        re.IGNORECASE | re.MULTILINE,
    )

    # Forest entries — numbered lists or table rows
    # Kenya Forest Act typically uses patterns like:
    #   1. Aberdare Forest Reserve ............ GN 44/1943
    #   2. Mt Kenya Forest Reserve ............ LN 186/1968
    entry_patterns = [
        # Numbered entry with gazette ref
        re.compile(
            r"^\s*\d+[\.)\s]+([A-Z][A-Za-z\s'\-]+?(?:Forest|Reserve|Nyika|Hill|Range))\s*"
            r"[\.\s\-]*((?:GN|LN|Legal\s+Notice|Gazette\s+Notice)[^\n]{0,50})?",
            re.MULTILINE,
        ),
        # Just forest name followed by gazette number (no leading number)
        re.compile(
            r"^\s*([A-Z][A-Za-z\s'\-]{3,50}Forest(?:\s+Reserve)?)\s*"
            r"[\.\s\-]*((?:GN|LN)\s+\d+[\s/]\d{2,4})",
            re.MULTILINE,
        ),
    ]

    seen = set()
    lines = schedule_text.split("\n")

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Region detection
        rm = region_pattern.match(line)
        if rm and len(line) < 50:
            current_region = rm.group(0).strip().title()
            continue

        # Forest entry detection
        for pattern in entry_patterns:
            m = pattern.match(line)
            if not m:
                continue

            name = m.group(1).strip().rstrip(".").rstrip(",")
            # Clean trailing page numbers/dots
            name = re.sub(r"\s*\.{2,}.*$", "", name)
            name = re.sub(r"\s+\d+\s*$", "", name)
            name = name.strip()

            if len(name) < 3 or len(name) > 80:
                continue

            gazette_ref = m.group(2) if len(m.groups()) > 1 and m.group(2) else None
            if gazette_ref:
                gazette_ref = gazette_ref.strip().rstrip(".").rstrip(",")

            key = name.lower()
            if key in seen:
                continue
            seen.add(key)

            reserves.append({
                "name": name,
                "region": current_region,
                "gazette_ref": gazette_ref,
                "source": "forest_act_2016",
                "source_url": FOREST_ACT_URL,
            })
            break

    return reserves


def fetch_rcmrd_reserves(sb) -> List[Dict]:
    """Fetch existing forest reserves from riparian_zones (RCMRD source)."""
    res = sb.table("riparian_zones").select(
        "name, county, basin, geometry, source"
    ).eq("water_type", "forest_reserve").execute()

    reserves = []
    for r in res.data:
        if not r.get("name") or r["name"].lower() in {"unknown", "unknown river"}:
            continue
        reserves.append({
            "name": r["name"].strip(),
            "county": r.get("county"),
            "region": r.get("basin"),
            "gazette_ref": None,
            "boundary_description": None,
            "source": "rcmrd",
            "source_url": None,
            "geometry": r.get("geometry"),
        })
    return reserves


def merge_reserves(rcmrd: List[Dict], act: List[Dict]) -> List[Dict]:
    """Merge RCMRD and Forest Act data, deduping by name."""
    merged = {}

    for r in rcmrd:
        key = r["name"].lower().strip()
        merged[key] = r

    # Enrich RCMRD records with gazette refs from Forest Act
    for r in act:
        key = r["name"].lower().strip()
        # Also match without "Forest Reserve" suffix
        key_alt = re.sub(r"\s+(forest\s+reserve|forest)$", "", key).strip()

        if key in merged:
            if r.get("gazette_ref") and not merged[key].get("gazette_ref"):
                merged[key]["gazette_ref"] = r["gazette_ref"]
                merged[key]["source"] = "rcmrd+forest_act_2016"
            if r.get("region") and not merged[key].get("region"):
                merged[key]["region"] = r["region"]
        elif key_alt in merged:
            if r.get("gazette_ref") and not merged[key_alt].get("gazette_ref"):
                merged[key_alt]["gazette_ref"] = r["gazette_ref"]
                merged[key_alt]["source"] = "rcmrd+forest_act_2016"
        else:
            # New reserve from Forest Act only
            merged[key] = {
                "name": r["name"],
                "county": None,
                "region": r.get("region"),
                "gazette_ref": r.get("gazette_ref"),
                "boundary_description": None,
                "source": "forest_act_2016",
                "source_url": r.get("source_url"),
                "geometry": None,
            }

    return list(merged.values())


def main():
    print("=" * 60)
    print("ARDHI VERIFIED — Forest Reserves Builder")
    print("=" * 60)

    env = load_env()
    sb = create_client(
        env["NEXT_PUBLIC_SUPABASE_URL"],
        env.get("SUPABASE_SERVICE_ROLE_KEY"),
    )

    # Step 1: Fetch existing RCMRD forest reserves
    print("\nStep 1: Fetching RCMRD forest reserves from riparian_zones...")
    rcmrd = fetch_rcmrd_reserves(sb)
    print("  Found {} RCMRD reserves".format(len(rcmrd)))

    # Step 2: Download and parse Forest Act 2016
    print("\nStep 2: Downloading Forest Conservation and Management Act 2016...")
    pdf_path = download_forest_act()

    print("  Extracting text...")
    text = extract_pdf_text(pdf_path)
    print("  Extracted {} chars".format(len(text)))

    print("  Parsing First Schedule...")
    act_reserves = parse_first_schedule(text)
    print("  Found {} reserves in First Schedule".format(len(act_reserves)))

    # Step 3: Merge
    print("\nStep 3: Merging sources...")
    merged = merge_reserves(rcmrd, act_reserves)
    print("  Total unique reserves: {}".format(len(merged)))

    with_gazette = sum(1 for r in merged if r.get("gazette_ref"))
    with_county = sum(1 for r in merged if r.get("county"))
    with_region = sum(1 for r in merged if r.get("region"))
    print("  With gazette ref: {}".format(with_gazette))
    print("  With county: {}".format(with_county))
    print("  With region: {}".format(with_region))

    # Save JSON snapshot
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "metadata": {
                "source": "RCMRD + Kenya Forest Act 2016 First Schedule",
                "scrape_date": datetime.now().isoformat(),
                "total_reserves": len(merged),
                "with_gazette_ref": with_gazette,
            },
            "reserves": merged,
        }, f, indent=2, ensure_ascii=False)
    print("\n  JSON saved to {}".format(OUTPUT_FILE))

    # Step 4: Upsert into forest_reserves table
    print("\nStep 4: Upserting into forest_reserves table...")
    inserted = 0
    errors = 0

    for i, r in enumerate(merged):
        row = {
            "name": r["name"],
            "county": r.get("county"),
            "region": r.get("region"),
            "gazette_ref": r.get("gazette_ref"),
            "boundary_description": r.get("boundary_description"),
            "source": r.get("source"),
            "source_url": r.get("source_url"),
            "geometry": r.get("geometry"),
        }
        try:
            sb.table("forest_reserves").upsert(row, on_conflict="name").execute()
            inserted += 1
            if inserted % 25 == 0:
                print("  {} upserted...".format(inserted))
        except Exception as e:
            errors += 1
            if errors <= 3:
                print("  ERROR on {}: {}".format(r["name"][:40], str(e)[:80]))

    # County breakdown
    counties = {}
    for r in merged:
        c = r.get("county") or "Unknown"
        counties[c] = counties.get(c, 0) + 1

    regions = {}
    for r in merged:
        reg = r.get("region") or "Unknown"
        regions[reg] = regions.get(reg, 0) + 1

    print("\n" + "=" * 60)
    print("DONE")
    print("  Inserted: {}".format(inserted))
    print("  Errors: {}".format(errors))
    print("  Total: {}".format(len(merged)))
    print("")
    print("  Top regions:")
    for r, c in sorted(regions.items(), key=lambda x: -x[1])[:10]:
        print("    {}: {}".format(r, c))
    print("")
    print("  Top counties:")
    for c, n in sorted(counties.items(), key=lambda x: -x[1])[:10]:
        print("    {}: {}".format(c, n))
    print("=" * 60)


if __name__ == "__main__":
    main()
