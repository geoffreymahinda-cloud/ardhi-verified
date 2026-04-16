"use client";

import { useState } from "react";
import Link from "next/link";

export default function TrialPage() {
  const [loading, setLoading] = useState(false);

  async function handleStartTrial() {
    setLoading(true);
    try {
      const res = await fetch("/api/subscribe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "professional", trial: true }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (res.status === 401) {
        window.location.href = `/auth/signup?next=/trial`;
      } else {
        alert(data.detail || data.error || "Something went wrong. Please try again.");
      }
    } catch {
      alert("Failed to start trial. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0f1a]">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
        {/* Badge */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-ardhi/30 bg-ardhi/10 px-4 py-1.5 text-sm font-medium text-ardhi">
            Limited to first 100 advocates
          </span>
        </div>

        <h1 className="text-center font-serif text-4xl font-bold text-white sm:text-5xl leading-tight">
          30 days free.
          <br />
          <span className="text-[#c8a96e]">Unlimited HatiScan.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-lg text-center text-lg text-white/50">
          Get full Professional access to HatiScan — Kenya&apos;s most comprehensive land
          intelligence platform — completely free for 30 days. No credit card required to start.
        </p>

        {/* What you get */}
        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <h2 className="text-sm font-semibold text-[#c8a96e] uppercase tracking-wider mb-6">
            Your 30-day Professional trial includes
          </h2>
          <div className="space-y-4">
            {[
              "Unlimited HatiScan searches",
              "Full 12-layer verification on every search",
              "Trust Score with detailed breakdown",
              "Road reserve, riparian, and forest reserve checks",
              "Protected zone and flood zone analysis",
              "NLC historical claims check",
              "Court case and gazette notice screening",
              "PDF report download for every search",
              "API access for integrations",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <svg className="h-5 w-5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span className="text-sm text-white/70">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 space-y-4">
          <button
            onClick={handleStartTrial}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-ardhi to-emerald-600 px-8 py-5 text-lg font-bold text-white transition-all hover:from-ardhi-dark hover:to-emerald-700 disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Setting up your trial...
              </span>
            ) : (
              "Start Free Trial"
            )}
          </button>

          <p className="text-center text-xs text-white/30">
            30-day Professional access. No charge. After 30 days, choose a plan or revert to free tier.
          </p>
        </div>

        {/* How it works */}
        <div className="mt-16">
          <h2 className="text-center text-sm font-semibold text-white/40 uppercase tracking-wider mb-8">
            How it works
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { step: "1", title: "Sign up", desc: "Create your free account in 30 seconds" },
              { step: "2", title: "Search", desc: "Run unlimited HatiScan searches for 30 days" },
              { step: "3", title: "Decide", desc: "Choose a plan or stay on the free tier" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-[#c8a96e]/20 flex items-center justify-center">
                  <span className="text-[#c8a96e] font-serif font-bold">{item.step}</span>
                </div>
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-xs text-white/40">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Social proof */}
        <div className="mt-16 rounded-2xl border border-[#c8a96e]/20 bg-[#c8a96e]/[0.03] p-6 text-center">
          <p className="text-sm text-[#c8a96e]/80">
            HatiScan screens against <strong className="text-[#c8a96e]">44,000+</strong> court cases,{" "}
            <strong className="text-[#c8a96e]">45,000+</strong> gazette notices, and{" "}
            <strong className="text-[#c8a96e]">19,000+</strong> road reserves across Kenya.
          </p>
        </div>

        {/* Alternative */}
        <div className="mt-8 text-center">
          <p className="text-sm text-white/30">
            Just need a single report?{" "}
            <Link href="/hatiscan" className="text-[#c8a96e] hover:underline">
              Run a one-off scan for KES 2,500
            </Link>
          </p>
          <p className="mt-2 text-sm text-white/30">
            <Link href="/pricing" className="text-white/50 hover:underline">
              View all plans →
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
