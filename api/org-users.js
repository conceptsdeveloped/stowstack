import { query, queryOne } from './_db.js'
import crypto from 'crypto'
import { requireSession, isAdminRequest } from './_session-auth.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key, X-Org-Token')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const isAdminUser = await isAdminRequest(req)
    const session = !isAdminUser ? await requireSession(req, res) : null
    if (!isAdminUser && !session) return

    const orgUser = session?.user || null
    const canManageUsers = isAdminUser || (orgUser && orgUser.role === 'org_admin')
    if (!canManageUsers) return res.status(401).json({ error: 'Unauthorized' })

    const orgId = req.query?.orgId || (orgUser && orgUser.organization_id)

    /* ── GET: list org users ── */
    if (req.method === 'GET') {
      const users = await query(
        'SELECT id, email, name, role, status, last_login_at, created_at FROM org_users WHERE organization_id = $1 ORDER BY created_at',
        [orgId]
      )
      return res.json({ users })
    }

    /* ── POST: invite user ── */
    if (req.method === 'POST') {
      const { email, name, role } = req.body
      if (!email || !name) return res.status(400).json({ error: 'Email and name required' })

      const validRoles = ['org_admin', 'facility_manager', 'viewer']
      const userRole = validRoles.includes(role) ? role : 'viewer'

      const inviteToken = crypto.randomBytes(32).toString('hex')

      const user = await queryOne(
        `INSERT INTO org_users (organization_id, email, name, role, invite_token, invite_expires_at)
         VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days')
         ON CONFLICT (organization_id, email) DO UPDATE SET
           role = $4, invite_token = $5, invite_expires_at = NOW() + INTERVAL '7 days', status = 'invited'
         RETURNING id, email, name, role, status, created_at`,
        [orgId, email.toLowerCase(), name, userRole, inviteToken]
      )

      return res.json({ user, inviteToken })
    }

    /* ── PATCH: update user role/status ── */
    if (req.method === 'PATCH') {
      const { userId, role, status } = req.body
      if (!userId) return res.status(400).json({ error: 'User ID required' })

      const user = await queryOne(
        `UPDATE org_users SET
          role = COALESCE($2, role),
          status = COALESCE($3, status)
        WHERE id = $1 AND organization_id = $4
        RETURNING id, email, name, role, status`,
        [userId, role, status, orgId]
      )
      if (!user) return res.status(404).json({ error: 'User not found' })
      return res.json({ user })
    }

    /* ── DELETE: remove user ── */
    if (req.method === 'DELETE') {
      const { userId } = req.body || req.query
      if (!userId) return res.status(400).json({ error: 'User ID required' })

      await query('DELETE FROM org_users WHERE id = $1 AND organization_id = $2', [userId, orgId])
      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Org users API error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
