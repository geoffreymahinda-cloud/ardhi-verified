
-- County intelligence table for geospatial data
CREATE TABLE IF NOT EXISTS county_intelligence (
    id SERIAL PRIMARY KEY,
    county_name TEXT NOT NULL UNIQUE,
    county_code TEXT NOT NULL UNIQUE,
    geometry JSONB NOT NULL,
    center_lat DOUBLE PRECISION,
    center_lon DOUBLE PRECISION,
    area_sqkm DOUBLE PRECISION,
    population INTEGER,
    avg_land_price_kes NUMERIC,
    infrastructure_score NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE county_intelligence ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access" ON county_intelligence
    FOR SELECT USING (true);

-- Only service role can insert/update
CREATE POLICY "Service role write access" ON county_intelligence
    FOR ALL USING (auth.role() = 'service_role');
