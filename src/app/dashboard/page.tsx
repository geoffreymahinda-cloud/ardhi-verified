"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getMyEnquiries } from "./actions";

interface Enquiry {
  id: number;
  buyer_name: string;
  buyer_email: string;
  message: string | null;
  journey_stage: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  listing_id: number | null;
}

const statusLabels: Record<string, string> = {
  new: "Submitted",
  responded: "Responded",
  in_progress: "In Progress",
  completed: "Completed",
};

export default function DashboardPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [authenticated, setAuthenticated] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyEnquiries().then((result) => {
      setEnquiries(result.enquiries);
      setSavedCount(result.savedListingIds.length);
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
          <h1 className="font-serif text-2xl font-bold text-navy mb-2">Sign in to view your dashboard</h1>
          <p className="text-muted mb-6">Track your land purchases, enquiries, and documents.</p>
          <Link href="/auth/login" className="rounded-lg bg-ardhi px-6 py-3 font-semibold text-white hover:bg-ardhi-dark transition-colors">Sign in</Link>
        </div>
      </div>
    );
  }

  const propertyEnquiries = enquiries.filter((e) => e.journey_stage === "enquiry");
  const conciergeRequests = enquiries.filter((e) => e.journey_stage === "concierge");

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <section className="bg-navy px-4 pb-8 pt-16 sm:pt-20">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-serif text-3xl font-bold text-white">My Dashboard</h1>
          <p className="mt-2 text-white/50">Track your land purchases and enquiries.</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12 space-y-8">
        {/* ── MY JOURNEY ── */}
        <section>
          <h2 className="font-serif text-xl font-bold text-navy mb-4">My Journey</h2>
          <p className="text-sm text-muted mb-4">
            Ardhi Verified qualifies your interest and introduces you to a partner institution. From deposit onwards, your SACCO or institutional partner manages all payments and title transfer directly.
          </p>

          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <ol className="space-y-5">
              {[
                { label: "Expression of Interest", desc: "You have submitted interest in a verified listing.", state: "pending" as const },
                { label: "Verified", desc: "Identity verification and KYC complete.", state: "pending" as const },
                { label: "Introduced to Partner", desc: "We have made a warm introduction to the partner institution.", state: "pending" as const },
                { label: "Purchase Complete", desc: "Title transfer completed by your partner institution.", state: "pending" as const },
                { label: "Land Guardian Active", desc: "Your title is under permanent monitoring.", state: "pending" as const },
              ].map((stage, i) => {
                const done = stage.state !== "pending";
                return (
                  <li key={stage.label} className="flex items-start gap-4">
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      done ? "bg-ardhi text-white" : "bg-border text-muted"
                    }`}>
                      {done ? "✓" : i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${done ? "text-navy" : "text-muted"}`}>
                        {stage.label}
                      </p>
                      <p className="text-xs text-muted mt-0.5">{stage.desc}</p>
                    </div>
                    {!done && i === 0 && (
                      <span className="rounded-full bg-trust-amber/10 px-2.5 py-0.5 text-[10px] font-semibold text-trust-amber">
                        Next step
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 border-t border-border pt-5 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/browse" className="inline-block rounded-lg bg-ardhi px-6 py-3 font-semibold text-white hover:bg-ardhi-dark transition-colors text-center">
                Browse Verified Land
              </Link>
              <Link href="/land-guardian" className="inline-block rounded-lg border border-border px-6 py-3 font-semibold text-navy hover:bg-bg transition-colors text-center">
                About Land Guardian
              </Link>
            </div>
          </div>
        </section>

        {/* ── ENQUIRIES ── */}
        {(propertyEnquiries.length > 0 || conciergeRequests.length > 0) && (
          <section>
            <h2 className="font-serif text-xl font-bold text-navy mb-4">My Enquiries</h2>
            <div className="space-y-3">
              {[...propertyEnquiries, ...conciergeRequests].map((enq) => (
                <div key={enq.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-navy truncate">
                        {enq.journey_stage === "concierge" ? "Concierge Request" : `Listing #${enq.listing_id || "—"}`}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        enq.status === "new" ? "bg-blue-100 text-blue-700" :
                        enq.status === "responded" ? "bg-trust-green/10 text-trust-green" :
                        enq.status === "in_progress" ? "bg-trust-amber/10 text-trust-amber" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {statusLabels[enq.status] || enq.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {new Date(enq.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  {enq.responded_at && (
                    <p className="text-xs text-trust-green flex-shrink-0">
                      Responded {new Date(enq.responded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── SAVED LISTINGS ── */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-navy">Saved Listings</h3>
                <p className="text-xs text-muted">{savedCount} {savedCount === 1 ? "property" : "properties"} saved</p>
              </div>
            </div>
            <Link href="/browse" className="text-sm font-medium text-ardhi hover:text-ardhi-dark transition-colors">Browse more →</Link>
          </div>
        </section>

        {/* ── MY DOCUMENTS ── */}
        <section>
          <h2 className="font-serif text-xl font-bold text-navy mb-4">My Documents</h2>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="space-y-3">
              {[
                { name: "Verification Report", desc: "Generated after expressing interest in a verified plot", available: false },
                { name: "KYC Confirmation", desc: "Available once your identity verification is complete", available: false },
                { name: "Introduction Letter", desc: "Sent once we introduce you to your partner institution", available: false },
              ].map((doc) => (
                <div key={doc.name} className="flex items-center gap-3 py-2">
                  <svg className={`h-5 w-5 flex-shrink-0 ${doc.available ? "text-ardhi" : "text-muted/30"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <div>
                    <p className={`text-sm font-medium ${doc.available ? "text-navy" : "text-muted"}`}>{doc.name}</p>
                    <p className="text-xs text-muted">{doc.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MY PROFILE ── */}
        <section>
          <h2 className="font-serif text-xl font-bold text-navy mb-4">My Profile</h2>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted mb-1">KYC Status</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-trust-amber/10 px-3 py-1 text-xs font-semibold text-trust-amber">
                  <span className="h-1.5 w-1.5 rounded-full bg-trust-amber" />
                  Pending
                </span>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Notification preferences</p>
                <p className="text-sm text-navy">Email + WhatsApp</p>
              </div>
            </div>
            <p className="text-xs text-muted mt-4">To update your details, contact <a href="mailto:hello@ardhiverified.com" className="text-ardhi hover:underline">hello@ardhiverified.com</a></p>
          </div>
        </section>
      </div>
    </div>
  );
}
