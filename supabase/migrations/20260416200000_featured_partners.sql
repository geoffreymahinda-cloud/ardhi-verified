-- ============================================================================
-- Featured Partners — Finance institutions displayed on homepage
-- ============================================================================

CREATE TABLE IF NOT EXISTS featured_partners (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(200) NOT NULL,
    logo_url            TEXT,
    description         TEXT,
    website_url         TEXT,
    is_active           BOOLEAN DEFAULT TRUE,
    display_order       INTEGER DEFAULT 0,
    is_featured         BOOLEAN DEFAULT FALSE,
    rotation_start_date DATE,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_featured_partners_active
    ON featured_partners (is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_featured_partners_featured
    ON featured_partners (is_featured, display_order);

-- Seed with 6 placeholder partners
INSERT INTO featured_partners (name, description, is_active, is_featured, display_order) VALUES
    ('Savanna Finance', 'Competitive mortgage rates for verified land purchases', TRUE, TRUE, 1),
    ('Rift Valley SACCO', 'Member-owned financing for agricultural and residential land', TRUE, TRUE, 2),
    ('Nairobi Credit Union', 'Fast land purchase loans for verified title deeds', TRUE, TRUE, 3),
    ('Highlands Bank', 'Specialist land financing across all 47 counties', TRUE, TRUE, 4),
    ('Lakeside SACCO', 'Affordable land loans with flexible repayment terms', TRUE, TRUE, 5),
    ('Acacia Mortgage Fund', 'First-time buyer land finance made simple', TRUE, TRUE, 6)
ON CONFLICT DO NOTHING;
