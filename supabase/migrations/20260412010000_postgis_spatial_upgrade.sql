CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE road_reserves
    ADD COLUMN IF NOT EXISTS geom GEOMETRY(MULTILINESTRING, 4326);

ALTER TABLE riparian_zones
    ADD COLUMN IF NOT EXISTS geom GEOMETRY(POLYGON, 4326);

ALTER TABLE protected_zones
    ADD COLUMN IF NOT EXISTS geom GEOMETRY(MULTIPOLYGON, 4326);

CREATE TABLE IF NOT EXISTS parcels (
    id SERIAL PRIMARY KEY,
    parcel_reference TEXT UNIQUE NOT NULL,
    owner_name TEXT,
    country TEXT DEFAULT 'Kenya',
    county_district TEXT,
    land_use TEXT,
    area_ha FLOAT,
    tenure_type TEXT,
    hati_score INTEGER,
    geom GEOMETRY(POLYGON, 4326),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON parcels;
CREATE POLICY "Public read access" ON parcels
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role write access" ON parcels;
CREATE POLICY "Service role write access" ON parcels
    FOR ALL USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS flood_zones (
    id SERIAL PRIMARY KEY,
    zone_id TEXT,
    zone_type TEXT,
    risk_level TEXT,
    return_period TEXT,
    country TEXT DEFAULT 'Kenya',
    source TEXT,
    geom GEOMETRY(MULTIPOLYGON, 4326),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE flood_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON flood_zones;
CREATE POLICY "Public read access" ON flood_zones
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role write access" ON flood_zones;
CREATE POLICY "Service role write access" ON flood_zones
    FOR ALL USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS spatial_risk_results (
    id SERIAL PRIMARY KEY,
    parcel_reference TEXT NOT NULL,
    country TEXT DEFAULT 'Kenya',
    risk_type TEXT,
    zone_name TEXT,
    severity TEXT,
    overlap_area FLOAT,
    overlap_percentage FLOAT,
    legal_basis TEXT,
    recommended_action TEXT,
    geom_intersection GEOMETRY(POLYGON, 4326),
    analysed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE spatial_risk_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON spatial_risk_results;
CREATE POLICY "Public read access" ON spatial_risk_results
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role write access" ON spatial_risk_results;
CREATE POLICY "Service role write access" ON spatial_risk_results
    FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_road_reserves_geom
    ON road_reserves USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_riparian_zones_geom
    ON riparian_zones USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_protected_zones_geom
    ON protected_zones USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_parcels_geom
    ON parcels USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_flood_zones_geom
    ON flood_zones USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_spatial_risk_intersection_geom
    ON spatial_risk_results USING GIST (geom_intersection);

CREATE INDEX IF NOT EXISTS idx_parcels_reference
    ON parcels (parcel_reference);

CREATE INDEX IF NOT EXISTS idx_parcels_county
    ON parcels (county_district);

CREATE INDEX IF NOT EXISTS idx_flood_zones_risk
    ON flood_zones (risk_level);

CREATE INDEX IF NOT EXISTS idx_spatial_risk_parcel
    ON spatial_risk_results (parcel_reference);

CREATE INDEX IF NOT EXISTS idx_spatial_risk_type
    ON spatial_risk_results (risk_type);
