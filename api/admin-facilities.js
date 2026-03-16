import { query } from './_db.js'
import { requireAdmin, isAdmin } from './_auth.js'

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

function checkAuth(req) {
  return isAdmin(req)
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  // GET — fetch all facilities with their latest places data
  if (req.method === 'GET') {
    try {
      const facilities = await query(`
        SELECT
          f.id,
          f.created_at,
          f.name,
          f.location,
          f.contact_name,
          f.contact_email,
          f.contact_phone,
          f.occupancy_range,
          f.total_units,
          f.biggest_issue,
          f.notes,
          f.status,
          f.google_address,
          f.google_rating,
          f.review_count,
          f.website,
          f.google_maps_url,
          f.google_phone,
          pd.photos,
          pd.reviews
        FROM facilities f
        LEFT JOIN LATERAL (
          SELECT photos, reviews
          FROM places_data
          WHERE facility_id = f.id
          ORDER BY fetched_at DESC
          LIMIT 1
        ) pd ON true
        ORDER BY f.created_at DESC
      `)
      return res.status(200).json({ facilities })
    } catch (err) {
      console.error('admin-facilities GET failed:', err.message)
      return res.status(500).json({ error: 'Failed to fetch facilities' })
    }
  }

  // PATCH — update facility fields
  if (req.method === 'PATCH') {
    const { id, status, ...fields } = req.body || {}
    if (!id) return res.status(400).json({ error: 'id required' })

    const VALID_STATUSES = ['intake', 'scraped', 'briefed', 'generating', 'review', 'approved', 'live', 'reporting']
    const EDITABLE_FIELDS = [
      'name', 'location', 'contact_name', 'contact_email', 'contact_phone',
      'occupancy_range', 'total_units', 'biggest_issue', 'notes',
      'google_address', 'google_phone', 'website', 'google_rating', 'review_count',
    ]

    try {
      const updates = []
      const params = []
      let idx = 1

      if (status) {
        if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' })
        updates.push(`status = $${idx++}`)
        params.push(status)
      }

      for (const [key, value] of Object.entries(fields)) {
        if (EDITABLE_FIELDS.includes(key)) {
          updates.push(`${key} = $${idx++}`)
          params.push(value === '' ? null : value)
        }
      }

      if (!updates.length) return res.status(400).json({ error: 'Nothing to update' })

      params.push(id)
      const rows = await query(`UPDATE facilities SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params)
      return res.status(200).json({ success: true, facility: rows[0] })
    } catch (err) {
      console.error('admin-facilities PATCH failed:', err.message)
      return res.status(500).json({ error: 'Failed to update facility' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
