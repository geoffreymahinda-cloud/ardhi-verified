"use client";

import { useState } from "react";
import Link from "next/link";
import { submitWaitlist } from "@/app/actions";

const plans = [
  {
    name: "Essential",
    price: "£10",
    priceGBP: "KES 1,650",
    period: "/month",
    description: "Basic monitoring for a single title. Know the moment anything changes.",
    features: [
      "1 title monitored",
      "Nightly NLIMS registry check",
      "Email alerts for any changes",
      "Monthly status report",
    ],
    cta: "Join Waitlist",
    popular: false,
  },
  {
    name: "Guardian",
    price: "£25",
    priceGBP: "KES 4,125",
    period: "/month",
    description: "Full protection with instant alerts. Our most popular plan.",
    features: [
      "Up to 5 titles monitored",
      "Nightly NLIMS registry check",
      "Instant WhatsApp + email alerts",
      "Severity classification (Critical → Info)",
      "Plain-English explanation of every change",
      "Quarterly verification certificate",
      "Priority support",
    ],
    cta: "Join Waitlist",
    popular: true,
  },
  {
    name: "Estate",
    price: "£60",
    priceGBP: "KES 9,900",
    period: "/month",
    description: "For families, investors, and SACCOs managing multiple parcels.",
    features: [
      "Up to 20 titles monitored",
      "Nightly NLIMS registry check",
      "Instant WhatsApp + email + SMS alerts",
      "Severity classification with escalation",
      "Dedicated account manager",
      "Monthly portfolio report",
      "Legal guidance on Critical alerts",
      "Family member access (up to 3 users)",
    ],
    cta: "Join Waitlist",
    popular: false,
  },
];

const threats = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: "Unauthorised ownership transfer",
    description: "Someone attempts to transfer your title to a different name without your knowledge — the most dangerous form of land fraud.",
    severity: "Critical",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    title: "New caveat or court order",
    description: "A legal dispute, court injunction, or NLC complaint is filed against your parcel — blocking any transactions.",
    severity: "High",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    title: "New charge or mortgage",
    description: "A bank registers a charge or mortgage against your title — indicating someone may be using your land as collateral.",
    severity: "Medium",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: "Outstanding rates or arrears",
    description: "County rates fall into arrears, which can eventually lead to attachment and auction of your property.",
    severity: "Low",
  },
];

const severityColors: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border-red-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Low: "bg-blue-100 text-blue-700 border-blue-200",
};

const howItWorks = [
  { step: "1", title: "Register your title", description: "Enter your title number and county. We verify it exists in the NLIMS registry." },
  { step: "2", title: "We check every night", description: "Our Title Monitoring Agent queries NLIMS at 2am EAT daily. Every field is compared against the previous check." },
  { step: "3", title: "AI classifies any change", description: "If something changes, our AI classifies the severity — Critical, High, Medium, Low, or Info — and drafts a plain-English explanation." },
  { step: "4", title: "You get alerted instantly", description: "WhatsApp first, email second. Critical alerts reach you within 5 minutes. You know before anyone else." },
];

