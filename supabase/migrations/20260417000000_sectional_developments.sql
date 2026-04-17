-- ============================================================================
-- Sectional Properties — Apartments, flats, and multi-unit developments
-- ============================================================================
-- Kenya's Ardhisasa system does not cover sectional properties.
-- This schema fills that gap for bank mortgage underwriting on apartment blocks.
-- ============================================================================

CREATE TABLE IF NOT EXISTS sectional_developments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  development_name VARCHAR NOT NULL,
  developer VARCHAR,
  parent_parcel_id INTEGER REFERENCES parcels(id),
  sectional_plan_no VARCHAR,
  county_id INTEGER REFERENCES counties(id),
  location_description VARCHAR,
  building_footprint GEOMETRY(POLYGON, 4326),
  total_units INTEGER,
  total_floors INTEGER,
  registration_date DATE,
  gazette_reference VARCHAR,
  data_source VARCHAR,
  confidence_score NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sectional_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  development_id UUID REFERENCES sectional_developments(id) ON DELETE CASCADE,
  unit_number VARCHAR NOT NULL,
  floor_level INTEGER,
  unit_type VARCHAR,
  area_sqm NUMERIC,
  lr_reference VARCHAR,
  title_number VARCHAR,
  gazette_reference VARCHAR,
  last_updated TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sectional_ownership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES sectional_units(id) ON DELETE CASCADE,
  owner_name VARCHAR,
  owner_type VARCHAR,
  title_type VARCHAR DEFAULT 'sectional',
  source VARCHAR,
  verified_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sectional_encumbrances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES sectional_units(id) ON DELETE CASCADE,
  encumbrance_type VARCHAR,
  holder VARCHAR,
  gazette_reference VARCHAR,
  date_registered DATE,
  source VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sect_dev_footprint ON sectional_developments USING GIST(building_footprint);
CREATE INDEX IF NOT EXISTS idx_sect_dev_county ON sectional_developments(county_id);
CREATE INDEX IF NOT EXISTS idx_sect_dev_plan ON sectional_developments(sectional_plan_no);
CREATE INDEX IF NOT EXISTS idx_sect_units_dev ON sectional_units(development_id);
CREATE INDEX IF NOT EXISTS idx_sect_units_lr ON sectional_units(lr_reference);
CREATE INDEX IF NOT EXISTS idx_sect_units_title ON sectional_units(title_number);
CREATE INDEX IF NOT EXISTS idx_sect_ownership_unit ON sectional_ownership(unit_id);
CREATE INDEX IF NOT EXISTS idx_sect_encumbrances_unit ON sectional_encumbrances(unit_id);
