-- ============================================================================
-- PostGIS Tables: Add missing columns for loader compatibility
-- Safe: only ADD COLUMN IF NOT EXISTS — never drops data
-- ============================================================================

-- flood_zones: add name, county, basin, metadata, scraped_at
ALTER TABLE flood_zones ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE flood_zones ADD COLUMN IF NOT EXISTS county TEXT;
ALTER TABLE flood_zones ADD COLUMN IF NOT EXISTS basin TEXT;
ALTER TABLE flood_zones ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE flood_zones ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_flood_zones_county
    ON flood_zones (county);

-- riparian_zones: ensure source_url column exists
ALTER TABLE riparian_zones ADD COLUMN IF NOT EXISTS source_url TEXT;

-- protected_zones: ensure geometry JSONB column won't conflict
-- (old loaders wrote metadata to the geometry column; new loaders skip it)

-- spatial_risk_results: add missing columns for HatiScan integration
ALTER TABLE spatial_risk_results ADD COLUMN IF NOT EXISTS parcel_id INTEGER
    REFERENCES parcels(id);
ALTER TABLE spatial_risk_results ADD COLUMN IF NOT EXISTS distance_metres FLOAT;
ALTER TABLE spatial_risk_results ADD COLUMN IF NOT EXISTS risk_feature_name TEXT;
ALTER TABLE spatial_risk_results ADD COLUMN IF NOT EXISTS risk_feature_id TEXT;
ALTER TABLE spatial_risk_results ADD COLUMN IF NOT EXISTS details JSONB;
