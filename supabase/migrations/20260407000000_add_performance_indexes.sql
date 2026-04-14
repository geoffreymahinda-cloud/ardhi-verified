-- ============================================================
-- Ardhi Verified — Performance Indexes
-- ============================================================
-- Fixes full table scans on elc_cases (44K rows) and
-- gazette_notices (45K rows) that are exhausting Supabase
-- Disk IO Budget.
--
-- Index strategy based on actual app query patterns:
--   - hatiscan API: ILIKE on parcel_reference, parties, case_number
--   - intelligence page: court_station grouping, date_decided ordering
--   - trust score function: JSONB @> on parcel_reference
--   - search: ILIKE on parties, case_number, judge, court_station
-- ============================================================

-- ── 1. ELC CASES (44K rows) ─────────────────────────────────

-- 1a. Fix: parcel_reference is TEXT but trust score uses @> (JSONB operator).
--     Convert to JSONB so GIN index + containment queries work.
ALTER TABLE elc_cases
  ALTER COLUMN parcel_reference TYPE JSONB
  USING parcel_reference::JSONB;

-- 1b. GIN index for JSONB containment queries (@>) on parcel_reference
--     Used by: calculate_trust_score(), hatiscan API .contains()
CREATE INDEX IF NOT EXISTS idx_elc_parcel_gin
  ON elc_cases USING GIN (parcel_reference jsonb_ops);

-- 1c. Trigram indexes for ILIKE searches (requires pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- parcel_reference text search (hatiscan document route uses ILIKE)
CREATE INDEX IF NOT EXISTS idx_elc_parcel_trgm
  ON elc_cases USING GIN ((parcel_reference::text) gin_trgm_ops);

-- parties ILIKE search (intelligence search, hatiscan)
CREATE INDEX IF NOT EXISTS idx_elc_parties_trgm
  ON elc_cases USING GIN (parties gin_trgm_ops);

-- case_number ILIKE search
CREATE INDEX IF NOT EXISTS idx_elc_case_number_trgm
  ON elc_cases USING GIN (case_number gin_trgm_ops);

-- 1d. B-tree indexes for equality/sort queries
-- court_station: used for station breakdown grouping on intelligence page
CREATE INDEX IF NOT EXISTS idx_elc_court_station
  ON elc_cases (court_station);

-- date_decided: used for ordering recent cases
CREATE INDEX IF NOT EXISTS idx_elc_date_decided
  ON elc_cases (date_decided DESC NULLS LAST);

-- outcome: used for trust score ILIKE filtering
CREATE INDEX IF NOT EXISTS idx_elc_outcome
  ON elc_cases (outcome);

-- source_url: used for upsert deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_elc_source_url
  ON elc_cases (source_url);


-- ── 2. GAZETTE NOTICES (45K rows) ───────────────────────────

-- GIN index on parcel_reference should already exist from create migration,
-- but ensure it's there
CREATE INDEX IF NOT EXISTS idx_gazette_notices_parcel
  ON gazette_notices USING GIN (parcel_reference jsonb_ops);

-- Trigram index for ILIKE text search on parcel_reference
-- Used by: hatiscan route .ilike("parcel_reference", ...)
CREATE INDEX IF NOT EXISTS idx_gazette_parcel_trgm
  ON gazette_notices USING GIN ((parcel_reference::text) gin_trgm_ops);

-- county: used for filtering
CREATE INDEX IF NOT EXISTS idx_gazette_notices_county
  ON gazette_notices (county);

-- alert_level: used for trust score and filtering
CREATE INDEX IF NOT EXISTS idx_gazette_notices_alert
  ON gazette_notices (alert_level);

-- notice_type: used for filtering/grouping
CREATE INDEX IF NOT EXISTS idx_gazette_notice_type
  ON gazette_notices (notice_type);

-- gazette_year: used for year-based queries
CREATE INDEX IF NOT EXISTS idx_gazette_year
  ON gazette_notices (gazette_year);


-- ── 3. COMMUNITY FLAGS ──────────────────────────────────────

-- Trigram indexes for ILIKE searches (hatiscan queries)
CREATE INDEX IF NOT EXISTS idx_flags_description_trgm
  ON community_flags USING GIN (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_flags_location_trgm
  ON community_flags USING GIN (location gin_trgm_ops);

-- status + severity: used by trust score function
CREATE INDEX IF NOT EXISTS idx_flags_status
  ON community_flags (status);

-- county: used for grouping
CREATE INDEX IF NOT EXISTS idx_flags_county
  ON community_flags (county);


-- ── 4. LISTINGS ─────────────────────────────────────────────

-- verified: used for featured listings filter
CREATE INDEX IF NOT EXISTS idx_listings_verified
  ON listings (verified);

-- institution_id: used for partner dashboard queries
CREATE INDEX IF NOT EXISTS idx_listings_institution
  ON listings (institution_id);

-- county: used for location-based queries
CREATE INDEX IF NOT EXISTS idx_listings_county
  ON listings (county);

-- slug: used for individual listing page lookups
CREATE INDEX IF NOT EXISTS idx_listings_slug
  ON listings (slug);


-- ── 5. Analyze all tables to update planner statistics ──────
ANALYZE elc_cases;
ANALYZE gazette_notices;
ANALYZE community_flags;
ANALYZE listings;
