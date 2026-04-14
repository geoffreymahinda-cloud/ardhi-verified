import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// ── Claude Survey Plan Extraction Prompt ────────────────────────────────
// Moved server-side — no API key exposure to the browser.

const SURVEY_PROMPT = `You are HatiScan's Survey Plan Intelligence Engine. You analyse land survey documents — deed plans, PDPs (Plot Development Plans), mutation forms, and survey plans — from African countries.

Extract all geometric and parcel intelligence. Return ONLY valid JSON, no preamble, no markdown:

{
  "parcel_reference": "as written on the document",
  "survey_reference": "survey plan number or mutation number",
  "country": "detected country",
  "county_district": "county or district",
  "area_ha": "numeric area in hectares or null",
  "area_acres": "numeric area in acres if shown or null",
  "confidence": "High|Medium|Low",
  "geometry_method": "BearingDistance|Coordinates|Mixed|Sketch",

  "bearings": [
    {
      "line": "line identifier e.g. A-B",
      "bearing": "bearing as written e.g. N 45° 30' E",
      "bearing_decimal": "bearing in decimal degrees from north",
      "distance_m": "distance in metres",
      "from_point": "start point label",
      "to_point": "end point label"
    }
  ],

  "corner_coordinates": [
    {
      "point": "corner point label e.g. A, B, 1, 2",
      "easting": "easting in metres (local grid) or longitude",
      "northing": "northing in metres (local grid) or latitude",
      "coordinate_system": "UTM|Local|WGS84|Unknown"
    }
  ],

  "datum_reference": "datum or coordinate system noted e.g. Arc 1960 Kenya Grid",
  "scale": "plan scale if noted e.g. 1:2500",
  "survey_date": "date of survey",
  "surveyor": "licensed surveyor name and reg number",
  "adjacent_parcels": ["LR numbers of adjacent parcels if shown"],
  "beacons": ["beacon numbers if shown e.g. B.M. 1234"],

  "wgs84_polygon": {
    "available": true or false,
    "coordinates": [[lon,lat],[lon,lat],...],
    "method": "how coordinates were derived or converted",
    "centroid": [lon, lat],
    "notes": "any assumptions made in coordinate conversion"
  },

  "flags": [
    {
      "type": "Warning|Info|Error",
      "message": "specific issue with this survey document"
    }
  ],

  "summary": "2-3 sentence professional summary of this survey document"
}

GEOMETRY CONVERSION RULES:
- If WGS84 coordinates are directly available: use them directly
- If Kenya Grid (Arc 1960) coordinates: convert to WGS84 approximately using Helmert transform: lat = (northing - 10000000) / 110540 + offset, lon = (easting - 500000) / 111320 + 37.0 (Kenya central meridian)
- If UTM Zone 37S (EPSG:32737): convert to WGS84 using standard UTM inverse projection
- If only bearings/distances: compute polygon vertices relative to first point, then attempt to geolocate using county/location context. If county is known, place centroid at approximate county centre.
- If GPS coordinates in decimal degrees: use directly
- Always close the polygon (first point = last point in coordinates array)
- Always provide centroid estimate based on county/location context even if full polygon unavailable

FLAG these issues:
- Area mismatch between stated area and computed area from bearings (>5% difference)
- Missing surveyor signature or registration number
- Survey older than 10 years (may need update)
- Beacons noted as destroyed or disturbed
- Encroachment on adjacent parcel shown
- Unsigned or unstamped plan

Return ONLY the JSON.`;

// ── Helpers ─────────────────────────────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

