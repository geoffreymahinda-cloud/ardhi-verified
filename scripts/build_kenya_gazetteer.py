"""
Ardhi Verified — Kenya Gazetteer Builder
==========================================
Builds a 5-level administrative hierarchy for Kenya:
  County → Sub-county (Constituency) → Ward → Location → Sub-location

Sources:
  1. P-CODES.xlsx (American Red Cross, CC BY 4.0)
     — 1,456 rows of County → Constituency → Ward (modern 2013+ system)
  2. KNBS 2009 Census Volume 1 sublocations CSV (CC0)
     — 7,150 rows of Province → District → Division → Location → Sublocation
     (pre-2010 system — requires district-to-county bridge)

Output: scripts/kenya_places.json

Usage:
  python3 scripts/build_kenya_gazetteer.py
"""

import csv
import json
import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    print("ERROR: openpyxl not installed. Run: pip install openpyxl")
    sys.exit(1)

PCODES_FILE = "/tmp/ken_hdx/pcodes.xlsx"
SUBLOCATIONS_FILE = "/tmp/ken_hdx/sublocations.csv"
OUTPUT_FILE = Path(__file__).parent / "kenya_places.json"

# ── 1. Manual district-to-county bridge (old 2009 → new 2013+) ──────────
# Built from Kenya Constitution 2010 schedules + post-2012 reorganisation.
DISTRICT_TO_COUNTY = {
    # Pre-2010 districts that don't share name with their 2013 county
    "BONDO": "Siaya",
    "BORABU": "Nyamira",
    "BUNYALA": "Busia",
    "BURET": "Kericho",
    "BUTERE": "Kakamega",
    "CHALBI": "Marsabit",
    "EAST POKOT": "Baringo",
    "ELDORET EAST": "Uasin Gishu",
    "ELDORET WEST": "Uasin Gishu",
    "EMUHAYA": "Vihiga",
    "FAFI": "Garissa",
    "GARBATULLA": "Isiolo",
    "GATANGA": "Murang'a",
    "GATUNDU": "Kiambu",
    "GITHUNGURI": "Kiambu",
    "GUCHA": "Kisii",
    "GUCHA SOUTH": "Kisii",
    "HAMISI": "Vihiga",
    "HOMABAY": "Homa Bay",
    "IGEMBE": "Meru",
    "IJARA": "Garissa",
    "IMENTI NORTH": "Meru",
    "IMENTI SOUTH": "Meru",
    "KALOLENI": "Kilifi",
    "KANGUNDO": "Machakos",
    "KEIYO": "Elgeyo-Marakwet",
    "KIBWEZI": "Makueni",
    "KIKUYU": "Kiambu",
    "KILINDINI": "Mombasa",
    "KINANGO": "Kwale",
    "KIPKELION": "Kericho",
    "KOIBATEK": "Baringo",
    "KURIA EAST": "Migori",
    "KURIA WEST": "Migori",
    "KWANZA": "Trans-Nzoia",
    "KYUSO": "Kitui",
    "LAGDERA": "Garissa",
    "LAISAMIS": "Marsabit",
    "LARI": "Kiambu",
    "LOITOKITOK": "Kajiado",
    "LUGARI": "Kakamega",
    "MAARA": "Tharaka-Nithi",
    "MALINDI": "Kilifi",
    "MANGA": "Nyamira",
    "MARAKWET": "Elgeyo-Marakwet",
    "MASABA": "Nyamira",
    "MBEERE": "Embu",
    "MBOONI": "Makueni",
    "MOLO": "Nakuru",
    "MOYALE": "Marsabit",
    "MSAMBWENI": "Kwale",
    "MT. ELGON": "Bungoma",
    "MUMIAS": "Kakamega",
    "MURANGA NORTH": "Murang'a",
    "MURANGA SOUTH": "Murang'a",
    "MUTOMO": "Kitui",
    "MWALA": "Machakos",
    "MWINGI": "Kitui",
    "NAIROBI EAST": "Nairobi",
    "NAIROBI NORTH": "Nairobi",
    "NAIROBI WEST": "Nairobi",
    "NAIVASHA": "Nakuru",
    "NYANDO": "Kisumu",
    "NZAUI": "Makueni",
    "POKOT CENTRAL": "West Pokot",
    "POKOT NORTH": "West Pokot",
    "RACHUONYO": "Homa Bay",
    "RARIEDA": "Siaya",
    "RONGO": "Migori",
    "RUIRU": "Kiambu",
    "SAMIA": "Busia",
    "SOTIK": "Bomet",
    "SUBA": "Homa Bay",
    "TAITA": "Taita-Taveta",
    "TANA DELTA": "Tana River",
    "TAVETA": "Taita-Taveta",
    "TESO NORTH": "Busia",
    "TESO SOUTH": "Busia",
    "THARAKA": "Tharaka-Nithi",
    "THIKA EAST": "Kiambu",
    "THIKA WEST": "Kiambu",
    "TIGANIA": "Meru",
    "TINDERET": "Nandi",
    "TRANS MARA": "Narok",
    "TRANS NZOIA EAST": "Trans-Nzoia",
    "TRANS NZOIA WEST": "Trans-Nzoia",
    "WARENG": "Uasin Gishu",
    "WESTLANDS": "Nairobi",
    "YATTA": "Machakos",
    # Sub-districts that share a county stem but need normalisation
    "NYERI SOUTH": "Nyeri",
    "NYERI NORTH": "Nyeri",
    "NAKURU NORTH": "Nakuru",
    "NANDI NORTH": "Nandi",
    "NANDI EAST": "Nandi",
    "NANDI SOUTH": "Nandi",
    "NANDI CENTRAL": "Nandi",
    "KWALE SOUTH": "Kwale",
    "KWALE NORTH": "Kwale",
    "LAMU EAST": "Lamu",
    "LAMU WEST": "Lamu",
    "MERU SOUTH": "Meru",
    "MERU NORTH": "Meru",
    "MERU CENTRAL": "Meru",
    "NORTH HORR": "Marsabit",
    "ISIOLO NORTH": "Isiolo",
    "ISIOLO SOUTH": "Isiolo",
    "KISUMU EAST": "Kisumu",
    "KISUMU WEST": "Kisumu",
    "KISUMU NORTH": "Kisumu",
    "KISII CENTRAL": "Kisii",
    "KISII SOUTH": "Kisii",
    "KISII NORTH": "Kisii",
    "MAKUENI": "Makueni",
    "MACHAKOS": "Machakos",
    "MAKADARA": "Nairobi",
    "LANGATA": "Nairobi",
    "DAGORETTI": "Nairobi",
    "STAREHE": "Nairobi",
    "KASARANI": "Nairobi",
    "EMBAKASI": "Nairobi",
    "KAMUKUNJI": "Nairobi",
    "MUKURWE-INI": "Nyeri",
    "KIENI": "Nyeri",
    "MATHIRA": "Nyeri",
    "OTHAYA": "Nyeri",
    "TETU": "Nyeri",  # Tetu is a constituency/former division in Nyeri
    "KIAMBAA": "Kiambu",
    "KIRINYAGA EAST": "Kirinyaga",
    "KIRINYAGA WEST": "Kirinyaga",
    "KIRINYAGA CENTRAL": "Kirinyaga",
    "KIRINYAGA SOUTH": "Kirinyaga",
    "MOMBASA": "Mombasa",
    "KISAUNI": "Mombasa",
    "LIKONI": "Mombasa",
    "CHANGAMWE": "Mombasa",
}

