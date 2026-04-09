"""
Ardhi Verified — Environment & Land Court Scraper
==================================================
Scrapes ELC judgments from Kenya Law (new.kenyalaw.org)
across multiple court stations to build a land dispute
intelligence database.

Usage:
    python3 scripts/scrape_elc.py

Output:
    scripts/elc_output.json

Dependencies:
    pip install requests beautifulsoup4
"""

import json
import re
import time
import sys
from datetime import datetime
from typing import Optional, List, Dict

import requests
from bs4 import BeautifulSoup

# ── CONFIGURATION ───────────────────────────────────────────────────────────

BASE_URL = "https://new.kenyalaw.org"

# All 45 ELC court stations in Kenya
STATIONS = [
    {"name": "Nairobi",   "path": "/judgments/KEELC/ELCNRB/"},
    {"name": "Mombasa",   "path": "/judgments/KEELC/ELCMSA/"},
    {"name": "Nakuru",    "path": "/judgments/KEELC/ELCNKR/"},
    {"name": "Kisumu",    "path": "/judgments/KEELC/ELCKS/"},
    {"name": "Eldoret",   "path": "/judgments/KEELC/ELCELD/"},
    {"name": "Thika",     "path": "/judgments/KEELC/ELCTHK/"},
    {"name": "Machakos",  "path": "/judgments/KEELC/ELCMKS/"},
    {"name": "Nyeri",     "path": "/judgments/KEELC/ELCNYR/"},
    {"name": "Meru",      "path": "/judgments/KEELC/ELCMRU/"},
    {"name": "Embu",      "path": "/judgments/KEELC/ELCE/"},
    {"name": "Chuka",     "path": "/judgments/KEELC/ELCC/"},
    {"name": "Kerugoya",  "path": "/judgments/KEELC/ELCKRU/"},
    {"name": "Muranga",   "path": "/judgments/KEELC/ELCMR/"},
    {"name": "Nyandarua", "path": "/judgments/KEELC/ELCND/"},
    {"name": "Nyahururu", "path": "/judgments/KEELC/ELCNYHR/"},
    {"name": "Narok",     "path": "/judgments/KEELC/ELCNR/"},
    {"name": "Kajiado",   "path": "/judgments/KEELC/ELCKK/"},
    {"name": "Kericho",   "path": "/judgments/KEELC/ELCKRC/"},
    {"name": "Kisii",     "path": "/judgments/KEELC/ELCKSI/"},
    {"name": "Bungoma",   "path": "/judgments/KEELC/ELCBN/"},
    {"name": "Busia",     "path": "/judgments/KEELC/ELCBS/"},
    {"name": "Kitale",    "path": "/judgments/KEELC/ELCKTL/"},
    {"name": "Malindi",   "path": "/judgments/KEELC/ELCML/"},
    {"name": "Kwale",     "path": "/judgments/KEELC/ELCKW/"},
    {"name": "Garissa",   "path": "/judgments/KEELC/ELCG/"},
    {"name": "Makueni",   "path": "/judgments/KEELC/ELCMU/"},
    {"name": "Migori",    "path": "/judgments/KEELC/ELCMG/"},
    {"name": "Homa Bay",  "path": "/judgments/KEELC/KEELC-environment-and-land-court-at-homa-bay/"},
    {"name": "Isiolo",    "path": "/judgments/KEELC/KEELC-environment-and-land-court-at-isiolo/"},
    {"name": "Iten",      "path": "/judgments/KEELC/KEELC-environment-and-land-court-at-iten/"},
    {"name": "Kabarnet",  "path": "/judgments/KEELC/KEELC-environment-and-land-court-at-kabarnet/"},
    {"name": "Kakamega",  "path": "/judgments/KEELC/KEELC-environment-and-land-court-at-kakamega/"},
    {"name": "Kapsabet",  "path": "/judgments/KEELC/KEELC-environment-and-land-court-at-kapsabet/"},
    {"name": "Kilgoris",  "path": "/judgments/KEELC/KEELC-environment-and-land-court-at-kilgoris/"},
    {"name": "Kitui",     "path": "/judgments/KEELC/KEELC-environment-and-land-court-at-kitui/"},
    {"name": "Lodwar",    "path": "/judgments/KEELC/KEELC-environment-and-land-court-at-lodwar/"},
    {"name": "Naivasha",  "path": "/judgments/KEELC/KEELC-environment-and-land-court-at-naivasha/"},
    {"name": "Nanyuki",   "path": "/judgments/KEELC/KEELC-environment-and-land-court-at-nanyuki/"},
    {"name": "Nyamira",   "path": "/judgments/KEELC/KEELC-environment-and-land-court-at-nyamira/"},
    {"name": "Ol Kalou",  "path": "/judgments/KEELC/KEELC-environment-and-land-court-at-ol-kalou/"},
    {"name": "Ruiru",     "path": "/judgments/KEELC/KEELC-environment-and-land-court-at-ruiru/"},
    {"name": "Siaya",     "path": "/judgments/KEELC/KEELC-environment-and-land-court-at-siaya/"},
    {"name": "Vihiga",    "path": "/judgments/KEELC/KEELC-environment-and-land-court-at-vihiga/"},
    {"name": "Voi",       "path": "/judgments/KEELC/KEELC-environment-and-land-court-at-voi/"},
]

