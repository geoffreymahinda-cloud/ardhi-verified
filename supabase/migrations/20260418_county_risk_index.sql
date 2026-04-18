-- ═══════════════════════════════════════════════════════════════════
-- County Risk Index — Materialized View + Trust Score Fix
--
-- Two changes in one migration:
--
--   (a) CREATE MATERIALIZED VIEW mv_county_risk_index
--       — 5-component composite risk score per county (0-100)
--       — log-scaled density normalization per 1,000 km²
--       — self-calibrating against the riskiest county
--
--   (b) REPLACE calculate_trust_score() with corrected ELC weighting
--       — the old function used ILIKE '%active%', '%against%',
--         '%guilty%', '%favour of plaintiff%' to classify ELC case
--         outcomes, but the actual outcome column in production only
--         contains document-type labels: "Ruling" (interlocutory,
--         74% of cases) and "Judgment" (final determination, 26%).
--         The old patterns NEVER matched either value, so every ELC
--         case fell into the catch-all -10 point deduction regardless
--         of its actual risk signal.
--       — new weighting uses document-type classification:
--           Ruling (active dispute)     → -20 points
--           Dismissed/Struck/Withdrawn  → -5 points (claim failed)
--           Judgment (resolved)         → -10 points
--           Empty/unknown               → -15 points (conservative)
--
-- Future sprint (queued, not built here):
--   AI enrichment pass over elc_judgements.full_text to classify each
--   case as TITLE_UPHELD / TITLE_INVALIDATED / DISMISSED / PROCEDURAL
--   / UNCLEAR. When that enrichment ships, both this view and the
--   trust score function should be updated to use the richer signal.
-- ═══════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────
-- PART A: County Risk Index Materialized View
-- ─────────────────────────────────────────────────────────────────

DROP MATERIALIZED VIEW IF EXISTS public.mv_county_risk_index;

CREATE MATERIALIZED VIEW public.mv_county_risk_index AS

WITH county_base AS (
  -- Canonical list of 47 counties with area for density normalization.
  SELECT
    COALESCE(ci.county_name, rs.county_name)        AS county_name,
    COALESCE(ci.county_code, rs.county_code::text)   AS county_code,
    GREATEST(COALESCE(ci.area_sqkm, 500), 1)         AS area_sqkm,
    COALESCE(ci.population, 0)                        AS population,
    COALESCE(ci.center_lat, 0)                        AS center_lat,
    COALESCE(ci.center_lon, 0)                        AS center_lon
  FROM public.registry_status rs
  LEFT JOIN public.county_intelligence ci
    ON LOWER(ci.county_name) = LOWER(rs.county_name)
),

-- ── Component 1: Legal dispute density (weight 25) ────────────────
-- Uses document-type weighting (NOT the broken active/against patterns).
-- "Ruling" = interlocutory = active dispute = higher risk.
-- "Judgment" = final = resolved = moderate risk.
-- "Dismissed" / "Struck Out" / "Withdrawn" = claim failed = low risk.
elc_by_county AS (
  SELECT
    cb.county_name,
    SUM(
      CASE
        WHEN ec.outcome ILIKE '%ruling%'                    THEN 2.0
        WHEN ec.outcome ILIKE '%dismiss%'
          OR ec.outcome ILIKE '%struck%'
          OR ec.outcome ILIKE '%withdrawn%'                 THEN 0.5
        WHEN ec.outcome ILIKE '%judgment%'
          OR ec.outcome ILIKE '%judgement%'                  THEN 1.0
        WHEN ec.outcome IS NULL OR TRIM(ec.outcome) = ''    THEN 1.5
        ELSE 1.0
      END
    ) AS weighted_cases,
    COUNT(ec.id) AS raw_count
  FROM county_base cb
  LEFT JOIN public.elc_cases ec
    ON ec.court_station ILIKE '%' || cb.county_name || '%'
  GROUP BY cb.county_name
),

