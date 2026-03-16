import crypto from 'crypto'
import { query, queryOne } from './_db.js'

const SESSION_DURATION_DAYS = 30
const TOKEN_PREFIX = 'ss_'

/**
 * Generate a cryptographically random session token.
 */
function generateToken() {
  return TOKEN_PREFIX + crypto.randomBytes(32).toString('hex')
}

/**
 * Hash a session token for storage (SHA-256).
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Create a new session for a user. Returns the raw token (only time it's available).
 */
export async function createSession(userId, req) {
  const token = generateToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000)
  const ip = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.socket?.remoteAddress || null
  const ua = req?.headers?.['user-agent'] || null

  await query(
    `INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, expiresAt.toISOString(), ip, ua]
  )

  return token
}

/**
 * Validate a session from the request. Reads Authorization: Bearer <token> or
 * legacy X-Org-Token header. Returns { user, organization } or null.
 *
 * If res is provided and auth fails, sends 401 and returns null.
 * If res is null, just returns null on failure (for optional auth checks).
 */
export async function requireSession(req, res) {
  const session = await getSession(req)
  if (!session) {
    if (res) res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  return session
}

/**
 * Get session without sending 401 on failure. For optional auth checks.
 */
export async function getSession(req) {
  // Try Bearer token first (new format)
  const auth = req.headers?.authorization
  if (auth?.startsWith('Bearer ss_')) {
    const token = auth.slice(7)
    return lookupSession(token)
  }

  // Try X-Org-Token header (legacy base64 format — backwards compat)
  const orgToken = req.headers?.['x-org-token']
  if (orgToken) {
    // Check if it's actually a session token (starts with ss_)
    if (orgToken.startsWith('ss_')) {
      return lookupSession(orgToken)
    }
    // Legacy base64 format: orgId:email
    return lookupLegacyToken(orgToken)
  }

  return null
}

/**
 * Look up a session by its raw token. Updates last_active_at.
 */
async function lookupSession(token) {
  const tokenHash = hashToken(token)

  const row = await queryOne(
    `SELECT s.id as session_id, s.expires_at,
            ou.id, ou.organization_id, ou.email, ou.name, ou.role, ou.status, ou.is_superadmin,
            o.id as org_id, o.name as org_name, o.slug as org_slug, o.logo_url,
            o.primary_color, o.accent_color, o.white_label, o.plan, o.facility_limit,
            o.settings as org_settings, o.status as org_status,
            o.subscription_status, o.stripe_customer_id
     FROM sessions s
     JOIN org_users ou ON ou.id = s.user_id
     JOIN organizations o ON o.id = ou.organization_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()
       AND ou.status = 'active' AND o.status = 'active'`,
    [tokenHash]
  )

  if (!row) return null

  // Update last_active_at (fire-and-forget)
  query('UPDATE sessions SET last_active_at = NOW() WHERE id = $1', [row.session_id]).catch(() => {})

  return formatSessionResult(row)
}

/**
 * Legacy base64 X-Org-Token: decode and look up directly.
 * This is kept for backwards compatibility during migration.
 */
async function lookupLegacyToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString()
    const [orgId, email] = decoded.split(':')
    if (!orgId || !email) return null

    const row = await queryOne(
      `SELECT ou.id, ou.organization_id, ou.email, ou.name, ou.role, ou.status, ou.is_superadmin,
              o.id as org_id, o.name as org_name, o.slug as org_slug, o.logo_url,
              o.primary_color, o.accent_color, o.white_label, o.plan, o.facility_limit,
              o.settings as org_settings, o.status as org_status,
              o.subscription_status, o.stripe_customer_id
       FROM org_users ou JOIN organizations o ON o.id = ou.organization_id
       WHERE ou.organization_id = $1 AND ou.email = $2
         AND ou.status = 'active' AND o.status = 'active'`,
      [orgId, email]
    )

    if (!row) return null
    return formatSessionResult(row)
  } catch {
    return null
  }
}

/**
 * Format a DB row into the standard session result shape.
 */
function formatSessionResult(row) {
  return {
    user: {
      id: row.id,
      organization_id: row.organization_id,
      email: row.email,
      name: row.name,
      role: row.role,
      status: row.status,
      is_superadmin: row.is_superadmin || false,
    },
    organization: {
      id: row.org_id,
      name: row.org_name,
      slug: row.org_slug,
      logoUrl: row.logo_url,
      primaryColor: row.primary_color,
      accentColor: row.accent_color,
      whiteLabel: row.white_label,
      plan: row.plan,
      facilityLimit: row.facility_limit,
      settings: row.org_settings,
      status: row.org_status,
      subscriptionStatus: row.subscription_status,
      hasStripe: !!row.stripe_customer_id,
    },
  }
}

/**
 * Require session + specific roles. Sends 403 if role doesn't match.
 */
export async function requireRole(req, res, allowedRoles) {
  const session = await requireSession(req, res)
  if (!session) return null

  if (session.user.is_superadmin) return session

  if (!allowedRoles.includes(session.user.role)) {
    res.status(403).json({ error: 'Forbidden' })
    return null
  }

  return session
}

/**
 * Require superadmin access. Checks session-based superadmin flag
 * OR falls back to the legacy X-Admin-Key header.
 */
export async function requireAdmin(req, res) {
  // Try session-based superadmin first
  const session = await getSession(req)
  if (session?.user?.is_superadmin) return session

  // Fall back to legacy X-Admin-Key
  const adminKey = process.env.ADMIN_SECRET
  if (adminKey && req.headers['x-admin-key'] === adminKey) {
    return { user: { id: 'admin', role: 'superadmin', is_superadmin: true }, organization: null }
  }

  res.status(401).json({ error: 'Unauthorized' })
  return null
}

/**
 * Check if request is from an admin (non-blocking, returns boolean).
 */
export async function isAdminRequest(req) {
  const session = await getSession(req)
  if (session?.user?.is_superadmin) return true

  const adminKey = process.env.ADMIN_SECRET
  return !!(adminKey && req.headers['x-admin-key'] === adminKey)
}

/**
 * Destroy a session by token.
 */
export async function destroySession(token) {
  const tokenHash = hashToken(token)
  await query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash])
}

/**
 * Destroy all sessions for a user.
 */
export async function destroyAllSessions(userId) {
  await query('DELETE FROM sessions WHERE user_id = $1', [userId])
}

/**
 * Clean up expired sessions.
 */
export async function cleanupExpiredSessions() {
  const result = await query('DELETE FROM sessions WHERE expires_at < NOW()')
  return result.length || 0
}
