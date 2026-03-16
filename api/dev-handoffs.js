import { query, queryOne } from './_db.js'
import { isAdmin } from './_auth.js'

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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  if (req.method === 'OPTIONS') return res.status(200).json({})
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

  // GET — all active handoffs
  if (req.method === 'GET') {
    try {
      const handoffs = await query(
        `SELECT * FROM dev_handoffs WHERE status != 'archived' ORDER BY created_at DESC`
      )
      return res.json({ handoffs })
    } catch (err) {
      console.error('Dev handoffs GET error:', err)
      return res.status(500).json({ error: 'Failed to fetch handoffs' })
    }
  }

  // POST — create a new handoff
  if (req.method === 'POST') {
    const { fromDev, toDev, title, body, commitHash } = req.body || {}
    if (!fromDev) return res.status(400).json({ error: 'fromDev is required' })
    if (!title?.trim()) return res.status(400).json({ error: 'title is required' })
    if (!body?.trim()) return res.status(400).json({ error: 'body is required' })

    try {
      const rows = await query(
        `INSERT INTO dev_handoffs (from_dev, to_dev, title, body, commit_hash, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         RETURNING *`,
        [fromDev, toDev || null, title.trim(), body.trim(), commitHash || null]
      )
      return res.json({ handoff: rows[0] })
    } catch (err) {
      console.error('Dev handoffs POST error:', err)
      return res.status(500).json({ error: 'Failed to create handoff' })
    }
  }

  // PATCH — update status (acknowledge, archive)
  if (req.method === 'PATCH') {
    const { id, status } = req.body || {}
    if (!id) return res.status(400).json({ error: 'id is required' })
    const validStatuses = ['active', 'acknowledged', 'archived']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` })
    }

    try {
      const rows = await query(
        `UPDATE dev_handoffs SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status || 'acknowledged', id]
      )
      if (rows.length === 0) return res.status(404).json({ error: 'Handoff not found' })
      return res.json({ handoff: rows[0] })
    } catch (err) {
      console.error('Dev handoffs PATCH error:', err)
      return res.status(500).json({ error: 'Failed to update handoff' })
    }
  }

  // DELETE — remove a handoff
  if (req.method === 'DELETE') {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'id is required' })

    try {
      await query(`DELETE FROM dev_handoffs WHERE id = $1`, [id])
      return res.json({ success: true })
    } catch (err) {
      console.error('Dev handoffs DELETE error:', err)
      return res.status(500).json({ error: 'Failed to remove handoff' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
