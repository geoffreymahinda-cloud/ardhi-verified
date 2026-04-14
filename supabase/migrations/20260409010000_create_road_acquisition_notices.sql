-- Road acquisition gazette notices
CREATE TABLE IF NOT EXISTS road_acquisition_notices (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    road_agency TEXT,
    county TEXT,
    gazette_year INTEGER,
    gazette_notice_number TEXT,
    parcel_references JSONB DEFAULT '[]'::jsonb,
    source_url TEXT,
    scraped_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_road_acq_desc_trgm
    ON road_acquisition_notices USING GIN (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_road_acq_county
    ON road_acquisition_notices (county);

CREATE INDEX IF NOT EXISTS idx_road_acq_parcels_gin
    ON road_acquisition_notices USING GIN (parcel_references jsonb_ops);

ALTER TABLE road_acquisition_notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON road_acquisition_notices;
CREATE POLICY "Public read access" ON road_acquisition_notices
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role write access" ON road_acquisition_notices;
CREATE POLICY "Service role write access" ON road_acquisition_notices
    FOR ALL USING (auth.role() = 'service_role');
