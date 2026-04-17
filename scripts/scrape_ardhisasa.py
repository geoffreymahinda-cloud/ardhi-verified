"""
Ardhi Verified --- Ardhisasa WMS/WFS Parcel Boundary Extractor
================================================================
Extracts cadastral parcel boundary polygons from the Ardhisasa
property viewer (ardhisasa.lands.go.ke) by querying the underlying
WMS/WFS or ArcGIS REST endpoints across a bounding-box grid
covering Nairobi.

The scraper:
  1. Checks robots.txt for crawl restrictions
  2. Probes the site to identify the map service technology
     (ArcGIS REST, GeoServer WFS/WMS, etc.)
  3. Builds a bounding-box grid over Nairobi
  4. Queries each grid cell for parcel features
  5. Extracts parcel reference, owner, geometry
  6. Saves results incrementally to ardhisasa_output.json

Usage:
    python3 scripts/scrape_ardhisasa.py
    python3 scripts/scrape_ardhisasa.py --probe-only   # just probe endpoints

Output:
    scripts/ardhisasa_output.json       -- extracted parcel features
    scripts/ardhisasa_processed.json    -- tracking file for processed cells
    scripts/ardhisasa_errors.log        -- error log

Dependencies:
    pip install requests python-dotenv
"""

import json
import logging
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from urllib.parse import urljoin, urlencode

import requests

# -- CONFIGURATION -----------------------------------------------------------

SITE_URL = "https://ardhisasa.lands.go.ke"

# User-Agent: transparent, identifiable, with contact info
HEADERS = {
    "User-Agent": "ArdhiVerified-CadastreBot/1.0 (hello@ardhiverified.com; cadastral research)",
    "Accept": "application/json, application/geo+json, */*",
    "Referer": SITE_URL,
}

# Rate limiting — respectful minimum 2 seconds between requests
REQUEST_DELAY = 2.0
REQUEST_TIMEOUT = 30

# Retry config
MAX_RETRIES = 3
RETRY_BACKOFF = 5  # seconds, multiplied by attempt number

# Nairobi bounding box (EPSG:4326)
# lat roughly -1.15 to -1.45, lng 36.65 to 37.10
NAIROBI_BBOX = {
    "min_lat": -1.45,
    "max_lat": -1.15,
    "min_lng": 36.65,
    "max_lng": 37.10,
}

# Grid cell size in degrees (~0.01 deg ~ 1.1 km at equator)
GRID_CELL_SIZE = 0.01

# Max features per request (most services cap at 1000-2000)
MAX_FEATURES_PER_REQUEST = 1000

# Paths
SCRIPT_DIR = Path(__file__).parent
OUTPUT_FILE = SCRIPT_DIR / "ardhisasa_output.json"
PROCESSED_FILE = SCRIPT_DIR / "ardhisasa_processed.json"
ERROR_LOG = SCRIPT_DIR / "ardhisasa_errors.log"

# -- LOGGING -----------------------------------------------------------------

logger = logging.getLogger("ardhisasa_scraper")
logger.setLevel(logging.DEBUG)

_fh = logging.FileHandler(ERROR_LOG, encoding="utf-8")
_fh.setLevel(logging.WARNING)
_fh.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
logger.addHandler(_fh)

_sh = logging.StreamHandler()
_sh.setLevel(logging.INFO)
_sh.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(_sh)


# -- ROBOTS.TXT CHECK -------------------------------------------------------