# Normalise county name spelling
def normalise_county(raw: str) -> str:
    if not raw: return ""
    name = raw.strip().upper()
    mapping = {
        "ELGEYO/MARAKWET": "Elgeyo-Marakwet",
        "ELGEYO MARAKWET": "Elgeyo-Marakwet",
        "HOMA BAY": "Homa Bay",
        "MURANG'A": "Murang'a",
        "MURANGA": "Murang'a",
        "NAIROBI CITY": "Nairobi",
        "TAITA TAVETA": "Taita-Taveta",
        "TAITA-TAVETA": "Taita-Taveta",
        "THARAKA - NITHI": "Tharaka-Nithi",
        "THARAKA-NITHI": "Tharaka-Nithi",
        "TRANS NZOIA": "Trans-Nzoia",
        "TRANS-NZOIA": "Trans-Nzoia",
        "WEST POKOT": "West Pokot",
        "TANA RIVER": "Tana River",
        "UASIN GISHU": "Uasin Gishu",
    }
    if name in mapping: return mapping[name]
    # Skip non-county entries in p-codes file
    if name in ("DIASPORA", "PRISONS"): return ""
    return name.title()


def load_pcodes() -> list:
    """Load County → Constituency → Ward from p-codes.xlsx"""
    wb = openpyxl.load_workbook(PCODES_FILE)
    ws = wb.active
    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        county_code, county_name, const_code, const_name, ward_code, ward_name = row[:6]
        county = normalise_county(str(county_name or ""))
        if not county: continue

        rows.append({
            "place_name": county,
            "place_type": "county",
            "county_name": county,
            "county_code": int(county_code) if county_code else None,
            "subcounty_name": None,
            "ward_name": None,
            "source": "pcodes",
        })
        rows.append({
            "place_name": str(const_name).strip().title() if const_name else "",
            "place_type": "subcounty",
            "county_name": county,
            "county_code": int(county_code) if county_code else None,
            "subcounty_name": str(const_name).strip().title() if const_name else None,
            "ward_name": None,
            "source": "pcodes",
        })
        rows.append({
            "place_name": str(ward_name).strip().title() if ward_name else "",
            "place_type": "ward",
            "county_name": county,
            "county_code": int(county_code) if county_code else None,
            "subcounty_name": str(const_name).strip().title() if const_name else None,
            "ward_name": str(ward_name).strip().title() if ward_name else None,
            "source": "pcodes",
        })
    return rows