REQUEST_DELAY = 2      # Seconds between requests (be polite)
REQUEST_TIMEOUT = 15   # Seconds before request times out
MAX_RETRIES = 5        # Retries with exponential backoff (handles 403 blocks)
OUTPUT_FILE = "scripts/elc_output.json"
JUDGEMENTS_FILE = "scripts/elc_judgements.json"

# Regex patterns for parcel/plot/title references in judgment text
PARCEL_PATTERNS = [
    r"L\.?R\.?\s*(?:No\.?)\s*[\d/]+(?:\s*[-–]\s*[\d/]+)?",    # LR No. 12345/678
    r"L\.?R\.?\s+\d{3,}(?:/[\d]+)*",                          # LR 12345 or LR 12345/678
    r"I\.?R\.?\s*(?:No\.?)\s*\d+",                             # IR No. 12345
    r"I\.?R\.?\s+\d{4,}",                                      # IR 12345
    r"Plot\s+No\.?\s*[\w\d/]+",                                # Plot No. 123
    r"Parcel\s+No\.?\s*[\w\d/]+",                              # Parcel No. 123
    r"Parcel\s+[A-Z][a-z]+/[A-Za-z]+/\d+",                    # Parcel Limuru/Ngecha/114
    r"Grant\s+No\.?\s*[\w\d./]+",                              # Grant No. IR 12345
    r"Title\s+No\.?\s*[\d/]+",                                 # Title No. 12345
]

# User-Agent header to identify ourselves
HEADERS = {
    "User-Agent": "ArdhiVerified-LandIntelBot/1.0 (hello@ardhiverified.com; land dispute research)"
}


# ── HTTP HELPER ─────────────────────────────────────────────────────────────

def fetch_page(url: str) -> Optional[BeautifulSoup]:
    """
    Fetch a URL and return a BeautifulSoup object.
    Uses exponential backoff on failure (2s, 4s, 8s, 16s, 32s).
    Handles 403 blocks by waiting longer and retrying automatically.
    """
    for attempt in range(MAX_RETRIES + 1):
        try:
            response = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
            if response.status_code == 403:
                backoff = min(REQUEST_DELAY * (2 ** attempt), 120)
                print("    403 blocked — backing off {}s (attempt {}/{})".format(
                    backoff, attempt + 1, MAX_RETRIES + 1
                ))
                time.sleep(backoff)
                continue
            response.raise_for_status()
            return BeautifulSoup(response.text, "html.parser")
        except requests.RequestException as e:
            if attempt < MAX_RETRIES:
                backoff = min(REQUEST_DELAY * (2 ** attempt), 60)
                print("    Retry in {}s: {}".format(backoff, e))
                time.sleep(backoff)
            else:
                print("    Failed after {} attempts: {}".format(MAX_RETRIES + 1, e))
                return None
    return None


# ── DETECT TOTAL PAGES ──────────────────────────────────────────────────────

def detect_total_pages(soup: BeautifulSoup) -> int:
    """Detect the total number of pages from the pagination links."""
    pages = soup.select("ul.pagination a.page-link")
    nums = []
    for a in pages:
        text = a.get_text(strip=True)
        if text.isdigit():
            nums.append(int(text))
    return max(nums) if nums else 1


# ── LISTING PAGE PARSER ─────────────────────────────────────────────────────

