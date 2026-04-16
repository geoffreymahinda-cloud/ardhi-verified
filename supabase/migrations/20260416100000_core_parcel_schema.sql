-- ============================================================================
-- Core Parcel Schema — Step 1 of the build sequence
-- ============================================================================
-- Extends the existing parcels table and adds supporting tables.
-- RLS policies are omitted here — add via Supabase Dashboard or
-- a separate migration run through the Supabase CLI (not pooler).
-- ============================================================================

-- ── 1. Counties table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS counties (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    code          VARCHAR(3) UNIQUE,
    geometry      GEOMETRY(MULTIPOLYGON, 4326),
    population    INTEGER,
    area_sqkm     NUMERIC,
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_counties_geometry
    ON counties USING GIST (geometry);

CREATE INDEX IF NOT EXISTS idx_counties_name
    ON counties (name);

-- ── 2. Extend parcels table ────────────────────────────────────────────────

ALTER TABLE parcels ADD COLUMN IF NOT EXISTS lr_number VARCHAR(100);
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS block_number VARCHAR(100);
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS area_sqm NUMERIC;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS data_source VARCHAR(50);
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2) DEFAULT 0.00;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT now();
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS is_sectional BOOLEAN DEFAULT FALSE;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS sectional_floors INTEGER;

CREATE INDEX IF NOT EXISTS idx_parcels_lr
    ON parcels (lr_number);

CREATE INDEX IF NOT EXISTS idx_parcels_block
    ON parcels (block_number);

CREATE INDEX IF NOT EXISTS idx_parcels_confidence
    ON parcels (confidence_score);

CREATE INDEX IF NOT EXISTS idx_parcels_data_source
    ON parcels (data_source);

-- ── 3. Ownership table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ownership (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id      INTEGER REFERENCES parcels(id) ON DELETE CASCADE,
    owner_name     VARCHAR(255),
    owner_type     VARCHAR(50),
    title_type     VARCHAR(50),
    title_number   VARCHAR(100),
    source         VARCHAR(100),
    verified_date  DATE,
    created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ownership_parcel
    ON ownership (parcel_id);

CREATE INDEX IF NOT EXISTS idx_ownership_owner_name
    ON ownership (owner_name);

-- ── 4. Encumbrances table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS encumbrances (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id         INTEGER REFERENCES parcels(id) ON DELETE CASCADE,
    encumbrance_type  VARCHAR(50),
    holder            VARCHAR(255),
    gazette_reference VARCHAR(100),
    date_registered   DATE,
    source            VARCHAR(100),
    created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_encumbrances_parcel
    ON encumbrances (parcel_id);

CREATE INDEX IF NOT EXISTS idx_encumbrances_type
    ON encumbrances (encumbrance_type);

-- ── 5. Intelligence layers table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS intelligence_layers (
    parcel_id           INTEGER PRIMARY KEY REFERENCES parcels(id) ON DELETE CASCADE,
    dev_pressure_index  NUMERIC(4,2),
    flood_risk          VARCHAR(20),
    transaction_count   INTEGER DEFAULT 0,
    last_transaction    DATE,
    zoning_class        VARCHAR(100),
    is_sectional        BOOLEAN DEFAULT FALSE,
    sectional_floors    INTEGER,
    computed_at         TIMESTAMPTZ DEFAULT now()
);

-- ── 6. LR-to-Block lookup table (proprietary asset) ───────────────────────

CREATE TABLE IF NOT EXISTS lr_block_lookup (
    id              SERIAL PRIMARY KEY,
    lr_number       VARCHAR(100) NOT NULL,
    block_number    VARCHAR(100) NOT NULL,
    source          VARCHAR(100),
    confidence      NUMERIC(3,2),
    verified_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(lr_number, block_number)
);

CREATE INDEX IF NOT EXISTS idx_lr_block_lr
    ON lr_block_lookup (lr_number);

CREATE INDEX IF NOT EXISTS idx_lr_block_block
    ON lr_block_lookup (block_number);

-- ── 7. Usage log table (API billing) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS usage_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID,
    api_key         VARCHAR(64),
    endpoint        VARCHAR(200) NOT NULL,
    parcel_ref      VARCHAR(200),
    tier            VARCHAR(20),
    response_ms     INTEGER,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_log_user
    ON usage_log (user_id);

CREATE INDEX IF NOT EXISTS idx_usage_log_created
    ON usage_log (created_at);

CREATE INDEX IF NOT EXISTS idx_usage_log_api_key
    ON usage_log (api_key);

-- ── 8. Subscriptions table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL,
    plan                 VARCHAR(20) NOT NULL,
    price_kes            INTEGER NOT NULL,
    stripe_customer_id   VARCHAR(100),
    stripe_sub_id        VARCHAR(100),
    status               VARCHAR(20) DEFAULT 'active',
    current_period_start TIMESTAMPTZ,
    current_period_end   TIMESTAMPTZ,
    searches_used        INTEGER DEFAULT 0,
    searches_limit       INTEGER,
    created_at           TIMESTAMPTZ DEFAULT now(),
    updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user
    ON subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe
    ON subscriptions (stripe_customer_id);

-- ── 9. Extend existing api_keys table ──────────────────────────────────────
-- Existing columns: id, partner_name, api_key, tier, rate_limit_per_hour,
--                   is_active, contact_email, webhook_url, watch_titles, created_at

ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_hash VARCHAR(128);
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_prefix VARCHAR(8);
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_api_keys_user
    ON api_keys (user_id);

-- ── 10. Add county_id FK to parcels (after counties table exists) ──────────

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'parcels' AND column_name = 'county_id'
    ) THEN
        ALTER TABLE parcels ADD COLUMN county_id INTEGER REFERENCES counties(id);
        CREATE INDEX idx_parcels_county_id ON parcels (county_id);
    END IF;
END $$;
