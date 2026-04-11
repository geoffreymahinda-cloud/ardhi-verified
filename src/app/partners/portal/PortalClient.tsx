"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatKES } from "@/lib/data";
import { updateBuyerStatus, type PortalBuyerRow, type PortalAnalytics } from "./actions";

interface PortalClientProps {
  partner: { id: string; name: string; tier: string; feeRate: number };
  role: "admin" | "viewer";
  userEmail: string;
  pipeline: PortalBuyerRow[];
  analytics: PortalAnalytics;
}

// Helper — format a fractional rate like 0.030 as "3.0%"
function formatRatePct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

// ═══════════════════════════════════════════════════════════════════
// Status config
// ═══════════════════════════════════════════════════════════════════

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  pending: { label: "Pending introduction", bg: "bg-trust-amber/10", text: "text-trust-amber" },
  introduced: { label: "Introduced", bg: "bg-ardhi/10", text: "text-ardhi" },
  consulting: { label: "Consulting", bg: "bg-blue-100", text: "text-blue-700" },
  deposited: { label: "Deposited", bg: "bg-[#C4A44A]/15", text: "text-[#9F7C28]" },
  completed: { label: "Completed", bg: "bg-trust-green/10", text: "text-trust-green" },
  withdrawn: { label: "Withdrawn", bg: "bg-gray-100", text: "text-gray-600" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ═══════════════════════════════════════════════════════════════════
// Main portal UI
// ═══════════════════════════════════════════════════════════════════

export default function PortalClient({
  partner,
  role,
  userEmail,
  pipeline,
  analytics,
}: PortalClientProps) {
  const [selectedBuyer, setSelectedBuyer] = useState<PortalBuyerRow | null>(null);
  const feeRatePct = formatRatePct(partner.feeRate);

  return (
    <div className="min-h-screen bg-bg">
      {/* ── Header ──────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-navy to-navy-light px-4 pb-8 pt-14 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C4A44A] mb-2">
                Ardhi Verified Partner Portal
              </p>
              <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl">
                {partner.name}
              </h1>
              <p className="mt-2 text-sm text-white/60">
                Signed in as {userEmail} · {role === "admin" ? "Admin" : "Viewer"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Partner Tier</p>
              <p className="text-sm font-semibold text-white capitalize">{partner.tier}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* ── Attribution protection banner ──────────────────── */}
        <section className="rounded-xl border border-[#C4A44A]/40 bg-[#C4A44A]/10 p-5">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-[#9F7C28] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm leading-relaxed text-navy">
                <strong>Attribution protection is in force.</strong> All buyers listed here were introduced through Ardhi Verified&apos;s verified buyer pipeline. Technology services fees apply to all transactions completed within the 24-month attribution window per your Technology Services Agreement.
              </p>
              <p className="mt-2 text-xs text-[#9F7C28] font-semibold">
                Your contractually-agreed rate: <span className="text-navy">{feeRatePct} of gross transaction value</span>
              </p>
            </div>
          </div>
        </section>

        {/* ── Stats bar ──────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Buyers introduced" value={String(analytics.totalIntroduced)} hint="All time" />
          <StatCard label="Active pipeline" value={String(analytics.activePipeline)} hint="Pending / introduced / consulting" />
          <StatCard label="Completed transactions" value={String(analytics.completedTransactions)} hint="Attributed to Ardhi" />
          <StatCard label="Technology fees paid" value={formatKES(analytics.totalFeesPaidKes)} hint={`${formatKES(analytics.totalFeesInvoicedKes)} invoiced · ${formatKES(analytics.totalFeesPendingKes)} pending`} />
        </section>

        {/* ── Pipeline table ─────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-bold text-navy">Your Introduced Buyer Pipeline</h2>
            <p className="text-xs text-muted">
              {pipeline.length} {pipeline.length === 1 ? "buyer" : "buyers"} total
            </p>
          </div>

          {pipeline.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <svg className="mx-auto h-10 w-10 text-muted/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <h3 className="font-semibold text-navy mb-1">No buyers introduced yet</h3>
              <p className="text-sm text-muted">
                When Ardhi Verified introduces a new buyer to {partner.name}, they will appear here with their buyer reference ID.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg/50">
                      <th className="text-left px-4 py-3 font-semibold text-navy">Buyer Ref</th>
                      <th className="text-left px-4 py-3 font-semibold text-navy hidden md:table-cell">Listing</th>
                      <th className="text-left px-4 py-3 font-semibold text-navy hidden sm:table-cell">Introduced</th>
                      <th className="text-left px-4 py-3 font-semibold text-navy hidden lg:table-cell">Days</th>
                      <th className="text-left px-4 py-3 font-semibold text-navy">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-navy hidden lg:table-cell">Window</th>
                      <th className="text-right px-4 py-3 font-semibold text-navy">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipeline.map((buyer) => {
                      const cfg = statusConfig[buyer.introduction_status] ?? statusConfig.pending;
                      const isTerminal = ["completed", "withdrawn"].includes(buyer.introduction_status);
                      return (
                        <tr key={buyer.id} className="border-b border-border last:border-b-0 hover:bg-bg/30 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono font-semibold text-navy">{buyer.buyer_ref}</span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-navy line-clamp-1">{buyer.listing_title ?? "—"}</p>
                            {buyer.listing_county && (
                              <p className="text-xs text-muted">{buyer.listing_county}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell text-muted">
                            {formatDate(buyer.introduced_at)}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-muted">
                            {buyer.days_since_introduction !== null ? `${buyer.days_since_introduction}d` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-muted text-xs">
                            {formatDate(buyer.attribution_window_expires_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSelectedBuyer(buyer)}
                              disabled={isTerminal}
                              className="text-sm font-medium text-ardhi hover:text-ardhi-dark disabled:text-muted disabled:cursor-not-allowed transition-colors"
                            >
                              {isTerminal ? "—" : "Update Status →"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-muted">
            Buyer names and contact details are shared with you off-platform after the formal introduction. The portal shows buyer reference IDs only, per your Technology Services Agreement.
          </p>
        </section>
      </div>

      {/* ── Status update modal ───────────────────────────────── */}
      {selectedBuyer && (
        <StatusUpdateModal
          buyer={selectedBuyer}
          feeRate={partner.feeRate}
          onClose={() => setSelectedBuyer(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// StatCard
// ═══════════════════════════════════════════════════════════════════

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">{label}</p>
      <p className="text-2xl font-bold text-navy">{value}</p>
      <p className="text-[10px] text-muted mt-1 line-clamp-1">{hint}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// StatusUpdateModal
// ═══════════════════════════════════════════════════════════════════

function StatusUpdateModal({
  buyer,
  feeRate,
  onClose,
}: {
  buyer: PortalBuyerRow;
  feeRate: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [newStatus, setNewStatus] = useState<"consulting" | "deposited" | "completed" | "withdrawn">(
    "consulting"
  );
  const [transactionDate, setTransactionDate] = useState("");
  const [landValueKes, setLandValueKes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ feeAmount: number | null } | null>(null);

  const requiresTransaction = newStatus === "deposited" || newStatus === "completed";
  const parsedLandValue = parseInt(landValueKes.replace(/[^0-9]/g, ""), 10) || 0;
  const estimatedFee = requiresTransaction ? Math.round(parsedLandValue * feeRate) : 0;
  const feeRatePct = formatRatePct(feeRate);

  async function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await updateBuyerStatus({
        buyerId: buyer.id,
        newStatus,
        transactionDate: requiresTransaction ? transactionDate : undefined,
        landValueKes: requiresTransaction ? parsedLandValue : undefined,
        confirmed: requiresTransaction ? confirmed : true,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccess({ feeAmount: result.feeAmountKes });
      // Refresh the server-rendered pipeline
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="update-status-title"
      >
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <h2 id="update-status-title" className="font-serif text-xl font-bold text-navy">
              Update Buyer Status
            </h2>
            <p className="mt-1 text-xs font-mono text-muted">{buyer.buyer_ref}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-navy transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ardhi/10">
              <svg className="h-7 w-7 text-ardhi" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="font-serif text-lg font-bold text-navy mb-2">Status updated</h3>
            <p className="text-sm text-muted mb-5">
              Buyer <span className="font-mono text-navy">{buyer.buyer_ref}</span> moved to <strong className="text-navy capitalize">{newStatus}</strong>.
            </p>
            {success.feeAmount !== null && success.feeAmount > 0 && (
              <div className="mx-auto max-w-sm rounded-lg border border-[#C4A44A]/30 bg-[#C4A44A]/5 p-4 mb-5 text-left">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9F7C28] mb-1">
                  Technology services fee recorded
                </p>
                <p className="text-lg font-bold text-navy">{formatKES(success.feeAmount)}</p>
                <p className="text-xs text-muted mt-1">
                  An invoice notification has been sent to Ardhi Verified. You will receive the official invoice by email shortly.
                </p>
              </div>
            )}
            <button
              onClick={onClose}
              className="rounded-lg bg-ardhi px-6 py-2.5 font-semibold text-white hover:bg-ardhi-dark transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Status selector */}
            <div>
              <label className="block text-sm font-medium text-navy mb-2">Move buyer to</label>
              <div className="grid grid-cols-2 gap-2">
                {(["consulting", "deposited", "completed", "withdrawn"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNewStatus(s)}
                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                      newStatus === s
                        ? "border-ardhi bg-ardhi/5 text-ardhi"
                        : "border-border text-muted hover:border-ardhi/50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction fields — only for deposited / completed */}
            {requiresTransaction && (
              <>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">
                    Transaction date
                  </label>
                  <input
                    type="date"
                    required
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">
                    Gross land value (KES)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={landValueKes}
                    onChange={(e) => setLandValueKes(e.target.value.replace(/[^0-9,]/g, ""))}
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi"
                    placeholder="e.g. 4,200,000"
                  />
                  {parsedLandValue > 0 && (
                    <p className="mt-1.5 text-xs text-muted">
                      Technology services fee ({feeRatePct}): <strong className="text-navy">{formatKES(estimatedFee)}</strong>
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-[#C4A44A]/30 bg-[#C4A44A]/5 p-4">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-border text-ardhi focus:ring-ardhi"
                    />
                    <span className="text-xs text-navy leading-relaxed">
                      <strong>I confirm this transaction was introduced through Ardhi Verified</strong> and that a technology services fee of {feeRatePct} of gross land value is due per our Technology Services Agreement.
                    </span>
                  </label>
                </div>
              </>
            )}

            {newStatus === "withdrawn" && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-muted leading-relaxed">
                  Marking this buyer as withdrawn will close them out of your active pipeline. No fee is charged and the attribution window remains in effect in case the buyer returns.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-trust-red/30 bg-trust-red/5 px-4 py-3">
                <p className="text-sm text-trust-red">{error}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted hover:text-navy transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || (requiresTransaction && (!confirmed || !transactionDate || parsedLandValue <= 0))}
                className="flex-1 rounded-lg bg-ardhi px-4 py-2.5 text-sm font-semibold text-white hover:bg-ardhi-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? "Submitting..." : "Submit update"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
