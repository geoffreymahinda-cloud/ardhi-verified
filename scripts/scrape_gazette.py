"""
Ardhi Verified — Kenya Gazette Land Notice Extractor
=====================================================
Scrapes Kenya Gazette PDFs from new.kenyalaw.org,
extracts text with pdfplumber, and uses Claude AI
to identify land-related notices (compulsory acquisitions,
cautions, inhibitions, title revocations, etc.)

Usage:
    python3 scripts/scrape_gazette.py

Output:
    scripts/gazette_output.json      — all extracted land notices
    scripts/gazette_processed.json   — tracking file for processed editions

Dependencies:
    pip install requests beautifulsoup4 pdfplumber anthropic python-dotenv
"""

import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict

from dotenv import load_dotenv

# Load .env.local from the project root
_project_root = Path(__file__).parent.parent
load_dotenv(_project_root / ".env.local")

import requests
from bs4 import BeautifulSoup

# ── CONFIGURATION ───────────────────────────────────────────────────────────

BASE_URL = "https://new.kenyalaw.org"
GAZETTE_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015]
MAX_EDITIONS = 50

REQUEST_DELAY = 2       # Seconds between page requests
PDF_DELAY = 5            # Seconds between PDF downloads
REQUEST_TIMEOUT = 30     # Seconds before request times out

SCRIPT_DIR = Path(__file__).parent
PDF_DIR = SCRIPT_DIR / "gazette_pdfs"
OUTPUT_FILE = SCRIPT_DIR / "gazette_output.json"
PROCESSED_FILE = SCRIPT_DIR / "gazette_processed.json"

HEADERS = {
    "User-Agent": "ArdhiVerified-GazetteBot/1.0 (hello@ardhiverified.com; land notice research)"
}

AI_MODEL = "claude-haiku-4-5-20251001"

SYSTEM_PROMPT = """You are a Kenya land notice extractor. Extract ALL land-related notices from this Kenya Gazette text.

Look specifically for:
- Compulsory acquisition notices (Form LA 33)
- Land restrictions (Section 76 Land Registration Act)
- Cautions registered on land
- Inhibitions on land dealings
- Land register reconstruction notices
- Revocation of titles
- Change of use or zoning notices
- Any notice mentioning LR numbers, Title numbers, parcel numbers or land plot references

For each notice found, return a JSON array where each item has:
{
  "notice_type": "string",
  "parcel_reference": "string or null",
  "county": "string or null",
  "gazette_notice_number": "string or null",
  "affected_party": "string or null",
  "acquiring_body": "string or null",
  "inquiry_date": "string or null",
  "alert_level": "critical or high or medium or info",
  "raw_text": "the full notice text",
  "summary": "one sentence plain English summary"
}

Return ONLY a valid JSON array. No preamble or explanation."""

# Maximum text length to send to Claude (avoid huge payloads)
MAX_TEXT_LENGTH = 80000


# ── LOAD / SAVE HELPERS ────────────────────────────────────────────────────

def load_processed() -> Dict:
    """Load the set of already-processed gazette edition URLs."""
    if PROCESSED_FILE.exists():
        with open(PROCESSED_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"processed": []}


