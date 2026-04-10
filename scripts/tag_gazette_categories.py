"""
Ardhi Verified — Multi-Category Gazette Tagger
=================================================
Scans gazette_notices and tags each notice with one or
more categories by writing to the gazette_category array
column:

  - water_reserve     — riparian, catchments, basins
  - forest_reserve    — forest boundary, forest reserve
  - compulsory_acq    — compulsory acquisition, public purpose
  - road_reserve      — road corridor, road reserve, KeNHA/KURA/KeRRA

Usage:
    python3 scripts/tag_gazette_categories.py
"""

import os
import re
import sys

from supabase import create_client

CATEGORY_PATTERNS = {
    "water_reserve": re.compile(
        r"\b(riparian|water\s+reserve|water\s+catchment|basin\s+area|"
        r"water\s+protection\s+area|wetland|water\s+resources\s+authority|"
        r"\bwra\b|water\s+act|catchment\s+area|stream\s+reserve)\b",
        re.IGNORECASE,
    ),
    "forest_reserve": re.compile(
        r"\b(forest\s+reserve|forest\s+boundary|gazetted\s+forest|"
        r"kenya\s+forest\s+service|\bkfs\b|forest\s+act|"
        r"protected\s+forest|forest\s+station)\b",
        re.IGNORECASE,
    ),
    "compulsory_acq": re.compile(
        r"\b(compulsory\s+acquisition|public\s+purpose|"
        r"national\s+land\s+commission|\bnlc\b|"
        r"acquisition\s+of\s+land|land\s+acquisition|"
        r"adjudication|historical\s+land\s+injustice|\bhli\b)\b",
        re.IGNORECASE,
    ),
    "road_reserve": re.compile(
        r"\b(road\s+reserve|road\s+corridor|"
        r"kenya\s+national\s+highways\s+authority|\bkenha\b|"
        r"kenya\s+urban\s+roads\s+authority|\bkura\b|"
        r"kenya\s+rural\s+roads\s+authority|\bkerra\b|"
        r"dualling|road\s+construction|highway\s+expansion|"
        r"bypass|dual\s+carriageway)\b",
        re.IGNORECASE,
    ),
}


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
    print("GAZETTE MULTI-CATEGORY TAGGER")
    print("=" * 60)

    env = load_env()
    sb = create_client(
        env["NEXT_PUBLIC_SUPABASE_URL"],
        env.get("SUPABASE_SERVICE_ROLE_KEY"),
    )

    print("\nScanning gazette_notices (paginated)...")
    total_scanned = 0
    tagged_counts = {cat: 0 for cat in CATEGORY_PATTERNS}

    page = 0
    PAGE = 1000

    while True:
        try:
            res = sb.table("gazette_notices").select(
                "id, raw_text, gazette_category, summary"
            ).range(page * PAGE, (page + 1) * PAGE - 1).execute()
        except Exception as e:
            print("  Fetch error: {}".format(str(e)[:80]))
            break

        rows = res.data or []
        if not rows:
            break

        for row in rows:
            total_scanned += 1
            combined = (row.get("raw_text") or "") + " " + (row.get("summary") or "")
            if len(combined) < 10:
                continue

            existing = row.get("gazette_category") or []
            if not isinstance(existing, list):
                existing = []
            new_categories = set(existing)

            for cat, pattern in CATEGORY_PATTERNS.items():
                if pattern.search(combined):
                    if cat not in new_categories:
                        new_categories.add(cat)
                        tagged_counts[cat] += 1

            # Only update if new categories were added
            if set(new_categories) != set(existing):
                try:
                    sb.table("gazette_notices").update({
                        "gazette_category": sorted(new_categories),
                    }).eq("id", row["id"]).execute()
                except Exception as e:
                    pass  # Silent fail on individual rows

        print("  Scanned {} | New tags: water={} forest={} acq={} road={}".format(
            total_scanned,
            tagged_counts["water_reserve"],
            tagged_counts["forest_reserve"],
            tagged_counts["compulsory_acq"],
            tagged_counts["road_reserve"],
        ))

        if len(rows) < PAGE:
            break
        page += 1

    # Final tallies — count notices with each category
    print("\n" + "=" * 60)
    print("DONE — scanning complete")
    print("  Total scanned: {}".format(total_scanned))
    print("\n  New tags added by category:")
    for cat in ["water_reserve", "forest_reserve", "compulsory_acq", "road_reserve"]:
        print("    {}: {}".format(cat, tagged_counts[cat]))
    print("=" * 60)


if __name__ == "__main__":
    main()
