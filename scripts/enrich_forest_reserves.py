"""
Ardhi Verified — Forest Reserves Enrichment
=============================================
Cross-references 268 RCMRD forest reserve names against
the 1,459 gazette_notices entries mentioning "forest" to
extract gazette_ref, county, and boundary context.

Updates the forest_reserves table in place.

Usage:
    python3 scripts/enrich_forest_reserves.py
"""

import os
import re
import sys

from supabase import create_client


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
    print("FOREST RESERVES — Gazette Enrichment")
    print("=" * 60)

    env = load_env()
    sb = create_client(
        env["NEXT_PUBLIC_SUPABASE_URL"],
        env.get("SUPABASE_SERVICE_ROLE_KEY"),
    )

    # Fetch all forest reserves
    reserves_res = sb.table("forest_reserves").select("id, name").execute()
    reserves = reserves_res.data
    print("\nLoaded {} forest reserves".format(len(reserves)))

    # Fetch all gazette notices mentioning forest (paginated)
    print("Fetching forest-related gazette notices...")
    all_notices = []
    page = 0
    PAGE_SIZE = 1000
    while True:
        res = sb.table("gazette_notices").select(
            "id, raw_text, gazette_year, gazette_notice_number, county, notice_type"
        ).ilike("raw_text", "%forest%").range(
            page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1
        ).execute()

        if not res.data:
            break
        all_notices.extend(res.data)
        if len(res.data) < PAGE_SIZE:
            break
        page += 1

    print("  Loaded {} notices".format(len(all_notices)))

    # For each reserve, find notices mentioning it by name
    enriched = 0
    gazette_refs_added = 0
    counties_added = 0

    for reserve in reserves:
        name = reserve["name"].strip()
        if len(name) < 4:
            continue

        # Normalize for matching — drop 'Forest', 'Reserve' suffixes
        core_name = re.sub(r"\s+(forest\s+reserve|forest|reserve)$", "", name, flags=re.IGNORECASE).strip()
        if len(core_name) < 4:
            core_name = name

        # Build regex — word boundary match
        pattern = re.compile(r"\b" + re.escape(core_name) + r"\b", re.IGNORECASE)

        matches = []
        for notice in all_notices:
            raw = notice.get("raw_text") or ""
            if pattern.search(raw):
                matches.append(notice)

        if not matches:
            continue

        # Pick the first matching notice with gazette info
        gazette_ref = None
        county = None
        description_snippet = None

        for m in matches:
            if m.get("gazette_notice_number") and not gazette_ref:
                year = m.get("gazette_year") or ""
                num = m.get("gazette_notice_number")
                gazette_ref = "GN {}/{}".format(num, year)
            if m.get("county") and not county:
                county = m.get("county")
            if not description_snippet:
                # Extract context around the name mention
                raw = m.get("raw_text") or ""
                match_obj = pattern.search(raw)
                if match_obj:
                    start = max(0, match_obj.start() - 100)
                    end = min(len(raw), match_obj.end() + 150)
                    description_snippet = raw[start:end].strip()
                    description_snippet = re.sub(r"\s+", " ", description_snippet)[:500]

            if gazette_ref and county and description_snippet:
                break

        # Update the reserve record
        update = {}
        if gazette_ref:
            update["gazette_ref"] = gazette_ref
            gazette_refs_added += 1
        if county:
            update["county"] = county
            counties_added += 1
        if description_snippet:
            update["boundary_description"] = description_snippet

        if update:
            try:
                sb.table("forest_reserves").update(update).eq("id", reserve["id"]).execute()
                enriched += 1
            except Exception as e:
                print("  Error updating {}: {}".format(name[:40], str(e)[:60]))

    # Report
    print("\n" + "=" * 60)
    print("DONE")
    print("  Reserves enriched: {}".format(enriched))
    print("  Gazette refs added: {}".format(gazette_refs_added))
    print("  Counties added: {}".format(counties_added))

    # Final breakdown
    res = sb.table("forest_reserves").select("county, region, gazette_ref").execute()
    from collections import Counter
    counties = Counter(r.get("county") or "Unknown" for r in res.data)
    with_gazette = sum(1 for r in res.data if r.get("gazette_ref"))

    print("\n  Total reserves: {}".format(len(res.data)))
    print("  With gazette ref: {}".format(with_gazette))
    print("  Top counties:")
    for c, n in counties.most_common(10):
        print("    {}: {}".format(c, n))
    print("=" * 60)


if __name__ == "__main__":
    main()
