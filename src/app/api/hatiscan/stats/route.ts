import { createClient } from "@supabase/supabase-js";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Always fetch fresh — counts change as scrapers run
export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();

  // Single RPC call to get_coverage_stats() — runs as SECURITY DEFINER,
  // bypasses RLS and PostgREST count-query issues on anon role.
  const { data, error } = await db.rpc("get_coverage_stats");

  if (error || !data) {
    console.error("get_coverage_stats failed:", error?.message);
    return Response.json(
      {
        elc_cases: 0,
        gazette_notices: 0,
        riparian_zones: 0,
        road_reserves: 0,
        elc_judgements: 0,
        last_updated: null,
        updated_frequency: "Weekly",
        error: error?.message || "Failed to fetch stats",
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
      elc_judgements: 0,
      counties_live: data.counties_live ?? 0,
      counties_watch: data.counties_watch ?? 0,
      total_records: data.total_records ?? 0,
      last_updated: data.last_updated || null,
      updated_frequency: "Weekly",
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    }
  );
}
