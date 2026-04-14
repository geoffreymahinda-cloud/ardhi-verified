-- Kenya protected areas (national parks, forests, nature reserves)
-- Source: OpenStreetMap Overpass API (ODbL licensed)
CREATE TABLE IF NOT EXISTS protected_zones (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    osm_id BIGINT,
    osm_type TEXT,                -- 'way' or 'relation'
    designation TEXT,             -- e.g. 'national_park', 'forest', 'nature_reserve'
    boundary TEXT,                -- raw OSM boundary tag
    protection_title TEXT,        -- OSM protect_title tag if present
    county TEXT,
    area_hectares NUMERIC,
    source TEXT DEFAULT 'openstreetmap',
    source_url TEXT,
    geometry JSONB,               -- simplified GeoJSON geometry
    tags JSONB,                   -- all raw OSM tags for reference
    scraped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_protected_zones_name_trgm
    ON protected_zones USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_protected_zones_county
    ON protected_zones (county);

CREATE INDEX IF NOT EXISTS idx_protected_zones_designation
    ON protected_zones (designation);

CREATE UNIQUE INDEX IF NOT EXISTS idx_protected_zones_osm
    ON protected_zones (osm_type, osm_id);

-- Enable RLS
ALTER TABLE protected_zones ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "Public read access" ON protected_zones;
CREATE POLICY "Public read access" ON protected_zones
    FOR SELECT USING (true);

-- Service role write access
DROP POLICY IF EXISTS "Service role write access" ON protected_zones;
CREATE POLICY "Service role write access" ON protected_zones
    FOR ALL USING (auth.role() = 'service_role');
