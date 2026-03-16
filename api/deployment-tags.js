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

const VALID_ENVS = ['production', 'staging', 'preview']

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  if (req.method === 'OPTIONS') return res.status(200).json({})
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

  // GET — all deployment tags
  if (req.method === 'GET') {
    try {
      const tags = await query(`SELECT * FROM deployment_tags ORDER BY created_at DESC`)
      const byHash = {}
      for (const t of tags) {
        if (!byHash[t.commit_hash]) byHash[t.commit_hash] = []
        byHash[t.commit_hash].push(t)
      }
      return res.json({ tags: byHash })
    } catch (err) {
      console.error('Deployment tags GET error:', err)
      return res.status(500).json({ error: 'Failed to fetch deployment tags' })
    }
  }

  // POST — tag a commit as deployed
  if (req.method === 'POST') {
    const { commitHash, environment, deployedBy, version, notes } = req.body || {}
    if (!commitHash) return res.status(400).json({ error: 'commitHash is required' })
    if (!deployedBy) return res.status(400).json({ error: 'deployedBy is required' })
    if (environment && !VALID_ENVS.includes(environment)) {
      return res.status(400).json({ error: `Invalid environment. Must be one of: ${VALID_ENVS.join(', ')}` })
    }

    try {
      const rows = await query(
        `INSERT INTO deployment_tags (commit_hash, environment, deployed_by, version, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [commitHash, environment || 'production', deployedBy, version || null, notes || null]
      )
      return res.json({ tag: rows[0] })
    } catch (err) {
      console.error('Deployment tags POST error:', err)
      return res.status(500).json({ error: 'Failed to create deployment tag' })
    }
  }

  // DELETE — remove a deployment tag
  if (req.method === 'DELETE') {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'id is required' })

    try {
      await query(`DELETE FROM deployment_tags WHERE id = $1`, [id])
      return res.json({ success: true })
    } catch (err) {
      console.error('Deployment tags DELETE error:', err)
      return res.status(500).json({ error: 'Failed to remove deployment tag' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
