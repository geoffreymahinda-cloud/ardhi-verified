-- Full ELC judgment text table
CREATE TABLE IF NOT EXISTS elc_judgements (
    id SERIAL PRIMARY KEY,
    case_number TEXT NOT NULL,
    case_title TEXT,
    parties TEXT,
    judgement_date TEXT,
    full_text TEXT,
    parcel_references JSONB DEFAULT '[]'::jsonb,
    outcome TEXT,
    source_url TEXT NOT NULL UNIQUE,
    court_station TEXT,
    judge TEXT,
    scraped_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for search performance
CREATE INDEX idx_judgements_parcel_gin
    ON elc_judgements USING GIN (parcel_references jsonb_ops);

CREATE INDEX idx_judgements_fulltext
    ON elc_judgements USING GIN (to_tsvector('english', coalesce(full_text, '')));

CREATE INDEX idx_judgements_parties_trgm
    ON elc_judgements USING GIN (parties gin_trgm_ops);

CREATE INDEX idx_judgements_case_number
    ON elc_judgements (case_number);

CREATE UNIQUE INDEX idx_judgements_source_url
    ON elc_judgements (source_url);

CREATE INDEX idx_judgements_court_station
    ON elc_judgements (court_station);

CREATE INDEX idx_judgements_date
    ON elc_judgements (judgement_date DESC NULLS LAST);

-- Enable RLS
ALTER TABLE elc_judgements ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access" ON elc_judgements
    FOR SELECT USING (true);

-- Service role write access
CREATE POLICY "Service role write access" ON elc_judgements
    FOR ALL USING (auth.role() = 'service_role');
