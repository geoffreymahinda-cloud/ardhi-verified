-- ============================================================================
-- Parcel-Level Spatial Analysis RPC
-- ============================================================================
-- Takes a WKT polygon (drawn by user or extracted from survey plan)
-- and runs ST_Intersects against every spatial risk layer.
-- Returns precise overlap areas, percentages, and distances.
-- ============================================================================

CREATE OR REPLACE FUNCTION analyse_parcel_spatial_risks(
    p_wkt TEXT,
    p_srid INTEGER DEFAULT 4326
)
RETURNS TABLE (
    risk_type TEXT,
    feature_name TEXT,
    severity TEXT,
    legal_basis TEXT,
    overlap_sqm FLOAT,
    overlap_percentage FLOAT,
    distance_metres FLOAT,
    details JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_parcel GEOMETRY;
    v_parcel_area FLOAT;
BEGIN
    -- Parse the user-drawn polygon
    v_parcel := ST_SetSRID(ST_GeomFromText(p_wkt), p_srid);
    -- Area in sq metres (approximate using geography cast)
    v_parcel_area := ST_Area(v_parcel::geography);

    -- ── Road Reserves ──────────────────────────────────────────────────
    RETURN QUERY
    SELECT
        'road_reserve'::TEXT,
        rr.road_name,
        CASE rr.road_class
            WHEN 'A' THEN 'critical'
            WHEN 'B' THEN 'high'
            WHEN 'C' THEN 'medium'
            ELSE 'low'
        END,
        ('Kenya Roads Act — ' || rr.reserve_width_metres || 'm reserve each side')::TEXT,
        ST_Area(ST_Intersection(v_parcel, ST_Buffer(rr.geom::geography, rr.reserve_width_metres)::geometry)::geography)::FLOAT,
        CASE WHEN v_parcel_area > 0
            THEN (ST_Area(ST_Intersection(v_parcel, ST_Buffer(rr.geom::geography, rr.reserve_width_metres)::geometry)::geography) / v_parcel_area * 100)::FLOAT
            ELSE 0
        END,
        ST_Distance(v_parcel::geography, rr.geom::geography)::FLOAT,
        jsonb_build_object(
            'road_class', rr.road_class,
            'road_number', rr.road_number,
            'reserve_width_metres', rr.reserve_width_metres
        )
    FROM road_reserves rr
    WHERE rr.geom IS NOT NULL
      AND ST_DWithin(v_parcel::geography, rr.geom::geography, 500) -- within 500m
    ORDER BY ST_Distance(v_parcel::geography, rr.geom::geography)
    LIMIT 10;

    -- ── Protected Zones ────────────────────────────────────────────────
    RETURN QUERY
    SELECT
        'protected_zone'::TEXT,
        pz.name,
        CASE pz.designation
            WHEN 'national_park' THEN 'critical'
            WHEN 'strict_nature_reserve' THEN 'critical'
            WHEN 'forest' THEN 'high'
            WHEN 'nature_reserve' THEN 'high'
            ELSE 'medium'
        END,
        'Wildlife Conservation & Management Act'::TEXT,
        CASE WHEN ST_Intersects(v_parcel, pz.geom)
            THEN ST_Area(ST_Intersection(v_parcel, pz.geom)::geography)::FLOAT
            ELSE 0
        END,
        CASE WHEN v_parcel_area > 0 AND ST_Intersects(v_parcel, pz.geom)
            THEN (ST_Area(ST_Intersection(v_parcel, pz.geom)::geography) / v_parcel_area * 100)::FLOAT
            ELSE 0
        END,
        ST_Distance(v_parcel::geography, pz.geom::geography)::FLOAT,
        jsonb_build_object(
            'designation', pz.designation,
            'area_hectares', pz.area_hectares,
            'county', pz.county
        )
    FROM protected_zones pz
    WHERE pz.geom IS NOT NULL
      AND ST_DWithin(v_parcel::geography, pz.geom::geography, 2000)
    ORDER BY ST_Distance(v_parcel::geography, pz.geom::geography)
    LIMIT 10;

    -- ── Flood Zones ────────────────────────────────────────────────────
    RETURN QUERY
    SELECT
        'flood_zone'::TEXT,
        COALESCE(fz.name, 'Flood Zone (' || fz.zone_type || ')'),
        fz.risk_level,
        'National Disaster Management Authority'::TEXT,
        CASE WHEN ST_Intersects(v_parcel, fz.geom)
            THEN ST_Area(ST_Intersection(v_parcel, fz.geom)::geography)::FLOAT
            ELSE 0
        END,
        CASE WHEN v_parcel_area > 0 AND ST_Intersects(v_parcel, fz.geom)
            THEN (ST_Area(ST_Intersection(v_parcel, fz.geom)::geography) / v_parcel_area * 100)::FLOAT
            ELSE 0
        END,
        ST_Distance(v_parcel::geography, fz.geom::geography)::FLOAT,
        jsonb_build_object(
            'zone_type', fz.zone_type,
            'county', fz.county
        )
    FROM flood_zones fz
    WHERE fz.geom IS NOT NULL
      AND ST_DWithin(v_parcel::geography, fz.geom::geography, 5000)
    ORDER BY ST_Distance(v_parcel::geography, fz.geom::geography)
    LIMIT 10;

    -- ── Riparian Zones ─────────────────────────────────────────────────
    RETURN QUERY
    SELECT
        'riparian_zone'::TEXT,
        rz.name,
        CASE rz.water_type
            WHEN 'lake' THEN 'high'
            WHEN 'ocean' THEN 'high'
            WHEN 'wetland' THEN 'high'
            WHEN 'river' THEN 'medium'
            ELSE 'low'
        END,
        ('Kenya Water Act 2016 — ' || rz.buffer_metres || 'm riparian buffer')::TEXT,
        CASE WHEN ST_Intersects(v_parcel, rz.geom)
            THEN ST_Area(ST_Intersection(v_parcel, rz.geom)::geography)::FLOAT
            ELSE 0
        END,
        CASE WHEN v_parcel_area > 0 AND ST_Intersects(v_parcel, rz.geom)
            THEN (ST_Area(ST_Intersection(v_parcel, rz.geom)::geography) / v_parcel_area * 100)::FLOAT
            ELSE 0
        END,
        ST_Distance(v_parcel::geography, rz.geom::geography)::FLOAT,
        jsonb_build_object(
            'water_type', rz.water_type,
            'buffer_metres', rz.buffer_metres,
            'county', rz.county
        )
    FROM riparian_zones rz
    WHERE rz.geom IS NOT NULL
      AND ST_DWithin(v_parcel::geography, rz.geom::geography, 500)
    ORDER BY ST_Distance(v_parcel::geography, rz.geom::geography)
    LIMIT 10;

    -- ── Forest Reserves ────────────────────────────────────────────────
    RETURN QUERY
    SELECT
        'forest_reserve'::TEXT,
        fr.name,
        'high'::TEXT,
        ('Forest Conservation Act 2016 — ' || COALESCE(fr.gazette_ref, 'gazetted'))::TEXT,
        CASE WHEN ST_Intersects(v_parcel, fr.geom)
            THEN ST_Area(ST_Intersection(v_parcel, fr.geom)::geography)::FLOAT
            ELSE 0
        END,
        CASE WHEN v_parcel_area > 0 AND ST_Intersects(v_parcel, fr.geom)
            THEN (ST_Area(ST_Intersection(v_parcel, fr.geom)::geography) / v_parcel_area * 100)::FLOAT
            ELSE 0
        END,
        ST_Distance(v_parcel::geography, fr.geom::geography)::FLOAT,
        jsonb_build_object(
            'gazette_ref', fr.gazette_ref,
            'county', fr.county
        )
    FROM forest_reserves fr
    WHERE fr.geom IS NOT NULL
      AND ST_DWithin(v_parcel::geography, fr.geom::geography, 2000)
    ORDER BY ST_Distance(v_parcel::geography, fr.geom::geography)
    LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION analyse_parcel_spatial_risks(TEXT, INTEGER) TO anon, authenticated, service_role;
