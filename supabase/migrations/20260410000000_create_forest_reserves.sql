-- Kenya gazetted forest reserves
CREATE TABLE IF NOT EXISTS forest_reserves (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    county TEXT,
    region TEXT,
    gazette_ref TEXT,
    boundary_description TEXT,
    source TEXT,
    source_url TEXT,
    area_hectares NUMERIC,
    geometry JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Search indexes
CREATE INDEX idx_forest_reserves_name_trgm
    ON forest_reserves USING GIN (name gin_trgm_ops);

CREATE INDEX idx_forest_reserves_county
    ON forest_reserves (county);

CREATE INDEX idx_forest_reserves_region
    ON forest_reserves (region);

CREATE UNIQUE INDEX idx_forest_reserves_name_unique
    ON forest_reserves (name);

-- Enable RLS
ALTER TABLE forest_reserves ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access" ON forest_reserves
    FOR SELECT USING (true);

-- Service role write access
CREATE POLICY "Service role write access" ON forest_reserves
    FOR ALL USING (auth.role() = 'service_role');
