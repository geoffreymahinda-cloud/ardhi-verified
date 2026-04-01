"use server";

import { createClient } from "@/lib/supabase/server";

export async function getSavedListings(): Promise<number[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("saved_searches")
    .select("filters")
    .eq("user_id", user.id)
    .eq("name", "__saved_listing__");

  if (!data) return [];
  return data.map((row) => (row.filters as { listing_id: number }).listing_id).filter(Boolean);
}

export async function toggleSavedListing(listingId: number): Promise<{ saved: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { saved: false };

  // Check if already saved
  const { data: existing } = await supabase
    .from("saved_searches")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", "__saved_listing__")
    .eq("filters->listing_id", listingId)
    .limit(1);

  if (existing && existing.length > 0) {
    // Unsave
    await supabase.from("saved_searches").delete().eq("id", existing[0].id);
    return { saved: false };
  } else {
    // Save
    await supabase.from("saved_searches").insert({
      user_id: user.id,
      name: "__saved_listing__",
      filters: { listing_id: listingId },
    });
    return { saved: true };
  }
}
