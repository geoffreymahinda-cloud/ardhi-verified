"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import crypto from "crypto";

export interface BuyerProfile {
  buyer_ref: string;
  introduction_status: string;
  listing_id: number | null;
  introduced_to_partner_id: string | null;
  introduced_at: string | null;
  attribution_window_expires_at: string | null;
  partner_name: string | null;
  buyer_pack_url: string;
}

// Must match the implementation in src/app/api/buyer-pack/[buyer_ref]/route.ts
// and src/app/actions.ts (buyerPackToken).
function buyerPackToken(buyerRef: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback-dev-secret";
  return crypto
    .createHmac("sha256", secret)
    .update(`buyer-pack:${buyerRef}`)
    .digest("hex")
    .substring(0, 32);
}

export async function getMyEnquiries() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      enquiries: [],
      savedListingIds: [],
      authenticated: false,
      buyerProfile: null as BuyerProfile | null,
    };
  }

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

  // Fetch the buyer profile (buyer_ref + journey status). Uses the
  // service client so it works before the buyer auth_user_id is linked.
  let buyerProfile: BuyerProfile | null = null;
  if (user.email) {
    const serviceClient = createServiceClient();
    const { data: buyer } = await serviceClient
      .from("buyers")
      .select(
        "buyer_ref, introduction_status, listing_id, introduced_to_partner_id, introduced_at, attribution_window_expires_at"
      )
      .eq("buyer_email", user.email.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (buyer) {
      let partnerName: string | null = null;
      if (buyer.introduced_to_partner_id) {
        const { data: partner } = await serviceClient
          .from("saccos")
          .select("name")
          .eq("id", buyer.introduced_to_partner_id)
          .maybeSingle();
        partnerName = partner?.name ?? null;
      }
      const token = buyerPackToken(buyer.buyer_ref);
      buyerProfile = {
        ...buyer,
        partner_name: partnerName,
        buyer_pack_url: `/api/buyer-pack/${encodeURIComponent(buyer.buyer_ref)}?t=${token}`,
      };
    }
  }

  return {
    enquiries: enquiries ?? [],
    savedListingIds,
    authenticated: true,
    buyerProfile,
  };
}
