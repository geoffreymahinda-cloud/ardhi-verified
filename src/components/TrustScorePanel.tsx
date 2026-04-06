"use client";

import { useEffect, useState } from "react";

interface TrustScoreResult {
  score: number;
  rating: "VERIFIED" | "REVIEW REQUIRED" | "HIGH RISK" | "BLOCKED";
  elc_cases_found: number;
  gazette_notices_found: number;
  community_flags_found: number;
  last_calculated: string;
  breakdown: {
    source: string;
    reason: string;
    deduction: number;
  }[];
}

const ratingConfig = {
  VERIFIED: {
    color: "text-trust-green",
    bg: "bg-trust-green/10",
    border: "border-trust-green/30",
    label: "Verified Clean",
  },
  "REVIEW REQUIRED": {
    color: "text-trust-amber",
    bg: "bg-trust-amber/10",
    border: "border-trust-amber/30",
    label: "Review Required",
  },
  "HIGH RISK": {
    color: "text-trust-red",
    bg: "bg-trust-red/10",
    border: "border-trust-red/30",
    label: "High Risk",
  },
  BLOCKED: {
    color: "text-trust-red",
    bg: "bg-trust-red/10",
    border: "border-trust-red/30",
    label: "Blocked",
  },
};

const sourceLabels: Record<string, string> = {
  elc_case: "Court Case",
  gazette_notice: "Gazette Notice",
  community_flag: "Community Flag",
};

export default function TrustScorePanel({ parcelRef }: { parcelRef: string }) {
  const [result, setResult] = useState<TrustScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!parcelRef) {
      setLoading(false);
      return;
    }

    fetch(`/api/trust-score?parcel=${encodeURIComponent(parcelRef)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data) => setResult(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [parcelRef]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
        <div className="h-5 w-48 bg-border rounded mb-4" />
        <div className="h-20 bg-border rounded" />
      </div>
    );
  }

  if (error || !result) return null;

  const config = ratingConfig[result.rating];
  const scoreColor =
    result.score >= 80
      ? "text-trust-green"
      : result.score >= 50
        ? "text-trust-amber"
        : "text-trust-red";

  return (
    <section className="space-y-4">
      <h2 className="font-serif text-xl font-bold text-navy">
        Intelligence Trust Score
      </h2>

      <div className={`rounded-xl border ${config.border} ${config.bg} p-6`}>
        {/* Score + Rating row */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-4">
            {/* Score circle */}
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle
                  cx="50" cy="50" r="44"
                  fill="none" stroke="currentColor" strokeWidth="8"
                  className="text-border"
                />
                <circle
                  cx="50" cy="50" r="44"
                  fill="none" stroke="currentColor" strokeWidth="8"
                  strokeLinecap="round"
                  className={scoreColor}
                  strokeDasharray={2 * Math.PI * 44}
                  strokeDashoffset={2 * Math.PI * 44 - (result.score / 100) * 2 * Math.PI * 44}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-lg font-bold ${scoreColor}`}>
                  {result.score}
                </span>
              </div>
            </div>

            <div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${config.bg} ${config.color} border ${config.border}`}
              >
                {config.label}
              </span>
              <p className="text-xs text-muted mt-1.5">
                Based on {result.elc_cases_found + result.gazette_notices_found + result.community_flags_found} record{result.elc_cases_found + result.gazette_notices_found + result.community_flags_found !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-lg bg-card/60 p-3 text-center border border-border/50">
            <p className="text-lg font-bold text-navy">{result.elc_cases_found}</p>
            <p className="text-[10px] text-muted font-medium uppercase tracking-wider">Court Cases</p>
          </div>
          <div className="rounded-lg bg-card/60 p-3 text-center border border-border/50">
            <p className="text-lg font-bold text-navy">{result.gazette_notices_found}</p>
            <p className="text-[10px] text-muted font-medium uppercase tracking-wider">Gazette Notices</p>
          </div>
          <div className="rounded-lg bg-card/60 p-3 text-center border border-border/50">
            <p className="text-lg font-bold text-navy">{result.community_flags_found}</p>
            <p className="text-[10px] text-muted font-medium uppercase tracking-wider">Community Flags</p>
          </div>
        </div>

        {/* Breakdown */}
        {result.breakdown.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-navy uppercase tracking-wider">
              Deduction Breakdown
            </h3>
            {result.breakdown.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg bg-card/60 px-4 py-3 text-sm border border-border/50"
              >
                <span className="text-trust-red font-bold text-xs mt-0.5 flex-shrink-0">
                  {item.deduction}
                </span>
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {sourceLabels[item.source] || item.source}
                  </span>
                  <p className="text-sm text-navy truncate">{item.reason}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-trust-green font-medium text-center py-2">
            No deductions found — parcel is clean across all databases
          </p>
        )}

        {/* Timestamp */}
        <p className="text-[10px] text-muted text-right mt-4">
          Last calculated:{" "}
          {new Date(result.last_calculated).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </section>
  );
}
