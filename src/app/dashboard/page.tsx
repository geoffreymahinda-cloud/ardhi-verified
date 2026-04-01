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

const stageLabels: Record<string, string> = {
  enquiry: "Property Enquiry",
  concierge: "Concierge Request",
  contact: "Contact Message",
  waitlist: "Waitlist Signup",
};

const statusSteps = ["new", "responded", "in_progress", "completed"];
const statusLabels: Record<string, string> = {
  new: "Submitted",
  responded: "Responded",
  in_progress: "In Progress",
  completed: "Completed",
};

function ProgressTracker({ status }: { status: string }) {
  const currentIdx = statusSteps.indexOf(status);

  return (
    <div className="flex items-center gap-1">
      {statusSteps.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <div className="flex flex-col items-center">
            <div
              className={`h-3 w-3 rounded-full border-2 transition-colors ${
                i <= currentIdx
                  ? "border-ardhi bg-ardhi"
                  : "border-border bg-white"
              }`}
            />
            <span className={`mt-1 text-[10px] ${i <= currentIdx ? "text-ardhi font-medium" : "text-muted"}`}>
              {statusLabels[step]}
            </span>
          </div>
          {i < statusSteps.length - 1 && (
            <div
              className={`h-0.5 w-6 sm:w-10 -mt-4 ${
                i < currentIdx ? "bg-ardhi" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

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
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-navy mb-2">Sign in to view your dashboard</h1>
          <p className="text-muted mb-6">Track your enquiries, verifications, and transactions.</p>
          <Link href="/auth/login" className="rounded-lg bg-ardhi px-6 py-3 font-semibold text-white hover:bg-ardhi-dark transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const propertyEnquiries = enquiries.filter((e) => e.journey_stage === "enquiry");
  const conciergeRequests = enquiries.filter((e) => e.journey_stage === "concierge");

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="font-serif text-3xl font-bold text-navy mb-2">My Dashboard</h1>
        <p className="text-muted mb-8">Track the progress of your land enquiries and transactions.</p>

        {enquiries.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-muted/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <h2 className="font-serif text-xl font-bold text-navy mb-2">No activity yet</h2>
            <p className="text-muted mb-6">Start by browsing verified listings and submitting an expression of interest.</p>
            <Link href="/search" className="rounded-lg bg-ardhi px-6 py-3 font-semibold text-white hover:bg-ardhi-dark transition-colors">
              Browse Listings
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Property Enquiries */}
            {propertyEnquiries.length > 0 && (
              <section>
                <h2 className="font-serif text-xl font-bold text-navy mb-4">Property Enquiries</h2>
                <div className="space-y-4">
                  {propertyEnquiries.map((enq) => (
                    <div key={enq.id} className="rounded-xl border border-border bg-card p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-navy">
                              {enq.listing_id ? `Listing #${enq.listing_id}` : "Property Enquiry"}
                            </h3>
                            <span className="text-xs text-muted">
                              {new Date(enq.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                            </span>
                          </div>
                          {enq.message && (
                            <p className="text-sm text-muted line-clamp-2">{enq.message}</p>
                          )}
                          {enq.responded_at && (
                            <p className="text-xs text-trust-green mt-2">
                              Agent responded on {new Date(enq.responded_at).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
                            </p>
                          )}
                        </div>
                        <ProgressTracker status={enq.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Concierge Requests */}
            {conciergeRequests.length > 0 && (
              <section>
                <h2 className="font-serif text-xl font-bold text-navy mb-4">Concierge Requests</h2>
                <div className="space-y-4">
                  {conciergeRequests.map((enq) => (
                    <div key={enq.id} className="rounded-xl border border-ardhi/20 bg-card p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-navy">Concierge Request</h3>
                            <span className="rounded-full bg-trust-amber/10 px-2.5 py-0.5 text-xs font-semibold text-trust-amber">Premium</span>
                            <span className="text-xs text-muted">
                              {new Date(enq.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                            </span>
                          </div>
                          {enq.message && (
                            <p className="text-sm text-muted line-clamp-2">{enq.message}</p>
                          )}
                        </div>
                        <ProgressTracker status={enq.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Saved Listings */}
            <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
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
                <Link href="/search" className="text-sm font-medium text-ardhi hover:text-ardhi-dark transition-colors">
                  Browse more →
                </Link>
              </div>
            </section>

            {/* Transaction Pipeline (future) */}
            <section className="rounded-2xl border border-border bg-navy/5 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="font-serif text-xl font-bold text-navy">Transaction Pipeline</h2>
                <span className="rounded-full bg-ardhi/10 px-2.5 py-0.5 text-xs font-semibold text-ardhi">Coming Soon</span>
              </div>
              <p className="text-sm text-muted mb-4">
                Once you proceed to purchase, you&apos;ll see a step-by-step tracker here:
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {["Enquiry", "Verification", "Escrow Deposit", "Legal Review", "Title Transfer", "Complete"].map((step, i, arr) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg bg-white border border-border px-3 py-1.5">
                      <div className="h-2 w-2 rounded-full bg-border" />
                      <span className="text-xs text-muted whitespace-nowrap">{step}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <svg className="h-4 w-4 text-border flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
