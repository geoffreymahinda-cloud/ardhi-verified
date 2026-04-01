"use client";

import { useState } from "react";
import Link from "next/link";

const demoTitles = [
  { number: "LR.NO.12807/214", county: "Kiambu", owner: "James Mwangi Kamau", size: "0.5 ac", score: 94, outcome: "proceed" as const },
  { number: "LR.NO.8934/112", county: "Nakuru", owner: "Mary Wanjiku Ndung'u", size: "2 ac", score: 87, outcome: "review" as const },
  { number: "LR.NO.3321/089", county: "Kajiado", owner: "Peter Ochieng Odhiambo", size: "0.25 ac", score: 45, outcome: "blocked" as const },
  { number: "LR.NO.5567/341", county: "Kisumu", owner: "Grace Akinyi Otieno", size: "1 ac", score: 91, outcome: "proceed" as const },
  { number: "LR.NO.7712/455", county: "Kilifi", owner: "Hassan Mohamed Ali", size: "0.75 ac", score: 73, outcome: "review" as const },
];

const portfolioHealth = {
  total: 2847,
  healthy: 2651,
  review: 154,
  critical: 28,
  pending: 14,
};

const checks = [
  { label: "Title Deed Confirmed", key: "title" },
  { label: "NLIMS Registry Match", key: "nlims" },
  { label: "No Active Disputes", key: "disputes" },
  { label: "No Encumbrances", key: "encumbrances" },
  { label: "Seller Identity Verified", key: "seller" },
  { label: "Agent LSK Registered", key: "agent" },
];

type DemoStep = "intro" | "submit" | "processing" | "results" | "portfolio" | "alert" | "api";

