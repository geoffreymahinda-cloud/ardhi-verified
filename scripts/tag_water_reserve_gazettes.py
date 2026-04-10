"""
Ardhi Verified — Tag Water Reserve Gazette Notices
======================================================
Scans the existing gazette_notices table and flags any
that mention water reserves, riparian land, basin areas,
or protected water zones.

Updates the notice_type column (or adds water_reserve_flag)
so HatiScan can surface these during trust score calculation.

Usage:
    python3 scripts/tag_water_reserve_gazettes.py
"""

import os
import re
import sys

from supabase import create_client

# Keywords indicating a water reserve / riparian notice
WATER_KEYWORDS = re.compile(
    r"\b("
    r"riparian|water\s+reserve|water\s+resource|water\s+catchment|"
    r"basin\s+area|water\s+protection|water\s+permit|water\s+allocation|"
    r"wetland|lake\s+\w+\s+protection|river\s+\w+\s+protection|"
    r"catchment\s+area|water\s+body|stream\s+reserve|spring\s+protection|"
    r"wra|water\s+act|water\s+resources\s+authority"
    r")\b",
    re.IGNORECASE,
)

# Stronger patterns that guarantee water reserve relevance
STRONG_KEYWORDS = re.compile(
    r"\b("
    r"riparian|water\s+reserve|water\s+catchment|basin\s+area|"
    r"water\s+protection\s+area"
    r")\b",
    re.IGNORECASE,
)


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


def main():
    print("=" * 60)
    print("ARDHI VERIFIED — Tag Water Reserve Gazette Notices")
    print("=" * 60)

    env = load_env()
    url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("ERROR: Need SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    sb = create_client(url, key)

    # Page through all gazette notices
    PAGE_SIZE = 1000
    page = 0
    tagged = 0
    strong_tagged = 0
    total_scanned = 0

    while True:
        offset = page * PAGE_SIZE
        res = sb.table("gazette_notices").select(
            "id, notice_type, summary, raw_text"
        ).range(offset, offset + PAGE_SIZE - 1).execute()

        rows = res.data or []
        if not rows:
            break

        for row in rows:
            total_scanned += 1
            combined = " ".join([
                row.get("notice_type", "") or "",
                row.get("summary", "") or "",
                row.get("raw_text", "") or "",
            ])

            if not WATER_KEYWORDS.search(combined):
                continue

            is_strong = bool(STRONG_KEYWORDS.search(combined))
            new_type = "water_reserve"
            if row.get("notice_type") and "water_reserve" not in row["notice_type"]:
                new_type = row["notice_type"] + ",water_reserve"

            try:
                sb.table("gazette_notices").update({
                    "notice_type": new_type,
                }).eq("id", row["id"]).execute()
                tagged += 1
                if is_strong:
                    strong_tagged += 1
            except Exception as e:
                print("  Error updating id {}: {}".format(row["id"], str(e)[:60]))

        print("  Scanned {} | Tagged {} total ({} strong)".format(
            total_scanned, tagged, strong_tagged
        ))

        if len(rows) < PAGE_SIZE:
            break
        page += 1

    print("\n" + "=" * 60)
    print("DONE")
    print("  Total scanned: {}".format(total_scanned))
    print("  Tagged as water_reserve: {}".format(tagged))
    print("  Strong water reserve matches: {}".format(strong_tagged))
    print("=" * 60)


if __name__ == "__main__":
    main()
