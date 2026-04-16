-- Add paywall columns to hatiscan_reports
ALTER TABLE hatiscan_reports ADD COLUMN IF NOT EXISTS submitter_ip TEXT;
ALTER TABLE hatiscan_reports ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE hatiscan_reports ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT;
ALTER TABLE hatiscan_reports ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE hatiscan_reports ADD COLUMN IF NOT EXISTS checked_at TIMESTAMPTZ DEFAULT now();

-- Index for rate limiting (free scans per IP per day)
CREATE INDEX IF NOT EXISTS idx_hatiscan_reports_ip_tier
    ON hatiscan_reports (submitter_ip, scan_tier, created_at);

-- Index for Stripe session lookups
CREATE INDEX IF NOT EXISTS idx_hatiscan_reports_stripe
    ON hatiscan_reports (stripe_session_id) WHERE stripe_session_id IS NOT NULL;
