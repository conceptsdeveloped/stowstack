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
-- Organizations (white-label partner management companies)
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  slug              VARCHAR(60) NOT NULL UNIQUE,
  logo_url          TEXT,
  primary_color     VARCHAR(7) DEFAULT '#16a34a',
  accent_color      VARCHAR(7) DEFAULT '#4f46e5',
  custom_domain     TEXT,
  contact_email     TEXT,
  contact_phone     TEXT,
  billing_email     TEXT,
  plan              TEXT DEFAULT 'starter',  -- starter | growth | enterprise
  facility_limit    INTEGER DEFAULT 10,
  white_label       BOOLEAN DEFAULT FALSE,
  status            TEXT DEFAULT 'active',   -- active | suspended | cancelled
  rev_share_enabled BOOLEAN DEFAULT TRUE,
  rev_share_pct     NUMERIC(5,2),            -- NULL = auto-tiered, or manual override
  rev_share_tier    TEXT DEFAULT 'auto',      -- auto | custom
  lifetime_earnings NUMERIC(12,2) DEFAULT 0,
  payout_method     TEXT DEFAULT 'bank_transfer', -- bank_transfer | paypal | check
  payout_email      TEXT,
  settings          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_custom_domain ON organizations(custom_domain);

-- Org users: role-based access within an organization
CREATE TABLE IF NOT EXISTS org_users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  name              TEXT NOT NULL,
  role              TEXT NOT NULL DEFAULT 'viewer',  -- org_admin | facility_manager | viewer
  password_hash     TEXT,
  invite_token      VARCHAR(64),
  invite_expires_at TIMESTAMPTZ,
  last_login_at     TIMESTAMPTZ,
  status            TEXT DEFAULT 'invited',  -- invited | active | disabled
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, email)
);
CREATE INDEX IF NOT EXISTS idx_org_users_email ON org_users(email);
CREATE INDEX IF NOT EXISTS idx_org_users_org ON org_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_users_invite ON org_users(invite_token);

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

-- Link facilities to organizations
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_facilities_organization ON facilities(organization_id);

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