def parse_listing_page(soup: BeautifulSoup, station_name: str) -> List[Dict]:
    """
    Parse a listing page and extract case summary data from each row.
    """
    cases = []
    rows = soup.select("tr")

    for row in rows:
        title_cell = row.select_one("td.cell-title")
        if not title_cell:
            continue

        link = title_cell.select_one("a")
        if not link:
            continue

        full_title = link.get_text(strip=True)
        href = link.get("href", "")
        source_url = "{}{}".format(BASE_URL, href) if href.startswith("/") else href

        # Extract case number
        case_match = re.search(
            r"\(([^)]*?(?:Case|Appeal|Summons|Petition|Application|Complaint|Cause|Suit|Misc)[^)]*?)\)",
            full_title, re.IGNORECASE
        )
        case_number = case_match.group(1).strip() if case_match else ""

        # Extract citation
        citation_match = re.search(r"\[\d{4}\]\s*KEELC\s*\d+\s*\(KLR\)", full_title)
        citation = citation_match.group(0) if citation_match else ""

        # Extract parties
        parties_match = re.match(r"^(.+?)\s*\(", full_title)
        parties = parties_match.group(1).strip() if parties_match else full_title

        # Extract outcome
        outcome_match = re.search(r"\((\w+)\)\s*$", full_title)
        outcome = outcome_match.group(1) if outcome_match else ""

        # Date
        date_cell = row.select_one("td.cell-date")
        date_decided = date_cell.get_text(strip=True) if date_cell else ""

        cases.append({
            "case_number": case_number,
            "citation": citation,
            "court_station": station_name,
            "parties": parties,
            "outcome": outcome,
            "judge": "",
            "date_decided": date_decided,
            "source_url": source_url,
            "topic": "",
            "raw_excerpt": "",
            "parcel_reference": [],
        })

    return cases


# ── INDIVIDUAL CASE PAGE PARSER ─────────────────────────────────────────────

def enrich_case(case: Dict) -> Dict:
    """
    Visit the individual case page and extract judge, topics,
    full judgment text, and parcel references.
    """
    soup = fetch_page(case["source_url"])
    if not soup:
        return case

    # Judge
    judge_dt = soup.find("dt", string=re.compile(r"Judges?", re.IGNORECASE))
    if judge_dt:
        judge_dd = judge_dt.find_next_sibling("dd")
        if judge_dd:
            case["judge"] = judge_dd.get_text(strip=True)

    # Case action
    action_dt = soup.find("dt", string=re.compile(r"Case action", re.IGNORECASE))
    if action_dt and not case["outcome"]:
        action_dd = action_dt.find_next_sibling("dd")
        if action_dd:
            case["outcome"] = action_dd.get_text(strip=True)

    # Case title (from page heading)
    title_el = soup.select_one("h1, .document-title, .akn-docTitle")
    if title_el:
        case["case_title"] = title_el.get_text(strip=True)

    # Content — extract full text AND parcel references
    content_div = soup.select_one("#document-content, .content-and-enrichments, .akn-judgmentBody, .akn-body")
    if content_div:
        full_text = content_div.get_text(separator=" ", strip=True)
        full_text = re.sub(r"\s+", " ", full_text)

        # Short excerpt for elc_cases table
        case["raw_excerpt"] = full_text[:500] if full_text else ""

        # Full text for elc_judgements table
        case["full_text"] = full_text

        # Parcel references
        parcel_refs = set()
        for pattern in PARCEL_PATTERNS:
            matches = re.findall(pattern, full_text, re.IGNORECASE)
            parcel_refs.update(m.strip() for m in matches)
        case["parcel_reference"] = sorted(parcel_refs)

    return case


# ── MAIN ────────────────────────────────────────────────────────────────────

def _save_output(all_cases: List[Dict]):
    """Save current state to JSON — called incrementally during enrichment."""
    station_stats = {}
    for case in all_cases:
        st = case["court_station"]
        if st not in station_stats:
            station_stats[st] = {"total": 0, "with_parcels": 0, "with_judges": 0}
        station_stats[st]["total"] += 1
        if case["parcel_reference"]:
            station_stats[st]["with_parcels"] += 1
        if case["judge"]:
            station_stats[st]["with_judges"] += 1

    output = {
        "metadata": {
            "source": "Kenya Law — Environment & Land Court",
            "stations": list(station_stats.keys()),
            "scrape_date": datetime.now().isoformat(),
            "total_cases": len(all_cases),
            "cases_with_parcel_refs": sum(1 for c in all_cases if c["parcel_reference"]),
            "station_breakdown": station_stats,
        },
        "cases": all_cases,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)


def _save_judgements(all_cases: List[Dict]):
    """Save full judgment texts to a separate JSON file for the elc_judgements table."""
    judgements = []
    for case in all_cases:
        if not case.get("full_text"):
            continue
        judgements.append({
            "case_number": case.get("case_number", ""),
            "case_title": case.get("case_title", case.get("parties", "")),
            "parties": case.get("parties", ""),
            "judgement_date": case.get("date_decided", ""),
            "full_text": case["full_text"],
            "parcel_references": case.get("parcel_reference", []),
            "outcome": case.get("outcome", ""),
            "source_url": case["source_url"],
            "court_station": case.get("court_station", ""),
            "judge": case.get("judge", ""),
        })

    with open(JUDGEMENTS_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "metadata": {
                "source": "Kenya Law — ELC Full Judgements",
                "scrape_date": datetime.now().isoformat(),
                "total_judgements": len(judgements),
                "with_parcel_refs": sum(1 for j in judgements if j["parcel_references"]),
            },
            "judgements": judgements,
        }, f, indent=2, ensure_ascii=False)

    return len(judgements)