export default function LandGuardianPage() {
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <main className="bg-white">
      {/* HERO */}
      <section className="relative bg-navy text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, rgba(0,165,80,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(245,166,35,0.2) 0%, transparent 50%)" }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="inline-flex items-center gap-1.5 bg-ardhi/20 border border-ardhi/30 rounded-full px-4 py-1.5 text-ardhi text-sm font-semibold">
                Coming Soon
              </span>
              <span className="inline-flex items-center gap-2 bg-trust-amber/20 border border-trust-amber/30 rounded-full px-4 py-1.5">
                <svg className="w-4 h-4 text-trust-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span className="text-trust-amber text-sm font-medium">
                  KES 2.3B lost to title fraud in Kenya annually
                </span>
              </span>
            </div>

            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Your land title.
              <br />
              <span className="text-ardhi">Watched 24/7.</span>
            </h1>
            <p className="text-gray-300 text-lg md:text-xl leading-relaxed mb-8 max-w-2xl">
              Land Guardian monitors your title deed against Kenya&apos;s NLIMS registry every single night. If anyone tries to transfer, charge, or dispute your land — you know within minutes, not months.
            </p>

            {/* Waitlist signup */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 max-w-lg">
              <p className="text-sm text-white/80 mb-3 font-medium">Join the waitlist — be first to protect your title</p>
              {!submitted ? (
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/50"
                  />
                  <button
                    onClick={async () => {
                      if (!waitlistEmail) return;
                      const result = await submitWaitlist(waitlistEmail);
                      if (result.success) setSubmitted(true);
                    }}
                    className="bg-ardhi text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-ardhi-dark transition-colors whitespace-nowrap"
                  >
                    Join waitlist
                  </button>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-ardhi font-semibold mb-1">You&apos;re on the list!</p>
                  <p className="text-white/60 text-sm">We&apos;ll notify you as soon as Land Guardian launches.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* WHAT WE DETECT */}
      <section className="py-20 bg-bg">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-trust-amber font-mono text-sm tracking-widest uppercase mb-3">What we detect</p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-navy mb-4">
              Four threats. Caught before they cost you.
            </h2>
            <p className="text-muted max-w-xl mx-auto">
              Land fraud in Kenya happens silently. By the time you discover it, the damage is done. Land Guardian catches these threats the night they appear.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {threats.map((t) => (
              <div key={t.title} className="bg-white border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="text-navy/70 mt-1">{t.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-navy">{t.title}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${severityColors[t.severity]}`}>
                        {t.severity}
                      </span>
                    </div>
                    <p className="text-muted text-sm leading-relaxed">{t.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-ardhi font-mono text-sm tracking-widest uppercase mb-3">How it works</p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-navy">
              Nightly checks. Instant alerts.
            </h2>
          </div>

          <div className="space-y-0">
            {howItWorks.map((item, i) => (
              <div key={item.step} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-ardhi text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {item.step}
                  </div>
                  {i < howItWorks.length - 1 && <div className="w-px h-full bg-ardhi/20 my-2" />}
                </div>
                <div className="pb-10">
                  <h3 className="font-semibold text-navy text-lg mb-1">{item.title}</h3>
                  <p className="text-muted leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ALERT EXAMPLE */}
      <section className="py-20 bg-navy text-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-trust-amber font-mono text-sm tracking-widest uppercase mb-3">Real-time alerts</p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold">
              This is what a Land Guardian alert looks like
            </h2>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 font-mono text-xs font-semibold uppercase tracking-wider">Critical Alert</span>
              <span className="text-white/40 text-xs ml-auto">2 minutes ago</span>
            </div>

            <h3 className="text-lg font-semibold mb-3">
              Ownership Transfer Detected — LR.NO.12807/214
            </h3>

            <div className="space-y-3 text-sm text-gray-300 mb-6">
              <div className="flex gap-3">
                <span className="text-white/50 w-20 flex-shrink-0">Title:</span>
                <span>LR.NO.12807/214 — Ruiru, Kiambu County</span>
              </div>
              <div className="flex gap-3">
                <span className="text-white/50 w-20 flex-shrink-0">Change:</span>
                <span className="text-red-400">Owner name changed from &quot;James Mwangi Kamau&quot; to &quot;Unknown Third Party&quot;</span>
              </div>
              <div className="flex gap-3">
                <span className="text-white/50 w-20 flex-shrink-0">Detected:</span>
                <span>30 March 2026, 02:14 AM EAT</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-trust-amber mb-2">What this means</p>
              <p className="text-sm text-gray-300 leading-relaxed">
                Someone has initiated a transfer of your title deed to a different name. This could indicate a fraudulent transfer attempt. You should contact your lawyer immediately and file a caution at the Land Registry to block further transactions.
              </p>
            </div>

            <div className="flex gap-3">
              <div className="bg-ardhi/20 text-ardhi text-xs font-medium px-3 py-1.5 rounded-full">WhatsApp sent ✓</div>
              <div className="bg-white/10 text-white/60 text-xs font-medium px-3 py-1.5 rounded-full">Email sent ✓</div>
              <div className="bg-red-500/20 text-red-400 text-xs font-medium px-3 py-1.5 rounded-full">Guardian team alerted</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 bg-bg">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-ardhi font-mono text-sm tracking-widest uppercase mb-3">Pricing</p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-navy mb-4">
              Peace of mind from £10/month
            </h2>
            <p className="text-muted max-w-xl mx-auto">
              Less than a cup of coffee per day to protect your most valuable asset.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 flex flex-col bg-white ${
                  plan.popular
                    ? "border-ardhi shadow-lg shadow-ardhi/10 ring-1 ring-ardhi"
                    : "border-border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-ardhi text-white text-xs font-semibold px-4 py-1 rounded-full">
                    Most popular
                  </div>
                )}
                <h3 className="font-serif text-2xl font-bold text-navy">{plan.name}</h3>
                <div className="mt-3 mb-1">
                  <span className="text-3xl font-bold text-navy">{plan.price}</span>
                  <span className="text-muted text-sm">{plan.period}</span>
                  <span className="text-muted text-xs ml-2">({plan.priceGBP}/mo)</span>
                </div>
                <p className="text-muted text-sm mb-6">{plan.description}</p>

                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-700">
                      <svg className="w-5 h-5 text-ardhi flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <button className={`block w-full text-center py-3 px-6 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? "bg-ardhi text-white hover:bg-ardhi-dark"
                    : "bg-navy/5 text-navy hover:bg-navy/10"
                }`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy text-white py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-1.5 bg-ardhi/20 border border-ardhi/30 rounded-full px-4 py-1.5 mb-6">
            <span className="text-ardhi text-sm font-semibold">Coming Soon</span>
          </div>
          <h2 className="font-serif text-3xl font-bold mb-4">
            Be the first to know when Land Guardian launches
          </h2>
          <p className="text-gray-300 mb-8 leading-relaxed">
            Title fraud is silent. By the time you discover it, reversing the damage costs millions in legal fees and years in court. Land Guardian will catch threats the night they appear — for less than KES 17 per day.
          </p>
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-block bg-ardhi text-white px-8 py-4 rounded-lg font-semibold hover:bg-ardhi-dark transition-colors">
            Join the waitlist
          </a>
        </div>
      </section>
    </main>
  );
}
