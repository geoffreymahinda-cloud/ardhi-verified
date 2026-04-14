-- NLC compulsory acquisition notices extracted from gazette
CREATE TABLE IF NOT EXISTS nlc_acquisitions (
    id SERIAL PRIMARY KEY,
    location_description TEXT,
    county TEXT,
    gazette_ref TEXT,
    gazette_date TEXT,
    gazette_year INTEGER,
    gazette_notice_number TEXT,
    acquiring_authority TEXT,
    purpose TEXT,
    nlc_case_number TEXT,
    source TEXT DEFAULT 'gazette_extraction',
    source_url TEXT,
    raw_snippet TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_nlc_acq_location_trgm
    ON nlc_acquisitions USING GIN (location_description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_nlc_acq_county
    ON nlc_acquisitions (county);

CREATE INDEX IF NOT EXISTS idx_nlc_acq_purpose_trgm
    ON nlc_acquisitions USING GIN (purpose gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_nlc_acq_case_num
    ON nlc_acquisitions (nlc_case_number);

CREATE INDEX IF NOT EXISTS idx_nlc_acq_year
    ON nlc_acquisitions (gazette_year DESC NULLS LAST);

ALTER TABLE nlc_acquisitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON nlc_acquisitions;
CREATE POLICY "Public read access" ON nlc_acquisitions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role write access" ON nlc_acquisitions;
CREATE POLICY "Service role write access" ON nlc_acquisitions
    FOR ALL USING (auth.role() = 'service_role');
