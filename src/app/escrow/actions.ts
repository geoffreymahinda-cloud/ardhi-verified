"use server";

import { createClient } from "@/lib/supabase/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// ─── INITIATE M-PESA PAYMENT ────────────────────────────────────────────────

export async function initiateMpesaPayment(data: {
  phone: string;
  amount: number;
  listingId: number;
  listingTitle: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Please sign in to make a payment." };

  // Normalize phone: ensure 254XXXXXXXXX format
  let phone = data.phone.replace(/[\s\-+]/g, "");
  if (phone.startsWith("0")) phone = "254" + phone.slice(1);
  if (!phone.startsWith("254")) phone = "254" + phone;

  if (phone.length !== 12) {
    return { success: false, error: "Invalid phone number. Use format: 0712345678" };
  }

  try {
    const { data: result, error } = await supabase.functions.invoke("mpesa-payment", {
      body: {
        phone,
        amount: Math.round(data.amount),
        listing_id: data.listingId,
        listing_title: data.listingTitle,
      },
    });

    if (error) {
      console.error("M-Pesa initiation failed:", error);
      return { success: false, error: "Failed to initiate payment. Please try again." };
    }

    // Create a pending escrow transaction
    await supabase.from("escrow_transactions").insert({
      listing_id: data.listingId,
      buyer_id: user.id,
      amount: data.amount,
      status: "pending",
      release_conditions: {
        title_transfer: false,
        buyer_approval: false,
        verification_complete: false,
      },
    });

    return { success: true, data: result };
  } catch (e) {
    console.error("Payment error:", e);
    return { success: false, error: "Payment service unavailable. Please try again later." };
  }
}

// ─── GET USER'S ESCROW TRANSACTIONS ──────────────────────────────────────────

export async function getMyTransactions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { transactions: [], authenticated: false };

  const { data } = await supabase
    .from("escrow_transactions")
    .select("*, listings(title, location, county)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  return { transactions: data ?? [], authenticated: true };
}

// ─── GET SINGLE TRANSACTION ──────────────────────────────────────────────────

export async function getTransaction(transactionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("escrow_transactions")
    .select("*, listings(title, location, county, price_kes)")
    .eq("id", transactionId)
    .eq("buyer_id", user.id)
    .single();

  return data;
}

// ─── ADMIN: GET ALL ESCROW TRANSACTIONS ──────────────────────────────────────

const ADMIN_EMAIL = "geoffrey@ardhiverified.com";

export async function getAllTransactions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return [];

  const { data } = await supabase
    .from("escrow_transactions")
    .select("*, listings(title, location)")
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function updateTransactionStatus(transactionId: number, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return { success: false };

  const { error } = await supabase
    .from("escrow_transactions")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transactionId);

  return { success: !error };
}
