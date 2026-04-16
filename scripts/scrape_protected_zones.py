"""
Ardhi Verified — Kenya Protected Zones Scraper (OpenStreetMap)
===============================================================
Downloads Kenya protected areas from OSM via the Overpass API.

Queries:
  - boundary=national_park
  - boundary=forest
  - boundary=protected_area
  - leisure=nature_reserve

Licence: ODbL (free for commercial use with attribution).

Usage:
    python3 scripts/scrape_protected_zones.py

Dependencies:
    pip install requests
"""

import json
import math
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

import requests

# ── CONFIGURATION ───────────────────────────────────────────────────────────

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OUTPUT_FILE = Path(__file__).parent / "protected_zones_output.json"

HEADERS = {
    "User-Agent": "ArdhiVerified-ProtectedBot/1.0 (hello@ardhiverified.com)"
}

# Kenya bounding box (approx)
KENYA_BBOX = "-4.7, 33.9, 5.0, 41.9"

# Overpass queries for each category
OVERPASS_QUERIES = [
    {
        "label": "national_park",
        "query": f"""
[out:json][timeout:120];
(
  way["boundary"="national_park"](area.kenya);
  relation["boundary"="national_park"](area.kenya);
);
out body geom;
""",
    },
    {
        "label": "forest",
        "query": f"""
[out:json][timeout:120];
(
  way["boundary"="forest"](area.kenya);
  relation["boundary"="forest"](area.kenya);
);
out body geom;
""",
    },
    {
        "label": "protected_area",
        "query": f"""
[out:json][timeout:120];
(
  way["boundary"="protected_area"](area.kenya);
  relation["boundary"="protected_area"](area.kenya);
);
out body geom;
""",
    },
    {
        "label": "nature_reserve",
        "query": f"""
[out:json][timeout:120];
(
  way["leisure"="nature_reserve"](area.kenya);
  relation["leisure"="nature_reserve"](area.kenya);
);
out body geom;
""",
    },
]

# Wrap each query with the Kenya area filter
AREA_PREFIX = '[out:json][timeout:120];\narea["ISO3166-1"="KE"]->.kenya;\n'


def build_query(q: Dict) -> str:
    """Inject the Kenya area definition into the query."""
    raw = q["query"].strip()
    # Replace the first [out:json][timeout:120]; with our area prefix
    body = raw.replace("[out:json][timeout:120];", "", 1).strip()
    return AREA_PREFIX + body


def simplify_geometry(geom_members: Any, osm_type: str) -> Dict:
    """
    Convert Overpass geometry to a simplified GeoJSON-like structure.
    Keeps the full coordinate ring but computes bbox and point count.
    """
    if osm_type == "way":
        # geom_members is the 'geometry' array of {lat, lon} dicts
        coords = [[p["lon"], p["lat"]] for p in geom_members]
        return {
            "type": "Polygon",
            "total_points": len(coords),
            "bbox": compute_bbox(coords),
            "coordinates": [coords],
        }
    elif osm_type == "relation":
        # Relations have 'members' with geometry; collect outer rings
        rings = []
        if isinstance(geom_members, list):
            for member in geom_members:
                if member.get("role") == "outer" and member.get("geometry"):
                    ring = [[p["lon"], p["lat"]] for p in member["geometry"]]
                    rings.append(ring)
        if not rings:
            return None
        if len(rings) == 1:
            return {
                "type": "Polygon",
                "total_points": sum(len(r) for r in rings),
                "bbox": compute_bbox(rings[0]),
                "coordinates": rings,
            }
        else:
            return {
                "type": "MultiPolygon",
                "total_points": sum(len(r) for r in rings),
                "bbox": compute_bbox([p for r in rings for p in r]),
                "coordinates": [[r] for r in rings],
            }
    return None


def compute_bbox(coords: List[List[float]]) -> List[float]:
    """[min_lon, min_lat, max_lon, max_lat]"""
    lons = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    return [min(lons), min(lats), max(lons), max(lats)]


def estimate_area_hectares(geometry: Dict) -> float:
    """
    Rough area estimate from bbox in hectares.
    Not precise — just for reference. Uses equirectangular approximation.
    """
    if not geometry or "bbox" not in geometry:
        return None
    bbox = geometry["bbox"]
    lon1, lat1, lon2, lat2 = bbox
    # Approximate using equirectangular projection
    lat_mid = math.radians((lat1 + lat2) / 2)
    dx = math.radians(lon2 - lon1) * math.cos(lat_mid) * 6371000
    dy = math.radians(lat2 - lat1) * 6371000
    area_m2 = abs(dx * dy)
    return round(area_m2 / 10000, 2)


