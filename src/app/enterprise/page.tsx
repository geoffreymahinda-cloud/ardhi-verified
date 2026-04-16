"use client";

import { useState } from "react";
import Link from "next/link";
import { submitConciergeEnquiry } from "@/app/actions";

const problems = [
  {
    stat: "KES 500M+",
    label: "spent annually by Kenyan banks on manual title verification",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />,
  },
  {
    stat: "3-6 weeks",
    label: "average time for a bank to verify a single land title",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  {
    stat: "23%",
    label: "of land-backed loans in Kenya face collateral disputes",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />,
  },
];

const useCases = [
  {
    title: "Loan Origination",
    description: "Verify title validity before approving land-backed loans. Our 12-agent swarm cross-references NLIMS, checks encumbrances, and returns a Trust Score in 48 hours — not 3 weeks.",
    metric: "48hrs vs 3-6 weeks",
    audience: "Commercial Banks, Microfinance",
  },
  {
    title: "Portfolio Audit",
    description: "Bulk-verify thousands of existing titles in your loan book. Upload a CSV, get a full verification report for every title. Identify at-risk collateral before it becomes a loss.",
    metric: "10,000 titles in 7 days",
    audience: "Banks, SACCOs, CBK Compliance",
  },
  {
    title: "Collateral Monitoring",
    description: "Land Guardian Enterprise monitors your collateral portfolio nightly. If a borrower's title is transferred, encumbered, or disputed — you know before the next business day.",
    metric: "Nightly NLIMS checks",
    audience: "Banks, Insurance, Pension Funds",
  },
  {
    title: "Insurance Underwriting",
    description: "Verify title authenticity and risk profile before issuing title insurance or land-related policies. Our fraud risk score identifies high-risk parcels with 94% accuracy.",
    metric: "94% fraud detection rate",
    audience: "Insurers, Underwriters",
  },
];

const pricing = [
  { product: "Single Verification", unit: "per title", price: "KES 2,499", priceGBP: "£14.99", desc: "Full 12-layer verification with Trust Score, spatial analysis, and document intelligence" },
  { product: "Bulk Verification (100+)", unit: "per title", price: "KES 1,500", priceGBP: "~£9", desc: "Volume-discounted batch processing with priority turnaround" },
  { product: "Portfolio Monitoring", unit: "per title/month", price: "KES 500", priceGBP: "~£3", desc: "Nightly NLIMS monitoring with instant alerts on changes" },
  { product: "Enterprise API", unit: "annual license", price: "KES 2.5M", priceGBP: "~£15K", desc: "Unlimited API access, dedicated support, SLA guarantee" },
  { product: "White-Label", unit: "custom", price: "Contact us", priceGBP: "", desc: "Your brand, our verification engine. For conveyancers and fintechs" },
];

const logos = [
  "Commercial Banks", "Microfinance Institutions", "SACCOs",
  "Insurance Companies", "Pension Funds", "Real Estate Funds",
  "Conveyancing Firms", "Government Agencies",
];

export default function EnterprisePage() {
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", company: "", role: "", titles: "", message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await submitConciergeEnquiry({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      country: formData.company,
      county: "",
      budget: formData.titles,
      use: formData.role,
      timeline: "enterprise",
      message: `[Enterprise] Company: ${formData.company}, Role: ${formData.role}, Portfolio size: ${formData.titles} titles. ${formData.message}`,
    });
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <main className="bg-white">
      {/* HERO */}
      <section className="relative bg-navy text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, rgba(0,165,80,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(245,166,35,0.2) 0%, transparent 50%)" }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-ardhi/20 border border-ardhi/30 rounded-full px-4 py-1.5 mb-6">
            <span className="text-ardhi text-sm font-semibold">For Institutions</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            The Experian of
            <br />
            <span className="text-ardhi">African Land.</span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed">
            Banks spend millions verifying land titles manually. Ardhi&apos;s 12-agent AI swarm does it in 48 hours, at a fraction of the cost. Verify loan collateral, audit portfolios, and monitor titles — all through one API.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#contact" className="bg-ardhi text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-ardhi-dark transition-colors">
              Book a Demo
            </a>
            <Link href="/api-docs" className="border border-white/30 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/10 transition-colors">
              View API Docs
            </Link>
          </div>
        </div>
      </section>

      {/* PROBLEM STATS */}
      <section className="bg-trust-amber/5 border-y border-trust-amber/10 py-12">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8">
          {problems.map((p) => (
            <div key={p.stat} className="flex items-start gap-4">
              <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-trust-amber/10 flex items-center justify-center">
                <svg className="h-6 w-6 text-trust-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>{p.icon}</svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-navy">{p.stat}</p>
                <p className="text-sm text-muted mt-1">{p.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* USE CASES */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-ardhi font-mono text-sm tracking-widest uppercase mb-3">Use cases</p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-navy mb-4">
              One verification engine. Every institutional need.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {useCases.map((uc) => (
              <div key={uc.title} className="rounded-2xl border border-border p-8 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif text-xl font-bold text-navy">{uc.title}</h3>
                  <span className="rounded-full bg-ardhi/10 px-3 py-1 text-xs font-semibold text-ardhi whitespace-nowrap">{uc.metric}</span>
                </div>
                <p className="text-muted text-sm leading-relaxed mb-4">{uc.description}</p>
                <p className="text-xs text-muted">
                  <span className="font-medium text-navy">For:</span> {uc.audience}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-navy text-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-ardhi font-mono text-sm tracking-widest uppercase mb-3">How it works</p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              From title number to Trust Score in 48 hours
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Submit", desc: "Send title numbers via API, CSV upload, or our dashboard." },
              { step: "02", title: "Verify", desc: "12 AI agents cross-reference NLIMS, check encumbrances, validate ownership, and score fraud risk." },
              { step: "03", title: "Report", desc: "Receive standardised verification certificates with Trust Scores, risk classification, and detailed findings." },
              { step: "04", title: "Monitor", desc: "Optionally enrol titles in continuous monitoring. Get instant alerts on any registry changes." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-ardhi/20 flex items-center justify-center">
                  <span className="font-serif text-xl font-bold text-ardhi">{item.step}</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20 bg-bg">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-ardhi font-mono text-sm tracking-widest uppercase mb-3">Pricing</p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-navy mb-4">
              Transparent, volume-based pricing
            </h2>
            <p className="text-muted max-w-xl mx-auto">No hidden fees. No long-term contracts required. Pay per verification or commit to an annual license for unlimited access.</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy text-white">
                <tr>
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">Unit</th>
                  <th className="px-6 py-4 font-semibold">Price</th>
                  <th className="px-6 py-4 font-semibold hidden md:table-cell">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {pricing.map((p) => (
                  <tr key={p.product} className="hover:bg-bg/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-navy">{p.product}</td>
                    <td className="px-6 py-4 text-muted">{p.unit}</td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-navy">{p.price}</span>
                      {p.priceGBP && <span className="text-xs text-muted ml-1">({p.priceGBP})</span>}
                    </td>
                    <td className="px-6 py-4 text-muted hidden md:table-cell">{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-xl border border-ardhi/20 bg-ardhi/5 p-5 flex items-start gap-3">
            <svg className="h-5 w-5 text-ardhi flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-navy">Volume example</p>
              <p className="text-sm text-muted">A bank auditing 10,000 titles at the bulk rate: <strong className="text-navy">KES 15M (~£90K)</strong>. This replaces 3-6 months of manual verification costing KES 50M+ (~£300K). Individual verifications at KES 2,499 per title.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TARGET INSTITUTIONS */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-sm font-medium text-muted mb-8 uppercase tracking-wider">Built for</p>
          <div className="flex flex-wrap justify-center gap-4">
            {logos.map((name) => (
              <div key={name} className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-navy">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API PREVIEW */}
      <section className="py-20 bg-navy text-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-ardhi font-mono text-sm tracking-widest uppercase mb-3">Developer-first</p>
              <h2 className="font-serif text-3xl font-bold mb-4">API-first infrastructure</h2>
              <p className="text-gray-300 leading-relaxed mb-6">
                Integrate Ardhi&apos;s verification engine directly into your loan management system, CRM, or underwriting platform. RESTful API with webhook callbacks and batch processing.
              </p>
              <Link href="/api-docs" className="inline-flex items-center gap-2 bg-ardhi text-white px-6 py-3 rounded-lg font-semibold hover:bg-ardhi-dark transition-colors">
                View API Documentation
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-6 font-mono text-sm overflow-x-auto">
              <p className="text-white/40 mb-2"># Verify a title</p>
              <p className="text-ardhi">POST</p><p className="text-white/80 mb-3"> /api/v1/verify-title</p>
              <pre className="text-gray-400 text-xs leading-relaxed">{`{
  "title_number": "LR.NO.12807/214",
  "county": "Kiambu",
  "callback_url": "https://your-bank.co.ke/webhook"
}

// Response (48hrs via webhook)
{
  "trust_score": 92,
  "outcome": "proceed",
  "risk_level": "safe",
  "checks": {
    "title_deed": "confirmed",
    "nlims_match": "confirmed",
    "encumbrances": "none",
    "disputes": "none",
    "fraud_score": 0.03
  },
  "certificate_url": "https://..."
}`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT FORM */}
      <section id="contact" className="py-20 bg-bg">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="font-serif text-3xl font-bold text-navy mb-4">Book a demo</h2>
            <p className="text-muted">Tell us about your institution and we&apos;ll show you how Ardhi can reduce your verification costs by 70%.</p>
          </div>

          {submitted ? (
            <div className="rounded-2xl border border-ardhi/20 bg-ardhi/5 p-10 text-center">
              <svg className="mx-auto h-12 w-12 text-ardhi mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-serif text-xl font-bold text-navy mb-2">Demo request received</h3>
              <p className="text-muted">Our enterprise team will contact you within 24 hours to schedule your demo.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-8 shadow-sm space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">Full name</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi" placeholder="James Mwangi" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">Work email</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi" placeholder="james@institution.co.ke" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">Institution</label>
                  <input type="text" required value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi" placeholder="Your institution name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">Your role</label>
                  <input type="text" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi" placeholder="Head of Credit Risk" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi" placeholder="+254 7XX XXX XXX" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">Portfolio size (approx titles)</label>
                  <select value={formData.titles} onChange={(e) => setFormData({...formData, titles: e.target.value})} className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi bg-white">
                    <option value="">Select range</option>
                    <option value="1-100">1 — 100</option>
                    <option value="100-1000">100 — 1,000</option>
                    <option value="1000-10000">1,000 — 10,000</option>
                    <option value="10000+">10,000+</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-1.5">Tell us about your needs</label>
                <textarea rows={4} value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi resize-none" placeholder="What verification challenges are you facing? What systems do you need to integrate with?" />
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-ardhi text-white py-4 rounded-lg font-semibold text-lg hover:bg-ardhi-dark transition-colors disabled:opacity-60">
                {submitting ? "Submitting..." : "Request Demo"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
