-- ============================================================
-- Ardhi Verified — Registry Status + County Activation System
-- ============================================================
-- Tracks which Kenyan counties are live on Ardhisasa (NLIMS).
-- When a county flips to live, HatiScan automatically expands
-- scan coverage via cron + Edge Functions.

-- ── 1. audit_log table (if not exists) ─────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  event_type  TEXT NOT NULL,
  entity      TEXT,
  note        TEXT,
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read audit_log" ON audit_log;
CREATE POLICY "Public read audit_log" ON audit_log FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service write audit_log" ON audit_log;
CREATE POLICY "Service write audit_log" ON audit_log FOR INSERT WITH CHECK (true);

-- ── 2. registry_status table ───────────────────────────────

CREATE TABLE IF NOT EXISTS registry_status (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  county_name           TEXT NOT NULL UNIQUE,
  county_code           INTEGER NOT NULL UNIQUE,
  ardhisasa_live        BOOLEAN NOT NULL DEFAULT FALSE,
  date_activated        DATE,
  data_quality_rating   TEXT CHECK (data_quality_rating IN ('clean','partial','incomplete')),
  cron_active           BOOLEAN NOT NULL DEFAULT FALSE,
  last_scan_at          TIMESTAMPTZ,
  scan_record_count     INTEGER NOT NULL DEFAULT 0,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registry_live ON registry_status(ardhisasa_live);
CREATE INDEX IF NOT EXISTS idx_registry_cron ON registry_status(cron_active);
CREATE INDEX IF NOT EXISTS idx_registry_code ON registry_status(county_code);

-- ── 3. updated_at trigger ──────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_registry_updated_at ON registry_status;
CREATE TRIGGER trigger_registry_updated_at
  BEFORE UPDATE ON registry_status
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 4. County activation trigger ──────────────────────────

CREATE OR REPLACE FUNCTION handle_county_activation()
RETURNS TRIGGER AS $$
BEGIN
  -- Fire only when ardhisasa_live flips from FALSE to TRUE
  IF OLD.ardhisasa_live = FALSE AND NEW.ardhisasa_live = TRUE THEN
    NEW.cron_active := TRUE;
    IF NEW.date_activated IS NULL THEN
      NEW.date_activated := CURRENT_DATE;
    END IF;

    INSERT INTO audit_log (event_type, entity, note, metadata)
    VALUES (
      'county_activated',
      NEW.county_name,
      'Ardhisasa live — HatiScan scan coverage expanded automatically',
      jsonb_build_object(
        'county_code', NEW.county_code,
        'activated_at', NOW()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_county_activation ON registry_status;
CREATE TRIGGER trigger_county_activation
  BEFORE UPDATE ON registry_status
  FOR EACH ROW EXECUTE FUNCTION handle_county_activation();

-- ── 5. Seed all 47 Kenya counties ─────────────────────────

INSERT INTO registry_status (county_name, county_code, ardhisasa_live, cron_active, notes) VALUES
  ('Mombasa',          1,  FALSE, FALSE, 'Phase 2 — priority watch'),
  ('Kwale',            2,  FALSE, FALSE, NULL),
  ('Kilifi',           3,  FALSE, FALSE, 'Phase 2 — priority watch'),
  ('Tana River',       4,  FALSE, FALSE, NULL),
  ('Lamu',             5,  FALSE, FALSE, NULL),
  ('Taita-Taveta',     6,  FALSE, FALSE, NULL),
  ('Garissa',          7,  FALSE, FALSE, NULL),
  ('Wajir',            8,  FALSE, FALSE, NULL),
  ('Mandera',          9,  FALSE, FALSE, NULL),
  ('Marsabit',         10, FALSE, FALSE, NULL),
  ('Isiolo',           11, FALSE, FALSE, NULL),
  ('Meru',             12, FALSE, FALSE, 'Phase 2 — priority watch'),
  ('Tharaka-Nithi',    13, FALSE, FALSE, NULL),
  ('Embu',             14, FALSE, FALSE, 'Phase 2 — priority watch'),
  ('Kitui',            15, FALSE, FALSE, NULL),
  ('Machakos',         16, FALSE, FALSE, 'Phase 2 — priority watch'),
  ('Makueni',          17, FALSE, FALSE, NULL),
  ('Nyandarua',        18, FALSE, FALSE, 'Phase 2 — priority watch'),
  ('Nyeri',            19, FALSE, FALSE, 'Phase 2 — priority watch'),
  ('Kirinyaga',        20, FALSE, FALSE, 'Phase 2 — priority watch'),
  ('Murang''a',        21, TRUE,  TRUE,  'Confirmed live on Ardhisasa'),
  ('Kiambu',           22, FALSE, FALSE, 'Phase 2 — priority watch'),
  ('Turkana',          23, FALSE, FALSE, NULL),
  ('West Pokot',       24, FALSE, FALSE, NULL),
  ('Samburu',          25, FALSE, FALSE, NULL),
  ('Trans-Nzoia',      26, FALSE, FALSE, NULL),
  ('Uasin Gishu',      27, FALSE, FALSE, 'Phase 2 — priority watch'),
  ('Elgeyo-Marakwet',  28, FALSE, FALSE, NULL),
  ('Nandi',            29, FALSE, FALSE, NULL),
  ('Baringo',          30, FALSE, FALSE, NULL),
  ('Laikipia',         31, FALSE, FALSE, 'Phase 2 — priority watch'),
  ('Nakuru',           32, FALSE, FALSE, 'Phase 2 — priority watch'),
  ('Narok',            33, FALSE, FALSE, NULL),
  ('Kajiado',          34, FALSE, FALSE, 'Phase 2 — priority watch'),
  ('Kericho',          35, FALSE, FALSE, NULL),
  ('Bomet',            36, FALSE, FALSE, NULL),
  ('Kakamega',         37, FALSE, FALSE, 'Phase 2 — priority watch'),
  ('Vihiga',           38, FALSE, FALSE, NULL),
  ('Bungoma',          39, FALSE, FALSE, NULL),
  ('Busia',            40, FALSE, FALSE, NULL),
  ('Siaya',            41, FALSE, FALSE, NULL),
  ('Kisumu',           42, FALSE, FALSE, 'Phase 2 — priority watch'),
  ('Homa Bay',         43, FALSE, FALSE, NULL),
  ('Migori',           44, FALSE, FALSE, NULL),
  ('Kisii',            45, FALSE, FALSE, NULL),
  ('Nyamira',          46, FALSE, FALSE, NULL),
  ('Nairobi',          47, TRUE,  TRUE,  'Confirmed live on Ardhisasa')
ON CONFLICT (county_code) DO NOTHING;

-- Set date_activated for already-live counties
UPDATE registry_status
SET date_activated = CURRENT_DATE
WHERE ardhisasa_live = TRUE AND date_activated IS NULL;

-- ── 6. RLS policies ────────────────────────────────────────

ALTER TABLE registry_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read registry_status" ON registry_status;
CREATE POLICY "Public read registry_status"
  ON registry_status FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated update registry_status" ON registry_status;
CREATE POLICY "Authenticated update registry_status"
  ON registry_status FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated insert registry_status" ON registry_status;
CREATE POLICY "Authenticated insert registry_status"
  ON registry_status FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── 7. County scan RPC function (server-side scan logic) ──

CREATE OR REPLACE FUNCTION scan_county_registry(p_county_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status RECORD;
  v_elc_count INTEGER := 0;
  v_gazette_count INTEGER := 0;
  v_riparian_count INTEGER := 0;
  v_total INTEGER;
BEGIN
  -- Check county is live + cron active
  SELECT * INTO v_status FROM registry_status
  WHERE county_name = p_county_name
    AND ardhisasa_live = TRUE
    AND cron_active = TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', 'County not live on Ardhisasa or cron not active',
      'county', p_county_name
    );
  END IF;

  -- Count ELC cases by court_station matching county
  SELECT COUNT(*) INTO v_elc_count
  FROM elc_cases
  WHERE court_station ILIKE '%' || p_county_name || '%';

  -- Count gazette notices by county
  SELECT COUNT(*) INTO v_gazette_count
  FROM gazette_notices
  WHERE county ILIKE '%' || p_county_name || '%';

  -- Count riparian zones by county
  SELECT COUNT(*) INTO v_riparian_count
  FROM riparian_zones
  WHERE county ILIKE '%' || p_county_name || '%';

  v_total := v_elc_count + v_gazette_count + v_riparian_count;

  -- Update registry_status
  UPDATE registry_status
  SET last_scan_at = NOW(),
      scan_record_count = v_total
  WHERE county_name = p_county_name;

  -- Return structured response
  RETURN jsonb_build_object(
    'county', p_county_name,
    'elc_cases', v_elc_count,
    'gazette_notices', v_gazette_count,
    'riparian_zones', v_riparian_count,
    'total_records', v_total,
    'last_scan_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION scan_county_registry(TEXT) TO anon, authenticated;

-- ── 8. Weekly scan function (called by cron) ──────────────

CREATE OR REPLACE FUNCTION run_weekly_county_scan()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_county RECORD;
  v_result JSONB;
  v_results JSONB := '[]'::JSONB;
  v_total_counties INTEGER := 0;
  v_total_records INTEGER := 0;
BEGIN
  FOR v_county IN
    SELECT county_name FROM registry_status
    WHERE cron_active = TRUE AND ardhisasa_live = TRUE
  LOOP
    v_result := scan_county_registry(v_county.county_name);
    v_results := v_results || jsonb_build_array(v_result);
    v_total_counties := v_total_counties + 1;
    v_total_records := v_total_records + COALESCE((v_result->>'total_records')::INTEGER, 0);
  END LOOP;

  -- Log to audit_log
  INSERT INTO audit_log (event_type, entity, note, metadata)
  VALUES (
    'weekly_scan_complete',
    'cron',
    format('Weekly scan complete across %s live counties — %s records', v_total_counties, v_total_records),
    jsonb_build_object(
      'counties_scanned', v_total_counties,
      'total_records', v_total_records,
      'results', v_results,
      'run_at', NOW()
    )
  );

  RETURN jsonb_build_object(
    'counties_scanned', v_total_counties,
    'total_records', v_total_records,
    'results', v_results,
    'run_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION run_weekly_county_scan() TO service_role;

-- ── 9. Live coverage stats function ────────────────────────

CREATE OR REPLACE FUNCTION get_coverage_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_elc INTEGER;
  v_gazette INTEGER;
  v_riparian INTEGER;
  v_road INTEGER;
  v_counties_live INTEGER;
  v_counties_watch INTEGER;
  v_last_updated TIMESTAMPTZ;
BEGIN
  SELECT COUNT(*) INTO v_elc FROM elc_cases;
  SELECT COUNT(*) INTO v_gazette FROM gazette_notices;
  SELECT COUNT(*) INTO v_riparian FROM riparian_zones;
  SELECT COUNT(*) INTO v_road FROM road_reserves;
  SELECT COUNT(*) INTO v_counties_live FROM registry_status WHERE ardhisasa_live = TRUE;
  SELECT COUNT(*) INTO v_counties_watch FROM registry_status WHERE notes ILIKE '%Phase 2%';
  SELECT MAX(updated_at) INTO v_last_updated FROM registry_status;

  RETURN jsonb_build_object(
    'elc_cases', v_elc,
    'gazette_notices', v_gazette,
    'riparian_zones', v_riparian,
    'road_reserves', v_road,
    'counties_live', v_counties_live,
    'counties_watch', v_counties_watch,
    'total_records', v_elc + v_gazette + v_riparian + v_road,
    'last_updated', v_last_updated
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_coverage_stats() TO anon, authenticated;

-- ── 10. Weekly cron job (requires pg_cron extension) ──────
-- Uncomment after enabling pg_cron in Supabase dashboard
-- Supabase: Database > Extensions > enable pg_cron

-- SELECT cron.schedule(
--   'weekly-county-scan',
--   '0 3 * * 1',  -- Monday 03:00 UTC = 06:00 EAT (Nairobi)
--   $$ SELECT run_weekly_county_scan(); $$
-- );
