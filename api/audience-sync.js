import { query, queryOne } from './_db.js'
import { requireAdmin } from './_auth.js'
import { createHash } from 'crypto'

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function sha256(value) {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return '1' + digits
  return digits
}

async function getMetaToken(facilityId) {
  const conn = await queryOne(
    `SELECT access_token, account_id FROM platform_connections
     WHERE facility_id = $1 AND platform = 'meta' AND status = 'connected'`,
    [facilityId]
  )
  return conn
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(200).end()

  const authErr = requireAdmin(req)
  if (authErr) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // GET — list audience syncs for a facility
    if (req.method === 'GET') {
      const { facilityId } = req.query || {}
      if (!facilityId) return res.status(400).json({ error: 'Missing facilityId' })

      const syncs = await query(
        `SELECT * FROM audience_syncs WHERE facility_id = $1 ORDER BY created_at DESC`,
        [facilityId]
      )

      return res.json({ success: true, data: syncs })
    }

    // POST — create/refresh/create-lookalike
    if (req.method === 'POST') {
      const { facilityId, action, audienceName, sourceType, audienceSyncId } = req.body
      if (!facilityId) return res.status(400).json({ error: 'Missing facilityId' })

      const metaConn = await getMetaToken(facilityId)
      if (!metaConn) {
        return res.status(400).json({ error: 'No active Meta connection for this facility. Connect Meta Business Manager first.' })
      }

      const { access_token, account_id } = metaConn

      // Action: create custom audience
      if (action === 'create') {
        if (!audienceName || !sourceType) {
          return res.status(400).json({ error: 'Missing audienceName or sourceType' })
        }

        // Get tenant data based on source type
        let tenants
        if (sourceType === 'active_tenants') {
          tenants = await query(
            `SELECT email, phone FROM tenants WHERE facility_id = $1 AND status = 'active' AND (email IS NOT NULL OR phone IS NOT NULL)`,
            [facilityId]
          )
        } else if (sourceType === 'moved_out') {
          tenants = await query(
            `SELECT email, phone FROM tenants WHERE facility_id = $1 AND status = 'moved_out' AND (email IS NOT NULL OR phone IS NOT NULL)`,
            [facilityId]
          )
        } else if (sourceType === 'leads') {
          tenants = await query(
            `SELECT email, phone FROM partial_leads WHERE facility_id = $1 AND email IS NOT NULL`,
            [facilityId]
          )
        } else {
          return res.status(400).json({ error: 'Invalid sourceType. Use: active_tenants, moved_out, or leads' })
        }

        if (tenants.length === 0) {
          return res.status(400).json({ error: `No ${sourceType.replace(/_/g, ' ')} found for this facility` })
        }

        // Create audience on Meta
        const createRes = await fetch(
          `https://graph.facebook.com/v19.0/act_${account_id}/customaudiences`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token,
              name: audienceName,
              subtype: 'CUSTOM',
              description: `StowStack ${sourceType.replace(/_/g, ' ')} audience`,
              customer_file_source: 'USER_PROVIDED_ONLY',
            }),
          }
        )
        const createData = await createRes.json()

        if (createData.error) {
          return res.status(400).json({ error: `Meta API error: ${createData.error.message}` })
        }

        const metaAudienceId = createData.id

        // Hash and upload users
        const schema = ['EMAIL', 'PHONE']
        const data = tenants
          .filter(t => t.email || t.phone)
          .map(t => [
            t.email ? sha256(t.email) : '',
            t.phone ? sha256(normalizePhone(t.phone)) : '',
          ])

        const uploadRes = await fetch(
          `https://graph.facebook.com/v19.0/${metaAudienceId}/users`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token,
              payload: { schema, data },
            }),
          }
        )
        const uploadData = await uploadRes.json()

        // Save sync record
        const syncRow = await query(
          `INSERT INTO audience_syncs (facility_id, connection_id, audience_type, audience_name, meta_audience_id, source_type, record_count, status, last_synced_at)
           VALUES ($1, (SELECT id FROM platform_connections WHERE facility_id = $1 AND platform = 'meta' LIMIT 1), 'custom', $2, $3, $4, $5, 'ready', NOW())
           RETURNING *`,
          [facilityId, audienceName, metaAudienceId, sourceType, tenants.length]
        )

        // Log activity
        query(
          'INSERT INTO activity_log (type, facility_id, detail) VALUES ($1, $2, $3)',
          ['audience_created', facilityId, `Custom audience "${audienceName}" created with ${tenants.length} records`]
        ).catch(() => {})

        return res.json({
          success: true,
          sync: syncRow[0],
          metaResponse: { audience_id: metaAudienceId, num_received: uploadData.num_received },
        })
      }

      // Action: refresh existing audience
      if (action === 'refresh') {
        if (!audienceSyncId) return res.status(400).json({ error: 'Missing audienceSyncId' })

        const sync = await queryOne('SELECT * FROM audience_syncs WHERE id = $1', [audienceSyncId])
        if (!sync) return res.status(404).json({ error: 'Audience sync not found' })

        // Get fresh tenant data
        let tenants
        if (sync.source_type === 'active_tenants') {
          tenants = await query('SELECT email, phone FROM tenants WHERE facility_id = $1 AND status = $2 AND (email IS NOT NULL OR phone IS NOT NULL)', [facilityId, 'active'])
        } else if (sync.source_type === 'moved_out') {
          tenants = await query('SELECT email, phone FROM tenants WHERE facility_id = $1 AND status = $2 AND (email IS NOT NULL OR phone IS NOT NULL)', [facilityId, 'moved_out'])
        } else {
          tenants = await query('SELECT email, phone FROM partial_leads WHERE facility_id = $1 AND email IS NOT NULL', [facilityId])
        }

        // Upload to existing audience (replace)
        const schema = ['EMAIL', 'PHONE']
        const data = tenants.filter(t => t.email || t.phone).map(t => [
          t.email ? sha256(t.email) : '',
          t.phone ? sha256(normalizePhone(t.phone)) : '',
        ])

        await fetch(`https://graph.facebook.com/v19.0/${sync.meta_audience_id}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token, payload: { schema, data } }),
        })

        await query(
          'UPDATE audience_syncs SET record_count = $1, last_synced_at = NOW(), updated_at = NOW() WHERE id = $2',
          [tenants.length, audienceSyncId]
        )

        return res.json({ success: true, recordCount: tenants.length })
      }

      // Action: create lookalike from existing custom audience
      if (action === 'create-lookalike') {
        if (!audienceSyncId || !audienceName) {
          return res.status(400).json({ error: 'Missing audienceSyncId or audienceName' })
        }

        const sync = await queryOne('SELECT * FROM audience_syncs WHERE id = $1', [audienceSyncId])
        if (!sync || !sync.meta_audience_id) {
          return res.status(404).json({ error: 'Source audience not found' })
        }

        const lookalikeRes = await fetch(
          `https://graph.facebook.com/v19.0/act_${account_id}/customaudiences`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token,
              name: audienceName,
              subtype: 'LOOKALIKE',
              origin_audience_id: sync.meta_audience_id,
              lookalike_spec: JSON.stringify({ country: 'US', ratio: 0.01, type: 'similarity' }),
            }),
          }
        )
        const lookalikeData = await lookalikeRes.json()

        if (lookalikeData.error) {
          return res.status(400).json({ error: `Meta API error: ${lookalikeData.error.message}` })
        }

        const syncRow = await query(
          `INSERT INTO audience_syncs (facility_id, connection_id, audience_type, audience_name, meta_audience_id, source_type, status, last_synced_at)
           VALUES ($1, (SELECT id FROM platform_connections WHERE facility_id = $1 AND platform = 'meta' LIMIT 1), 'lookalike', $2, $3, $4, 'ready', NOW())
           RETURNING *`,
          [facilityId, audienceName, lookalikeData.id, `lookalike_from_${sync.source_type}`]
        )

        return res.json({ success: true, sync: syncRow[0] })
      }

      return res.status(400).json({ error: 'Invalid action. Use: create, refresh, or create-lookalike' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('audience-sync error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
