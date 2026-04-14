# Ardhi Verified — Parcel Geometry Data Acquisition Strategy

## Why Parcel Geometry Is the Moat

County-level risk detection says "Narok has protected zones."
Parcel-level says "Your 0.5 HA plot overlaps 12% with a riparian buffer — you cannot build within 30m of the river."

The second is what banks, SACCOs, and diaspora buyers will pay for. No competitor has this for Kenya.

## Zero Dependency on Ardhisasa/NLIMS

Ardhisasa holds the title register (who owns what). We do NOT need their API. We need plot boundary geometry, which comes from entirely separate sources.

---

## Channel 1: User-Drawn Boundaries (Live Now)

**How it works:** Buyer draws their plot on a satellite map in HatiScan.

**Accuracy:** Approximate — good enough for "is this plot near a hazard?"

**Cost:** Zero per plot.

**Advantage:** Instant. Every scan can now include spatial analysis. Even a rough rectangle over the approximate area gives meaningful overlap data.

**Limitation:** Not legally defensible. The drawn boundary may not match the actual survey.

---

## Channel 2: Survey Plan Upload (High Priority — Build Next)

**How it works:** Buyer uploads their deed plan (PDP) or survey plan. Claude Vision reads the bearing-and-distance description, converts to a polygon.

**Kenya deed plans contain:**
- Bearing descriptions: "N 45° 30' E for 120.5m"
- Corner coordinates (modern plans): "UTM Zone 37S: 280450 E, 9860230 N"
- Plot area: "0.0984 HA"
- Reference point: beacon number or road junction

**Implementation:**
1. Claude extracts bearings + distances from the uploaded plan
2. Convert bearing-distance chain to a closed polygon
3. If coordinates available, use directly
4. If only relative bearings, anchor to approximate location from county/area name
5. Run spatial analysis on the resulting polygon

**Accuracy:** Survey-grade when coordinates are present. 10-50m when using bearing-distance only.

**Cost:** Zero per plot (uses existing Claude Vision calls).

**Advantage:** Leverages documents buyers already have. No external API dependency.

---

## Channel 3: Licensed Surveyor Network (Medium Priority)

**How it works:** Partner with 10-20 licensed Kenya surveyors who provide digital plot boundaries on request.

**Data format:** KML, GeoJSON, or Shapefile from their RTK GPS surveys.

**Business model:**
- Ardhi Verified offers "Verified Survey" as a premium add-on (KES 5,000-15,000)
- Surveyor gets 60%, Ardhi gets 40%
- Surveyor uploads KML to Ardhi platform
- We run spatial analysis automatically

**Target surveyors:**
- County-based land surveyors with digital workflow
- Young surveyors with RTK GPS equipment
- Survey firms already doing diaspora buyer work

**Advantage:** Legally defensible boundaries. Revenue source. Surveyor network becomes a distribution channel.

---

## Channel 4: County GIS Offices (Bulk Acquisition)

**How it works:** Purchase or license digitized cadastral data from county governments.

**Counties with known digital cadastral maps:**
- Nairobi (NCC GIS unit)
- Kiambu (digitized through World Bank program)
- Nakuru
- Mombasa
- Kisumu
- Kajiado (partial — Kitengela, Ongata Rongai)

**Approach:**
1. Formal data sharing request under Access to Information Act 2016
2. County GIS Officer meeting — offer to help digitize in exchange for data
3. Where commercial license required, negotiate per-county basis
4. Target diaspora-heavy counties first: Kiambu, Kajiado, Nakuru, Machakos

**Cost:** KES 50,000-200,000 per county for commercial license.

**Advantage:** Bulk coverage. Thousands of parcels per acquisition.

---

## Channel 5: Survey of Kenya Cadastral Sheets

**How it works:** Purchase georeferenced cadastral sheets from Survey of Kenya (SoK).

**What's available:**
- Registry Index Maps (RIMs) — shows all surveyed parcels in a registration section
- Deed plans — individual plot boundaries
- 1:2,500 and 1:10,000 scale plans

**Access:**
- SoK Ruaraka office or regional offices
- Digital copies increasingly available
- KES 1,000-5,000 per sheet

**Process:**
1. Purchase cadastral sheet for target registration section
2. Georeference using known points (road junctions, beacons)
3. Digitize parcel boundaries (manual or AI-assisted)
4. Store in parcels table with PostGIS geometry

**Advantage:** Official government data. Covers areas Ardhisasa hasn't digitized yet.

---

## Channel 6: OpenStreetMap Community Mapping

**How it works:** Organize mapathons and community mapping events to trace building/plot outlines from satellite imagery.

**Tools:** JOSM, iD editor, MapSwipe

**What it gives us:** Building footprints and land use boundaries (not legal cadastral boundaries, but useful for validation).

**Advantage:** Free. Engages Kenyan tech community. CC BY-SA license.

---

## Priority Ranking

| Channel | Impact | Cost | Time to Value | Priority |
|---------|--------|------|---------------|----------|
| User-drawn boundaries | High | Zero | Live now | Done |
| Survey plan upload | Very High | Low | 2-3 weeks | P1 |
| Surveyor network | High | Medium | 1-2 months | P2 |
| County GIS offices | Very High | Medium | 2-4 months | P2 |
| SoK cadastral sheets | High | Low-Medium | 1-3 months | P3 |
| OSM community mapping | Low | Zero | Ongoing | P4 |

---

## Data Quality Tiers

When displaying spatial analysis results, indicate the geometry source:

| Tier | Source | Accuracy | Badge |
|------|--------|----------|-------|
| Tier 1 | Licensed surveyor KML/RTK | Sub-metre | "Survey Verified" |
| Tier 2 | County GIS / SoK cadastral | 1-5 metres | "Official Boundary" |
| Tier 3 | Claude-extracted deed plan | 10-50 metres | "Deed Plan Estimate" |
| Tier 4 | User-drawn on map | 50-200 metres | "Approximate" |

Always show the tier so buyers know the confidence level.

---

## Legal Notes

- geoBoundaries (county boundaries): CC BY 4.0 — commercial use OK
- OpenStreetMap data: ODbL — commercial use OK with attribution
- HydroSHEDS: Free for non-commercial; commercial license available from WWF
- WDPA: Non-commercial research use; use OSM protected areas for commercial
- Geofabrik extracts: ODbL (same as OSM)
- Survey of Kenya data: Government of Kenya — standard purchase, no license restriction on derivative use
- County GIS data: Negotiate commercial license per county