-- Partial leads: captures abandoned form data field-by-field
CREATE TABLE IF NOT EXISTS partial_leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE SET NULL,
  facility_id     UUID REFERENCES facilities(id) ON DELETE SET NULL,
  session_id      TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  name            TEXT,
  unit_size       TEXT,
  fields_completed INTEGER DEFAULT 0,
  total_fields    INTEGER DEFAULT 0,
  scroll_depth    INTEGER DEFAULT 0,
  time_on_page    INTEGER DEFAULT 0,
  exit_intent     BOOLEAN DEFAULT FALSE,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  referrer        TEXT,
  user_agent      TEXT,
  ip_hash         TEXT,
  recovery_status TEXT DEFAULT 'pending',
  recovery_sent_count INTEGER DEFAULT 0,
  next_recovery_at TIMESTAMPTZ,
  converted       BOOLEAN DEFAULT FALSE,
  converted_at    TIMESTAMPTZ,
  lead_score      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id)
);
CREATE INDEX IF NOT EXISTS idx_partial_leads_email ON partial_leads(email);
CREATE INDEX IF NOT EXISTS idx_partial_leads_recovery ON partial_leads(recovery_status, next_recovery_at);
CREATE INDEX IF NOT EXISTS idx_partial_leads_session ON partial_leads(session_id);
CREATE INDEX IF NOT EXISTS idx_partial_leads_landing_page ON partial_leads(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_partial_leads_created ON partial_leads(created_at DESC);

-- ============================================================
-- Call tracking tables
-- ============================================================

-- Tracking numbers: Twilio-provisioned numbers per facility/campaign
CREATE TABLE IF NOT EXISTS call_tracking_numbers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE SET NULL,
  utm_link_id     UUID REFERENCES utm_links(id) ON DELETE SET NULL,
  label           TEXT NOT NULL,
  twilio_sid      TEXT NOT NULL UNIQUE,
  phone_number    TEXT NOT NULL,
  forward_to      TEXT NOT NULL,
  status          TEXT DEFAULT 'active',  -- active | paused | released
  call_count      INTEGER DEFAULT 0,
  total_duration  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_call_tracking_facility ON call_tracking_numbers(facility_id);
CREATE INDEX IF NOT EXISTS idx_call_tracking_phone ON call_tracking_numbers(phone_number);

-- Call logs: individual call records from Twilio webhooks
CREATE TABLE IF NOT EXISTS call_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number_id  UUID NOT NULL REFERENCES call_tracking_numbers(id) ON DELETE CASCADE,
  facility_id         UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  twilio_call_sid     TEXT NOT NULL UNIQUE,
  caller_number       TEXT,
  caller_city         TEXT,
  caller_state        TEXT,
  duration            INTEGER DEFAULT 0,
  status              TEXT NOT NULL,       -- ringing | in-progress | completed | no-answer | busy | failed
  recording_url       TEXT,
  started_at          TIMESTAMPTZ NOT NULL,
  ended_at            TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_call_logs_tracking ON call_logs(tracking_number_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_facility ON call_logs(facility_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created ON call_logs(created_at DESC);

-- ============================================================
-- Revenue share for partner organizations
-- ============================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS rev_share_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS rev_share_pct NUMERIC(5,2);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS rev_share_tier TEXT DEFAULT 'auto';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS lifetime_earnings NUMERIC(12,2) DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'bank_transfer';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS payout_email TEXT;

-- Revenue share payouts: monthly payout records per org
CREATE TABLE IF NOT EXISTS rev_share_payouts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month             TEXT NOT NULL,
  facility_count    INTEGER NOT NULL DEFAULT 0,
  gross_mrr         NUMERIC(10,2) NOT NULL DEFAULT 0,
  rev_share_pct     NUMERIC(5,2) NOT NULL,
  payout_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  status            TEXT DEFAULT 'pending',  -- pending | approved | paid | failed
  paid_at           TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, month)
);
CREATE INDEX IF NOT EXISTS idx_rev_share_payouts_org ON rev_share_payouts(organization_id);
CREATE INDEX IF NOT EXISTS idx_rev_share_payouts_month ON rev_share_payouts(month);
CREATE INDEX IF NOT EXISTS idx_rev_share_payouts_status ON rev_share_payouts(status);

-- Revenue share referrals: track which facilities were referred by which org
CREATE TABLE IF NOT EXISTS rev_share_referrals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id       UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  referred_at       TIMESTAMPTZ DEFAULT NOW(),
  first_revenue_at  TIMESTAMPTZ,
  status            TEXT DEFAULT 'active',  -- active | churned | paused
  total_earned      NUMERIC(10,2) DEFAULT 0,
  UNIQUE(organization_id, facility_id)
);
CREATE INDEX IF NOT EXISTS idx_rev_share_referrals_org ON rev_share_referrals(organization_id);

-- ============================================================
-- Tenant management & billing integration
-- ============================================================

