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
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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

  // GET — fetch all comments (bulk load for frontend)
  if (req.method === 'GET') {
    try {
      const comments = await query(`SELECT * FROM commit_comments ORDER BY created_at ASC`)
      // Group by commit_hash
      const byHash = {}
      for (const c of comments) {
        if (!byHash[c.commit_hash]) byHash[c.commit_hash] = []
        byHash[c.commit_hash].push(c)
      }
      return res.json({ comments: byHash })
    } catch (err) {
      console.error('Commit comments GET error:', err)
      return res.status(500).json({ error: 'Failed to fetch comments' })
    }
  }

  // POST — add a comment to a commit
  if (req.method === 'POST') {
    const { commitHash, author, body } = req.body || {}
    if (!commitHash) return res.status(400).json({ error: 'commitHash is required' })
    if (!author?.trim()) return res.status(400).json({ error: 'author is required' })
    if (!body?.trim()) return res.status(400).json({ error: 'Comment body is required' })

    try {
      const rows = await query(
        `INSERT INTO commit_comments (commit_hash, author, body)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [commitHash, author.trim(), body.trim()]
      )
      return res.json({ comment: rows[0] })
    } catch (err) {
      console.error('Commit comments POST error:', err)
      return res.status(500).json({ error: 'Failed to add comment' })
    }
  }

  // DELETE — remove a comment (only author can delete their own)
  if (req.method === 'DELETE') {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'id is required' })

    try {
      await query(`DELETE FROM commit_comments WHERE id = $1`, [id])
      return res.json({ success: true })
    } catch (err) {
      console.error('Commit comments DELETE error:', err)
      return res.status(500).json({ error: 'Failed to remove comment' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
