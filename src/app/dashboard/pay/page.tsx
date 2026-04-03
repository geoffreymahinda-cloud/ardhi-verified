"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getActivePlan, type ActivePlan } from "./actions";
import { formatKES, formatGBP, kesToGbp } from "@/lib/data";

const PAYBILL = "880100";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-lg border border-[#C8902A]/30 bg-[#C8902A]/10 px-4 py-2.5 text-sm font-medium text-[#E8B84B] transition-colors hover:bg-[#C8902A]/20"
    >
      {copied ? (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

interface PaymentCard {
  name: string;
  icon: string;
  accent: string;
  steps: string[];
  note?: string;
}

export default function PayPage() {
  const [plan, setPlan] = useState<ActivePlan | null>(null);
  const [authenticated, setAuthenticated] = useState(true);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState<number | null>(0);

  useEffect(() => {
    getActivePlan().then((result) => {
      setPlan(result.plan);
      setAuthenticated(result.authenticated);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ background: "#0D1A0D", minHeight: "100vh" }} className="flex items-center justify-center">
        <p style={{ color: "#9A9080" }}>Loading your payment details...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div style={{ background: "#0D1A0D", minHeight: "100vh" }} className="flex items-center justify-center px-4">
        <div className="text-center">
          <h1 style={{ color: "#E8B84B" }} className="font-serif text-2xl font-bold mb-2">Sign in required</h1>
          <p style={{ color: "#9A9080" }} className="mb-6">Sign in to view your payment instructions.</p>
          <Link href="/auth/login" className="rounded-lg bg-[#1A5C2A] px-6 py-3 font-semibold text-white hover:bg-[#2D8A3E] transition-colors">Sign In</Link>
        </div>
      </div>
    );
  }

  // Generate reference from plan ID or show demo
  const accountRef = plan ? `AV-${plan.id.slice(0, 8).toUpperCase()}` : "AV-2026-0047";
  const amountKES = plan ? plan.monthly_amount : 20000;
  const amountGBP = kesToGbp(amountKES);
  const dueDate = plan?.next_payment_date
    ? new Date(plan.next_payment_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "1st May 2026";
  const plotName = plan?.listing_title || "Your Plot";
  const progress = plan ? Math.round((plan.payments_made / plan.term_months) * 100) : 0;

  const paymentCards: PaymentCard[] = [
    {
      name: "TapTap Send",
      icon: "💜",
      accent: "#7C3AED",
      steps: [
        "Open TapTap Send app",
        "Tap \"Buy Goods & Billpay\"",
        "Tap \"Paybill\"",
        `Enter Paybill: ${PAYBILL}`,
        `Enter Account: ${accountRef}`,
        `Enter Amount: KES ${amountKES.toLocaleString()}`,
        "Confirm payment",
      ],
    },
    {
      name: "LemFi",
      icon: "💚",
      accent: "#059669",
      steps: [
        "Open LemFi app",
        "Tap \"Send Money\" → Kenya",
        "Select \"M-Pesa Paybill\"",
        `Enter Paybill: ${PAYBILL}`,
        `Enter Account: ${accountRef}`,
        "Enter amount and confirm",
      ],
    },
    {
      name: "M-Pesa (Kenyan number)",
      icon: "📱",
      accent: "#00A650",
      steps: [
        "Dial *840# or open M-Pesa app",
        "Select Lipa na M-Pesa",
        "Select Paybill",
        `Enter Business No: ${PAYBILL}`,
        `Enter Account No: ${accountRef}`,
        "Enter amount and PIN",
      ],
    },
    {
      name: "WorldRemit / Wise / Other",
      icon: "🌍",
      accent: "#C8902A",
      steps: [
        "Open your remittance app",
        "Select \"Send to Kenya\" → M-Pesa Paybill",
        `Enter Paybill Number: ${PAYBILL}`,
        `Enter Account Number: ${accountRef}`,
        "Enter amount in your currency",
        "Review exchange rate and confirm",
      ],
      note: "Any app that supports M-Pesa Paybill payments to Kenya can be used.",
    },
  ];

  return (
    <div style={{ background: "#0D1A0D", minHeight: "100vh", fontFamily: "'Inter',sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0F2010, #081208)", borderBottom: "3px solid #C8902A", padding: "20px 24px" }}>
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/dashboard" style={{ color: "#9A9080" }} className="text-sm hover:text-white transition-colors mb-2 inline-block">← Back to Dashboard</Link>
              <h1 style={{ fontFamily: "Georgia,serif", fontSize: "24px", fontWeight: "bold", color: "#E8B84B" }}>Make a Payment</h1>
              {plan && <p style={{ color: "#9A9080", fontSize: "13px", marginTop: "4px" }}>{plotName} · {plan.payments_made} of {plan.term_months} payments complete</p>}
            </div>
            {plan && (
              <div className="text-right hidden sm:block">
                <div style={{ color: "#E8B84B", fontSize: "11px", marginBottom: "4px" }}>Progress</div>
                <div style={{ width: "120px", height: "6px", background: "#1A2A1A", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #C8902A, #E8B84B)", borderRadius: "3px" }} />
                </div>
                <div style={{ color: "#9A9080", fontSize: "11px", marginTop: "2px" }}>{progress}%</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
        {/* No active plan message */}
        {!plan && (
          <div style={{ background: "#0F2010", border: "1px solid #1A3A1A", borderRadius: "12px", padding: "24px", textAlign: "center" }}>
            <p style={{ color: "#9A9080", marginBottom: "12px" }}>You don&apos;t have an active instalment plan yet.</p>
            <p style={{ color: "#9A9080", fontSize: "13px", marginBottom: "16px" }}>Below are sample payment instructions. When you purchase a plot, your personalised details will appear here.</p>
          </div>
        )}

        {/* ═══ 1. PAYMENT DETAILS ═══ */}
        <div style={{ background: "#0F2010", border: "2px solid #C8902A40", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ fontFamily: "Georgia,serif", fontSize: "18px", color: "#E8B84B", marginBottom: "20px" }}>Your Payment Details</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid #1A3A1A" }}>
              <span style={{ color: "#9A9080", fontSize: "14px" }}>Paybill Number</span>
              <div className="flex items-center gap-3">
                <span style={{ fontFamily: "'Courier New',monospace", fontSize: "20px", fontWeight: "800", color: "#FFFFFF", letterSpacing: "0.08em" }}>{PAYBILL}</span>
                <CopyButton text={PAYBILL} label="Copy" />
              </div>
            </div>

            <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid #1A3A1A" }}>
              <span style={{ color: "#9A9080", fontSize: "14px" }}>Account Reference</span>
              <div className="flex items-center gap-3">
                <span style={{ fontFamily: "'Courier New',monospace", fontSize: "18px", fontWeight: "700", color: "#E8B84B" }}>{accountRef}</span>
                <CopyButton text={accountRef} label="Copy" />
              </div>
            </div>

            <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid #1A3A1A" }}>
              <span style={{ color: "#9A9080", fontSize: "14px" }}>Amount Due</span>
              <div className="text-right">
                <span style={{ fontSize: "22px", fontWeight: "800", color: "#FFFFFF" }}>{formatKES(amountKES)}</span>
                <span style={{ color: "#9A9080", fontSize: "14px", marginLeft: "8px" }}>({formatGBP(amountGBP)})</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <span style={{ color: "#9A9080", fontSize: "14px" }}>Due Date</span>
              <span style={{ fontSize: "16px", fontWeight: "600", color: "#E8E0D0" }}>{dueDate}</span>
            </div>
          </div>
        </div>

        {/* ═══ 2. PAY USING YOUR APP ═══ */}
        <div>
          <h2 style={{ fontFamily: "Georgia,serif", fontSize: "18px", color: "#E8B84B", marginBottom: "16px" }}>Pay Using Your App</h2>
          <p style={{ color: "#9A9080", fontSize: "13px", marginBottom: "16px" }}>Tap your preferred app for step-by-step instructions.</p>

          <div className="space-y-3">
            {paymentCards.map((card, i) => (
              <div key={card.name} style={{ background: "#0F2010", border: `1px solid ${expandedCard === i ? card.accent + "60" : "#1A3A1A"}`, borderRadius: "12px", overflow: "hidden", transition: "border-color 0.2s" }}>
                <button
                  onClick={() => setExpandedCard(expandedCard === i ? null : i)}
                  className="w-full text-left"
                  style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: "24px" }}>{card.icon}</span>
                    <span style={{ fontSize: "15px", fontWeight: "600", color: "#E8E0D0" }}>{card.name}</span>
                  </div>
                  <svg
                    style={{ width: "20px", height: "20px", color: "#9A9080", transition: "transform 0.2s", transform: expandedCard === i ? "rotate(180deg)" : "rotate(0)" }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {expandedCard === i && (
                  <div style={{ padding: "0 20px 20px", borderTop: `1px solid #1A3A1A` }}>
                    {card.note && (
                      <p style={{ color: "#9A9080", fontSize: "13px", marginTop: "12px", marginBottom: "12px", fontStyle: "italic" }}>{card.note}</p>
                    )}
                    <ol className="space-y-2" style={{ marginTop: "12px" }}>
                      {card.steps.map((step, j) => {
                        const isPaybill = step.includes(PAYBILL);
                        const isAccount = step.includes(accountRef);
                        const isAmount = step.includes("KES");
                        return (
                          <li key={j} className="flex items-start gap-3">
                            <span style={{ background: card.accent + "30", color: card.accent, width: "22px", height: "22px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", flexShrink: 0, marginTop: "1px" }}>
                              {j + 1}
                            </span>
                            <span style={{ fontSize: "13px", lineHeight: "1.5", color: (isPaybill || isAccount || isAmount) ? "#FFFFFF" : "#E8E0D0" }}>
                              {step}
                              {(isPaybill || isAccount) && (
                                <span style={{ marginLeft: "8px", display: "inline-block" }}>
                                  <CopyButton text={isPaybill ? PAYBILL : accountRef} label="Copy" />
                                </span>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ═══ 3. WHAT HAPPENS NEXT ═══ */}
        <div style={{ background: "#0F2010", border: "1px solid #1A3A1A", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ fontFamily: "Georgia,serif", fontSize: "18px", color: "#E8B84B", marginBottom: "16px" }}>What Happens Next</h2>
          <p style={{ color: "#9A9080", fontSize: "13px", marginBottom: "16px" }}>Once your payment is received:</p>
          <div className="space-y-3">
            {[
              "Your dashboard updates within 60 seconds",
              "WhatsApp confirmation sent to your number",
              "Email receipt sent to your inbox",
              "Payment record added to your documents",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <svg style={{ width: "18px", height: "18px", color: "#2D8A3E", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span style={{ fontSize: "14px", color: "#E8E0D0" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ 4. HAVING TROUBLE ═══ */}
        <div style={{ background: "#1A2A1A", border: "1px solid #2A3A2A", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ fontFamily: "Georgia,serif", fontSize: "16px", color: "#E8E0D0", marginBottom: "12px" }}>Having trouble?</h2>
          <div className="space-y-3">
            <a
              href="https://wa.me/254700000000?text=Hi%2C%20I%20need%20help%20with%20my%20Ardhi%20Verified%20payment"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg p-3 transition-colors"
              style={{ background: "#25D36615", border: "1px solid #25D36630" }}
            >
              <span style={{ fontSize: "20px" }}>💬</span>
              <div>
                <p style={{ fontSize: "14px", fontWeight: "600", color: "#25D366" }}>WhatsApp us</p>
                <p style={{ fontSize: "12px", color: "#9A9080" }}>We respond within 4 hours</p>
              </div>
            </a>
            <a
              href="mailto:hello@ardhiverified.com"
              className="flex items-center gap-3 rounded-lg p-3 transition-colors"
              style={{ background: "#C8902A10", border: "1px solid #C8902A30" }}
            >
              <span style={{ fontSize: "20px" }}>📧</span>
              <div>
                <p style={{ fontSize: "14px", fontWeight: "600", color: "#E8B84B" }}>hello@ardhiverified.com</p>
                <p style={{ fontSize: "12px", color: "#9A9080" }}>For detailed queries</p>
              </div>
            </a>
          </div>
        </div>

        {/* Back to dashboard */}
        <div className="text-center pb-8">
          <Link href="/dashboard" style={{ color: "#9A9080", fontSize: "14px" }} className="hover:text-white transition-colors">
            ← Back to My Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
