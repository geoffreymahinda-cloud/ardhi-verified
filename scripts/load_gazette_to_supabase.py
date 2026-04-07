"""
Ardhi Verified — Load Gazette Notices to Supabase
===================================================
Reads scraped gazette data from gazette_output.json
and inserts it into the gazette_notices table in Supabase.

Skips duplicates (matching on gazette_notice_number + gazette_url).

Usage:
    python3 scripts/load_gazette_to_supabase.py
"""

import json
import os
import sys

from supabase import create_client


INPUT_FILE = "scripts/gazette_output.json"


def load_env():
    """Parse .env.local file for Supabase credentials."""
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    env = {}
    try:
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    env[key.strip()] = value.strip()
    except FileNotFoundError:
        print("ERROR: .env.local not found")
        sys.exit(1)
    return env


def normalize_parcel_reference(raw):
    """Convert parcel_reference to a JSON array of strings."""
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(r).strip() for r in raw if r]
    if isinstance(raw, str):
        # Split on semicolons or commas, clean up
        refs = []
        for part in raw.replace(";", ",").split(","):
            part = part.strip()
            if part and len(part) > 2:
                refs.append(part)
        return refs
    return []


def main():
    print("=" * 60)
    print("ARDHI VERIFIED — Load Gazette Notices to Supabase")
    print("=" * 60)

    env = load_env()
    supabase_url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        print("ERROR: Missing SUPABASE_URL or key in .env.local")
        sys.exit(1)

    print(f"  Supabase URL: {supabase_url}")
    print(f"  Using key: {'service_role' if env.get('SUPABASE_SERVICE_ROLE_KEY') else 'anon'}")

    # Load gazette data
    try:
        with open(INPUT_FILE, "r", encoding="utf-8") as f:
            notices = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: {INPUT_FILE} not found. Run scrape_gazette.py first.")
        sys.exit(1)

    print(f"\n  Notices in file: {len(notices)}")

    # Connect
    print("\n  Connecting to Supabase...")
    supabase = create_client(supabase_url, supabase_key)

    inserted = 0
    skipped = 0
    errors = 0

    print(f"  Upserting records...\n")
    for i, notice in enumerate(notices):
        # Skip notices with no gazette_notice_number (can't deduplicate)
        notice_number = notice.get("gazette_notice_number")
        gazette_url = notice.get("gazette_url", "")

        row = {
            "notice_type": notice.get("notice_type", "general_land"),
            "parcel_reference": normalize_parcel_reference(notice.get("parcel_reference")),
            "county": notice.get("county"),
            "gazette_notice_number": notice_number,
            "affected_party": notice.get("affected_party"),
            "acquiring_body": notice.get("acquiring_body"),
            "inquiry_date": notice.get("inquiry_date"),
            "alert_level": notice.get("alert_level", "info"),
            "description": notice.get("summary"),
            "raw_text": notice.get("raw_text", "")[:5000],  # Limit raw text size
            "summary": notice.get("summary"),
            "gazette_title": notice.get("gazette_title"),
            "gazette_url": gazette_url,
            "gazette_year": notice.get("gazette_year"),
            "extracted_at": notice.get("extracted_at"),
        }

        try:
            if notice_number:
                supabase.table("gazette_notices").upsert(
                    row, on_conflict="gazette_notice_number,gazette_url"
                ).execute()
            else:
                supabase.table("gazette_notices").insert(row).execute()
            inserted += 1
            if inserted % 100 == 0:
                print(f"    {inserted} upserted so far...")
        except Exception as e:
            error_msg = str(e)
            if "duplicate" in error_msg.lower():
                skipped += 1
            else:
                errors += 1
                if errors <= 5:
                    print(f"    Error on notice {i+1}: {error_msg[:120]}")

    print(f"\n{'=' * 60}")
    print(f"  Done!")
    print(f"  Inserted:  {inserted}")
    print(f"  Skipped:   {skipped} (duplicates)")
    print(f"  Errors:    {errors}")
    print(f"  Total:     {len(notices)}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
