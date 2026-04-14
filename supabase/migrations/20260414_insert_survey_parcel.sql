-- RPC to insert a survey-extracted parcel with PostGIS geometry
-- Called by /api/hatiscan/survey-parse after Claude extracts coordinates

CREATE OR REPLACE FUNCTION insert_survey_parcel(
    p_ref TEXT,
    p_wkt TEXT,
    p_county TEXT DEFAULT NULL,
    p_area_ha FLOAT DEFAULT NULL,
    p_country TEXT DEFAULT 'Kenya'
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO parcels (parcel_reference, country, county_district, area_ha, tenure_type, geom)
    VALUES (
        p_ref,
        p_country,
        p_county,
        p_area_ha,
        'survey_extracted',
        ST_SetSRID(ST_GeomFromText(p_wkt), 4326)
    )
    ON CONFLICT (parcel_reference) DO UPDATE SET
        geom = ST_SetSRID(ST_GeomFromText(p_wkt), 4326),
        county_district = COALESCE(EXCLUDED.county_district, parcels.county_district),
        area_ha = COALESCE(EXCLUDED.area_ha, parcels.area_ha);
END;
$$;

GRANT EXECUTE ON FUNCTION insert_survey_parcel(TEXT, TEXT, TEXT, FLOAT, TEXT) TO service_role;
