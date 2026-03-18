import { query } from './_db.js'

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

const VALID_SOURCES = [
  'facebook_instagram_ad',
  'google_search',
  'drove_by_signage',
  'friend_family_referral',
  'repeat_customer',
  'other',
]

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    // POST — Submit a walk-in attribution
    if (req.method === 'POST') {
      const { facilityId, accessCode, source, sawOnlineAd, tenantName, unitRented, loggedBy } = req.body

      // Validate facility access — either by facilityId directly or via access_code
      let resolvedFacilityId = facilityId
      if (!resolvedFacilityId && accessCode) {
        const fac = await query(
          `SELECT f.id FROM facilities f
           JOIN clients c ON c.facility_id = f.id
           WHERE c.access_code = $1 OR f.access_code = $1
           LIMIT 1`,
          [accessCode]
        )
        if (fac.length > 0) resolvedFacilityId = fac[0].id
      }

      if (!resolvedFacilityId) {
        return res.status(400).json({ error: 'Missing or invalid facility identifier' })
      }

      if (!source || !VALID_SOURCES.includes(source)) {
        return res.status(400).json({ error: 'Invalid attribution source' })
      }

      const rows = await query(
        `INSERT INTO walkin_attributions (facility_id, source, saw_online_ad, tenant_name, unit_rented, logged_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, created_at`,
        [
          resolvedFacilityId,
          source,
          sawOnlineAd != null ? sawOnlineAd : null,
          tenantName || null,
          unitRented || null,
          loggedBy || null,
        ]
      )

      // Log activity
      query(
        `INSERT INTO activity_log (type, facility_id, detail)
         VALUES ('walkin_logged', $1, $2)`,
        [resolvedFacilityId, `Walk-in: ${source}${tenantName ? ` — ${tenantName}` : ''}`]
      ).catch(err => console.error('Activity log error:', err.message))

      return res.status(201).json({ success: true, data: rows[0] })
    }

    // GET — List walk-in attributions for a facility
    if (req.method === 'GET') {
      const { facilityId, accessCode, startDate, endDate } = req.query || {}

      let resolvedFacilityId = facilityId
      if (!resolvedFacilityId && accessCode) {
        const fac = await query(
          `SELECT f.id FROM facilities f
           JOIN clients c ON c.facility_id = f.id
           WHERE c.access_code = $1 OR f.access_code = $1
           LIMIT 1`,
          [accessCode]
        )
        if (fac.length > 0) resolvedFacilityId = fac[0].id
      }

      if (!resolvedFacilityId) {
        return res.status(400).json({ error: 'Missing facility identifier' })
      }

      let dateFilter = ''
      const params = [resolvedFacilityId]

      if (startDate) {
        params.push(startDate)
        dateFilter += ` AND created_at >= $${params.length}`
      }
      if (endDate) {
        params.push(endDate)
        dateFilter += ` AND created_at <= $${params.length}`
      }

      const rows = await query(
        `SELECT * FROM walkin_attributions
         WHERE facility_id = $1 ${dateFilter}
         ORDER BY created_at DESC
         LIMIT 200`,
        params
      )

      // Also get summary counts
      const summary = await query(
        `SELECT source, COUNT(*)::int as count,
                COUNT(*) FILTER (WHERE saw_online_ad = true)::int as ad_influenced
         FROM walkin_attributions
         WHERE facility_id = $1 ${dateFilter}
         GROUP BY source
         ORDER BY count DESC`,
        params
      )

      return res.json({ success: true, data: rows, summary })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('walkin-attribution error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
