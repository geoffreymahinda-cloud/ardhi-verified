"use client";

import { useState } from "react";
import Link from "next/link";
import { formatKES, formatGBP, formatUSD, kesToGbp, kesToUsd, calculateInstalment } from "@/lib/data";

interface PaymentPanelProps {
  listingId: number;
  slug: string;
  priceKES: number;
  instalmentAvailable: boolean;
  minDepositPercent: number;
  termOptions: number[];
}

type Currency = "KES" | "GBP" | "USD";

const formatters: Record<Currency, (n: number) => string> = {
  KES: formatKES,
  GBP: formatGBP,
  USD: formatUSD,
};

export default function PaymentPanel({
  listingId,
  slug,
  priceKES,
  instalmentAvailable,
  minDepositPercent,
  termOptions,
}: PaymentPanelProps) {
  const [selectedTerm, setSelectedTerm] = useState(termOptions[1] || termOptions[0] || 24);
  const [currency, setCurrency] = useState<Currency>("KES");

  const inst = calculateInstalment(priceKES, minDepositPercent, selectedTerm);

  function convert(kes: number): number {
    if (currency === "GBP") return kesToGbp(kes);
    if (currency === "USD") return kesToUsd(kes);
    return kes;
  }

  const fmt = formatters[currency];

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm">
      {/* Total price */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted mb-1">Total Price</p>
        <p className="text-2xl font-bold text-navy">
          {fmt(convert(priceKES))}
        </p>
        {currency === "KES" && (
          <p className="text-sm text-muted">≈ {formatGBP(kesToGbp(priceKES))}</p>
        )}
      </div>

      {/* Instalment section */}
      {instalmentAvailable && termOptions.length > 0 ? (
        <>
          <div className="border-t border-border pt-5">
            <p className="text-sm font-semibold text-navy mb-1">Indicative instalment calculator</p>
            <p className="text-xs text-muted mb-4">Flexible instalment terms set by your SACCO partner</p>

            {/* Deposit */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted">Deposit ({minDepositPercent}%)</span>
              <span className="text-sm font-semibold text-navy">{fmt(convert(inst.deposit))}</span>
            </div>

            {/* Term selector */}
            <div className="mb-4">
              <p className="text-xs text-muted mb-2">Example term</p>
              <div className="grid grid-cols-4 gap-2">
                {termOptions.map((term) => (
                  <button
                    key={term}
                    onClick={() => setSelectedTerm(term)}
                    className={`rounded-lg border py-2.5 text-center text-sm font-medium transition-colors ${
                      selectedTerm === term
                        ? "border-ardhi bg-ardhi/5 text-ardhi"
                        : "border-border text-muted hover:border-ardhi/50"
                    }`}
                  >
                    {term}mo
                  </button>
                ))}
              </div>
            </div>

            {/* Monthly amount — hero figure */}
            <div className="rounded-xl bg-ardhi/5 border border-ardhi/20 p-4 text-center mb-4">
              <p className="text-xs text-muted mb-1">Indicative monthly</p>
              <p className="text-3xl font-bold text-ardhi">
                {fmt(convert(calculateInstalment(priceKES, minDepositPercent, selectedTerm).monthly))}
                <span className="text-base font-medium text-ardhi/70">/mo</span>
              </p>
              {currency === "KES" && (
                <p className="text-xs text-muted mt-1">
                  ≈ {formatGBP(kesToGbp(calculateInstalment(priceKES, minDepositPercent, selectedTerm).monthly))}/mo
                </p>
              )}
              <p className="text-[10px] text-muted mt-2 leading-snug">
                Illustrative only — final terms agreed directly with your partner institution.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="border-t border-border pt-5">
          <p className="text-sm text-muted">
            This property is available for outright purchase. Payment terms agreed directly with your partner institution.
          </p>
        </div>
      )}

      {/* Currency toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-border p-1">
        {(["KES", "GBP", "USD"] as Currency[]).map((c) => (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              currency === c
                ? "bg-navy text-white"
                : "text-muted hover:text-navy"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted text-center">Rate: approx. 1 GBP = 165 KES · 1 USD = 130 KES</p>

      {/* CTA */}
      <Link
        href={`/purchase/${slug}`}
        className="block w-full rounded-lg bg-[#C4A44A] py-4 text-center text-lg font-semibold text-navy transition-colors hover:bg-[#b3933f]"
      >
        Express Interest
      </Link>

      {/* Contact */}
      <div className="text-center space-y-1.5">
        <a href="mailto:hello@ardhiverified.com" className="flex items-center justify-center gap-2 text-sm text-ardhi hover:text-ardhi-dark transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
          Speak to an advisor
        </a>
        <p className="text-xs text-muted">hello@ardhiverified.com</p>
      </div>

      {/* Trust signal */}
      <div className="flex items-center gap-2 rounded-lg bg-navy/5 px-3 py-2.5">
        <svg className="h-4 w-4 text-ardhi flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <p className="text-xs text-muted">Your SACCO or institutional partner manages all payments and title transfer directly</p>
      </div>
    </div>
  );
}