def load_sublocations() -> list:
    """Load Location + Sub-location from KNBS 2009 CSV."""
    rows = []
    with open(SUBLOCATIONS_FILE, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            district = str(r.get("District", "")).strip().upper()
            location = str(r.get("Location", "")).strip()
            sublocation = str(r.get("Sublocation", "")).strip()
            division = str(r.get("Division", "")).strip()

            # Resolve county
            county = None
            if district in DISTRICT_TO_COUNTY:
                county = DISTRICT_TO_COUNTY[district]
            else:
                # Try stem match
                stem = district.split()[0]
                known_counties = {
                    "BARINGO", "BOMET", "BUNGOMA", "BUSIA", "EMBU", "GARISSA",
                    "ISIOLO", "KAJIADO", "KAKAMEGA", "KERICHO", "KIAMBU",
                    "KILIFI", "KIRINYAGA", "KISII", "KISUMU", "KITUI", "KWALE",
                    "LAIKIPIA", "LAMU", "MACHAKOS", "MAKUENI", "MANDERA",
                    "MARSABIT", "MERU", "MIGORI", "MOMBASA", "NAKURU",
                    "NANDI", "NAROK", "NYAMIRA", "NYANDARUA", "NYERI",
                    "SAMBURU", "SIAYA", "TURKANA", "VIHIGA", "WAJIR",
                }
                if stem in known_counties:
                    county = stem.title()

            if not county:
                continue  # Skip sublocations we can't place

            if location and location not in ("", "0"):
                rows.append({
                    "place_name": location.title(),
                    "place_type": "location",
                    "county_name": county,
                    "county_code": None,
                    "subcounty_name": division.title() if division else None,
                    "ward_name": None,
                    "source": "knbs_2009",
                })
            if sublocation and sublocation not in ("", "0"):
                rows.append({
                    "place_name": sublocation.title(),
                    "place_type": "sublocation",
                    "county_name": county,
                    "county_code": None,
                    "subcounty_name": division.title() if division else None,
                    "ward_name": None,
                    "source": "knbs_2009",
                })
    return rows


def build_aliases(place_name: str) -> list:
    """Generate alternative spellings for a place name."""
    if not place_name: return []
    aliases = {place_name, place_name.upper(), place_name.lower()}
    # Strip punctuation
    stripped = place_name.replace("-", " ").replace("'", "").replace("/", " ")
    aliases.add(stripped)
    aliases.add(stripped.upper())
    # Compact (no spaces)
    aliases.add(place_name.replace(" ", "").upper())
    aliases.add(stripped.replace(" ", "").upper())
    return sorted(a for a in aliases if a and a != place_name)


def main():
    print("=" * 60)
    print("Kenya Gazetteer Builder")
    print("=" * 60)

    pcode_rows = load_pcodes()
    subloc_rows = load_sublocations()

    # Deduplicate by (place_name, place_type, county_name)
    seen = set()
    unique = []
    for r in pcode_rows + subloc_rows:
        if not r["place_name"]: continue
        key = (r["place_name"].upper(), r["place_type"], r["county_name"])
        if key in seen: continue
        seen.add(key)
        r["aliases"] = build_aliases(r["place_name"])
        unique.append(r)

    # Stats
    by_type = {}
    by_county = {}
    for r in unique:
        by_type[r["place_type"]] = by_type.get(r["place_type"], 0) + 1
        by_county[r["county_name"]] = by_county.get(r["county_name"], 0) + 1

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(unique, f, ensure_ascii=False, indent=2)

    print(f"\nTotal places: {len(unique)}")
    print("\nBy type:")
    for t, n in sorted(by_type.items(), key=lambda x: -x[1]):
        print(f"  {t}: {n}")
    print(f"\nCounties covered: {len(by_county)}")
    print(f"Output: {OUTPUT_FILE}")

    # Smoke test: find TETU, MUTHUAINI
    print("\n=== Smoke test ===")
    for token in ["Tetu", "Muthuaini", "Muthua-Ini", "Ruiru", "Nanyuki"]:
        hits = [r for r in unique if token.upper() in r["place_name"].upper() or token.upper() in [a.upper() for a in r["aliases"]]]
        if hits:
            print(f"  {token}: {len(hits)} match(es) — top: {hits[0]['place_name']} ({hits[0]['place_type']}) in {hits[0]['county_name']}")
        else:
            print(f"  {token}: NO MATCH")


if __name__ == "__main__":
    main()
