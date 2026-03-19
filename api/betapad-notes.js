import { query } from './_db.js'
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
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  if (req.method === 'OPTIONS') return res.status(200).json({})
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

  // GET — fetch all notes, newest first
  if (req.method === 'GET') {
    try {
      const { sessionId, limit } = req.query || {}
      const params = []
      let sql = 'SELECT * FROM betapad_notes'
      if (sessionId) {
        params.push(sessionId)
        sql += ` WHERE session_id = $${params.length}`
      }
      sql += ' ORDER BY created_at DESC'
      if (limit) {
        params.push(parseInt(limit, 10) || 100)
        sql += ` LIMIT $${params.length}`
      } else {
        sql += ' LIMIT 500'
      }
      const notes = await query(sql, params)
      return res.json({ notes })
    } catch (err) {
      console.error('BetaPad GET error:', err)
      return res.status(500).json({ error: 'Failed to fetch notes' })
    }
  }

  // POST — save a new entry
  if (req.method === 'POST') {
    const { sessionId, entryType, entryData } = req.body || {}
    if (!sessionId || !entryType || !entryData) {
      return res.status(400).json({ error: 'sessionId, entryType, and entryData are required' })
    }

    try {
      const rows = await query(
        `INSERT INTO betapad_notes (session_id, entry_type, entry_data)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [sessionId, entryType, JSON.stringify(entryData)]
      )
      return res.json({ note: rows[0] })
    } catch (err) {
      console.error('BetaPad POST error:', err)
      return res.status(500).json({ error: 'Failed to save note' })
    }
  }

  // DELETE — remove by id
  if (req.method === 'DELETE') {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const id = url.searchParams.get('id')
    if (!id) return res.status(400).json({ error: 'id is required' })

    try {
      await query('DELETE FROM betapad_notes WHERE id = $1', [id])
      return res.json({ success: true })
    } catch (err) {
      console.error('BetaPad DELETE error:', err)
      return res.status(500).json({ error: 'Failed to delete note' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
