-- HatiScan reports table
CREATE TABLE IF NOT EXISTS hatiscan_reports (
    id SERIAL PRIMARY KEY,
    report_number TEXT UNIQUE DEFAULT 'HS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('hatiscan_report_seq')::text, 6, '0'),
    parcel_reference TEXT NOT NULL,
    trust_score INTEGER NOT NULL DEFAULT 100,
    verdict TEXT NOT NULL DEFAULT 'unverified',
    tier TEXT NOT NULL DEFAULT 'basic',
    submitter_type TEXT DEFAULT 'anonymous',
    elc_cases_found INTEGER DEFAULT 0,
    gazette_hits INTEGER DEFAULT 0,
    community_flags INTEGER DEFAULT 0,
    breakdown JSONB,
    checked_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Sequence for report numbers
CREATE SEQUENCE IF NOT EXISTS hatiscan_report_seq START 1;

-- Auto-generate report_number on insert
CREATE OR REPLACE FUNCTION generate_hatiscan_report_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.report_number := 'HS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('hatiscan_report_seq')::text, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_hatiscan_report_number ON hatiscan_reports;
CREATE TRIGGER set_hatiscan_report_number
    BEFORE INSERT ON hatiscan_reports
    FOR EACH ROW
    EXECUTE FUNCTION generate_hatiscan_report_number();

-- Enable RLS
ALTER TABLE hatiscan_reports ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access" ON hatiscan_reports
    FOR ALL USING (auth.role() = 'service_role');

-- Public can read their own reports by report_number (via API)
CREATE POLICY "Public read by report number" ON hatiscan_reports
    FOR SELECT USING (true);
