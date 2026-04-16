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

// ── Rate limiting: 3 free scans per IP per day ─────────────────────────────
async function checkRateLimit(ip: string, db: ReturnType<typeof getSupabase>): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await db
    .from("hatiscan_reports")
    .select("id", { count: "exact", head: true })
    .eq("scan_tier", "free")
    .gte("created_at", today.toISOString())
    .ilike("submitter_ip", ip);

  return (count ?? 0) < 3;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const parcel = url.searchParams.get("parcel");
  const tier = url.searchParams.get("tier") || "free";
  const submitterType = url.searchParams.get("submitter_type") || "anonymous";
  const stripeSessionId = url.searchParams.get("stripe_session_id") || null;

  if (!parcel || parcel.trim().length === 0) {
    return Response.json(
      { error: "Missing required query parameter: parcel" },
      { status: 400 }
    );
  }

  const sanitized = parcel.trim().substring(0, 100);
  const db = getSupabase();

  // ── Rate limiting for free tier ──────────────────────────────────────
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (tier === "free") {
    const withinLimit = await checkRateLimit(clientIp, db);
    if (!withinLimit) {
      return Response.json(
        {
          error: "Daily free scan limit reached (3 per day). Purchase a Full Report for unlimited access.",
          rate_limited: true,
        },
        { status: 429 }
      );
    }
  }

  // ── Extract location keywords for road reserve check ───────────────────
  const locationKeywords = sanitized
    .replace(/[\/\-_.]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^\d+$/.test(w));

  // ── Water keyword detection
  const WATER_REGEX = /\b(river|lake|stream|spring|dam|marsh|wetland|swamp|creek|brook|lagoon|shore|beach|bank|water|riparian)\b/i;
  const mentionsWater = WATER_REGEX.test(sanitized);

  // ── Forest keyword detection
  const FOREST_REGEX = /\b(forest|nyika|hill|kaya|mau|arabuko|sokoke|mangrove|indigenous\s+forest)\b/i;
  const mentionsForest = FOREST_REGEX.test(sanitized);

  // ══════════════════════════════════════════════════════════════════════
  // FREE TIER: Only ELC cases (layer 1) + gazette notices (layer 3)
  // Returns summary counts, no full details, no trust score
  // ══════════════════════════════════════════════════════════════════════
  if (tier === "free") {
    const [elcRes, elcTextRes, gazetteRes] = await Promise.all([
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
        .select("notice_type, parcel_reference, alert_level, summary, county")
        .contains("parcel_reference", [sanitized]),
    ]);

    // Deduplicate ELC cases
    const allElc = [...(elcRes.data || []), ...(elcTextRes.data || [])];
    const seenCases = new Set<string>();
    const uniqueElc = allElc.filter((c) => {
      const key = c.case_number || JSON.stringify(c);
      if (seenCases.has(key)) return false;
      seenCases.add(key);
      return true;
    });

    const elcCount = uniqueElc.length;
    const gazetteResults = gazetteRes.data || [];
    const gazetteCount = gazetteResults.length;
    let gazetteCriticalCount = 0;
    for (const g of gazetteResults) {
      const noticeType = (g.notice_type || "").toLowerCase();
      if (noticeType.includes("acquisition") || noticeType.includes("caveat") || noticeType.includes("compulsory")) {
        gazetteCriticalCount++;
      }
    }

    // Determine county context from gazette data or parcel keywords
    const counties = gazetteResults.map((g) => g.county).filter(Boolean);
    const county = counties.length > 0
      ? counties[0]
      : locationKeywords.length > 0 ? locationKeywords[0] : null;

    // Free tier risk summary (high-level, no details)
    const hasCourtCases = elcCount > 0;
    const hasCriticalGazette = gazetteCriticalCount > 0;
    const freeVerdict = hasCourtCases || hasCriticalGazette
      ? "risks_found"
      : gazetteCount > 0
        ? "notices_found"
        : "no_records";

    // Store free scan for rate limiting
    const checkedAt = new Date().toISOString();
    const { data: inserted } = await db
      .from("hatiscan_reports")
      .insert({
        parcel_reference: sanitized,
        trust_score: null,
        verdict: freeVerdict,
        scan_tier: "free",
        submitter_type: submitterType,
        submitter_ip: clientIp,
        elc_cases_found: elcCount,
        gazette_hits: gazetteCount,
        community_flags: 0,
        breakdown: {
          elc_summary: elcCount === 0
            ? "No court cases found involving this parcel"
            : `${elcCount} Environment & Land Court case${elcCount > 1 ? "s" : ""} found`,
          gazette_summary: gazetteCount === 0
            ? "No gazette notices found"
            : `${gazetteCount} gazette notice${gazetteCount > 1 ? "s" : ""} found${gazetteCriticalCount > 0 ? ` (${gazetteCriticalCount} critical)` : ""}`,
        },
        checked_at: checkedAt,
      })
      .select("report_number")
      .single();

    // Check if parcel exists in structured database (basic info only for free tier)
    const { data: freeParcel } = await db
      .from("parcels")
      .select("id, lr_number, block_number, county_district, confidence_score")
      .or(`parcel_reference.eq.${sanitized},lr_number.ilike.%${sanitized}%,block_number.ilike.%${sanitized}%`)
      .limit(1)
      .single();

    return Response.json(
      {
        tier: "free",
        parcel_reference: sanitized,
        report_number: inserted?.report_number || "HS-PENDING",

        // Summary counts only — no details, no trust score
        elc_cases_found: elcCount,
        gazette_hits: gazetteCount,
        gazette_critical: gazetteCriticalCount,
        county_context: county,
        verdict: freeVerdict,

        // Basic parcel match (if found in structured database)
        parcel_match: freeParcel ? {
          lr_number: freeParcel.lr_number,
          block_number: freeParcel.block_number,
          county: freeParcel.county_district,
          confidence_score: freeParcel.confidence_score ? parseFloat(freeParcel.confidence_score) : null,
        } : null,

        // Teasers for paid content (locked)
        locked_layers: [
          "Trust Score (0-100)",
          "Ownership verification",
          "Encumbrance check",
          "Road reserve proximity check",
          "Riparian zone analysis",
          "Forest reserve overlay",
          "Protected area check",
          "Flood zone analysis",
          "NLC historical claims",
          "Community fraud flags",
          "Spatial risk assessment",
          "Full risk breakdown",
        ],

        checked_at: checkedAt,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // FULL TIER: All 12 verification layers + trust score
  // Requires prior Stripe payment (validated by /api/hatiscan/report)
  // ══════════════════════════════════════════════════════════════════════

  // ── Query all data sources in parallel ────────────────────────────────
  const [
    elcRes,
    elcTextRes,
    gazetteRes,
    communityRes,
    rimRes,
    judgementRes,
    roadRes,
    roadAcqRes,
    riparianRes,
    forestRes,
    nlcRes,
  ] =
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
      locationKeywords.length > 0
        ? db
            .from("forest_reserves")
            .select("name, county, region, gazette_ref")
            .or(
              locationKeywords
                .slice(0, 3)
                .map((kw) => `name.ilike.%${kw}%,county.ilike.%${kw}%`)
                .join(",")
            )
            .limit(5)
        : Promise.resolve({ data: [], error: null }),
      locationKeywords.length > 0
        ? db
            .from("nlc_acquisitions")
            .select("nlc_case_number, location_description, county, acquiring_authority, gazette_year")
            .or(
              locationKeywords
                .slice(0, 3)
                .map((kw) => `location_description.ilike.%${kw}%,county.ilike.%${kw}%`)
                .join(",")
            )
            .limit(5)
        : Promise.resolve({ data: [], error: null }),
    ]);

  // ── Spatial risk queries (PostGIS via RPC) ────────────────────────────
  const countyCandidate = locationKeywords[0] || null;

  const [spatialSummaryRes, protectedZonesRes, floodZonesRes] = await Promise.all([
    countyCandidate
      ? db.rpc("get_county_risk_summary", { p_county: countyCandidate })
      : Promise.resolve({ data: [], error: null }),
    locationKeywords.length > 0
      ? db
          .from("protected_zones")
          .select("name, designation, county, area_hectares, source")
          .or(
            locationKeywords
              .slice(0, 3)
              .map((kw) => `county.ilike.%${kw}%,name.ilike.%${kw}%`)
              .join(",")
          )
          .not("geom", "is", null)
          .limit(10)
      : Promise.resolve({ data: [], error: null }),
    locationKeywords.length > 0
      ? db
          .from("flood_zones")
          .select("name, zone_type, risk_level, county, source")
          .or(
            locationKeywords
              .slice(0, 3)
              .map((kw) => `county.ilike.%${kw}%`)
              .join(",")
          )
          .not("geom", "is", null)
          .limit(10)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const spatialSummary = spatialSummaryRes.data || [];
  const protectedMatches = protectedZonesRes.data || [];
  const floodMatches = floodZonesRes.data || [];

  const protectedFlag = protectedMatches.length > 0;
  const floodFlag = floodMatches.length > 0;

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
      const mutDate = new Date(rimRecord.mutation_date);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      mutationTitleCurrent = mutDate > oneYearAgo;
    }
  }

  // ── Spatial risk counts for trust score ────────────────────────────────
  const spatialCounts = {
    protectedZones: protectedMatches.length,
    floodZones: floodMatches.length,
    roadReserves: 0,
    forestReserves: 0,
  };
  for (const s of spatialSummary) {
    if (s.risk_type === "road_reserve") spatialCounts.roadReserves = Number(s.feature_count) || 0;
    if (s.risk_type === "forest_reserve") spatialCounts.forestReserves = Number(s.feature_count) || 0;
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
    spatialProtectedZones: spatialCounts.protectedZones,
    spatialFloodZones: spatialCounts.floodZones,
    spatialRoadReserves: spatialCounts.roadReserves,
    spatialForestReserves: spatialCounts.forestReserves,
  });

  // ── Process matches ───────────────────────────────────────────────────
  const judgementMatches = judgementRes.data || [];
  const judgementCount = judgementMatches.length;

  const roadMatches = roadRes.data || [];
  const roadReserveFlag = roadMatches.length > 0;

  const roadAcqMatches = roadAcqRes.data || [];
  const roadAcquisitionFlag = roadAcqMatches.length > 0;

  const riparianMatches = riparianRes.data || [];
  const riparianFlag = riparianMatches.length > 0 || mentionsWater;

  const forestMatches = forestRes.data || [];
  const forestFlag = forestMatches.length > 0 || mentionsForest;

  const nlcMatches = nlcRes.data || [];
  const nlcFlag = nlcMatches.length > 0;

  const gazetteCount = gazetteResults.length;
  const communityCount = communityResults.length;

  // ── Build breakdown strings ───────────────────────────────────────────
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
    forest_detail: !forestFlag
      ? "No forest reserves detected near this location"
      : forestMatches.length > 0
        ? `CAUTION: ${forestMatches.length} gazetted forest reserve${forestMatches.length > 1 ? "s" : ""} nearby — ${forestMatches
            .slice(0, 3)
            .map((f) => `${f.name}${f.county ? " (" + f.county + ")" : ""}${f.gazette_ref ? " — " + f.gazette_ref : ""}`)
            .join("; ")}. Land within a gazetted forest reserve cannot be privately owned under the Forest Conservation and Management Act 2016.`
        : `CAUTION: Property description mentions forest-related terms. Gazetted forest reserve land cannot be privately owned under the Forest Conservation and Management Act 2016. Verify exact boundaries before purchase.`,
    nlc_detail: !nlcFlag
      ? "No NLC historical land injustice cases matched"
      : `HISTORICAL LAND INJUSTICE FLAG: ${nlcMatches.length} NLC claim${nlcMatches.length > 1 ? "s" : ""} in this area — ${nlcMatches
          .slice(0, 3)
          .map((n) => `${n.nlc_case_number || "Case"} (${n.county || "unknown county"}, ${n.acquiring_authority || "unknown authority"})`)
          .join("; ")}. Historical claims can override private title — verify NLC determination status.`,
    protected_zone_detail: !protectedFlag
      ? "No protected zones detected in this area"
      : `PROTECTED ZONE: ${protectedMatches.length} protected area${protectedMatches.length > 1 ? "s" : ""} in this county — ${protectedMatches
          .slice(0, 3)
          .map((p) => `${p.name} (${p.designation}${p.area_hectares ? ", " + Math.round(p.area_hectares) + " ha" : ""})`)
          .join("; ")}. Land within a protected area cannot be privately owned or developed.`,
    flood_zone_detail: !floodFlag
      ? "No flood zones detected in this area"
      : `FLOOD RISK: ${floodMatches.length} flood zone${floodMatches.length > 1 ? "s" : ""} in this county — ${floodMatches
          .slice(0, 3)
          .map((f) => `${f.name || f.zone_type} (${f.risk_level} risk)`)
          .join("; ")}. Property in flood zones carries insurance, structural, and resale risks.`,
    spatial_detail: result.breakdown.spatialDetail,
  };

  // ── Structured risk items ─────────────────────────────────────────────
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
      explanation: "This parcel may be near a gazetted water body or riparian reserve. Kenya Water Act requires a mandatory setback.",
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

  if (forestFlag) {
    riskItems.push({
      label: "Forest Reserve Proximity — gazetted land",
      severity: "medium-high",
      explanation: "Land within a gazetted forest reserve cannot be privately owned under the Forest Conservation and Management Act 2016.",
      source: forestMatches.length > 0
        ? `${forestMatches.length} reserve match${forestMatches.length > 1 ? "es" : ""} in forest_reserves`
        : "parcel description mentions forest-related terms",
    });
  }

  if (nlcFlag) {
    riskItems.push({
      label: "NLC Historical Land Injustice Claim",
      severity: "high",
      explanation: "This area has active NLC historical land injustice claims on file. Historical claims under NLC determination can override private title.",
      source: `${nlcMatches.length} claim${nlcMatches.length > 1 ? "s" : ""} in nlc_acquisitions`,
    });
  }

  if (protectedFlag) {
    const hasNationalPark = protectedMatches.some(
      (p) => p.designation === "national_park" || p.designation === "strict_nature_reserve"
    );
    riskItems.push({
      label: "Protected Zone — development prohibited",
      severity: hasNationalPark ? "critical" : "high",
      explanation: "This county contains gazetted protected areas. Land within these boundaries cannot be privately owned or developed under the Wildlife Conservation & Management Act.",
      source: `${protectedMatches.length} protected area${protectedMatches.length > 1 ? "s" : ""} in protected_zones (PostGIS spatial match)`,
    });
  }

  if (floodFlag) {
    const hasHighRisk = floodMatches.some((f) => f.risk_level === "high");
    riskItems.push({
      label: "Flood Zone — insurance and structural risk",
      severity: hasHighRisk ? "high" : "medium",
      explanation: "This county has documented flood zones. Properties in flood-prone areas face higher insurance costs, structural damage risk, and lower resale values.",
      source: `${floodMatches.length} flood zone${floodMatches.length > 1 ? "s" : ""} in flood_zones (PostGIS spatial match)`,
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
      scan_tier: "full",
      submitter_type: submitterType,
      submitter_ip: clientIp,
      stripe_session_id: stripeSessionId,
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

  // ── Structured parcel data enrichment ──────────────────────────────────
  // Query the parcels table for ownership, encumbrances, and intelligence
  // layers if a matching parcel exists. This bridges HatiScan intelligence
  // with the core parcel schema.
  let parcelData = null;
  const { data: matchedParcel } = await db
    .from("parcels")
    .select("id, parcel_reference, lr_number, block_number, county_district, area_sqm, area_ha, confidence_score, data_source, is_sectional")
    .or(`parcel_reference.eq.${sanitized},lr_number.ilike.%${sanitized}%,block_number.ilike.%${sanitized}%`)
    .limit(1)
    .single();

  if (matchedParcel) {
    const [ownerRes, encumRes, intelRes] = await Promise.all([
      db.from("ownership").select("*").eq("parcel_id", matchedParcel.id).order("verified_date", { ascending: false }).limit(1),
      db.from("encumbrances").select("*").eq("parcel_id", matchedParcel.id),
      db.from("intelligence_layers").select("*").eq("parcel_id", matchedParcel.id).single(),
    ]);

    parcelData = {
      parcel_id: matchedParcel.id,
      lr_number: matchedParcel.lr_number,
      block_number: matchedParcel.block_number,
      county: matchedParcel.county_district,
      area_sqm: matchedParcel.area_sqm || (matchedParcel.area_ha ? matchedParcel.area_ha * 10000 : null),
      confidence_score: matchedParcel.confidence_score ? parseFloat(matchedParcel.confidence_score) : null,
      ownership: ownerRes.data?.[0] ? {
        owner: ownerRes.data[0].owner_name,
        owner_type: ownerRes.data[0].owner_type,
        title_type: ownerRes.data[0].title_type,
        verified_date: ownerRes.data[0].verified_date,
        source: ownerRes.data[0].source,
      } : null,
      encumbrances: (encumRes.data || []).map((e: Record<string, unknown>) => ({
        type: e.encumbrance_type,
        holder: e.holder,
        gazette_reference: e.gazette_reference,
        date_registered: e.date_registered,
      })),
      intelligence: intelRes.data ? {
        dev_pressure_index: intelRes.data.dev_pressure_index,
        flood_risk: intelRes.data.flood_risk,
        zoning_class: intelRes.data.zoning_class,
        is_sectional: intelRes.data.is_sectional,
      } : null,
      data_sources: matchedParcel.data_source ? matchedParcel.data_source.split(",").map((s: string) => s.trim()) : [],
    };
  }

  // ── Response ──────────────────────────────────────────────────────────
  return Response.json(
    {
      tier: "full",
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
      forest_flag: forestFlag,
      forest_reserves_nearby: forestMatches.map((f) => ({
        name: f.name,
        county: f.county,
        gazette_ref: f.gazette_ref,
      })),
      nlc_flag: nlcFlag,
      nlc_claims_nearby: nlcMatches.map((n) => ({
        nlc_case_number: n.nlc_case_number,
        county: n.county,
        acquiring_authority: n.acquiring_authority,
        gazette_year: n.gazette_year,
      })),
      protected_zone_flag: protectedFlag,
      protected_zones_nearby: protectedMatches.map((p) => ({
        name: p.name,
        designation: p.designation,
        county: p.county,
        area_hectares: p.area_hectares,
      })),
      flood_zone_flag: floodFlag,
      flood_zones_nearby: floodMatches.map((f) => ({
        name: f.name,
        zone_type: f.zone_type,
        risk_level: f.risk_level,
        county: f.county,
      })),
      spatial_summary: spatialSummary,
      risk_items: riskItems,
      breakdown,
      checked_at: checkedAt,
      parcel_reference: sanitized,
      parcel_data: parcelData,
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
