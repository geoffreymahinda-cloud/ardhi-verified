-- Fix: road_reserves unique constraint on (road_name, source) is wrong
-- because many OSM road segments share the same name.
-- Replace with OSM ID-based uniqueness for geofabrik data.

-- Drop the bad constraint
ALTER TABLE road_reserves DROP CONSTRAINT IF EXISTS road_reserves_road_name_source_key;

-- Add osm_id column for deduplication
ALTER TABLE road_reserves ADD COLUMN IF NOT EXISTS osm_id BIGINT;

-- Unique on osm_id + source (for geofabrik rows)
CREATE UNIQUE INDEX IF NOT EXISTS idx_road_reserves_osm_unique
    ON road_reserves (osm_id, source) WHERE osm_id IS NOT NULL;
