"""
Ardhi Verified — Land Restriction Zones Scraper
=================================================
Downloads Kenya land restriction boundary data from RCMRD ArcGIS:
  1. Wetlands (1,226 polygons)
  2. Forest Reserves (268 polygons)
  3. Protected Areas / National Parks (53 polygons)
  4. Lakes / Water Bodies (16 polygons)
  5. Water Towers (79 points)

All data loaded into riparian_zones table for HatiScan flagging.

Usage:
    python3 scripts/scrape_land_restrictions.py
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict

import requests

# ── CONFIGURATION ───────────────────────────────────────────────────────────

SOURCES = {
    "wetlands": {
        "url": "https://services2.arcgis.com/7p8XMQ9sy7kJZN4K/arcgis/rest/services/Kenya_Wetlands/FeatureServer/0/query",
        "water_type": "wetland",
        "buffer": 50,
        "name_field": "USERLABEL",
    },
    "forest_reserves": {
        "url": "https://services6.arcgis.com/zOnyumh63cMmLBBH/arcgis/rest/services/Kenya_Forest_Reserves/FeatureServer/0/query",
        "water_type": "forest_reserve",
        "buffer": 0,  # Forest itself is restricted, no buffer needed
        "name_field": "NAME",
        "extra_fields": ["DESIG_ENG", "MANG_AUTH", "REP_AREA", "STATUS_YR"],
    },
    "protected_areas": {
        "url": "https://services6.arcgis.com/6A1HRwmAbUFSekJR/arcgis/rest/services/Protected_Areas_Kenya/FeatureServer/0/query",
        "water_type": "protected_area",
        "buffer": 0,
        "name_field": "PARKNAME",
        "extra_fields": ["DESIGNATE"],
    },
    "lakes": {
        "url": "https://services3.arcgis.com/SdyShniSh24zEgVJ/arcgis/rest/services/Lakes_Kenya/FeatureServer/0/query",
        "water_type": "lake",
        "buffer": 50,
        "name_field": "LAKE_NAME",
        "extra_fields": ["AREA_SKM", "COUNTRY"],
    },
    "water_towers": {
        "url": "https://services.arcgis.com/hBEMHCkbQdfV906F/arcgis/rest/services/Kenya_Water_Towers/FeatureServer/0/query",
        "water_type": "water_tower",
        "buffer": 0,
        "name_field": "Name",
        "extra_fields": ["Status"],
    },
}

OUTPUT_FILE = Path(__file__).parent / "land_restrictions_output.json"
REQUEST_DELAY = 2
REQUEST_TIMEOUT = 60
MAX_RETRIES = 2
PAGE_SIZE = 500

HEADERS = {
    "User-Agent": "ArdhiVerified-LandIntelBot/1.0 "
                  "(hello@ardhiverified.com; land restriction research)"
}


def fetch_json(url: str, params: Dict = None) -> Optional[Dict]:
    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = requests.get(url, params=params, headers=HEADERS, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as e:
            if attempt < MAX_RETRIES:
                print(f"    Retry {attempt + 1}...")
                time.sleep(REQUEST_DELAY * (attempt + 1))
            else:
                print(f"    Failed: {e}")
                return None
    return None


def scrape_source(key: str, config: Dict) -> List[Dict]:
    print(f"\n  Fetching {key}...")
    all_features = []
    offset = 0

    while True:
        params = {
            "where": "1=1",
            "outFields": "*",
            "returnGeometry": "true",
            "f": "json",
            "resultOffset": offset,
            "resultRecordCount": PAGE_SIZE,
            "outSR": "4326",
        }

        data = fetch_json(config["url"], params)
        if not data:
            break

        features = data.get("features", [])
        if not features:
            break

        all_features.extend(features)
        print(f"    {len(all_features)} features...")

        if len(features) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
        time.sleep(REQUEST_DELAY)

    print(f"  Total {key}: {len(all_features)}")

    records = []
    for feat in all_features:
        attrs = feat.get("attributes", {})
        geom = feat.get("geometry", {})

        name = attrs.get(config["name_field"]) or "Unknown"
        name = str(name).strip()
        if name in ["None", "0", "", "Null"]:
            name = f"Unnamed {config['water_type'].replace('_', ' ').title()}"

        # Build bbox from geometry
        simplified = None
        rings = geom.get("rings", [])
        paths = geom.get("paths", [])
        point_x = geom.get("x")
        point_y = geom.get("y")

        if rings:
            all_pts = [pt for ring in rings for pt in ring]
            if all_pts and len(all_pts[0]) >= 2:
                simplified = {
                    "type": "Polygon",
                    "total_points": len(all_pts),
                    "bbox": [
                        min(p[0] for p in all_pts),
                        min(p[1] for p in all_pts),
                        max(p[0] for p in all_pts),
                        max(p[1] for p in all_pts),
                    ],
                }
        elif paths:
            all_pts = [pt for path in paths for pt in path]
            if all_pts and len(all_pts[0]) >= 2:
                simplified = {
                    "type": "MultiLineString",
                    "total_points": len(all_pts),
                    "bbox": [
                        min(p[0] for p in all_pts),
                        min(p[1] for p in all_pts),
                        max(p[0] for p in all_pts),
                        max(p[1] for p in all_pts),
                    ],
                }
        elif point_x is not None and point_y is not None:
            simplified = {
                "type": "Point",
                "total_points": 1,
                "bbox": [point_x, point_y, point_x, point_y],
            }

        county = attrs.get("COUNTY") or attrs.get("county")
        basin = attrs.get("BASIN") or attrs.get("basin")

        records.append({
            "name": name,
            "water_type": config["water_type"],
            "buffer_metres": config["buffer"],
            "county": county,
            "basin": basin,
            "geometry": simplified,
            "source": f"rcmrd_{key}",
            "scraped_at": datetime.utcnow().isoformat(),
        })

    return records


def main():
    print("=" * 60)
    print("ARDHI VERIFIED — Land Restriction Zones Scraper")
    print("Sources: RCMRD Wetlands, Forests, Parks, Lakes, Water Towers")
    print("=" * 60)

    all_records = []
    for key, config in SOURCES.items():
        records = scrape_source(key, config)
        all_records.extend(records)
        time.sleep(REQUEST_DELAY)

    # Stats
    type_counts: Dict[str, int] = {}
    for r in all_records:
        t = r["water_type"]
        type_counts[t] = type_counts.get(t, 0) + 1

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_records, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 60}")
    print(f"DONE")
    print(f"  Total records: {len(all_records)}")
    print(f"\n  By type:")
    for wtype, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"    {wtype}: {count}")
    print(f"\n  Output: {OUTPUT_FILE}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