-- ── Component 2: Gazette alert density (weight 25) ────────────────
gazette_by_county AS (
  SELECT
    cb.county_name,
    SUM(
      CASE gn.alert_level
        WHEN 'critical' THEN 3.0
        WHEN 'high'     THEN 2.0
        WHEN 'medium'   THEN 1.0
        ELSE 0
      END
    ) AS weighted_notices,
    COUNT(gn.id) AS raw_count
  FROM county_base cb
  LEFT JOIN public.gazette_notices gn
    ON LOWER(gn.county) = LOWER(cb.county_name)
  GROUP BY cb.county_name
),

-- ── Component 3: Compulsory acquisition pressure (weight 15) ──────
nlc_by_county AS (
  SELECT
    cb.county_name,
    COUNT(na.id)::numeric AS nlc_count
  FROM county_base cb
  LEFT JOIN public.nlc_acquisitions na
    ON LOWER(na.county) = LOWER(cb.county_name)
  GROUP BY cb.county_name
),

-- ── Component 4: Spatial risk feature count (weight 20) ───────────
spatial_by_county AS (
  SELECT
    cb.county_name,
    COALESCE(rr.weighted, 0)
      + COALESCE(fz.weighted, 0)
      + COALESCE(rz.weighted, 0)
      + COALESCE(fr.weighted, 0)
      + COALESCE(pz.weighted, 0) AS weighted_features,
    COALESCE(rr.cnt, 0) + COALESCE(fz.cnt, 0) + COALESCE(rz.cnt, 0)
      + COALESCE(fr.cnt, 0) + COALESCE(pz.cnt, 0) AS raw_count
  FROM county_base cb
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::numeric AS cnt,
      SUM(CASE road_class WHEN 'A' THEN 3 WHEN 'B' THEN 2 ELSE 1 END) AS weighted
    FROM public.road_reserves
    WHERE counties::text ILIKE '%' || cb.county_name || '%'
  ) rr ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::numeric AS cnt,
      SUM(CASE risk_level WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END) AS weighted
    FROM public.flood_zones
    WHERE LOWER(county) = LOWER(cb.county_name)
  ) fz ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::numeric AS cnt,
      SUM(CASE water_type
        WHEN 'lake' THEN 3 WHEN 'ocean' THEN 3 WHEN 'wetland' THEN 3
        WHEN 'river' THEN 2 ELSE 1
      END) AS weighted
    FROM public.riparian_zones
    WHERE LOWER(county) = LOWER(cb.county_name)
  ) rz ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::numeric AS cnt, COUNT(*)::numeric * 2 AS weighted
    FROM public.forest_reserves
    WHERE LOWER(county) = LOWER(cb.county_name)
  ) fr ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::numeric AS cnt,
      SUM(CASE designation
        WHEN 'national_park' THEN 3 WHEN 'strict_nature_reserve' THEN 3
        WHEN 'forest' THEN 2 WHEN 'nature_reserve' THEN 2
        ELSE 1
      END) AS weighted
    FROM public.protected_zones
    WHERE LOWER(county) = LOWER(cb.county_name)
  ) pz ON TRUE
),

-- ── Component 5: Community concern index (weight 15) ──────────────
flags_by_county AS (
  SELECT
    cb.county_name,
    SUM(
      CASE
        WHEN cf.status = 'verified' AND COALESCE(cf.severity, 'medium') = 'high' THEN 3.0
        WHEN cf.status = 'verified' THEN 2.0
        ELSE 0.5
      END
    ) AS weighted_flags,
    COUNT(cf.id) AS raw_count
  FROM county_base cb
  LEFT JOIN public.community_flags cf
    ON LOWER(cf.county) = LOWER(cb.county_name)
  GROUP BY cb.county_name
),

