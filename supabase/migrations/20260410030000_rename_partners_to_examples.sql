-- ═══════════════════════════════════════════════════════════════════
-- Scrub real bank/SACCO names from the saccos table
--
-- Real partnership conversations have begun, so we cannot keep the
-- original placeholder names live on the site. This migration renames
-- every existing row to an abstract "Example" label and generalizes
-- descriptions so no row implies a real-world entity.
--
-- Safe to run multiple times — each UPDATE is keyed by the old slug
-- and will no-op if the row has already been renamed.
-- ═══════════════════════════════════════════════════════════════════

-- ── SACCOs ────────────────────────────────────────────────────────
UPDATE public.saccos
SET
  name = 'Example SACCO Alpha',
  slug = 'example-sacco-alpha',
  description = 'Large Kenyan cooperative society with a significant land portfolio across multiple counties. Member-governed and decades-established.',
  contact_email = 'partners-alpha@example.com',
  founded_year = NULL
WHERE slug = 'stima-sacco';

UPDATE public.saccos
SET
  name = 'Example SACCO Beta',
  slug = 'example-sacco-beta',
  description = 'Kenyan workers'' cooperative focused on affordable land ownership for member communities. Strong presence across key counties.',
  contact_email = 'partners-beta@example.com',
  founded_year = NULL
WHERE slug = 'ukulima-sacco';

UPDATE public.saccos
SET
  name = 'Example SACCO Gamma',
  slug = 'example-sacco-gamma',
  description = 'Employer-backed staff cooperative society with premium land holdings in Nairobi, Kiambu, and coastal regions.',
  contact_email = 'partners-gamma@example.com',
  founded_year = NULL
WHERE slug = 'safaricom-sacco';

-- ── Banks ─────────────────────────────────────────────────────────
UPDATE public.saccos
SET
  name = 'Example Banking Partner A',
  slug = 'example-banking-partner-a',
  description = 'Licensed Kenyan commercial bank — foreclosed and asset-recovery properties available through Ardhi Verified. All titles independently verified.',
  contact_email = 'partners-a@example.com',
  founded_year = NULL
WHERE slug = 'kcb-bank';

UPDATE public.saccos
SET
  name = 'Example Banking Partner B',
  slug = 'example-banking-partner-b',
  description = 'Licensed Kenyan commercial bank — competitively priced verified listings available for outright purchase or bank-set instalment terms.',
  contact_email = 'partners-b@example.com',
  founded_year = NULL
WHERE slug = 'equity-bank';

-- ── Developers ────────────────────────────────────────────────────
UPDATE public.saccos
SET
  name = 'Example Developer Partner',
  slug = 'example-developer-partner',
  description = 'Established Kenyan real estate developer with a verifiable project track record. Minimum 10 plots per listing.',
  contact_email = 'partners-dev@example.com',
  founded_year = NULL
WHERE slug = 'optiven';

-- ═══════════════════════════════════════════════════════════════════
-- Verify by running:
--   SELECT slug, name, tier FROM public.saccos ORDER BY tier, name;
-- ═══════════════════════════════════════════════════════════════════
