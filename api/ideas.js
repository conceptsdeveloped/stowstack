import { query, queryOne } from './_db.js'
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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return isAdmin(req)
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  if (req.method === 'OPTIONS') return res.status(200).json({})
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  // GET — list all ideas
  if (req.method === 'GET') {
    try {
      const ideas = await query(`SELECT * FROM ideas ORDER BY created_at DESC`)
      return res.json({ ideas })
    } catch (err) {
      console.error('Ideas GET error:', err)
      return res.status(500).json({ error: 'Failed to fetch ideas' })
    }
  }

  // POST — add new idea
  if (req.method === 'POST') {
    const { title, description, category, priority } = req.body || {}
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' })

    try {
      const rows = await query(
        `INSERT INTO ideas (title, description, category, priority, status, votes)
         VALUES ($1, $2, $3, $4, 'new', 0)
         RETURNING *`,
        [title.trim(), (description || '').trim(), category || 'general', priority || 'medium']
      )
      return res.json({ idea: rows[0] })
    } catch (err) {
      console.error('Ideas POST error:', err)
      return res.status(500).json({ error: 'Failed to create idea' })
    }
  }

  // PATCH — update idea
  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body || {}
    if (!id) return res.status(400).json({ error: 'id is required' })

    try {
      const existing = await queryOne(`SELECT * FROM ideas WHERE id = $1`, [id])
      if (!existing) return res.status(404).json({ error: 'Idea not found' })

      const allowed = ['title', 'description', 'category', 'priority', 'status', 'votes']
      const setClauses = []
      const values = []
      let paramIdx = 1

      for (const key of allowed) {
        if (updates[key] !== undefined) {
          setClauses.push(`${key} = $${paramIdx++}`)
          values.push(updates[key])
        }
      }
      setClauses.push(`updated_at = NOW()`)
      values.push(id)

      const rows = await query(
        `UPDATE ideas SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
        values
      )
      return res.json({ idea: rows[0] })
    } catch (err) {
      console.error('Ideas PATCH error:', err)
      return res.status(500).json({ error: 'Failed to update idea' })
    }
  }

  // DELETE — remove idea
  if (req.method === 'DELETE') {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'id is required' })

    try {
      await query(`DELETE FROM ideas WHERE id = $1`, [id])
      return res.json({ success: true })
    } catch (err) {
      console.error('Ideas DELETE error:', err)
      return res.status(500).json({ error: 'Failed to delete idea' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
