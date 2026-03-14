import { query } from './_db.js'

const ADMIN_KEY = process.env.ADMIN_SECRET || 'stowstack-admin-2024'

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
  return req.headers['x-admin-key'] === ADMIN_KEY
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

  // PATCH — update facility status
  if (req.method === 'PATCH') {
    const { id, status } = req.body || {}
    if (!id || !status) return res.status(400).json({ error: 'id and status required' })

    const VALID_STATUSES = ['intake', 'scraped', 'briefed', 'generating', 'review', 'approved', 'live', 'reporting']
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' })

    try {
      await query('UPDATE facilities SET status = $1 WHERE id = $2', [status, id])
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('admin-facilities PATCH failed:', err.message)
      return res.status(500).json({ error: 'Failed to update facility' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
