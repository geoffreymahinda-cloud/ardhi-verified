"use server";

import { createClient } from "@/lib/supabase/server";

export async function getMyEnquiries() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { enquiries: [], authenticated: false };

  // Get enquiries by email match (since user_id may not be set on anonymous submissions)
  const { data, error } = await supabase
    .from("buyer_enquiries")
    .select("*")
    .eq("buyer_email", user.email)
    .order("created_at", { ascending: false });

  if (error) return { enquiries: [], authenticated: true };
  return { enquiries: data ?? [], authenticated: true };
}
