"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getMyTransactions } from "./actions";

interface Transaction {
  id: number;
  listing_id: number;
  amount: number;
  status: string;
  created_at: string;
  listings: { title: string; location: string; county: string } | null;
}

const statusConfig: Record<string, { label: string; color: string; step: number }> = {
  pending: { label: "Payment Pending", color: "bg-blue-100 text-blue-700", step: 0 },
  funded: { label: "Escrow Funded", color: "bg-ardhi/10 text-ardhi", step: 1 },
  verification: { label: "Under Verification", color: "bg-trust-amber/10 text-trust-amber", step: 2 },
  legal_review: { label: "Legal Review", color: "bg-purple-100 text-purple-700", step: 3 },
  transfer: { label: "Title Transfer", color: "bg-navy/10 text-navy", step: 4 },
  released: { label: "Funds Released", color: "bg-trust-green/10 text-trust-green", step: 5 },
  completed: { label: "Completed", color: "bg-trust-green/10 text-trust-green", step: 6 },
  disputed: { label: "Disputed", color: "bg-trust-red/10 text-trust-red", step: -1 },
};

const pipelineSteps = ["Payment", "Escrow", "Verification", "Legal", "Transfer", "Release", "Complete"];

export default function EscrowPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [authenticated, setAuthenticated] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyTransactions().then((result) => {
      setTransactions(result.transactions);
      setAuthenticated(result.authenticated);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-muted">Loading...</p></div>;
  }

  if (!authenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-navy mb-2">Sign in to view your escrow</h1>
          <p className="text-muted mb-6">Track your payments and land transactions in real time.</p>
          <Link href="/auth/login" className="rounded-lg bg-ardhi px-6 py-3 font-semibold text-white hover:bg-ardhi-dark transition-colors">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <section className="bg-navy px-4 pb-12 pt-20 sm:pb-16 sm:pt-28">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl">My Escrow Transactions</h1>
          <p className="mt-4 text-white/60">Track your payments — your money is protected at every step.</p>
        </div>
      </section>

      {/* How escrow works */}
      <section className="bg-ardhi px-4 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-center gap-1 overflow-x-auto">
          {pipelineSteps.map((step, i) => (
            <div key={step} className="flex items-center gap-1 flex-shrink-0">
              <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5">
                <span className="text-xs font-bold text-white">{i + 1}</span>
                <span className="text-xs font-medium text-white whitespace-nowrap">{step}</span>
              </div>
              {i < pipelineSteps.length - 1 && (
                <svg className="h-3 w-3 text-white/40 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Transactions */}
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {transactions.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-muted/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
            <h2 className="font-serif text-xl font-bold text-navy mb-2">No transactions yet</h2>
            <p className="text-muted mb-6">When you make your first escrow deposit, it will appear here with real-time tracking.</p>
            <Link href="/search" className="rounded-lg bg-ardhi px-6 py-3 font-semibold text-white hover:bg-ardhi-dark transition-colors">Browse Listings</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {transactions.map((txn) => {
              const config = statusConfig[txn.status] || statusConfig.pending;
              return (
                <div key={txn.id} className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-navy">
                        {txn.listings?.title || `Transaction #${txn.id}`}
                      </h3>
                      <p className="text-sm text-muted">{txn.listings?.location || ""}</p>
                      <p className="text-xs text-muted mt-1">
                        Started {new Date(txn.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-navy">KES {txn.amount.toLocaleString()}</p>
                      <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                  </div>

                  {/* Pipeline progress */}
                  <div className="flex items-center gap-1">
                    {pipelineSteps.map((step, i) => (
                      <div key={step} className="flex items-center gap-1 flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div className={`h-3 w-3 rounded-full border-2 ${
                            i <= config.step
                              ? "border-ardhi bg-ardhi"
                              : "border-border bg-white"
                          }`} />
                          <span className={`mt-1.5 text-[9px] whitespace-nowrap ${
                            i <= config.step ? "text-ardhi font-medium" : "text-muted"
                          }`}>
                            {step}
                          </span>
                        </div>
                        {i < pipelineSteps.length - 1 && (
                          <div className={`h-0.5 flex-1 -mt-4 ${i < config.step ? "bg-ardhi" : "bg-border"}`} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Escrow protection notice */}
                  <div className="mt-6 rounded-lg bg-ardhi/5 border border-ardhi/10 px-4 py-3 flex items-start gap-3">
                    <svg className="h-5 w-5 text-ardhi flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-ardhi">Protected by Ardhi Escrow</p>
                      <p className="text-xs text-muted mt-0.5">Your funds are held in a segregated CBK-licensed account. They will only be released when the title is transferred to your name.</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Trust signals */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z", title: "CBK-Licensed", desc: "Funds held by regulated banking partner" },
            { icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z", title: "Segregated Account", desc: "Never mixed with Ardhi's funds" },
            { icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z", title: "Full Refund", desc: "Money back if transfer fails" },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-5 text-center">
              <svg className="mx-auto h-8 w-8 text-ardhi mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <h3 className="text-sm font-semibold text-navy">{item.title}</h3>
              <p className="text-xs text-muted mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
