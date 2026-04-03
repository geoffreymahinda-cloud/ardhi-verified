"use server";

import { createClient } from "@/lib/supabase/server";

export interface ActivePlan {
  id: string;
  listing_id: number;
  total_price: number;
  deposit_amount: number;
  deposit_paid: boolean;
  monthly_amount: number;
  term_months: number;
  payments_made: number;
  next_payment_date: string | null;
  status: string;
  listing_title: string | null;
}

export async function getActivePlan(): Promise<{ plan: ActivePlan | null; authenticated: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { plan: null, authenticated: false };

  // Get active instalment plan with listing title
  const { data } = await supabase
    .from("instalment_plans")
    .select("*, listings(title)")
    .eq("buyer_id", user.id)
    .in("status", ["active", "pending_deposit"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return { plan: null, authenticated: true };

  return {
    plan: {
      id: data.id,
      listing_id: data.listing_id,
      total_price: data.total_price,
      deposit_amount: data.deposit_amount,
      deposit_paid: data.deposit_paid,
      monthly_amount: data.monthly_amount,
      term_months: data.term_months,
      payments_made: data.payments_made,
      next_payment_date: data.next_payment_date,
      status: data.status,
      listing_title: (data.listings as { title: string } | null)?.title || null,
    },
    authenticated: true,
  };
}
