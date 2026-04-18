import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/intelligence/county-risk
 *
 * Returns the county risk index for all 47 Kenya counties.
 * Data is read from the mv_county_risk_index materialized view
 * which is refreshed weekly (Monday 06:00 EAT).
 *
 * Query params:
 *   ?county=Nairobi  — filter to a single county (case-insensitive)
 *   ?band=CRITICAL   — filter by risk band
 *   ?limit=10        — limit results (default: all 47)
 *
 * Response: JSON array sorted by composite_score descending.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const county = url.searchParams.get("county");
  const band = url.searchParams.get("band");
  const limit = parseInt(url.searchParams.get("limit") || "47", 10);

  let query = supabase
    .from("mv_county_risk_index")
    .select("*")
    .order("composite_score", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 47));

  if (county) {
    query = query.ilike("county_name", county);
  }
  if (band) {
    query = query.eq("risk_band", band.toUpperCase());
  }

  const { data, error } = await query;

  if (error) {
    console.error("[county-risk] query failed:", error.message);
    return Response.json({ error: "Failed to fetch county risk data" }, { status: 500 });
  }

  return Response.json(
    {
      counties: data ?? [],
      meta: {
        total: data?.length ?? 0,
        computed_at: data?.[0]?.computed_at ?? null,
        methodology: {
          components: [
            { name: "legal_disputes", weight: 25, source: "elc_cases" },
            { name: "gazette_alerts", weight: 25, source: "gazette_notices" },
            { name: "acquisition_pressure", weight: 15, source: "nlc_acquisitions" },
            { name: "spatial_risk", weight: 20, source: "road_reserves + flood_zones + riparian_zones + forest_reserves + protected_zones" },
            { name: "community_concern", weight: 15, source: "community_flags" },
          ],
          normalization: "log-scaled density per 1,000 km²",
          bands: { LOW: "0-19", MODERATE: "20-39", ELEVATED: "40-59", HIGH: "60-79", CRITICAL: "80-100" },
        },
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    }
  );
}
