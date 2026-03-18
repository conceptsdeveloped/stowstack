import { query } from './_db.js'
import { rateLimit, rateLimitResponse } from './_ratelimit.js'

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

const VALID_EVENT_TYPES = ['click', 'scroll', 'section_view', 'form_focus', 'cta_hover', 'page_load']

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Rate limit: 100 events per IP per minute
  try {
    const { allowed, resetAt } = await rateLimit(req, { key: 'page-track', limit: 100, windowSeconds: 60 })
    if (!allowed) return rateLimitResponse(res, resetAt)
  } catch { /* fail open */ }

  try {
    const { landingPageId, facilityId, sessionId, utmSource, utmCampaign, events } = req.body

    if (!landingPageId || !facilityId || !sessionId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'No events provided' })
    }

    // Limit batch size
    const batch = events.slice(0, 50)

    // Batch insert
    const values = []
    const params = []
    let paramIdx = 1

    for (const evt of batch) {
      if (!VALID_EVENT_TYPES.includes(evt.event_type)) continue

      values.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`)
      params.push(
        landingPageId,
        facilityId,
        sessionId,
        evt.event_type,
        evt.element_id || null,
        evt.element_text?.slice(0, 100) || null,
        evt.section_index ?? null,
        evt.x_pct ?? null,
        evt.y_pct ?? null,
        evt.scroll_depth ?? null,
        evt.viewport_width ?? null,
        evt.viewport_height ?? null,
        evt.time_on_page ?? 0,
        utmSource || null
      )
    }

    if (values.length > 0) {
      await query(
        `INSERT INTO page_interactions (landing_page_id, facility_id, session_id, event_type, element_id, element_text, section_index, x_pct, y_pct, scroll_depth, viewport_width, viewport_height, time_on_page, utm_source)
         VALUES ${values.join(', ')}`,
        params
      )
    }

    return res.status(200).json({ success: true, recorded: values.length })
  } catch (err) {
    console.error('page-interactions error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