def save_processed(data: Dict):
    with open(PROCESSED_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def load_output() -> List[Dict]:
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_output(notices: List[Dict]):
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(notices, f, indent=2, ensure_ascii=False)


# ── HTTP HELPERS ───────────────────────────────────────────────────────────

def fetch_page(url: str) -> Optional[BeautifulSoup]:
    """Fetch a URL and return a BeautifulSoup object."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        return BeautifulSoup(response.text, "html.parser")
    except requests.RequestException as e:
        print(f"    Failed to fetch {url}: {e}")
        return None


def download_pdf(url: str, dest: Path) -> bool:
    """Download a PDF file to the given path."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=60, stream=True)
        response.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except requests.RequestException as e:
        print(f"    Failed to download PDF: {e}")
        return False


# ── STEP 1: DISCOVER GAZETTE EDITIONS ──────────────────────────────────────

def discover_editions() -> List[Dict]:
    """
    Fetch the gazette year pages and extract individual edition URLs.
    Editions are listed in a table.doc-table with links like:
      /akn/ke/officialGazette/2025-12-24/266/eng@2025-12-24
    Returns list of {url, title, year} dicts, most recent first.
    """
    editions = []

    for year in GAZETTE_YEARS:
        year_url = "{}/gazettes/{}".format(BASE_URL, year)
        print("\nFetching gazette index for {}...".format(year))

        soup = fetch_page(year_url)
        if not soup:
            print("  Could not load year page for {}".format(year))
            continue

        # Editions are in a table.doc-table
        table = soup.select_one("table.doc-table")
        if not table:
            print("  No edition table found for {}".format(year))
            continue

        for row in table.select("tr"):
            link = row.select_one("a[href]")
            if not link:
                continue
            href = link.get("href", "")
            # Match /akn/ke/officialGazette/... paths
            if "/akn/ke/officialGazette/" not in href:
                continue
            full_url = "{}{}".format(BASE_URL, href) if href.startswith("/") else href
            title = link.get_text(strip=True)
            if full_url not in [e["url"] for e in editions]:
                editions.append({
                    "url": full_url,
                    "title": title or "Gazette {}".format(href.split("/")[-2]),
                    "year": year,
                })

        print("  Found {} editions for {}".format(len([e for e in editions if e["year"] == year]), year))
        time.sleep(REQUEST_DELAY)

    # Most recent first (2026 before 2025, and within year by order found)
    return editions


# ── STEP 2: FIND PDF LINK ON EDITION PAGE ──────────────────────────────────

def find_pdf_url(edition_url: str) -> str:
    """
    The PDF download link on Kenya Law is the edition URL + /source.
    e.g. /akn/ke/officialGazette/2025-12-24/266/eng@2025-12-24/source
    """
    # Ensure no trailing slash before appending /source
    base = edition_url.rstrip("/")
    return "{}/source".format(base)


# ── STEP 3: EXTRACT TEXT FROM PDF ──────────────────────────────────────────

def extract_pdf_text(pdf_path: Path) -> Optional[str]:
    """Extract text from a PDF using pdfplumber. Returns None if image-only."""
    try:
        import pdfplumber
    except ImportError:
        print("ERROR: pdfplumber not installed. Run: pip install pdfplumber")
        sys.exit(1)

    try:
        text_parts = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)

        full_text = "\n\n".join(text_parts)

        # If very little text extracted, it's likely a scanned image
        if len(full_text.strip()) < 100:
            return None

        return full_text

    except Exception as e:
        print(f"    PDF extraction error: {e}")
        return None


# ── STEP 3b: REGEX-BASED EXTRACTION OF LAND NOTICES ─────────────────────────

# Keywords that indicate a land-related notice
LAND_KEYWORDS = re.compile(
    r"compulsory\s+acquisition|caveat|caution|registrar\s+of\s+lands|"
    r"ministry\s+of\s+lands|notice\s+of\s+intention|land\s+registration|"
    r"inhibition|revocation\s+of\s+title|land\s+restriction|Form\s+LA\s+33|"
    r"Section\s+76.*Land\s+Registration|reconstruction\s+of\s+.*register",
    re.IGNORECASE,
)

# Patterns to extract parcel references
PARCEL_PATTERNS = re.compile(
    r"(?:L\.?R\.?\s*(?:No\.?)?\s*[\w/\-]+)|"
    r"(?:Title\s*(?:No\.?)?\s*[\w/\-]+)|"
    r"(?:Plot\s*(?:No\.?)?\s*[\w/\-]+)|"
    r"(?:Parcel\s*(?:No\.?)?\s*[\w/\-]+)",
    re.IGNORECASE,
)

# Kenya counties for extraction
KENYA_COUNTIES = [
    "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu",
    "Garissa", "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho",
    "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui",
    "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
    "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi",
    "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri",
    "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi",
    "Trans-Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir",
    "West Pokot",
]

COUNTY_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(c) for c in KENYA_COUNTIES) + r")\b",
    re.IGNORECASE,
)


