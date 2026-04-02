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
  // New institutional fields
  institution_id: string | null;
  institution_tier: string | null;
  instalment_available: boolean;
  min_deposit_percent: number;
  instalment_term_options: number[] | null;
  featured: boolean;
}

export interface DbInstitution {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  tier: string;
  institution_type: string;
  founded_year: number | null;
  member_count: number | null;
  verified_partner: boolean;
  contact_email: string | null;
  created_at: string;
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

export async function fetchFeaturedListings(): Promise<DbListing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("featured", true)
    .order("id", { ascending: false })
    .limit(6);

  if (error) return [];
  return data ?? [];
}

export async function fetchInstitutions(): Promise<DbInstitution[]> {
  const { data, error } = await supabase
    .from("saccos")
    .select("*")
    .eq("verified_partner", true)
    .order("tier");

  if (error) return [];
  return data ?? [];
}

export async function fetchInstitutionBySlug(slug: string): Promise<DbInstitution | null> {
  const { data, error } = await supabase
    .from("saccos")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data;
}

export async function fetchListingsByInstitution(institutionId: string): Promise<DbListing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("institution_id", institutionId)
    .order("id", { ascending: false });

  if (error) return [];
  return data ?? [];
}
