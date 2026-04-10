// Supabase Edge Function: scan-county-registry
// =================================================
// Scans a single county's intelligence coverage.
// Calls the scan_county_registry() Postgres RPC function.
//
// Deploy:
//   supabase functions deploy scan-county-registry
//
// Invoke:
//   curl -X POST \
//     'https://<project>.supabase.co/functions/v1/scan-county-registry' \
//     -H 'Authorization: Bearer <anon-key>' \
//     -H 'Content-Type: application/json' \
//     -d '{"county_name":"Nairobi"}'

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let countyName: string | undefined;

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      countyName = body.county_name;
    } else {
      const url = new URL(req.url);
      countyName = url.searchParams.get("county_name") ?? undefined;
    }

    if (!countyName) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: county_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase.rpc("scan_county_registry", {
      p_county_name: countyName,
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
