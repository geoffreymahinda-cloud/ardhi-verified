"""
Ardhi Verified — KeRRA Rural Roads Scraper
=============================================
Scrapes Kenya Rural Roads Authority (kerra.go.ke) tender
listings to extract every rural road in their catalogue.

Each KeRRA tender page is named after a rural road using
the official road code + route description. We extract:
  - Road code (e.g. C754, E7103, D1850, G712638)
  - Road class from prefix letter (A/B/C/D/E/G/P/U/UK/UR/M)
  - Route description (from slug)
  - Statutory reserve width by class

Writes to scripts/kerra_output.json then loads into
the existing road_reserves table via the existing
load_road_reserves_to_supabase.py pattern.

Usage:
    python3 scripts/scrape_kerra.py

Dependencies:
    pip install requests
"""

import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

import requests

# ── CONFIGURATION ───────────────────────────────────────────────────────────

BASE_URL = "https://kerra.go.ke"
SITEMAPS = [
    "/wp-sitemap-posts-dlp_document-1.xml",
    "/wp-sitemap-posts-dlp_document-2.xml",
    "/wp-sitemap-posts-dlp_document-3.xml",
]

REQUEST_DELAY = 1
REQUEST_TIMEOUT = 20
OUTPUT_FILE = Path(__file__).parent / "kerra_output.json"

HEADERS = {
    "User-Agent": "ArdhiVerified-KeRRABot/1.0 (hello@ardhiverified.com; rural roads research)"
}

# Statutory road reserve widths per Kenya Roads Act / Class of Roads Notice
RESERVE_WIDTHS = {
    "A": 60,   # International trunk / highways
    "B": 40,   # National trunk
    "C": 25,   # Primary
    "D": 20,   # Secondary
    "E": 20,   # Minor
    "G": 15,   # Group unclassified / access
    "P": 15,   # Primary access
    "U": 15,   # Urban
    "UK": 15,  # Urban KeRRA
    "UR": 15,  # Urban rural
    "M": 15,   # Metropolitan
}

CLASS_LABELS = {
    "A": "A (International trunk)",
    "B": "B (National trunk)",
    "C": "C (Primary)",
    "D": "D (Secondary)",
    "E": "E (Minor)",
    "G": "G (Group/Unclassified)",
    "P": "P (Primary access)",
    "U": "U (Urban)",
    "UK": "UK (KeRRA Urban)",
    "UR": "UR (Urban Rural)",
    "M": "M (Metropolitan)",
}

# Road code pattern — matches: c754, e7103, d1850, g712638, p1178, uk37, ur102, etc.
ROAD_CODE_PATTERN = re.compile(
    r"\b(a|b|c|d|e|g|p|u|uk|ur|m|urb|urbu)(\d+)(?:[-_/](\d+))?",
    re.IGNORECASE,
)


def fetch(url: str) -> Optional[str]:
    try:
        r = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        r.raise_for_status()
        return r.text
    except requests.RequestException as e:
        print("  Failed {}: {}".format(url, e))
        return None


def extract_road_codes(slug: str) -> List[Dict]:
    """Extract all road codes from a slug and return distinct entries."""
    entries = []
    seen_codes = set()

    for m in ROAD_CODE_PATTERN.finditer(slug):
        prefix = m.group(1).upper()
        number = m.group(2)
        suffix = m.group(3)

        # Canonical road code
        if suffix:
            code = "{}{}/{}".format(prefix, number, suffix)
        else:
            code = "{}{}".format(prefix, number)

        if code in seen_codes:
            continue
        seen_codes.add(code)

        # Normalize class (UK/UR/URB treated as U)
        road_class = prefix
        if prefix in ("UK", "UR", "URB", "URBU"):
            road_class = "U"
        elif prefix == "M":
            road_class = "M"

        entries.append({
            "code": code,
            "prefix": prefix,
            "number": number,
            "road_class": road_class,
            "class_label": CLASS_LABELS.get(road_class, road_class),
            "reserve_width_metres": RESERVE_WIDTHS.get(road_class, 15),
        })

    return entries


def clean_route_description(slug: str) -> str:
    """Turn a slug into a readable route description."""
    # Drop common tender prefixes
    text = re.sub(
        r"^(routine-maintenance(-and)?(-spot-)?improvement-of-|"
        r"rountine-maintenance(-and)?(-spot-)?improvement-of-|"
        r"tender-document-for-|tender-doc-for-|"
        r"construction-of-|road-)",
        "",
        slug,
        flags=re.IGNORECASE,
    )
    # Drop trailing "-road" and tender suffixes
    text = re.sub(r"-road(-\d+)?$", "", text, flags=re.IGNORECASE)
    text = re.sub(r"-tender-no.*$", "", text, flags=re.IGNORECASE)
    text = re.sub(r"-kerra.*$", "", text, flags=re.IGNORECASE)
    # Convert hyphens to spaces and title case
    text = text.replace("-", " ").replace("_", " ").strip()
    return text[:200]


def main():
    print("=" * 60)
    print("ARDHI VERIFIED — KeRRA Rural Roads Scraper")
    print("=" * 60)

    # Step 1: Gather all tender URLs from sitemaps
    all_urls = set()
    for sm in SITEMAPS:
        print("\nFetching {}".format(sm))
        text = fetch(BASE_URL + sm)
        if not text:
            continue
        urls = re.findall(r"<loc>([^<]+)</loc>", text)
        tender_urls = [u for u in urls if "/tenders/" in u and "road" in u.lower()]
        print("  Found {} tender-road URLs".format(len(tender_urls)))
        all_urls.update(tender_urls)
        time.sleep(REQUEST_DELAY)

    print("\nUnique tender URLs: {}".format(len(all_urls)))

    # Step 2: Extract road data from each URL slug
    print("\nExtracting road codes from slugs...")
    roads = []
    codes_seen = set()

    for url in all_urls:
        slug = url.rstrip("/").split("/")[-1]
        route_desc = clean_route_description(slug)

        entries = extract_road_codes(slug)
        for entry in entries:
            code = entry["code"]
            if code in codes_seen:
                continue
            codes_seen.add(code)

            roads.append({
                "road_name": "{}: {}".format(code, route_desc) if route_desc else code,
                "road_number": code,
                "road_class": entry["road_class"],
                "road_category": entry["class_label"],
                "route_description": route_desc,
                "counties": [],
                "region": None,
                "road_length_km": None,
                "reserve_width_metres": entry["reserve_width_metres"],
                "geometry": None,
                "source": "kerra",
                "source_url": url,
                "scraped_at": datetime.now().isoformat(),
            })

    print("  Unique road codes: {}".format(len(roads)))

    # Breakdown by class
    from collections import Counter
    classes = Counter(r["road_class"] for r in roads)
    print("\n  By class:")
    for c, n in classes.most_common():
        print("    {} ({}): {}".format(c, CLASS_LABELS.get(c, c), n))

    # Save
    output = {
        "metadata": {
            "source": "KeRRA (kerra.go.ke) tender listings",
            "scrape_date": datetime.now().isoformat(),
            "total_roads": len(roads),
            "total_tender_urls_scanned": len(all_urls),
            "class_breakdown": dict(classes),
        },
        "records": roads,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 60)
    print("DONE — saved to {}".format(OUTPUT_FILE))
    print("  Now run: python3 scripts/load_road_reserves_to_supabase.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
