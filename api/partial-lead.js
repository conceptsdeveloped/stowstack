import { query, queryOne } from './_db.js'
import crypto from 'crypto'
import { requireAdmin } from './_auth.js'

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function hashIp(ip) {
  if (!ip) return null
  return crypto.createHash('sha256').update(ip + (process.env.IP_SALT || 'stowstack')).digest('hex').slice(0, 16)
}

function calculateLeadScore({ fieldsCompleted, totalFields, timeOnPage, scrollDepth, exitIntent, hasEmail, hasPhone }) {
  let score = 0

  // Field completion (0-40 points)
  if (totalFields > 0) {
    score += Math.round((fieldsCompleted / totalFields) * 40)
  }

  // Time on page (0-20 points) — more time = more engaged
  if (timeOnPage > 120) score += 20
  else if (timeOnPage > 60) score += 15
  else if (timeOnPage > 30) score += 10
  else if (timeOnPage > 10) score += 5

  // Scroll depth (0-15 points)
  if (scrollDepth > 80) score += 15
  else if (scrollDepth > 50) score += 10
  else if (scrollDepth > 25) score += 5

  // Contact info (0-25 points)
  if (hasEmail) score += 15
  if (hasPhone) score += 10

  // Exit intent bonus — they tried to leave but we caught them
  if (exitIntent) score += 5

  return Math.min(score, 100)
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()

  // GET — admin fetch partial leads (requires admin key)
  if (req.method === 'GET') {
    if (!requireAdmin(req, res)) return

    try {
      const { status, days, limit } = req.query || {}
      let sql = `
        SELECT pl.*, lp.title AS page_title, lp.slug AS page_slug
        FROM partial_leads pl
        LEFT JOIN landing_pages lp ON pl.landing_page_id = lp.id
        WHERE pl.converted = FALSE
      `
      const params = []
      let paramIdx = 1

      if (status) {
        sql += ` AND pl.recovery_status = $${paramIdx++}`
        params.push(status)
      }

      if (days) {
        sql += ` AND pl.created_at >= NOW() - INTERVAL '1 day' * $${paramIdx++}`
        params.push(parseInt(days) || 7)
      }

      sql += ` ORDER BY pl.lead_score DESC, pl.created_at DESC`
      sql += ` LIMIT $${paramIdx++}`
      params.push(parseInt(limit) || 50)

      const leads = await query(sql, params)

      // Aggregate stats
      const stats = await queryOne(`
        SELECT
          COUNT(*) FILTER (WHERE converted = FALSE AND recovery_status = 'pending') AS pending,
          COUNT(*) FILTER (WHERE converted = FALSE AND recovery_status = 'active') AS in_recovery,
          COUNT(*) FILTER (WHERE converted = TRUE) AS recovered,
          COUNT(*) FILTER (WHERE recovery_status = 'exhausted') AS exhausted,
          COUNT(*) AS total,
          ROUND(AVG(lead_score)) AS avg_score,
          COUNT(*) FILTER (WHERE lead_score >= 60) AS hot_leads
        FROM partial_leads
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `)

      return res.status(200).json({ leads, stats })
    } catch (err) {
      console.error('Partial leads GET error:', err)
      return res.status(500).json({ error: 'Failed to fetch partial leads' })
    }
  }

  // POST — upsert partial lead data (called from frontend on field blur)
  if (req.method === 'POST') {
    try {
      const {
        sessionId, landingPageId, facilityId,
        email, phone, name, unitSize,
        fieldsCompleted, totalFields,
        scrollDepth, timeOnPage, exitIntent,
        utmSource, utmMedium, utmCampaign, utmContent,
        fbclid, gclid,
        referrer, userAgent
      } = req.body || {}

      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' })
      }

      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress
      const ipHash = hashIp(ip)

      const score = calculateLeadScore({
        fieldsCompleted: fieldsCompleted || 0,
        totalFields: totalFields || 1,
        timeOnPage: timeOnPage || 0,
        scrollDepth: scrollDepth || 0,
        exitIntent: !!exitIntent,
        hasEmail: !!email,
        hasPhone: !!phone,
      })

      // Calculate when to start recovery (1 hour after last activity)
      const nextRecoveryAt = email
        ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
        : null

      const result = await queryOne(
        `INSERT INTO partial_leads (
          session_id, landing_page_id, facility_id,
          email, phone, name, unit_size,
          fields_completed, total_fields,
          scroll_depth, time_on_page, exit_intent,
          utm_source, utm_medium, utm_campaign, utm_content,
          fbclid, gclid,
          referrer, user_agent, ip_hash,
          lead_score, next_recovery_at,
          recovery_status, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $22, $23, $17, $18, $19, $20, $21,
          CASE WHEN $4 IS NOT NULL THEN 'pending' ELSE 'no_email' END,
          NOW()
        )
        ON CONFLICT (session_id) DO UPDATE SET
          email = COALESCE(EXCLUDED.email, partial_leads.email),
          phone = COALESCE(EXCLUDED.phone, partial_leads.phone),
          name = COALESCE(EXCLUDED.name, partial_leads.name),
          unit_size = COALESCE(EXCLUDED.unit_size, partial_leads.unit_size),
          fields_completed = GREATEST(EXCLUDED.fields_completed, partial_leads.fields_completed),
          total_fields = COALESCE(EXCLUDED.total_fields, partial_leads.total_fields),
          scroll_depth = GREATEST(EXCLUDED.scroll_depth, partial_leads.scroll_depth),
          time_on_page = GREATEST(EXCLUDED.time_on_page, partial_leads.time_on_page),
          exit_intent = partial_leads.exit_intent OR EXCLUDED.exit_intent,
          fbclid = COALESCE(EXCLUDED.fbclid, partial_leads.fbclid),
          gclid = COALESCE(EXCLUDED.gclid, partial_leads.gclid),
          lead_score = GREATEST(EXCLUDED.lead_score, partial_leads.lead_score),
          next_recovery_at = CASE
            WHEN partial_leads.recovery_status = 'pending' AND EXCLUDED.email IS NOT NULL
            THEN COALESCE(EXCLUDED.next_recovery_at, partial_leads.next_recovery_at)
            ELSE partial_leads.next_recovery_at
          END,
          recovery_status = CASE
            WHEN partial_leads.recovery_status = 'no_email' AND EXCLUDED.email IS NOT NULL THEN 'pending'
            ELSE partial_leads.recovery_status
          END,
          updated_at = NOW()
        RETURNING id, lead_score`,
        [
          sessionId, landingPageId || null, facilityId || null,
          email || null, phone || null, name || null, unitSize || null,
          fieldsCompleted || 0, totalFields || 0,
          scrollDepth || 0, timeOnPage || 0, !!exitIntent,
          utmSource || null, utmMedium || null, utmCampaign || null, utmContent || null,
          referrer || null, userAgent || null, ipHash,
          score, nextRecoveryAt,
          fbclid || null, gclid || null,
        ]
      )

      return res.status(200).json({ success: true, id: result?.id, score: result?.lead_score })
    } catch (err) {
      console.error('Partial lead upsert error:', err)
      return res.status(500).json({ error: 'Failed to save partial lead' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