def check_robots_txt() -> Dict[str, Any]:
    """
    Fetch and parse robots.txt from the target site.
    Returns a dict with 'allowed' bool and 'raw' text.
    """
    robots_url = "{}/robots.txt".format(SITE_URL)
    print("  Checking robots.txt: {}".format(robots_url))

    try:
        resp = requests.get(robots_url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 404:
            print("  robots.txt not found (404) -- no crawl restrictions declared")
            return {"allowed": True, "raw": "", "status": 404}

        resp.raise_for_status()
        raw = resp.text
        print("  robots.txt found ({} bytes)".format(len(raw)))

        # Check for Disallow rules that would block our paths
        lines = raw.lower().split("\n")
        blocked_paths = []
        current_agent = None

        for line in lines:
            line = line.strip()
            if line.startswith("user-agent:"):
                current_agent = line.split(":", 1)[1].strip()
            elif line.startswith("disallow:"):
                path = line.split(":", 1)[1].strip()
                if current_agent in ("*", "") and path:
                    blocked_paths.append(path)

        # Check if map service paths are blocked
        service_paths = [
            "/server/", "/arcgis/", "/geoserver/", "/wms", "/wfs",
            "/rest/services", "/mapserver", "/featureserver",
        ]
        blocked = False
        for sp in service_paths:
            for bp in blocked_paths:
                if sp.startswith(bp) or bp == "/":
                    blocked = True
                    print("  WARNING: Path '{}' appears blocked by Disallow '{}'".format(sp, bp))

        if "/" in blocked_paths:
            print("  WARNING: robots.txt blocks all paths with 'Disallow: /'")
            blocked = True

        return {"allowed": not blocked, "raw": raw, "status": resp.status_code, "blocked_paths": blocked_paths}

    except requests.RequestException as e:
        print("  Could not fetch robots.txt: {}".format(e))
        return {"allowed": True, "raw": "", "status": None, "error": str(e)}


# -- ENDPOINT PROBING -------------------------------------------------------

# Common ArcGIS REST paths to probe
ARCGIS_REST_PATHS = [
    "/server/rest/services",
    "/arcgis/rest/services",
    "/rest/services",
    "/hosting/rest/services",
]

# Common GeoServer paths
GEOSERVER_PATHS = [
    "/geoserver/ows",
    "/geoserver/wfs",
    "/geoserver/wms",
    "/geoserver/web/",
]

# Common generic WMS/WFS paths
WMS_WFS_PATHS = [
    "/wms",
    "/wfs",
    "/ows",
    "/service",
    "/cgi-bin/mapserv",
]


def probe_url(url: str, params: Optional[Dict] = None) -> Optional[requests.Response]:
    """Attempt a GET request; return the Response or None."""
    try:
        resp = requests.get(url, headers=HEADERS, params=params, timeout=REQUEST_TIMEOUT)
        return resp
    except requests.RequestException:
        return None


def probe_arcgis_rest(base_url: str) -> List[Dict]:
    """
    Probe for ArcGIS REST services. Returns list of discovered endpoints.
    ArcGIS REST returns JSON service directories with ?f=json.
    """
    discovered = []

    for path in ARCGIS_REST_PATHS:
        url = "{}{}".format(base_url, path)
        resp = probe_url(url, params={"f": "json"})

        if resp is None or resp.status_code != 200:
            continue

        try:
            data = resp.json()
        except (ValueError, AttributeError):
            continue

        # ArcGIS REST service directory has 'services' or 'folders' keys
        services = data.get("services", [])
        folders = data.get("folders", [])

        if services or folders:
            print("  FOUND ArcGIS REST at {} ({} services, {} folders)".format(
                url, len(services), len(folders)
            ))
            discovered.append({
                "type": "arcgis_rest",
                "url": url,
                "services": services,
                "folders": folders,
            })

            # Probe each folder for more services
            for folder in folders:
                folder_url = "{}/{}".format(url, folder)
                folder_resp = probe_url(folder_url, params={"f": "json"})
                time.sleep(REQUEST_DELAY)

                if folder_resp and folder_resp.status_code == 200:
                    try:
                        folder_data = folder_resp.json()
                        folder_services = folder_data.get("services", [])
                        if folder_services:
                            print("    Folder '{}': {} services".format(folder, len(folder_services)))
                            discovered.append({
                                "type": "arcgis_rest_folder",
                                "url": folder_url,
                                "folder": folder,
                                "services": folder_services,
                            })
                    except (ValueError, AttributeError):
                        pass

        time.sleep(REQUEST_DELAY)

    return discovered


def probe_geoserver(base_url: str) -> List[Dict]:
    """
    Probe for GeoServer WFS/WMS endpoints.
    GeoServer GetCapabilities returns XML describing available layers.
    """
    discovered = []

    for path in GEOSERVER_PATHS:
        url = "{}{}".format(base_url, path)

        # Try WFS GetCapabilities
        wfs_params = {
            "service": "WFS",
            "version": "2.0.0",
            "request": "GetCapabilities",
        }
        resp = probe_url(url, params=wfs_params)

        if resp and resp.status_code == 200 and (
            "WFS_Capabilities" in resp.text or "FeatureTypeList" in resp.text
        ):
            print("  FOUND GeoServer WFS at {}".format(url))
            # Extract layer names from capabilities
            layers = re.findall(r"<Name>(.*?)</Name>", resp.text)
            discovered.append({
                "type": "wfs",
                "url": url,
                "layers": layers[:50],  # cap for safety
            })

        time.sleep(REQUEST_DELAY)

        # Try WMS GetCapabilities
        wms_params = {
            "service": "WMS",
            "version": "1.3.0",
            "request": "GetCapabilities",
        }
        resp = probe_url(url, params=wms_params)

        if resp and resp.status_code == 200 and (
            "WMS_Capabilities" in resp.text or "WMT_MS_Capabilities" in resp.text
        ):
            print("  FOUND GeoServer WMS at {}".format(url))
            layers = re.findall(r"<Name>(.*?)</Name>", resp.text)
            discovered.append({
                "type": "wms",
                "url": url,
                "layers": layers[:50],
            })

        time.sleep(REQUEST_DELAY)

    return discovered


def probe_generic_wms_wfs(base_url: str) -> List[Dict]:
    """Probe generic WMS/WFS paths."""
    discovered = []

    for path in WMS_WFS_PATHS:
        url = "{}{}".format(base_url, path)

        for service_type in ("WFS", "WMS"):
            params = {
                "service": service_type,
                "request": "GetCapabilities",
            }
            resp = probe_url(url, params=params)

            if resp and resp.status_code == 200:
                is_capabilities = (
                    "Capabilities" in resp.text
                    or "FeatureTypeList" in resp.text
                    or "LayerList" in resp.text
                )
                if is_capabilities:
                    print("  FOUND {} at {}".format(service_type, url))
                    layers = re.findall(r"<Name>(.*?)</Name>", resp.text)
                    discovered.append({
                        "type": service_type.lower(),
                        "url": url,
                        "layers": layers[:50],
                    })

            time.sleep(REQUEST_DELAY)

    return discovered


def probe_homepage(base_url: str) -> Dict[str, Any]:
    """
    Fetch the homepage/viewer and look for map service URLs in the HTML/JS.
    Many government viewers embed their service URLs in JavaScript config.
    """
    result = {"map_urls": [], "technology": None}

    resp = probe_url(base_url)
    if resp is None or resp.status_code != 200:
        print("  Homepage not accessible")
        return result

    html = resp.text

    # Detect technology
    if "arcgis" in html.lower() or "esri" in html.lower():
        result["technology"] = "arcgis"
        print("  Detected ArcGIS-based viewer")
    elif "openlayers" in html.lower():
        result["technology"] = "openlayers"
        print("  Detected OpenLayers-based viewer")
    elif "leaflet" in html.lower():
        result["technology"] = "leaflet"
        print("  Detected Leaflet-based viewer")
    elif "geoserver" in html.lower():
        result["technology"] = "geoserver"
        print("  Detected GeoServer-based viewer")

    # Extract URLs that look like map service endpoints
    url_patterns = [
        # ArcGIS REST service URLs
        r'(https?://[^\s"\'<>]+/(?:rest/services|server/rest/services|arcgis/rest/services)/[^\s"\'<>]+)',
        # WMS/WFS URLs
        r'(https?://[^\s"\'<>]+/(?:wms|wfs|ows|geoserver)[^\s"\'<>]*)',
        # MapServer/FeatureServer URLs
        r'(https?://[^\s"\'<>]+/(?:MapServer|FeatureServer)[^\s"\'<>]*)',
        # Generic service URLs with layer/BBOX params
        r'(https?://[^\s"\'<>]+(?:layers?|BBOX|bbox|format=)[^\s"\'<>]*)',
    ]

    for pattern in url_patterns:
        matches = re.findall(pattern, html)
        for match in matches:
            clean = match.rstrip("\\'\",);")
            if clean not in result["map_urls"]:
                result["map_urls"].append(clean)

    if result["map_urls"]:
        print("  Found {} map service URLs in homepage".format(len(result["map_urls"])))
        for url in result["map_urls"][:10]:
            print("    {}".format(url[:120]))

    return result


def probe_all_endpoints() -> Dict[str, Any]:
    """
    Master probing function. Tries all strategies to discover
    the underlying map service endpoints.
    """
    print("\n" + "=" * 60)
    print("ENDPOINT PROBING")
    print("=" * 60)

    results = {
        "homepage": None,
        "arcgis_rest": [],
        "geoserver": [],
        "wms_wfs": [],
        "recommended_endpoint": None,
    }

    # 1. Check homepage for embedded URLs
    print("\n--- Probing homepage ---")
    results["homepage"] = probe_homepage(SITE_URL)
    time.sleep(REQUEST_DELAY)

    # 2. Check for ArcGIS REST services
    print("\n--- Probing ArcGIS REST ---")
    results["arcgis_rest"] = probe_arcgis_rest(SITE_URL)

    # Also probe any service URLs found in homepage
    homepage_urls = results["homepage"].get("map_urls", [])
    for url in homepage_urls:
        # Extract base URL for ArcGIS REST services
        rest_match = re.search(r"(https?://[^/]+(?:/[^/]+)*?/rest/services)", url)
        if rest_match:
            rest_base = rest_match.group(1)
            if rest_base != SITE_URL:
                print("\n  Also probing extracted base: {}".format(rest_base))
                extra = probe_arcgis_rest(rest_base.rsplit("/rest/services", 1)[0])
                results["arcgis_rest"].extend(extra)

    # 3. Check for GeoServer
    print("\n--- Probing GeoServer ---")
    results["geoserver"] = probe_geoserver(SITE_URL)

    # 4. Check generic WMS/WFS
    print("\n--- Probing generic WMS/WFS ---")
    results["wms_wfs"] = probe_generic_wms_wfs(SITE_URL)

    # 5. Determine recommended endpoint
    if results["arcgis_rest"]:
        results["recommended_endpoint"] = {
            "type": "arcgis_rest",
            "detail": results["arcgis_rest"][0],
        }
    elif results["geoserver"]:
        wfs = [g for g in results["geoserver"] if g["type"] == "wfs"]
        if wfs:
            results["recommended_endpoint"] = {"type": "wfs", "detail": wfs[0]}
        else:
            results["recommended_endpoint"] = {
                "type": results["geoserver"][0]["type"],
                "detail": results["geoserver"][0],
            }
    elif results["wms_wfs"]:
        wfs = [w for w in results["wms_wfs"] if w["type"] == "wfs"]
        if wfs:
            results["recommended_endpoint"] = {"type": "wfs", "detail": wfs[0]}
        else:
            results["recommended_endpoint"] = {
                "type": results["wms_wfs"][0]["type"],
                "detail": results["wms_wfs"][0],
            }

    # Summary
    print("\n" + "-" * 60)
    print("PROBING SUMMARY")
    print("  Technology detected: {}".format(results["homepage"].get("technology", "unknown")))
    print("  ArcGIS REST endpoints: {}".format(len(results["arcgis_rest"])))
    print("  GeoServer endpoints: {}".format(len(results["geoserver"])))
    print("  Generic WMS/WFS endpoints: {}".format(len(results["wms_wfs"])))

    if results["recommended_endpoint"]:
        print("  Recommended: {} at {}".format(
            results["recommended_endpoint"]["type"],
            results["recommended_endpoint"]["detail"].get("url", "?"),
        ))
    else:
        print("  No usable endpoints found -- manual inspection required")

    return results


# -- BOUNDING BOX GRID ------------------------------------------------------

def build_grid(
    min_lat: float, max_lat: float,
    min_lng: float, max_lng: float,
    cell_size: float,
) -> List[Tuple[float, float, float, float]]:
    """
    Build a grid of bounding boxes (min_lng, min_lat, max_lng, max_lat)
    covering the specified extent.
    """
    cells = []
    lat = min_lat
    while lat < max_lat:
        lng = min_lng
        while lng < max_lng:
            cell = (
                round(lng, 6),
                round(lat, 6),
                round(min(lng + cell_size, max_lng), 6),
                round(min(lat + cell_size, max_lat), 6),
            )
            cells.append(cell)
            lng += cell_size
        lat += cell_size
    return cells


# -- FEATURE EXTRACTION: ArcGIS REST ----------------------------------------

def query_arcgis_features(
    service_url: str,
    layer_id: int,
    bbox: Tuple[float, float, float, float],
    out_sr: int = 4326,
) -> Optional[Dict]:
    """
    Query an ArcGIS REST FeatureServer/MapServer layer for features
    within a bounding box. Returns GeoJSON-like response or None.

    bbox: (min_lng, min_lat, max_lng, max_lat)
    """
    url = "{}/{}/query".format(service_url.rstrip("/"), layer_id)
    params = {
        "where": "1=1",
        "geometry": "{},{},{},{}".format(*bbox),
        "geometryType": "esriGeometryEnvelope",
        "inSR": 4326,
        "outSR": out_sr,
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "*",
        "returnGeometry": "true",
        "f": "geojson",
        "resultRecordCount": MAX_FEATURES_PER_REQUEST,
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(url, headers=HEADERS, params=params, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            data = resp.json()

            # Check for ArcGIS error response
            if "error" in data:
                logger.warning(
                    "ArcGIS error on layer %d bbox %s: %s",
                    layer_id, bbox, data["error"].get("message", "unknown"),
                )
                return None

            return data

        except requests.RequestException as e:
            logger.warning(
                "Request failed (attempt %d/%d) layer %d bbox %s: %s",
                attempt, MAX_RETRIES, layer_id, bbox, e,
            )
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_BACKOFF * attempt)
            else:
                return None

    return None


def discover_arcgis_layers(service_url: str) -> List[Dict]:
    """
    Query an ArcGIS REST service to list its layers with metadata.
    Looks for parcel/cadastral layers.
    """
    url = "{}?f=json".format(service_url.rstrip("/"))
    resp = probe_url(url)
    if resp is None or resp.status_code != 200:
        return []

    try:
        data = resp.json()
    except (ValueError, AttributeError):
        return []

    layers = data.get("layers", [])
    parcel_keywords = [
        "parcel", "cadastr", "plot", "block", "boundary", "land",
        "survey", "property", "title", "registration", "lr",
    ]

    relevant = []
    for layer in layers:
        name = (layer.get("name") or "").lower()
        if any(kw in name for kw in parcel_keywords):
            relevant.append(layer)
            print("    Relevant layer: [{}] {}".format(layer.get("id"), layer.get("name")))

    if not relevant:
        # If no obvious parcel layers, return all layers for manual review
        print("    No obviously relevant layers found. All layers:")
        for layer in layers:
            print("      [{}] {}".format(layer.get("id"), layer.get("name")))
        return layers

    return relevant


# -- FEATURE EXTRACTION: WFS ------------------------------------------------

def query_wfs_features(
    wfs_url: str,
    layer_name: str,
    bbox: Tuple[float, float, float, float],
) -> Optional[Dict]:
    """
    Query a WFS endpoint for features within a bounding box.
    Returns GeoJSON response or None.

    bbox: (min_lng, min_lat, max_lng, max_lat)
    """
    # WFS 2.0 uses (min_lat, min_lng, max_lat, max_lng) for EPSG:4326
    bbox_str = "{},{},{},{}".format(bbox[1], bbox[0], bbox[3], bbox[2])

    params = {
        "service": "WFS",
        "version": "2.0.0",
        "request": "GetFeature",
        "typeName": layer_name,
        "outputFormat": "application/json",
        "srsName": "EPSG:4326",
        "bbox": bbox_str + ",EPSG:4326",
        "count": MAX_FEATURES_PER_REQUEST,
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(wfs_url, headers=HEADERS, params=params, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()

            # Check if response is JSON (not XML error)
            content_type = resp.headers.get("Content-Type", "")
            if "json" in content_type or "geo+json" in content_type:
                return resp.json()
            elif "xml" in content_type:
                # Check for exception
                if "ExceptionReport" in resp.text or "ServiceException" in resp.text:
                    logger.warning(
                        "WFS exception on %s bbox %s: %s",
                        layer_name, bbox, resp.text[:200],
                    )
                    return None
                # Some WFS return GML, which we cannot parse simply
                logger.warning("WFS returned XML/GML instead of JSON for %s", layer_name)
                return None
            else:
                return resp.json()

        except requests.RequestException as e:
            logger.warning(
                "WFS request failed (attempt %d/%d) %s bbox %s: %s",
                attempt, MAX_RETRIES, layer_name, bbox, e,
            )
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_BACKOFF * attempt)
            else:
                return None
        except ValueError:
            logger.warning("Non-JSON WFS response for %s", layer_name)
            return None

    return None


# -- FEATURE NORMALIZATION ---------------------------------------------------

def normalize_feature(feature: Dict, source_type: str) -> Optional[Dict]:
    """
    Normalize a GeoJSON feature from either ArcGIS or WFS into our
    standard parcel format.

    Returns dict with keys matching the parcels table, or None if
    the feature lacks geometry.
    """
    props = feature.get("properties", {})
    geometry = feature.get("geometry")

    if not geometry:
        return None

    geom_type = geometry.get("type", "")
    if geom_type not in ("Polygon", "MultiPolygon"):
        return None

    # Try to extract parcel reference from common field names
    parcel_ref = None
    parcel_fields = [
        "parcel_no", "parcel_number", "parcel_id", "parcelno", "parcelnumber",
        "lr_no", "lr_number", "lrnumber", "lr", "l_r",
        "title_no", "title_number", "titleno",
        "plot_no", "plot_number", "plotno", "plot_id",
        "ref_no", "reference", "ref",
        "pin", "id_no", "objectid",
    ]
    for field in parcel_fields:
        for key in props:
            if key.lower().replace(" ", "_") == field:
                val = props[key]
                if val and str(val).strip() and str(val).strip() not in ("0", "None", "null"):
                    parcel_ref = str(val).strip()
                    break
        if parcel_ref:
            break

    # Try to extract owner name
    owner_name = None
    owner_fields = [
        "owner", "owner_name", "ownername", "proprietor", "registered_owner",
        "name", "applicant", "holder",
    ]
    for field in owner_fields:
        for key in props:
            if key.lower().replace(" ", "_") == field:
                val = props[key]
                if val and str(val).strip() and str(val).strip() not in ("None", "null"):
                    owner_name = str(val).strip()
                    break
        if owner_name:
            break

    # Try to extract land use
    land_use = None
    use_fields = ["land_use", "landuse", "use", "zoning", "zone", "category"]
    for field in use_fields:
        for key in props:
            if key.lower().replace(" ", "_") == field:
                val = props[key]
                if val and str(val).strip():
                    land_use = str(val).strip()
                    break
        if land_use:
            break

    # Try to extract area
    area_sqm = None
    area_fields = ["area", "shape_area", "shapearea", "area_sqm", "area_m2", "sq_meters"]
    for field in area_fields:
        for key in props:
            if key.lower().replace(" ", "_") == field:
                try:
                    area_sqm = float(props[key])
                except (ValueError, TypeError):
                    pass
                break

    # Extract block number
    block_number = None
    block_fields = ["block", "block_no", "block_number", "blockno"]
    for field in block_fields:
        for key in props:
            if key.lower().replace(" ", "_") == field:
                val = props[key]
                if val and str(val).strip():
                    block_number = str(val).strip()
                    break
        if block_number:
            break

    # Extract LR number specifically
    lr_number = None
    lr_fields = ["lr_no", "lr_number", "lrnumber", "lr", "l_r"]
    for field in lr_fields:
        for key in props:
            if key.lower().replace(" ", "_") == field:
                val = props[key]
                if val and str(val).strip():
                    lr_number = str(val).strip()
                    break
        if lr_number:
            break

    area_ha = round(area_sqm / 10000, 4) if area_sqm else None

    return {
        "parcel_reference": parcel_ref,
        "owner_name": owner_name,
        "country": "Kenya",
        "county_district": "Nairobi",
        "land_use": land_use,
        "area_ha": area_ha,
        "area_sqm": area_sqm,
        "lr_number": lr_number,
        "block_number": block_number,
        "geometry": geometry,
        "raw_properties": props,
        "data_source": "ardhisasa",
        "extracted_at": datetime.now().isoformat(),
    }


# -- STATE MANAGEMENT -------------------------------------------------------

def load_processed() -> Dict:
    if PROCESSED_FILE.exists():
        with open(PROCESSED_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"processed_cells": [], "endpoint": None, "started_at": None}


def save_processed(data: Dict):
    with open(PROCESSED_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def load_output() -> List[Dict]:
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_output(features: List[Dict]):
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(features, f, indent=2, ensure_ascii=False)


# -- MAIN EXTRACTION --------------------------------------------------------

def extract_arcgis(
    service_url: str,
    layer_id: int,
    grid: List[Tuple],
    processed_cells: set,
    all_features: List[Dict],
    state: Dict,
):
    """Run the grid extraction using ArcGIS REST query."""
    total_cells = len(grid)
    new_features = 0

    for i, bbox in enumerate(grid):
        cell_key = "{:.6f},{:.6f},{:.6f},{:.6f}".format(*bbox)
        if cell_key in processed_cells:
            continue

        print("  [{}/{}] Querying bbox {}".format(i + 1, total_cells, cell_key))

        data = query_arcgis_features(service_url, layer_id, bbox)
        time.sleep(REQUEST_DELAY)

        if data is None:
            logger.warning("No data for cell %s", cell_key)
            processed_cells.add(cell_key)
            state["processed_cells"].append(cell_key)
            save_processed(state)
            continue

        features = data.get("features", [])
        cell_count = 0

        for feat in features:
            normalized = normalize_feature(feat, "arcgis")
            if normalized:
                all_features.append(normalized)
                cell_count += 1
                new_features += 1

        print("    {} features extracted".format(cell_count))

        if len(features) >= MAX_FEATURES_PER_REQUEST:
            print("    WARNING: Hit feature limit -- may need smaller grid for this cell")
            logger.warning("Feature limit reached for cell %s (%d features)", cell_key, len(features))

        # Mark cell as processed and save incrementally
        processed_cells.add(cell_key)
        state["processed_cells"].append(cell_key)
        save_processed(state)
        save_output(all_features)

    return new_features


def extract_wfs(
    wfs_url: str,
    layer_name: str,
    grid: List[Tuple],
    processed_cells: set,
    all_features: List[Dict],
    state: Dict,
):
    """Run the grid extraction using WFS GetFeature."""
    total_cells = len(grid)
    new_features = 0

    for i, bbox in enumerate(grid):
        cell_key = "{:.6f},{:.6f},{:.6f},{:.6f}".format(*bbox)
        if cell_key in processed_cells:
            continue

        print("  [{}/{}] Querying bbox {}".format(i + 1, total_cells, cell_key))

        data = query_wfs_features(wfs_url, layer_name, bbox)
        time.sleep(REQUEST_DELAY)

        if data is None:
            logger.warning("No data for cell %s", cell_key)
            processed_cells.add(cell_key)
            state["processed_cells"].append(cell_key)
            save_processed(state)
            continue

        features = data.get("features", [])
        cell_count = 0

        for feat in features:
            normalized = normalize_feature(feat, "wfs")
            if normalized:
                all_features.append(normalized)
                cell_count += 1
                new_features += 1

        print("    {} features extracted".format(cell_count))

        if len(features) >= MAX_FEATURES_PER_REQUEST:
            print("    WARNING: Hit feature limit -- may need smaller grid for this cell")

        # Mark cell as processed and save incrementally
        processed_cells.add(cell_key)
        state["processed_cells"].append(cell_key)
        save_processed(state)
        save_output(all_features)

    return new_features


# -- MAIN -------------------------------------------------------------------

def main():
    probe_only = "--probe-only" in sys.argv

    print("=" * 60)
    print("ARDHI VERIFIED -- Ardhisasa Parcel Boundary Extractor")
    print("Target: {}".format(SITE_URL))
    print("Nairobi BBOX: {:.2f},{:.2f} to {:.2f},{:.2f}".format(
        NAIROBI_BBOX["min_lng"], NAIROBI_BBOX["min_lat"],
        NAIROBI_BBOX["max_lng"], NAIROBI_BBOX["max_lat"],
    ))
    print("Grid cell size: {} deg (~{:.0f}m)".format(GRID_CELL_SIZE, GRID_CELL_SIZE * 111000))
    print("=" * 60)

    # Step 1: Check robots.txt
    print("\n--- Step 1: robots.txt check ---")
    robots = check_robots_txt()

    if not robots["allowed"]:
        print("\n  ABORT: robots.txt blocks crawling of map service paths.")
        print("  Review the robots.txt content and adjust scraper accordingly.")
        print("  Raw robots.txt:\n{}".format(robots.get("raw", "")))
        sys.exit(1)

    # Step 2: Probe endpoints
    probe_results = probe_all_endpoints()

    if probe_only:
        print("\n  --probe-only flag set. Exiting after probe.")
        # Save probe results for reference
        probe_file = SCRIPT_DIR / "ardhisasa_probe_results.json"
        with open(probe_file, "w", encoding="utf-8") as f:
            json.dump(probe_results, f, indent=2, ensure_ascii=False, default=str)
        print("  Probe results saved to {}".format(probe_file))
        return

    # Step 3: Determine extraction strategy
    endpoint = probe_results.get("recommended_endpoint")
    if not endpoint:
        print("\n  ERROR: No usable map service endpoints discovered.")
        print("  Manual steps to resolve:")
        print("  1. Open {} in a browser".format(SITE_URL))
        print("  2. Open DevTools -> Network tab")
        print("  3. Pan/zoom the map and look for XHR requests")
        print("  4. Identify URLs with 'MapServer', 'FeatureServer', 'wfs', etc.")
        print("  5. Update SITE_URL or add the discovered URL to the script")

        # Save probe results for debugging
        probe_file = SCRIPT_DIR / "ardhisasa_probe_results.json"
        with open(probe_file, "w", encoding="utf-8") as f:
            json.dump(probe_results, f, indent=2, ensure_ascii=False, default=str)
        print("\n  Probe results saved to {}".format(probe_file))
        sys.exit(1)

    # Step 4: Build grid
    print("\n--- Step 4: Building bounding box grid ---")
    grid = build_grid(
        NAIROBI_BBOX["min_lat"], NAIROBI_BBOX["max_lat"],
        NAIROBI_BBOX["min_lng"], NAIROBI_BBOX["max_lng"],
        GRID_CELL_SIZE,
    )
    print("  Grid cells: {}".format(len(grid)))

    # Load state
    state = load_processed()
    processed_cells = set(state.get("processed_cells", []))
    all_features = load_output()

    remaining = len(grid) - len(processed_cells)
    print("  Already processed: {}".format(len(processed_cells)))
    print("  Remaining: {}".format(remaining))

    if remaining == 0:
        print("\n  All grid cells already processed.")
        print("  Total features: {}".format(len(all_features)))
        return

    if not state.get("started_at"):
        state["started_at"] = datetime.now().isoformat()
        state["endpoint"] = {
            "type": endpoint["type"],
            "url": endpoint["detail"].get("url"),
        }

    # Step 5: Extract features
    print("\n--- Step 5: Extracting parcel features ---")
    print("  Service type: {}".format(endpoint["type"]))
    print("  Service URL: {}".format(endpoint["detail"].get("url")))
    print("  Estimated time: ~{:.0f} minutes (at {}s delay)".format(
        remaining * REQUEST_DELAY / 60, REQUEST_DELAY,
    ))

    if endpoint["type"] == "arcgis_rest":
        service_url = endpoint["detail"]["url"]
        # Find the parcel layer
        print("\n  Discovering layers...")
        layers = discover_arcgis_layers(service_url)
        if not layers:
            print("  No layers found at {}".format(service_url))
            sys.exit(1)

        # Use first relevant layer (user can override)
        layer_id = layers[0].get("id", 0)
        print("  Using layer [{}] {}".format(layer_id, layers[0].get("name", "?")))

        new = extract_arcgis(service_url, layer_id, grid, processed_cells, all_features, state)

    elif endpoint["type"] in ("wfs",):
        wfs_url = endpoint["detail"]["url"]
        layers = endpoint["detail"].get("layers", [])

        # Find a parcel-like layer
        parcel_kw = ["parcel", "cadastr", "plot", "block", "land", "boundary"]
        target_layer = None
        for layer in layers:
            if any(kw in layer.lower() for kw in parcel_kw):
                target_layer = layer
                break
        if not target_layer and layers:
            target_layer = layers[0]

        if not target_layer:
            print("  No layers available on WFS endpoint")
            sys.exit(1)

        print("  Using WFS layer: {}".format(target_layer))
        new = extract_wfs(wfs_url, target_layer, grid, processed_cells, all_features, state)

    else:
        print("  Unsupported endpoint type: {}".format(endpoint["type"]))
        print("  Manual implementation required for this service type.")
        sys.exit(1)

    # Final summary
    print("\n" + "=" * 60)
    print("EXTRACTION COMPLETE")
    print("  New features extracted: {}".format(new))
    print("  Total features: {}".format(len(all_features)))
    print("  Grid cells processed: {}".format(len(processed_cells)))
    print("  Output: {}".format(OUTPUT_FILE))

    # Stats
    with_ref = sum(1 for f in all_features if f.get("parcel_reference"))
    with_owner = sum(1 for f in all_features if f.get("owner_name"))
    with_lr = sum(1 for f in all_features if f.get("lr_number"))

    print("\n  Data quality:")
    print("    With parcel reference: {}".format(with_ref))
    print("    With owner name: {}".format(with_owner))
    print("    With LR number: {}".format(with_lr))
    print("=" * 60)


if __name__ == "__main__":
    main()
