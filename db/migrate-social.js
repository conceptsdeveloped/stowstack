/**
 * Social Media Command Center — Database Migration
 *
 * New tables for social post management. Does NOT modify any existing tables.
 * Run: node db/migrate-social.js
 */
import { getPool } from '../api/_db.js'

async function migrate() {
  const pool = getPool()

  await pool.query(`
    -- Social posts (Facebook, Instagram, GBP organic posts — NOT ads)
    CREATE TABLE IF NOT EXISTS social_posts (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      platform        TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'gbp')),
      post_type       TEXT NOT NULL DEFAULT 'tip' CHECK (post_type IN (
        'promotion', 'tip', 'testimonial', 'seasonal', 'behind_the_scenes',
        'unit_spotlight', 'community', 'holiday'
      )),
      content         TEXT NOT NULL,
      hashtags        TEXT[] DEFAULT '{}',
      media_urls      TEXT[] DEFAULT '{}',
      cta_url         TEXT,
      status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'scheduled', 'publishing', 'published', 'failed'
      )),
      scheduled_at    TIMESTAMPTZ,
      published_at    TIMESTAMPTZ,
      external_post_id TEXT,
      external_url    TEXT,
      error_message   TEXT,
      engagement      JSONB DEFAULT '{"reach":0,"impressions":0,"likes":0,"comments":0,"shares":0,"clicks":0}',
      ai_generated    BOOLEAN DEFAULT false,
      batch_id        UUID,
      suggested_image TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_social_posts_facility ON social_posts(facility_id, status);
    CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_posts(scheduled_at) WHERE status = 'scheduled';
    CREATE INDEX IF NOT EXISTS idx_social_posts_batch ON social_posts(batch_id) WHERE batch_id IS NOT NULL;
  `)

  console.log('Social media tables created successfully')
  await pool.end()
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
