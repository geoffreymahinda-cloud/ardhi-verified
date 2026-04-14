-- Create gazette_notices table for Kenya Gazette land notices
-- Used by calculate_trust_score() and the intelligence page

CREATE TABLE IF NOT EXISTS gazette_notices (
  id              BIGSERIAL PRIMARY KEY,
  notice_type     TEXT NOT NULL DEFAULT 'general_land',
  parcel_reference JSONB DEFAULT '[]'::JSONB,
  county          TEXT,
  gazette_notice_number TEXT,
  affected_party  TEXT,
  acquiring_body  TEXT,
  inquiry_date    TEXT,
  alert_level     TEXT NOT NULL DEFAULT 'info',
  description     TEXT,
  raw_text        TEXT,
  summary         TEXT,
  gazette_title   TEXT,
  gazette_url     TEXT,
  gazette_year    INTEGER,
  extracted_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate notices from the same gazette
  CONSTRAINT gazette_notices_unique UNIQUE (gazette_notice_number, gazette_url)
);

-- Index for trust score lookups (JSONB containment on parcel_reference)
CREATE INDEX IF NOT EXISTS idx_gazette_notices_parcel
  ON gazette_notices USING GIN (parcel_reference);

-- Index for county filtering
CREATE INDEX IF NOT EXISTS idx_gazette_notices_county
  ON gazette_notices (county);

-- Index for alert level filtering
CREATE INDEX IF NOT EXISTS idx_gazette_notices_alert
  ON gazette_notices (alert_level);

-- RLS: allow read access for anon and authenticated
ALTER TABLE gazette_notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gazette_notices_read" ON gazette_notices;
CREATE POLICY "gazette_notices_read" ON gazette_notices
  FOR SELECT USING (true);
