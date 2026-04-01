"use client";

import { useState } from "react";
import Link from "next/link";
import { initiateMpesaPayment } from "@/app/escrow/actions";

interface EscrowPaymentProps {
  listingId: number;
  listingTitle: string;
  priceKES: number;
}

export default function EscrowPayment({ listingId, listingTitle, priceKES }: EscrowPaymentProps) {
  const [step, setStep] = useState<"choose" | "mpesa" | "processing" | "success" | "error">("choose");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(priceKES);
  const [depositType, setDepositType] = useState<"full" | "partial">("full");
  const [error, setError] = useState("");

  const depositAmount = depositType === "full" ? priceKES : Math.round(priceKES * 0.1);

  async function handleMpesaPay() {
    if (!phone) { setError("Please enter your M-Pesa phone number."); return; }
    setStep("processing");
    setError("");

    const result = await initiateMpesaPayment({
      phone,
      amount: depositAmount,
      listingId,
      listingTitle,
    });

    if (result.success) {
      setStep("success");
    } else {
      setError(result.error || "Payment failed.");
      setStep("mpesa");
    }
  }

  if (step === "success") {
    return (
      <div className="rounded-2xl border border-ardhi/20 bg-ardhi/5 p-6 text-center">
        <svg className="mx-auto h-12 w-12 text-ardhi mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="font-serif text-lg font-bold text-navy mb-2">Payment initiated!</h3>
        <p className="text-sm text-muted mb-1">Check your phone for the M-Pesa prompt.</p>
        <p className="text-sm text-muted mb-4">Enter your M-Pesa PIN to complete the payment.</p>
        <Link href="/escrow" className="inline-flex items-center gap-2 text-sm font-semibold text-ardhi hover:text-ardhi-dark">
          Track in your escrow dashboard →
        </Link>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <div className="mx-auto h-10 w-10 rounded-full border-4 border-ardhi/30 border-t-ardhi animate-spin mb-4" />
        <h3 className="font-serif text-lg font-bold text-navy mb-2">Sending M-Pesa prompt...</h3>
        <p className="text-sm text-muted">Please wait. You&apos;ll receive an STK push on your phone.</p>
      </div>
    );
  }

  if (step === "mpesa") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setStep("choose")} className="text-muted hover:text-navy transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h3 className="font-serif text-lg font-bold text-navy">M-Pesa Payment</h3>
        </div>

        {/* Deposit type */}
        <div>
          <p className="text-sm font-medium text-navy mb-2">Deposit type</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDepositType("partial")}
              className={`rounded-lg border p-3 text-left transition-colors ${
                depositType === "partial" ? "border-ardhi bg-ardhi/5" : "border-border hover:border-ardhi/50"
              }`}
            >
              <p className="text-sm font-semibold text-navy">10% Deposit</p>
              <p className="text-lg font-bold text-ardhi">KES {Math.round(priceKES * 0.1).toLocaleString()}</p>
              <p className="text-xs text-muted">Secures the plot</p>
            </button>
            <button
              onClick={() => setDepositType("full")}
              className={`rounded-lg border p-3 text-left transition-colors ${
                depositType === "full" ? "border-ardhi bg-ardhi/5" : "border-border hover:border-ardhi/50"
              }`}
            >
              <p className="text-sm font-semibold text-navy">Full Payment</p>
              <p className="text-lg font-bold text-ardhi">KES {priceKES.toLocaleString()}</p>
              <p className="text-xs text-muted">Complete purchase</p>
            </button>
          </div>
        </div>

        {/* Phone input */}
        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">M-Pesa phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712 345 678"
            className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi"
          />
          <p className="text-xs text-muted mt-1">You&apos;ll receive an STK push prompt on this number.</p>
        </div>

        {error && (
          <div className="rounded-lg bg-trust-red/5 border border-trust-red/20 px-4 py-3 text-sm text-trust-red">{error}</div>
        )}

        {/* Summary */}
        <div className="rounded-lg bg-bg border border-border p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Property</span>
            <span className="font-medium text-navy">{listingTitle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Deposit</span>
            <span className="font-bold text-navy">KES {depositAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Escrow fee (1.5%)</span>
            <span className="text-navy">KES {Math.round(depositAmount * 0.015).toLocaleString()}</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between">
            <span className="font-semibold text-navy">Total</span>
            <span className="font-bold text-ardhi">KES {Math.round(depositAmount * 1.015).toLocaleString()}</span>
          </div>
        </div>

        <button
          onClick={handleMpesaPay}
          className="w-full bg-[#00A650] text-white py-4 rounded-lg font-semibold text-lg transition-colors hover:bg-[#008f44]"
        >
          Pay KES {Math.round(depositAmount * 1.015).toLocaleString()} via M-Pesa
        </button>

        <div className="flex items-center gap-2 justify-center">
          <svg className="h-4 w-4 text-ardhi" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <p className="text-xs text-muted">Protected by Ardhi Escrow — funds held until title transfers</p>
        </div>
      </div>
    );
  }

  // step === "choose"
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <h3 className="font-serif text-lg font-bold text-navy">Secure this plot</h3>
      <p className="text-xs text-muted">Your payment is held in escrow until the title is transferred to your name.</p>

      {/* M-Pesa */}
      <button
        onClick={() => setStep("mpesa")}
        className="w-full flex items-center gap-4 rounded-xl border border-border p-4 hover:border-ardhi/50 hover:bg-ardhi/5 transition-colors text-left"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#00A650]/10">
          <span className="text-lg font-bold text-[#00A650]">M</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-navy">M-Pesa</p>
          <p className="text-xs text-muted">Pay via STK push — instant confirmation</p>
        </div>
        <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      {/* Bank Transfer */}
      <button
        disabled
        className="w-full flex items-center gap-4 rounded-xl border border-border p-4 opacity-50 cursor-not-allowed text-left"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy/10">
          <svg className="h-6 w-6 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-navy">Bank Transfer</p>
          <p className="text-xs text-muted">Coming soon — KES, GBP, USD</p>
        </div>
        <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[10px] font-semibold text-navy/50">Soon</span>
      </button>

      {/* International (Stripe) */}
      <button
        disabled
        className="w-full flex items-center gap-4 rounded-xl border border-border p-4 opacity-50 cursor-not-allowed text-left"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50">
          <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-navy">Card / International</p>
          <p className="text-xs text-muted">Coming soon — Visa, Mastercard, GBP, USD, EUR</p>
        </div>
        <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[10px] font-semibold text-navy/50">Soon</span>
      </button>

      <p className="text-center text-xs text-muted pt-2">
        All payments protected by{" "}
        <Link href="/escrow-policy" className="text-ardhi underline hover:text-ardhi-dark">Ardhi Escrow</Link>.
        Funds held in CBK-licensed segregated accounts.
      </p>
    </div>
  );
}
