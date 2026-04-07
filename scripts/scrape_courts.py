"""
Ardhi Verified — Multi-Court Kenya Law Scraper
================================================
Scrapes judgments from High Court, Court of Appeal,
Supreme Court, and National Environment Tribunal
from Kenya Law (new.kenyalaw.org).

Builds on the ELC scraper — same output format, same
Supabase loader works for all courts.

Usage:
    python3 scripts/scrape_courts.py

Output:
    scripts/courts_output.json

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
REQUEST_DELAY = 2
REQUEST_TIMEOUT = 10
MAX_RETRIES = 1
OUTPUT_FILE = "scripts/courts_output.json"

# All High Court, Court of Appeal, and Supreme Court stations
STATIONS = [
    # ── HIGH COURT (60+ stations) ──
    {"name": "HC Nairobi (Milimani)",  "path": "/judgments/KEHC/HCNRB/",  "court": "High Court"},
    {"name": "HC Nairobi (Commercial)","path": "/judgments/KEHC/HCNRBMCC/","court": "High Court"},
    {"name": "HC Mombasa",   "path": "/judgments/KEHC/HCMSA/",   "court": "High Court"},
    {"name": "HC Nakuru",    "path": "/judgments/KEHC/HCNKR/",   "court": "High Court"},
    {"name": "HC Kisumu",    "path": "/judgments/KEHC/HCKSM/",   "court": "High Court"},
    {"name": "HC Eldoret",   "path": "/judgments/KEHC/HCELD/",   "court": "High Court"},
    {"name": "HC Thika",     "path": "/judgments/KEHC/HCTHK/",   "court": "High Court"},
    {"name": "HC Machakos",  "path": "/judgments/KEHC/HCMKS/",   "court": "High Court"},
    {"name": "HC Nyeri",     "path": "/judgments/KEHC/HCNYR/",   "court": "High Court"},
    {"name": "HC Meru",      "path": "/judgments/KEHC/HCMRU/",   "court": "High Court"},
    {"name": "HC Embu",      "path": "/judgments/KEHC/HCEMB/",   "court": "High Court"},
    {"name": "HC Chuka",     "path": "/judgments/KEHC/HCCK/",    "court": "High Court"},
    {"name": "HC Kerugoya",  "path": "/judgments/KEHC/HCKRU/",   "court": "High Court"},
    {"name": "HC Muranga",   "path": "/judgments/KEHC/HCMR/",    "court": "High Court"},
    {"name": "HC Kiambu",    "path": "/judgments/KEHC/HCKB/",    "court": "High Court"},
    {"name": "HC Narok",     "path": "/judgments/KEHC/HCNRK/",   "court": "High Court"},
    {"name": "HC Kajiado",   "path": "/judgments/KEHC/HCKJ/",    "court": "High Court"},
    {"name": "HC Kericho",   "path": "/judgments/KEHC/HCKRC/",   "court": "High Court"},
    {"name": "HC Kisii",     "path": "/judgments/KEHC/HCKSI/",   "court": "High Court"},
    {"name": "HC Bungoma",   "path": "/judgments/KEHC/HCBG/",    "court": "High Court"},
    {"name": "HC Busia",     "path": "/judgments/KEHC/HCBS/",    "court": "High Court"},
    {"name": "HC Kitale",    "path": "/judgments/KEHC/HCKTL/",   "court": "High Court"},
    {"name": "HC Malindi",   "path": "/judgments/KEHC/HCMLD/",   "court": "High Court"},
    {"name": "HC Kwale",     "path": "/judgments/KEHC/HCKWL/",   "court": "High Court"},
    {"name": "HC Garissa",   "path": "/judgments/KEHC/HCGR/",    "court": "High Court"},
    {"name": "HC Makueni",   "path": "/judgments/KEHC/HCMKN/",   "court": "High Court"},
    {"name": "HC Migori",    "path": "/judgments/KEHC/HCM/",     "court": "High Court"},
    {"name": "HC Homa Bay",  "path": "/judgments/KEHC/HCH/",     "court": "High Court"},
    {"name": "HC Kitui",     "path": "/judgments/KEHC/HCKT/",    "court": "High Court"},
    {"name": "HC Kakamega",  "path": "/judgments/KEHC/HCKKG/",   "court": "High Court"},
    {"name": "HC Bomet",     "path": "/judgments/KEHC/HCBT/",    "court": "High Court"},
    {"name": "HC Naivasha",  "path": "/judgments/KEHC/HCNVS/",   "court": "High Court"},
    {"name": "HC Nanyuki",   "path": "/judgments/KEHC/HCNYK/",   "court": "High Court"},
    {"name": "HC Nyahururu", "path": "/judgments/KEHC/HCNYRR/",  "court": "High Court"},
    {"name": "HC Kapenguria", "path": "/judgments/KEHC/HCKAP/",  "court": "High Court"},
    {"name": "HC Kabarnet",  "path": "/judgments/KEHC/HCKBR/",   "court": "High Court"},
    {"name": "HC Lodwar",    "path": "/judgments/KEHC/HCLD/",    "court": "High Court"},
    {"name": "HC Siaya",     "path": "/judgments/KEHC/HCS/",     "court": "High Court"},
    {"name": "HC Voi",       "path": "/judgments/KEHC/HCV/",     "court": "High Court"},
    {"name": "HC Nyamira",   "path": "/judgments/KEHC/HCNYAM/",  "court": "High Court"},
    {"name": "HC Kibera",    "path": "/judgments/KEHC/HCKIB/",   "court": "High Court"},
    {"name": "HC Eldama Ravine", "path": "/judgments/KEHC/HCER/", "court": "High Court"},
    {"name": "HC Garsen",    "path": "/judgments/KEHC/HCGRSN/",  "court": "High Court"},
    {"name": "HC Mandera",   "path": "/judgments/KEHC/HCMDR/",   "court": "High Court"},
    {"name": "HC Marsabit",  "path": "/judgments/KEHC/HCMRS/",   "court": "High Court"},
    {"name": "HC Nyandarua", "path": "/judgments/KEHC/KEHC-high-court-nyandarua/", "court": "High Court"},
    {"name": "HC Isiolo",    "path": "/judgments/KEHC/KEHC-high-court-at-isiolo/", "court": "High Court"},
    {"name": "HC Iten",      "path": "/judgments/KEHC/KEHC-high-court-at-iten/", "court": "High Court"},
    {"name": "HC Kapsabet",  "path": "/judgments/KEHC/KEHC-high-court-at-kapsabet/", "court": "High Court"},
    {"name": "HC Kilgoris",  "path": "/judgments/KEHC/KEHC-high-court-at-kilgoris/", "court": "High Court"},
    {"name": "HC Makadara",  "path": "/judgments/KEHC/KEHC-high-court-at-makadara/", "court": "High Court"},
    {"name": "HC Maralal",   "path": "/judgments/KEHC/KEHC-high-court-at-maralal/", "court": "High Court"},
    {"name": "HC Moyale",    "path": "/judgments/KEHC/KEHC-high-court-at-moyale/", "court": "High Court"},
    {"name": "HC Ol Kalou",  "path": "/judgments/KEHC/KEHC-high-court-at-ol-kalou/", "court": "High Court"},
    {"name": "HC Vihiga",    "path": "/judgments/KEHC/KEHC-high-court-at-vihiga/", "court": "High Court"},
    {"name": "HC Nkubu",     "path": "/judgments/KEHC/KEHC-high-court-of-kenya-at-nkubu/", "court": "High Court"},
    # ── COURT OF APPEAL (12 stations) ──
    {"name": "CoA Nairobi",  "path": "/judgments/KECA/CANRB/",   "court": "Court of Appeal"},
    {"name": "CoA Mombasa",  "path": "/judgments/KECA/CAMS/",    "court": "Court of Appeal"},
    {"name": "CoA Nakuru",   "path": "/judgments/KECA/CANKR/",   "court": "Court of Appeal"},
    {"name": "CoA Kisumu",   "path": "/judgments/KECA/COAKSM/",  "court": "Court of Appeal"},
    {"name": "CoA Eldoret",  "path": "/judgments/KECA/COAELD/",  "court": "Court of Appeal"},
    {"name": "CoA Kisii",    "path": "/judgments/KECA/COAKS/",   "court": "Court of Appeal"},
    {"name": "CoA Nyeri",    "path": "/judgments/KECA/CANYR/",   "court": "Court of Appeal"},
    {"name": "CoA Malindi",  "path": "/judgments/KECA/COAML/",   "court": "Court of Appeal"},
    {"name": "CoA Busia",    "path": "/judgments/KECA/COABS/",   "court": "Court of Appeal"},
    {"name": "CoA Kakamega", "path": "/judgments/KECA/KECA-court-of-appeal-at-kakamega/", "court": "Court of Appeal"},
    {"name": "CoA Meru",     "path": "/judgments/KECA/KECA-court-of-appeal-at-meru/", "court": "Court of Appeal"},
    # ── SUPREME COURT (1 station) ──
    {"name": "Supreme Court","path": "/judgments/KESC/SCK/",     "court": "Supreme Court"},
    # ── NATIONAL ENVIRONMENT TRIBUNAL (~200 cases, single index) ──
    {"name": "Environment Tribunal", "path": "/judgments/KENET/", "court": "Environment Tribunal"},
]

PARCEL_PATTERNS = [
    r"L\.?R\.?\s*(?:No\.?)\s*[\d/]+(?:\s*[-–]\s*[\d/]+)?",
    r"L\.?R\.?\s+\d{3,}(?:/[\d]+)*",
    r"I\.?R\.?\s*(?:No\.?)\s*\d+",
    r"I\.?R\.?\s+\d{4,}",
    r"Plot\s+No\.?\s*[\w\d/]+",
    r"Parcel\s+No\.?\s*[\w\d/]+",
    r"Parcel\s+[A-Z][a-z]+/[A-Za-z]+/\d+",
    r"Grant\s+No\.?\s*[\w\d./]+",
    r"Title\s+No\.?\s*[\d/]+",
]

HEADERS = {
    "User-Agent": "ArdhiVerified-LandIntelBot/1.0 (hello@ardhiverified.com; land dispute research)"
}


def fetch_page(url):
    for attempt in range(MAX_RETRIES + 1):
        try:
            response = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            return BeautifulSoup(response.text, "html.parser")
        except requests.RequestException as e:
            if attempt < MAX_RETRIES:
                time.sleep(REQUEST_DELAY)
            else:
                return None
    return None


def detect_total_pages(soup):
    pages = soup.select("ul.pagination a.page-link")
    nums = [int(a.get_text(strip=True)) for a in pages if a.get_text(strip=True).isdigit()]
    return max(nums) if nums else 1


def parse_listing_page(soup, station_name, court_type):
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

        case_match = re.search(r"\(([^)]*?(?:Case|Appeal|Summons|Petition|Application|Complaint|Cause|Suit|Misc|Revision|Review|Reference)[^)]*?)\)", full_title, re.IGNORECASE)
        case_number = case_match.group(1).strip() if case_match else ""

        parties_match = re.match(r"^(.+?)\s*\(", full_title)
        parties = parties_match.group(1).strip() if parties_match else full_title

        outcome_match = re.search(r"\((\w+)\)\s*$", full_title)
        outcome = outcome_match.group(1) if outcome_match else ""

        date_cell = row.select_one("td.cell-date")
        date_decided = date_cell.get_text(strip=True) if date_cell else ""

        cases.append({
            "case_number": case_number,
            "court_type": court_type,
            "court_station": station_name,
            "parties": parties,
            "outcome": outcome,
            "judge": "",
            "date_decided": date_decided,
            "source_url": source_url,
            "raw_excerpt": "",
            "parcel_reference": [],
        })
    return cases


def enrich_case(case):
    soup = fetch_page(case["source_url"])
    if not soup:
        return case

    judge_dt = soup.find("dt", string=re.compile(r"Judges?", re.IGNORECASE))
    if judge_dt:
        judge_dd = judge_dt.find_next_sibling("dd")
        if judge_dd:
            case["judge"] = judge_dd.get_text(strip=True)

    action_dt = soup.find("dt", string=re.compile(r"Case action", re.IGNORECASE))
    if action_dt and not case["outcome"]:
        action_dd = action_dt.find_next_sibling("dd")
        if action_dd:
            case["outcome"] = action_dd.get_text(strip=True)

    content_div = soup.select_one("#document-content, .content-and-enrichments, .akn-judgmentBody, .akn-body")
    if content_div:
        text = content_div.get_text(separator=" ", strip=True)
        text = re.sub(r"\s+", " ", text)
        case["raw_excerpt"] = text[:500] if text else ""
        full_text = content_div.get_text(separator=" ")
        parcel_refs = set()
        for pattern in PARCEL_PATTERNS:
            matches = re.findall(pattern, full_text, re.IGNORECASE)
            parcel_refs.update(m.strip() for m in matches)
        case["parcel_reference"] = sorted(parcel_refs)

    return case


def _save_output(all_cases):
    station_stats = {}
    for case in all_cases:
        key = "{} ({})".format(case["court_station"], case["court_type"])
        if key not in station_stats:
            station_stats[key] = {"total": 0, "with_parcels": 0, "with_judges": 0}
        station_stats[key]["total"] += 1
        if case["parcel_reference"]:
            station_stats[key]["with_parcels"] += 1
        if case["judge"]:
            station_stats[key]["with_judges"] += 1

    output = {
        "metadata": {
            "source": "Kenya Law — High Court, Court of Appeal, Supreme Court, Environment Tribunal",
            "scrape_date": datetime.now().isoformat(),
            "total_cases": len(all_cases),
            "cases_with_parcel_refs": sum(1 for c in all_cases if c["parcel_reference"]),
            "court_breakdown": {
                "High Court": sum(1 for c in all_cases if c["court_type"] == "High Court"),
                "Court of Appeal": sum(1 for c in all_cases if c["court_type"] == "Court of Appeal"),
                "Supreme Court": sum(1 for c in all_cases if c["court_type"] == "Supreme Court"),
                "Environment Tribunal": sum(1 for c in all_cases if c["court_type"] == "Environment Tribunal"),
            },
        },
        "cases": all_cases,
    }
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)


def main():
    print("=" * 60)
    print("ARDHI VERIFIED — Multi-Court Scraper")
    print("Courts: HC ({}), CoA ({}), SC ({}), NET ({})".format(
        sum(1 for s in STATIONS if s["court"] == "High Court"),
        sum(1 for s in STATIONS if s["court"] == "Court of Appeal"),
        sum(1 for s in STATIONS if s["court"] == "Supreme Court"),
        sum(1 for s in STATIONS if s["court"] == "Environment Tribunal"),
    ))
    print("=" * 60)

    all_cases = []

    for si, station in enumerate(STATIONS):
        station_name = station["name"]
        station_url = "{}{}".format(BASE_URL, station["path"])
        court_type = station["court"]

        print("\n[{}/{}] 📍 {}".format(si + 1, len(STATIONS), station_name))

        first_page = fetch_page("{}?page=1".format(station_url))
        if not first_page:
            print("  ✗ Could not load, skipping")
            continue

        total_pages = detect_total_pages(first_page)

        cases = parse_listing_page(first_page, station_name, court_type)
        all_cases.extend(cases)
        print("  {} — Page 1/{} — {} total cases so far".format(station_name, total_pages, len(all_cases)))

        for page_num in range(2, total_pages + 1):
            time.sleep(REQUEST_DELAY)
            soup = fetch_page("{}?page={}".format(station_url, page_num))
            if not soup:
                continue
            cases = parse_listing_page(soup, station_name, court_type)
            all_cases.extend(cases)
            print("  {} — Page {}/{} — {} total cases so far".format(station_name, page_num, total_pages, len(all_cases)))

        time.sleep(REQUEST_DELAY)

    # Save listings before enrichment
    print("\n💾 Saving {} listing results...".format(len(all_cases)))
    _save_output(all_cases)

    print("\n" + "=" * 60)
    print("Total cases: {}".format(len(all_cases)))
    print("Starting enrichment (saves every 100 cases)...")
    print("=" * 60)

    for i, case in enumerate(all_cases):
        if (i + 1) % 25 == 0 or i == 0:
            print("\n🔍 [{}/{}] {}...".format(i + 1, len(all_cases), case["parties"][:50]))

        case = enrich_case(case)
        all_cases[i] = case

        if i < len(all_cases) - 1:
            time.sleep(REQUEST_DELAY)

        if (i + 1) % 100 == 0:
            parcel_count = sum(1 for c in all_cases[:i+1] if c["parcel_reference"])
            print("  ── {}/{} enriched, {} parcels — saving... ──".format(i + 1, len(all_cases), parcel_count))
            _save_output(all_cases)

    _save_output(all_cases)

    hc = sum(1 for c in all_cases if c["court_type"] == "High Court")
    coa = sum(1 for c in all_cases if c["court_type"] == "Court of Appeal")
    sc = sum(1 for c in all_cases if c["court_type"] == "Supreme Court")
    net = sum(1 for c in all_cases if c["court_type"] == "Environment Tribunal")
    parcels = sum(1 for c in all_cases if c["parcel_reference"])

    print("\n" + "=" * 60)
    print("Done! Saved to {}".format(OUTPUT_FILE))
    print("  High Court: {}".format(hc))
    print("  Court of Appeal: {}".format(coa))
    print("  Supreme Court: {}".format(sc))
    print("  Environment Tribunal: {}".format(net))
    print("  Total: {}".format(len(all_cases)))
    print("  With parcel refs: {}".format(parcels))
    print("=" * 60)


if __name__ == "__main__":
    main()
