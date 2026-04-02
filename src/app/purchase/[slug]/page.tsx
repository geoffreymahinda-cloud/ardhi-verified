"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatKES, formatGBP, kesToGbp, calculateInstalment } from "@/lib/data";

type Step = 1 | 2 | 3 | 4;

const stepLabels = ["Your Details", "Identity Verification", "Secure Your Plot", "Confirmation"];

interface ListingData {
  id: number;
  title: string;
  slug: string;
  location: string;
  county: string;
  priceKES: number;
  size: string;
  type: string;
  image: string;
  instalmentAvailable: boolean;
  minDepositPercent: number;
  instalmentTermOptions: number[];
  institutionName: string | null;
}

export default function PurchasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [step, setStep] = useState<Step>(1);
  const [listing, setListing] = useState<ListingData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [details, setDetails] = useState({ name: "", email: "", phone: "", country: "" });
  const [selectedTerm, setSelectedTerm] = useState(24);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "mpesa">("card");
  const [referenceNumber] = useState(`AV-${Date.now().toString(36).toUpperCase()}`);

  useEffect(() => {
    params.then(({ slug }) => {
      fetch(`/api/listing/${slug}`)
        .catch(() => null)
        .then(() => {
          // For now, we'll use a simplified approach — listing data passed via searchParams
          // In production, this would fetch from a server action
          setLoading(false);
        });

      // Temporary: fetch listing data from the page's search params or hardcode demo
      // This will be replaced with a proper server action
      setListing({
        id: 1,
        title: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        slug,
        location: "Kiambu County",
        county: "Kiambu",
        priceKES: 4200000,
        size: "0.5 ac",
        type: "Freehold",
        image: `https://picsum.photos/seed/${slug}/800/500`,
        instalmentAvailable: true,
        minDepositPercent: 20,
        instalmentTermOptions: [12, 24, 36, 60],
        institutionName: "Stima SACCO",
      });
      setLoading(false);
    });
  }, [params]);

  if (loading || !listing) {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-muted">Loading...</p></div>;
  }

  const inst = calculateInstalment(listing.priceKES, listing.minDepositPercent, selectedTerm);

  function nextStep() {
    if (step < 4) setStep((step + 1) as Step);
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Progress bar */}
      <div className="bg-white border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  i + 1 < step ? "bg-ardhi text-white" :
                  i + 1 === step ? "bg-navy text-white" :
                  "bg-border text-muted"
                }`}>
                  {i + 1 < step ? "✓" : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${
                  i + 1 <= step ? "text-navy" : "text-muted"
                }`}>
                  {label}
                </span>
                {i < stepLabels.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${i + 1 < step ? "bg-ardhi" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* ═══ STEP 1 — YOUR DETAILS ═══ */}
        {step === 1 && (
          <div>
            <h1 className="font-serif text-2xl font-bold text-navy mb-2">Your Details</h1>
            <p className="text-muted text-sm mb-8">Tell us about yourself so we can set up your purchase.</p>

            <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">Full name</label>
                  <input type="text" required value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi" placeholder="James Kariuki" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">Email address</label>
                  <input type="email" required value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi" placeholder="james@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">Phone / WhatsApp</label>
                  <input type="tel" required value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi" placeholder="+44 7XXX XXX XXX" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">Country of residence</label>
                  <select required value={details.country} onChange={(e) => setDetails({ ...details, country: e.target.value })} className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi bg-white">
                    <option value="">Select country</option>
                    <option value="GB">United Kingdom</option>
                    <option value="US">United States</option>
                    <option value="AE">UAE</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="KE">Kenya</option>
                    <option value="DE">Germany</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full sm:w-auto rounded-lg bg-ardhi px-8 py-3 font-semibold text-white hover:bg-ardhi-dark transition-colors">
                Continue →
              </button>
            </form>
          </div>
        )}

        {/* ═══ STEP 2 — IDENTITY VERIFICATION ═══ */}
        {step === 2 && (
          <div>
            <h1 className="font-serif text-2xl font-bold text-navy mb-2">Identity Verification</h1>
            <p className="text-muted text-sm mb-8">We are required by Kenyan law to verify your identity before processing a land purchase.</p>

            <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
              {/* ID Upload */}
              <div>
                <label className="block text-sm font-medium text-navy mb-1.5">Passport or National ID</label>
                <p className="text-xs text-muted mb-3">Upload front and back (if applicable). JPEG, PNG, or PDF up to 10MB.</p>
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-ardhi/50 transition-colors cursor-pointer">
                  <svg className="mx-auto h-10 w-10 text-muted/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm text-muted">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted mt-1">Front + back of your ID</p>
                </div>
              </div>

              {/* Proof of address */}
              <div>
                <label className="block text-sm font-medium text-navy mb-1.5">Proof of address</label>
                <p className="text-xs text-muted mb-3">Utility bill or bank statement dated within the last 3 months.</p>
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-ardhi/50 transition-colors cursor-pointer">
                  <svg className="mx-auto h-10 w-10 text-muted/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm text-muted">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted mt-1">Utility bill or bank statement</p>
                </div>
              </div>

              <div className="rounded-lg bg-trust-amber/5 border border-trust-amber/20 px-4 py-3">
                <p className="text-xs text-muted"><strong className="text-navy">Note:</strong> Document submission does not block your purchase. Our team will review within 24 hours. You can proceed to payment now.</p>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-muted hover:text-navy transition-colors">← Back</button>
                <button type="submit" className="rounded-lg bg-ardhi px-8 py-3 font-semibold text-white hover:bg-ardhi-dark transition-colors">Continue →</button>
              </div>
            </form>
          </div>
        )}

        {/* ═══ STEP 3 — SECURE YOUR PLOT ═══ */}
        {step === 3 && (
          <div>
            <h1 className="font-serif text-2xl font-bold text-navy mb-2">Secure Your Plot</h1>
            <p className="text-muted text-sm mb-8">Review your purchase details and make your deposit payment.</p>

            <div className="space-y-6">
              {/* Plot summary */}
              <div className="rounded-2xl border border-border bg-card p-6 flex gap-4">
                <div className="h-20 w-28 rounded-lg bg-navy/5 overflow-hidden flex-shrink-0 relative">
                  <img src={listing.image} alt={listing.title} className="h-full w-full object-cover" />
                </div>
                <div>
                  <h3 className="font-semibold text-navy">{listing.title}</h3>
                  <p className="text-xs text-muted">{listing.location} · {listing.size} · {listing.type}</p>
                  {listing.institutionName && <p className="text-xs text-ardhi mt-1">{listing.institutionName}</p>}
                </div>
              </div>

              {/* Instalment plan */}
              {listing.instalmentAvailable && (
                <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                  <h3 className="font-semibold text-navy">Your instalment plan</h3>

                  <div className="grid grid-cols-4 gap-2">
                    {listing.instalmentTermOptions.map((term) => (
                      <button key={term} onClick={() => setSelectedTerm(term)} className={`rounded-lg border py-2.5 text-center text-sm font-medium transition-colors ${selectedTerm === term ? "border-ardhi bg-ardhi/5 text-ardhi" : "border-border text-muted hover:border-ardhi/50"}`}>
                        {term}mo
                      </button>
                    ))}
                  </div>

                  <div className="rounded-xl bg-bg border border-border p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted">Total price</span>
                      <span className="font-medium text-navy">{formatKES(listing.priceKES)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Deposit ({listing.minDepositPercent}%)</span>
                      <span className="font-semibold text-navy">{formatKES(inst.deposit)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">GBP equivalent</span>
                      <span className="text-muted">≈ {formatGBP(kesToGbp(inst.deposit))}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between">
                      <span className="text-muted">Monthly × {selectedTerm}</span>
                      <span className="font-bold text-ardhi">{formatKES(inst.monthly)}/mo</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment method */}
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <h3 className="font-semibold text-navy">Payment method</h3>
                <p className="text-xs text-muted">Choose how to pay your deposit of <strong className="text-navy">{formatKES(inst.deposit)}</strong></p>

                <div className="grid sm:grid-cols-2 gap-3">
                  <button onClick={() => setPaymentMethod("card")} className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-colors ${paymentMethod === "card" ? "border-ardhi bg-ardhi/5" : "border-border hover:border-ardhi/50"}`}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                      <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">Card (Stripe)</p>
                      <p className="text-xs text-muted">Visa, Mastercard — GBP, USD, EUR</p>
                    </div>
                  </button>
                  <button onClick={() => setPaymentMethod("mpesa")} className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-colors ${paymentMethod === "mpesa" ? "border-ardhi bg-ardhi/5" : "border-border hover:border-ardhi/50"}`}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00A650]/10">
                      <span className="text-lg font-bold text-[#00A650]">M</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">M-Pesa</p>
                      <p className="text-xs text-muted">STK push — KES</p>
                    </div>
                  </button>
                </div>

                <div className="rounded-lg bg-navy/5 px-4 py-3 text-xs text-muted">
                  <strong className="text-navy">What happens next:</strong> Your deposit secures this plot immediately. Monthly payments begin 30 days after your deposit clears. You can track everything in your dashboard.
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-muted hover:text-navy transition-colors">← Back</button>
                <button onClick={nextStep} className="flex-1 sm:flex-none rounded-lg bg-[#C4A44A] px-8 py-4 text-lg font-semibold text-navy hover:bg-[#b3933f] transition-colors">
                  Pay {formatKES(inst.deposit)} Deposit
                </button>
              </div>

              <p className="text-center text-xs text-muted">
                <svg className="inline h-3.5 w-3.5 mr-1 text-ardhi" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Funds held in regulated escrow until title transfer is complete
              </p>
            </div>
          </div>
        )}

        {/* ═══ STEP 4 — CONFIRMATION ═══ */}
        {step === 4 && (
          <div className="text-center py-8">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-ardhi/10">
              <svg className="h-10 w-10 text-ardhi" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h1 className="font-serif text-3xl font-bold text-navy mb-3">Your plot is reserved!</h1>
            <p className="text-muted max-w-md mx-auto mb-8">
              We&apos;ve received your deposit payment. Your plot is now secured and your instalment plan is active.
            </p>

            <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-left space-y-3 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Reference</span>
                <span className="font-mono font-medium text-navy">{referenceNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Plot</span>
                <span className="font-medium text-navy">{listing.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Location</span>
                <span className="text-navy">{listing.location}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Deposit paid</span>
                <span className="font-semibold text-ardhi">{formatKES(inst.deposit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Monthly instalment</span>
                <span className="text-navy">{formatKES(inst.monthly)}/mo × {selectedTerm}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Next payment</span>
                <span className="text-navy">{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            </div>

            <p className="text-sm text-muted mb-6">
              A confirmation email has been sent to <strong className="text-navy">{details.email || "your email"}</strong>. You&apos;ll also receive a WhatsApp message with your instalment agreement summary.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/dashboard" className="rounded-lg bg-ardhi px-8 py-3 font-semibold text-white hover:bg-ardhi-dark transition-colors">
                Go to My Dashboard
              </Link>
              <Link href="/browse" className="rounded-lg border border-border px-8 py-3 font-semibold text-navy hover:bg-bg transition-colors">
                Browse More Land
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
