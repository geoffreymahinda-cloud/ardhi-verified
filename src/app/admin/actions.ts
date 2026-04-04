"use server";

import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "geoffrey@ardhiverified.com";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    throw new Error("Unauthorized");
  }
  return supabase;
}

export async function getEnquiries(filter?: string) {
  const supabase = await requireAdmin();

  let query = supabase
    .from("buyer_enquiries")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter && filter !== "all") {
    query = query.eq("journey_stage", filter);
  }

  const { data, error } = await query;
  if (error) return { enquiries: [], error: error.message };
  return { enquiries: data ?? [], error: null };
}

export async function getStats() {
  const supabase = await requireAdmin();

  const { data } = await supabase
    .from("buyer_enquiries")
    .select("journey_stage, status");

  if (!data) return { total: 0, byType: {}, byStatus: {} };

  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const row of data) {
    byType[row.journey_stage] = (byType[row.journey_stage] || 0) + 1;
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
  }

  return { total: data.length, byType, byStatus };
}

export async function updateEnquiryStatus(id: number, status: string) {
  const supabase = await requireAdmin();

  const updates: Record<string, unknown> = { status };
  if (status === "responded") {
    updates.responded_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("buyer_enquiries")
    .update(updates)
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
