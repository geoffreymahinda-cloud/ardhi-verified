-- ═══════════════════════════════════════════════════════════════════
-- Partner-tier fee rates
--
-- Previously the portal used a hardcoded 2.5% technology services fee
-- for every partner. The Taifa SACCO partnership agreement (and the
-- standard rate card for all SACCO partners) specifies 3.0% — so the
-- 2.5% default created an invoicing discrepancy the moment a SACCO
-- partner reported a completed transaction.
--
-- This migration adds a per-partner fee_rate column on public.saccos,
-- backfills existing SACCO-tier rows to 0.030 (3.0%), and leaves
-- bank and developer partners at the default 0.025 (2.5%). Individual
-- partners can be adjusted later via a direct UPDATE if they
-- negotiate a different rate.
--
-- Rate card (as at 2026-04-11):
--   SACCO partner        3.0%
--   Banking partner      2.5%
--   Developer partner    2.5%
--
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════

-- Add the column with a safe default
ALTER TABLE public.saccos
  ADD COLUMN IF NOT EXISTS fee_rate numeric(5,4) NOT NULL DEFAULT 0.025;

-- Sanity check: rates must be between 0% and 10%
ALTER TABLE public.saccos
  DROP CONSTRAINT IF EXISTS saccos_fee_rate_check;
ALTER TABLE public.saccos
  ADD  CONSTRAINT saccos_fee_rate_check
       CHECK (fee_rate >= 0 AND fee_rate <= 0.10);

-- Backfill: SACCO partners are contractually at 3.0% per the
-- Taifa SACCO partnership agreement and the standard SACCO rate card.
-- Banks and developers remain at the 2.5% default.
UPDATE public.saccos
SET   fee_rate = 0.030
WHERE tier = 'sacco'
  AND fee_rate <> 0.030;

-- ═══════════════════════════════════════════════════════════════════
-- Verify with:
--   SELECT slug, name, tier, fee_rate FROM public.saccos
--   ORDER BY tier, name;
-- ═══════════════════════════════════════════════════════════════════
