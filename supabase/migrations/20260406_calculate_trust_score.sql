-- Calculate Trust Score for a given parcel reference
-- Queries elc_cases, gazette_notices, and community_flags
-- Returns a JSON object with score, rating, and breakdown

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
BEGIN

  -- ── 1. ELC Cases ──────────────────────────────────────────────
  FOR v_row IN
    SELECT case_number, outcome, parties
    FROM elc_cases
    WHERE parcel_reference @> to_jsonb(p_parcel_reference)
       OR parcel_reference @> jsonb_build_array(p_parcel_reference)
  LOOP
    v_elc_count := v_elc_count + 1;

    IF v_row.outcome ILIKE '%active%' OR v_row.outcome ILIKE '%ongoing%' OR v_row.outcome ILIKE '%pending%' THEN
      v_score := v_score - 25;
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
        'source', 'elc_case',
        'reason', format('Active/ongoing case %s — %s', v_row.case_number, LEFT(v_row.parties, 80)),
        'deduction', -25
      ));
    ELSIF v_row.outcome ILIKE '%against%' OR v_row.outcome ILIKE '%guilty%' OR v_row.outcome ILIKE '%favour of plaintiff%' THEN
      v_score := v_score - 20;
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
        'source', 'elc_case',
        'reason', format('Judgment against owner in case %s', v_row.case_number),
        'deduction', -20
      ));
    ELSE
      v_score := v_score - 10;
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
        'source', 'elc_case',
        'reason', format('Historical case %s (resolved)', v_row.case_number),
        'deduction', -10
      ));
    END IF;
  END LOOP;

  -- ── 2. Gazette Notices ────────────────────────────────────────
  FOR v_row IN
    SELECT id, notice_type, alert_level, description
    FROM gazette_notices
    WHERE parcel_reference @> to_jsonb(p_parcel_reference)
       OR parcel_reference @> jsonb_build_array(p_parcel_reference)
  LOOP
    v_gazette_count := v_gazette_count + 1;

    IF v_row.alert_level = 'critical' THEN
      v_score := v_score - 30;
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
        'source', 'gazette_notice',
        'reason', format('Critical gazette notice: %s', LEFT(COALESCE(v_row.description, v_row.notice_type), 80)),
        'deduction', -30
      ));
    ELSIF v_row.alert_level = 'high' THEN
      v_score := v_score - 20;
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
        'source', 'gazette_notice',
        'reason', format('High-alert gazette notice: %s', LEFT(COALESCE(v_row.description, v_row.notice_type), 80)),
        'deduction', -20
      ));
    ELSIF v_row.alert_level = 'medium' THEN
      v_score := v_score - 10;
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
        'source', 'gazette_notice',
        'reason', format('Medium-alert gazette notice: %s', LEFT(COALESCE(v_row.description, v_row.notice_type), 80)),
        'deduction', -10
      ));
    END IF;
  END LOOP;

  -- ── 3. Community Flags ────────────────────────────────────────
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
        'reason', format('Verified high-severity flag: %s in %s', v_row.category, v_row.county),
        'deduction', -20
      ));
    ELSIF v_row.status = 'verified' AND v_row.severity = 'medium' THEN
      v_score := v_score - 10;
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
        'source', 'community_flag',
        'reason', format('Verified flag: %s in %s', v_row.category, v_row.county),
        'deduction', -10
      ));
    ELSE
      v_score := v_score - 5;
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
        'source', 'community_flag',
        'reason', format('Unverified flag: %s in %s', v_row.category, v_row.county),
        'deduction', -5
      ));
    END IF;
  END LOOP;

  -- ── 4. Clamp score ────────────────────────────────────────────
  IF v_score < 0 THEN
    v_score := 0;
  END IF;

  -- ── 5. Determine rating ───────────────────────────────────────
  IF v_score >= 80 THEN
    v_rating := 'VERIFIED';
  ELSIF v_score >= 50 THEN
    v_rating := 'REVIEW REQUIRED';
  ELSIF v_score >= 20 THEN
    v_rating := 'HIGH RISK';
  ELSE
    v_rating := 'BLOCKED';
  END IF;

  -- ── 6. Return result ─────────────────────────────────────────
  RETURN jsonb_build_object(
    'score', v_score,
    'rating', v_rating,
    'elc_cases_found', v_elc_count,
    'gazette_notices_found', v_gazette_count,
    'community_flags_found', v_flags_count,
    'last_calculated', NOW(),
    'breakdown', v_breakdown
  );
END;
$$;

-- Allow anon/authenticated roles to call the function
GRANT EXECUTE ON FUNCTION calculate_trust_score(TEXT) TO anon, authenticated;
