"use client";

import { useState } from "react";
import Link from "next/link";

interface CountyRisk {
  county_name: string;
  county_code: string;
  area_sqkm: number;
  population: number;
  composite_score: number;
  risk_band: string;
  score_legal_disputes: number;
  score_gazette_alerts: number;
  score_acquisition_pressure: number;
  score_spatial_risk: number;
  score_community_concern: number;
  elc_case_count: number;
  gazette_notice_count: number;
  nlc_acquisition_count: number;
  spatial_feature_count: number;
  community_flag_count: number;
  risk_rank: number;
}

const bandConfig: Record<string, { bg: string; text: string; fill: string; label: string }> = {
  CRITICAL: { bg: "bg-red-50", text: "text-red-700", fill: "#DC3232", label: "Critical" },
  HIGH:     { bg: "bg-orange-50", text: "text-orange-700", fill: "#E07020", label: "High" },
  ELEVATED: { bg: "bg-amber-50", text: "text-amber-700", fill: "#F5A623", label: "Elevated" },
  MODERATE: { bg: "bg-yellow-50", text: "text-yellow-700", fill: "#C4A44A", label: "Moderate" },
  LOW:      { bg: "bg-emerald-50", text: "text-emerald-700", fill: "#00A550", label: "Low" },
};

const componentMeta = [
  { key: "score_legal_disputes", label: "Legal Disputes", max: 25, rawKey: "elc_case_count", rawLabel: "ELC cases" },
  { key: "score_gazette_alerts", label: "Gazette Alerts", max: 25, rawKey: "gazette_notice_count", rawLabel: "gazette notices" },
  { key: "score_acquisition_pressure", label: "NLC Pressure", max: 15, rawKey: "nlc_acquisition_count", rawLabel: "NLC acquisitions" },
  { key: "score_spatial_risk", label: "Spatial Risk", max: 20, rawKey: "spatial_feature_count", rawLabel: "spatial features" },
  { key: "score_community_concern", label: "Community", max: 15, rawKey: "community_flag_count", rawLabel: "flags" },
] as const;

