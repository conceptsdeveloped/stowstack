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

const VALID_STATUSES = ['reviewed', 'approved', 'needs-changes']

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  if (req.method === 'OPTIONS') return res.status(200).json({})
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

  // GET — all reviews (bulk load)
  if (req.method === 'GET') {
    try {
      const reviews = await query(`SELECT * FROM commit_reviews ORDER BY created_at DESC`)
      const byHash = {}
      for (const r of reviews) {
        if (!byHash[r.commit_hash]) byHash[r.commit_hash] = []
        byHash[r.commit_hash].push(r)
      }
      return res.json({ reviews: byHash })
    } catch (err) {
      console.error('Commit reviews GET error:', err)
      return res.status(500).json({ error: 'Failed to fetch reviews' })
    }
  }

  // POST — mark a commit as reviewed (upsert)
  if (req.method === 'POST') {
    const { commitHash, reviewedBy, status } = req.body || {}
    if (!commitHash) return res.status(400).json({ error: 'commitHash is required' })
    if (!reviewedBy) return res.status(400).json({ error: 'reviewedBy is required' })
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` })
    }

    try {
      const rows = await query(
        `INSERT INTO commit_reviews (commit_hash, reviewed_by, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (commit_hash, reviewed_by)
         DO UPDATE SET status = $3, created_at = NOW()
         RETURNING *`,
        [commitHash, reviewedBy, status || 'reviewed']
      )
      return res.json({ review: rows[0] })
    } catch (err) {
      console.error('Commit reviews POST error:', err)
      return res.status(500).json({ error: 'Failed to save review' })
    }
  }

  // DELETE — remove a review
  if (req.method === 'DELETE') {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'id is required' })

    try {
      await query(`DELETE FROM commit_reviews WHERE id = $1`, [id])
      return res.json({ success: true })
    } catch (err) {
      console.error('Commit reviews DELETE error:', err)
      return res.status(500).json({ error: 'Failed to remove review' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
