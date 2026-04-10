"""
Ardhi Verified — WRA Basin & Riparian Data Scraper
=====================================================
Scrapes the Water Resources Authority (wra.go.ke) for:
  - Basin management plans (6 basins: Athi, Tana, LVN, LVS,
    Ewaso Ngiro, Rift Valley)
  - Gazette notice declaring basin areas
  - Catchment area data

Downloads the PDFs, extracts text with pdfplumber, and
parses out protected water zones, basin boundaries, and
water body names.

Output is written to scripts/wra_output.json in the same
format as riparian_zones so it can be loaded by the
existing loader pattern.

Usage:
    python3 scripts/scrape_wra.py

Dependencies:
    pip install requests beautifulsoup4 pdfplumber
"""

import json
import re
import time
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict

import requests
from bs4 import BeautifulSoup

# ── CONFIGURATION ───────────────────────────────────────────────────────────

BASE_URL = "https://wra.go.ke"
DOWNLOAD_PAGES = [
    # Basin integrated plans — contain river/catchment boundaries
    {
        "url": "/download/athi-intergrated-water-resource-management-and-development-plan/",
        "basin": "Athi",
        "source": "wra_basin_plan",
    },
    {
        "url": "/download/lave-victoria-north-intergrated-water-resource-management-and-development-plan/",
        "basin": "Lake Victoria North",
        "source": "wra_basin_plan",
    },
    {
        "url": "/download/lake-victoria-south-intergrated-water-resource-management-and-development-plan/",
        "basin": "Lake Victoria South",
        "source": "wra_basin_plan",
    },
    {
        "url": "/download/ewaso-ngiro-north-intergrated-water-resource-management-and-development-plan/",
        "basin": "Ewaso Ngiro North",
        "source": "wra_basin_plan",
    },
    {
        "url": "/download/athi-basin-plan-final-nov-2020/",
        "basin": "Athi",
        "source": "wra_basin_plan_2020",
    },
    {
        "url": "/download/lvn-basin-plan-final-nov-2020/",
        "basin": "Lake Victoria North",
        "source": "wra_basin_plan_2020",
    },
    # Gazette notice for declaration of basin areas
    {
        "url": "/download/gazette-notice-for-declaration-of-basin-areas-order/",
        "basin": "All Basins",
        "source": "wra_gazette_declaration",
    },
]

REQUEST_DELAY = 3
REQUEST_TIMEOUT = 60
PDF_DIR = Path(__file__).parent / "wra_pdfs"
OUTPUT_FILE = Path(__file__).parent / "wra_output.json"

HEADERS = {
    "User-Agent": "ArdhiVerified-WRABot/1.0 (hello@ardhiverified.com; water resource research)"
}

# Kenya counties (for tagging)
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

# Patterns for water body names
RIVER_PATTERN = re.compile(
    r"(?:river|r\.)\s+([A-Z][a-zA-Z'\-]+(?:\s+[A-Z][a-zA-Z'\-]+)?)",
    re.IGNORECASE,
)
LAKE_PATTERN = re.compile(
    r"(?:lake|l\.)\s+([A-Z][a-zA-Z'\-]+(?:\s+[A-Z][a-zA-Z'\-]+)?)",
    re.IGNORECASE,
)
CATCHMENT_PATTERN = re.compile(
    r"([A-Z][a-zA-Z'\-]+(?:\s+[A-Z][a-zA-Z'\-]+)?)\s+(?:catchment|sub-?catchment)",
    re.IGNORECASE,
)


def fetch_page(url: str) -> Optional[BeautifulSoup]:
    try:
        r = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        r.raise_for_status()
        return BeautifulSoup(r.text, "html.parser")
    except requests.RequestException as e:
        print("  Failed to fetch {}: {}".format(url, e))
        return None


def find_pdf_url(page_url: str) -> Optional[str]:
    """Find the wpdmdl download link on a WRA download page."""
    soup = fetch_page(page_url)
    if not soup:
        return None
    for link in soup.select("a[href]"):
        href = link.get("href", "")
        if "wpdmdl=" in href and ".pdf" in href.lower():
            return href
    return None


def download_pdf(url: str, dest: Path) -> bool:
    try:
        r = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT, stream=True)
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except requests.RequestException as e:
        print("  Download failed: {}".format(e))
        return False


def extract_pdf_text(path: Path) -> Optional[str]:
    try:
        import pdfplumber
    except ImportError:
        print("ERROR: pdfplumber not installed")
        sys.exit(1)
    try:
        parts = []
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    parts.append(t)
        full = "\n".join(parts)
        if len(full.strip()) < 200:
            return None
        return full
    except Exception as e:
        print("  Extraction error: {}".format(e))
        return None


