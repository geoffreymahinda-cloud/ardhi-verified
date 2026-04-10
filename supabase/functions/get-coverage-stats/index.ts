// Supabase Edge Function: get-coverage-stats
// =================================================
// Returns live intelligence coverage stats for the
// HatiScan marketing page — no hardcoded figures anywhere.
//
// Deploy:
//   supabase functions deploy get-coverage-stats
//
// Invoke:
//   curl 'https://<project>.supabase.co/functions/v1/get-coverage-stats'
//
// Response:
// {
//   "elc_cases": 44084,
//   "gazette_notices": 45073,
//   "riparian_zones": 7316,
//   "road_reserves": 854,
//   "counties_live": 2,
//   "counties_watch": 15,
//   "total_records": 97327,
//   "last_updated": "2026-04-10T..."
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data, error } = await supabase.rpc("get_coverage_stats");

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