def main():
    print("=" * 60)
    print("ARDHI VERIFIED — ELC Judgment Scraper (Multi-Station)")
    print("Stations: {}".format(", ".join(s["name"] for s in STATIONS)))
    print("Delay: {}s between requests".format(REQUEST_DELAY))
    print("=" * 60)

    all_cases = []

    # Step 1: Scrape listing pages for each station
    for station in STATIONS:
        station_name = station["name"]
        station_url = "{}{}".format(BASE_URL, station["path"])

        print("\n" + "─" * 60)
        print("📍 Station: {}".format(station_name))
        print("─" * 60)

        # First, detect how many pages exist
        print("  Detecting pages...")
        first_page = fetch_page("{}?page=1".format(station_url))
        if not first_page:
            print("  ✗ Could not load station, skipping")
            continue

        total_pages = detect_total_pages(first_page)
        print("  Found {} pages".format(total_pages))

        # Parse the first page we already loaded
        cases = parse_listing_page(first_page, station_name)
        all_cases.extend(cases)
        print("  {} — Page 1/{} — {} cases collected so far".format(station_name, total_pages, len(all_cases)))

        # Scrape remaining pages
        for page_num in range(2, total_pages + 1):
            time.sleep(REQUEST_DELAY)
            url = "{}?page={}".format(station_url, page_num)
            soup = fetch_page(url)
            if not soup:
                print("  {} — Page {}/{} — FAILED, skipping".format(station_name, page_num, total_pages))
                continue
            cases = parse_listing_page(soup, station_name)
            all_cases.extend(cases)
            print("  {} — Page {}/{} — {} cases collected so far".format(station_name, page_num, total_pages, len(all_cases)))

        time.sleep(REQUEST_DELAY)

    # Save listing results immediately (before enrichment)
    print("\n💾 Saving {} listing results before enrichment...".format(len(all_cases)))
    _save_output(all_cases)

    print("\n" + "=" * 60)
    print("Total cases found across all stations: {}".format(len(all_cases)))
    print("Now enriching each case with judgment details...")
    print("This will take approximately {} minutes".format(len(all_cases) * REQUEST_DELAY // 60 + 1))
    print("=" * 60)

    # Step 2: Enrich each case — with incremental saves
    for i, case in enumerate(all_cases):
        station_tag = "[{}]".format(case["court_station"][:3].upper())
        if (i + 1) % 25 == 0 or i == 0:
            print("\n🔍 [{}/{}] {} {}...".format(
                i + 1, len(all_cases), station_tag, case["parties"][:50]
            ))

        case = enrich_case(case)
        all_cases[i] = case

        if i < len(all_cases) - 1:
            time.sleep(REQUEST_DELAY)

        # Progress update and incremental save every 100 cases
        if (i + 1) % 100 == 0:
            parcel_count = sum(1 for c in all_cases[:i+1] if c["parcel_reference"])
            judgement_count = sum(1 for c in all_cases[:i+1] if c.get("full_text"))
            print("  ── Progress: {}/{} enriched, {} parcels, {} judgements — saving... ──".format(
                i + 1, len(all_cases), parcel_count, judgement_count
            ))
            _save_output(all_cases)
            _save_judgements(all_cases)

    # Step 3: Final save
    _save_output(all_cases)
    jcount = _save_judgements(all_cases)

    # Read back for summary
    station_stats = {}
    for case in all_cases:
        st = case["court_station"]
        if st not in station_stats:
            station_stats[st] = {"total": 0, "with_parcels": 0, "with_judges": 0}
        station_stats[st]["total"] += 1
        if case["parcel_reference"]:
            station_stats[st]["with_parcels"] += 1
        if case["judge"]:
            station_stats[st]["with_judges"] += 1

    print("\n" + "=" * 60)
    print("✓ Done! Results saved to {}".format(OUTPUT_FILE))
    print("  Total cases: {}".format(len(all_cases)))
    print("")
    for st_name, stats in station_stats.items():
        print("  {} — {} cases, {} with parcels, {} with judges".format(
            st_name, stats["total"], stats["with_parcels"], stats["with_judges"]
        ))
    print("")
    print("  Overall parcel refs: {}".format(
        sum(1 for c in all_cases if c["parcel_reference"])
    ))
    print("  Full judgements saved: {} → {}".format(jcount, JUDGEMENTS_FILE))
    print("=" * 60)


if __name__ == "__main__":
    main()
