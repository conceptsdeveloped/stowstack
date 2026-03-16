import crypto from 'crypto'
import { query, queryOne } from '../_db.js'
import { requireAdmin, isAdmin } from '../_auth.js'
import { hashKey, setV1Cors, requireApiAuth } from '../_api-auth.js'

const VALID_SCOPES = [
  'facilities:read', 'facilities:write',
  'units:read', 'units:write',
  'leads:read', 'leads:write',
  'tenants:read', 'tenants:write',
  'pages:read',
  'calls:read',
  'webhooks:manage',
]

export default async function handler(req, res) {
  setV1Cors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  // API key management requires admin auth OR an authenticated org-admin
  const admin = isAdmin(req)

  // ── GET: list API keys ──
  if (req.method === 'GET') {
    let organizationId = req.query.organizationId

    if (!admin) {
      // Try API key auth for org-admins to list their own keys
      const auth = await requireApiAuth(req, res)
      if (!auth) return
      organizationId = auth.apiKey.organization_id
    }

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required' })
    }

    try {
      const keys = await query(
        `SELECT id, name, key_prefix, scopes, rate_limit, last_used_at, expires_at, revoked, created_at
         FROM api_keys WHERE organization_id = $1 ORDER BY created_at DESC`,
        [organizationId]
      )
      return res.status(200).json({ keys })
    } catch (err) {
      console.error('api-keys GET failed:', err.message)
      return res.status(500).json({ error: 'Failed to list API keys' })
    }
  }

  // ── POST: create a new API key (admin only) ──
  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return

    const { organizationId, name, scopes, rateLimitPerMinute, expiresAt } = req.body || {}

    if (!organizationId || !name) {
      return res.status(400).json({ error: 'organizationId and name are required' })
    }

    // Validate scopes
    const requestedScopes = scopes || VALID_SCOPES
    const invalid = requestedScopes.filter(s => !VALID_SCOPES.includes(s))
    if (invalid.length) {
      return res.status(400).json({ error: `Invalid scopes: ${invalid.join(', ')}` })
    }

    // Verify org exists
    const org = await queryOne('SELECT id FROM organizations WHERE id = $1', [organizationId])
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' })
    }

    // Generate key: sk_live_ + 40 hex chars
    const rawKey = `sk_live_${crypto.randomBytes(20).toString('hex')}`
    const keyHash = hashKey(rawKey)
    const keyPrefix = rawKey.slice(0, 8)

    try {
      const row = await queryOne(
        `INSERT INTO api_keys (organization_id, name, key_hash, key_prefix, scopes, rate_limit, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, key_prefix, scopes, rate_limit, expires_at, created_at`,
        [organizationId, name, keyHash, keyPrefix, requestedScopes, rateLimitPerMinute || 100, expiresAt || null]
      )

      return res.status(200).json({
        key: rawKey,  // shown only once
        ...row,
      })
    } catch (err) {
      console.error('api-keys POST failed:', err.message)
      return res.status(500).json({ error: 'Failed to create API key' })
    }
  }

  // ── DELETE: revoke an API key (admin only) ──
  if (req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return

    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id query param is required' })

    try {
      const row = await queryOne(
        `UPDATE api_keys SET revoked = TRUE, revoked_at = NOW() WHERE id = $1 RETURNING id`,
        [id]
      )
      if (!row) return res.status(404).json({ error: 'API key not found' })
      return res.status(200).json({ success: true, id: row.id })
    } catch (err) {
      console.error('api-keys DELETE failed:', err.message)
      return res.status(500).json({ error: 'Failed to revoke API key' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
