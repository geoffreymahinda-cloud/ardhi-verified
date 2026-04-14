import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/hatiscan/spatial-check
 *
 * Accepts a GeoJSON polygon (user-drawn or extracted from survey plan)
 * and runs parcel-level spatial analysis against all risk layers.
 *
 * Returns precise overlap areas, percentages, and distances — not just
 * county-level presence flags.
 *
 * Body: { polygon: GeoJSON Feature or Geometry, parcel_reference?: string }
 */
export async function POST(request: NextRequest) {
  let body: {
    polygon: GeoJSON.Feature | GeoJSON.Geometry;
    parcel_reference?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.polygon) {
    return Response.json(
      { error: "Missing required field: polygon (GeoJSON)" },
      { status: 400 }
    );
  }

  // Extract geometry from Feature or raw Geometry
  const geometry =
    body.polygon.type === "Feature"
      ? (body.polygon as GeoJSON.Feature).geometry
      : (body.polygon as GeoJSON.Geometry);

  if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
    return Response.json(
      { error: "Polygon or MultiPolygon geometry required" },
      { status: 400 }
    );
  }

  // Convert GeoJSON coordinates to WKT
  const coords = (geometry as GeoJSON.Polygon).coordinates[0];
  if (!coords || coords.length < 4) {
    return Response.json(
      { error: "Polygon must have at least 3 vertices" },
      { status: 400 }
    );
  }

  const wkt = `POLYGON((${coords.map((c) => `${c[0]} ${c[1]}`).join(", ")}))`;

  // Calculate area from coordinates (approximate)
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

  const db = getSupabase();

  // Run the spatial analysis RPC
  const { data: risks, error } = await db.rpc("analyse_parcel_spatial_risks", {
    p_wkt: wkt,
    p_srid: 4326,
  });

  if (error) {
    console.error("[SpatialCheck] RPC error:", error.message);
    return Response.json(
      { error: `Spatial analysis failed: ${error.message}` },
      { status: 500 }
    );
  }

  // Group risks by type
  const grouped: Record<
    string,
    Array<{
      feature_name: string;
      severity: string;
      legal_basis: string;
      overlap_sqm: number;
      overlap_percentage: number;
      distance_metres: number;
      details: Record<string, unknown>;
    }>
  > = {};

  for (const risk of risks || []) {
    if (!grouped[risk.risk_type]) grouped[risk.risk_type] = [];
    grouped[risk.risk_type].push(risk);
  }

  // Build summary
  const summary: Array<{
    risk_type: string;
    count: number;
    highest_severity: string;
    any_overlap: boolean;
    max_overlap_pct: number;
    nearest_metres: number;
  }> = [];

  const severityRank: Record<string, number> = {
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
  };

  for (const [riskType, items] of Object.entries(grouped)) {
    const sorted = [...items].sort(
      (a, b) =>
        (severityRank[a.severity] || 5) - (severityRank[b.severity] || 5)
    );
    summary.push({
      risk_type: riskType,
      count: items.length,
      highest_severity: sorted[0].severity,
      any_overlap: items.some((i) => i.overlap_percentage > 0),
      max_overlap_pct: Math.max(...items.map((i) => i.overlap_percentage)),
      nearest_metres: Math.min(...items.map((i) => i.distance_metres)),
    });
  }

  // Overall verdict
  type RiskRow = { overlap_percentage: number; severity: string; distance_metres: number; risk_type: string; feature_name: string; overlap_sqm: number; legal_basis: string; details: Record<string, unknown> };
  const riskRows = (risks || []) as RiskRow[];
  const hasDirectOverlap = riskRows.some(
    (r) =>
      r.overlap_percentage > 0 &&
      (r.severity === "critical" || r.severity === "high")
  );
  const hasNearbyRisk = riskRows.some(
    (r) => r.distance_metres < 100 && r.severity !== "low"
  );

  let spatialVerdict: "clear" | "caution" | "high_risk" | "critical";
  if (hasDirectOverlap) {
    spatialVerdict = "critical";
  } else if (hasNearbyRisk) {
    spatialVerdict = "high_risk";
  } else if ((risks || []).length > 0) {
    spatialVerdict = "caution";
  } else {
    spatialVerdict = "clear";
  }

  // Store in spatial_risk_results if parcel reference provided
  if (body.parcel_reference && riskRows.length > 0) {
    const insertRows = riskRows
      .filter((r) => r.overlap_percentage > 0 || r.distance_metres < 200)
      .map((r) => ({
        parcel_reference: body.parcel_reference!.trim().substring(0, 100),
        risk_type: r.risk_type,
        zone_name: r.feature_name,
        severity: r.severity,
        overlap_area: r.overlap_sqm,
        overlap_percentage: r.overlap_percentage,
        distance_metres: r.distance_metres,
        legal_basis: r.legal_basis,
        details: r.details,
        analysed_at: new Date().toISOString(),
      }));

    if (insertRows.length > 0) {
      await db.from("spatial_risk_results").insert(insertRows);
    }
  }

  return Response.json(
    {
      spatial_verdict: spatialVerdict,
      total_risks_found: (risks || []).length,
      parcel_center: { lat: centerLat, lng: centerLng },
      parcel_wkt: wkt,
      summary,
      risks: grouped,
      analysed_at: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
