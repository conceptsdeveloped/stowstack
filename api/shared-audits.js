import { query, queryOne } from './_db.js'
import { requireAdmin } from './_auth.js'

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
    'Access-Control-Allow-Methods': 'GET, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!requireAdmin(req, res)) return

  // GET /api/shared-audits — list all shared audits
  if (req.method === 'GET') {
    try {
      const rows = await query(
        `SELECT id, slug, facility_name, views, expires_at, created_at,
                expires_at > NOW() AS active
         FROM shared_audits
         ORDER BY created_at DESC
         LIMIT 100`
      )
      return res.status(200).json({ audits: rows })
    } catch (err) {
      console.error('Shared audits list error:', err)
      return res.status(500).json({ error: 'Failed to list shared audits' })
    }
  }

  // DELETE /api/shared-audits?id=UUID — revoke a shared audit (expire immediately)
  if (req.method === 'DELETE') {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const id = url.searchParams.get('id')
    if (!id) return res.status(400).json({ error: 'Missing audit ID' })

    try {
      const result = await queryOne(
        `UPDATE shared_audits SET expires_at = NOW() WHERE id = $1 RETURNING id`,
        [id]
      )
      if (!result) return res.status(404).json({ error: 'Audit not found' })
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('Shared audit revoke error:', err)
      return res.status(500).json({ error: 'Failed to revoke audit' })
    }
  }

  // PATCH /api/shared-audits?id=UUID — extend expiration by 90 days
  if (req.method === 'PATCH') {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const id = url.searchParams.get('id')
    if (!id) return res.status(400).json({ error: 'Missing audit ID' })

    try {
      const result = await queryOne(
        `UPDATE shared_audits SET expires_at = GREATEST(expires_at, NOW()) + INTERVAL '90 days'
         WHERE id = $1 RETURNING id, expires_at`,
        [id]
      )
      if (!result) return res.status(404).json({ error: 'Audit not found' })
      return res.status(200).json({ success: true, expiresAt: result.expires_at })
    } catch (err) {
      console.error('Shared audit extend error:', err)
      return res.status(500).json({ error: 'Failed to extend audit' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
