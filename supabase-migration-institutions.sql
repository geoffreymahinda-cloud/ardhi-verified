-- ═══════════════════════════════════════════════════════════════════
-- ARDHI VERIFIED — INSTITUTIONAL TIER MIGRATION
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. SACCOS / INSTITUTIONS TABLE
-- Stores all partner institutions: SACCOs, banks, developers
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saccos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  logo_url text,
  tier text NOT NULL CHECK (tier IN ('sacco', 'bank', 'developer')),
  institution_type text NOT NULL, -- e.g. "Cooperative SACCO", "Commercial Bank", "Property Developer"
  founded_year integer,
  member_count integer, -- for SACCOs only
  verified_partner boolean DEFAULT false,
  contact_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saccos ENABLE ROW LEVEL SECURITY;

-- Everyone can read institutions (they're public listings)
CREATE POLICY "Public read institutions"
  ON public.saccos FOR SELECT
  USING (true);

-- Only service role / admin can modify
CREATE POLICY "Admin manages institutions"
  ON public.saccos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin updates institutions"
  ON public.saccos FOR UPDATE
  USING (true);


-- 2. INSTALMENT PLANS TABLE
-- Tracks each buyer's payment plan for a specific listing
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.instalment_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id bigint REFERENCES public.listings(id),
  buyer_id uuid NOT NULL REFERENCES auth.users(id),
  total_price bigint NOT NULL, -- in KES
  deposit_amount bigint NOT NULL, -- in KES
  deposit_paid boolean DEFAULT false,
  monthly_amount bigint NOT NULL, -- in KES
  term_months integer NOT NULL,
  payments_made integer DEFAULT 0,
  next_payment_date date,
  status text NOT NULL DEFAULT 'pending_deposit' CHECK (status IN (
    'pending_deposit', 'active', 'completed', 'defaulted', 'cancelled'
  )),
  stripe_subscription_id text, -- for recurring billing
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.instalment_plans ENABLE ROW LEVEL SECURITY;

-- Buyers can only see their own plans
CREATE POLICY "Buyers view own instalment plans"
  ON public.instalment_plans FOR SELECT
  USING (auth.uid() = buyer_id);

-- Service role / server actions can insert
CREATE POLICY "Server inserts instalment plans"
  ON public.instalment_plans FOR INSERT
  WITH CHECK (true);

-- Service role / server actions can update
CREATE POLICY "Server updates instalment plans"
  ON public.instalment_plans FOR UPDATE
  USING (true);


-- 3. ADD COLUMNS TO LISTINGS TABLE
-- Links listings to institutions and enables instalment pricing
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS institution_id uuid REFERENCES public.saccos(id),
  ADD COLUMN IF NOT EXISTS institution_tier text CHECK (institution_tier IN ('sacco', 'bank', 'developer')),
  ADD COLUMN IF NOT EXISTS instalment_available boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_deposit_percent integer DEFAULT 20,
  ADD COLUMN IF NOT EXISTS instalment_term_options integer[] DEFAULT '{12, 24, 36, 60}',
  ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;


-- 4. SEED SAMPLE INSTITUTIONS
-- These are placeholder partners — replace with real ones later
-- ─────────────────────────────────────────────────────────────────

INSERT INTO public.saccos (name, slug, description, tier, institution_type, founded_year, member_count, verified_partner, contact_email) VALUES
  ('Stima SACCO', 'stima-sacco', 'Kenya Power employees'' cooperative society. One of Kenya''s largest SACCOs with a significant land portfolio across multiple counties.', 'sacco', 'Cooperative SACCO', 1974, 42000, true, 'info@stima-sacco.co.ke'),
  ('Ukulima SACCO', 'ukulima-sacco', 'Agricultural workers'' cooperative focused on affordable land ownership for farming communities. Strong presence in Nakuru and Kiambu counties.', 'sacco', 'Cooperative SACCO', 1989, 28000, true, 'info@ukulima.co.ke'),
  ('Safaricom SACCO', 'safaricom-sacco', 'Safaricom staff cooperative society. Premium land holdings in Nairobi, Kiambu, and coastal regions.', 'sacco', 'Cooperative SACCO', 2003, 8500, true, 'sacco@safaricom.co.ke'),
  ('KCB Bank', 'kcb-bank', 'Kenya Commercial Bank — foreclosed properties available through Ardhi Verified. All titles independently verified.', 'bank', 'Commercial Bank', 1896, NULL, true, 'properties@kcb.co.ke'),
  ('Equity Bank', 'equity-bank', 'Equity Bank foreclosure listings. Competitively priced, fully verified, available for outright purchase.', 'bank', 'Commercial Bank', 1984, NULL, true, 'properties@equitybank.co.ke'),
  ('Optiven Limited', 'optiven', 'Award-winning Kenyan real estate developer with over 50 projects across Kenya. Minimum 10 plots per listing.', 'developer', 'Property Developer', 2001, NULL, true, 'sales@optiven.co.ke')
ON CONFLICT (slug) DO NOTHING;


-- 5. LINK EXISTING LISTINGS TO INSTITUTIONS
-- Assigns sample institutions to existing listings for demo purposes
-- ─────────────────────────────────────────────────────────────────

-- Make some listings SACCO-backed with instalments
UPDATE public.listings SET
  institution_id = (SELECT id FROM public.saccos WHERE slug = 'stima-sacco'),
  institution_tier = 'sacco',
  instalment_available = true,
  min_deposit_percent = 20,
  instalment_term_options = '{12, 24, 36, 60}',
  featured = true
WHERE id IN (1, 3, 5, 7, 8);

-- Make some bank foreclosures
UPDATE public.listings SET
  institution_id = (SELECT id FROM public.saccos WHERE slug = 'kcb-bank'),
  institution_tier = 'bank',
  instalment_available = false,
  featured = true
WHERE id IN (2, 6);

-- Make some developer listings
UPDATE public.listings SET
  institution_id = (SELECT id FROM public.saccos WHERE slug = 'optiven'),
  institution_tier = 'developer',
  instalment_available = false,
  featured = false
WHERE id IN (4, 9, 10, 11);


-- ═══════════════════════════════════════════════════════════════════
-- DONE. Verify by running:
-- SELECT * FROM public.saccos;
-- SELECT id, title, institution_tier, instalment_available, featured FROM public.listings;
-- ═══════════════════════════════════════════════════════════════════
