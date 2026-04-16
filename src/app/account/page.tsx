"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ── Types ── */

interface Subscription {
  plan: string;
  status: string;
  searches_used: number;
  searches_limit: number;
  price_kes: number;
  current_period_start: string | null;
  current_period_end: string | null;
}

interface Usage {
  plan: string;
  queries_this_period: number;
  queries_limit: number | null;
  period_start: string;
  period_end: string | null;
  remaining: number | null;
}

/* ── Pricing tiers ── */

const TIERS = [
  {
    key: "starter",
    name: "Starter",
    price: "KES 5,000",
    priceNum: 5000,
    searches: "10 searches/month",
    searchesNum: 10,
    features: ["10 HatiScan searches per month", "Full risk reports", "Email support"],
    popular: false,
  },
  {
    key: "professional",
    name: "Professional",
    price: "KES 12,000",
    priceNum: 12000,
    searches: "Unlimited searches",
    searchesNum: -1,
    features: ["Unlimited HatiScan searches", "Full risk reports", "Priority support", "API access"],
    popular: true,
  },
  {
    key: "firm",
    name: "Firm",
    price: "KES 25,000",
    priceNum: 25000,
    searches: "Unlimited, multi-user",
    searchesNum: -1,
    features: [
      "Unlimited HatiScan searches",
      "Multi-user access",
      "Dedicated account manager",
      "Custom integrations",
    ],
    popular: false,
  },
] as const;

/* ── Helpers ── */