export default function CountyRiskClient({
  counties,
  computedAt,
}: {
  counties: CountyRisk[];
  computedAt: string | null;
}) {
  const [selected, setSelected] = useState<CountyRisk | null>(null);
  const [filterBand, setFilterBand] = useState<string | null>(null);

  const filtered = filterBand
    ? counties.filter((c) => c.risk_band === filterBand)
    : counties;

  // Band distribution for the summary strip
  const bandCounts: Record<string, number> = {};
  for (const c of counties) {
    bandCounts[c.risk_band] = (bandCounts[c.risk_band] || 0) + 1;
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-navy to-navy-light px-4 pb-10 pt-16 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C4A44A] mb-3">
            Ardhi Verified Intelligence
          </p>
          <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Kenya Land Risk Index
          </h1>
          <p className="mt-4 max-w-2xl text-white/50 text-base">
            Composite risk scores for all 47 counties based on court cases, gazette notices,
            compulsory acquisitions, spatial overlaps, and community intelligence.
          </p>
          {computedAt && (
            <p className="mt-3 text-xs text-white/30">
              Last computed: {new Date(computedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              {" "}· Refreshed weekly
            </p>
          )}
        </div>
      </section>

      {/* ── Band distribution strip ──────────────────────────── */}
      <section className="bg-white border-b border-border px-4 py-4">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center gap-3">
          <button
            onClick={() => setFilterBand(null)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              !filterBand ? "bg-navy text-white" : "bg-bg text-muted hover:bg-border"
            }`}
          >
            All 47
          </button>
          {["CRITICAL", "HIGH", "ELEVATED", "MODERATE", "LOW"].map((band) => {
            const cfg = bandConfig[band] ?? bandConfig.LOW;
            const count = bandCounts[band] || 0;
            if (count === 0) return null;
            return (
              <button
                key={band}
                onClick={() => setFilterBand(filterBand === band ? null : band)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  filterBand === band ? `${cfg.bg} ${cfg.text} ring-2 ring-current` : `${cfg.bg} ${cfg.text} hover:ring-1 hover:ring-current`
                }`}
              >
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Ranked table (left 2/3) ────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-bold text-navy">
                {filterBand ? `${bandConfig[filterBand]?.label} Counties` : "All Counties Ranked"}
              </h2>
              <p className="text-xs text-muted">{filtered.length} counties</p>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg/50">
                      <th className="text-left px-4 py-3 font-semibold text-navy w-10">#</th>
                      <th className="text-left px-4 py-3 font-semibold text-navy">County</th>
                      <th className="text-center px-4 py-3 font-semibold text-navy">Score</th>
                      <th className="text-center px-4 py-3 font-semibold text-navy hidden sm:table-cell">Band</th>
                      <th className="text-left px-4 py-3 font-semibold text-navy hidden md:table-cell">Breakdown</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => {
                      const cfg = bandConfig[c.risk_band] ?? bandConfig.LOW;
                      const isSelected = selected?.county_name === c.county_name;
                      return (
                        <tr
                          key={c.county_name}
                          onClick={() => setSelected(isSelected ? null : c)}
                          className={`border-b border-border last:border-b-0 cursor-pointer transition-colors ${
                            isSelected ? "bg-ardhi/5" : "hover:bg-bg/50"
                          }`}
                        >
                          <td className="px-4 py-3 text-muted font-mono text-xs">{c.risk_rank}</td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-navy">{c.county_name}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center rounded-lg px-3 py-1 text-sm font-bold ${cfg.bg} ${cfg.text}`}>
                              {c.composite_score}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center hidden sm:table-cell">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {/* Mini bar chart */}
                            <div className="flex items-center gap-0.5 h-4">
                              {componentMeta.map((comp) => {
                                const value = c[comp.key as keyof CountyRisk] as number;
                                const pct = (value / comp.max) * 100;
                                return (
                                  <div
                                    key={comp.key}
                                    className="h-full rounded-sm"
                                    style={{
                                      width: `${Math.max(pct * 0.6, 1)}px`,
                                      minWidth: "2px",
                                      maxWidth: "40px",
                                      backgroundColor: cfg.fill,
                                      opacity: pct > 0 ? 0.3 + (pct / 100) * 0.7 : 0.1,
                                    }}
                                    title={`${comp.label}: ${value}/${comp.max}`}
                                  />
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Methodology footnote */}
            <div className="mt-6 rounded-xl border border-border bg-card p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Methodology</h3>
              <p className="text-xs text-muted leading-relaxed">
                The composite score (0–100) aggregates five risk dimensions using log-scaled density normalization
                per 1,000 km², calibrated against the highest-density county in each dimension.
                Legal Disputes (25 pts) and Gazette Alerts (25 pts) carry the most weight, followed by
                Spatial Risk (20 pts), NLC Acquisition Pressure (15 pts), and Community Concern (15 pts).
                Scores are refreshed weekly. This index is informational and does not constitute legal advice.
              </p>
              <p className="text-xs text-muted mt-2">
                Sources: {counties.reduce((s, c) => s + c.elc_case_count, 0).toLocaleString()} ELC cases
                {" "}· {counties.reduce((s, c) => s + c.gazette_notice_count, 0).toLocaleString()} gazette notices
                {" "}· {counties.reduce((s, c) => s + c.spatial_feature_count, 0).toLocaleString()} spatial features
                {" "}· {counties.reduce((s, c) => s + c.community_flag_count, 0).toLocaleString()} community flags
              </p>
            </div>
          </div>

          {/* ── Drill-down panel (right 1/3) ──────────────────── */}
          <div className="lg:col-span-1">
            {selected ? (
              <DrillDown county={selected} />
            ) : (
              <div className="rounded-2xl border border-border bg-card p-8 text-center sticky top-24">
                <svg className="mx-auto h-10 w-10 text-muted/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <h3 className="font-serif text-lg font-bold text-navy mb-2">Select a county</h3>
                <p className="text-sm text-muted">
                  Click any row in the table to see the full risk breakdown, component scores, and raw record counts.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DrillDown — detail panel for a selected county
// ═══════════════════════════════════════════════════════════════════

function DrillDown({ county: c }: { county: CountyRisk }) {
  const cfg = bandConfig[c.risk_band] ?? bandConfig.LOW;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden sticky top-24">
      {/* Header */}
      <div className={`${cfg.bg} p-5 border-b border-border`}>
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.text} mb-1`}>
              Rank #{c.risk_rank} of 47
            </p>
            <h3 className="font-serif text-xl font-bold text-navy">{c.county_name}</h3>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${cfg.text}`}>{c.composite_score}</div>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text} border ${cfg.text === "text-red-700" ? "border-red-200" : cfg.text === "text-orange-700" ? "border-orange-200" : cfg.text === "text-amber-700" ? "border-amber-200" : cfg.text === "text-yellow-700" ? "border-yellow-200" : "border-emerald-200"}`}>
              {cfg.label}
            </span>
          </div>
        </div>
        <div className="flex gap-4 mt-3 text-xs text-muted">
          <span>{c.area_sqkm?.toLocaleString()} km²</span>
          {c.population > 0 && <span>{c.population.toLocaleString()} pop</span>}
        </div>
      </div>

      {/* Component breakdown */}
      <div className="p-5 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Score Breakdown</h4>

        {componentMeta.map((comp) => {
          const score = c[comp.key as keyof CountyRisk] as number;
          const raw = c[comp.rawKey as keyof CountyRisk] as number;
          const pct = (score / comp.max) * 100;
          return (
            <div key={comp.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-navy">{comp.label}</span>
                <span className="text-muted">
                  <strong className="text-navy">{score}</strong>/{comp.max}
                </span>
              </div>
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: cfg.fill }}
                />
              </div>
              <p className="text-[10px] text-muted mt-0.5">
                {raw.toLocaleString()} {comp.rawLabel}
              </p>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="border-t border-border p-5 space-y-2">
        <Link
          href={`/hatiscan`}
          className="block w-full rounded-lg bg-ardhi py-2.5 text-center text-sm font-semibold text-white hover:bg-ardhi-dark transition-colors"
        >
          Verify a title in {c.county_name}
        </Link>
        <p className="text-[10px] text-muted text-center">
          HatiScan screens individual parcels against all risk layers
        </p>
      </div>
    </div>
  );
}