-- ── Density calculation (per 1,000 km²) ──────────────────────────
densities AS (
  SELECT
    cb.county_name,
    cb.county_code,
    cb.area_sqkm,
    cb.population,
    cb.center_lat,
    cb.center_lon,

    COALESCE(ec.weighted_cases, 0) / cb.area_sqkm * 1000    AS elc_density,
    COALESCE(gc.weighted_notices, 0) / cb.area_sqkm * 1000   AS gazette_density,
    COALESCE(nc.nlc_count, 0) / cb.area_sqkm * 1000          AS nlc_density,
    COALESCE(sc.weighted_features, 0) / cb.area_sqkm * 1000  AS spatial_density,
    COALESCE(fc.weighted_flags, 0) / cb.area_sqkm * 1000     AS flags_density,

    -- Raw counts for drill-down display
    COALESCE(ec.raw_count, 0)::int    AS elc_case_count,
    COALESCE(gc.raw_count, 0)::int    AS gazette_notice_count,
    COALESCE(nc.nlc_count, 0)::int    AS nlc_acquisition_count,
    COALESCE(sc.raw_count, 0)::int    AS spatial_feature_count,
    COALESCE(fc.raw_count, 0)::int    AS community_flag_count

  FROM county_base cb
  LEFT JOIN elc_by_county ec    ON ec.county_name = cb.county_name
  LEFT JOIN gazette_by_county gc ON gc.county_name = cb.county_name
  LEFT JOIN nlc_by_county nc    ON nc.county_name = cb.county_name
  LEFT JOIN spatial_by_county sc ON sc.county_name = cb.county_name
  LEFT JOIN flags_by_county fc  ON fc.county_name = cb.county_name
),

-- ── Log-scaled component scores ──────────────────────────────────
scored AS (
  SELECT
    d.*,

    CASE WHEN MAX(LN(1 + d.elc_density)) OVER () > 0
      THEN 25.0 * LN(1 + d.elc_density) / MAX(LN(1 + d.elc_density)) OVER ()
      ELSE 0 END AS score_elc,

    CASE WHEN MAX(LN(1 + d.gazette_density)) OVER () > 0
      THEN 25.0 * LN(1 + d.gazette_density) / MAX(LN(1 + d.gazette_density)) OVER ()
      ELSE 0 END AS score_gazette,

    CASE WHEN MAX(LN(1 + d.nlc_density)) OVER () > 0
      THEN 15.0 * LN(1 + d.nlc_density) / MAX(LN(1 + d.nlc_density)) OVER ()
      ELSE 0 END AS score_nlc,

    CASE WHEN MAX(LN(1 + d.spatial_density)) OVER () > 0
      THEN 20.0 * LN(1 + d.spatial_density) / MAX(LN(1 + d.spatial_density)) OVER ()
      ELSE 0 END AS score_spatial,

    CASE WHEN MAX(LN(1 + d.flags_density)) OVER () > 0
      THEN 15.0 * LN(1 + d.flags_density) / MAX(LN(1 + d.flags_density)) OVER ()
      ELSE 0 END AS score_flags

  FROM densities d
)

SELECT
  s.county_name,
  s.county_code,
  s.area_sqkm,
  s.population,
  s.center_lat,
  s.center_lon,

  ROUND(s.score_elc::numeric, 1)       AS score_legal_disputes,
  ROUND(s.score_gazette::numeric, 1)   AS score_gazette_alerts,
  ROUND(s.score_nlc::numeric, 1)       AS score_acquisition_pressure,
  ROUND(s.score_spatial::numeric, 1)   AS score_spatial_risk,
  ROUND(s.score_flags::numeric, 1)     AS score_community_concern,

  ROUND((
    s.score_elc + s.score_gazette + s.score_nlc
    + s.score_spatial + s.score_flags
  )::numeric, 1) AS composite_score,

  CASE
    WHEN (s.score_elc + s.score_gazette + s.score_nlc
          + s.score_spatial + s.score_flags) >= 80 THEN 'CRITICAL'
    WHEN (s.score_elc + s.score_gazette + s.score_nlc
          + s.score_spatial + s.score_flags) >= 60 THEN 'HIGH'
    WHEN (s.score_elc + s.score_gazette + s.score_nlc
          + s.score_spatial + s.score_flags) >= 40 THEN 'ELEVATED'
    WHEN (s.score_elc + s.score_gazette + s.score_nlc
          + s.score_spatial + s.score_flags) >= 20 THEN 'MODERATE'
    ELSE 'LOW'
  END AS risk_band,

  s.elc_case_count,
  s.gazette_notice_count,
  s.nlc_acquisition_count,
  s.spatial_feature_count,
  s.community_flag_count,

  RANK() OVER (ORDER BY (
    s.score_elc + s.score_gazette + s.score_nlc
    + s.score_spatial + s.score_flags
  ) DESC) AS risk_rank,

  NOW() AS computed_at