function formatDate(iso: string | null): string {
  if (!iso) return "--";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function planLabel(plan: string): string {
  if (plan === "professional") return "Professional";
  if (plan === "firm") return "Firm";
  if (plan === "starter") return "Starter";
  return "Free";
}

function planBadgeColor(plan: string): string {
  if (plan === "firm") return "bg-[#C4A44A] text-navy";
  if (plan === "professional") return "bg-ardhi text-white";
  if (plan === "starter") return "bg-blue-600 text-white";
  return "bg-border text-navy";
}

/* ── Component ── */

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?next=/account");
        return;
      }

      setAuthenticated(true);

      const [subRes, usageRes] = await Promise.all([
        fetch("/api/user/subscription"),
        fetch("/api/user/usage"),
      ]);

      if (subRes.ok) setSubscription(await subRes.json());
      if (usageRes.ok) setUsage(await usageRes.json());

      setLoading(false);
    }

    load();
  }, [router]);

  /* ── Actions ── */

  async function handleUpgrade(plan: string) {
    setActionLoading(plan);
    setError(null);
    try {
      const res = await fetch("/api/subscribe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to start checkout");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleManageBilling() {
    setActionLoading("billing");
    setError(null);
    try {
      const res = await fetch("/api/subscribe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to open billing portal");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  /* ── Loading / unauthenticated ── */

  if (loading || !authenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  const plan = subscription?.plan || "free";
  const isFree = plan === "free";
  const isUnlimited = plan === "professional" || plan === "firm";
  const searchesUsed = usage?.queries_this_period ?? subscription?.searches_used ?? 0;
  const searchesLimit = usage?.queries_limit ?? subscription?.searches_limit ?? 3;
  const usagePercent = searchesLimit > 0 ? Math.min(100, Math.round((searchesUsed / searchesLimit) * 100)) : 0;
  const nearingLimit = searchesLimit > 0 && searchesUsed >= searchesLimit * 0.8;

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <section className="bg-navy px-4 pb-8 pt-16 sm:pt-20">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-serif text-3xl font-bold text-white">My Account</h1>
          <p className="mt-2 text-white/50">Manage your subscription and usage.</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12 space-y-8">
        {/* Error banner */}
        {error && (
          <div className="rounded-lg bg-trust-red/5 border border-trust-red/20 px-4 py-3 text-sm text-trust-red">
            {error}
          </div>
        )}

        {/* ── Current Plan ── */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Current Plan</p>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${planBadgeColor(plan)}`}>
                  {planLabel(plan)}
                </span>
                <span className="text-sm text-muted">
                  {isFree ? "Free tier" : `${subscription?.status === "active" ? "Active" : subscription?.status || "Active"}`}
                </span>
              </div>
              {!isFree && subscription && (
                <p className="mt-2 text-sm text-muted">
                  KES {(subscription.price_kes / 100).toLocaleString()}/month
                </p>
              )}
            </div>
            {!isFree && (
              <button
                onClick={handleManageBilling}
                disabled={actionLoading === "billing"}
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-navy hover:bg-bg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {actionLoading === "billing" ? "Opening..." : "Manage Billing"}
              </button>
            )}
          </div>

          {/* Billing period */}
          {(subscription?.current_period_start || usage?.period_start) && (
            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-xs text-muted">
                Billing period: {formatDate(subscription?.current_period_start || usage?.period_start || null)}
                {" "}&mdash;{" "}
                {formatDate(subscription?.current_period_end || usage?.period_end || null)}
              </p>
            </div>
          )}
        </section>

        {/* ── Usage ── */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="font-serif text-xl font-bold text-navy mb-4">Usage This Period</h2>

          {isUnlimited ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ardhi/10">
                <svg className="h-5 w-5 text-ardhi" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-navy">{searchesUsed} searches used</p>
                <p className="text-xs text-muted">Unlimited searches on your plan</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-sm font-semibold text-navy">
                  {searchesUsed} of {searchesLimit} searches used
                </p>
                <p className="text-xs text-muted">{usage?.remaining ?? searchesLimit - searchesUsed} remaining</p>
              </div>

              {/* Progress bar */}
              <div className="h-3 w-full rounded-full bg-border overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    nearingLimit ? "bg-trust-amber" : "bg-ardhi"
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>

              {/* Warning when nearing limit */}
              {nearingLimit && (
                <div className="mt-4 rounded-lg bg-trust-amber/10 border border-trust-amber/20 px-4 py-3 flex items-start gap-3">
                  <svg className="h-5 w-5 text-trust-amber flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-trust-amber">
                      {searchesUsed >= searchesLimit ? "Search limit reached" : "Approaching search limit"}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      Upgrade to a higher plan for more searches.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Pricing Cards ── */}
        <section>
          <h2 className="font-serif text-xl font-bold text-navy mb-2">
            {isFree ? "Choose a Plan" : "Available Plans"}
          </h2>
          <p className="text-sm text-muted mb-6">
            {isFree
              ? "Unlock full HatiScan risk reports with a subscription."
              : "Upgrade or switch your plan at any time."}
          </p>

          <div className="grid gap-5 sm:grid-cols-3">
            {TIERS.map((tier) => {
              const isCurrent = tier.key === plan;
              const isDowngrade =
                !isFree &&
                tier.priceNum <
                  (TIERS.find((t) => t.key === plan)?.priceNum ?? 0);

              return (
                <div
                  key={tier.key}
                  className={`relative rounded-2xl border p-6 flex flex-col ${
                    tier.popular
                      ? "border-ardhi bg-ardhi/[0.03] shadow-md"
                      : "border-border bg-card"
                  }`}
                >
                  {tier.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ardhi px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                      Most Popular
                    </span>
                  )}

                  <h3 className="font-serif text-lg font-bold text-navy">{tier.name}</h3>
                  <p className="text-2xl font-bold text-navy mt-2">
                    {tier.price}
                    <span className="text-sm font-normal text-muted">/month</span>
                  </p>
                  <p className="text-xs text-muted mt-1 mb-5">{tier.searches}</p>

                  <ul className="space-y-2 mb-6 flex-1">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-navy">
                        <svg className="h-4 w-4 text-ardhi flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <span className="block w-full text-center rounded-lg border border-ardhi/30 bg-ardhi/5 px-4 py-2.5 text-sm font-semibold text-ardhi">
                      Current Plan
                    </span>
                  ) : isDowngrade ? (
                    <button
                      onClick={handleManageBilling}
                      disabled={actionLoading !== null}
                      className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-muted hover:bg-bg transition-colors disabled:opacity-60"
                    >
                      Contact to Downgrade
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(tier.key)}
                      disabled={actionLoading !== null}
                      className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                        tier.popular
                          ? "bg-ardhi text-white hover:bg-ardhi-dark"
                          : "bg-navy text-white hover:bg-navy-light"
                      }`}
                    >
                      {actionLoading === tier.key ? "Redirecting..." : "Upgrade"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Free tier CTA ── */}
        {isFree && (
          <section className="rounded-2xl bg-gradient-to-br from-navy to-navy-light p-6 sm:p-8 text-center">
            <h3 className="font-serif text-xl font-bold text-white mb-2">
              Upgrade to unlock full HatiScan reports
            </h3>
            <p className="text-sm text-white/60 mb-5 max-w-md mx-auto">
              Free accounts are limited to {searchesLimit} basic scans per month. Subscribe to access
              full risk intelligence, court case details, gazette analysis, and spatial overlays.
            </p>
            <button
              onClick={() => handleUpgrade("starter")}
              disabled={actionLoading !== null}
              className="rounded-lg bg-ardhi px-8 py-3 font-semibold text-white hover:bg-ardhi-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {actionLoading === "starter" ? "Redirecting..." : "Get Started \u2014 KES 5,000/month"}
            </button>
          </section>
        )}

        {/* ── Back to Dashboard ── */}
        <div className="text-center pb-4">
          <Link href="/dashboard" className="text-sm font-medium text-ardhi hover:text-ardhi-dark transition-colors">
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
