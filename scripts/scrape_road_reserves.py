"""
Ardhi Verified — Road Reserve Scraper
======================================
Scrapes road corridor data from:
  1. KeNHA ArcGIS Feature Service (759 road segments with geometry)
  2. KURA Urban Roads Status HTML table (96 contracts)

Derives reserve widths from road class per Kenya Roads Act:
  Class A (International Trunk Roads) = 60m each side
  Class B (National Trunk Roads)      = 40m each side
  Class S (Secondary Roads)           = 25m each side
  Urban Roads (KURA)                  = 15m each side (default)

Usage:
    python3 scripts/scrape_road_reserves.py

Output:
    scripts/road_reserves_output.json
"""

import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict

import requests
from bs4 import BeautifulSoup

# ── CONFIGURATION ───────────────────────────────────────────────────────────

KENHA_FEATURE_SERVICE = (
    "https://kenhagis.kenha.co.ke/arcgis/rest/services/"
    "Hosted/Road_Register_Dec_2024/FeatureServer/0/query"
)

KURA_ROADS_URL = "https://kura.go.ke/urban-roads-status-data/"

OUTPUT_FILE = Path(__file__).parent / "road_reserves_output.json"

REQUEST_DELAY = 2
REQUEST_TIMEOUT = 30
MAX_RETRIES = 2
PAGE_SIZE = 200  # ArcGIS max records per request

HEADERS = {
    "User-Agent": "ArdhiVerified-LandIntelBot/1.0 "
                  "(hello@ardhiverified.com; road reserve research)"
}

# Kenya Roads Act — reserve widths by road class (metres each side of centreline)
RESERVE_WIDTHS = {
    "A": 60,   # International Trunk Roads
    "B": 40,   # National Trunk Roads
    "S": 25,   # Secondary Roads
    "C": 25,   # Primary roads (county)
    "D": 15,   # Secondary roads (county)
    "E": 10,   # Minor roads
    "U": 15,   # Urban roads (KURA default)
}


# ── HELPERS ─────────────────────────────────────────────────────────────────

def fetch_json(url: str, params: Dict = None) -> Optional[Dict]:
    """Fetch JSON with retry logic."""
    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = requests.get(
                url, params=params, headers=HEADERS, timeout=REQUEST_TIMEOUT
            )
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as e:
            if attempt < MAX_RETRIES:
                print(f"    Retry {attempt + 1}/{MAX_RETRIES}...")
                time.sleep(REQUEST_DELAY)
            else:
                print(f"    Failed: {e}")
                return None
    return None


def fetch_html(url: str) -> Optional[BeautifulSoup]:
    """Fetch HTML page with retry logic."""
    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            return BeautifulSoup(resp.text, "html.parser")
        except requests.RequestException as e:
            if attempt < MAX_RETRIES:
                time.sleep(REQUEST_DELAY)
            else:
                print(f"    Failed: {e}")
                return None
    return None


def get_reserve_width(road_class: str) -> int:
    """Get reserve width in metres for a road class."""
    if not road_class:
        return 15
    key = road_class.strip().upper()[0] if road_class.strip() else "U"
    return RESERVE_WIDTHS.get(key, 15)


def clean_text(text: Optional[str]) -> str:
    """Clean and normalise text."""
    if not text:
        return ""
    return re.sub(r"\s+", " ", str(text)).strip()


def extract_counties(text: str) -> List[str]:
    """Extract county names from a road description or route."""
    if not text:
        return []
    # Common Kenya counties that appear in road descriptions
    known_counties = [
        "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet",
        "Embu", "Garissa", "Homa Bay", "Isiolo", "Kajiado",
        "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga",
        "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia",
        "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit",
        "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi",
        "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua",
        "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River",
        "Tharaka-Nithi", "Trans-Nzoia", "Turkana", "Uasin Gishu",
        "Vihiga", "Wajir", "West Pokot",
    ]
    found = []
    text_lower = text.lower()
    for county in known_counties:
        if county.lower() in text_lower:
            found.append(county)
    return found


# ── KENHA ARCGIS SCRAPER ───────────────────────────────────────────────────

def scrape_kenha() -> List[Dict]:
    """Scrape all road segments from KeNHA ArcGIS Feature Service."""
    print("\n  Fetching KeNHA ArcGIS Feature Service...")

    all_features = []
    offset = 0

    while True:
        params = {
            "where": "1=1",
            "outFields": "*",
            "returnGeometry": "true",
            "f": "json",
            "resultOffset": offset,
            "resultRecordCount": PAGE_SIZE,
        }

        data = fetch_json(KENHA_FEATURE_SERVICE, params)
        if not data:
            print(f"    Failed to fetch at offset {offset}")
            break

        features = data.get("features", [])
        if not features:
            break

        all_features.extend(features)
        print(f"    Fetched {len(all_features)} features so far...")

        # Check if there are more
        if len(features) < PAGE_SIZE:
            break

        offset += PAGE_SIZE
        time.sleep(REQUEST_DELAY)

    print(f"  Total KeNHA features: {len(all_features)}")

    # Transform to our schema
    records = []
    for feat in all_features:
        attrs = feat.get("attributes", {})
        geom = feat.get("geometry", {})

        road_number = clean_text(attrs.get("roadnumber") or attrs.get("rdnum"))
        road_name = clean_text(attrs.get("roadname") or attrs.get("rdname") or "")
        road_class = clean_text(attrs.get("roadclass") or attrs.get("rdclass") or "")
        route_desc = clean_text(attrs.get("route_desc") or "")
        county = clean_text(attrs.get("county") or "")
        region = clean_text(attrs.get("region") or "")
        road_length = attrs.get("rdlength") or attrs.get("rd_length") or 0
        road_category = clean_text(attrs.get("roadcatego") or "")

        # Build display name
        display_name = road_name or route_desc or road_number or "Unknown Road"
        if road_number and road_number not in display_name:
            display_name = f"{road_number}: {display_name}"

        # Get counties — from field or parse from route description
        counties = [county] if county else extract_counties(route_desc)
        if not counties and region:
            counties = [region]

        reserve_width = get_reserve_width(road_class)

        # Simplify geometry — store paths as coordinate arrays
        paths = geom.get("paths", [])
        simplified_geom = None
        if paths:
            # Store first and last point + total points for reference
            all_points = [pt for path in paths for pt in path]
            if all_points:
                simplified_geom = {
                    "type": "MultiLineString",
                    "paths_count": len(paths),
                    "total_points": len(all_points),
                    "bbox": [
                        min(p[0] for p in all_points),
                        min(p[1] for p in all_points),
                        max(p[0] for p in all_points),
                        max(p[1] for p in all_points),
                    ],
                    "paths": paths,
                }

        records.append({
            "road_name": display_name,
            "road_number": road_number,
            "road_class": road_class,
            "road_category": road_category,
            "route_description": route_desc,
            "counties": counties,
            "region": region,
            "road_length_km": round(float(road_length), 2) if road_length else None,
            "reserve_width_metres": reserve_width,
            "geometry": simplified_geom,
            "source": "kenha",
            "source_url": "https://kenhagis.kenha.co.ke/arcgis/rest/services/Hosted/Road_Register_Dec_2024/FeatureServer",
            "scraped_at": datetime.utcnow().isoformat(),
        })

    return records


