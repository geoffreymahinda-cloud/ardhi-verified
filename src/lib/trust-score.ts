/**
 * Ardhi Verified — Trust Score Engine v2
 * =======================================
 * Five-layer verification scoring with RIM + advocate sign-off.
 *
 * Used by:
 *   - /api/hatiscan (parcel intelligence scan)
 *   - /api/trust-score (standalone score lookup)
 *   - /api/hatiscan/document (document analysis)
 */

export interface TrustScoreInput {
  elcCases: number;
  gazetteAcquisitions: number;
  gazetteGeneral: number;
  communityFlagsHigh: number;
  communityFlagsMedium: number;
  communityFlagsLow: number;
  hatiscanAnomalies: number;
  hatiscanTitleMismatch: boolean;
  rimStatus:
    | "unverified"
    | "confirmed"
    | "mutation_flagged"
    | "discrepancy_found";
  mutationTitleCurrent?: boolean;
  advocateSigned: boolean;
  // Spatial risk factors
  spatialProtectedZones?: number;
  spatialFloodZones?: number;
  spatialRoadReserves?: number;
  spatialRiparianZones?: number;
  spatialForestReserves?: number;
}

export interface TrustScoreResult {
  score: number;
  verdict: "clean" | "caution" | "high_risk" | "unverified";
  rimVerified: boolean;
  completeVerified: boolean;
  breakdown: {
    elcDetail: string;
    gazetteDetail: string;
    communityDetail: string;
    hatiscanDetail: string;
    rimDetail: string;
    advocateDetail: string;
    spatialDetail: string;
  };
}

