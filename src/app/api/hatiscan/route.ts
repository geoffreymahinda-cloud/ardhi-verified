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

  // ── Extract location keywords for road reserve check ───────────────────
  // Parse county, area names from the parcel reference for road proximity check
  const locationKeywords = sanitized
    .replace(/[\/\-_.]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^\d+$/.test(w));

  // ── Water keyword detection — flag if parcel description mentions water
  const WATER_REGEX = /\b(river|lake|stream|spring|dam|marsh|wetland|swamp|creek|brook|lagoon|shore|beach|bank|water|riparian)\b/i;
  const mentionsWater = WATER_REGEX.test(sanitized);

  // ── Query all data sources in parallel ────────────────────────────────
  const [elcRes, elcTextRes, gazetteRes, communityRes, rimRes, judgementRes, roadRes, roadAcqRes, riparianRes] =
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
      // Road reserves — match by county or area name from parcel reference
      locationKeywords.length > 0
        ? db
            .from("road_reserves")
            .select("road_name, road_number, road_class, reserve_width_metres, counties, route_description")
            .or(
              locationKeywords
                .slice(0, 3)
                .map((kw) => `route_description.ilike.%${kw}%,road_name.ilike.%${kw}%`)
                .join(",")
            )
            .limit(10)
        : Promise.resolve({ data: [], error: null }),
      // Road acquisition gazette notices — match by parcel or location
      locationKeywords.length > 0
        ? db
            .from("road_acquisition_notices")
            .select("description, road_agency, county, gazette_year")
            .or(
              locationKeywords
                .slice(0, 3)
                .map((kw) => `description.ilike.%${kw}%`)
                .join(",")
            )
            .limit(5)
        : Promise.resolve({ data: [], error: null }),
      // Riparian zones — match river names by location keywords
      locationKeywords.length > 0
        ? db
            .from("riparian_zones")
            .select("name, water_type, buffer_metres, county")
            .or(
              locationKeywords
                .slice(0, 3)
                .map((kw) => `name.ilike.%${kw}%,county.ilike.%${kw}%`)
                .join(",")
            )
            .limit(5)
        : Promise.resolve({ data: [], error: null }),
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

  // ── Road reserve check ───────────────────────────────────────────────
  const roadMatches = roadRes.data || [];
  const roadReserveFlag = roadMatches.length > 0;

  // ── Road acquisition gazette check ──────────────────────────────────
  const roadAcqMatches = roadAcqRes.data || [];
  const roadAcquisitionFlag = roadAcqMatches.length > 0;

  // ── Riparian zone check ─────────────────────────────────────────────
  const riparianMatches = riparianRes.data || [];
  const riparianFlag = riparianMatches.length > 0 || mentionsWater;

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
    road_reserve_detail: !roadReserveFlag
      ? "No known road reserves in this area"
      : `WARNING: ${roadMatches.length} road corridor${roadMatches.length > 1 ? "s" : ""} found nearby — ${roadMatches
          .slice(0, 3)
          .map(
            (r) =>
              `${r.road_name} (Class ${r.road_class}, ${r.reserve_width_metres}m reserve)`
          )
          .join("; ")}. Land within a road reserve cannot legally be sold as freehold.`,
    road_acquisition_detail: !roadAcquisitionFlag
      ? "No gazette road acquisition notices in this area"
      : `HIGH RISK: ${roadAcqMatches.length} gazette road acquisition notice${roadAcqMatches.length > 1 ? "s" : ""} found — ${roadAcqMatches
          .slice(0, 3)
          .map((a) => `${a.road_agency} in ${a.county || "unknown county"} (${a.gazette_year})`)
          .join("; ")}. Government compulsory acquisition may affect this parcel.`,
    riparian_detail: !riparianFlag
      ? "No riparian zones detected near this location"
      : riparianMatches.length > 0
        ? `Riparian Zone Proximity — verify setback compliance. ${riparianMatches.length} water feature${riparianMatches.length > 1 ? "s" : ""} found — ${riparianMatches
            .slice(0, 3)
            .map((r) => `${r.name} (${r.water_type}, ${r.buffer_metres}m buffer)`)
            .join("; ")}. This parcel may be near a gazetted water body or riparian reserve. Kenya Water Act requires a mandatory setback. Physical beacons may not reflect gazette boundaries.`
        : `Riparian Zone Proximity — verify setback compliance. Property description mentions water features. This parcel may be near a gazetted water body or riparian reserve. Kenya Water Act requires a mandatory setback. Physical beacons may not reflect gazette boundaries.`,
  };

  // ── Structured risk items (new standardised format) ───────────────────
  const riskItems: Array<{
    label: string;
    severity: "low" | "medium" | "medium-high" | "high" | "critical";
    explanation: string;
    source: string;
  }> = [];

  if (riparianFlag) {
    riskItems.push({
      label: "Riparian Zone Proximity — verify setback compliance",
      severity: "medium-high",
      explanation:
        "This parcel may be near a gazetted water body or riparian reserve. Kenya Water Act requires a mandatory setback. Physical beacons may not reflect gazette boundaries.",
      source: riparianMatches.length > 0
        ? `${riparianMatches.length} water body match${riparianMatches.length > 1 ? "es" : ""} in riparian_zones`
        : "parcel description mentions water features",
    });
  }

  if (roadReserveFlag) {
    riskItems.push({
      label: "Road Reserve — cannot be sold as freehold",
      severity: "high",
      explanation: "Land within a classified road reserve cannot legally be sold as freehold under the Kenya Roads Act.",
      source: `${roadMatches.length} road corridor match${roadMatches.length > 1 ? "es" : ""} in road_reserves`,
    });
  }

  if (roadAcquisitionFlag) {
    riskItems.push({
      label: "Compulsory Acquisition Notice",
      severity: "critical",
      explanation: "Government compulsory acquisition may affect this parcel. Gazette notices published by road agencies.",
      source: `${roadAcqMatches.length} gazette notice${roadAcqMatches.length > 1 ? "s" : ""} in road_acquisition_notices`,
    });
  }

  if (gazetteCriticalCount > 0) {
    riskItems.push({
      label: "Gazette Caveat or Acquisition",
      severity: "high",
      explanation: "A gazette notice has been published affecting this parcel. Critical for title integrity.",
      source: `${gazetteCriticalCount} critical notice${gazetteCriticalCount > 1 ? "s" : ""} in gazette_notices`,
    });
  }

  if (elcCount > 0) {
    riskItems.push({
      label: "Active or Historical Court Case",
      severity: "high",
      explanation: "This parcel appears in one or more Environment & Land Court cases.",
      source: `${elcCount} case${elcCount > 1 ? "s" : ""} in elc_cases`,
    });
  }

  if (flagHighCount > 0) {
    riskItems.push({
      label: "Community Fraud or Dispute Report",
      severity: "high",
      explanation: "Verified community members have reported a fraud or dispute affecting this parcel.",
      source: `${flagHighCount} high-severity flag${flagHighCount > 1 ? "s" : ""} in community_flags`,
    });
  }

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
      road_reserve_flag: roadReserveFlag,
      road_reserves_nearby: roadMatches.map((r) => ({
        road_name: r.road_name,
        road_class: r.road_class,
        reserve_width_metres: r.reserve_width_metres,
      })),
      road_acquisition_flag: roadAcquisitionFlag,
      riparian_flag: riparianFlag,
      riparian_zones_nearby: riparianMatches.map((r) => ({
        name: r.name,
        water_type: r.water_type,
        buffer_metres: r.buffer_metres,
      })),
      risk_items: riskItems,
      breakdown,
      checked_at: checkedAt,
      parcel_reference: sanitized,
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
