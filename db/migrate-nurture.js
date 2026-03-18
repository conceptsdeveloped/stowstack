/**
 * Lead Nurture Engine — Database Migration
 *
 * New tables for multi-channel nurture sequences.
 * Does NOT modify drip_sequences, partial_leads, or any existing tables.
 * Run: node db/migrate-nurture.js
 */
import { getPool } from '../api/_db.js'

async function migrate() {
  const pool = getPool()

  await pool.query(`
    -- Nurture sequence definitions (configurable, not hardcoded)
    CREATE TABLE IF NOT EXISTS nurture_sequences (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      trigger_type    TEXT NOT NULL CHECK (trigger_type IN (
        'landing_page_abandon', 'reservation_abandon',
        'post_move_in', 'win_back', 'post_audit', 'custom'
      )),
      status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
      steps           JSONB NOT NULL DEFAULT '[]',
      exit_conditions JSONB DEFAULT '["converted", "unsubscribed"]',
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );

    -- Active nurture enrollments
    CREATE TABLE IF NOT EXISTS nurture_enrollments (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sequence_id     UUID NOT NULL REFERENCES nurture_sequences(id) ON DELETE CASCADE,
      facility_id     UUID NOT NULL,
      lead_id         UUID,
      tenant_id       UUID,
      contact_name    TEXT,
      contact_email   TEXT,
      contact_phone   TEXT,
      current_step    INTEGER DEFAULT 0,
      status          TEXT DEFAULT 'active' CHECK (status IN (
        'active', 'paused', 'completed', 'converted', 'unsubscribed', 'failed'
      )),
      enrolled_at     TIMESTAMPTZ DEFAULT NOW(),
      next_send_at    TIMESTAMPTZ,
      completed_at    TIMESTAMPTZ,
      exit_reason     TEXT,
      metadata        JSONB DEFAULT '{}',
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    -- Individual message send log
    CREATE TABLE IF NOT EXISTS nurture_messages (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      enrollment_id   UUID NOT NULL REFERENCES nurture_enrollments(id) ON DELETE CASCADE,
      step_number     INTEGER NOT NULL,
      channel         TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
      to_address      TEXT NOT NULL,
      subject         TEXT,
      body            TEXT NOT NULL,
      status          TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'sent', 'delivered', 'opened', 'clicked',
        'replied', 'bounced', 'failed', 'unsubscribed'
      )),
      external_id     TEXT,
      sent_at         TIMESTAMPTZ,
      delivered_at    TIMESTAMPTZ,
      opened_at       TIMESTAMPTZ,
      clicked_at      TIMESTAMPTZ,
      error_message   TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_nurture_seq_facility ON nurture_sequences(facility_id);
    CREATE INDEX IF NOT EXISTS idx_nurture_enroll_status ON nurture_enrollments(status, next_send_at);
    CREATE INDEX IF NOT EXISTS idx_nurture_enroll_sequence ON nurture_enrollments(sequence_id);
    CREATE INDEX IF NOT EXISTS idx_nurture_msg_enrollment ON nurture_messages(enrollment_id);
  `)

  console.log('Nurture engine tables created successfully')
  await pool.end()
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
