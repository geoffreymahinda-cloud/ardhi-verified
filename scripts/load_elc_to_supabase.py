"""
Ardhi Verified — Load ELC Cases to Supabase
=============================================
Reads scraped ELC judgment data from elc_output.json
and inserts it into the elc_cases table in Supabase.

Skips duplicates (matching on source_url).

Usage:
    python3 scripts/load_elc_to_supabase.py
"""

import json
import os
import sys

from supabase import create_client

# ── CONFIGURATION ───────────────────────────────────────────────────────────

INPUT_FILES = [
    "scripts/elc_output.json",
    "scripts/courts_output.json",
]

# Read credentials from .env.local
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
        print("✗ .env.local not found")
        sys.exit(1)
    return env

# ── MAIN ────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("ARDHI VERIFIED — Load ELC Cases to Supabase")
    print("=" * 60)

    # Step 1: Load environment variables
    env = load_env()
    supabase_url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    # Try service role key first, fall back to anon key
    supabase_key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        print("✗ Missing SUPABASE_URL or key in .env.local")
        sys.exit(1)

    print(f"  Supabase URL: {supabase_url}")
    print(f"  Using key: {'service_role' if 'SERVICE_ROLE' in (env.get('SUPABASE_SERVICE_ROLE_KEY') or '') else 'anon'}")

    # Step 2: Load scraped data from all input files
    cases = []
    for input_file in INPUT_FILES:
        try:
            with open(input_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            file_cases = data.get("cases", [])
            print(f"\n📄 {input_file}: {len(file_cases)} cases")
            cases.extend(file_cases)
        except FileNotFoundError:
            print(f"  ⚠ {input_file} not found, skipping")

    if not cases:
        print("✗ No cases found. Run scrape_elc.py or scrape_courts.py first.")
        sys.exit(1)

    print(f"\n  Total cases to load: {len(cases)}")

    # Step 3: Connect to Supabase
    print("\n🔌 Connecting to Supabase...")
    supabase = create_client(supabase_url, supabase_key)

    # Step 4: Upsert records (insert or update on conflict)
    inserted = 0
    skipped = 0
    errors = 0

    print(f"\n📤 Upserting records (insert new, update existing)...")
    for i, case in enumerate(cases):

        # Prepare row for Supabase — only include columns that exist
        row = {
            "case_number": case.get("case_number", ""),
            "court_station": case.get("court_station", ""),
            "parties": case.get("parties", ""),
            "outcome": case.get("outcome", ""),
            "judge": case.get("judge", ""),
            "date_decided": case.get("date_decided", ""),
            "source_url": case["source_url"],
            "topic": case.get("topic", ""),
            "raw_excerpt": case.get("raw_excerpt", ""),
            "parcel_reference": case.get("parcel_reference", []),
        }

        try:
            supabase.table("elc_cases").upsert(row, on_conflict="source_url").execute()
            inserted += 1
            if (inserted) % 100 == 0:
                print(f"  ✓ {inserted} upserted so far...")
        except Exception as e:
            error_msg = str(e)
            errors += 1
            if errors <= 5:
                print(f"  ✗ Error on case {i+1}: {error_msg[:80]}")

    # Step 6: Summary
    print(f"\n{'=' * 60}")
    print(f"✓ Done!")
    print(f"  Inserted:  {inserted}")
    print(f"  Skipped:   {skipped} (already existed)")
    print(f"  Errors:    {errors}")
    print(f"  Total:     {len(cases)}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
