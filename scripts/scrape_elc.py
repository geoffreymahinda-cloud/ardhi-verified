"""
Ardhi Verified — Environment & Land Court Scraper
==================================================
Scrapes ELC judgments from Kenya Law (new.kenyalaw.org) to build
a land dispute intelligence database.

Usage:
    python scripts/scrape_elc.py

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
STATION_URL = f"{BASE_URL}/judgments/KEELC/ELCNRB/"
COURT_STATION = "Nairobi"
MAX_PAGES = 2          # Only scrape first 2 pages for test run
REQUEST_DELAY = 2      # Seconds between requests (be polite)
REQUEST_TIMEOUT = 10   # Seconds before request times out
MAX_RETRIES = 1        # Retry once on failure
OUTPUT_FILE = "scripts/elc_output.json"

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
    Retries once on failure. Returns None if both attempts fail.
    """
    for attempt in range(MAX_RETRIES + 1):
        try:
            print(f"  Fetching: {url} (attempt {attempt + 1})")
            response = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            return BeautifulSoup(response.text, "html.parser")
        except requests.RequestException as e:
            print(f"  ⚠ Request failed: {e}")
            if attempt < MAX_RETRIES:
                print(f"  Retrying in {REQUEST_DELAY}s...")
                time.sleep(REQUEST_DELAY)
            else:
                print(f"  ✗ Giving up on {url}")
                return None
    return None


# ── LISTING PAGE PARSER ─────────────────────────────────────────────────────

def parse_listing_page(soup: BeautifulSoup) -> List[Dict]:
    """
    Parse a listing page and extract case summary data from each row.

    Each row is a <tr> containing:
    - <td class="cell-title"> with an <a> tag (title + URL)
    - <td class="cell-date"> with the judgment date
    """
    cases = []

    # Find all table rows with case data
    rows = soup.select("tr")

    for row in rows:
        # Get the title cell
        title_cell = row.select_one("td.cell-title")
        if not title_cell:
            continue

        # Get the link inside the title cell
        link = title_cell.select_one("a")
        if not link:
            continue

        # Extract the full title text — this contains parties, case number, date, and outcome
        full_title = link.get_text(strip=True)
        href = link.get("href", "")
        source_url = f"{BASE_URL}{href}" if href.startswith("/") else href

        # Parse the title to extract structured fields
        # Format: "Party1 v Party2 (Case Type E123 of 2026) [2026] KEELC 1234 (KLR) (1 April 2026) (Ruling)"

        # Extract case number — pattern: (Case Type E123 of 2026)
        case_match = re.search(r"\(([^)]*?(?:Case|Appeal|Summons|Petition|Application|Complaint|Cause|Suit|Misc)[^)]*?)\)", full_title, re.IGNORECASE)
        case_number = case_match.group(1).strip() if case_match else ""

        # Extract KEELC citation — pattern: [2026] KEELC 1234 (KLR)
        citation_match = re.search(r"\[\d{4}\]\s*KEELC\s*\d+\s*\(KLR\)", full_title)
        citation = citation_match.group(0) if citation_match else ""

        # Extract parties — everything before the first parenthesis
        parties_match = re.match(r"^(.+?)\s*\(", full_title)
        parties = parties_match.group(1).strip() if parties_match else full_title

        # Extract outcome — last parenthetical, e.g. (Ruling), (Judgment), (Order)
        outcome_match = re.search(r"\((\w+)\)\s*$", full_title)
        outcome = outcome_match.group(1) if outcome_match else ""

        # Get date from the date cell
        date_cell = row.select_one("td.cell-date")
        date_decided = date_cell.get_text(strip=True) if date_cell else ""

        cases.append({
            "case_number": case_number,
            "citation": citation,
            "court_station": COURT_STATION,
            "parties": parties,
            "outcome": outcome,
            "judge": "",           # Will be filled from individual case page
            "date_decided": date_decided,
            "source_url": source_url,
            "topic": "",           # Will be filled from individual case page
            "raw_excerpt": "",     # Will be filled from individual case page
            "parcel_reference": [],# Will be filled from individual case page
        })

    return cases


# ── INDIVIDUAL CASE PAGE PARSER ─────────────────────────────────────────────

