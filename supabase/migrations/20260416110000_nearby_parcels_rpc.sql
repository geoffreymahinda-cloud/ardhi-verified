-- ============================================================================
-- RPC: find_parcels_nearby
-- Returns parcels within a given radius (metres) of a lat/lng point.
-- Used by GET /api/parcel/nearby
-- ============================================================================

CREATE OR REPLACE FUNCTION find_parcels_nearby(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_m INTEGER DEFAULT 200
)
RETURNS TABLE (
    parcel_id INTEGER,
    parcel_reference TEXT,
    lr_number VARCHAR,
    block_number VARCHAR,
    county TEXT,
    area_sqm NUMERIC,
    confidence_score NUMERIC,
    data_source VARCHAR,
    distance_metres DOUBLE PRECISION
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_point GEOMETRY;
BEGIN
    v_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);

    RETURN QUERY
    SELECT
        p.id,
        p.parcel_reference,
        p.lr_number,
        p.block_number,
        p.county_district,
        p.area_sqm,
        p.confidence_score,
        p.data_source,
        ST_Distance(p.geom::geography, v_point::geography)::DOUBLE PRECISION AS distance_metres
    FROM parcels p
    WHERE p.geom IS NOT NULL
      AND ST_DWithin(p.geom::geography, v_point::geography, p_radius_m)
    ORDER BY ST_Distance(p.geom::geography, v_point::geography)
    LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION find_parcels_nearby(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER)
    TO anon, authenticated, service_role;
