"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import CommunityFlagForm from "@/components/CommunityFlagForm";
import { getIntelligenceStats, searchCases, type IntelStats } from "./actions";

interface CaseResult {
  id: string;
  case_number: string;
  court_station: string;
  parties: string;
  outcome: string;
  judge: string;
  date_decided: string;
  source_url: string;
  parcel_reference: string[];
}

type Tab = "court-data" | "community";

function CaseCard({ caseData }: { caseData: CaseResult }) {
  const [expanded, setExpanded] = useState(false);
  const parcels = caseData.parcel_reference || [];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-sm">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-[10px] font-semibold text-navy">{caseData.court_station}</span>
              {caseData.outcome && (
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                  caseData.outcome === "Judgment" ? "bg-trust-amber/10 text-trust-amber" :
                  caseData.outcome === "Ruling" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                }`}>{caseData.outcome}</span>
              )}
              {parcels.length > 0 && (
                <span className="rounded-full bg-trust-red/10 px-2.5 py-0.5 text-[10px] font-semibold text-trust-red">
                  {parcels.length} parcel{parcels.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-navy leading-snug line-clamp-2">{caseData.parties}</h3>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted flex-wrap">
              {caseData.judge && <span>Judge: {caseData.judge}</span>}
              {caseData.date_decided && <span>{caseData.date_decided}</span>}
            </div>
          </div>
          <svg className={`h-5 w-5 text-muted flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border px-4 sm:px-5 py-4 bg-bg/50 space-y-3">
          {caseData.case_number && (
            <div className="text-xs"><span className="text-muted">Case: </span><span className="text-navy font-medium">{caseData.case_number}</span></div>
          )}
          {parcels.length > 0 && (
            <div>
              <span className="text-xs text-muted">Parcel References:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {parcels.map((p) => (
                  <span key={p} className="rounded bg-trust-red/5 border border-trust-red/20 px-2 py-0.5 text-[11px] font-mono text-trust-red">{p}</span>
                ))}
              </div>
            </div>
          )}
          <a href={caseData.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-ardhi hover:text-ardhi-dark transition-colors">
            View full judgment on Kenya Law
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}

export default function IntelligencePage() {
  const [tab, setTab] = useState<Tab>("court-data");
  const [stats, setStats] = useState<IntelStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CaseResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIntelligenceStats().then((data) => { setStats(data); setLoading(false); });
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchCases(searchQuery.trim());
    setSearchResults(results);
    setSearching(false);
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-navy px-4 pb-12 pt-20 sm:pb-16 sm:pt-28">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C4A44A]/30 bg-[#C4A44A]/10 px-4 py-1.5">
            <svg className="h-4 w-4 text-[#C4A44A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span className="text-sm font-medium text-[#C4A44A]">Land Dispute Intelligence</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Every land case in Kenya.
            <br />
            <span className="text-[#C4A44A]">Searchable. Verifiable.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/60">
            44,000+ court judgments across all Kenyan courts, 45,000+ Kenya Gazette land notices, 854 KeNHA/KURA road reserves, 7,316 riparian and protected zones from RCMRD — plus community-sourced dispute reports.
          </p>
        </div>
      </section>

      {/* Stats bar */}
      {stats && (
        <section className="bg-ardhi px-4 py-5">
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-5 sm:gap-10 text-center text-white flex-wrap">
            <div>
              <span className="text-2xl font-bold">{stats.totalCases.toLocaleString()}</span>
              <span className="ml-1.5 text-sm text-white/80">court cases</span>
            </div>
            <div className="hidden h-6 w-px bg-white/30 sm:block" />
            <div>
              <span className="text-2xl font-bold">{stats.totalGazetteNotices.toLocaleString()}</span>
              <span className="ml-1.5 text-sm text-white/80">gazette notices</span>
            </div>
            <div className="hidden h-6 w-px bg-white/30 sm:block" />
            <div>
              <span className="text-2xl font-bold">{stats.totalRoadReserves.toLocaleString()}</span>
              <span className="ml-1.5 text-sm text-white/80">road reserves</span>
            </div>
            <div className="hidden h-6 w-px bg-white/30 sm:block" />
            <div>
              <span className="text-2xl font-bold">{stats.totalRiparianZones.toLocaleString()}</span>
              <span className="ml-1.5 text-sm text-white/80">riparian zones</span>
            </div>
            <div className="hidden h-6 w-px bg-white/30 sm:block" />
            <div>
              <span className="text-2xl font-bold">{stats.totalStations}</span>
              <span className="ml-1.5 text-sm text-white/80">court stations</span>
            </div>
          </div>
        </section>
      )}

      {/* Tab navigation */}
      <div className="bg-white border-b border-border sticky top-[57px] z-40">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex gap-1">
            <button onClick={() => setTab("court-data")} className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${tab === "court-data" ? "border-ardhi text-ardhi" : "border-transparent text-muted hover:text-navy"}`}>
              Court Cases
            </button>
            <button onClick={() => setTab("community")} className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${tab === "community" ? "border-ardhi text-ardhi" : "border-transparent text-muted hover:text-navy"}`}>
              Community Reports
            </button>
          </div>
        </div>
      </div>

      {/* ═══ COURT DATA TAB ═══ */}
      {tab === "court-data" && (
        <>
          {/* Search */}
          <section className="bg-bg px-4 py-10">
            <div className="mx-auto max-w-3xl">
              <form onSubmit={handleSearch} className="flex overflow-hidden rounded-xl bg-white shadow-lg">
                <div className="relative flex-1">
                  <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by parcel number, party name, judge, or station..." className="h-14 w-full pl-12 pr-4 text-base text-text placeholder:text-muted/60 focus:outline-none" />
                </div>
                <button type="submit" disabled={searching} className="flex items-center gap-2 bg-ardhi px-8 text-base font-semibold text-white transition hover:bg-ardhi-dark disabled:opacity-60">
                  {searching ? "..." : "Search"}
                </button>
              </form>
              <p className="mt-3 text-center text-xs text-muted">Try: &quot;LR 209&quot;, &quot;Nairobi&quot;, a judge name, or party name</p>
            </div>
          </section>

          {/* Search Results */}
          {searchResults !== null && (
            <section className="bg-bg px-4 pb-12">
              <div className="mx-auto max-w-5xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-xl font-bold text-navy">
                    {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
                  </h2>
                  <button onClick={() => setSearchResults(null)} className="text-sm text-ardhi hover:text-ardhi-dark">Clear</button>
                </div>
                {searchResults.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-8 text-center"><p className="text-muted">No cases found.</p></div>
                ) : (
                  <div className="space-y-3">{searchResults.map((c) => <CaseCard key={c.id} caseData={c} />)}</div>
                )}
              </div>
            </section>
          )}

          {/* Default content */}
          {searchResults === null && stats && (
            <>
              <section className="bg-bg px-4 pb-16">
                <div className="mx-auto max-w-5xl grid md:grid-cols-2 gap-8">
                  {/* Court type breakdown */}
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h2 className="font-serif text-lg font-bold text-navy mb-4">Cases by Court Type</h2>
                    <div className="space-y-3 mb-6">
                      {stats.courtTypes.map((ct) => {
                        const pct = Math.round((ct.count / stats.totalCases) * 100);
                        return (
                          <div key={ct.type}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-navy font-medium">{ct.type}</span>
                              <span className="text-muted">{ct.count.toLocaleString()} ({pct}%)</span>
                            </div>
                            <div className="h-2 rounded-full bg-border overflow-hidden">
                              <div className="h-full rounded-full bg-ardhi" style={{ width: `${Math.max(pct, 2)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <h3 className="text-sm font-semibold text-navy mb-3 border-t border-border pt-4">Top 15 Stations</h3>
                    <div className="space-y-1.5">
                      {stats.topStations.map((s, i) => {
                        const maxCount = stats.topStations[0]?.count || 1;
                        const pct = Math.round((s.count / maxCount) * 100);
                        return (
                          <div key={s.station} className="flex items-center gap-2 text-xs">
                            <span className="text-muted w-4 text-right flex-shrink-0">{i + 1}</span>
                            <span className="text-navy font-medium w-36 truncate flex-shrink-0" title={s.station}>{s.station}</span>
                            <div className="h-1.5 rounded-full bg-border overflow-hidden flex-1">
                              <div className="h-full rounded-full bg-ardhi/70" style={{ width: `${Math.max(pct, 2)}%` }} />
                            </div>
                            <span className="text-muted w-12 text-right flex-shrink-0">{s.count.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* How we use this */}
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h2 className="font-serif text-lg font-bold text-navy mb-4">How Ardhi Uses This Data</h2>
                    <div className="space-y-4">
                      {[
                        { title: "Pre-Purchase Screening", desc: "Before any listing goes live, we cross-reference the parcel against this database. Active disputes mean the listing is blocked.", icon: "🔍" },
                        { title: "Fraud Detection", desc: "Our agents scan for patterns — multiple cases on the same parcel, fraudulent transfers flagged by courts, and ownership disputes.", icon: "🛡" },
                        { title: "Trust Score Input", desc: "Court dispute history is a weighted factor in every Trust Score. Zero disputes = higher score.", icon: "📊" },
                        { title: "Institutional Reports", desc: "Banks and SACCOs use this data to audit land-backed loan collateral in real time.", icon: "🏦" },
                      ].map((item) => (
                        <div key={item.title} className="flex items-start gap-3">
                          <span className="text-lg flex-shrink-0">{item.icon}</span>
                          <div>
                            <h3 className="text-sm font-semibold text-navy">{item.title}</h3>
                            <p className="text-xs text-muted mt-0.5 leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Recent cases */}
              <section className="bg-white px-4 py-16">
                <div className="mx-auto max-w-5xl">
                  <h2 className="font-serif text-2xl font-bold text-navy mb-2">Recent Cases with Parcel References</h2>
                  <p className="text-sm text-muted mb-8">Cases referencing specific land parcels — the data our verification agents use to flag disputes.</p>
                  {stats.recentCases.length > 0 ? (
                    <div className="space-y-3">{stats.recentCases.map((c) => <CaseCard key={c.id} caseData={c} />)}</div>
                  ) : (
                    <div className="rounded-xl border border-border bg-card p-8 text-center">
                      <p className="text-muted">Enrichment in progress — parcel references being extracted. Check back soon.</p>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </>
      )}

      {/* ═══ COMMUNITY TAB ═══ */}
      {tab === "community" && <CommunityFlagForm />}

      {/* CTA */}
      <section className="bg-navy px-4 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-2xl font-bold text-white mb-4">This is why Ardhi exists.</h2>
          <p className="text-white/60 mb-8">
            Kenyans lose billions to land fraud every year. Our intelligence database — from every court in Kenya plus community reports — is the foundation of the Trust Score that protects every buyer.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/browse" className="rounded-lg bg-ardhi px-8 py-3 font-semibold text-white hover:bg-ardhi-dark transition-colors">Browse Verified Land</Link>
            <Link href="/enterprise" className="rounded-lg border border-white/30 px-8 py-3 font-semibold text-white hover:bg-white/10 transition-colors">Enterprise API</Link>
          </div>
        </div>
      </section>
    </>
  );
}
