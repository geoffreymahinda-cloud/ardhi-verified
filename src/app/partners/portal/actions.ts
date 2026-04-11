"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface PortalBuyerRow {
  id: string;
  buyer_ref: string;
  introduction_status: string;
  introduced_at: string | null;
  attribution_window_expires_at: string | null;
  transaction_completed_at: string | null;
  land_value_kes: number | null;
  technology_fee_amount: number | null;
  listing_id: number | null;
  listing_title: string | null;
  listing_county: string | null;
  days_since_introduction: number | null;
}

export interface PortalAnalytics {
  totalIntroduced: number;
  activePipeline: number;
  completedTransactions: number;
  totalFeesPaidKes: number;
  totalFeesInvoicedKes: number;
  totalFeesPendingKes: number;
}

export interface PortalData {
  authorized: boolean;
  reason?: "not_signed_in" | "not_a_partner";
  partner?: { id: string; name: string; tier: string; feeRate: number };
  role?: "admin" | "viewer";
  userEmail?: string;
  pipeline: PortalBuyerRow[];
  analytics: PortalAnalytics;
}

// Fallback fee rate when the partner record is missing a fee_rate
// column value (should never happen after the partner_fee_rates
// migration runs, but kept as a safety net).
const DEFAULT_FEE_RATE = 0.025;

// ═══════════════════════════════════════════════════════════════════
// Internal — notify admin via Supabase edge function
// (mirrors the notifyAdmin helper in src/app/actions.ts)
// ═══════════════════════════════════════════════════════════════════

async function notifyPortalAdmin(data: {
  subject: string;
  body: string;
  partnerEmail: string;
}) {
  try {
    const supabase = await createClient();
    await supabase.functions.invoke("send-enquiry-email", {
      body: {
        name: `Partner Portal — ${data.partnerEmail}`,
        email: data.partnerEmail,
        phone: "",
        message: data.body,
        listing_title: data.subject,
      },
    });
  } catch (e) {
    console.error("[portal] notify admin failed:", e);
  }
}

// ═══════════════════════════════════════════════════════════════════
// getPartnerPortalData — auth, pipeline, analytics
//
// Uses the service client for the actual data reads because the
// RLS policy joins through partner_users which can be tricky to
// satisfy with just the session token. The initial partner_users
// lookup IS auth-scoped (via auth.uid()) so it already enforces
// that the requester belongs to exactly one partner.
// ═══════════════════════════════════════════════════════════════════

