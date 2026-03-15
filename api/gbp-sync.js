import { query } from './_db.js'

const ADMIN_KEY = process.env.ADMIN_SECRET || 'stowstack-admin-2024'

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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return req.headers['x-admin-key'] === ADMIN_KEY
}

async function getValidToken(connection) {
  if (connection.access_token && connection.token_expires_at && new Date(connection.token_expires_at) > new Date()) {
    return connection.access_token
  }
  if (!connection.refresh_token) return null
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_GBP_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_GBP_CLIENT_SECRET || '',
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json()
    if (data.access_token) {
      const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString()
      await query(
        `UPDATE gbp_connections SET access_token = $1, token_expires_at = $2, status = 'connected', updated_at = NOW() WHERE id = $3`,
        [data.access_token, expiresAt, connection.id]
      )
      return data.access_token
    }
  } catch (err) {
    console.error('GBP token refresh failed:', err.message)
  }
  return null
}

/**
 * Sync facility hours to GBP.
 */
async function syncHours(facilityId, connection) {
  const token = await getValidToken(connection)
  if (!token) throw new Error('Unable to authenticate with Google Business Profile')

  const facility = await query(`SELECT hours FROM facilities WHERE id = $1`, [facilityId])
  if (!facility.length || !facility[0].hours) {
    return { synced: false, reason: 'No hours data in facility record' }
  }

  const hours = facility[0].hours
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${connection.location_id}?updateMask=regularHours`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ regularHours: hours }),
    }
  )

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error?.message || `GBP API error ${res.status}`)
  }

  await query(
    `INSERT INTO gbp_profile_sync_log (facility_id, sync_type, status, changes) VALUES ($1, 'hours', 'success', $2)`,
    [facilityId, JSON.stringify({ hours })]
  )
  return { synced: true }
}

/**
 * Push facility photos to GBP.
 */
async function syncPhotos(facilityId, connection) {
  const token = await getValidToken(connection)
  if (!token) throw new Error('Unable to authenticate with Google Business Profile')

  const assets = await query(
    `SELECT url, metadata FROM assets WHERE facility_id = $1 AND type IN ('photo', 'generated_image') ORDER BY created_at DESC LIMIT 10`,
    [facilityId]
  )

  if (!assets.length) {
    return { synced: false, reason: 'No photos to sync' }
  }

  let uploaded = 0
  const errors = []

  for (const asset of assets) {
    try {
      const res = await fetch(
        `https://mybusiness.googleapis.com/v4/${connection.location_id}/media`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mediaFormat: 'PHOTO',
            sourceUrl: asset.url,
            locationAssociation: { category: 'ADDITIONAL' },
          }),
        }
      )
      if (res.ok) uploaded++
      else errors.push(`Failed to upload ${asset.url}`)
    } catch (err) {
      errors.push(err.message)
    }
  }

  const status = errors.length === 0 ? 'success' : uploaded > 0 ? 'partial' : 'failed'
  await query(
    `INSERT INTO gbp_profile_sync_log (facility_id, sync_type, status, changes, error_message)
     VALUES ($1, 'photos', $2, $3, $4)`,
    [facilityId, status, JSON.stringify({ uploaded, total: assets.length }), errors.join('; ') || null]
  )
  return { synced: true, uploaded, errors }
}

/**
 * Full profile sync: fetch GBP profile data and compare with local.
 */
async function getProfileComparison(facilityId, connection) {
  const token = await getValidToken(connection)
  if (!token) throw new Error('Unable to authenticate with Google Business Profile')

  // Fetch current GBP profile
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${connection.location_id}?readMask=title,regularHours,websiteUri,phoneNumbers,storefrontAddress,profile`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error?.message || `GBP API error ${res.status}`)
  }

  const gbpProfile = await res.json()

  // Fetch local facility data
  const facility = await query(
    `SELECT name, location, google_phone, website, hours, google_address FROM facilities WHERE id = $1`,
    [facilityId]
  )

  return {
    gbp: {
      name: gbpProfile.title || '',
      address: gbpProfile.storefrontAddress?.addressLines?.join(', ') || '',
      phone: gbpProfile.phoneNumbers?.primaryPhone || '',
      website: gbpProfile.websiteUri || '',
      hours: gbpProfile.regularHours || null,
      description: gbpProfile.profile?.description || '',
    },
    local: {
      name: facility[0]?.name || '',
      address: facility[0]?.google_address || '',
      phone: facility[0]?.google_phone || '',
      website: facility[0]?.website || '',
      hours: facility[0]?.hours || null,
    },
  }
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  // GET — get connection status and sync log
  if (req.method === 'GET') {
    const { facilityId } = req.query
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    const connections = await query(`SELECT * FROM gbp_connections WHERE facility_id = $1`, [facilityId])
    const syncLog = await query(
      `SELECT * FROM gbp_profile_sync_log WHERE facility_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [facilityId]
    )

    return res.json({
      connection: connections[0] || null,
      syncLog,
    })
  }

  // POST — trigger sync operations
  if (req.method === 'POST') {
    const { facilityId, type } = req.body
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    const conn = await query(`SELECT * FROM gbp_connections WHERE facility_id = $1 AND status = 'connected'`, [facilityId])
    if (!conn.length) return res.status(400).json({ error: 'No GBP connection for this facility' })

    const connection = conn[0]

    try {
      if (type === 'hours') {
        const result = await syncHours(facilityId, connection)
        return res.json({ ok: true, ...result })
      }

      if (type === 'photos') {
        const result = await syncPhotos(facilityId, connection)
        return res.json({ ok: true, ...result })
      }

      if (type === 'profile') {
        const comparison = await getProfileComparison(facilityId, connection)
        return res.json({ ok: true, comparison })
      }

      if (type === 'full') {
        const results = { hours: null, photos: null }
        try { results.hours = await syncHours(facilityId, connection) } catch (e) { results.hours = { error: e.message } }
        try { results.photos = await syncPhotos(facilityId, connection) } catch (e) { results.photos = { error: e.message } }

        await query(`UPDATE gbp_connections SET last_sync_at = NOW(), updated_at = NOW() WHERE id = $1`, [connection.id])
        await query(
          `INSERT INTO gbp_profile_sync_log (facility_id, sync_type, status, changes) VALUES ($1, 'full', 'success', $2)`,
          [facilityId, JSON.stringify(results)]
        )
        return res.json({ ok: true, results })
      }

      return res.status(400).json({ error: 'Invalid type. Use hours, photos, profile, or full' })
    } catch (err) {
      await query(
        `INSERT INTO gbp_profile_sync_log (facility_id, sync_type, status, error_message) VALUES ($1, $2, 'failed', $3)`,
        [facilityId, type || 'unknown', err.message]
      )
      return res.status(500).json({ error: err.message })
    }
  }

  // PATCH — update GBP connection settings (sync_config toggles)
  if (req.method === 'PATCH') {
    const { facilityId, syncConfig } = req.body
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    const rows = await query(
      `UPDATE gbp_connections SET sync_config = $1, updated_at = NOW() WHERE facility_id = $2 RETURNING *`,
      [JSON.stringify(syncConfig), facilityId]
    )
    if (!rows.length) return res.status(404).json({ error: 'No GBP connection for this facility' })
    return res.json({ connection: rows[0] })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
