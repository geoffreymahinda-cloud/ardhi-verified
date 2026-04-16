"use client";

import { useState } from "react";
import Link from "next/link";

const tiers = [
  {
    key: "starter",
    name: "Starter",
    price: 5000,
    period: "/month",
    searches: "10 searches/month",
    description: "For individual advocates doing occasional due diligence",
    features: [
      "10 HatiScan searches per month",
      "Full 12-layer risk reports",
      "Trust Score on every search",
      "PDF report download",
      "Email support",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    key: "professional",
    name: "Professional",
    price: 12000,
    period: "/month",
    searches: "Unlimited searches",
    description: "For active conveyancing advocates and firms",
    features: [
      "Unlimited HatiScan searches",
      "Full 12-layer risk reports",
      "Trust Score on every search",
      "PDF report download",
      "API access",
      "Priority support",
    ],
    cta: "Get Started",
    popular: true,
  },
  {
    key: "firm",
    name: "Firm",
    price: 25000,
    period: "/month",
    searches: "Unlimited, multi-user",
    description: "For law firms and institutional conveyancers",
    features: [
      "Everything in Professional",
      "Multi-user access (up to 10 seats)",
      "Dedicated account manager",
      "Bulk CSV upload",
      "Custom integrations",
      "SLA guarantee",
    ],
    cta: "Get Started",
    popular: false,
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSubscribe(plan: string) {
    setLoading(plan);
    try {
      const res = await fetch("/api/subscribe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (res.status === 401) {
        window.location.href = `/auth/login?next=/pricing`;
      } else {
        alert(data.detail || data.error || "Something went wrong. Please try again.");
      }
    } catch {
      alert("Failed to start checkout. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="bg-bg">
      {/* Hero */}
      <section className="bg-navy px-4 py-16 sm:py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-white/50">
            One platform for all your land due diligence. No hidden fees. Cancel anytime.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-ardhi/30 bg-ardhi/10 px-4 py-1.5">
            <span className="text-sm font-medium text-ardhi">First 100 advocates get a 30-day free trial</span>
            <Link href="/trial" className="text-sm font-bold text-white underline underline-offset-2 hover:text-ardhi">
              Claim yours →
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl grid gap-8 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.key}
              className={`relative rounded-2xl border p-8 flex flex-col ${
                tier.popular
                  ? "border-ardhi shadow-lg shadow-ardhi/10 bg-card"
                  : "border-border bg-card"
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-ardhi px-4 py-1 text-xs font-bold text-white uppercase tracking-wider">
                  Most Popular
                </span>
              )}

              <h3 className="font-serif text-xl font-bold text-navy">{tier.name}</h3>
              <p className="mt-1 text-sm text-muted">{tier.description}</p>

              <div className="mt-6">
                <span className="text-4xl font-bold text-navy">
                  KES {tier.price.toLocaleString()}
                </span>
                <span className="text-muted">{tier.period}</span>
              </div>

              <p className="mt-2 text-sm font-medium text-ardhi">{tier.searches}</p>

              <ul className="mt-6 space-y-3 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-muted">
                    <svg className="h-4 w-4 text-ardhi flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(tier.key)}
                disabled={loading === tier.key}
                className={`mt-8 w-full rounded-xl py-3.5 text-sm font-semibold transition ${
                  tier.popular
                    ? "bg-ardhi text-white hover:bg-ardhi-dark"
                    : "border border-border bg-bg text-navy hover:bg-ardhi hover:text-white hover:border-ardhi"
                } disabled:opacity-60`}
              >
                {loading === tier.key ? "Redirecting..." : tier.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Per-report option */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center">
          <h3 className="font-serif text-lg font-bold text-navy">Just need a single report?</h3>
          <p className="mt-2 text-sm text-muted">
            No subscription required. Run a one-off HatiScan for <strong className="text-navy">KES 2,500</strong> per title.
          </p>
          <Link
            href="/hatiscan"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy/90"
          >
            Go to HatiScan
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-navy px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-2xl font-bold text-white mb-8">Common Questions</h2>
          <div className="space-y-6 text-left">
            {[
              { q: "Can I switch plans?", a: "Yes. Upgrade or downgrade at any time from your account page. Changes take effect at the start of your next billing period." },
              { q: "What counts as a search?", a: "Each HatiScan scan — free or full — counts as one search. Document uploads and spatial analysis are included with the scan." },
              { q: "Is there a free trial?", a: "Yes. The first 100 advocates to sign up receive 30 days of Professional access completely free. Visit /trial to claim yours." },
              { q: "How do I pay?", a: "All payments are processed securely via Stripe. We accept Visa, Mastercard, and M-Pesa (via card). All prices are in Kenyan Shillings (KES)." },
            ].map((faq) => (
              <div key={faq.q} className="rounded-xl border border-white/10 bg-white/5 p-5">
                <p className="font-semibold text-white">{faq.q}</p>
                <p className="mt-2 text-sm text-white/50 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
