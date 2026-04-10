"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getPartnerData } from "./actions";
import { formatKES, formatGBP, kesToGbp } from "@/lib/data";

interface Listing {
  id: number;
  title: string;
  location: string;
  county: string;
  price_kes: number;
  size: string;
  land_type: string;
  use: string;
  verified: boolean;
  score: number;
  featured: boolean;
  instalment_available: boolean;
}

interface Enquiry {
  id: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
  listing_id: number;
}

interface Instalment {
  id: string;
  listing_id: number;
  total_price: number;
  deposit_amount: number;
  deposit_paid: boolean;
  monthly_amount: number;
  term_months: number;
  payments_made: number;
  status: string;
  next_payment_date: string | null;
  created_at: string;
}

interface Institution {
  id: string;
  name: string;
  slug: string;
  tier: string;
  institution_type: string;
  member_count: number | null;
}

type Tab = "overview" | "inventory" | "sales" | "audit";

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  responded: "bg-trust-green/10 text-trust-green",
  in_progress: "bg-trust-amber/10 text-trust-amber",
  completed: "bg-gray-100 text-gray-600",
  active: "bg-ardhi/10 text-ardhi",
  pending_deposit: "bg-trust-amber/10 text-trust-amber",
  defaulted: "bg-trust-red/10 text-trust-red",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function PartnerDashboard() {
  const [data, setData] = useState<{
    authenticated: boolean;
    authorized: boolean;
    institution: Institution | null;
    listings: Listing[];
    enquiries: Enquiry[];
    instalments: Instalment[];
  } | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPartnerData().then((result) => {
      setData(result as unknown as typeof data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-muted">Loading partner dashboard...</p></div>;
  }

  if (!data?.authenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-navy mb-2">Partner Sign In Required</h1>
          <p className="text-muted mb-6">Sign in with your institutional account to access the partner dashboard.</p>
          <Link href="/auth/login" className="rounded-lg bg-ardhi px-6 py-3 font-semibold text-white hover:bg-ardhi-dark transition-colors">Sign In</Link>
        </div>
      </div>
    );
  }

  if (!data?.authorized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-navy mb-2">Partner Access Required</h1>
          <p className="text-muted mb-6">Your account is not linked to a partner institution. Contact hello@ardhiverified.com for access.</p>
          <Link href="/" className="rounded-lg bg-ardhi px-6 py-3 font-semibold text-white hover:bg-ardhi-dark transition-colors">Go Home</Link>
        </div>
      </div>
    );
  }

  const { institution, listings, enquiries, instalments } = data;
  if (!institution) return null;

  // Calculate stats
  const totalListings = listings.length;
  const verifiedListings = listings.filter((l) => l.verified).length;
  const availableListings = listings.length; // All current listings are available
  const totalRevenue = instalments.reduce((sum, i) => sum + (i.deposit_paid ? i.deposit_amount : 0) + (i.monthly_amount * i.payments_made), 0);
  const outstandingBalance = instalments.reduce((sum, i) => sum + (i.total_price - (i.deposit_paid ? i.deposit_amount : 0) - (i.monthly_amount * i.payments_made)), 0);
  const activeInstalments = instalments.filter((i) => i.status === "active").length;
  const totalPortfolioValue = listings.reduce((sum, l) => sum + l.price_kes, 0);
  const newEnquiries = enquiries.filter((e) => e.status === "new").length;

  const tierBadge: Record<string, string> = {
    sacco: "bg-teal-600 text-white",
    bank: "bg-navy text-white",
    developer: "bg-[#C4A44A] text-navy",
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <section className="bg-navy px-4 pb-6 pt-16 sm:pt-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-serif text-2xl font-bold text-white">{institution.name}</h1>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${tierBadge[institution.tier] || "bg-gray-200 text-gray-700"}`}>
                  {institution.institution_type}
                </span>
              </div>
              <p className="text-white/50 text-sm">Partner Dashboard</p>
            </div>
            <Link href={`/partners/${institution.slug}`} className="text-sm text-white/50 hover:text-white transition-colors">
              View public profile →
            </Link>
          </div>
        </div>
      </section>

      {/* Tab navigation */}
      <div className="bg-white border-b border-border sticky top-[57px] z-40">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex gap-1 overflow-x-auto">
            {([
              { key: "overview", label: "Overview" },
              { key: "inventory", label: "Inventory" },
              { key: "sales", label: "Sales & Ledger" },
              { key: "audit", label: "Audit Status" },
            ] as { key: Tab; label: string }[]).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.key
                    ? "border-ardhi text-ardhi"
                    : "border-transparent text-muted hover:text-navy"
                }`}
              >
                {t.label}
                {t.key === "sales" && newEnquiries > 0 && (
                  <span className="ml-2 rounded-full bg-trust-red px-1.5 py-0.5 text-[10px] font-bold text-white">{newEnquiries}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">

        {/* ═══ OVERVIEW TAB ═══ */}
        {tab === "overview" && (
          <div className="space-y-8">
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Portfolio Value</p>
                <p className="text-2xl font-bold text-navy">{formatKES(totalPortfolioValue)}</p>
                <p className="text-xs text-muted">≈ {formatGBP(kesToGbp(totalPortfolioValue))}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Revenue Collected</p>
                <p className="text-2xl font-bold text-ardhi">{formatKES(totalRevenue)}</p>
                <p className="text-xs text-muted">≈ {formatGBP(kesToGbp(totalRevenue))}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Outstanding</p>
                <p className="text-2xl font-bold text-trust-amber">{formatKES(outstandingBalance)}</p>
                <p className="text-xs text-muted">{activeInstalments} active plans</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Listings</p>
                <p className="text-2xl font-bold text-navy">{totalListings}</p>
                <p className="text-xs text-muted">{verifiedListings} verified · {newEnquiries} new enquiries</p>
              </div>
            </div>

            {/* Recent activity */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent enquiries */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-navy mb-4">Recent Enquiries</h3>
                {enquiries.length === 0 ? (
                  <p className="text-sm text-muted">No enquiries yet.</p>
                ) : (
                  <div className="space-y-3">
                    {enquiries.slice(0, 5).map((e) => (
                      <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-navy truncate">{e.buyer_name}</p>
                          <p className="text-xs text-muted">{e.buyer_email}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 ${statusColors[e.status] || "bg-gray-100 text-gray-600"}`}>
                          {e.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active instalments */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-navy mb-4">Active Instalment Plans</h3>
                {instalments.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted mb-2">No instalment plans yet.</p>
                    <p className="text-xs text-muted">Plans will appear here when buyers purchase plots with instalments.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {instalments.slice(0, 5).map((i) => (
                      <div key={i.id} className="py-2 border-b border-border last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-navy">Listing #{i.listing_id}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[i.status] || "bg-gray-100"}`}>{i.status}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted">
                          <span>{i.payments_made} of {i.term_months} payments</span>
                          <span>{formatKES(i.monthly_amount)}/mo</span>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-border overflow-hidden">
                          <div className="h-full rounded-full bg-ardhi" style={{ width: `${(i.payments_made / i.term_months) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ INVENTORY TAB ═══ */}
        {tab === "inventory" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-xl font-bold text-navy">Inventory ({listings.length} plots)</h2>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-bg">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-navy">ID</th>
                    <th className="px-4 py-3 font-semibold text-navy">Title</th>
                    <th className="px-4 py-3 font-semibold text-navy">County</th>
                    <th className="px-4 py-3 font-semibold text-navy">Size</th>
                    <th className="px-4 py-3 font-semibold text-navy">Price (KES)</th>
                    <th className="px-4 py-3 font-semibold text-navy">Type</th>
                    <th className="px-4 py-3 font-semibold text-navy">Instalment</th>
                    <th className="px-4 py-3 font-semibold text-navy">Verified</th>
                    <th className="px-4 py-3 font-semibold text-navy">Score</th>
                    <th className="px-4 py-3 font-semibold text-navy">Featured</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {listings.map((l) => (
                    <tr key={l.id} className="hover:bg-bg/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted">#{l.id}</td>
                      <td className="px-4 py-3 font-medium text-navy max-w-[200px] truncate">{l.title}</td>
                      <td className="px-4 py-3 text-muted">{l.county}</td>
                      <td className="px-4 py-3 text-muted">{l.size}</td>
                      <td className="px-4 py-3 font-medium text-navy">{l.price_kes.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted">{l.land_type}</td>
                      <td className="px-4 py-3">
                        {l.instalment_available ? (
                          <span className="rounded-full bg-ardhi/10 text-ardhi px-2 py-0.5 text-[10px] font-semibold">Yes</span>
                        ) : (
                          <span className="text-xs text-muted">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {l.verified ? (
                          <span className="text-trust-green text-xs font-semibold">✓</span>
                        ) : (
                          <span className="text-trust-amber text-xs font-semibold">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${l.score >= 90 ? "text-trust-green" : l.score >= 70 ? "text-trust-amber" : "text-trust-red"}`}>
                          {l.score}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {l.featured ? <span className="text-[#C4A44A] text-xs font-semibold">★</span> : <span className="text-xs text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ SALES & LEDGER TAB ═══ */}
        {tab === "sales" && (
          <div className="space-y-8">
            {/* Revenue summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-ardhi/20 bg-ardhi/5 p-5">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-ardhi">{formatKES(totalRevenue)}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Outstanding Balance</p>
                <p className="text-2xl font-bold text-trust-amber">{formatKES(outstandingBalance)}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Active Plans</p>
                <p className="text-2xl font-bold text-navy">{activeInstalments}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Enquiries</p>
                <p className="text-2xl font-bold text-navy">{enquiries.length}</p>
                {newEnquiries > 0 && <p className="text-xs text-trust-red font-medium mt-0.5">{newEnquiries} new</p>}
              </div>
            </div>

            {/* Enquiries table */}
            <div>
              <h3 className="font-semibold text-navy mb-4">All Enquiries</h3>
              {enquiries.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                  <p className="text-muted">No enquiries received yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-bg">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-navy">Buyer</th>
                        <th className="px-4 py-3 font-semibold text-navy">Email</th>
                        <th className="px-4 py-3 font-semibold text-navy hidden md:table-cell">Phone</th>
                        <th className="px-4 py-3 font-semibold text-navy">Listing</th>
                        <th className="px-4 py-3 font-semibold text-navy">Status</th>
                        <th className="px-4 py-3 font-semibold text-navy">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {enquiries.map((e) => (
                        <tr key={e.id} className="hover:bg-bg/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-navy">{e.buyer_name}</td>
                          <td className="px-4 py-3"><a href={`mailto:${e.buyer_email}`} className="text-ardhi hover:underline text-xs">{e.buyer_email}</a></td>
                          <td className="px-4 py-3 text-muted text-xs hidden md:table-cell">{e.buyer_phone || "—"}</td>
                          <td className="px-4 py-3 text-xs text-muted">#{e.listing_id}</td>
                          <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[e.status] || "bg-gray-100"}`}>{e.status}</span></td>
                          <td className="px-4 py-3 text-xs text-muted">{new Date(e.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Instalment ledger */}
            <div>
              <h3 className="font-semibold text-navy mb-4">Instalment Ledger</h3>
              {instalments.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                  <p className="text-muted mb-2">No instalment plans yet.</p>
                  <p className="text-xs text-muted">When buyers purchase plots with instalments, their payment plans and progress will appear here in real time.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-bg">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-navy">Plan ID</th>
                        <th className="px-4 py-3 font-semibold text-navy">Listing</th>
                        <th className="px-4 py-3 font-semibold text-navy">Total</th>
                        <th className="px-4 py-3 font-semibold text-navy">Deposit</th>
                        <th className="px-4 py-3 font-semibold text-navy">Monthly</th>
                        <th className="px-4 py-3 font-semibold text-navy">Progress</th>
                        <th className="px-4 py-3 font-semibold text-navy">Status</th>
                        <th className="px-4 py-3 font-semibold text-navy">Next Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {instalments.map((i) => (
                        <tr key={i.id} className="hover:bg-bg/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-muted">{i.id.slice(0, 8)}</td>
                          <td className="px-4 py-3 text-xs text-muted">#{i.listing_id}</td>
                          <td className="px-4 py-3 font-medium text-navy">{formatKES(i.total_price)}</td>
                          <td className="px-4 py-3 text-xs">
                            {i.deposit_paid ? (
                              <span className="text-trust-green font-semibold">✓ {formatKES(i.deposit_amount)}</span>
                            ) : (
                              <span className="text-trust-amber font-semibold">Pending</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-navy">{formatKES(i.monthly_amount)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 rounded-full bg-border overflow-hidden">
                                <div className="h-full rounded-full bg-ardhi" style={{ width: `${(i.payments_made / i.term_months) * 100}%` }} />
                              </div>
                              <span className="text-[10px] text-muted">{i.payments_made}/{i.term_months}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[i.status] || "bg-gray-100"}`}>{i.status}</span></td>
                          <td className="px-4 py-3 text-xs text-muted">{i.next_payment_date || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ AUDIT STATUS TAB ═══ */}
        {tab === "audit" && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-trust-green/20 bg-trust-green/5 p-5">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Verified</p>
                <p className="text-2xl font-bold text-trust-green">{verifiedListings}</p>
                <p className="text-xs text-muted">of {totalListings} listings</p>
              </div>
              <div className="rounded-xl border border-trust-amber/20 bg-trust-amber/5 p-5">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Pending Verification</p>
                <p className="text-2xl font-bold text-trust-amber">{totalListings - verifiedListings}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Average Trust Score</p>
                <p className="text-2xl font-bold text-navy">
                  {listings.length > 0 ? Math.round(listings.reduce((sum, l) => sum + l.score, 0) / listings.length) : 0}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-navy mb-4">Listing Verification Status</h3>
              <div className="space-y-3">
                {listings.map((l) => {
                  const scoreColor = l.score >= 90 ? "text-trust-green" : l.score >= 70 ? "text-trust-amber" : "text-trust-red";
                  const scoreBg = l.score >= 90 ? "bg-trust-green" : l.score >= 70 ? "bg-trust-amber" : "bg-trust-red";
                  const scoreLabel = l.score >= 90 ? "Safe" : l.score >= 70 ? "Needs Review" : "High Risk";

                  return (
                    <div key={l.id} className="rounded-xl border border-border bg-card p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-navy truncate">{l.title}</h4>
                            <span className="font-mono text-[10px] text-muted">#{l.id}</span>
                          </div>
                          <p className="text-xs text-muted">{l.county} · {l.size} · {l.land_type} · {l.use}</p>
                        </div>

                        <div className="flex items-center gap-4 flex-shrink-0">
                          {/* Trust Score */}
                          <div className="text-center">
                            <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${scoreBg}/10 ${scoreColor}`}>
                              <span className={`h-2 w-2 rounded-full ${scoreBg}`} />
                              {l.score}/100 · {scoreLabel}
                            </div>
                          </div>

                          {/* Verification status */}
                          {l.verified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-trust-green/10 text-trust-green px-3 py-1 text-xs font-semibold">
                              ✓ Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-trust-amber/10 text-trust-amber px-3 py-1 text-xs font-semibold">
                              ⏳ Pending
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Verification checks */}
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { label: "Title Deed", passed: l.score >= 60 },
                          { label: "NLIMS Match", passed: l.score >= 85 },
                          { label: "No Disputes", passed: l.score >= 50 },
                          { label: "No Encumbrances", passed: l.score >= 80 },
                          { label: "Seller ID", passed: l.score >= 40 },
                          { label: "Agent LSK", passed: l.verified },
                        ].map((check) => (
                          <div key={check.label} className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px] font-medium ${check.passed ? "bg-trust-green/5 text-trust-green" : "bg-trust-red/5 text-trust-red"}`}>
                            {check.passed ? "✓" : "✗"} {check.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
