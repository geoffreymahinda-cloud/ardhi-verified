"use server";

import { createClient } from "@/lib/supabase/server";

export async function getMyEnquiries() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { enquiries: [], savedListingIds: [], authenticated: false };

  // Get enquiries by email match
  const { data: enquiries } = await supabase
    .from("buyer_enquiries")
    .select("*")
    .eq("buyer_email", user.email)
    .order("created_at", { ascending: false });

  // Get saved listings
  const { data: saved } = await supabase
    .from("saved_searches")
    .select("filters")
    .eq("user_id", user.id)
    .eq("name", "__saved_listing__");

  const savedListingIds = (saved ?? [])
    .map((row) => (row.filters as { listing_id: number }).listing_id)
    .filter(Boolean);

  return {
    enquiries: enquiries ?? [],
    savedListingIds,
    authenticated: true,
  };
}