-- Tenants: individual storage unit renters synced from PMS
CREATE TABLE IF NOT EXISTS tenants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id       UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  external_id       TEXT,                -- PMS tenant ID
  name              TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  unit_number       TEXT NOT NULL,
  unit_size         TEXT,                -- e.g. '10x10', '5x15'
  unit_type         TEXT,                -- standard | climate | drive_up | vehicle_rv
  monthly_rate      NUMERIC(10,2) NOT NULL DEFAULT 0,
  move_in_date      DATE NOT NULL,
  lease_end_date    DATE,
  autopay_enabled   BOOLEAN DEFAULT FALSE,
  has_insurance     BOOLEAN DEFAULT FALSE,
  insurance_monthly NUMERIC(10,2) DEFAULT 0,
  balance           NUMERIC(10,2) DEFAULT 0,
  status            TEXT DEFAULT 'active',  -- active | delinquent | moved_out | reserved
  days_delinquent   INTEGER DEFAULT 0,
  last_payment_date DATE,
  moved_out_date    DATE,
  move_out_reason   TEXT,                -- voluntary | eviction | relocation | downsizing | other
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenants_facility ON tenants(facility_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_delinquent ON tenants(days_delinquent) WHERE days_delinquent > 0;
CREATE INDEX IF NOT EXISTS idx_tenants_external ON tenants(facility_id, external_id);

-- Tenant payment history: individual payment records
CREATE TABLE IF NOT EXISTS tenant_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  amount          NUMERIC(10,2) NOT NULL,
  payment_date    DATE NOT NULL,
  due_date        DATE NOT NULL,
  method          TEXT,                  -- autopay | manual | cash | check | card
  status          TEXT DEFAULT 'paid',   -- paid | pending | failed | refunded | late
  days_late       INTEGER DEFAULT 0,
  external_ref    TEXT,                  -- PMS payment reference
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenant_payments_tenant ON tenant_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_payments_facility ON tenant_payments(facility_id);
CREATE INDEX IF NOT EXISTS idx_tenant_payments_date ON tenant_payments(payment_date DESC);

-- Churn predictions: ML-scored risk assessments per tenant
CREATE TABLE IF NOT EXISTS churn_predictions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  facility_id       UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  risk_score        INTEGER NOT NULL,    -- 0-100, higher = more likely to churn
  risk_level        TEXT NOT NULL,        -- low | medium | high | critical
  predicted_vacate  DATE,                -- estimated move-out date
  factors           JSONB NOT NULL,      -- [{factor, weight, detail}]
  recommended_actions JSONB DEFAULT '[]', -- [{action, priority, description}]
  retention_campaign_id UUID,
  retention_status  TEXT DEFAULT 'none', -- none | enrolled | contacted | retained | churned
  last_scored_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_churn_predictions_facility ON churn_predictions(facility_id);
CREATE INDEX IF NOT EXISTS idx_churn_predictions_risk ON churn_predictions(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_churn_predictions_level ON churn_predictions(risk_level);

-- Upsell opportunities: identified revenue expansion per tenant
CREATE TABLE IF NOT EXISTS upsell_opportunities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  facility_id       UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  type              TEXT NOT NULL,        -- unit_upgrade | insurance | climate_upgrade | longer_term | autopay
  title             TEXT NOT NULL,
  description       TEXT,
  current_value     NUMERIC(10,2) DEFAULT 0,
  proposed_value    NUMERIC(10,2) DEFAULT 0,
  monthly_uplift    NUMERIC(10,2) DEFAULT 0,
  confidence        INTEGER DEFAULT 50,  -- 0-100 confidence score
  status            TEXT DEFAULT 'identified', -- identified | queued | sent | accepted | declined | expired
  outreach_method   TEXT,                -- email | sms | call | in_person
  sent_at           TIMESTAMPTZ,
  responded_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_upsell_facility ON upsell_opportunities(facility_id);
CREATE INDEX IF NOT EXISTS idx_upsell_tenant ON upsell_opportunities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_upsell_status ON upsell_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_upsell_type ON upsell_opportunities(type);

-- Move-out remarketing: welcome-back campaigns for departed tenants
CREATE TABLE IF NOT EXISTS moveout_remarketing (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  facility_id       UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  moved_out_date    DATE NOT NULL,
  move_out_reason   TEXT,
  sequence_status   TEXT DEFAULT 'pending', -- pending | active | paused | completed | converted | unsubscribed
  current_step      INTEGER DEFAULT 0,
  total_steps       INTEGER DEFAULT 5,
  last_sent_at      TIMESTAMPTZ,
  next_send_at      TIMESTAMPTZ,
  opened_count      INTEGER DEFAULT 0,
  clicked_count     INTEGER DEFAULT 0,
  converted         BOOLEAN DEFAULT FALSE,
  converted_at      TIMESTAMPTZ,
  new_tenant_id     UUID REFERENCES tenants(id) ON DELETE SET NULL,
  offer_type        TEXT,                -- discount | free_month | waived_fee | none
  offer_value       NUMERIC(10,2) DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_moveout_remarketing_facility ON moveout_remarketing(facility_id);
CREATE INDEX IF NOT EXISTS idx_moveout_remarketing_status ON moveout_remarketing(sequence_status);
CREATE INDEX IF NOT EXISTS idx_moveout_remarketing_next ON moveout_remarketing(next_send_at) WHERE sequence_status = 'active';

-- Retention campaigns: automated outreach triggered by churn predictions
CREATE TABLE IF NOT EXISTS retention_campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id       UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  trigger_risk_level TEXT DEFAULT 'high', -- medium | high | critical
  sequence_steps    JSONB NOT NULL,      -- [{step, delayDays, channel, subject, body, offer}]
  active            BOOLEAN DEFAULT TRUE,
  enrolled_count    INTEGER DEFAULT 0,
  retained_count    INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_retention_campaigns_facility ON retention_campaigns(facility_id);

-- ============================================================
-- Operator referral network
-- ============================================================

-- Referral codes: one per facility/operator, shareable at conferences
CREATE TABLE IF NOT EXISTS referral_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  code            VARCHAR(20) NOT NULL UNIQUE,
  referrer_name   TEXT NOT NULL,
  referrer_email  TEXT NOT NULL,
  credit_balance  NUMERIC(10,2) DEFAULT 0,
  total_earned    NUMERIC(10,2) DEFAULT 0,
  referral_count  INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'active',  -- active | paused | revoked
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_codes_facility ON referral_codes(facility_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_email ON referral_codes(referrer_email);

-- Referrals: each referred operator tracked from invite to conversion
CREATE TABLE IF NOT EXISTS referrals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id  UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referred_name     TEXT NOT NULL,
  referred_email    TEXT NOT NULL,
  referred_phone    TEXT,
  facility_name     TEXT,
  facility_location TEXT,
  status            TEXT DEFAULT 'invited',  -- invited | signed_up | onboarding | active | churned
  credit_amount     NUMERIC(10,2) DEFAULT 0,
  credit_issued     BOOLEAN DEFAULT FALSE,
  credit_issued_at  TIMESTAMPTZ,
  signed_up_at      TIMESTAMPTZ,
  activated_at      TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_email ON referrals(referred_email);

-- Referral credit ledger: tracks every credit earned/redeemed
CREATE TABLE IF NOT EXISTS referral_credits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id  UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referral_id       UUID REFERENCES referrals(id) ON DELETE SET NULL,
  type              TEXT NOT NULL,  -- earned | redeemed | expired | bonus
  amount            NUMERIC(10,2) NOT NULL,
  description       TEXT NOT NULL,
  balance_after     NUMERIC(10,2) NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_credits_code ON referral_credits(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_referral_credits_type ON referral_credits(type);

-- ============================================================
-- Google Business Profile automation
-- ============================================================

-- GBP connections: OAuth credentials per facility
CREATE TABLE IF NOT EXISTS gbp_connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id       UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  google_account_id TEXT,
  location_id       TEXT,                -- GBP location resource name
  location_name     TEXT,
  access_token      TEXT,
  refresh_token     TEXT,
  token_expires_at  TIMESTAMPTZ,
  status            TEXT DEFAULT 'disconnected',  -- connected | disconnected | expired | error
  last_sync_at      TIMESTAMPTZ,
  sync_config       JSONB DEFAULT '{"auto_post": false, "auto_respond": false, "sync_hours": true, "sync_photos": true}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(facility_id)
);
CREATE INDEX IF NOT EXISTS idx_gbp_connections_facility ON gbp_connections(facility_id);
CREATE INDEX IF NOT EXISTS idx_gbp_connections_status ON gbp_connections(status);

-- GBP posts: updates published or scheduled to Google Business Profile
CREATE TABLE IF NOT EXISTS gbp_posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id       UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  gbp_connection_id UUID REFERENCES gbp_connections(id) ON DELETE CASCADE,
  post_type         TEXT NOT NULL DEFAULT 'update',  -- update | offer | event | availability
  title             TEXT,
  body              TEXT NOT NULL,
  cta_type          TEXT,                -- BOOK | CALL | LEARN_MORE | SIGN_UP
  cta_url           TEXT,
  image_url         TEXT,
  offer_code        TEXT,
  start_date        DATE,
  end_date          DATE,
  status            TEXT DEFAULT 'draft',  -- draft | scheduled | published | failed | deleted
  scheduled_at      TIMESTAMPTZ,
  published_at      TIMESTAMPTZ,
  external_post_id  TEXT,                -- GBP post resource name
  error_message     TEXT,
  ai_generated      BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gbp_posts_facility ON gbp_posts(facility_id);
CREATE INDEX IF NOT EXISTS idx_gbp_posts_status ON gbp_posts(status);
CREATE INDEX IF NOT EXISTS idx_gbp_posts_scheduled ON gbp_posts(scheduled_at) WHERE status = 'scheduled';

-- GBP reviews: cached reviews with AI response tracking
CREATE TABLE IF NOT EXISTS gbp_reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id         UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  gbp_connection_id   UUID REFERENCES gbp_connections(id) ON DELETE CASCADE,
  external_review_id  TEXT UNIQUE,
  author_name         TEXT,
  rating              INTEGER NOT NULL,    -- 1-5
  review_text         TEXT,
  review_time         TIMESTAMPTZ,
  response_text       TEXT,                -- published reply
  response_status     TEXT DEFAULT 'pending',  -- pending | ai_drafted | approved | published | skipped
  ai_draft            TEXT,                -- AI-generated response draft
  responded_at        TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gbp_reviews_facility ON gbp_reviews(facility_id);
CREATE INDEX IF NOT EXISTS idx_gbp_reviews_rating ON gbp_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_gbp_reviews_response ON gbp_reviews(response_status);

-- GBP profile sync log: audit trail of profile updates
CREATE TABLE IF NOT EXISTS gbp_profile_sync_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  sync_type     TEXT NOT NULL,           -- hours | photos | attributes | specials | full
  status        TEXT DEFAULT 'success',  -- success | failed | partial
  changes       JSONB DEFAULT '{}',
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gbp_sync_log_facility ON gbp_profile_sync_log(facility_id);
CREATE INDEX IF NOT EXISTS idx_gbp_sync_log_created ON gbp_profile_sync_log(created_at DESC);

-- GBP Q&A: questions posted on Google Business Profile
CREATE TABLE IF NOT EXISTS gbp_questions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id         UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  gbp_connection_id   UUID REFERENCES gbp_connections(id) ON DELETE CASCADE,
  external_question_id TEXT UNIQUE,
  author_name         TEXT,
  question_text       TEXT NOT NULL,
  question_time       TIMESTAMPTZ,
  answer_text         TEXT,
  answer_status       TEXT DEFAULT 'pending',  -- pending | ai_drafted | published | skipped
  ai_draft            TEXT,
  answered_at         TIMESTAMPTZ,
  upvote_count        INTEGER DEFAULT 0,
  synced_at           TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gbp_questions_facility ON gbp_questions(facility_id);
CREATE INDEX IF NOT EXISTS idx_gbp_questions_status ON gbp_questions(answer_status);

-- GBP Insights: cached performance metrics from GBP Insights API
CREATE TABLE IF NOT EXISTS gbp_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  search_views    INTEGER DEFAULT 0,     -- times listed in search results
  maps_views      INTEGER DEFAULT 0,     -- times listed on Google Maps
  website_clicks  INTEGER DEFAULT 0,
  direction_clicks INTEGER DEFAULT 0,
  phone_calls     INTEGER DEFAULT 0,
  photo_views     INTEGER DEFAULT 0,
  post_views      INTEGER DEFAULT 0,
  post_clicks     INTEGER DEFAULT 0,
  total_searches  INTEGER DEFAULT 0,     -- direct + discovery + branded
  direct_searches INTEGER DEFAULT 0,
  discovery_searches INTEGER DEFAULT 0,
  raw_data        JSONB DEFAULT '{}',
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(facility_id, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS idx_gbp_insights_facility ON gbp_insights(facility_id);
CREATE INDEX IF NOT EXISTS idx_gbp_insights_period ON gbp_insights(period_start DESC);

-- ============================================================
-- Attribution pipeline: extend partial_leads + campaign spend
-- ============================================================

ALTER TABLE partial_leads ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'partial';
ALTER TABLE partial_leads ADD COLUMN IF NOT EXISTS monthly_revenue NUMERIC(10,2);
ALTER TABLE partial_leads ADD COLUMN IF NOT EXISTS move_in_date DATE;
ALTER TABLE partial_leads ADD COLUMN IF NOT EXISTS fbclid TEXT;
ALTER TABLE partial_leads ADD COLUMN IF NOT EXISTS gclid TEXT;
ALTER TABLE partial_leads ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;
ALTER TABLE partial_leads ADD COLUMN IF NOT EXISTS lead_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_partial_leads_lead_status ON partial_leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_partial_leads_facility_status ON partial_leads(facility_id, lead_status);
CREATE INDEX IF NOT EXISTS idx_partial_leads_utm_campaign ON partial_leads(utm_campaign);

-- Campaign spend: daily spend data pulled from ad platforms
CREATE TABLE IF NOT EXISTS campaign_spend (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,        -- meta | google_ads
  date            DATE NOT NULL,
  campaign_name   TEXT,
  campaign_id     TEXT,
  utm_campaign    TEXT,
  spend           NUMERIC(10,2) NOT NULL DEFAULT 0,
  impressions     INTEGER DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(facility_id, platform, campaign_id, date)
);

CREATE INDEX IF NOT EXISTS idx_campaign_spend_facility ON campaign_spend(facility_id);
CREATE INDEX IF NOT EXISTS idx_campaign_spend_utm ON campaign_spend(utm_campaign);

-- ============================================================
-- Delinquency escalation pipeline
-- ============================================================

CREATE TABLE IF NOT EXISTS delinquency_escalations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  stage           TEXT NOT NULL,  -- late_notice | second_notice | pre_lien | lien_filed | auction_scheduled | auction_complete
  stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_stage_at   TIMESTAMPTZ,
  notes           TEXT,
  automated       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_delinquency_escalations_tenant ON delinquency_escalations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delinquency_escalations_facility ON delinquency_escalations(facility_id);
CREATE INDEX IF NOT EXISTS idx_delinquency_escalations_stage ON delinquency_escalations(stage);

-- Tenant communication log: all outreach across tabs
CREATE TABLE IF NOT EXISTS tenant_communications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL,  -- email | sms | call | in_person | mail
  type            TEXT NOT NULL,  -- payment_reminder | retention | upsell | remarketing | escalation | general
  subject         TEXT,
  body            TEXT,
  status          TEXT DEFAULT 'sent',  -- sent | delivered | opened | clicked | bounced | failed
  related_id      UUID,          -- links to upsell_opportunities.id, moveout_remarketing.id, etc.
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenant_comms_tenant ON tenant_communications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_comms_facility ON tenant_communications(facility_id);
CREATE INDEX IF NOT EXISTS idx_tenant_comms_type ON tenant_communications(type);

-- Business context documents uploaded per facility (not creative assets — business intel)
CREATE TABLE IF NOT EXISTS facility_context (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  type            TEXT NOT NULL,  -- competitor_info | business_plan | pricing_sheet | market_research | branding | other
  title           TEXT NOT NULL,
  content         TEXT,           -- extracted text content from uploaded docs
  file_url        TEXT,           -- original file URL if uploaded
  metadata        JSONB
);
CREATE INDEX IF NOT EXISTS idx_facility_context_facility ON facility_context(facility_id);

-- AI-generated marketing plans per facility
CREATE TABLE IF NOT EXISTS marketing_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  version         INTEGER DEFAULT 1,
  status          TEXT DEFAULT 'draft',  -- draft | active | archived
  plan_json       JSONB NOT NULL,        -- full structured plan
  spend_recommendation JSONB,            -- budget allocation recommendation
  assigned_playbooks TEXT[],             -- IDs of seasonal playbook triggers assigned
  generated_from  JSONB                  -- snapshot of inputs used to generate
);
CREATE INDEX IF NOT EXISTS idx_marketing_plans_facility ON marketing_plans(facility_id);

-- ============================================================
-- PMS (Property Management System) manual data per facility
-- ============================================================

-- Facility-level PMS snapshot: overall facility info from PMS export
CREATE TABLE IF NOT EXISTS facility_pms_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  total_units     INTEGER,
  occupied_units  INTEGER,
  occupancy_pct   NUMERIC(5,2),
  total_sqft      INTEGER,
  occupied_sqft   INTEGER,
  gross_potential NUMERIC(12,2),    -- total potential rent if 100% occupied at street rates
  actual_revenue  NUMERIC(12,2),    -- actual monthly rent collected
  delinquency_pct NUMERIC(5,2),
  move_ins_mtd    INTEGER DEFAULT 0,
  move_outs_mtd   INTEGER DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(facility_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_pms_snapshots_facility ON facility_pms_snapshots(facility_id);

-- Unit types: rows of unit inventory from PMS (one row per unit type per facility)
CREATE TABLE IF NOT EXISTS facility_pms_units (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  unit_type       TEXT NOT NULL,          -- e.g. '10×10 Climate'
  size_label      TEXT,                   -- e.g. '10x10'
  width_ft        NUMERIC(6,1),
  depth_ft        NUMERIC(6,1),
  sqft            NUMERIC(8,1),
  floor           TEXT,                   -- '1st', '2nd', 'outdoor', etc.
  features        TEXT[] DEFAULT '{}',    -- climate, drive_up, interior, elevator, power, alarmed
  total_count     INTEGER NOT NULL DEFAULT 0,
  occupied_count  INTEGER NOT NULL DEFAULT 0,
  vacant_count    INTEGER GENERATED ALWAYS AS (total_count - occupied_count) STORED,
  street_rate     NUMERIC(8,2),           -- current advertised rate
  actual_avg_rate NUMERIC(8,2),           -- avg rate tenants are actually paying
  web_rate        NUMERIC(8,2),           -- online/promo rate if different
  push_rate       NUMERIC(8,2),           -- rate you're pushing new tenants toward
  ecri_eligible   INTEGER DEFAULT 0,      -- units eligible for existing customer rate increase
  last_updated    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(facility_id, unit_type)
);
CREATE INDEX IF NOT EXISTS idx_pms_units_facility ON facility_pms_units(facility_id);

-- Rate history: track rate changes over time per unit type
CREATE TABLE IF NOT EXISTS facility_pms_rate_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  unit_type       TEXT NOT NULL,
  effective_date  DATE NOT NULL,
  street_rate     NUMERIC(8,2),
  web_rate        NUMERIC(8,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pms_rate_history_facility ON facility_pms_rate_history(facility_id);

-- Specials / promotions currently active per facility
CREATE TABLE IF NOT EXISTS facility_pms_specials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,          -- e.g. '1st Month Free', '50% Off 3 Months'
  description     TEXT,
  applies_to      TEXT[] DEFAULT '{}',    -- unit types this applies to, empty = all
  discount_type   TEXT DEFAULT 'fixed',   -- fixed | percent | months_free
  discount_value  NUMERIC(8,2),
  min_lease_months INTEGER DEFAULT 1,
  start_date      DATE,
  end_date        DATE,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pms_specials_facility ON facility_pms_specials(facility_id);

-- Monthly revenue history (from storEDGE Annual Revenue & Occupancy report)
CREATE TABLE IF NOT EXISTS facility_pms_revenue_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  year            INTEGER NOT NULL,
  month           TEXT NOT NULL,
  quarter         INTEGER,
  revenue         NUMERIC(12,2) DEFAULT 0,
  monthly_tax     NUMERIC(10,2) DEFAULT 0,
  move_ins        INTEGER DEFAULT 0,
  move_outs       INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(facility_id, year, month)
);
CREATE INDEX IF NOT EXISTS idx_pms_revenue_history_facility ON facility_pms_revenue_history(facility_id);

-- Aging / delinquency detail (from storEDGE Aging report)
CREATE TABLE IF NOT EXISTS facility_pms_aging (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  unit            TEXT NOT NULL,
  tenant_name     TEXT,
  bucket_0_30     NUMERIC(10,2) DEFAULT 0,
  bucket_31_60    NUMERIC(10,2) DEFAULT 0,
  bucket_61_90    NUMERIC(10,2) DEFAULT 0,
  bucket_91_120   NUMERIC(10,2) DEFAULT 0,
  bucket_120_plus NUMERIC(10,2) DEFAULT 0,
  total           NUMERIC(10,2) DEFAULT 0,
  move_out_date   DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pms_aging_facility ON facility_pms_aging(facility_id, snapshot_date);

-- Tenant length of stay / lead source tracking (from storEDGE Length of Stay report)
CREATE TABLE IF NOT EXISTS facility_pms_length_of_stay (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  tenant_name     TEXT NOT NULL,
  latest_unit     TEXT,
  move_in         DATE,
  move_out        DATE,
  days_in_unit    INTEGER DEFAULT 0,
  lead_source     TEXT,
  lead_category   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pms_los_facility ON facility_pms_length_of_stay(facility_id);

-- Rent roll tenant detail (from storEDGE Rent Roll)
CREATE TABLE IF NOT EXISTS facility_pms_rent_roll (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  unit            TEXT NOT NULL,
  size_label      TEXT,
  tenant_name     TEXT,
  account         TEXT,
  rental_start    DATE,
  paid_thru       DATE,
  rent_rate       NUMERIC(8,2),
  insurance_premium NUMERIC(8,2),
  total_due       NUMERIC(10,2) DEFAULT 0,
  days_past_due   INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pms_rent_roll_facility ON facility_pms_rent_roll(facility_id, snapshot_date);

-- Per-tenant rate detail (from storEDGE Rent Rates by Tenant) — powers ECRI engine
CREATE TABLE IF NOT EXISTS facility_pms_tenant_rates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id       UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  snapshot_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  unit              TEXT NOT NULL,
  size_label        TEXT,               -- e.g. '10x20'
  unit_type         TEXT,               -- e.g. 'parking', 'Self-Storage'
  access_type       TEXT,               -- 'Indoor', 'Outdoor'
  tenant_name       TEXT,
  moved_in          DATE,
  standard_rate     NUMERIC(8,2),       -- street rate for this unit
  actual_rate       NUMERIC(8,2),       -- what tenant is paying
  paid_rate         NUMERIC(8,2),       -- after discounts
  rate_variance     NUMERIC(8,2),       -- actual - standard (positive = paying above street)
  discount          NUMERIC(8,2) DEFAULT 0,
  discount_desc     TEXT,
  days_as_tenant    INTEGER DEFAULT 0,  -- computed from moved_in
  ecri_flag         BOOLEAN DEFAULT FALSE,  -- computed: eligible for rate increase
  ecri_suggested    NUMERIC(8,2),       -- suggested new rate
  ecri_revenue_lift NUMERIC(8,2),       -- monthly revenue gain if applied
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pms_tenant_rates_facility ON facility_pms_tenant_rates(facility_id, snapshot_date);
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