def enrich_case(case: dict) -> dict:
    """
    Visit the individual case page and extract:
    - Judge name
    - Legal topics
    - First 500 chars of judgment text
    - Any parcel/plot/title references
    """
    soup = fetch_page(case["source_url"])
    if not soup:
        return case

    # Extract judge name — found in <dt>Judges</dt> followed by <dd>
    judge_dt = soup.find("dt", string=re.compile(r"Judges?", re.IGNORECASE))
    if judge_dt:
        judge_dd = judge_dt.find_next_sibling("dd")
        if judge_dd:
            case["judge"] = judge_dd.get_text(strip=True)

    # Extract case action (Ruling/Judgment/Order) if not already found
    action_dt = soup.find("dt", string=re.compile(r"Case action", re.IGNORECASE))
    if action_dt and not case["outcome"]:
        action_dd = action_dt.find_next_sibling("dd")
        if action_dd:
            case["outcome"] = action_dd.get_text(strip=True)

    # Extract topic/subject matter tags
    # Look for any taxonomy links or topic metadata
    topic_links = soup.select("a[href*='/taxonomy/']")
    topics = set()
    for tl in topic_links:
        text = tl.get_text(strip=True)
        # Skip navigation items
        if text and text not in ["Home", "Case Law", "Legislation", "Publications",
                                   "Elections", "Treaties", "EAC Legislation"]:
            topics.add(text)
    case["topic"] = ", ".join(sorted(topics)) if topics else ""

    # Extract judgment text — look for the main content area
    # Kenya Law renders PDFs, but sometimes has text content too
    content_div = soup.select_one("#document-content, .content-and-enrichments, .akn-judgmentBody, .akn-body")
    if content_div:
        # Get all text, clean whitespace
        text = content_div.get_text(separator=" ", strip=True)
        text = re.sub(r"\s+", " ", text)
        case["raw_excerpt"] = text[:500] if text else ""

        # Scan full text for parcel references
        full_text = content_div.get_text(separator=" ")
        parcel_refs = set()
        for pattern in PARCEL_PATTERNS:
            matches = re.findall(pattern, full_text, re.IGNORECASE)
            parcel_refs.update(m.strip() for m in matches)
        case["parcel_reference"] = sorted(parcel_refs)

    # If no content div found, try the full page text for parcel references
    if not case["raw_excerpt"]:
        page_text = soup.get_text(separator=" ")
        case["raw_excerpt"] = ""
        parcel_refs = set()
        for pattern in PARCEL_PATTERNS:
            matches = re.findall(pattern, page_text, re.IGNORECASE)
            parcel_refs.update(m.strip() for m in matches)
        case["parcel_reference"] = sorted(parcel_refs)

    return case


# ── MAIN ────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("ARDHI VERIFIED — ELC Judgment Scraper")
    print(f"Station: {COURT_STATION}")
    print(f"Pages to scrape: {MAX_PAGES}")
    print(f"Delay between requests: {REQUEST_DELAY}s")
    print("=" * 60)

    all_cases = []

    # Step 1: Scrape listing pages
    for page_num in range(1, MAX_PAGES + 1):
        print(f"\n📄 Scraping listing page {page_num}/{MAX_PAGES}...")

        url = f"{STATION_URL}?page={page_num}"
        soup = fetch_page(url)

        if not soup:
            print(f"  ✗ Failed to load page {page_num}, skipping")
            continue

        cases = parse_listing_page(soup)
        print(f"  ✓ Found {len(cases)} cases on page {page_num}")
        all_cases.extend(cases)

        # Polite delay between listing pages
        if page_num < MAX_PAGES:
            time.sleep(REQUEST_DELAY)

    print(f"\n{'=' * 60}")
    print(f"Total cases found: {len(all_cases)}")
    print(f"Now enriching each case with judgment details...")
    print(f"{'=' * 60}")

    # Step 2: Visit each case page to extract detailed information
    for i, case in enumerate(all_cases):
        print(f"\n🔍 [{i + 1}/{len(all_cases)}] {case['parties'][:60]}...")
        case = enrich_case(case)
        all_cases[i] = case

        # Show what we found
        if case["judge"]:
            print(f"  Judge: {case['judge']}")
        if case["parcel_reference"]:
            print(f"  📌 Parcel refs: {', '.join(case['parcel_reference'][:3])}")
        if case["raw_excerpt"]:
            print(f"  📝 Excerpt: {case['raw_excerpt'][:80]}...")

        # Polite delay between case pages
        if i < len(all_cases) - 1:
            time.sleep(REQUEST_DELAY)

    # Step 3: Save results to JSON
    output = {
        "metadata": {
            "source": "Kenya Law — Environment & Land Court",
            "court_station": COURT_STATION,
            "scrape_date": datetime.now().isoformat(),
            "pages_scraped": MAX_PAGES,
            "total_cases": len(all_cases),
            "cases_with_parcel_refs": sum(1 for c in all_cases if c["parcel_reference"]),
        },
        "cases": all_cases,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n{'=' * 60}")
    print(f"✓ Done! Results saved to {OUTPUT_FILE}")
    print(f"  Total cases: {len(all_cases)}")
    print(f"  Cases with judges: {sum(1 for c in all_cases if c['judge'])}")
    print(f"  Cases with parcel refs: {sum(1 for c in all_cases if c['parcel_reference'])}")
    print(f"  Cases with excerpts: {sum(1 for c in all_cases if c['raw_excerpt'])}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
