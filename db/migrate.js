import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Client } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))

const client = new Client({
  connectionString: process.env.STORAGE_POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
})

const schema = `
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Facilities: one row per storage operator client
CREATE TABLE IF NOT EXISTS facilities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),

  -- From audit intake form
  name              TEXT NOT NULL,
  location          TEXT NOT NULL,
  contact_name      TEXT,
  contact_email     TEXT,
  contact_phone     TEXT,
  occupancy_range   TEXT,
  total_units       TEXT,
  biggest_issue     TEXT,
  notes             TEXT,

  -- From Google Places lookup
  place_id          TEXT,
  google_address    TEXT,
  google_phone      TEXT,
  website           TEXT,
  google_rating     NUMERIC(2,1),
  review_count      INTEGER,
  google_maps_url   TEXT,
  hours             JSONB,

  -- Pipeline status
  status            TEXT DEFAULT 'intake'
  -- intake | scraped | briefed | generating | review | approved | live | reporting
);

-- Audits: Claude-generated audit JSON for a facility
CREATE TABLE IF NOT EXISTS audits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID REFERENCES facilities(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  audit_json      JSONB NOT NULL,
  overall_score   INTEGER,
  grade           TEXT
);

-- Google Places data snapshot per facility
CREATE TABLE IF NOT EXISTS places_data (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   UUID REFERENCES facilities(id) ON DELETE CASCADE,
  fetched_at    TIMESTAMPTZ DEFAULT NOW(),
  photos        JSONB,   -- array of { index, url, width, height }
  reviews       JSONB    -- array of { author, rating, text, time }
);

-- Creative briefs: master document driving all content generation
CREATE TABLE IF NOT EXISTS creative_briefs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id             UUID REFERENCES facilities(id) ON DELETE CASCADE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  version                 INTEGER DEFAULT 1,
  brief_json              JSONB NOT NULL,
  platform_recommendation TEXT[],  -- e.g. ['meta_feed', 'meta_story', 'google_search']
  status                  TEXT DEFAULT 'draft'  -- draft | approved
);

-- Ad variations: individual pieces of content per platform/format
CREATE TABLE IF NOT EXISTS ad_variations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   UUID REFERENCES facilities(id) ON DELETE CASCADE,
  brief_id      UUID REFERENCES creative_briefs(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  platform      TEXT NOT NULL,  -- meta_feed | meta_story | google_search | google_display
  format        TEXT,           -- static | video | text
  angle         TEXT,           -- social_proof | convenience | urgency | lifestyle
  content_json  JSONB NOT NULL, -- platform-specific fields (headline, body, cta, etc.)
  asset_urls    JSONB,          -- { image: '...', video: '...' }
  status        TEXT DEFAULT 'draft',  -- draft | review | approved | published | rejected
  feedback      TEXT,           -- Blake's notes when sending back for refinement
  version       INTEGER DEFAULT 1
);

-- Assets: files stored in R2/S3, linked to a facility
CREATE TABLE IF NOT EXISTS assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   UUID REFERENCES facilities(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  type          TEXT NOT NULL,    -- photo | video | generated_image | generated_video
  source        TEXT NOT NULL,    -- google_places | ai_generated | uploaded
  url           TEXT NOT NULL,
  metadata      JSONB
);

-- Platform connections: OAuth tokens for Meta, Google Ads per facility
CREATE TABLE IF NOT EXISTS platform_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID REFERENCES facilities(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  platform        TEXT NOT NULL,        -- meta | google_ads
  status          TEXT DEFAULT 'disconnected',  -- disconnected | connected | expired | error
  access_token    TEXT,
  refresh_token   TEXT,
  token_expires_at TIMESTAMPTZ,
  account_id      TEXT,                 -- Meta ad account ID or Google Ads customer ID
  account_name    TEXT,                 -- Display name for the connected account
  page_id         TEXT,                 -- Meta page ID (for Instagram/Facebook)
  page_name       TEXT,
  metadata        JSONB,               -- Platform-specific extra data
  UNIQUE(facility_id, platform)
);

-- Publish log: track every ad push to external platforms
CREATE TABLE IF NOT EXISTS publish_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID REFERENCES facilities(id) ON DELETE CASCADE,
  variation_id    UUID REFERENCES ad_variations(id) ON DELETE CASCADE,
  connection_id   UUID REFERENCES platform_connections(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  platform        TEXT NOT NULL,
  status          TEXT DEFAULT 'pending',  -- pending | published | failed
  external_id     TEXT,                    -- Campaign/ad ID on the external platform
  external_url    TEXT,                    -- Link to the ad in the platform's dashboard
  error_message   TEXT,
  request_payload JSONB,
  response_payload JSONB
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_audits_facility ON audits(facility_id);
CREATE INDEX IF NOT EXISTS idx_places_facility ON places_data(facility_id);
CREATE INDEX IF NOT EXISTS idx_briefs_facility ON creative_briefs(facility_id);
CREATE INDEX IF NOT EXISTS idx_variations_facility ON ad_variations(facility_id);
CREATE INDEX IF NOT EXISTS idx_variations_brief ON ad_variations(brief_id);
CREATE INDEX IF NOT EXISTS idx_variations_status ON ad_variations(status);
CREATE INDEX IF NOT EXISTS idx_assets_facility ON assets(facility_id);
CREATE INDEX IF NOT EXISTS idx_facilities_status ON facilities(status);
CREATE INDEX IF NOT EXISTS idx_platform_connections_facility ON platform_connections(facility_id);
CREATE INDEX IF NOT EXISTS idx_publish_log_facility ON publish_log(facility_id);
CREATE INDEX IF NOT EXISTS idx_publish_log_variation ON publish_log(variation_id);
`

async function migrate() {
  try {
    await client.connect()
    console.log('Connected to Postgres')
    await client.query(schema)
    console.log('Schema created successfully')
  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

migrate()