def classify_notice_type(text: str) -> str:
    """Classify a notice block into a type based on keywords."""
    t = text.lower()
    if "compulsory acquisition" in t or "form la 33" in t:
        return "compulsory_acquisition"
    if "caveat" in t:
        return "caveat"
    if "caution" in t:
        return "caution"
    if "inhibition" in t:
        return "inhibition"
    if "revocation" in t:
        return "revocation"
    if "restriction" in t or "section 76" in t:
        return "restriction"
    if "reconstruction" in t:
        return "register_reconstruction"
    return "general_land"


def determine_alert_level(notice_type: str) -> str:
    """Assign alert level based on notice type."""
    critical = {"compulsory_acquisition", "revocation"}
    high = {"caveat", "inhibition", "restriction"}
    medium = {"caution", "register_reconstruction"}
    if notice_type in critical:
        return "critical"
    if notice_type in high:
        return "high"
    if notice_type in medium:
        return "medium"
    return "info"


def extract_notices_with_regex(text: str) -> List[Dict]:
    """
    Extract land-related notices using regex/keyword matching.
    Splits text into paragraphs, identifies land-related blocks,
    and extracts structured data from each.
    """
    notices = []

    # Split into paragraph-like blocks (double newline or gazette-style separators)
    blocks = re.split(r"\n\s*\n|\n(?=GAZETTE NOTICE|NOTICE\b|IN THE MATTER)", text)

    for block in blocks:
        block = block.strip()
        if len(block) < 30:
            continue

        # Check if this block contains land keywords
        if not LAND_KEYWORDS.search(block):
            continue

        # Extract parcel references
        parcels = PARCEL_PATTERNS.findall(block)
        parcel_str = "; ".join(sorted(set(p.strip() for p in parcels))) if parcels else None

        # Extract county
        county_matches = COUNTY_PATTERN.findall(block)
        county = county_matches[0] if county_matches else None

        # Classify notice type
        notice_type = classify_notice_type(block)
        alert_level = determine_alert_level(notice_type)

        # Extract gazette notice number if present
        gn_match = re.search(r"GAZETTE\s+NOTICE\s+(?:NO\.?\s*)?(\d+)", block, re.IGNORECASE)
        gazette_notice_number = gn_match.group(1) if gn_match else None

        # Try to extract an applicant/affected party name (lines with ALL CAPS names)
        name_match = re.search(r"\b([A-Z][A-Z\s\.']{5,60})\b", block)
        affected_party = name_match.group(1).strip() if name_match else None

        # Build a short summary
        summary = "{} notice".format(notice_type.replace("_", " ").title())
        if parcel_str:
            summary += " affecting {}".format(parcel_str[:60])
        if county:
            summary += " in {} County".format(county)

        notices.append({
            "notice_type": notice_type,
            "parcel_reference": parcel_str,
            "county": county,
            "gazette_notice_number": gazette_notice_number,
            "affected_party": affected_party,
            "acquiring_body": None,
            "inquiry_date": None,
            "alert_level": alert_level,
            "raw_text": block[:2000],
            "summary": summary,
        })

    return notices


# ── STEP 3c: AI EXTRACTION (OPTIONAL, USED WHEN API KEY WORKS) ──────────────

def extract_notices_with_ai(text: str, gazette_title: str) -> Optional[List[Dict]]:
    """
    Send extracted text to Claude to identify land notices.
    Returns None if AI is unavailable (no credits, no key, etc.)
    so the caller can fall back to regex.
    """
    try:
        import anthropic
    except ImportError:
        return None

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return None

    # Truncate if too long
    if len(text) > MAX_TEXT_LENGTH:
        text = text[:MAX_TEXT_LENGTH] + "\n\n[... truncated for length]"

    client = anthropic.Anthropic()

    try:
        message = client.messages.create(
            model=AI_MODEL,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": "Extract all land-related notices from this Kenya Gazette edition ({}):\n\n{}".format(
                        gazette_title, text
                    ),
                }
            ],
        )

        response_text = message.content[0].text.strip()

        # Parse JSON response — handle ```json ... ``` wrapping
        if response_text.startswith("```"):
            response_text = re.sub(r"^```(?:json)?\s*", "", response_text)
            response_text = re.sub(r"\s*```$", "", response_text)

        notices = json.loads(response_text)

        if not isinstance(notices, list):
            notices = [notices]

        return notices

    except Exception as e:
        print("    AI unavailable ({}), falling back to regex".format(
            str(e)[:80]
        ))
        return None


