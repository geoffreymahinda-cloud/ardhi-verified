import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  calculateTrustScore,
  type TrustScoreInput,
} from "@/lib/trust-score";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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
  const db = getSupabase();

  // ── Query all data sources in parallel ────────────────────────────────
  const [elcRes, elcTextRes, gazetteRes, communityRes, rimRes, judgementRes] =
    await Promise.all([
      db
        .from("elc_cases")
        .select("case_number, parties, outcome, court_station, parcel_reference")
        .contains("parcel_reference", [sanitized]),
      db
        .from("elc_cases")
        .select("case_number, parties, outcome, court_station, parcel_reference")
        .filter("parcel_reference", "cs", `{${sanitized}}`),
      db
        .from("gazette_notices")
        .select("notice_type, parcel_reference, alert_level, summary")
        .contains("parcel_reference", [sanitized]),
      db
        .from("community_flags")
        .select("category, county, description, status")
        .or(`description.ilike.%${sanitized}%,county.ilike.%${sanitized}%`),
      db
        .from("parcel_rim_records")
        .select("boundary_match_status, mutation_detected, mutation_date, verified_at")
        .eq("parcel_reference", sanitized)
        .order("verified_at", { ascending: false })
        .limit(1),
      db
        .from("elc_judgements")
        .select("case_number, parties, outcome, judgement_date, court_station")
        .or(`full_text.ilike.%${sanitized}%,parcel_references.cs.{${sanitized}}`)
        .limit(10),
    ]);

  // ── Deduplicate ELC cases ─────────────────────────────────────────────
  const allElc = [...(elcRes.data || []), ...(elcTextRes.data || [])];
  const seenCases = new Set<string>();
  const uniqueElc = allElc.filter((c) => {
    const key = c.case_number || JSON.stringify(c);
    if (seenCases.has(key)) return false;
    seenCases.add(key);
    return true;
  });
  const elcCount = uniqueElc.length;

  // ── Classify gazette notices ──────────────────────────────────────────
  const gazetteResults = gazetteRes.data || [];
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

  // ── Classify community flags ──────────────────────────────────────────
  const communityResults = communityRes.data || [];
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

  // ── RIM status ────────────────────────────────────────────────────────
  const rimRecord = rimRes.data?.[0];
  let rimStatus: TrustScoreInput["rimStatus"] = "unverified";
  let mutationTitleCurrent = false;
  if (rimRecord) {
    rimStatus = rimRecord.boundary_match_status as TrustScoreInput["rimStatus"];
    if (rimRecord.mutation_detected && rimRecord.mutation_date) {
      // If mutation is recent (within last year), title is likely current
      const mutDate = new Date(rimRecord.mutation_date);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      mutationTitleCurrent = mutDate > oneYearAgo;
    }
  }

  // ── Calculate trust score ─────────────────────────────────────────────
  const result = calculateTrustScore({
    elcCases: elcCount,
    gazetteAcquisitions: gazetteCriticalCount,
    gazetteGeneral: gazetteGeneralCount,
    communityFlagsHigh: flagHighCount,
    communityFlagsMedium: flagMediumCount,
    communityFlagsLow: flagLowCount,
    hatiscanAnomalies: 0,
    hatiscanTitleMismatch: false,
    rimStatus,
    mutationTitleCurrent,
    advocateSigned: false,
  });

  // ── Process judgement matches ──────────────────────────────────────────
  const judgementMatches = judgementRes.data || [];
  const judgementCount = judgementMatches.length;

  // ── Build detail strings for backward compatibility ───────────────────
  const gazetteCount = gazetteResults.length;
  const communityCount = communityResults.length;

  const breakdown = {
    elc_detail:
      elcCount === 0
        ? "No court cases found involving this parcel"
        : `${elcCount} court case${elcCount > 1 ? "s" : ""} found — ${uniqueElc
            .slice(0, 3)
            .map((c) => `${c.parties || c.case_number} (${c.court_station})`)
            .join("; ")}${elcCount > 3 ? ` and ${elcCount - 3} more` : ""}`,
    judgement_detail:
      judgementCount === 0
        ? "No full judgement text mentions this parcel"
        : `${judgementCount} judgement${judgementCount > 1 ? "s" : ""} mention this parcel — ${judgementMatches
            .slice(0, 3)
            .map((j) => `${j.parties || j.case_number} (${j.court_station})`)
            .join("; ")}${judgementCount > 3 ? ` and ${judgementCount - 3} more` : ""}`,
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
            flagHighCount > 0 ? ` (${flagHighCount} high severity)` : ""
          }`,
    rim_detail: result.breakdown.rimDetail,
  };

  // ── Insert report record ──────────────────────────────────────────────
  const checkedAt = new Date().toISOString();

  const { data: inserted, error: insertError } = await db
    .from("hatiscan_reports")
    .insert({
      parcel_reference: sanitized,
      trust_score: result.score,
      verdict: result.verdict,
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

  // ── Response ──────────────────────────────────────────────────────────
  return Response.json(
    {
      report_number: reportNumber,
      trust_score: result.score,
      verdict: result.verdict,
      rim_verified: result.rimVerified,
      complete_verified: result.completeVerified,
      elc_cases_found: elcCount,
      judgement_matches: judgementCount,
      gazette_hits: gazetteCount,
      community_flags: communityCount,
      breakdown,
      checked_at: checkedAt,
      parcel_reference: sanitized,
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