// ── POST handler ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const country = (formData.get("country") as string) || "Kenya";
  const parcelRef = (formData.get("parcel_reference") as string) || "";

  if (!file) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/webp",
  ];
  if (!allowedTypes.includes(file.type)) {
    return Response.json(
      { error: "Unsupported file type. Use PDF, JPG, PNG, TIFF, or WebP." },
      { status: 400 }
    );
  }

  // Size limit: 20MB
  if (file.size > 20 * 1024 * 1024) {
    return Response.json(
      { error: "File too large. Maximum 20MB." },
      { status: 400 }
    );
  }

  try {
    const anthropic = getAnthropic();
    const buffer = Buffer.from(await file.arrayBuffer());
    const b64 = buffer.toString("base64");

    // Build the content block based on file type
    const isPdf = file.type === "application/pdf";
    const contentBlock = isPdf
      ? ({
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: b64,
          },
        })
      : ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
            data: b64,
          },
        });

    console.log(
      `[SurveyParse] Processing ${file.name} (${(file.size / 1024).toFixed(1)}KB, ${file.type})`
    );

    // ── Call Claude ──────────────────────────────────────────────────
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: SURVEY_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            {
              type: "text",
              text: `Country: ${country}\nParcel Reference: ${parcelRef || "Unknown"}\n\nExtract all geometric intelligence from this survey document.`,
            },
          ],
        },
      ],
    });

    // Parse Claude's response
    const rawText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const jsonStr = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(jsonStr);

    console.log(
      `[SurveyParse] Extracted: ref=${result.parcel_reference}, method=${result.geometry_method}, confidence=${result.confidence}, polygon=${result.wgs84_polygon?.available}`
    );

    // ── Store polygon in parcels table if coordinates available ────
    const db = getSupabase();
    let storedParcelRef: string | null = null;

    if (
      result.wgs84_polygon?.available &&
      result.wgs84_polygon.coordinates?.length >= 3
    ) {
      const coords = result.wgs84_polygon.coordinates;
      // Ensure polygon is closed
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coords.push([...first]);
      }

      const wkt = `POLYGON((${coords.map((c: number[]) => `${c[0]} ${c[1]}`).join(", ")}))`;
      const ref =
        (result.parcel_reference || parcelRef || "").trim().substring(0, 100) ||
        `SURVEY-${Date.now()}`;

      const { error: insertError } = await db.rpc("insert_survey_parcel", {
        p_ref: ref,
        p_wkt: wkt,
        p_county: result.county_district || null,
        p_area_ha: result.area_ha ? parseFloat(result.area_ha) : null,
        p_country: result.country || country,
      });

      if (insertError) {
        // Fallback: try direct insert
        await db.from("parcels").upsert(
          {
            parcel_reference: ref,
            country: result.country || country,
            county_district: result.county_district || null,
            area_ha: result.area_ha ? parseFloat(result.area_ha) : null,
            tenure_type: "survey_extracted",
            land_use: null,
            owner_name: null,
            hati_score: null,
          },
          { onConflict: "parcel_reference" }
        );
        console.log(
          `[SurveyParse] Stored parcel ${ref} (without geom — RPC not available)`
        );
      } else {
        console.log(`[SurveyParse] Stored parcel ${ref} with PostGIS geometry`);
      }
      storedParcelRef = ref;

      // ── Run spatial analysis on the extracted polygon ──────────
      const { data: spatialRisks } = await db.rpc(
        "analyse_parcel_spatial_risks",
        { p_wkt: wkt, p_srid: 4326 }
      );

      if (spatialRisks && spatialRisks.length > 0) {
        result.spatial_risks = spatialRisks;
        result.spatial_verdict = computeVerdict(spatialRisks);
        console.log(
          `[SurveyParse] Spatial analysis: ${spatialRisks.length} risks, verdict=${result.spatial_verdict}`
        );

        // Store significant risks
        const significantRisks = spatialRisks.filter(
          (r: { overlap_percentage: number; distance_metres: number }) =>
            r.overlap_percentage > 0 || r.distance_metres < 200
        );
        if (significantRisks.length > 0) {
          await db.from("spatial_risk_results").insert(
            significantRisks.map(
              (r: {
                risk_type: string;
                feature_name: string;
                severity: string;
                overlap_sqm: number;
                overlap_percentage: number;
                distance_metres: number;
                legal_basis: string;
                details: Record<string, unknown>;
              }) => ({
                parcel_reference: ref,
                risk_type: r.risk_type,
                zone_name: r.feature_name,
                severity: r.severity,
                overlap_area: r.overlap_sqm,
                overlap_percentage: r.overlap_percentage,
                distance_metres: r.distance_metres,
                legal_basis: r.legal_basis,
                details: r.details,
                analysed_at: new Date().toISOString(),
              })
            )
          );
        }
      }
    }

    return Response.json(
      {
        ...result,
        stored_parcel_reference: storedParcelRef,
        file_name: file.name,
        file_size_kb: Math.round(file.size / 1024),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[SurveyParse] Error: ${msg}`);
    return Response.json(
      { error: `Survey parsing failed: ${msg}` },
      { status: 500 }
    );
  }
}

function computeVerdict(
  risks: Array<{ overlap_percentage: number; severity: string; distance_metres: number }>
): string {
  const hasDirectOverlap = risks.some(
    (r) =>
      r.overlap_percentage > 0 &&
      (r.severity === "critical" || r.severity === "high")
  );
  const hasNearbyRisk = risks.some(
    (r) => r.distance_metres < 100 && r.severity !== "low"
  );
  if (hasDirectOverlap) return "critical";
  if (hasNearbyRisk) return "high_risk";
  if (risks.length > 0) return "caution";
  return "clear";
}
