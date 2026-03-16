import { query, queryOne } from './_db.js'
import crypto from 'crypto'
import { createSession, requireSession, getSession, isAdminRequest, destroySession } from './_session-auth.js'
import { hashPassword, verifyPassword } from './_password.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key, X-Org-Token')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const isAdminUser = await isAdminRequest(req)
    const session = await getSession(req)
    const orgUser = session?.user || null

    /* ── GET: list orgs (admin) or get org data (org user) ── */
    if (req.method === 'GET') {
      if (isAdminUser) {
        const orgs = await query(
          `SELECT o.*,
            (SELECT COUNT(*) FROM facilities f WHERE f.organization_id = o.id) as facility_count,
            (SELECT COUNT(*) FROM org_users ou WHERE ou.organization_id = o.id) as user_count
           FROM organizations o ORDER BY o.created_at DESC`
        )
        return res.json({ organizations: orgs })
      }

      if (orgUser) {
        const org = await queryOne('SELECT * FROM organizations WHERE id = $1', [orgUser.organization_id])
        const facilities = await query(
          `SELECT f.id, f.name, f.location, f.status, f.occupancy_range, f.total_units,
                  f.google_rating, f.review_count, f.created_at
           FROM facilities f WHERE f.organization_id = $1 ORDER BY f.name`,
          [orgUser.organization_id]
        )
        const users = orgUser.role === 'org_admin'
          ? await query('SELECT id, email, name, role, status, last_login_at, created_at FROM org_users WHERE organization_id = $1 ORDER BY created_at', [orgUser.organization_id])
          : []

        const facilityIds = facilities.map(f => f.id)
        let campaignData = []
        if (facilityIds.length > 0) {
          campaignData = await query(
            `SELECT c.facility_id, cc.month, cc.spend, cc.leads, cc.cpl, cc.move_ins, cc.cost_per_move_in, cc.roas, cc.occupancy_delta
             FROM clients c
             JOIN client_campaigns cc ON cc.client_id = c.id
             WHERE c.facility_id = ANY($1)
             ORDER BY cc.month`,
            [facilityIds]
          )
        }

        return res.json({ organization: org, facilities, users, campaignData })
      }

      return res.status(401).json({ error: 'Unauthorized' })
    }

    /* ── POST: create org (admin) or org user login/actions ── */
    if (req.method === 'POST') {
      const { action } = req.body

      // Org user login — returns session token
      if (action === 'login') {
        const { email, password, orgSlug } = req.body
        if (!email || !orgSlug) return res.status(400).json({ error: 'Email and organization required' })

        const user = await queryOne(
          `SELECT ou.*, o.id as org_id, o.name as org_name, o.slug as org_slug, o.logo_url, o.primary_color, o.accent_color,
                  o.white_label, o.plan, o.facility_limit, o.settings as org_settings, o.status as org_status,
                  o.subscription_status, o.stripe_customer_id
           FROM org_users ou JOIN organizations o ON o.id = ou.organization_id
           WHERE ou.email = $1 AND o.slug = $2 AND ou.status = 'active' AND o.status = 'active'`,
          [email.toLowerCase(), orgSlug]
        )
        if (!user) return res.status(401).json({ error: 'Invalid credentials' })

        // Verify password
        if (user.password_hash && password) {
          const { valid, needsRehash } = await verifyPassword(password, user.password_hash, user.id)
          if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

          // Transparent migration: rehash legacy SHA-256 passwords to scrypt
          if (needsRehash) {
            const newHash = await hashPassword(password)
            query('UPDATE org_users SET password_hash = $1 WHERE id = $2', [newHash, user.id]).catch(() => {})
          }
        }

        await query('UPDATE org_users SET last_login_at = NOW() WHERE id = $1', [user.id])

        // Create real session token
        const token = await createSession(user.id, req)

        return res.json({
          token,
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
          organization: {
            id: user.org_id, name: user.org_name, slug: user.org_slug,
            logoUrl: user.logo_url, primaryColor: user.primary_color, accentColor: user.accent_color,
            whiteLabel: user.white_label, plan: user.plan, facilityLimit: user.facility_limit,
            settings: user.org_settings, subscriptionStatus: user.subscription_status,
            hasStripe: !!user.stripe_customer_id,
          },
        })
      }

      // Accept invite — hash with scrypt, create session
      if (action === 'accept_invite') {
        const { inviteToken, name, password } = req.body
        if (!inviteToken) return res.status(400).json({ error: 'Invite token required' })

        const user = await queryOne(
          `SELECT ou.*, o.name as org_name, o.slug as org_slug
           FROM org_users ou JOIN organizations o ON o.id = ou.organization_id
           WHERE ou.invite_token = $1 AND ou.invite_expires_at > NOW() AND ou.status = 'invited'`,
          [inviteToken]
        )
        if (!user) return res.status(400).json({ error: 'Invalid or expired invite' })

        const passwordHash = password ? await hashPassword(password) : null

        await query(
          `UPDATE org_users SET status = 'active', name = COALESCE($2, name), password_hash = COALESCE($3, password_hash),
           invite_token = NULL, invite_expires_at = NULL WHERE id = $1`,
          [user.id, name, passwordHash]
        )

        const token = await createSession(user.id, req)
        return res.json({ token, user: { id: user.id, email: user.email, name: name || user.name, role: user.role } })
      }

      // Change password — verify with new module, hash with scrypt
      if (action === 'change_password') {
        if (!orgUser) return res.status(401).json({ error: 'Unauthorized' })
        const { currentPassword, newPassword } = req.body
        if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' })

        // Look up full user record for password_hash
        const fullUser = await queryOne('SELECT id, password_hash FROM org_users WHERE id = $1', [orgUser.id])

        if (fullUser.password_hash && currentPassword) {
          const { valid } = await verifyPassword(currentPassword, fullUser.password_hash, fullUser.id)
          if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })
        }

        const newHash = await hashPassword(newPassword)
        await query('UPDATE org_users SET password_hash = $1 WHERE id = $2', [newHash, orgUser.id])
        return res.json({ success: true })
      }

      // Logout — destroy session
      if (action === 'logout') {
        const auth = req.headers.authorization
        if (auth?.startsWith('Bearer ss_')) {
          await destroySession(auth.slice(7))
        }
        return res.json({ success: true })
      }

      // Create org (admin only)
      if (!isAdminUser) return res.status(401).json({ error: 'Unauthorized' })

      const { name, slug, contactEmail, contactPhone, plan, whiteLabel, primaryColor, accentColor, logoUrl } = req.body
      if (!name || !slug) return res.status(400).json({ error: 'Name and slug required' })

      const org = await queryOne(
        `INSERT INTO organizations (name, slug, contact_email, contact_phone, plan, white_label, primary_color, accent_color, logo_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [name, slug, contactEmail, contactPhone, plan || 'starter', whiteLabel || false, primaryColor || '#16a34a', accentColor || '#4f46e5', logoUrl]
      )

      if (contactEmail) {
        const inviteToken = crypto.randomBytes(32).toString('hex')
        await query(
          `INSERT INTO org_users (organization_id, email, name, role, invite_token, invite_expires_at)
           VALUES ($1, $2, $3, 'org_admin', $4, NOW() + INTERVAL '7 days')`,
          [org.id, contactEmail, name, inviteToken]
        )
      }

      return res.json({ organization: org })
    }

    /* ── PATCH: update org ── */
    if (req.method === 'PATCH') {
      if (!isAdminUser && (!orgUser || orgUser.role !== 'org_admin')) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const orgId = req.body.id || (orgUser && orgUser.organization_id)
      if (!orgId) return res.status(400).json({ error: 'Organization ID required' })

      const { name, primaryColor, accentColor, logoUrl, whiteLabel, plan, facilityLimit, settings, contactEmail, billingEmail } = req.body

      const org = await queryOne(
        `UPDATE organizations SET
          name = COALESCE($2, name),
          primary_color = COALESCE($3, primary_color),
          accent_color = COALESCE($4, accent_color),
          logo_url = COALESCE($5, logo_url),
          white_label = COALESCE($6, white_label),
          plan = COALESCE($7, plan),
          facility_limit = COALESCE($8, facility_limit),
          settings = COALESCE($9, settings),
          contact_email = COALESCE($10, contact_email),
          billing_email = COALESCE($11, billing_email),
          updated_at = NOW()
        WHERE id = $1 RETURNING *`,
        [orgId, name, primaryColor, accentColor, logoUrl, whiteLabel, plan, facilityLimit, settings, contactEmail, billingEmail]
      )

      return res.json({ organization: org })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Organizations API error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
