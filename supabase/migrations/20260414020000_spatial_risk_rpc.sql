-- ============================================================================
-- Spatial Risk RPC Functions for HatiScan
-- ============================================================================
-- These functions power spatial risk detection in HatiScan scans.
-- They take a county name and return overlapping/nearby hazard zones,
-- enabling risk detection without requiring parcel-level geometry.
--
-- When parcel geometry is available (future), these can be upgraded
-- to use ST_Intersects against the actual parcel polygon.
-- ============================================================================

-- 1. Get all spatial risks for a county
--    Returns a unified view of all hazard layers in a given county.
CREATE OR REPLACE FUNCTION get_spatial_risks_by_county(p_county TEXT)
RETURNS TABLE (
    risk_type TEXT,
    feature_name TEXT,
    severity TEXT,
    legal_basis TEXT,
    details JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Road reserves in county
    RETURN QUERY
    SELECT
        'road_reserve'::TEXT AS risk_type,
        rr.road_name AS feature_name,
        CASE rr.road_class
            WHEN 'A' THEN 'high'
            WHEN 'B' THEN 'high'
            WHEN 'C' THEN 'medium'
            ELSE 'low'
        END AS severity,
        'Kenya Roads Act — ' || rr.reserve_width_metres || 'm reserve each side'::TEXT AS legal_basis,
        jsonb_build_object(
            'road_class', rr.road_class,
            'road_number', rr.road_number,
            'reserve_width_metres', rr.reserve_width_metres,
            'road_category', rr.road_category
        ) AS details
    FROM road_reserves rr
    WHERE rr.geom IS NOT NULL
      AND EXISTS (
          SELECT 1 FROM parcels p
          WHERE p.tenure_type = 'administrative_boundary'
            AND p.county_district ILIKE p_county
            AND ST_Intersects(rr.geom, p.geom)
      )
    LIMIT 20;

    -- Protected zones in county
    RETURN QUERY
    SELECT
        'protected_zone'::TEXT,
        pz.name,
        CASE pz.designation
            WHEN 'national_park' THEN 'critical'
            WHEN 'strict_nature_reserve' THEN 'critical'
            WHEN 'forest' THEN 'high'
            WHEN 'nature_reserve' THEN 'high'
            WHEN 'marine_reserve' THEN 'high'
            ELSE 'medium'
        END,
        'Wildlife Conservation & Management Act / Forest Conservation Act 2016'::TEXT,
        jsonb_build_object(
            'designation', pz.designation,
            'area_hectares', pz.area_hectares,
            'source', pz.source
        )
    FROM protected_zones pz
    WHERE pz.county ILIKE p_county
      AND pz.geom IS NOT NULL
    LIMIT 20;

    -- Flood zones in county
    RETURN QUERY
    SELECT
        'flood_zone'::TEXT,
        COALESCE(fz.name, 'Flood Zone (' || fz.zone_type || ')'),
        fz.risk_level,
        'National Disaster Management Authority'::TEXT,
        jsonb_build_object(
            'zone_type', fz.zone_type,
            'return_period', fz.return_period,
            'source', fz.source
        )
    FROM flood_zones fz
    WHERE fz.county ILIKE p_county
      AND fz.geom IS NOT NULL
    LIMIT 10;

    -- Forest reserves in county
    RETURN QUERY
    SELECT
        'forest_reserve'::TEXT,
        fr.name,
        'high'::TEXT,
        'Forest Conservation and Management Act 2016 — ' || COALESCE(fr.gazette_ref, 'gazetted')::TEXT,
        jsonb_build_object(
            'gazette_ref', fr.gazette_ref,
            'area_hectares', fr.area_hectares,
            'region', fr.region
        )
    FROM forest_reserves fr
    WHERE fr.county ILIKE p_county
    LIMIT 20;

    -- Riparian zones in county (summary — top features only)
    RETURN QUERY
    SELECT
        'riparian_zone'::TEXT,
        rz.name,
        CASE rz.water_type
            WHEN 'river' THEN 'medium'
            WHEN 'lake' THEN 'high'
            WHEN 'wetland' THEN 'high'
            WHEN 'ocean' THEN 'high'
            ELSE 'low'
        END,
        'Kenya Water Act 2016 — ' || rz.buffer_metres || 'm riparian buffer'::TEXT,
        jsonb_build_object(
            'water_type', rz.water_type,
            'buffer_metres', rz.buffer_metres,
            'source', rz.source
        )
    FROM riparian_zones rz
    WHERE rz.county ILIKE p_county
      AND rz.geom IS NOT NULL
    LIMIT 20;
END;
$$;

-- 2. Quick county risk summary — counts per risk type
--    Used by HatiScan for the overview before detailed drill-down.
CREATE OR REPLACE FUNCTION get_county_risk_summary(p_county TEXT)
RETURNS TABLE (
    risk_type TEXT,
    feature_count BIGINT,
    highest_severity TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.risk_type,
        COUNT(*) AS feature_count,
        (ARRAY_AGG(r.severity ORDER BY
            CASE r.severity
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
                ELSE 5
            END
        ))[1] AS highest_severity
    FROM get_spatial_risks_by_county(p_county) r
    GROUP BY r.risk_type;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_spatial_risks_by_county(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_county_risk_summary(TEXT) TO anon, authenticated, service_role;