# ── MAIN ────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("ARDHI VERIFIED — Kenya Gazette Land Notice Extractor")
    print("Years: {}".format(", ".join(str(y) for y in GAZETTE_YEARS)))
    print("Max editions: {}".format(MAX_EDITIONS))
    print("=" * 60)

    # Ensure PDF directory exists
    PDF_DIR.mkdir(parents=True, exist_ok=True)

    # Load state
    processed_data = load_processed()
    processed_urls = set(processed_data["processed"])
    all_notices = load_output()

    # Step 1: Discover editions
    editions = discover_editions()

    if not editions:
        print("\nNo gazette editions found. Check the website structure.")
        return

    print("\nTotal editions discovered: {}".format(len(editions)))

    # Filter out already-processed editions
    pending = [e for e in editions if e["url"] not in processed_urls]
    print("Already processed: {}".format(len(editions) - len(pending)))
    print("Pending: {}".format(len(pending)))

    # Limit to MAX_EDITIONS
    to_process = pending[:MAX_EDITIONS]
    print("Will process: {}".format(len(to_process)))

    if not to_process:
        print("\nNothing new to process.")
        return

    # Step 2-4: Process each edition
    print("\n" + "=" * 60)

    for i, edition in enumerate(to_process):
        print("\n" + "-" * 60)
        print("[{}/{}] {}".format(i + 1, len(to_process), edition["title"]))
        print("  URL: {}".format(edition["url"]))

        # PDF link is edition URL + /source
        pdf_url = find_pdf_url(edition["url"])
        print("  PDF: {}".format(pdf_url))

        # Download PDF
        safe_name = re.sub(r"[^\w\-.]", "_", edition["title"])[:80] + ".pdf"
        pdf_path = PDF_DIR / safe_name

        if not pdf_path.exists():
            print("  Downloading PDF...")
            if not download_pdf(pdf_url, pdf_path):
                print("  Download failed, skipping")
                time.sleep(PDF_DELAY)
                continue
            time.sleep(PDF_DELAY)
        else:
            print("  PDF already downloaded")

        # Extract text
        print("  Extracting text...")
        text = extract_pdf_text(pdf_path)

        if text is None:
            print("  image_only — no extractable text, skipping")
            processed_data["processed"].append(edition["url"])
            save_processed(processed_data)
            continue

        print("  Extracted {} characters".format(len(text)))

        # Extract notices — try AI first, fall back to regex
        notices = extract_notices_with_ai(text, edition["title"])
        if notices is not None:
            print("  Extracted via Claude AI")
        else:
            print("  Extracting via regex fallback...")
            notices = extract_notices_with_regex(text)

        # Tag each notice with source metadata
        for notice in notices:
            notice["gazette_title"] = edition["title"]
            notice["gazette_url"] = edition["url"]
            notice["gazette_year"] = edition["year"]
            notice["extracted_at"] = datetime.now().isoformat()

        all_notices.extend(notices)

        print("  Gazette {} — {} land notices found".format(
            edition["title"], len(notices)
        ))

        # Mark as processed and save incrementally
        processed_data["processed"].append(edition["url"])
        save_processed(processed_data)
        save_output(all_notices)

        time.sleep(REQUEST_DELAY)

    # Final summary
    print("\n" + "=" * 60)
    print("DONE")
    print("  Total notices extracted: {}".format(len(all_notices)))
    print("  Total editions processed: {}".format(len(processed_data["processed"])))
    print("  Output: {}".format(OUTPUT_FILE))
    print("  Processed log: {}".format(PROCESSED_FILE))

    # Breakdown by type
    type_counts: Dict[str, int] = {}
    for n in all_notices:
        t = n.get("notice_type", "unknown")
        type_counts[t] = type_counts.get(t, 0) + 1

    if type_counts:
        print("\n  Notice breakdown:")
        for t, count in sorted(type_counts.items(), key=lambda x: -x[1]):
            print("    {} — {}".format(t, count))

    print("=" * 60)


if __name__ == "__main__":
    main()
