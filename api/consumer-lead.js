import { query, queryOne } from './_db.js'
import { sendPushToAll } from './_push.js'

const ALLOWED_ORIGINS = [
  'https://stowstack.co',
  'https://www.stowstack.co',
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

/**
 * POST /api/consumer-lead
 *
 * Converts a partial lead into a full consumer lead.
 * Called when a visitor submits their contact info on a landing page
 * (exit intent popup, CTA form, etc.)
 *
 * Sets converted=true, lead_status='new', and stores click IDs for attribution.
 */
export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      sessionId, email, phone, name, unitSize,
      facilityId, landingPageId,
      fbclid, gclid,
    } = req.body || {}

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' })
    }
    if (!email && !phone) {
      return res.status(400).json({ error: 'email or phone is required' })
    }

    // Update the existing partial_lead to mark as converted
    const result = await queryOne(
      `UPDATE partial_leads SET
        converted = TRUE,
        converted_at = NOW(),
        lead_status = CASE WHEN lead_status = 'partial' THEN 'new' ELSE lead_status END,
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        name = COALESCE($4, name),
        unit_size = COALESCE($5, unit_size),
        fbclid = COALESCE($6, fbclid),
        gclid = COALESCE($7, gclid),
        status_updated_at = NOW(),
        updated_at = NOW()
      WHERE session_id = $1
      RETURNING id, lead_status, email, name, facility_id`,
      [sessionId, email || null, phone || null, name || null, unitSize || null, fbclid || null, gclid || null]
    )

    // If no partial_lead exists yet, create one directly as a converted lead
    if (!result) {
      const created = await queryOne(
        `INSERT INTO partial_leads (
          session_id, landing_page_id, facility_id,
          email, phone, name, unit_size,
          fbclid, gclid,
          converted, converted_at, lead_status, status_updated_at,
          recovery_status, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, NOW(), 'new', NOW(), 'converted', NOW())
        RETURNING id, lead_status, email, name, facility_id`,
        [sessionId, landingPageId || null, facilityId || null, email || null, phone || null, name || null, unitSize || null, fbclid || null, gclid || null]
      )

      if (created) {
        await logActivity(created)
      }

      return res.status(200).json({ success: true, id: created?.id, status: 'new' })
    }

    // Log conversion activity
    await logActivity(result)

    return res.status(200).json({ success: true, id: result.id, status: result.lead_status })
  } catch (err) {
    console.error('Consumer lead conversion error:', err)
    return res.status(500).json({ error: 'Failed to convert lead' })
  }
}

async function logActivity(lead) {
  try {
    await query(
      `INSERT INTO activity_log (type, facility_id, lead_name, detail, meta)
       VALUES ('consumer_lead_created', $1, $2, $3, $4)`,
      [
        lead.facility_id,
        lead.name || lead.email || 'Unknown',
        `New consumer lead: ${lead.email || 'no email'}`,
        JSON.stringify({ lead_id: lead.id, source: 'landing_page' }),
      ]
    )
  } catch {
    // Silent — don't fail the conversion for an activity log error
  }

  // Push notification to admin
  sendPushToAll({
    title: 'New Landing Page Lead',
    body: `${lead.name || lead.email || 'New visitor'} submitted contact info`,
    url: '/admin',
    tag: 'consumer-lead',
    phone: lead.phone || null,
    leadId: lead.id,
  }).catch(err => console.error('Push notification failed:', err.message))
}
