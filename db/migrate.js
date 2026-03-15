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

-- Landing pages: ad-specific pages per facility
CREATE TABLE IF NOT EXISTS landing_pages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id       UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  slug              VARCHAR(120) NOT NULL UNIQUE,
  title             VARCHAR(255) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft',  -- draft | published | archived
  variation_ids     UUID[],
  meta_title        VARCHAR(120),
  meta_description  VARCHAR(300),
  og_image_url      TEXT,
  theme             JSONB NOT NULL DEFAULT '{}',
  storedge_widget_url TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at      TIMESTAMPTZ
);

-- Landing page sections: ordered content blocks per page
CREATE TABLE IF NOT EXISTS landing_page_sections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id   UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  section_type      VARCHAR(40) NOT NULL,
  config            JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landing_pages_facility ON landing_pages(facility_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_lp_sections_page ON landing_page_sections(landing_page_id);

-- Facebook data deletion requests (required by Meta Platform Terms)
CREATE TABLE IF NOT EXISTS fb_deletion_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_code  TEXT NOT NULL UNIQUE,
  fb_user_id         TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending',  -- pending | in_progress | completed
  requested_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fb_deletion_code ON fb_deletion_requests(confirmation_code);

-- UTM tracked links per facility
CREATE TABLE IF NOT EXISTS utm_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE SET NULL,
  label           TEXT NOT NULL,
  utm_source      TEXT NOT NULL,
  utm_medium      TEXT NOT NULL,
  utm_campaign    TEXT,
  utm_content     TEXT,
  utm_term        TEXT,
  short_code      VARCHAR(16) NOT NULL UNIQUE,
  click_count     INTEGER DEFAULT 0,
  last_clicked_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_utm_links_facility ON utm_links(facility_id);
CREATE INDEX IF NOT EXISTS idx_utm_links_short_code ON utm_links(short_code);

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

-- ============================================================
-- Lead pipeline tables (migrated from Redis)
-- ============================================================

-- Extend facilities with pipeline tracking columns
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS pipeline_status TEXT DEFAULT 'submitted';
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS pms_uploaded BOOLEAN DEFAULT FALSE;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS access_code VARCHAR(16) UNIQUE;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS form_notes TEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS lead_score INTEGER;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_facilities_pipeline_status ON facilities(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_facilities_access_code ON facilities(access_code);

-- Lead notes: admin notes attached to a facility/lead
CREATE TABLE IF NOT EXISTS lead_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lead_notes_facility ON lead_notes(facility_id);

-- Activity log: replaces Redis activity:global and activity:lead:* lists
CREATE TABLE IF NOT EXISTS activity_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT NOT NULL,
  facility_id   UUID REFERENCES facilities(id) ON DELETE CASCADE,
  lead_name     TEXT,
  facility_name TEXT,
  detail        TEXT,
  meta          JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_facility ON activity_log(facility_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- Clients: portal access records (replaces Redis client:* keys)
CREATE TABLE IF NOT EXISTS clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL,
  facility_name TEXT,
  location      TEXT,
  occupancy_range TEXT,
  total_units   TEXT,
  access_code   VARCHAR(16) NOT NULL UNIQUE,
  monthly_goal  INTEGER DEFAULT 0,
  signed_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clients_access_code ON clients(access_code);
CREATE INDEX IF NOT EXISTS idx_clients_facility ON clients(facility_id);

-- Client campaign metrics per month
CREATE TABLE IF NOT EXISTS client_campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  month            TEXT NOT NULL,
  spend            NUMERIC(10,2) NOT NULL DEFAULT 0,
  leads            INTEGER NOT NULL DEFAULT 0,
  cpl              NUMERIC(10,2) DEFAULT 0,
  move_ins         INTEGER DEFAULT 0,
  cost_per_move_in NUMERIC(10,2) DEFAULT 0,
  roas             NUMERIC(6,2) DEFAULT 0,
  occupancy_delta  NUMERIC(5,2) DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, month)
);
CREATE INDEX IF NOT EXISTS idx_client_campaigns_client ON client_campaigns(client_id);

-- Client onboarding wizard state
CREATE TABLE IF NOT EXISTS client_onboarding (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  access_code   VARCHAR(16) NOT NULL,
  steps         JSONB NOT NULL DEFAULT '{}',
  completed_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_code ON client_onboarding(access_code);

-- Drip email sequences
CREATE TABLE IF NOT EXISTS drip_sequences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  sequence_id   TEXT NOT NULL DEFAULT 'post_audit',
  current_step  INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active',
  enrolled_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_send_at  TIMESTAMPTZ,
  paused_at     TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  cancelled_at  TIMESTAMPTZ,
  cancel_reason TEXT,
  history       JSONB DEFAULT '[]',
  UNIQUE(facility_id)
);
CREATE INDEX IF NOT EXISTS idx_drip_sequences_status ON drip_sequences(status);
CREATE INDEX IF NOT EXISTS idx_drip_sequences_next_send ON drip_sequences(next_send_at);

-- Shared audit reports (public shareable links)
CREATE TABLE IF NOT EXISTS shared_audits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          VARCHAR(60) NOT NULL UNIQUE,
  facility_name TEXT,
  audit_json    JSONB NOT NULL,
  views         INTEGER DEFAULT 0,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shared_audits_slug ON shared_audits(slug);

-- Cached audit reports per facility
CREATE TABLE IF NOT EXISTS audit_report_cache (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  report_json   JSONB NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(facility_id)
);

-- PMS report uploads
CREATE TABLE IF NOT EXISTS pms_reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id    UUID REFERENCES facilities(id) ON DELETE SET NULL,
  facility_name  TEXT,
  email          TEXT,
  report_type    TEXT DEFAULT 'unknown',
  file_name      TEXT DEFAULT 'report.csv',
  report_data    JSONB NOT NULL,
  uploaded_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pms_reports_facility ON pms_reports(facility_id);

-- Ideas / feature requests
CREATE TABLE IF NOT EXISTS ideas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  category    TEXT DEFAULT 'general',
  priority    TEXT DEFAULT 'medium',
  status      TEXT DEFAULT 'new',
  votes       INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Tests: server-side experiment definitions
CREATE TABLE IF NOT EXISTS ab_tests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id       UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'active',  -- active | paused | completed
  variants          JSONB NOT NULL,                  -- [{id, name, slug, weight}]
  metrics           JSONB NOT NULL,                  -- {primary: "reservation_completed", secondary: [...]}
  landing_page_ids  UUID[],
  start_date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date          TIMESTAMPTZ,
  winner_variant_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ab_tests_facility ON ab_tests(facility_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);

-- A/B Test Events: visitor-level tracking data
CREATE TABLE IF NOT EXISTS ab_test_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id     UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id  TEXT NOT NULL,
  visitor_id  TEXT NOT NULL,
  event_name  TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_test ON ab_test_events(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_dedup ON ab_test_events(test_id, variant_id, visitor_id, event_name);

-- Drip Sequence Templates: AI-generated email content per facility
CREATE TABLE IF NOT EXISTS drip_sequence_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  variation_id  UUID REFERENCES ad_variations(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  steps         JSONB NOT NULL,  -- [{step, delayDays, subject, preheader, body, ctaText, ctaUrl, label}]
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(facility_id, variation_id)
);
CREATE INDEX IF NOT EXISTS idx_drip_templates_facility ON drip_sequence_templates(facility_id);
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
