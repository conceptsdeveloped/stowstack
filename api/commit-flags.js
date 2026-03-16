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

const VALID_FLAG_TYPES = [
  'needs-review',
  'breaking-change',
  'hotfix',
  'discussion-needed',
  'blocked',
  'good-example',     // highlight commits worth studying
  'needs-testing',
]

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  if (req.method === 'OPTIONS') return res.status(200).json({})
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  // GET — fetch all flags (bulk load)
  if (req.method === 'GET') {
    try {
      const flags = await query(`SELECT * FROM commit_flags ORDER BY created_at DESC`)
      // Group by commit_hash for easy frontend lookup
      const byHash = {}
      for (const f of flags) {
        if (!byHash[f.commit_hash]) byHash[f.commit_hash] = []
        byHash[f.commit_hash].push(f)
      }
      return res.json({ flags: byHash })
    } catch (err) {
      console.error('Commit flags GET error:', err)
      return res.status(500).json({ error: 'Failed to fetch flags' })
    }
  }

  // POST — add a flag to a commit
  if (req.method === 'POST') {
    const { commitHash, flagType, reason, flaggedBy } = req.body || {}
    if (!commitHash) return res.status(400).json({ error: 'commitHash is required' })
    if (!flagType || !VALID_FLAG_TYPES.includes(flagType)) {
      return res.status(400).json({ error: `Invalid flag type. Must be one of: ${VALID_FLAG_TYPES.join(', ')}` })
    }
    if (!flaggedBy) return res.status(400).json({ error: 'flaggedBy is required' })

    try {
      // Prevent duplicate flags of the same type by the same person on the same commit
      const existing = await query(
        `SELECT * FROM commit_flags WHERE commit_hash = $1 AND flag_type = $2 AND flagged_by = $3`,
        [commitHash, flagType, flaggedBy]
      )
      if (existing.length > 0) {
        return res.status(409).json({ error: 'You already flagged this commit with that type' })
      }

      const rows = await query(
        `INSERT INTO commit_flags (commit_hash, flag_type, reason, flagged_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [commitHash, flagType, (reason || '').trim(), flaggedBy]
      )
      return res.json({ flag: rows[0] })
    } catch (err) {
      console.error('Commit flags POST error:', err)
      return res.status(500).json({ error: 'Failed to add flag' })
    }
  }

  // DELETE — remove a flag
  if (req.method === 'DELETE') {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'id is required' })

    try {
      await query(`DELETE FROM commit_flags WHERE id = $1`, [id])
      return res.json({ success: true })
    } catch (err) {
      console.error('Commit flags DELETE error:', err)
      return res.status(500).json({ error: 'Failed to remove flag' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