export async function getPartnerPortalData(): Promise<PortalData> {
  const emptyAnalytics: PortalAnalytics = {
    totalIntroduced: 0,
    activePipeline: 0,
    completedTransactions: 0,
    totalFeesPaidKes: 0,
    totalFeesInvoicedKes: 0,
    totalFeesPendingKes: 0,
  };

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  if (!user) {
    return {
      authorized: false,
      reason: "not_signed_in",
      pipeline: [],
      analytics: emptyAnalytics,
    };
  }

  const service = createServiceClient();

  // Look up the partner_users row for this authenticated user
  const { data: partnerUser } = await service
    .from("partner_users")
    .select("partner_id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!partnerUser) {
    return {
      authorized: false,
      reason: "not_a_partner",
      userEmail: user.email ?? undefined,
      pipeline: [],
      analytics: emptyAnalytics,
    };
  }

  // Fetch the partner institution — includes the per-partner fee_rate
  // set by the partner_fee_rates migration (SACCOs at 3.0%, banks and
  // developers at 2.5%, individually overridable).
  const { data: partner } = await service
    .from("saccos")
    .select("id, name, tier, fee_rate")
    .eq("id", partnerUser.partner_id)
    .maybeSingle();

  if (!partner) {
    return {
      authorized: false,
      reason: "not_a_partner",
      userEmail: user.email ?? undefined,
      pipeline: [],
      analytics: emptyAnalytics,
    };
  }

  const feeRate = Number(partner.fee_rate ?? DEFAULT_FEE_RATE);

  // Fetch buyers introduced to this partner. IMPORTANT: no buyer_name,
  // buyer_email, or buyer_phone selected — partners see buyer_ref only
  // until they've been formally introduced off-platform.
  const { data: buyers } = await service
    .from("buyers")
    .select(
      "id, buyer_ref, introduction_status, introduced_at, attribution_window_expires_at, transaction_completed_at, land_value_kes, technology_fee_amount, listing_id, created_at"
    )
    .eq("introduced_to_partner_id", partnerUser.partner_id)
    .order("created_at", { ascending: false });

  // Enrich with listing titles
  const listingIds = Array.from(
    new Set((buyers || []).map((b) => b.listing_id).filter(Boolean) as number[])
  );

  const { data: listings } =
    listingIds.length > 0
      ? await service
          .from("listings")
          .select("id, title, county")
          .in("id", listingIds)
      : { data: [] as Array<{ id: number; title: string; county: string }> };

  const listingMap = new Map<number, { title: string; county: string }>(
    (listings || []).map((l) => [l.id, { title: l.title, county: l.county }])
  );

  const now = Date.now();
  const pipeline: PortalBuyerRow[] = (buyers || []).map((b) => {
    const listingInfo = b.listing_id ? listingMap.get(b.listing_id) : null;
    const introAt = b.introduced_at ? new Date(b.introduced_at).getTime() : null;
    const daysSince = introAt !== null ? Math.floor((now - introAt) / (1000 * 60 * 60 * 24)) : null;
    return {
      id: b.id,
      buyer_ref: b.buyer_ref,
      introduction_status: b.introduction_status,
      introduced_at: b.introduced_at,
      attribution_window_expires_at: b.attribution_window_expires_at,
      transaction_completed_at: b.transaction_completed_at,
      land_value_kes: b.land_value_kes ? Number(b.land_value_kes) : null,
      technology_fee_amount: b.technology_fee_amount ? Number(b.technology_fee_amount) : null,
      listing_id: b.listing_id,
      listing_title: listingInfo?.title ?? null,
      listing_county: listingInfo?.county ?? null,
      days_since_introduction: daysSince,
    };
  });

  // Compute analytics
  const activeStatuses = new Set(["pending", "introduced", "consulting"]);
  const totalIntroduced = pipeline.length;
  const activePipeline = pipeline.filter((p) => activeStatuses.has(p.introduction_status)).length;
  const completedTransactions = pipeline.filter(
    (p) => p.introduction_status === "completed"
  ).length;

  // Sum fees from the ledger, grouped by status
  const { data: fees } = await service
    .from("technology_fees")
    .select("fee_amount_kes, status")
    .eq("partner_id", partnerUser.partner_id);

  let totalFeesPaidKes = 0;
  let totalFeesInvoicedKes = 0;
  let totalFeesPendingKes = 0;
  for (const f of fees || []) {
    const amount = Number(f.fee_amount_kes);
    if (f.status === "paid") totalFeesPaidKes += amount;
    else if (f.status === "invoiced") totalFeesInvoicedKes += amount;
    else if (f.status === "pending") totalFeesPendingKes += amount;
  }

  return {
    authorized: true,
    partner: { id: partner.id, name: partner.name, tier: partner.tier, feeRate },
    role: (partnerUser.role as "admin" | "viewer") ?? "viewer",
    userEmail: user.email ?? undefined,
    pipeline,
    analytics: {
      totalIntroduced,
      activePipeline,
      completedTransactions,
      totalFeesPaidKes,
      totalFeesInvoicedKes,
      totalFeesPendingKes,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// updateBuyerStatus — partner moves a buyer through the pipeline.
//
// For "deposited" or "completed", the partner must provide:
//   - transactionDate
//   - landValueKes
//   - confirmed checkbox (attribution confirmation)
//
// Side effects:
//   - Updates public.buyers.introduction_status (+ land_value + fee_amount)
//   - Creates a row in public.technology_fees at the partner's
//     contractually-agreed fee rate (SACCO 3.0%, bank/developer 2.5%)
//   - Sends an admin notification via the existing edge function
// ═══════════════════════════════════════════════════════════════════

// Fee rate is now per-partner — see public.saccos.fee_rate.
// DEFAULT_FEE_RATE declared above is the fallback only.
const VALID_STATUSES = new Set([
  "consulting",
  "deposited",
  "completed",
  "withdrawn",
]);

export async function updateBuyerStatus(formData: {
  buyerId: string;
  newStatus: "consulting" | "deposited" | "completed" | "withdrawn";
  transactionDate?: string; // ISO date string YYYY-MM-DD
  landValueKes?: number;
  confirmed?: boolean;
}): Promise<
  | { success: true; feeAmountKes: number | null }
  | { success: false; error: string }
> {
  if (!VALID_STATUSES.has(formData.newStatus)) {
    return { success: false, error: "Invalid status value." };
  }

  const requiresTransaction =
    formData.newStatus === "deposited" || formData.newStatus === "completed";

  if (requiresTransaction) {
    if (!formData.confirmed) {
      return {
        success: false,
        error: "You must confirm the transaction was introduced through Ardhi Verified.",
      };
    }
    if (!formData.transactionDate) {
      return { success: false, error: "Transaction date is required." };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.transactionDate)) {
      return { success: false, error: "Transaction date must be YYYY-MM-DD." };
    }
    if (!formData.landValueKes || formData.landValueKes <= 0) {
      return { success: false, error: "Gross land value must be greater than zero." };
    }
    if (formData.landValueKes > 10_000_000_000) {
      return { success: false, error: "Land value looks implausible — please check." };
    }
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { success: false, error: "Not signed in." };

  const service = createServiceClient();

  // Verify the partner_users row for this user
  const { data: partnerUser } = await service
    .from("partner_users")
    .select("partner_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!partnerUser) {
    return { success: false, error: "You do not have partner portal access." };
  }

  // Fetch the partner's contractually-agreed fee_rate. This is the
  // authoritative source of truth for fee calculation — NOT a
  // hardcoded constant. SACCO partners are at 3.0% per the Taifa
  // SACCO partnership agreement; banks and developers at 2.5%.
  const { data: partnerRow } = await service
    .from("saccos")
    .select("fee_rate")
    .eq("id", partnerUser.partner_id)
    .maybeSingle();

  const feeRate = Number(partnerRow?.fee_rate ?? DEFAULT_FEE_RATE);

  // Verify the buyer belongs to this partner's pipeline
  const { data: buyer } = await service
    .from("buyers")
    .select("id, buyer_ref, introduced_to_partner_id, listing_id, introduction_status")
    .eq("id", formData.buyerId)
    .maybeSingle();

  if (!buyer) {
    return { success: false, error: "Buyer not found." };
  }
  if (buyer.introduced_to_partner_id !== partnerUser.partner_id) {
    return { success: false, error: "This buyer is not in your pipeline." };
  }

  // Build the update payload
  const updates: {
    introduction_status: string;
    transaction_completed_at?: string;
    land_value_kes?: number;
    technology_fee_amount?: number;
  } = {
    introduction_status: formData.newStatus,
  };

  let feeAmountKes: number | null = null;

  if (requiresTransaction && formData.landValueKes) {
    feeAmountKes = Math.round(formData.landValueKes * feeRate * 100) / 100;
    updates.land_value_kes = formData.landValueKes;
    updates.technology_fee_amount = feeAmountKes;

    if (formData.newStatus === "completed") {
      updates.transaction_completed_at = new Date().toISOString();
    }
  }

  const { error: updateErr } = await service
    .from("buyers")
    .update(updates)
    .eq("id", formData.buyerId);

  if (updateErr) {
    console.error("[portal] buyer update failed:", updateErr.message);
    return { success: false, error: "Failed to update buyer status." };
  }

  // Create a fee record + notify admin when a transaction is reported
  if (requiresTransaction && formData.landValueKes && feeAmountKes !== null) {
    const { error: feeErr } = await service.from("technology_fees").insert({
      buyer_id: buyer.id,
      buyer_ref: buyer.buyer_ref,
      partner_id: partnerUser.partner_id,
      listing_id: buyer.listing_id,
      land_value_kes: formData.landValueKes,
      fee_rate: feeRate,
      fee_amount_kes: feeAmountKes,
      status: "pending",
      transaction_date: formData.transactionDate,
      reported_by_email: user.email ?? null,
    });

    if (feeErr) {
      // Non-fatal: the buyer update succeeded, fee row failed to write.
      // Log for admin investigation; the partner can still see the
      // updated status on the portal.
      console.error("[portal] fee insert failed:", feeErr.message);
    }

    await notifyPortalAdmin({
      subject: `[FEE] ${buyer.buyer_ref} marked ${formData.newStatus.toUpperCase()}`,
      body: `Partner ${user.email} reported a transaction for buyer ${buyer.buyer_ref}:
  Status:          ${formData.newStatus}
  Transaction date: ${formData.transactionDate}
  Gross land value: KES ${formData.landValueKes.toLocaleString()}
  Technology fee:   KES ${feeAmountKes.toLocaleString()} (${(feeRate * 100).toFixed(1)}%)
  Listing:          #${buyer.listing_id ?? "—"}

An invoice should be raised for this partner.`,
      partnerEmail: user.email ?? "unknown",
    });
  } else {
    // Non-transaction status change (consulting / withdrawn) — lighter notification
    await notifyPortalAdmin({
      subject: `[STATUS] ${buyer.buyer_ref} → ${formData.newStatus}`,
      body: `Partner ${user.email} updated buyer ${buyer.buyer_ref} status to ${formData.newStatus}.`,
      partnerEmail: user.email ?? "unknown",
    });
  }

  return { success: true, feeAmountKes };
}