FROM scored s
ORDER BY composite_score DESC;

-- Indexes for API and CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_county_risk_county_name
  ON public.mv_county_risk_index (county_name);
CREATE INDEX IF NOT EXISTS idx_mv_county_risk_score
  ON public.mv_county_risk_index (composite_score DESC);


-- ─────────────────────────────────────────────────────────────────
-- PART B: Fix calculate_trust_score() ELC outcome weighting
--
-- BREAKING CHANGE LOG:
--   The old function used these ILIKE patterns to classify ELC cases:
--     '%active%', '%ongoing%', '%pending%' → -25 pts
--     '%against%', '%guilty%', '%favour of plaintiff%' → -20 pts
--     else → -10 pts
--
--   These patterns were BROKEN against production data. The outcome
--   column in public.elc_cases only contains document-type labels:
--     "Ruling" (74% — interlocutory, case still active)
--     "Judgment" (26% — final determination)
--
--   None of the ILIKE patterns ever matched either value. Every ELC
--   case in every HatiScan report scored the catch-all -10 deduction
--   regardless of its actual risk signal.
--
--   New weighting uses document-type classification:
--     "Ruling" (active dispute)               → -20 pts
--     "Dismissed"/"Struck Out"/"Withdrawn"     → -5 pts
--     "Judgment" (resolved, who-won unknown)   → -10 pts
--     Empty/unknown                            → -15 pts (conservative)
--     Other                                    → -10 pts (catch-all)
--
--   Queued for future sprint: AI enrichment of elc_judgements.full_text
--   to classify TITLE_UPHELD vs TITLE_INVALIDATED, which would enable
--   a more granular weighting (upheld → -3, invalidated → -25).
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calculate_trust_score(p_parcel_reference TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score INTEGER := 100;
  v_rating TEXT;
  v_elc_count INTEGER := 0;
  v_gazette_count INTEGER := 0;
  v_flags_count INTEGER := 0;
  v_breakdown JSONB := '[]'::JSONB;
  v_row RECORD;
  v_deduction INTEGER;
  v_reason TEXT;
BEGIN

  -- ── 1. ELC Cases ──────────────────────────────────────────────
  -- FIXED: Uses document-type weighting instead of the broken
  -- ILIKE patterns that never matched production data.
  FOR v_row IN
    SELECT case_number, outcome, parties
    FROM elc_cases
    WHERE parcel_reference::jsonb @> to_jsonb(p_parcel_reference)
       OR parcel_reference::jsonb @> jsonb_build_array(p_parcel_reference)
       OR parcel_reference ILIKE '%' || p_parcel_reference || '%'
  LOOP
    v_elc_count := v_elc_count + 1;

    IF v_row.outcome ILIKE '%ruling%' THEN
      -- Interlocutory decision: case is still being litigated = active dispute
      v_deduction := 20;
      v_reason := format('Active dispute (ruling) in case %s — %s',
                         v_row.case_number, LEFT(v_row.parties, 80));
    ELSIF v_row.outcome ILIKE '%dismiss%'
       OR v_row.outcome ILIKE '%struck%'
       OR v_row.outcome ILIKE '%withdrawn%' THEN
      -- Claim failed or was withdrawn — low risk signal
      v_deduction := 5;
      v_reason := format('Dismissed/withdrawn case %s — claim did not succeed',
                         v_row.case_number);
    ELSIF v_row.outcome ILIKE '%judgment%'
       OR v_row.outcome ILIKE '%judgement%' THEN
      -- Final determination — resolved but who-won is unknown from this field
      v_deduction := 10;
      v_reason := format('Concluded case %s (judgment issued)',
                         v_row.case_number);
    ELSIF v_row.outcome IS NULL OR TRIM(v_row.outcome) = '' THEN
      -- No outcome recorded — treat conservatively
      v_deduction := 15;
      v_reason := format('Case %s — outcome not yet recorded (conservative)',
                         v_row.case_number);
    ELSE
      -- Catch-all for any other outcome text
      v_deduction := 10;
      v_reason := format('Case %s (outcome: %s)',
                         v_row.case_number, LEFT(v_row.outcome, 40));
    END IF;

    v_score := v_score - v_deduction;
    v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
      'source', 'elc_case',
      'reason', v_reason,
      'deduction', -v_deduction
    ));
  END LOOP;

  -- ── 2. Gazette Notices ────────────────────────────────────────
  -- (unchanged from previous version)
  FOR v_row IN
    SELECT id, notice_type, alert_level, description
    FROM gazette_notices
    WHERE parcel_reference::text ILIKE '%' || p_parcel_reference || '%'
  LOOP
    v_gazette_count := v_gazette_count + 1;
    IF v_row.alert_level = 'critical' THEN
      v_score := v_score - 30;
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
        'source', 'gazette_notice',
        'reason', format('Critical gazette notice: %s',
          LEFT(COALESCE(v_row.description, v_row.notice_type), 80)),
        'deduction', -30
      ));
    ELSIF v_row.alert_level = 'high' THEN
      v_score := v_score - 20;
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
        'source', 'gazette_notice',
        'reason', format('High-alert gazette notice: %s',
          LEFT(COALESCE(v_row.description, v_row.notice_type), 80)),
        'deduction', -20
      ));
    ELSIF v_row.alert_level = 'medium' THEN
      v_score := v_score - 10;
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
        'source', 'gazette_notice',
        'reason', format('Medium-alert gazette notice: %s',
          LEFT(COALESCE(v_row.description, v_row.notice_type), 80)),
        'deduction', -10
      ));
    END IF;
  END LOOP;

  -- ── 3. Community Flags ────────────────────────────────────────
  -- (unchanged from previous version)
  FOR v_row IN
    SELECT id, category, county, description, status,
           COALESCE(severity, 'medium') AS severity
    FROM community_flags
    WHERE location ILIKE '%' || p_parcel_reference || '%'
       OR description ILIKE '%' || p_parcel_reference || '%'
  LOOP
    v_flags_count := v_flags_count + 1;
    IF v_row.status = 'verified' AND v_row.severity = 'high' THEN
      v_score := v_score - 20;
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
        'source', 'community_flag',
        'reason', format('Verified high-severity flag: %s in %s',
          v_row.category, v_row.county),
        'deduction', -20
      ));
    ELSIF v_row.status = 'verified' AND v_row.severity = 'medium' THEN
      v_score := v_score - 10;
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
        'source', 'community_flag',
        'reason', format('Verified flag: %s in %s',
          v_row.category, v_row.county),
        'deduction', -10
      ));
    ELSE
      v_score := v_score - 5;
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
        'source', 'community_flag',
        'reason', format('Unverified flag: %s in %s',
          v_row.category, v_row.county),
        'deduction', -5
      ));
    END IF;
  END LOOP;

  -- ── 4. Clamp and rate ─────────────────────────────────────────
  IF v_score < 0 THEN v_score := 0; END IF;

  IF v_score >= 80 THEN v_rating := 'VERIFIED';
  ELSIF v_score >= 50 THEN v_rating := 'REVIEW REQUIRED';
  ELSIF v_score >= 20 THEN v_rating := 'HIGH RISK';
  ELSE v_rating := 'BLOCKED';
  END IF;

  RETURN jsonb_build_object(
    'score', v_score, 'rating', v_rating,
    'elc_cases_found', v_elc_count,
    'gazette_notices_found', v_gazette_count,
    'community_flags_found', v_flags_count,
    'last_calculated', NOW(),
    'breakdown', v_breakdown
  );
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_trust_score(TEXT) TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────────
-- Cron job for weekly refresh (requires pg_cron extension)
-- Uncomment and run manually if pg_cron is enabled:
--
--   SELECT cron.schedule(
--     'refresh-county-risk-index',
--     '0 3 * * 1',
--     'REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_county_risk_index'
--   );
-- ─────────────────────────────────────────────────────────────────