export function calculateTrustScore(input: TrustScoreInput): TrustScoreResult {
  let score = 100;

  // ── Deductions ──────────────────────────────────────────────────────

  // ELC court cases: -15 each
  score -= input.elcCases * 15;

  // Gazette: acquisitions/caveats -25, general -10
  score -= input.gazetteAcquisitions * 25;
  score -= input.gazetteGeneral * 10;

  // Community flags: high -20, medium -10, low -5
  score -= input.communityFlagsHigh * 20;
  score -= input.communityFlagsMedium * 10;
  score -= input.communityFlagsLow * 5;

  // HatiScan document: -20 per anomaly, -30 for title mismatch
  score -= input.hatiscanAnomalies * 20;
  if (input.hatiscanTitleMismatch) score -= 30;

  // Spatial risk deductions
  // Protected zones (national park/forest = critical)
  if (input.spatialProtectedZones && input.spatialProtectedZones > 0) {
    score -= Math.min(input.spatialProtectedZones * 10, 25);
  }
  // Flood zones
  if (input.spatialFloodZones && input.spatialFloodZones > 0) {
    score -= Math.min(input.spatialFloodZones * 10, 20);
  }
  // Road reserves (already flagged via text, but add spatial confirmation weight)
  if (input.spatialRoadReserves && input.spatialRoadReserves > 0) {
    score -= Math.min(input.spatialRoadReserves * 5, 15);
  }
  // Forest reserves
  if (input.spatialForestReserves && input.spatialForestReserves > 0) {
    score -= Math.min(input.spatialForestReserves * 10, 20);
  }

  // RIM deductions
  if (input.rimStatus === "discrepancy_found") {
    score -= 35;
  } else if (input.rimStatus === "mutation_flagged") {
    if (input.mutationTitleCurrent) {
      score -= 5; // minor flag — title is current post-mutation
    } else {
      score -= 25; // title predates mutation
    }
  }

  // ── Bonuses (only if no deductions pushed below 100) ────────────────

  if (input.rimStatus === "confirmed" && input.advocateSigned) {
    score += 15;
  } else if (input.rimStatus === "confirmed") {
    score += 10;
  }

  // ── Clamp ───────────────────────────────────────────────────────────

  score = Math.max(0, Math.min(100, score));

  // ── Verdict ─────────────────────────────────────────────────────────

  const totalHits =
    input.elcCases +
    input.gazetteAcquisitions +
    input.gazetteGeneral +
    input.communityFlagsHigh +
    input.communityFlagsMedium +
    input.communityFlagsLow +
    input.hatiscanAnomalies +
    (input.hatiscanTitleMismatch ? 1 : 0);

  let verdict: TrustScoreResult["verdict"];
  if (totalHits === 0 && input.rimStatus === "unverified") {
    verdict = "unverified";
  } else if (score >= 80) {
    verdict = "clean";
  } else if (score >= 50) {
    verdict = "caution";
  } else {
    verdict = "high_risk";
  }

  // ── Flags ───────────────────────────────────────────────────────────

  const rimVerified = input.rimStatus === "confirmed";
  const completeVerified = rimVerified && input.advocateSigned;

  // ── Breakdown ───────────────────────────────────────────────────────

  const breakdown = {
    elcDetail:
      input.elcCases === 0
        ? "No court cases found involving this parcel"
        : `${input.elcCases} court case${input.elcCases > 1 ? "s" : ""} found (-${input.elcCases * 15} pts)`,

    gazetteDetail:
      input.gazetteAcquisitions + input.gazetteGeneral === 0
        ? "No gazette notices found"
        : `${input.gazetteAcquisitions} critical + ${input.gazetteGeneral} general gazette notice${input.gazetteAcquisitions + input.gazetteGeneral > 1 ? "s" : ""}`,

    communityDetail:
      input.communityFlagsHigh +
        input.communityFlagsMedium +
        input.communityFlagsLow ===
      0
        ? "No community flags reported"
        : `${input.communityFlagsHigh} high, ${input.communityFlagsMedium} medium, ${input.communityFlagsLow} low severity flags`,

    hatiscanDetail:
      input.hatiscanAnomalies === 0 && !input.hatiscanTitleMismatch
        ? "No document anomalies detected"
        : `${input.hatiscanAnomalies} anomal${input.hatiscanAnomalies === 1 ? "y" : "ies"}${input.hatiscanTitleMismatch ? " + title number mismatch" : ""}`,

    rimDetail:
      input.rimStatus === "unverified"
        ? "Registry Index Map check not yet completed"
        : input.rimStatus === "confirmed"
          ? "Boundary confirmed on Registry Index Map (+10 pts)"
          : input.rimStatus === "mutation_flagged"
            ? `Mutation detected — ${input.mutationTitleCurrent ? "title is current (-5 pts)" : "title predates mutation (-25 pts)"}`
            : "Boundary discrepancy found on RIM (-35 pts)",

    advocateDetail: input.advocateSigned
      ? "Signed off by licensed LSK advocate (+5 pts)"
      : "Awaiting advocate sign-off",

    spatialDetail: (() => {
      const parts: string[] = [];
      if (input.spatialProtectedZones && input.spatialProtectedZones > 0)
        parts.push(`${input.spatialProtectedZones} protected zone${input.spatialProtectedZones > 1 ? "s" : ""}`);
      if (input.spatialFloodZones && input.spatialFloodZones > 0)
        parts.push(`${input.spatialFloodZones} flood zone${input.spatialFloodZones > 1 ? "s" : ""}`);
      if (input.spatialRoadReserves && input.spatialRoadReserves > 0)
        parts.push(`${input.spatialRoadReserves} road reserve${input.spatialRoadReserves > 1 ? "s" : ""}`);
      if (input.spatialForestReserves && input.spatialForestReserves > 0)
        parts.push(`${input.spatialForestReserves} forest reserve${input.spatialForestReserves > 1 ? "s" : ""}`);
      return parts.length === 0
        ? "No spatial hazards detected in this county"
        : `Spatial hazards in county: ${parts.join(", ")}`;
    })(),
  };

  return { score, verdict, rimVerified, completeVerified, breakdown };
}
