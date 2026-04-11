# Partner Onboarding — SQL Runbook

This document is the operational runbook for onboarding a new partner
institution (SACCO, bank, or developer) to the Ardhi Verified partner
portal. It is the authoritative source of truth for the SQL you need
to run per partner — do not improvise.

Run the queries in this file against the **live Supabase project** via
the SQL Editor (or `psql` / `supabase db execute` if you have those
configured). Every query is wrapped in explanatory comments so you can
see what it does before you click Run.

---

## Prerequisites

Before touching any SQL, confirm:

- [ ] The partner has **signed the Technology Services Agreement**
      (SACCO partners at 3.0%, banks and developers at 2.5% — if the
      agreement specifies a different rate, use that value in step 1
      below).
- [ ] The partner's admin user(s) have **created a Supabase auth
      account** on the site using the email they want to sign in with
      (they can sign up at `/auth/signup` — no code path triggers an
      invite email yet, this is a manual step).
- [ ] You know **which listings** (if any) should be attributed to
      this partner so existing pipeline activity can be retargeted.

---

## Step 1 — Create the partner institution row

```sql
-- Creates the partner row in public.saccos (the table name is legacy
-- from when we only had SACCO partners — it holds all partner types).
-- Set tier to one of: 'sacco' | 'bank' | 'developer'
-- Set fee_rate to the contractual rate as a decimal (0.030 = 3.0%)

INSERT INTO public.saccos (
  name,
  slug,
  description,
  tier,
  institution_type,
  founded_year,
  member_count,
  verified_partner,
  contact_email,
  fee_rate
) VALUES (
  'Taifa SACCO',                             -- display name
  'taifa-sacco',                             -- URL slug, lowercase + hyphens
  'Kenyan cooperative society focused on...', -- public description
  'sacco',                                   -- tier: sacco | bank | developer
  'Cooperative SACCO',                       -- human-readable type label
  NULL,                                      -- founded_year (nullable)
  NULL,                                      -- member_count (nullable)
  true,                                      -- verified_partner
  'partnerships@taifasacco.co.ke',           -- contact email
  0.030                                      -- fee_rate (3.0% for SACCOs)
)
ON CONFLICT (slug) DO NOTHING
RETURNING id, name, tier, fee_rate;
```

The `RETURNING` clause gives you the partner's UUID. Note it down —
you'll reference it in step 3 if you need to reassign listings.

---

## Step 2 — Provision the partner's admin user

```sql
-- Links the partner's Supabase auth account to their partner_users
-- row so they can sign in to /partners/portal and see their pipeline.
--
-- REQUIRES: the partner has already created a Supabase auth account
-- via /auth/signup on the site. If the auth user doesn't exist yet,
-- this INSERT will affect zero rows silently — always run the
-- verification query in Step 4 after.

INSERT INTO public.partner_users (partner_id, auth_user_id, email, role)
SELECT
  (SELECT id FROM public.saccos WHERE slug = 'taifa-sacco'),
  au.id,
  au.email,
  'admin'       -- 'admin' or 'viewer'
FROM auth.users au
WHERE au.email = 'taifa-admin@taifasacco.co.ke'
ON CONFLICT (partner_id, email) DO NOTHING;
```

To provision multiple users (e.g., one admin + two viewers), run this
INSERT once per user with their email. Each user must have their own
Supabase auth account.

---

## Step 3 — Attribute listings to the new partner

```sql
-- Reassigns existing listings to the new partner so any buyer who
-- expresses interest in those listings is automatically routed to
-- the partner's pipeline. Only run this if the partner brought
-- inventory with them.
--
-- REQUIRES: you already know the listing IDs. Run:
--   SELECT id, title, institution_id FROM public.listings
--   WHERE title ILIKE '%search term%';
-- first to find them.

UPDATE public.listings
SET
  institution_id   = (SELECT id FROM public.saccos WHERE slug = 'taifa-sacco'),
  institution_tier = 'sacco',
  -- Optionally set instalment availability and terms:
  instalment_available   = true,
  min_deposit_percent    = 20,
  instalment_term_options = '{12, 24, 36, 60}'
WHERE id IN (/* put listing IDs here, comma-separated */);
```

---

## Step 4 — Verify the onboarding

Always run these three verification queries in the SQL Editor after
Steps 1–3. If any row is missing or has the wrong value, stop and
investigate before telling the partner they can sign in.

