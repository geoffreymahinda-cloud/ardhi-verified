"use client";

import { useState } from "react";

interface HatiScanResult {
  report_number: string;
  trust_score: number;
  verdict: "clean" | "caution" | "high_risk" | "unverified";
  elc_cases_found: number;
  gazette_hits: number;
  community_flags: number;
  breakdown: {
    elc_detail: string;
    gazette_detail: string;
    community_detail: string;
  };
  checked_at: string;
  parcel_reference: string;
}

const roles = [
  { value: "diaspora", label: "Diaspora Buyer" },
  { value: "local", label: "Local Buyer" },
  { value: "agent", label: "Agent" },
  { value: "lawyer", label: "Lawyer" },
  { value: "sacco", label: "SACCO Officer" },
  { value: "anonymous", label: "Anonymous" },
];

const verdictConfig = {
  clean: {
    label: "VERIFIED CLEAN",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    ring: "stroke-emerald-500",
  },
  caution: {
    label: "CAUTION ADVISED",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    ring: "stroke-amber-500",
  },
  high_risk: {
    label: "HIGH RISK",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
    ring: "stroke-red-500",
  },
  unverified: {
    label: "NO RECORDS FOUND",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    text: "text-slate-400",
    ring: "stroke-slate-400",
  },
};

function ScoreCircle({
  score,
  verdict,
}: {
  score: number;
  verdict: string;
}) {
  const config = verdictConfig[verdict as keyof typeof verdictConfig] || verdictConfig.unverified;
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
        />
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          className={config.ring}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${config.text}`}>{score}</span>
        <span className="text-[10px] text-white/40 uppercase tracking-wider">
          Trust Score
        </span>
      </div>
    </div>
  );
}

function LoadingStages({ stage }: { stage: number }) {
  const stages = [
    "Searching 17,175 court cases...",
    "Checking 617 gazette notices...",
    "Scanning community intelligence...",
  ];

  return (
    <div className="space-y-4 py-8">
      {stages.map((text, i) => (
        <div key={i} className="flex items-center gap-3">
          {i < stage ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
              <svg
                className="h-4 w-4 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
          ) : i === stage ? (
            <div className="h-6 w-6 rounded-full border-2 border-[#c8a96e] border-t-transparent animate-spin" />
          ) : (
            <div className="h-6 w-6 rounded-full border-2 border-white/10" />
          )}
          <span
            className={`text-sm ${
              i <= stage ? "text-white" : "text-white/30"
            }`}
          >
            {text}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function HatiScanTool() {
  const [parcel, setParcel] = useState("");
  const [role, setRole] = useState("anonymous");
  const [step, setStep] = useState<"input" | "loading" | "results">("input");
  const [loadingStage, setLoadingStage] = useState(0);
  const [result, setResult] = useState<HatiScanResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleScan() {
    if (!parcel.trim()) return;

    setStep("loading");
    setLoadingStage(0);
    setError("");

    // Animate through stages
    const timer1 = setTimeout(() => setLoadingStage(1), 800);
    const timer2 = setTimeout(() => setLoadingStage(2), 1600);

    try {
      const params = new URLSearchParams({
        parcel: parcel.trim(),
        tier: "basic",
        submitter_type: role,
      });
      const res = await fetch(`/api/hatiscan?${params}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Scan failed");
      }

      // Wait for animation to finish
      await new Promise((r) => setTimeout(r, 2400));
      setLoadingStage(3);
      await new Promise((r) => setTimeout(r, 400));

      setResult(data);
      setStep("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed. Please try again.");
      setStep("input");
    }

    clearTimeout(timer1);
    clearTimeout(timer2);
  }

  function handleReset() {
    setParcel("");
    setResult(null);
    setStep("input");
    setError("");
    setCopied(false);
  }

  function handleCopy() {
    if (!result) return;
    const config = verdictConfig[result.verdict];
    const text = `HatiScan™ Report ${result.report_number}\n` +
      `Parcel: ${result.parcel_reference}\n` +
      `Score: ${result.trust_score}/100 — ${config.label}\n` +
      `Court Cases: ${result.elc_cases_found} | Gazette: ${result.gazette_hits} | Flags: ${result.community_flags}\n` +
      `Checked: ${new Date(result.checked_at).toLocaleString()}\n` +
      `Powered by Ardhi Verified — ardhiverified.com/hatiscan`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `Checked on ${d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })} at ${d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
        {/* ── STEP 1: INPUT ──────────────────────────────────── */}
        {step === "input" && (
          <div className="text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c8a96e]/30 bg-[#c8a96e]/10 px-4 py-1.5">
              <svg
                className="h-4 w-4 text-[#c8a96e]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
              <span className="text-sm font-medium text-[#c8a96e]">
                Land Intelligence Engine
              </span>
            </div>

            <h1 className="font-serif text-4xl font-bold text-white sm:text-5xl">
              HatiScan
              <span className="text-[#c8a96e]">&#8482;</span>
            </h1>
            <h2 className="mt-2 text-lg text-white/40 font-serif">
              Land Intelligence
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm text-white/50">
              Screen any Kenya title against 17,175 court cases and 617 gazette
              notices instantly
            </p>

            {/* Input form */}
            <div className="mt-10 space-y-4 text-left">
              <div>
                <label
                  htmlFor="hs-parcel"
                  className="block text-xs font-medium text-white/60 mb-1.5"
                >
                  Parcel / LR / Title Number
                </label>
                <input
                  id="hs-parcel"
                  type="text"
                  value={parcel}
                  onChange={(e) => setParcel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                  placeholder="e.g. LR 209/21922"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder:text-white/20 focus:border-[#c8a96e]/50 focus:outline-none focus:ring-1 focus:ring-[#c8a96e]/30 transition"
                />
              </div>

              <div>
                <label
                  htmlFor="hs-role"
                  className="block text-xs font-medium text-white/60 mb-1.5"
                >
                  Your Role
                </label>
                <select
                  id="hs-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white focus:border-[#c8a96e]/50 focus:outline-none focus:ring-1 focus:ring-[#c8a96e]/30 transition appearance-none"
                >
                  {roles.map((r) => (
                    <option
                      key={r.value}
                      value={r.value}
                      className="bg-[#0a0f1a]"
                    >
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tier buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                <button
                  onClick={handleScan}
                  disabled={!parcel.trim()}
                  className="rounded-xl bg-[#c8a96e] px-6 py-3.5 text-sm font-semibold text-[#0a0f1a] transition-all hover:bg-[#d4b87a] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Free Basic Check
                </button>
                <div className="relative">
                  <button
                    disabled
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium text-white/30 cursor-not-allowed"
                  >
                    Full Report — &pound;4.99
                  </button>
                  <span className="absolute -top-2 right-3 rounded-full bg-[#c8a96e]/20 px-2 py-0.5 text-[10px] font-semibold text-[#c8a96e]">
                    Coming Soon
                  </span>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}

              <p className="text-center text-[11px] text-white/25 pt-2">
                Basic check covers 17,175 ELC court cases + 617 gazette notices
                + community flags
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 2: LOADING ────────────────────────────────── */}
        {step === "loading" && (
          <div className="text-center">
            <h2 className="font-serif text-2xl font-bold text-white">
              Scanning <span className="text-[#c8a96e]">{parcel}</span>
            </h2>
            <p className="mt-1 text-sm text-white/40">
              Cross-referencing against all intelligence databases
            </p>
            <div className="mx-auto max-w-xs">
              <LoadingStages stage={loadingStage} />
            </div>
          </div>
        )}

        {/* ── STEP 3: RESULTS ────────────────────────────────── */}
        {step === "results" && result && (
          <div className="space-y-6">
            {/* Score + Verdict */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <ScoreCircle
                score={result.trust_score}
                verdict={result.verdict}
              />

              <div className="mt-4">
                <span
                  className={`inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${
                    verdictConfig[result.verdict].bg
                  } ${verdictConfig[result.verdict].border} border ${
                    verdictConfig[result.verdict].text
                  }`}
                >
                  {verdictConfig[result.verdict].label}
                </span>
              </div>

              <p className="mt-3 text-sm text-white/50">
                {result.parcel_reference}
              </p>
            </div>

            {/* Metric boxes */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {result.elc_cases_found}
                </div>
                <div className="mt-1 text-[11px] text-white/40">
                  Court Cases
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {result.gazette_hits}
                </div>
                <div className="mt-1 text-[11px] text-white/40">
                  Gazette Notices
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {result.community_flags}
                </div>
                <div className="mt-1 text-[11px] text-white/40">
                  Community Flags
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                Breakdown
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-400 flex-shrink-0" />
                  <p className="text-sm text-white/60">
                    {result.breakdown.elc_detail}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-purple-400 flex-shrink-0" />
                  <p className="text-sm text-white/60">
                    {result.breakdown.gazette_detail}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-orange-400 flex-shrink-0" />
                  <p className="text-sm text-white/60">
                    {result.breakdown.community_detail}
                  </p>
                </div>
              </div>
            </div>

            {/* Report meta */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs text-white/30">Report Reference</p>
                <p className="text-sm font-mono text-[#c8a96e]">
                  {result.report_number}
                </p>
              </div>
              <p className="text-xs text-white/30">
                {formatDate(result.checked_at)}
              </p>
            </div>

            {/* Upgrade prompt */}
            <div className="rounded-2xl border border-[#c8a96e]/20 bg-[#c8a96e]/5 p-6 text-center">
              <p className="text-sm text-[#c8a96e]/80">
                Get the full HatiScan&#8482; Report — document analysis, forgery
                screening and LSK advocate flag — from{" "}
                <span className="font-semibold text-[#c8a96e]">&pound;4.99</span>
              </p>
              <button
                disabled
                className="mt-3 rounded-lg border border-[#c8a96e]/30 px-5 py-2 text-xs font-semibold text-[#c8a96e]/50 cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white/70 transition hover:bg-white/10"
              >
                {copied ? "Copied!" : "Share Result"}
              </button>
              <button
                onClick={handleReset}
                className="flex-1 rounded-xl bg-[#c8a96e] py-3 text-sm font-semibold text-[#0a0f1a] transition hover:bg-[#d4b87a]"
              >
                Check Another Title
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
