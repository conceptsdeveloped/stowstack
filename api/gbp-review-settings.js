import { query, queryOne } from './_db.js'
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
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(200).end()

  const authErr = requireAdmin(req)
  if (authErr) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const { facilityId } = req.method === 'GET' ? (req.query || {}) : (req.body || {})
    if (!facilityId) return res.status(400).json({ error: 'Missing facilityId' })

    // GET — current review response settings
    if (req.method === 'GET') {
      const conn = await queryOne(
        `SELECT sync_config FROM gbp_connections WHERE facility_id = $1`,
        [facilityId]
      )

      const config = conn?.sync_config || {}
      return res.json({
        success: true,
        settings: {
          autoRespond: config.auto_respond || false,
          autoRespondMinRating: config.auto_respond_min_rating || 4,
          responseTone: config.response_tone || 'friendly',
        },
      })
    }

    // PATCH — update settings
    if (req.method === 'PATCH') {
      const { autoRespond, autoRespondMinRating, responseTone } = req.body

      // Get existing config
      const conn = await queryOne(
        `SELECT id, sync_config FROM gbp_connections WHERE facility_id = $1`,
        [facilityId]
      )

      if (!conn) {
        return res.status(404).json({ error: 'No GBP connection found for this facility' })
      }

      const config = conn.sync_config || {}

      if (autoRespond !== undefined) config.auto_respond = !!autoRespond
      if (autoRespondMinRating !== undefined) {
        const rating = parseInt(autoRespondMinRating)
        if (rating >= 1 && rating <= 5) config.auto_respond_min_rating = rating
      }
      if (responseTone !== undefined) {
        if (['friendly', 'professional', 'casual'].includes(responseTone)) {
          config.response_tone = responseTone
        }
      }

      await query(
        `UPDATE gbp_connections SET sync_config = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(config), conn.id]
      )

      return res.json({
        success: true,
        settings: {
          autoRespond: config.auto_respond || false,
          autoRespondMinRating: config.auto_respond_min_rating || 4,
          responseTone: config.response_tone || 'friendly',
        },
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('gbp-review-settings error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
