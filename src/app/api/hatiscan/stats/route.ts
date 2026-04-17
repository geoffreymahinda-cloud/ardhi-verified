import { createServiceClient } from "@/lib/supabase/service";

// Always fetch fresh — reads from stats_cache (instant)
export const dynamic = "force-dynamic";

export async function GET() {
  const db = createServiceClient();

  // Reads from stats_cache table via RPC — no COUNT(*) queries, no timeout
  const { data, error } = await db.rpc("get_coverage_stats");

  if (error || !data) {
    console.error("get_coverage_stats failed:", error?.message);
    return Response.json(
      {
        elc_cases: 0,
        gazette_notices: 0,
        riparian_zones: 0,
        road_reserves: 0,
        apartment_buildings: 0,
        last_updated: null,
      },
      { status: 500 }
    );
  }

  return Response.json(
    {
      elc_cases: data.elc_cases ?? 0,
      gazette_notices: data.gazette_notices ?? 0,
      riparian_zones: data.riparian_zones ?? 0,
      road_reserves: data.road_reserves ?? 0,
      apartment_buildings: data.apartment_buildings ?? 0,
      total_records: data.total_records ?? 0,
      last_updated: data.last_updated || null,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    }
  );
}
