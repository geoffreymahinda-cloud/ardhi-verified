import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BreakdownDetail {
  elc_detail: string;
  gazette_detail: string;
  community_detail: string;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const parcel = url.searchParams.get("parcel");
  const tier = url.searchParams.get("tier") || "basic";
  const submitterType = url.searchParams.get("submitter_type") || "anonymous";

  if (!parcel || parcel.trim().length === 0) {
    return Response.json(
      { error: "Missing required query parameter: parcel" },
      { status: 400 }
    );
  }

  const sanitized = parcel.trim().substring(0, 100);

  // ── Query ELC cases ──────────────────────────────────────────────────
  const { data: elcCases } = await supabase
    .from("elc_cases")
    .select("case_number, parties, outcome, court_station, parcel_reference")
    .contains("parcel_reference", [sanitized]);

  // Also try a text search for partial matches
  const { data: elcTextMatches } = await supabase
    .from("elc_cases")
    .select("case_number, parties, outcome, court_station, parcel_reference")
    .filter("parcel_reference", "cs", `{${sanitized}}`);

  // Merge and deduplicate by case_number
  const allElc = [...(elcCases || []), ...(elcTextMatches || [])];
  const seenCases = new Set<string>();
  const uniqueElc = allElc.filter((c) => {
    const key = c.case_number || JSON.stringify(c);
    if (seenCases.has(key)) return false;
    seenCases.add(key);
    return true;
  });
  const elcCount = uniqueElc.length;

  // ── Query gazette notices ────────────────────────────────────────────
  const { data: gazetteHits } = await supabase
    .from("gazette_notices")
    .select("notice_type, parcel_reference, alert_level, summary")
    .ilike("parcel_reference", `%${sanitized}%`);

  const gazetteResults = gazetteHits || [];
  const gazetteCount = gazetteResults.length;

  let gazetteCriticalCount = 0;
  let gazetteGeneralCount = 0;
  for (const g of gazetteResults) {
    const noticeType = (g.notice_type || "").toLowerCase();
    if (
      noticeType.includes("acquisition") ||
      noticeType.includes("caveat") ||
      noticeType.includes("compulsory")
    ) {
      gazetteCriticalCount++;
    } else {
      gazetteGeneralCount++;
    }
  }

  // ── Query community flags ───────────────────────────────────────────
  const { data: communityHits } = await supabase
    .from("community_flags")
    .select("category, county, description, status")
    .or(
      `description.ilike.%${sanitized}%,county.ilike.%${sanitized}%`
    );

  const communityResults = communityHits || [];
  const communityCount = communityResults.length;

  let flagHighCount = 0;
  let flagMediumCount = 0;
  let flagLowCount = 0;
  for (const f of communityResults) {
    const cat = (f.category || "").toLowerCase();
    if (cat === "fraud_alert" || cat === "land_dispute") {
      flagHighCount++;
    } else if (cat === "agent_warning" || cat === "title_problem") {
      flagMediumCount++;
    } else {
      flagLowCount++;
    }
  }

  // ── Calculate trust score ───────────────────────────────────────────
  let score = 100;
  score -= elcCount * 15;
  score -= gazetteCriticalCount * 25;
  score -= gazetteGeneralCount * 10;
  score -= flagHighCount * 20;
  score -= flagMediumCount * 10;
  score -= flagLowCount * 5;
  score = Math.max(0, score);

  // ── Determine verdict ───────────────────────────────────────────────
  const totalHits = elcCount + gazetteCount + communityCount;
  let verdict: "clean" | "caution" | "high_risk" | "unverified";

  if (totalHits === 0) {
    verdict = "unverified";
    score = 100;
  } else if (score >= 80) {
    verdict = "clean";
  } else if (score >= 50) {
    verdict = "caution";
  } else {
    verdict = "high_risk";
  }

  // ── Build breakdown ─────────────────────────────────────────────────
  const breakdown: BreakdownDetail = {
    elc_detail:
      elcCount === 0
        ? "No court cases found involving this parcel"
        : `${elcCount} court case${elcCount > 1 ? "s" : ""} found — ${uniqueElc
            .slice(0, 3)
            .map((c) => `${c.parties || c.case_number} (${c.court_station})`)
            .join("; ")}${elcCount > 3 ? ` and ${elcCount - 3} more` : ""}`,
    gazette_detail:
      gazetteCount === 0
        ? "No gazette notices found"
        : `${gazetteCount} gazette notice${gazetteCount > 1 ? "s" : ""} found${
            gazetteCriticalCount > 0
              ? ` (${gazetteCriticalCount} critical: acquisition/caveat)`
              : ""
          }`,
    community_detail:
      communityCount === 0
        ? "No community flags reported"
        : `${communityCount} community flag${communityCount > 1 ? "s" : ""} reported${
            flagHighCount > 0
              ? ` (${flagHighCount} high severity)`
              : ""
          }`,
  };

  // ── Insert report record ────────────────────────────────────────────
  const checkedAt = new Date().toISOString();

  const { data: inserted, error: insertError } = await supabase
    .from("hatiscan_reports")
    .insert({
      parcel_reference: sanitized,
      trust_score: score,
      verdict,
      tier,
      submitter_type: submitterType,
      elc_cases_found: elcCount,
      gazette_hits: gazetteCount,
      community_flags: communityCount,
      breakdown,
      checked_at: checkedAt,
    })
    .select("report_number")
    .single();

  let reportNumber = "HS-PENDING";
  if (insertError) {
    console.error("Failed to insert hatiscan report:", insertError.message);
  } else if (inserted) {
    reportNumber = inserted.report_number;
  }

  // ── Response ────────────────────────────────────────────────────────
  return Response.json(
    {
      report_number: reportNumber,
      trust_score: score,
      verdict,
      elc_cases_found: elcCount,
      gazette_hits: gazetteCount,
      community_flags: communityCount,
      breakdown,
      checked_at: checkedAt,
      parcel_reference: sanitized,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