# ── KURA HTML TABLE SCRAPER ────────────────────────────────────────────────

def scrape_kura() -> List[Dict]:
    """Scrape road contracts from KURA's urban roads status table."""
    print("\n  Fetching KURA Urban Roads Status Data...")

    soup = fetch_html(KURA_ROADS_URL)
    if not soup:
        print("    Failed to fetch KURA page")
        return []

    # Find the table — usually a TablePress table or standard HTML table
    tables = soup.find_all("table")
    if not tables:
        print("    No tables found on KURA page")
        return []

    # Use the largest table
    table = max(tables, key=lambda t: len(t.find_all("tr")))
    rows = table.find_all("tr")
    print(f"  Found table with {len(rows)} rows")

    records = []
    header_row = rows[0] if rows else None
    headers = []
    if header_row:
        headers = [clean_text(th.get_text()) for th in header_row.find_all(["th", "td"])]

    for row in rows[1:]:
        cells = [clean_text(td.get_text()) for td in row.find_all(["td", "th"])]
        if len(cells) < 3:
            continue

        # Try to map columns — KURA table typically:
        # NO., COUNTY, CONTRACT NAME, CONTRACTOR, CONTRACT SUM, ROAD LENGTH, STATUS
        county = ""
        contract_name = ""
        road_length = None
        status = ""

        if len(cells) >= 7:
            county = cells[1]
            contract_name = cells[2]
            road_length_str = cells[5]
            status = cells[6]
        elif len(cells) >= 4:
            county = cells[1]
            contract_name = cells[2]
            status = cells[-1]

        if not contract_name or contract_name.lower() in ["contract name", "total", ""]:
            continue

        # Parse road length
        if road_length_str := (cells[5] if len(cells) >= 6 else ""):
            try:
                road_length = float(re.sub(r"[^\d.]", "", road_length_str))
            except (ValueError, IndexError):
                road_length = None

        # Extract road names from contract name
        road_name = contract_name

        # Counties from KURA are usually single
        counties = [county] if county and county.lower() not in ["county", "total", ""] else []

        records.append({
            "road_name": road_name,
            "road_number": None,
            "road_class": "U",  # Urban
            "road_category": "Urban Road",
            "route_description": contract_name,
            "counties": counties,
            "region": county,
            "road_length_km": road_length,
            "reserve_width_metres": RESERVE_WIDTHS["U"],
            "geometry": None,  # KURA doesn't provide geometry
            "source": "kura",
            "source_url": KURA_ROADS_URL,
            "scraped_at": datetime.utcnow().isoformat(),
        })

    print(f"  Total KURA records: {len(records)}")
    return records


# ── MAIN ───────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("ARDHI VERIFIED — Road Reserve Scraper")
    print("Sources: KeNHA ArcGIS + KURA Urban Roads")
    print("=" * 60)

    # Scrape both sources
    kenha_records = scrape_kenha()
    time.sleep(REQUEST_DELAY)
    kura_records = scrape_kura()

    all_records = kenha_records + kura_records

    # Summary by road class
    class_counts: Dict[str, int] = {}
    for r in all_records:
        cls = r["road_class"] or "Unknown"
        class_counts[cls] = class_counts.get(cls, 0) + 1

    # Summary by county
    county_counts: Dict[str, int] = {}
    for r in all_records:
        for c in r["counties"]:
            county_counts[c] = county_counts.get(c, 0) + 1

    # Save output
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_records, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 60}")
    print(f"DONE")
    print(f"  Total records: {len(all_records)}")
    print(f"    KeNHA: {len(kenha_records)}")
    print(f"    KURA:  {len(kura_records)}")
    print(f"\n  Road class breakdown:")
    for cls, count in sorted(class_counts.items()):
        width = RESERVE_WIDTHS.get(cls[0] if cls else "U", 15)
        print(f"    Class {cls}: {count} roads ({width}m reserve)")
    print(f"\n  Top counties:")
    for county, count in sorted(county_counts.items(), key=lambda x: -x[1])[:15]:
        print(f"    {county}: {count} roads")
    print(f"\n  Output: {OUTPUT_FILE}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
