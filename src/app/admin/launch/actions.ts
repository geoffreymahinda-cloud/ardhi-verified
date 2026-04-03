"use server";

import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "geoffrey.mahinda@gmail.com";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) throw new Error("Unauthorized");
  return supabase;
}

export async function loadDashboardState() {
  const supabase = await requireAdmin();
  const { data } = await supabase
    .from("launch_dashboard_state")
    .select("*")
    .limit(1)
    .single();

  return data;
}

export async function saveDashboardState(state: {
  tasks: unknown;
  kpis: unknown;
  notes: unknown;
}) {
  const supabase = await requireAdmin();

  // Check if a row exists
  const { data: existing } = await supabase
    .from("launch_dashboard_state")
    .select("id")
    .limit(1)
    .single();

  if (existing) {
    await supabase
      .from("launch_dashboard_state")
      .update({
        tasks: state.tasks,
        kpis: state.kpis,
        notes: state.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("launch_dashboard_state")
      .insert({
        tasks: state.tasks,
        kpis: state.kpis,
        notes: state.notes,
      });
  }
}