def classify_designation(tags: Dict, query_label: str) -> str:
    """Determine a clean designation from OSM tags + query context."""
    boundary = tags.get("boundary", "")
    leisure = tags.get("leisure", "")
    protect_class = tags.get("protect_class", "")

    if boundary == "national_park" or "national park" in tags.get("name", "").lower():
        return "national_park"
    if leisure == "nature_reserve":
        return "nature_reserve"
    if boundary == "forest" or "forest" in tags.get("name", "").lower():
        return "forest"
    if boundary == "protected_area":
        # Try to be more specific from protect_class
        if protect_class in ("1", "1a", "1b", "2"):
            return "national_park"
        if protect_class in ("4", "5"):
            return "nature_reserve"
        return "protected_area"

    return query_label


def run_query(q: Dict) -> List[Dict]:
    """Execute a single Overpass query and parse results."""
    label = q["label"]
    query_text = build_query(q)

    print(f"  Querying: {label}...")
    try:
        resp = requests.post(
            OVERPASS_URL,
            data={"data": query_text},
            headers=HEADERS,
            timeout=180,
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"    ERROR: {e}")
        return []

    data = resp.json()
    elements = data.get("elements", [])
    print(f"    Got {len(elements)} elements")

    records = []
    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name") or tags.get("name:en")
        if not name:
            # Skip unnamed features
            continue

        osm_type = el.get("type", "way")
        osm_id = el.get("id")

        # Build geometry
        if osm_type == "way":
            geom_raw = el.get("geometry", [])
        elif osm_type == "relation":
            geom_raw = el.get("members", [])
        else:
            continue

        geometry = simplify_geometry(geom_raw, osm_type)
        if not geometry:
            continue

        area_ha = estimate_area_hectares(geometry)
        designation = classify_designation(tags, label)

        records.append({
            "name": name.strip(),
            "osm_id": osm_id,
            "osm_type": osm_type,
            "designation": designation,
            "boundary": tags.get("boundary"),
            "protection_title": tags.get("protection_title") or tags.get("protect_title"),
            "area_hectares": area_ha,
            "source": "openstreetmap",
            "source_url": f"https://www.openstreetmap.org/{osm_type}/{osm_id}",
            "geometry": geometry,
            "tags": {
                k: v for k, v in tags.items()
                if k not in ("name", "boundary", "leisure", "type")
            },
            "scraped_at": datetime.now().isoformat(),
        })

    return records


def deduplicate(records: List[Dict]) -> List[Dict]:
    """Deduplicate by OSM ID (same feature may appear in multiple queries)."""
    seen = {}
    for r in records:
        key = (r["osm_type"], r["osm_id"])
        if key not in seen:
            seen[key] = r
        else:
            # Keep the more specific designation
            existing = seen[key]
            if existing["designation"] == "protected_area" and r["designation"] != "protected_area":
                seen[key] = r
    return list(seen.values())


def main():
    print("=" * 60)
    print("ARDHI VERIFIED — Kenya Protected Zones Scraper")
    print("Source: OpenStreetMap Overpass API (ODbL licence)")
    print("=" * 60)

    all_records = []

    for i, q in enumerate(OVERPASS_QUERIES):
        records = run_query(q)
        all_records.extend(records)
        # Be polite to the Overpass API
        if i < len(OVERPASS_QUERIES) - 1:
            print("    Waiting 10s (Overpass rate limit)...")
            time.sleep(10)

    print(f"\n  Total raw records: {len(all_records)}")

    # Deduplicate
    deduped = deduplicate(all_records)
    print(f"  After dedup: {len(deduped)}")

    # Stats
    by_designation = {}
    for r in deduped:
        d = r["designation"]
        by_designation[d] = by_designation.get(d, 0) + 1

    print("\n  By designation:")
    for d, c in sorted(by_designation.items(), key=lambda x: -x[1]):
        print(f"    {d}: {c}")

    # Save JSON
    output = {
        "metadata": {
            "source": "OpenStreetMap Overpass API",
            "licence": "ODbL — https://opendatacommons.org/licenses/odbl/",
            "scrape_date": datetime.now().isoformat(),
            "total_zones": len(deduped),
            "by_designation": by_designation,
        },
        "zones": deduped,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"\n  Saved to {OUTPUT_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    main()