```sql
-- 4a. Confirm the partner row exists with the correct fee_rate
SELECT id, slug, name, tier, fee_rate, verified_partner
FROM public.saccos
WHERE slug = 'taifa-sacco';

-- 4b. Confirm the admin user(s) are linked and auth_user_id matches
SELECT
  pu.email,
  pu.role,
  s.name           AS partner_name,
  s.fee_rate,
  pu.auth_user_id IS NOT NULL AS has_auth_link
FROM public.partner_users pu
JOIN public.saccos s ON s.id = pu.partner_id
WHERE s.slug = 'taifa-sacco';

-- 4c. Confirm listings are attributed (if applicable)
SELECT id, title, institution_tier
FROM public.listings
WHERE institution_id = (SELECT id FROM public.saccos WHERE slug = 'taifa-sacco');
```

Expected results:
- 4a returns exactly one row with `fee_rate = 0.0300` (SACCO) or
  `0.0250` (bank/developer) and `verified_partner = true`.
- 4b returns one row per provisioned admin/viewer, all with
  `has_auth_link = true`.
- 4c returns the listings you reassigned in step 3.

---

## Step 5 — Tell the partner they can sign in

Once verification passes, the partner admin can:

1. Go to `https://www.ardhiverified.com/auth/login`
2. Sign in with the email from step 2
3. Click the user avatar → **Partner Portal**
4. Lands on `/partners/portal` with:
   - Navy/gold hero header with their partner name
   - Gold attribution banner showing `Your contractually-agreed rate: 3.0% of gross transaction value`
   - Stats bar (all zeros until buyers are introduced)
   - Pipeline table
   - Footnote explaining that buyer names and contact details are
     shared off-platform after formal introduction

---

## Rollback — removing a partner

If you need to offboard a partner cleanly (agreement ended, wrong
provisioning, etc.), run in this order:

```sql
-- 1. Revoke portal access for all users of this partner
DELETE FROM public.partner_users
WHERE partner_id = (SELECT id FROM public.saccos WHERE slug = 'taifa-sacco');

-- 2. Reassign any attributed listings to NULL or another partner
UPDATE public.listings
SET institution_id = NULL, institution_tier = NULL
WHERE institution_id = (SELECT id FROM public.saccos WHERE slug = 'taifa-sacco');

-- 3. DO NOT DELETE the saccos row itself — public.buyers and
--    public.technology_fees hold foreign keys to it. Deleting the
--    partner would orphan historical fee records and break the
--    audit trail. Instead, mark them as unverified:
UPDATE public.saccos
SET verified_partner = false
WHERE slug = 'taifa-sacco';
```

---

## Fee rate overrides

The default rates set by the `20260411_partner_fee_rates.sql` migration
are:

| Tier | Default fee_rate |
|---|---|
| `sacco` | `0.0300` (3.0%) |
| `bank` | `0.0250` (2.5%) |
| `developer` | `0.0250` (2.5%) |

If an individual partner negotiates a different rate, override just
that one row:

```sql
UPDATE public.saccos
SET fee_rate = 0.0275  -- example: 2.75%
WHERE slug = 'taifa-sacco';
```

The portal reads `fee_rate` on every page load and `updateBuyerStatus()`
reads it on every transaction report, so a change here takes effect
immediately on the next portal action — **existing `technology_fees`
rows are not affected** because they lock in the rate that applied at
the time of the transaction (see `public.technology_fees.fee_rate`).

---

## Reference — tables touched by this runbook

| Table | Purpose | Migration |
|---|---|---|
| `public.saccos` | Partner institutions (SACCO, bank, developer) | `supabase-migration-institutions.sql` |
| `public.saccos.fee_rate` | Per-partner technology services fee rate | `supabase/migrations/20260411_partner_fee_rates.sql` |
| `public.partner_users` | Partner admin/viewer → auth user mapping | `supabase/migrations/20260411_buyer_reference_system.sql` |
| `public.buyers` | Verified buyers with `AV-YYYY-CC-NNNNN` refs | `supabase/migrations/20260411_buyer_reference_system.sql` |
| `public.technology_fees` | Fee ledger (locks in rate at transaction time) | `supabase/migrations/20260411_buyer_reference_system.sql` |
| `public.listings.institution_id` | Listing ↔ partner attribution | `supabase-migration-institutions.sql` |
