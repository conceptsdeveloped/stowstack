import crypto from 'crypto'
import { queryOne, query } from './_db.js'
import { rateLimit, rateLimitResponse } from './_ratelimit.js'

/**
 * Hash an API key using SHA-256 for storage/lookup.
 */
export function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Set CORS headers for v1 API endpoints (machine-to-machine, any origin).
 */
export function setV1Cors(req, res) {
  // V1 API is machine-to-machine (API keys), not browser-based.
  // Set explicit empty origin instead of reflecting arbitrary origins.
  res.setHeader('Access-Control-Allow-Origin', '')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

/**
 * Validate the Authorization: Bearer <key> header.
 * Returns { apiKey } on success, or sends an error response and returns null.
 */
export async function requireApiAuth(req, res) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header. Use: Bearer sk_live_...' })
    return null
  }

  const token = auth.slice(7)
  const hash = hashKey(token)

  const row = await queryOne(
    `SELECT id, organization_id, name, scopes, rate_limit, expires_at, revoked
     FROM api_keys
     WHERE key_hash = $1`,
    [hash]
  )

  if (!row || row.revoked) {
    res.status(401).json({ error: 'Invalid or revoked API key' })
    return null
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    res.status(401).json({ error: 'API key has expired' })
    return null
  }

  // Per-key rate limiting (requests per minute)
  const limit = row.rate_limit || 100
  const rl = await rateLimit(req, {
    key: `api:${row.id}`,
    limit,
    windowSeconds: 60,
  })

  if (!rl.allowed) {
    rateLimitResponse(res, rl.resetAt)
    return null
  }

  res.setHeader('X-RateLimit-Remaining', String(rl.remaining))

  // Update last_used_at (fire-and-forget)
  query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [row.id]).catch(() => {})

  // Log API usage (fire-and-forget)
  const start = Date.now()
  const origEnd = res.end.bind(res)
  res.end = function (...args) {
    const duration = Date.now() - start
    query(
      `INSERT INTO api_usage_log (api_key_id, organization_id, method, path, status_code, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [row.id, row.organization_id, req.method, req.url?.split('?')[0] || '', res.statusCode, duration]
    ).catch(() => {})
    return origEnd(...args)
  }

  return { apiKey: row }
}

/**
 * Check if an API key has the required scope.
 * Sends 403 and returns false if the scope is missing.
 */
export function requireScope(res, apiKey, scope) {
  if (!apiKey.scopes.includes(scope)) {
    res.status(403).json({ error: `Insufficient permissions. Required scope: ${scope}` })
    return false
  }
  return true
}

/**
 * Verify that a facility belongs to the API key's organization.
 * Returns the facility row or sends 404 and returns null.
 */
export async function requireOrgFacility(res, facilityId, organizationId) {
  if (!facilityId) {
    res.status(400).json({ error: 'facilityId is required' })
    return null
  }
  const facility = await queryOne(
    'SELECT id, organization_id FROM facilities WHERE id = $1',
    [facilityId]
  )
  if (!facility || facility.organization_id !== organizationId) {
    res.status(404).json({ error: 'Facility not found' })
    return null
  }
  return facility
}
