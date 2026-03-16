import { query } from './_db.js'

export const config = { maxDuration: 15 }

const ADMIN_KEY = process.env.ADMIN_SECRET || 'stowstack-admin-2024'

const ALLOWED_ORIGINS = [
  'https://stowstack.co', 'https://www.stowstack.co',
  'http://localhost:5173', 'http://localhost:3000',
]

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' })

  // GET — list context docs for a facility
  if (req.method === 'GET') {
    const { facilityId } = req.query
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })
    try {
      const docs = await query(
        `SELECT * FROM facility_context WHERE facility_id = $1 ORDER BY created_at DESC`, [facilityId]
      )
      return res.status(200).json({ docs })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // POST — add a context document
  if (req.method === 'POST') {
    const { facilityId, type, title, content, fileUrl, metadata } = req.body || {}
    if (!facilityId || !type || !title) return res.status(400).json({ error: 'facilityId, type, and title required' })
    try {
      const rows = await query(
        `INSERT INTO facility_context (facility_id, type, title, content, file_url, metadata)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [facilityId, type, title, content || null, fileUrl || null, JSON.stringify(metadata || {})]
      )
      return res.status(200).json({ doc: rows[0] })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // DELETE
  if (req.method === 'DELETE') {
    const { docId } = req.body || {}
    if (!docId) return res.status(400).json({ error: 'docId required' })
    try {
      await query(`DELETE FROM facility_context WHERE id = $1`, [docId])
      return res.status(200).json({ success: true })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
