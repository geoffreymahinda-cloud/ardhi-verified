"""
Ardhi Verified --- Nairobi GIS Hub Scraper (nairobimaps.com)
=============================================================
Discovers ArcGIS REST feature layers on the Nairobi GIS Hub
and extracts LR number to Nairobi Block number mappings from
Registry Index Maps (RIMs), survey plans, and parcel layers.

The site is an ArcGIS Online / Portal instance.  The scraper:
  1. Checks robots.txt for crawl restrictions
  2. Discovers available feature services via the ArcGIS REST API
  3. Queries relevant layers for LR and block number attributes
  4. Saves results incrementally to gis_hub_output.json

Usage:
    python3 scripts/scrape_gis_hub.py

Output:
    scripts/gis_hub_output.json       -- extracted LR-to-block mappings
    scripts/gis_hub_processed.json    -- tracking file for processed layers
    scripts/gis_hub_errors.log        -- error log for production debugging

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

from dotenv import load_dotenv

# Load .env.local from the project root
_project_root = Path(__file__).parent.parent
load_dotenv(_project_root / ".env.local")

import requests

# -- CONFIGURATION -----------------------------------------------------------

SITE_URL = "https://nairobimaps.com"

# Common ArcGIS REST base paths to probe on the portal
ARCGIS_REST_PATHS = [
    "/server/rest/services",
    "/arcgis/rest/services",
    "/rest/services",
    "/hosting/rest/services",
    "/portal/sharing/rest/content",
]

# ArcGIS Online / Hub search endpoint (if it's an AGOL-backed hub)
AGOL_SEARCH_URL = "https://www.arcgis.com/sharing/rest/search"

# Keywords for discovering relevant layers
LAYER_KEYWORDS = [
    "registry index",
    "rim",
    "survey plan",
    "parcel",
    "plot",
    "block",
    "cadastr",
    "land parcel",
    "lr number",
    "lr_no",
    "title deed",
    "land registration",
    "nairobi block",
    "property",
    "subdivision",
    "allotment",
    "sectional plan",
    "deed plan",
]

# Field name patterns that likely contain LR numbers or block numbers
LR_FIELD_PATTERNS = [
    r"lr[_\s]?n",
    r"l\.?r\.?",
    r"i\.?r\.?",           # Islamic Registry numbers
    r"title[_\s]?n",
    r"parcel[_\s]?n",
    r"parcel[_\s]?id",
    r"plot[_\s]?n",
    r"plot[_\s]?id",
    r"registration",
    r"ref[_\s]?n",
    r"deed[_\s]?n",
    r"deed$",
    r"grant[_\s]?n",
]

BLOCK_FIELD_PATTERNS = [
    r"block[_\s]?n",
    r"block[_\s]?id",
    r"block$",
    r"rim[_\s]?n",
    r"rim[_\s]?id",
    r"rim$",
    r"sheet[_\s]?n",
    r"sheet[_\s]?id",
    r"index[_\s]?map",
    r"map[_\s]?n",
    r"map[_\s]?ref",
    r"section[_\s]?n",
]

# -- Rate limiting defaults (may be raised by robots.txt Crawl-Delay) --------
_request_delay = 2       # Seconds between page/API requests
_query_delay = 3         # Seconds between feature queries
REQUEST_TIMEOUT = 30     # Seconds before request times out
MAX_RETRIES = 5          # Retries with exponential backoff
MAX_FEATURES_PER_QUERY = 1000  # ArcGIS default max record count
MAX_TOTAL_FEATURES = 100000    # Safety cap per layer (raised from 50k)

SCRIPT_DIR = Path(__file__).parent
OUTPUT_FILE = SCRIPT_DIR / "gis_hub_output.json"
PROCESSED_FILE = SCRIPT_DIR / "gis_hub_processed.json"
ERROR_LOG = SCRIPT_DIR / "gis_hub_errors.log"

HEADERS = {
    "User-Agent": "ArdhiVerified-GISHubBot/1.0 (hello@ardhiverified.com; land registry research)",
    "Accept": "application/json",
}

# -- LOGGING -----------------------------------------------------------------

logger = logging.getLogger("gis_hub_scraper")
logger.setLevel(logging.DEBUG)

_file_handler = logging.FileHandler(ERROR_LOG, encoding="utf-8")
_file_handler.setLevel(logging.WARNING)
_file_handler.setFormatter(logging.Formatter(
    "%(asctime)s %(levelname)s %(message)s"
))
logger.addHandler(_file_handler)

_stream_handler = logging.StreamHandler()
_stream_handler.setLevel(logging.INFO)
_stream_handler.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(_stream_handler)


# -- LR / BLOCK REGEX PATTERNS (value-level) ---------------------------------
# These match the *values* inside attribute fields, not field names.
# Covers all known Kenyan LR number formats:
#   "LR No. 1234/56"   "LR 209/21922"   "L.R. NO. 12807/214"
#   "I.R. 12345"        "IR 12345/6"     "F.R. 1234"
#   Bare numeric like "1234/56" (when extracted from a known LR field)

LR_VALUE_PATTERN = re.compile(
    r"(?:"
    r"(?:L\.?R\.?|I\.?R\.?|F\.?R\.?)\s*(?:No\.?)?\s*"  # LR / IR / FR prefix
    r")"
    r"([\d]+(?:[/\-][\d]+)*)",                          # numeric part: 1234/56
    re.IGNORECASE,
)

# Standalone numeric pattern for known LR fields (e.g. "209/21922")
LR_BARE_NUMERIC = re.compile(
    r"^(\d{1,6}(?:[/\-]\d{1,6}){0,3})$"
)

# Block number value patterns:
#   "Nairobi Block 45/78"    "NAIROBI/BLOCK/45/78"
#   "Block 12/456"           "45/78" (bare, from known block field)
BLOCK_VALUE_PATTERN = re.compile(
    r"(?:"
    r"(?:NAIROBI\s*[/\s]\s*)?"
    r"(?:Block|BLK)\s*(?:No\.?)?\s*[/\s]?\s*"
    r")"
    r"([\d]+(?:[/\-][\d]+)*)",
    re.IGNORECASE,
)

BLOCK_BARE_NUMERIC = re.compile(
    r"^(\d{1,4}(?:[/\-]\d{1,6}){0,3})$"
)


# -- LOAD / SAVE HELPERS -----------------------------------------------------

def load_processed() -> Dict:
    if PROCESSED_FILE.exists():
        try:
            with open(PROCESSED_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.warning("Corrupt processed file, starting fresh: %s", e)
    return {"processed_layers": [], "robots_checked": False, "discovered_rest_root": None}


def save_processed(data: Dict):
    # Atomic write: write to temp then rename
    tmp = PROCESSED_FILE.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    tmp.replace(PROCESSED_FILE)


def load_output() -> Dict:
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.warning("Corrupt output file, starting fresh: %s", e)
    return {
        "metadata": {
            "source": "Nairobi GIS Hub (nairobimaps.com)",
            "scrape_date": None,
            "total_mappings": 0,
        },
        "mappings": [],
    }


def save_output(data: Dict):
    data["metadata"]["scrape_date"] = datetime.now().isoformat()
    data["metadata"]["total_mappings"] = len(data["mappings"])
    tmp = OUTPUT_FILE.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    tmp.replace(OUTPUT_FILE)


# -- HTTP HELPERS -------------------------------------------------------------

def _backoff_sleep(attempt: int, base_delay: float = 2.0, cap: float = 120.0):
    """Exponential backoff with jitter, capped at `cap` seconds."""
    import random
    delay = min(base_delay * (2 ** attempt), cap)
    # Add up to 25% jitter to prevent thundering herd
    delay += random.uniform(0, delay * 0.25)
    time.sleep(delay)


def fetch_json(url: str, params: Dict = None) -> Optional[Dict]:
    """
    Fetch a JSON response from a URL with retry and backoff.
    Handles 403 (Forbidden) and 429 (Too Many Requests) with exponential backoff.
    Returns None on failure.
    """
    for attempt in range(MAX_RETRIES + 1):
        try:
            response = requests.get(
                url, headers=HEADERS, params=params, timeout=REQUEST_TIMEOUT
            )

            if response.status_code in (403, 429):
                retry_after = response.headers.get("Retry-After")
                if retry_after:
                    try:
                        wait = int(retry_after)
                    except ValueError:
                        wait = _query_delay * (2 ** attempt)
                else:
                    wait = _query_delay * (2 ** attempt)
                wait = min(wait, 120)
                logger.warning(
                    "%d at %s -- backing off %ds (attempt %d/%d)",
                    response.status_code, url[:80], wait, attempt + 1, MAX_RETRIES + 1,
                )
                time.sleep(wait)
                continue

            if response.status_code == 404:
                return None

            response.raise_for_status()

            # ArcGIS sometimes returns HTML even with f=json; check content type
            ct = response.headers.get("Content-Type", "")
            if "json" in ct or "javascript" in ct:
                return response.json()
            # Try parsing anyway
            try:
                return response.json()
            except ValueError:
                logger.warning("Non-JSON response from %s (Content-Type: %s)", url[:80], ct)
                return None

        except requests.ConnectionError as e:
            logger.warning("Connection error for %s: %s", url[:80], e)
            if attempt < MAX_RETRIES:
                _backoff_sleep(attempt)
            else:
                logger.error("Failed after %d attempts (connection): %s", MAX_RETRIES + 1, url[:80])
                return None

        except requests.Timeout:
            logger.warning("Timeout for %s (attempt %d/%d)", url[:80], attempt + 1, MAX_RETRIES + 1)
            if attempt < MAX_RETRIES:
                _backoff_sleep(attempt)
            else:
                logger.error("Failed after %d attempts (timeout): %s", MAX_RETRIES + 1, url[:80])
                return None

        except requests.RequestException as e:
            logger.warning("Request error for %s: %s", url[:80], e)
            if attempt < MAX_RETRIES:
                _backoff_sleep(attempt)
            else:
                logger.error("Failed after %d attempts: %s -- %s", MAX_RETRIES + 1, url[:80], e)
                return None

    return None


def fetch_text(url: str) -> Optional[str]:
    """Fetch raw text from a URL with retry and backoff."""
    for attempt in range(MAX_RETRIES + 1):
        try:
            response = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
            if response.status_code == 404:
                return None
            if response.status_code in (403, 429):
                if attempt < MAX_RETRIES:
                    _backoff_sleep(attempt)
                    continue
                return None
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            if attempt < MAX_RETRIES:
                _backoff_sleep(attempt)
            else:
                logger.error("Failed to fetch text from %s: %s", url[:80], e)
                return None
    return None


# -- STEP 1: CHECK ROBOTS.TXT ------------------------------------------------

def check_robots_txt() -> Tuple[bool, float, float]:
    """
    Check robots.txt on the site.
    Returns (allowed, request_delay, query_delay).
    """
    print("\n[1] Checking robots.txt...")
    robots_url = "{}/robots.txt".format(SITE_URL)
    text = fetch_text(robots_url)

    req_delay = _request_delay
    qry_delay = _query_delay

    if text is None:
        print("  No robots.txt found (404) -- scraping allowed by default")
        return True, req_delay, qry_delay

    print("  robots.txt found. Contents:")
    lines = text.strip().splitlines()
    for line in lines[:30]:
        print("    {}".format(line))
    if len(lines) > 30:
        print("    ... ({} more lines)".format(len(lines) - 30))

    # Parse for our user-agent or wildcard
    current_ua = None
    disallowed_paths = []
    crawl_delay = None

    for line in lines:
        line = line.strip()
        if line.startswith("#") or not line:
            continue
        if line.lower().startswith("user-agent:"):
            current_ua = line.split(":", 1)[1].strip()
        elif line.lower().startswith("disallow:"):
            path = line.split(":", 1)[1].strip()
            if current_ua in ("*", "ArdhiVerified-GISHubBot"):
                disallowed_paths.append(path)
        elif line.lower().startswith("crawl-delay:"):
            try:
                crawl_delay = int(line.split(":", 1)[1].strip())
            except ValueError:
                pass

    if crawl_delay:
        print("  Crawl-Delay: {}s -- will respect this".format(crawl_delay))
        req_delay = max(req_delay, crawl_delay)
        qry_delay = max(qry_delay, crawl_delay)

    # Check if REST/API paths are blocked
    rest_blocked = False
    for path in disallowed_paths:
        if path == "/" or "rest" in path.lower() or "api" in path.lower():
            rest_blocked = True
            print("  WARNING: Disallow rule blocks: {}".format(path))

    if rest_blocked:
        print("  STOPPING: robots.txt disallows access to REST/API endpoints")
        print("  Please contact the site administrator for data access.")
        return False, req_delay, qry_delay

    if disallowed_paths:
        print("  Disallowed paths: {}".format(disallowed_paths))
        print("  None of these block REST API access -- proceeding")
    else:
        print("  No relevant Disallow rules -- scraping allowed")

    return True, req_delay, qry_delay


# -- STEP 2: DISCOVER ARCGIS REST SERVICES -----------------------------------

def probe_site_technology() -> Dict[str, Any]:
    """
    Probe nairobimaps.com to determine what technology it uses.
    Returns a dict describing the site technology and any discovered endpoints.
    """
    print("\n[2a] Probing site technology...")
    result = {
        "technology": "unknown",
        "rest_root": None,
        "details": [],
    }

    # 1. Fetch the homepage and look for tech indicators
    homepage_text = fetch_text(SITE_URL)
    if homepage_text:
        html_lower = homepage_text.lower()

        # ArcGIS indicators
        if "arcgis" in html_lower or "esri" in html_lower:
            result["details"].append("ArcGIS/Esri references found in HTML")
        if "dojo" in html_lower:
            result["details"].append("Dojo toolkit detected (common with ArcGIS)")
        if "mapserver" in html_lower or "featureserver" in html_lower:
            result["details"].append("MapServer/FeatureServer references in HTML")

        # Leaflet / OpenLayers / MapLibre / Google Maps
        if "leaflet" in html_lower:
            result["details"].append("Leaflet.js detected")
        if "openlayers" in html_lower:
            result["details"].append("OpenLayers detected")
        if "maplibre" in html_lower or "mapbox" in html_lower:
            result["details"].append("MapLibre/Mapbox detected")
        if "maps.googleapis.com" in html_lower:
            result["details"].append("Google Maps API detected")

        # GeoServer / QGIS Server / WMS / WFS
        if "geoserver" in html_lower:
            result["details"].append("GeoServer detected")
            result["technology"] = "geoserver"
        if "wms" in html_lower and "getcapabilities" in html_lower:
            result["details"].append("WMS GetCapabilities detected")
        if "wfs" in html_lower:
            result["details"].append("WFS detected")

        # Look for REST service URLs embedded in JS
        import re as _re
        rest_urls = _re.findall(
            r'["\']([^"\']*(?:rest/services|FeatureServer|MapServer)[^"\']*)["\']',
            homepage_text,
        )
        if rest_urls:
            result["details"].append("REST URLs found in page source:")
            for u in rest_urls[:5]:
                result["details"].append("  {}".format(u))

    for detail in result["details"]:
        print("  {}".format(detail))

    if not result["details"]:
        print("  No technology indicators found on homepage")

    return result


def discover_rest_root() -> Optional[str]:
    """
    Probe common ArcGIS REST paths to find the services directory.
    Returns the base REST URL or None.
    """
    print("\n[2b] Discovering ArcGIS REST services directory...")

    for path in ARCGIS_REST_PATHS:
        url = "{}{}".format(SITE_URL, path)
        print("  Probing {}...".format(url))
        data = fetch_json(url, params={"f": "json"})
        if data and ("services" in data or "folders" in data):
            print("  Found REST root: {}".format(url))
            return url
        time.sleep(_request_delay)

    # Also try if the portal itself serves the REST API at /sharing/rest
    sharing_url = "{}/sharing/rest".format(SITE_URL)
    print("  Probing {}...".format(sharing_url))
    data = fetch_json(sharing_url, params={"f": "json"})
    if data:
        print("  Found ArcGIS sharing REST endpoint")
        return sharing_url
    time.sleep(_request_delay)

    # Try /sharing/rest/portals/self to check for Portal
    portal_self = "{}/sharing/rest/portals/self".format(SITE_URL)
    print("  Probing {} (portal self)...".format(portal_self))
    data = fetch_json(portal_self, params={"f": "json"})
    if data and data.get("name"):
        print("  Found ArcGIS Portal: {}".format(data.get("name")))
        # The portal may host services at a different URL
        servers_url = data.get("helperServices", {}).get("geocode", [{}])
        if isinstance(servers_url, list) and servers_url:
            server_base = servers_url[0].get("url", "")
            if "/rest/" in server_base:
                rest_root = server_base.split("/rest/")[0] + "/rest/services"
                print("  Derived REST root: {}".format(rest_root))
                return rest_root
    time.sleep(_request_delay)

    return None


def discover_services(rest_root: str) -> List[Dict]:
    """
    Enumerate all MapServer/FeatureServer services from the REST root.
    Recursively enters folders.
    """
    print("\n[3] Enumerating services...")
    services = []
    visited = set()

    def _enumerate(url: str, depth: int = 0):
        if depth > 4:
            return
        if url in visited:
            return
        visited.add(url)

        data = fetch_json(url, params={"f": "json"})
        if not data:
            return

        # Process services at this level
        for svc in data.get("services", []):
            svc_name = svc.get("name", "")
            svc_type = svc.get("type", "")
            if svc_type in ("MapServer", "FeatureServer"):
                svc_url = "{}/{}/{}".format(rest_root, svc_name, svc_type)
                services.append({
                    "name": svc_name,
                    "type": svc_type,
                    "url": svc_url,
                })
                print("    {} ({})".format(svc_name, svc_type))

        # Recurse into folders
        for folder in data.get("folders", []):
            folder_url = "{}/{}".format(url, folder)
            print("  Entering folder: {}".format(folder))
            time.sleep(_request_delay)
            _enumerate(folder_url, depth + 1)

    _enumerate(rest_root)
    return services


def discover_layers(service: Dict) -> List[Dict]:
    """
    Get layers within a MapServer/FeatureServer that might contain
    parcel/LR/block data based on layer name keywords.
    """
    data = fetch_json(service["url"], params={"f": "json"})
    if not data:
        return []

    layers = []
    for layer in data.get("layers", []) + data.get("tables", []):
        layer_name = (layer.get("name") or "").lower()
        layer_id = layer.get("id")

        # Check if layer name matches any of our keywords
        relevant = any(kw in layer_name for kw in LAYER_KEYWORDS)
        if relevant:
            layer_url = "{}/{}".format(service["url"], layer_id)
            layers.append({
                "name": layer.get("name"),
                "id": layer_id,
                "url": layer_url,
                "service_name": service["name"],
                "service_type": service["type"],
            })
            print("    * Relevant layer: {} (id={})".format(layer.get("name"), layer_id))

    return layers


# -- STEP 3: DISCOVER LAYERS VIA AGOL SEARCH (FALLBACK) ----------------------

def discover_via_agol_search() -> List[Dict]:
    """
    If the portal is backed by ArcGIS Online, search for Nairobi
    parcel/RIM layers using the AGOL search API.
    """
    print("\n[3b] Searching ArcGIS Online for Nairobi parcel layers...")
    layers = []
    seen_ids = set()

    search_queries = [
        'title:"nairobi" type:"Feature Service" (parcel OR block OR "registry index")',
        'title:"nairobi" type:"Map Service" (RIM OR "survey plan" OR cadastr)',
        'owner:NairobiGIS type:"Feature Service"',
        'orgid:nairobimaps type:"Feature Service"',
        'title:"nairobi" type:"Feature Service" ("LR" OR "land registration")',
        'title:"nairobi block" type:"Feature Service"',
        'title:"nairobi" type:"Feature Service" (allotment OR subdivision OR "deed plan")',
    ]

    for query in search_queries:
        print("  Query: {}".format(query[:80]))
        start = 1
        while True:
            data = fetch_json(AGOL_SEARCH_URL, params={
                "q": query,
                "f": "json",
                "num": 100,
                "start": start,
            })
            if not data or "results" not in data:
                break

            results = data.get("results", [])
            if not results:
                break

            for result in results:
                title = result.get("title", "")
                item_url = result.get("url", "")
                item_id = result.get("id", "")
                item_type = result.get("type", "")

                if not item_url or item_id in seen_ids:
                    continue

                seen_ids.add(item_id)
                print("    Found: {} ({})".format(title, item_type))
                layers.append({
                    "name": title,
                    "id": item_id,
                    "url": item_url,
                    "service_name": title,
                    "service_type": item_type,
                    "source": "agol_search",
                })

            # Paginate AGOL search
            next_start = data.get("nextStart", -1)
            if next_start == -1 or next_start <= start:
                break
            start = next_start
            time.sleep(_request_delay)

        time.sleep(_request_delay)

    return layers


# -- STEP 4: INSPECT LAYER FIELDS AND QUERY DATA -----------------------------

def _matches_patterns(field_name: str, patterns: List[str]) -> bool:
    """Check if a field name matches any of the regex patterns."""
    name_lower = field_name.lower()
    for pattern in patterns:
        if re.search(pattern, name_lower):
            return True
    return False


def inspect_layer_fields(layer_url: str) -> Dict[str, Any]:
    """
    Get the layer metadata and identify LR and block number fields.
    Returns dict with lr_fields, block_fields, and all field info.
    """
    data = fetch_json(layer_url, params={"f": "json"})
    if not data:
        return {"lr_fields": [], "block_fields": [], "all_fields": [], "max_record_count": 1000}

    fields = data.get("fields", [])
    max_count = data.get("maxRecordCount", MAX_FEATURES_PER_QUERY)

    lr_fields = []
    block_fields = []

    for field in fields:
        fname = field.get("name", "")
        ftype = field.get("type", "")
        falias = field.get("alias", "")

        # Check both name and alias
        check_name = fname + " " + falias

        if _matches_patterns(check_name, LR_FIELD_PATTERNS):
            lr_fields.append(fname)
        if _matches_patterns(check_name, BLOCK_FIELD_PATTERNS):
            block_fields.append(fname)

    return {
        "lr_fields": lr_fields,
        "block_fields": block_fields,
        "all_fields": [
            {"name": f.get("name"), "type": f.get("type"), "alias": f.get("alias")}
            for f in fields
        ],
        "max_record_count": min(max_count, MAX_FEATURES_PER_QUERY),
    }


def _extract_lr_from_value(raw: str) -> Optional[str]:
    """
    Extract a normalized LR number from a raw attribute value.
    Handles: "LR No. 1234/56", "L.R. NO. 12807/214", "I.R. 12345",
             "209/21922" (bare numeric from a known LR field).
    """
    raw = str(raw).strip()
    if not raw or raw.lower() in ("none", "null", "n/a", "0", "-"):
        return None

    # Try structured LR pattern first
    m = LR_VALUE_PATTERN.search(raw)
    if m:
        prefix_match = re.match(r"(L\.?R\.?|I\.?R\.?|F\.?R\.?)", raw, re.IGNORECASE)
        prefix = prefix_match.group(1).upper().replace(".", "") if prefix_match else "LR"
        # Normalize prefix: L.R. -> LR, I.R. -> IR
        prefix = prefix.replace(".", "")
        return "{} {}".format(prefix, m.group(1))

    # Bare numeric from a known LR field
    m = LR_BARE_NUMERIC.match(raw)
    if m:
        return "LR {}".format(m.group(1))

    return None


def _extract_block_from_value(raw: str) -> Optional[str]:
    """
    Extract a normalized block number from a raw attribute value.
    Handles: "Nairobi Block 45/78", "NAIROBI/BLOCK/45/78",
             "Block 12/456", "45/78" (bare from known block field).
    """
    raw = str(raw).strip()
    if not raw or raw.lower() in ("none", "null", "n/a", "0", "-"):
        return None

    # Try structured block pattern
    m = BLOCK_VALUE_PATTERN.search(raw)
    if m:
        return m.group(1)

    # Slash-separated: "NAIROBI/BLOCK/45/78"
    slash_m = re.match(
        r"(?:NAIROBI\s*/\s*)?BLOCK\s*/\s*([\d]+(?:/[\d]+)*)",
        raw,
        re.IGNORECASE,
    )
    if slash_m:
        return slash_m.group(1)

    # Bare numeric from a known block field
    m = BLOCK_BARE_NUMERIC.match(raw)
    if m:
        return m.group(1)

    return None


def query_layer_features(
    layer_url: str,
    lr_field: str,
    block_field: str,
    max_record_count: int,
) -> List[Dict]:
    """
    Query all features from a layer, paginating through results.
    Extracts LR number and block number from each feature.
    Returns list of {lr_number, block_number} dicts.

    Uses resultOffset pagination and falls back to objectId-based
    pagination if the server does not support resultOffset.
    """
    mappings = []
    offset = 0
    total_fetched = 0
    out_fields = "{},{}".format(lr_field, block_field)
    use_oid_pagination = False
    last_oid = 0

    while total_fetched < MAX_TOTAL_FEATURES:
        if use_oid_pagination:
            params = {
                "f": "json",
                "where": "OBJECTID > {}".format(last_oid),
                "outFields": out_fields + ",OBJECTID",
                "returnGeometry": "false",
                "resultRecordCount": max_record_count,
                "orderByFields": "OBJECTID ASC",
            }
        else:
            params = {
                "f": "json",
                "where": "1=1",
                "outFields": out_fields,
                "returnGeometry": "false",
                "resultOffset": offset,
                "resultRecordCount": max_record_count,
            }

        print("    Querying offset={}...".format(offset if not use_oid_pagination else "OID>{}".format(last_oid)))
        data = fetch_json(layer_url + "/query", params=params)

        if not data:
            print("    No response at offset {}".format(offset))
            break

        # Check for ArcGIS error responses
        if "error" in data:
            error_msg = data["error"].get("message", "")
            error_code = data["error"].get("code", 0)
            logger.warning("ArcGIS error at %s: [%d] %s", layer_url[:60], error_code, error_msg)

            # If resultOffset not supported, switch to OID pagination
            if "resultOffset" in error_msg.lower() or error_code == 400:
                if not use_oid_pagination:
                    print("    Server does not support resultOffset -- switching to OID pagination")
                    use_oid_pagination = True
                    continue
            break

        features = data.get("features", [])
        if not features:
            break

        for feature in features:
            attrs = feature.get("attributes", {})
            lr_val = attrs.get(lr_field)
            block_val = attrs.get(block_field)

            lr_str = _extract_lr_from_value(lr_val) if lr_val is not None else None
            block_str = _extract_block_from_value(block_val) if block_val is not None else None

            if lr_str and block_str:
                mappings.append({
                    "lr_number": lr_str,
                    "block_number": block_str,
                })

            # Track last OID for OID-based pagination
            oid = attrs.get("OBJECTID") or attrs.get("objectid") or attrs.get("FID")
            if oid is not None:
                last_oid = max(last_oid, int(oid))

        total_fetched += len(features)
        print("    Fetched {} features ({} total, {} valid mappings)".format(
            len(features), total_fetched, len(mappings)
        ))

        # If we got fewer than max, we've reached the end
        if len(features) < max_record_count:
            break

        offset += max_record_count
        time.sleep(_query_delay)

    return mappings


def query_layer_all_fields(
    layer_url: str,
    field_info: Dict,
    max_record_count: int,
) -> List[Dict]:
    """
    Fallback: query all string fields and try to extract LR/block
    patterns from the values using regex.
    """
    # Get all string-type fields
    string_fields = [
        f["name"] for f in field_info["all_fields"]
        if f.get("type") in (
            "esriFieldTypeString",
            "esriFieldTypeSmallInteger",
            "esriFieldTypeInteger",
        )
    ]
    if not string_fields:
        return []

    out_fields = ",".join(string_fields[:15])  # Limit fields to avoid huge responses

    # Expanded regex patterns for value-level extraction
    lr_pattern = re.compile(
        r"(?:L\.?R\.?|I\.?R\.?|F\.?R\.?)\s*(?:No\.?)?\s*([\d]+(?:[/\-][\d]+)*)",
        re.IGNORECASE,
    )
    block_pattern = re.compile(
        r"(?:"
        r"(?:NAIROBI\s*[/\s]\s*)?"
        r"(?:Block|BLK)\s*(?:No\.?)?\s*[/\s]?\s*"
        r")"
        r"([\d]+(?:[/\-][\d]+)*)",
        re.IGNORECASE,
    )

    mappings = []
    offset = 0
    total_fetched = 0

    while total_fetched < MAX_TOTAL_FEATURES:
        params = {
            "f": "json",
            "where": "1=1",
            "outFields": out_fields,
            "returnGeometry": "false",
            "resultOffset": offset,
            "resultRecordCount": max_record_count,
        }

        data = fetch_json(layer_url + "/query", params=params)
        if not data or "features" not in data:
            break

        features = data["features"]
        if not features:
            break

        for feature in features:
            attrs = feature.get("attributes", {})
            # Concatenate all string values and search for patterns
            all_text = " ".join(
                str(v) for v in attrs.values()
                if v is not None
            )
            lr_matches = lr_pattern.findall(all_text)
            block_matches = block_pattern.findall(all_text)

            if lr_matches and block_matches:
                for lr in lr_matches:
                    for block in block_matches:
                        mappings.append({
                            "lr_number": "LR {}".format(lr.strip()),
                            "block_number": block.strip(),
                        })

        total_fetched += len(features)

        if len(features) < max_record_count:
            break

        offset += max_record_count
        time.sleep(_query_delay)

    return mappings


# -- STEP 5: DEDUPLICATE AND NORMALIZE ---------------------------------------

def normalize_lr(lr: str) -> str:
    """
    Normalize an LR number string for consistent storage.

    Input examples:
        "LR No. 1234/56"     -> "LR 1234/56"
        "L.R. NO. 12807/214" -> "LR 12807/214"
        "I.R. 12345"         -> "IR 12345"
        "LR 209/21922"       -> "LR 209/21922"
        "F.R. 1234"          -> "FR 1234"
    """
    lr = lr.strip()
    # Extract prefix and number
    m = re.match(
        r"^(L\.?R\.?|I\.?R\.?|F\.?R\.?)\s*(?:No\.?)?\s*(.+)$",
        lr,
        flags=re.IGNORECASE,
    )
    if m:
        prefix = m.group(1).upper().replace(".", "")
        number = m.group(2).strip()
        return "{} {}".format(prefix, number)

    # Collapse whitespace for anything else
    lr = re.sub(r"\s+", " ", lr)
    return lr.strip()


def normalize_block(block: str) -> str:
    """
    Normalize a block number string.

    Input examples:
        "Nairobi Block 45/78"      -> "45/78"
        "NAIROBI/BLOCK/45/78"      -> "45/78"
        "Block No. 12/456"         -> "12/456"
        "45/78"                    -> "45/78"
    """
    block = block.strip()
    # Strip leading "Nairobi" / "NAIROBI/" prefix
    block = re.sub(
        r"^(?:NAIROBI\s*[/\s]\s*)?(?:Block|BLK)\s*(?:No\.?)?\s*[/\s]?\s*",
        "",
        block,
        flags=re.IGNORECASE,
    )
    # Also strip standalone "NAIROBI/" prefix if block was "NAIROBI/45/78"
    block = re.sub(r"^NAIROBI\s*/\s*", "", block, flags=re.IGNORECASE)
    return block.strip()


def deduplicate_mappings(mappings: List[Dict]) -> List[Dict]:
    """Remove duplicate LR-to-block mappings, keeping the first occurrence."""
    seen = set()
    unique = []
    for m in mappings:
        key = (m["lr_number"], m["block_number"])
        if key not in seen:
            seen.add(key)
            unique.append(m)
    return unique


# -- MAIN --------------------------------------------------------------------

def main():
    global _request_delay, _query_delay

    print("=" * 60)
    print("ARDHI VERIFIED -- Nairobi GIS Hub Scraper")
    print("Target: {} (ArcGIS REST)".format(SITE_URL))
    print("=" * 60)

    processed = load_processed()
    output = load_output()

    # Step 1: Check robots.txt
    if not processed.get("robots_checked"):
        allowed, _request_delay, _query_delay = check_robots_txt()
        if not allowed:
            print("\nABORTED: robots.txt disallows scraping.")
            sys.exit(1)
        processed["robots_checked"] = True
        save_processed(processed)
    else:
        print("\n[1] robots.txt already checked -- skipping")

    # Step 2: Probe site technology first
    site_info = probe_site_technology()

    # Step 2b: Discover REST services
    rest_root = processed.get("discovered_rest_root")
    if rest_root:
        print("\n[2b] Using previously discovered REST root: {}".format(rest_root))
    else:
        rest_root = discover_rest_root()
        if rest_root:
            processed["discovered_rest_root"] = rest_root
            save_processed(processed)

    all_layers = []

    if rest_root:
        # Enumerate services and find relevant layers
        services = discover_services(rest_root)
        print("\n  Found {} services total".format(len(services)))

        for svc in services:
            time.sleep(_request_delay)
            layers = discover_layers(svc)
            all_layers.extend(layers)
    else:
        print("  No standard ArcGIS REST root found on {}".format(SITE_URL))

    # Step 3b: Fallback -- try AGOL search
    if not all_layers:
        agol_layers = discover_via_agol_search()
        all_layers.extend(agol_layers)

    if not all_layers:
        print("\nNo relevant layers found. The site structure may have changed.")
        print("Manual inspection of {} is recommended.".format(SITE_URL))
        print("\nTips:")
        print("  1. Visit {} in a browser".format(SITE_URL))
        print("  2. Open the browser DevTools Network tab")
        print("  3. Look for requests to /arcgis/rest/services or /server/rest")
        print("  4. Update ARCGIS_REST_PATHS in this script with the correct path")
        if site_info["details"]:
            print("\nSite technology probing found:")
            for d in site_info["details"]:
                print("  {}".format(d))
        sys.exit(0)

    # Filter out already-processed layers
    processed_urls = set(processed.get("processed_layers", []))
    pending = [l for l in all_layers if l["url"] not in processed_urls]

    print("\n" + "=" * 60)
    print("Relevant layers found: {}".format(len(all_layers)))
    print("Already processed: {}".format(len(all_layers) - len(pending)))
    print("Pending: {}".format(len(pending)))
    print("=" * 60)

    # Step 4: Inspect and query each layer
    new_mappings = []

    for i, layer in enumerate(pending):
        print("\n" + "-" * 60)
        print("[{}/{}] {}".format(i + 1, len(pending), layer["name"]))
        print("  URL: {}".format(layer["url"]))

        time.sleep(_request_delay)

        # Inspect fields
        field_info = inspect_layer_fields(layer["url"])
        lr_fields = field_info["lr_fields"]
        block_fields = field_info["block_fields"]
        max_count = field_info["max_record_count"]

        print("  Fields found: {}".format(len(field_info["all_fields"])))
        if field_info["all_fields"]:
            print("  All fields: {}".format(
                ", ".join(f["name"] for f in field_info["all_fields"][:20])
            ))
        print("  LR fields: {}".format(lr_fields or "(none)"))
        print("  Block fields: {}".format(block_fields or "(none)"))

        if lr_fields and block_fields:
            # Try all combinations of LR x Block fields
            # (some layers may have multiple relevant fields)
            mappings = []
            tried = set()
            for lr_field in lr_fields:
                for block_field in block_fields:
                    pair = (lr_field, block_field)
                    if pair in tried:
                        continue
                    tried.add(pair)
                    print("  Querying: {} -> {}".format(lr_field, block_field))
                    pair_mappings = query_layer_features(
                        layer["url"], lr_field, block_field, max_count
                    )
                    mappings.extend(pair_mappings)

        elif field_info["all_fields"]:
            # Fallback: scan all string fields for LR/block patterns
            print("  No direct LR/Block fields -- scanning all fields with regex...")
            mappings = query_layer_all_fields(
                layer["url"], field_info, max_count
            )
        else:
            print("  No queryable fields found -- skipping")
            mappings = []

        if mappings:
            # Normalize
            for m in mappings:
                m["lr_number"] = normalize_lr(m["lr_number"])
                m["block_number"] = normalize_block(m["block_number"])
                m["source_layer"] = layer["name"]
                m["source_url"] = layer["url"]
                m["scraped_at"] = datetime.now().isoformat()

            new_mappings.extend(mappings)
            print("  Extracted {} LR-to-block mappings".format(len(mappings)))
        else:
            print("  No mappings extracted from this layer")

        # Mark as processed
        processed.setdefault("processed_layers", []).append(layer["url"])
        save_processed(processed)

        # Incremental save
        output["mappings"].extend(mappings)
        save_output(output)

    # Step 5: Deduplicate
    print("\n" + "=" * 60)
    print("Deduplicating...")
    before = len(output["mappings"])
    output["mappings"] = deduplicate_mappings(output["mappings"])
    after = len(output["mappings"])
    print("  Before: {} / After: {} (removed {} duplicates)".format(
        before, after, before - after
    ))
    save_output(output)

    # Summary
    print("\n" + "=" * 60)
    print("DONE")
    print("  Total unique mappings: {}".format(len(output["mappings"])))
    print("  Layers processed: {}".format(len(processed.get("processed_layers", []))))
    print("  Output: {}".format(OUTPUT_FILE))
    print("  Error log: {}".format(ERROR_LOG))

    # Show sample mappings
    if output["mappings"]:
        print("\n  Sample mappings:")
        for m in output["mappings"][:10]:
            print("    {} -> Block {}".format(m["lr_number"], m["block_number"]))
        if len(output["mappings"]) > 10:
            print("    ... and {} more".format(len(output["mappings"]) - 10))

    print("=" * 60)


if __name__ == "__main__":
    main()
