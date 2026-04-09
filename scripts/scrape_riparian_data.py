"""
Ardhi Verified — Riparian Zone Data Scraper
=============================================
Downloads Kenya river and water body geometry from:
  1. RCMRD ArcGIS — Kenya Rivers Feature Service
  2. open.africa — Africa Water Bodies 2015 (GeoJSON)

Applies statutory buffer zones per Kenya Water Act 2016:
  - Rivers: 30m riparian reserve (6m for streams in urban)
  - Lakes/reservoirs: 50m riparian reserve
  - Wetlands: 50m buffer

Usage:
    python3 scripts/scrape_riparian_data.py

Output:
    scripts/riparian_output.json
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

RCMRD_RIVERS_URL = (
    "https://services1.arcgis.com/PGZ6rHy9gfyUWIVY/arcgis/rest/services/"
    "Kenya_Rivers/FeatureServer/0/query"
)

RCMRD_BASINS_URL = (
    "https://services1.arcgis.com/PGZ6rHy9gfyUWIVY/arcgis/rest/services/"
    "Kenya_Rivers/FeatureServer/1/query"
)

WATER_BODIES_GEOJSON = (
    "https://energydata.info/dataset/4da29e28-ab51-4e0a-93d5-fd289a2cd320/"
    "resource/5d6b9830-ed2c-43d4-90c4-0c53ca0591d1/download/africawaterbody.geojson"
)

RCMRD_WATERBODIES_URL = (
    "https://services9.arcgis.com/tbfijoSkyxIDafrP/arcgis/rest/services/"
    "Kenya_Waterbodies/FeatureServer/0/query"
)

OUTPUT_FILE = Path(__file__).parent / "riparian_output.json"

REQUEST_DELAY = 2
REQUEST_TIMEOUT = 60
MAX_RETRIES = 2
PAGE_SIZE = 500

HEADERS = {
    "User-Agent": "ArdhiVerified-LandIntelBot/1.0 "
                  "(hello@ardhiverified.com; riparian zone research)"
}

# Kenya Water Act 2016 — riparian buffer zones (metres)
BUFFER_ZONES = {
    "river": 30,
    "stream": 6,
    "lake": 50,
    "reservoir": 50,
    "wetland": 50,
    "dam": 50,
    "ocean": 100,
}


# ── HELPERS ─────────────────────────────────────────────────────────────────

def fetch_json(url: str, params: Dict = None) -> Optional[Dict]:
    """Fetch JSON with retry logic."""
    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = requests.get(
                url, params=params, headers=HEADERS, timeout=REQUEST_TIMEOUT
            )
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as e:
            if attempt < MAX_RETRIES:
                print(f"    Retry {attempt + 1}/{MAX_RETRIES}...")
                time.sleep(REQUEST_DELAY * (attempt + 1))
            else:
                print(f"    Failed: {e}")
                return None
    return None


def classify_water_type(name: str, feature_type: str = "") -> str:
    """Classify water feature type from name or feature type field."""
    combined = f"{name} {feature_type}".lower()
    if any(w in combined for w in ["lake", "ziwa"]):
        return "lake"
    if any(w in combined for w in ["reservoir", "dam", "bwawa"]):
        return "reservoir"
    if any(w in combined for w in ["wetland", "swamp", "marsh"]):
        return "wetland"
    if any(w in combined for w in ["stream", "creek", "spring"]):
        return "stream"
    if any(w in combined for w in ["ocean", "sea", "indian"]):
        return "ocean"
    return "river"


def get_buffer(water_type: str) -> int:
    """Get statutory buffer zone in metres."""
    return BUFFER_ZONES.get(water_type, 30)


# Kenya bounding box (approximate)
KENYA_BBOX = {
    "xmin": 33.9,
    "ymin": -4.7,
    "xmax": 41.9,
    "ymax": 5.5,
}


def is_in_kenya(coords: List) -> bool:
    """Quick check if a coordinate is roughly in Kenya."""
    if not coords or len(coords) < 2:
        return False
    lon, lat = coords[0], coords[1]
    return (KENYA_BBOX["xmin"] <= lon <= KENYA_BBOX["xmax"] and
            KENYA_BBOX["ymin"] <= lat <= KENYA_BBOX["ymax"])


# ── RCMRD RIVERS SCRAPER ──────────────────────────────────────────────────

def scrape_rcmrd_rivers() -> List[Dict]:
    """Scrape Kenya river features from RCMRD ArcGIS."""
    print("\n  Fetching RCMRD Kenya Rivers Feature Service...")

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
            "outSR": "4326",  # WGS84
        }

        data = fetch_json(RCMRD_RIVERS_URL, params)
        if not data:
            print(f"    Failed at offset {offset}")
            break

        features = data.get("features", [])
        if not features:
            break

        all_features.extend(features)
        print(f"    Fetched {len(all_features)} river features...")

        if len(features) < PAGE_SIZE:
            break

        offset += PAGE_SIZE
        time.sleep(REQUEST_DELAY)

    print(f"  Total RCMRD river features: {len(all_features)}")

    records = []
    for feat in all_features:
        attrs = feat.get("attributes", {})
        geom = feat.get("geometry", {})

        name = attrs.get("NAME") or attrs.get("name") or attrs.get("RIVER_NAME") or "Unknown River"
        name = str(name).strip()
        if name in ["None", "0", ""]:
            name = "Unnamed River"

        water_type = classify_water_type(name, str(attrs.get("TYPE", "")))

        # Simplify geometry — store bounding box + path count
        paths = geom.get("paths", [])
        simplified = None
        if paths:
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

        records.append({
            "name": name,
            "water_type": water_type,
            "buffer_metres": get_buffer(water_type),
            "county": attrs.get("COUNTY") or attrs.get("county"),
            "basin": attrs.get("BASIN") or attrs.get("basin"),
            "geometry": simplified,
            "source": "rcmrd_rivers",
            "scraped_at": datetime.utcnow().isoformat(),
        })

    return records


# ── RCMRD WATER BODIES SCRAPER ────────────────────────────────────────────

def scrape_rcmrd_waterbodies() -> List[Dict]:
    """Scrape Kenya water bodies from RCMRD ArcGIS."""
    print("\n  Fetching RCMRD Kenya Water Bodies Feature Service...")

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

        data = fetch_json(RCMRD_WATERBODIES_URL, params)
        if not data:
            print(f"    Failed at offset {offset}")
            break

        features = data.get("features", [])
        if not features:
            break

        all_features.extend(features)
        print(f"    Fetched {len(all_features)} water body features...")

        if len(features) < PAGE_SIZE:
            break

        offset += PAGE_SIZE
        time.sleep(REQUEST_DELAY)

    print(f"  Total RCMRD water body features: {len(all_features)}")

    records = []
    for feat in all_features:
        attrs = feat.get("attributes", {})
        geom = feat.get("geometry", {})

        name = attrs.get("NAME") or attrs.get("name") or "Unknown Water Body"
        name = str(name).strip()
        if name in ["None", "0", ""]:
            name = "Unnamed Water Body"

        water_type = classify_water_type(name, str(attrs.get("TYPE", "")))

        # Simplify polygon geometry to bbox
        rings = geom.get("rings", [])
        simplified = None
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

        records.append({
            "name": name,
            "water_type": water_type,
            "buffer_metres": get_buffer(water_type),
            "county": attrs.get("COUNTY") or attrs.get("county"),
            "basin": None,
            "geometry": simplified,
            "source": "rcmrd_waterbodies",
            "scraped_at": datetime.utcnow().isoformat(),
        })

    return records


# ── OPEN AFRICA WATER BODIES ──────────────────────────────────────────────

def scrape_openafrika_waterbodies() -> List[Dict]:
    """Download Africa Water Bodies GeoJSON, filter to Kenya."""
    print("\n  Downloading Africa Water Bodies GeoJSON (may be large)...")

    try:
        resp = requests.get(WATER_BODIES_GEOJSON, headers=HEADERS, timeout=120)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"    Failed to download: {e}")
        return []

    features = data.get("features", [])
    print(f"  Total features in Africa dataset: {len(features)}")

    # Filter to Kenya bounding box
    kenya_features = []
    for feat in features:
        geom = feat.get("geometry", {})
        coords = geom.get("coordinates", [])

        # Check if any coordinate falls within Kenya
        in_kenya = False
        if geom.get("type") == "Point" and coords:
            in_kenya = is_in_kenya(coords)
        elif geom.get("type") in ["Polygon", "MultiPolygon"]:
            # Check first ring's first point
            try:
                if geom["type"] == "Polygon" and coords and coords[0]:
                    in_kenya = is_in_kenya(coords[0][0])
                elif geom["type"] == "MultiPolygon" and coords and coords[0] and coords[0][0]:
                    in_kenya = is_in_kenya(coords[0][0][0])
            except (IndexError, TypeError):
                pass

        if in_kenya:
            kenya_features.append(feat)

    print(f"  Kenya water bodies found: {len(kenya_features)}")

    records = []
    for feat in kenya_features:
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})

        name = props.get("NAME") or props.get("name") or "Unknown"
        water_type = classify_water_type(name, props.get("TYPE", ""))

        # Simplified bbox
        simplified = None
        coords = geom.get("coordinates", [])
        try:
            if geom["type"] == "Polygon" and coords and coords[0]:
                all_pts = coords[0]
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
        except (IndexError, TypeError, ValueError):
            pass

        records.append({
            "name": str(name).strip(),
            "water_type": water_type,
            "buffer_metres": get_buffer(water_type),
            "county": None,
            "basin": None,
            "geometry": simplified,
            "source": "openafrika_waterbodies",
            "scraped_at": datetime.utcnow().isoformat(),
        })

    return records


# ── MAIN ───────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("ARDHI VERIFIED — Riparian Zone Data Scraper")
    print("Sources: RCMRD Rivers + Water Bodies, open.africa")
    print("=" * 60)

    rivers = scrape_rcmrd_rivers()
    time.sleep(REQUEST_DELAY)

    waterbodies = scrape_rcmrd_waterbodies()
    time.sleep(REQUEST_DELAY)

    africa_water = scrape_openafrika_waterbodies()

    all_records = rivers + waterbodies + africa_water

    # Deduplicate by name + source + bbox (to keep distinct segments)
    seen = set()
    unique = []
    for r in all_records:
        bbox_key = ""
        if r.get("geometry") and r["geometry"].get("bbox"):
            b = r["geometry"]["bbox"]
            bbox_key = f"{b[0]:.3f},{b[1]:.3f},{b[2]:.3f},{b[3]:.3f}"
        key = f"{r['name']}|{r['source']}|{bbox_key}"
        if key not in seen:
            seen.add(key)
            unique.append(r)

    # Stats
    type_counts: Dict[str, int] = {}
    for r in unique:
        t = r["water_type"]
        type_counts[t] = type_counts.get(t, 0) + 1

    source_counts: Dict[str, int] = {}
    for r in unique:
        s = r["source"]
        source_counts[s] = source_counts.get(s, 0) + 1

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(unique, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 60}")
    print(f"DONE")
    print(f"  Total records: {len(unique)} (deduped from {len(all_records)})")
    print(f"\n  By source:")
    for src, count in sorted(source_counts.items()):
        print(f"    {src}: {count}")
    print(f"\n  By water type:")
    for wtype, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        buf = BUFFER_ZONES.get(wtype, 30)
        print(f"    {wtype}: {count} features ({buf}m buffer)")
    print(f"\n  Output: {OUTPUT_FILE}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
