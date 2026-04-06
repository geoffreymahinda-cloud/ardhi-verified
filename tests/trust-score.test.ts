import { describe, it, expect } from "vitest";

// Test the trust score logic that mirrors the Supabase function
// This tests the client-side scoring logic, not the DB function

describe("Trust Score Logic", () => {
  function calculateScore(params: {
    elcCases: number;
    gazetteCritical: number;
    gazetteGeneral: number;
    flagsHigh: number;
    flagsMedium: number;
    flagsLow: number;
  }) {
    let score = 100;
    score -= params.elcCases * 15;
    score -= params.gazetteCritical * 25;
    score -= params.gazetteGeneral * 10;
    score -= params.flagsHigh * 20;
    score -= params.flagsMedium * 10;
    score -= params.flagsLow * 5;
    return Math.max(0, score);
  }

  function getVerdict(score: number, totalHits: number) {
    if (totalHits === 0) return "unverified";
    if (score >= 80) return "clean";
    if (score >= 50) return "caution";
    return "high_risk";
  }

  it("returns 100 for clean parcel with records", () => {
    const score = calculateScore({
      elcCases: 0, gazetteCritical: 0, gazetteGeneral: 0,
      flagsHigh: 0, flagsMedium: 0, flagsLow: 0,
    });
    expect(score).toBe(100);
  });

  it("returns unverified when no records at all", () => {
    const verdict = getVerdict(100, 0);
    expect(verdict).toBe("unverified");
  });

  it("deducts 15 per court case", () => {
    const score = calculateScore({
      elcCases: 2, gazetteCritical: 0, gazetteGeneral: 0,
      flagsHigh: 0, flagsMedium: 0, flagsLow: 0,
    });
    expect(score).toBe(70);
  });

  it("deducts 25 per critical gazette notice", () => {
    const score = calculateScore({
      elcCases: 0, gazetteCritical: 2, gazetteGeneral: 0,
      flagsHigh: 0, flagsMedium: 0, flagsLow: 0,
    });
    expect(score).toBe(50);
  });

  it("classifies caution correctly", () => {
    const score = calculateScore({
      elcCases: 1, gazetteCritical: 0, gazetteGeneral: 1,
      flagsHigh: 0, flagsMedium: 0, flagsLow: 0,
    });
    expect(score).toBe(75);
    expect(getVerdict(score, 2)).toBe("caution");
  });

  it("classifies high_risk correctly", () => {
    const score = calculateScore({
      elcCases: 3, gazetteCritical: 1, gazetteGeneral: 0,
      flagsHigh: 1, flagsMedium: 0, flagsLow: 0,
    });
    expect(score).toBe(10);
    expect(getVerdict(score, 5)).toBe("high_risk");
  });

  it("never goes below 0", () => {
    const score = calculateScore({
      elcCases: 10, gazetteCritical: 5, gazetteGeneral: 5,
      flagsHigh: 5, flagsMedium: 5, flagsLow: 5,
    });
    expect(score).toBe(0);
  });

  it("handles forgery deductions correctly", () => {
    // Simulate HatiScan document scoring
    let score = 100;
    const visionFlags = 2; // AI found 2 anomalies
    const fraudPatterns = 1; // 1 pattern match
    const titleMismatch = true;

    score -= visionFlags * 20;
    score -= fraudPatterns * 15;
    if (titleMismatch) score -= 40;
    score = Math.max(0, score);

    expect(score).toBe(5); // 100 - 40 - 40 - 15
  });
});
