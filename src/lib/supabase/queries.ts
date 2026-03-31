import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface DbListing {
  id: number;
  title: string;
  location: string;
  county: string;
  price_kes: number;
  price_usd: number;
  size: string;
  land_type: string;
  use: string;
  verified: boolean;
  score: number;
  image_url: string | null;
  agent_id: string | null;
  verification_status: string;
  trust_score: number | null;
}

export async function fetchListings(): Promise<DbListing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("Failed to fetch listings:", error.message);
    return [];
  }
  return data ?? [];
}
