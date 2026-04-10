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

  const [elcRes, gazetteRes, riparianRes, roadRes, judgementRes, recentRes] =
    await Promise.all([
      db.from("elc_cases").select("*", { count: "exact", head: true }),
      db.from("gazette_notices").select("*", { count: "exact", head: true }),
      db.from("riparian_zones").select("*", { count: "exact", head: true }),
      db.from("road_reserves").select("*", { count: "exact", head: true }),
      db.from("elc_judgements").select("*", { count: "exact", head: true }),
      db
        .from("elc_cases")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

  return Response.json(
    {
      elc_cases: elcRes.count || 0,
      gazette_notices: gazetteRes.count || 0,
      riparian_zones: riparianRes.count || 0,
      road_reserves: roadRes.count || 0,
      elc_judgements: judgementRes.count || 0,
      last_updated: recentRes.data?.[0]?.created_at || null,
      updated_frequency: "Weekly",
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    }
  );
}
