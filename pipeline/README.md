# Ardhi Verified — ETL Pipeline

Data ingestion pipeline for populating the PostGIS parcel database.

## Architecture

```
pipeline/
├── loaders/          # Write to Supabase (counties, parcels, ownership, etc.)
├── enrichment/       # Compute confidence scores, intelligence layers
└── requirements.txt  # Python dependencies
```

The existing `scripts/` directory contains scrapers and spatial data loaders.
This `pipeline/` directory adds structured parcel data ingestion for the
core schema (counties, parcels, ownership, encumbrances, intelligence layers).

## Setup

```bash
cd pipeline
pip install -r requirements.txt
```

## Environment

Requires `.env.local` in the project root with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (for direct psycopg2 access)
