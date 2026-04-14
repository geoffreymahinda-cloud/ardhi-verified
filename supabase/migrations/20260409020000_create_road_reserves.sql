-- Road reserves table — Kenya classified road network
CREATE TABLE IF NOT EXISTS road_reserves (
    id SERIAL PRIMARY KEY,
    road_name TEXT NOT NULL,
    road_number TEXT,
    road_class TEXT,
    road_category TEXT,
    route_description TEXT,
    counties JSONB DEFAULT '[]'::jsonb,
    region TEXT,
    road_length_km NUMERIC,
    reserve_width_metres NUMERIC DEFAULT 15,
    geometry JSONB,
    source TEXT DEFAULT 'kenha',
    source_url TEXT,
    scraped_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(road_name, source)
);

-- Indexes for HatiScan queries
CREATE INDEX IF NOT EXISTS idx_road_reserves_name_trgm
    ON road_reserves USING GIN (road_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_road_reserves_route_trgm
    ON road_reserves USING GIN (route_description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_road_reserves_counties_gin
    ON road_reserves USING GIN (counties jsonb_ops);

CREATE INDEX IF NOT EXISTS idx_road_reserves_class
    ON road_reserves (road_class);

-- Enable RLS
ALTER TABLE road_reserves ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "Public read access" ON road_reserves;
CREATE POLICY "Public read access" ON road_reserves
    FOR SELECT USING (true);

-- Service role write access
DROP POLICY IF EXISTS "Service role write access" ON road_reserves;
CREATE POLICY "Service role write access" ON road_reserves
    FOR ALL USING (auth.role() = 'service_role');