export default function DemoPage() {
  const [step, setStep] = useState<DemoStep>("intro");
  const [processingIdx, setProcessingIdx] = useState(0);
  const [showAlert, setShowAlert] = useState(false);

  function startProcessing() {
    setStep("processing");
    setProcessingIdx(0);
    // Simulate titles being verified one by one
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setProcessingIdx(idx);
      if (idx >= demoTitles.length) {
        clearInterval(interval);
        setTimeout(() => setStep("results"), 800);
      }
    }, 1200);
  }

  function triggerAlert() {
    setStep("alert");
    setTimeout(() => setShowAlert(true), 500);
  }

  const outcomeColor = { proceed: "text-trust-green", review: "text-trust-amber", blocked: "text-trust-red" };
  const outcomeBg = { proceed: "bg-trust-green/10", review: "bg-trust-amber/10", blocked: "bg-trust-red/10" };
  const outcomeLabel = { proceed: "Safe", review: "Needs Review", blocked: "Blocked" };

  return (
    <main className="bg-white min-h-screen">
      {/* Hero */}
      <section className="bg-navy text-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-trust-amber/20 border border-trust-amber/30 rounded-full px-4 py-1.5 mb-6">
            <span className="text-trust-amber text-sm font-semibold">Interactive Demo</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">
            See Ardhi Verified in action
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto mb-8">
            Walk through a simulated institutional verification — from title submission to portfolio monitoring. This is exactly what a bank sees.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {(["intro", "submit", "processing", "results", "portfolio", "alert", "api"] as DemoStep[]).map((s, i) => (
              <button
                key={s}
                onClick={() => { setStep(s); if (s === "alert") triggerAlert(); if (s === "processing") startProcessing(); }}
                className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                  step === s ? "bg-ardhi text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Demo content */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        {/* INTRO */}
        {step === "intro" && (
          <div className="text-center py-16">
            <div className="mx-auto mb-8 h-20 w-20 rounded-full bg-ardhi/10 flex items-center justify-center">
              <svg className="h-10 w-10 text-ardhi" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
              </svg>
            </div>
            <h2 className="font-serif text-3xl font-bold text-navy mb-4">Welcome to the Ardhi Enterprise Demo</h2>
            <p className="text-muted max-w-xl mx-auto mb-8">
              You&apos;re playing the role of a Credit Risk Officer at a Kenyan commercial bank. You have 5 land titles backing active loans that need verification.
            </p>
            <button onClick={() => setStep("submit")} className="bg-ardhi text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-ardhi-dark transition-colors">
              Start Demo →
            </button>
          </div>
        )}

        {/* SUBMIT */}
        {step === "submit" && (
          <div>
            <h2 className="font-serif text-2xl font-bold text-navy mb-2">Step 1: Submit titles for verification</h2>
            <p className="text-muted mb-8">Upload your titles via the dashboard or API. Here are 5 titles from your loan book:</p>

            <div className="rounded-2xl border border-border overflow-hidden mb-8">
              <table className="w-full text-sm">
                <thead className="bg-navy text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Title Number</th>
                    <th className="px-4 py-3 text-left font-medium">County</th>
                    <th className="px-4 py-3 text-left font-medium">Registered Owner</th>
                    <th className="px-4 py-3 text-left font-medium">Size</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {demoTitles.map((t) => (
                    <tr key={t.number}>
                      <td className="px-4 py-3 font-mono text-xs text-navy">{t.number}</td>
                      <td className="px-4 py-3 text-muted">{t.county}</td>
                      <td className="px-4 py-3 text-navy font-medium">{t.owner}</td>
                      <td className="px-4 py-3 text-muted">{t.size}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-xs font-medium">Ready</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={startProcessing} className="bg-ardhi text-white px-8 py-4 rounded-lg font-semibold hover:bg-ardhi-dark transition-colors">
              Submit 5 titles for verification →
            </button>
          </div>
        )}

        {/* PROCESSING */}
        {step === "processing" && (
          <div>
            <h2 className="font-serif text-2xl font-bold text-navy mb-2">Step 2: 12-agent swarm verifying titles</h2>
            <p className="text-muted mb-8">Our AI agents are cross-referencing each title against NLIMS, checking encumbrances, validating ownership, and scoring fraud risk.</p>

            <div className="space-y-4">
              {demoTitles.map((t, i) => (
                <div key={t.number} className={`rounded-xl border p-5 transition-all duration-500 ${
                  i < processingIdx ? "border-ardhi/30 bg-ardhi/5" : i === processingIdx ? "border-trust-amber/30 bg-trust-amber/5 animate-pulse" : "border-border bg-card opacity-50"
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm text-navy font-medium">{t.number}</p>
                      <p className="text-xs text-muted">{t.owner} — {t.county}</p>
                    </div>
                    <div>
                      {i < processingIdx ? (
                        <span className="flex items-center gap-1.5 text-ardhi text-sm font-medium">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Verified
                        </span>
                      ) : i === processingIdx ? (
                        <span className="flex items-center gap-2 text-trust-amber text-sm font-medium">
                          <div className="h-4 w-4 rounded-full border-2 border-trust-amber/30 border-t-trust-amber animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        <span className="text-xs text-muted">Queued</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESULTS */}
        {step === "results" && (
          <div>
            <h2 className="font-serif text-2xl font-bold text-navy mb-2">Step 3: Verification results</h2>
            <p className="text-muted mb-8">All 5 titles verified. Here are the results your bank receives:</p>

            <div className="space-y-6">
              {demoTitles.map((t) => (
                <div key={t.number} className="rounded-2xl border border-border p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-mono text-sm text-navy font-medium">{t.number}</p>
                      <p className="text-sm text-muted">{t.owner} — {t.county} — {t.size}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-bold ${outcomeColor[t.outcome]}`}>{t.score}</p>
                      <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${outcomeBg[t.outcome]} ${outcomeColor[t.outcome]}`}>
                        {outcomeLabel[t.outcome]}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {checks.map((c, ci) => {
                      const passed = t.outcome === "proceed" ? true : t.outcome === "review" ? ci !== 1 : ci > 2;
                      return (
                        <div key={c.key} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${passed ? "bg-trust-green/5 text-trust-green" : "bg-trust-red/5 text-trust-red"}`}>
                          {passed ? "✓" : "✗"} {c.label}
                        </div>
                      );
                    })}
                  </div>
                  {t.outcome === "blocked" && (
                    <div className="mt-4 rounded-lg bg-trust-red/5 border border-trust-red/20 px-4 py-3 text-sm text-trust-red">
                      <strong>Action required:</strong> This collateral has failed critical checks. Recommend immediate review of loan LN-{t.number.slice(-3)}.
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-4">
              <button onClick={() => setStep("portfolio")} className="bg-ardhi text-white px-8 py-4 rounded-lg font-semibold hover:bg-ardhi-dark transition-colors">
                View portfolio dashboard →
              </button>
            </div>
          </div>
        )}

        {/* PORTFOLIO */}
        {step === "portfolio" && (
          <div>
            <h2 className="font-serif text-2xl font-bold text-navy mb-2">Step 4: Portfolio monitoring dashboard</h2>
            <p className="text-muted mb-8">Your bank&apos;s collateral portfolio, monitored nightly by Land Guardian Enterprise.</p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="rounded-xl border border-border bg-card p-5 text-center">
                <p className="text-3xl font-bold text-navy">{portfolioHealth.total.toLocaleString()}</p>
                <p className="text-xs text-muted mt-1">Total Titles</p>
              </div>
              <div className="rounded-xl border border-trust-green/30 bg-trust-green/5 p-5 text-center">
                <p className="text-3xl font-bold text-trust-green">{portfolioHealth.healthy.toLocaleString()}</p>
                <p className="text-xs text-muted mt-1">Healthy</p>
              </div>
              <div className="rounded-xl border border-trust-amber/30 bg-trust-amber/5 p-5 text-center">
                <p className="text-3xl font-bold text-trust-amber">{portfolioHealth.review}</p>
                <p className="text-xs text-muted mt-1">Needs Review</p>
              </div>
              <div className="rounded-xl border border-trust-red/30 bg-trust-red/5 p-5 text-center">
                <p className="text-3xl font-bold text-trust-red">{portfolioHealth.critical}</p>
                <p className="text-xs text-muted mt-1">Critical</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 text-center">
                <p className="text-3xl font-bold text-navy">{portfolioHealth.pending}</p>
                <p className="text-xs text-muted mt-1">Pending Check</p>
              </div>
            </div>

            {/* Health bar */}
            <div className="rounded-xl border border-border bg-card p-6 mb-8">
              <h3 className="text-sm font-semibold text-navy mb-3">Portfolio Health</h3>
              <div className="flex rounded-full overflow-hidden h-4">
                <div className="bg-trust-green" style={{ width: `${(portfolioHealth.healthy / portfolioHealth.total) * 100}%` }} />
                <div className="bg-trust-amber" style={{ width: `${(portfolioHealth.review / portfolioHealth.total) * 100}%` }} />
                <div className="bg-trust-red" style={{ width: `${(portfolioHealth.critical / portfolioHealth.total) * 100}%` }} />
                <div className="bg-border" style={{ width: `${(portfolioHealth.pending / portfolioHealth.total) * 100}%` }} />
              </div>
              <div className="flex items-center gap-6 mt-3">
                <span className="flex items-center gap-1.5 text-xs text-muted"><span className="h-2 w-2 rounded-full bg-trust-green" />Healthy 93.1%</span>
                <span className="flex items-center gap-1.5 text-xs text-muted"><span className="h-2 w-2 rounded-full bg-trust-amber" />Review 5.4%</span>
                <span className="flex items-center gap-1.5 text-xs text-muted"><span className="h-2 w-2 rounded-full bg-trust-red" />Critical 1.0%</span>
              </div>
            </div>

            <button onClick={triggerAlert} className="bg-trust-red text-white px-8 py-4 rounded-lg font-semibold hover:bg-trust-red/90 transition-colors">
              Simulate critical alert →
            </button>
          </div>
        )}

        {/* ALERT */}
        {step === "alert" && (
          <div>
            <h2 className="font-serif text-2xl font-bold text-navy mb-2">Step 5: Real-time alert</h2>
            <p className="text-muted mb-8">Land Guardian detected a change on one of your collateral titles during the nightly scan:</p>

            <div className={`rounded-2xl border-2 border-trust-red/30 bg-trust-red/5 p-8 transition-all duration-700 ${showAlert ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-trust-red animate-pulse" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-trust-red">Critical Alert — Immediate Action Required</span>
                <span className="text-xs text-muted ml-auto">2 minutes ago</span>
              </div>

              <h3 className="text-xl font-bold text-navy mb-4">Ownership Transfer Detected</h3>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3"><span className="text-muted w-24 flex-shrink-0">Title:</span><span className="font-mono text-navy">LR.NO.3321/089</span></div>
                  <div className="flex gap-3"><span className="text-muted w-24 flex-shrink-0">Borrower:</span><span className="text-navy font-medium">Peter Ochieng Odhiambo</span></div>
                  <div className="flex gap-3"><span className="text-muted w-24 flex-shrink-0">Loan:</span><span className="text-navy">LN-089 — KES 8,500,000</span></div>
                  <div className="flex gap-3"><span className="text-muted w-24 flex-shrink-0">County:</span><span className="text-navy">Kajiado</span></div>
                </div>
                <div className="rounded-xl bg-white border border-trust-red/20 p-4">
                  <p className="text-sm font-medium text-trust-red mb-2">What changed</p>
                  <p className="text-sm text-muted">Registered owner changed from &quot;Peter Ochieng Odhiambo&quot; to &quot;Unknown Third Party.&quot; This title backs an active loan of KES 8.5M. The transfer was not authorised by your institution.</p>
                </div>
              </div>

              <div className="rounded-xl bg-white border border-border p-4 mb-6">
                <p className="text-sm font-medium text-navy mb-2">Recommended action</p>
                <ul className="text-sm text-muted space-y-1.5">
                  <li className="flex items-start gap-2"><span className="text-trust-red font-bold">1.</span> Place an immediate caution on the title at the Land Registry</li>
                  <li className="flex items-start gap-2"><span className="text-trust-red font-bold">2.</span> Contact the borrower to verify if the transfer was authorised</li>
                  <li className="flex items-start gap-2"><span className="text-trust-red font-bold">3.</span> Escalate to your legal department for potential recovery action</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <span className="rounded-full bg-ardhi/10 text-ardhi text-xs font-medium px-3 py-1.5">Webhook sent ✓</span>
                <span className="rounded-full bg-white border border-border text-muted text-xs font-medium px-3 py-1.5">Email sent ✓</span>
                <span className="rounded-full bg-trust-red/10 text-trust-red text-xs font-medium px-3 py-1.5">SMS sent to Risk Officer ✓</span>
              </div>
            </div>

            <div className="mt-8">
              <button onClick={() => setStep("api")} className="bg-ardhi text-white px-8 py-4 rounded-lg font-semibold hover:bg-ardhi-dark transition-colors">
                See the API integration →
              </button>
            </div>
          </div>
        )}

        {/* API */}
        {step === "api" && (
          <div>
            <h2 className="font-serif text-2xl font-bold text-navy mb-2">Step 6: API integration</h2>
            <p className="text-muted mb-8">Everything you just saw is available via our RESTful API. Here&apos;s how the alert was delivered:</p>

            <div className="rounded-2xl bg-navy text-gray-300 p-6 md:p-8 font-mono text-xs leading-relaxed overflow-x-auto mb-8">
              <p className="text-white/40 mb-2">// Webhook payload delivered to your system</p>
              <p className="text-ardhi mb-1">POST https://your-bank.co.ke/ardhi-webhook</p>
              <pre>{`{
  "event": "monitor.alert",
  "severity": "critical",
  "title_number": "LR.NO.3321/089",
  "county": "Kajiado",
  "change_type": "ownership_transfer",
  "previous_owner": "Peter Ochieng Odhiambo",
  "new_owner": "Unknown Third Party",
  "detected_at": "2026-04-01T02:14:00+03:00",
  "loan_reference": "LN-089",
  "collateral_value_kes": 8500000,
  "recommended_action": "immediate_caution",
  "verification_id": "ver_3p8q1r5t",
  "dashboard_url": "https://api.ardhiverified.com/alerts/ver_3p8q1r5t"
}`}</pre>
            </div>

            <div className="rounded-2xl border border-ardhi/20 bg-ardhi/5 p-8 text-center">
              <h3 className="font-serif text-2xl font-bold text-navy mb-4">That&apos;s the Ardhi Enterprise experience.</h3>
              <p className="text-muted max-w-xl mx-auto mb-6">
                From title submission to real-time collateral monitoring — all automated, all auditable, all through one platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/enterprise#contact" className="bg-ardhi text-white px-8 py-4 rounded-lg font-semibold hover:bg-ardhi-dark transition-colors">
                  Book a Live Demo
                </Link>
                <Link href="/api-docs" className="border-2 border-ardhi text-ardhi px-8 py-4 rounded-lg font-semibold hover:bg-ardhi/5 transition-colors">
                  View Full API Docs
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