def parse_water_bodies(text: str, basin: str, source: str) -> List[Dict]:
    """Extract distinct water bodies and their likely counties from text."""
    zones = []
    seen = set()

    # Rivers
    for match in RIVER_PATTERN.finditer(text):
        name = match.group(1).strip()
        if len(name) < 3 or name.lower() in {"basin", "area", "zone", "system"}:
            continue
        key = ("river", name.lower())
        if key in seen:
            continue
        seen.add(key)
        zones.append({
            "name": "River " + name,
            "water_type": "river",
            "buffer_metres": 30,
            "basin": basin,
            "county": None,
            "source": source,
        })

    # Lakes
    for match in LAKE_PATTERN.finditer(text):
        name = match.group(1).strip()
        if len(name) < 3:
            continue
        key = ("lake", name.lower())
        if key in seen:
            continue
        seen.add(key)
        zones.append({
            "name": "Lake " + name,
            "water_type": "lake",
            "buffer_metres": 30,
            "basin": basin,
            "county": None,
            "source": source,
        })

    # Catchments
    for match in CATCHMENT_PATTERN.finditer(text):
        name = match.group(1).strip()
        if len(name) < 3:
            continue
        key = ("catchment", name.lower())
        if key in seen:
            continue
        seen.add(key)
        zones.append({
            "name": name + " Catchment",
            "water_type": "catchment",
            "buffer_metres": 30,
            "basin": basin,
            "county": None,
            "source": source,
        })

    # Tag counties where mentioned alongside a water body
    for zone in zones:
        body_name = zone["name"].replace("River ", "").replace("Lake ", "").replace(" Catchment", "")
        # Find mention of body in text, grab surrounding context, look for county
        for m in re.finditer(re.escape(body_name), text, re.IGNORECASE):
            start = max(0, m.start() - 200)
            end = min(len(text), m.end() + 200)
            context = text[start:end]
            for county in KENYA_COUNTIES:
                if re.search(r"\b" + re.escape(county) + r"\b", context, re.IGNORECASE):
                    zone["county"] = county
                    break
            if zone["county"]:
                break

    return zones


def main():
    print("=" * 60)
    print("ARDHI VERIFIED — WRA Basin & Riparian Scraper")
    print("=" * 60)

    PDF_DIR.mkdir(parents=True, exist_ok=True)
    all_zones = []
    processed = []

    for entry in DOWNLOAD_PAGES:
        page_url = BASE_URL + entry["url"]
        basin = entry["basin"]
        source = entry["source"]

        print("\n{}".format(basin))
        print("  Page: {}".format(page_url))

        pdf_url = find_pdf_url(page_url)
        if not pdf_url:
            print("  No PDF link found, skipping")
            time.sleep(REQUEST_DELAY)
            continue

        # Download
        safe_name = re.sub(r"[^\w\-]", "_", entry["url"].strip("/"))[:80] + ".pdf"
        pdf_path = PDF_DIR / safe_name

        if not pdf_path.exists():
            print("  Downloading PDF...")
            if not download_pdf(pdf_url, pdf_path):
                continue
        else:
            print("  PDF cached")

        # Extract text
        text = extract_pdf_text(pdf_path)
        if not text:
            print("  No extractable text (image-only PDF?)")
            time.sleep(REQUEST_DELAY)
            continue

        print("  Extracted {} characters".format(len(text)))

        # Parse water bodies
        zones = parse_water_bodies(text, basin, source)
        print("  Found {} water bodies".format(len(zones)))
        all_zones.extend(zones)

        processed.append({
            "basin": basin,
            "source": source,
            "page_url": page_url,
            "pdf_url": pdf_url,
            "text_length": len(text),
            "zones_found": len(zones),
        })

        time.sleep(REQUEST_DELAY)

    # Deduplicate by (name, basin)
    seen = set()
    unique_zones = []
    for z in all_zones:
        key = (z["name"].lower(), z["basin"])
        if key in seen:
            continue
        seen.add(key)
        unique_zones.append(z)

    output = {
        "metadata": {
            "source": "Kenya Water Resources Authority (wra.go.ke)",
            "scrape_date": datetime.now().isoformat(),
            "total_zones": len(unique_zones),
            "total_raw": len(all_zones),
            "processed": processed,
        },
        "zones": unique_zones,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    # Summary
    by_type = {}
    by_basin = {}
    for z in unique_zones:
        by_type[z["water_type"]] = by_type.get(z["water_type"], 0) + 1
        by_basin[z["basin"]] = by_basin.get(z["basin"], 0) + 1

    print("\n" + "=" * 60)
    print("DONE — saved to {}".format(OUTPUT_FILE))
    print("  Total unique zones: {}".format(len(unique_zones)))
    for t, c in sorted(by_type.items(), key=lambda x: -x[1]):
        print("    {}: {}".format(t, c))
    print("  By basin:")
    for b, c in sorted(by_basin.items(), key=lambda x: -x[1]):
        print("    {}: {}".format(b, c))
    print("=" * 60)


if __name__ == "__main__":
    main()
