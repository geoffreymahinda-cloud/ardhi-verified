"use server";

import { createClient } from "@/lib/supabase/server";

// For now, partner access is determined by matching the user's email
// to the institution's contact_email. In production, this would use
// a partner_users junction table.

export async function getPartnerData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { authenticated: false, authorized: false, institution: null, listings: [], enquiries: [], instalments: [] };

  // Check if user is a partner (match by email or admin override)
  const ADMIN_EMAIL = "geoffrey.mahinda@gmail.com";
  const isAdmin = user.email === ADMIN_EMAIL;

  // Find institution by contact email
  let institution = null;
  let institutionId = null;

  if (isAdmin) {
    // Admin sees the first institution (for demo purposes)
    const { data } = await supabase.from("saccos").select("*").limit(1).single();
    institution = data;
    institutionId = data?.id;
  } else {
    const { data } = await supabase.from("saccos").select("*").eq("contact_email", user.email).single();
    institution = data;
    institutionId = data?.id;
  }

  if (!institution) {
    return { authenticated: true, authorized: false, institution: null, listings: [], enquiries: [], instalments: [] };
  }

  // Fetch listings for this institution
  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .eq("institution_id", institutionId)
    .order("id", { ascending: false });

  // Fetch enquiries related to these listings
  const listingIds = (listings || []).map((l: { id: number }) => l.id);
  let enquiries: Record<string, unknown>[] = [];
  if (listingIds.length > 0) {
    const { data } = await supabase
      .from("buyer_enquiries")
      .select("*")
      .in("listing_id", listingIds)
      .order("created_at", { ascending: false });
    enquiries = data || [];
  }

  // Fetch instalment plans for these listings
  let instalments: Record<string, unknown>[] = [];
  if (listingIds.length > 0) {
    const { data } = await supabase
      .from("instalment_plans")
      .select("*")
      .in("listing_id", listingIds)
      .order("created_at", { ascending: false });
    instalments = data || [];
  }

  return {
    authenticated: true,
    authorized: true,
    institution,
    listings: listings || [],
    enquiries,
    instalments,
  };
}

export async function updateListingStatus(listingId: number, updates: Record<string, unknown>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("listings")
    .update(updates)
    .eq("id", listingId);

  return { success: !error };
}
