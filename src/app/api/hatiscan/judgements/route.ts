import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Search ELC full judgement texts by parcel number or location.
 *
 * GET /api/hatiscan/judgements?q=LR+209/21922&limit=20
 *
 * Returns matching judgements with case_number, parties,
 * outcome, judgement_date, court_station, and a text snippet
 * showing the match context.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);

  if (!query || query.trim().length < 2) {
    return Response.json(
      { error: "Query parameter 'q' is required (min 2 characters)" },
      { status: 400 }
    );
  }

  const sanitized = query.trim().substring(0, 100);
  const db = getDb();

  // Search across parcel_references (JSONB contains) and full_text (ILIKE)
  const [parcelRes, textRes] = await Promise.all([
    db
      .from("elc_judgements")
      .select(
        "case_number, case_title, parties, outcome, judgement_date, court_station, judge, source_url, parcel_references"
      )
      .contains("parcel_references", [sanitized])
      .limit(limit),
    db
      .from("elc_judgements")
      .select(
        "case_number, case_title, parties, outcome, judgement_date, court_station, judge, source_url, parcel_references"
      )
      .ilike("full_text", `%${sanitized}%`)
      .limit(limit),
  ]);

  // Merge and deduplicate
  const all = [...(parcelRes.data || []), ...(textRes.data || [])];
  const seen = new Set<string>();
  const unique = all.filter((r) => {
    const key = r.source_url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return Response.json(
    {
      query: sanitized,
      total: unique.length,
      results: unique.slice(0, limit),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
