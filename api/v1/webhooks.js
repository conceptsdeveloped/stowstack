import crypto from 'crypto'
import { query, queryOne } from '../_db.js'
import { setV1Cors, requireApiAuth, requireScope } from '../_api-auth.js'

const VALID_EVENTS = [
  'lead.created', 'lead.updated',
  'unit.updated',
  'facility.updated',
  'special.created', 'special.updated',
]

export default async function handler(req, res) {
  setV1Cors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const auth = await requireApiAuth(req, res)
  if (!auth) return
  const { apiKey } = auth
  const orgId = apiKey.organization_id

  if (!requireScope(res, apiKey, 'webhooks:manage')) return

  const { id } = req.query

  // ── GET ──
  if (req.method === 'GET') {
    try {
      if (id) {
        const webhook = await queryOne(
          `SELECT id, url, events, active, failure_count, last_triggered_at, last_status, created_at, updated_at
           FROM webhooks WHERE id = $1 AND organization_id = $2`,
          [id, orgId]
        )
        if (!webhook) return res.status(404).json({ error: 'Webhook not found' })

        const deliveries = await query(
          `SELECT id, event, status, duration_ms, error, created_at
           FROM webhook_deliveries WHERE webhook_id = $1
           ORDER BY created_at DESC LIMIT 20`,
          [id]
        )

        return res.status(200).json({ webhook, deliveries })
      }

      const webhooks = await query(
        `SELECT id, url, events, active, failure_count, last_triggered_at, last_status, created_at
         FROM webhooks WHERE organization_id = $1 ORDER BY created_at DESC`,
        [orgId]
      )
      return res.status(200).json({ webhooks })
    } catch (err) {
      console.error('v1/webhooks GET failed:', err.message)
      return res.status(500).json({ error: 'Failed to fetch webhooks' })
    }
  }

  // ── POST: register a webhook or send test ping ──
  if (req.method === 'POST') {
    // Test ping: POST /api/v1/webhooks?id=xxx&action=test
    if (id && req.query.action === 'test') {
      const webhook = await queryOne(
        'SELECT id, url, secret, events FROM webhooks WHERE id = $1 AND organization_id = $2',
        [id, orgId]
      )
      if (!webhook) return res.status(404).json({ error: 'Webhook not found' })

      const testPayload = {
        event: 'webhook.test',
        data: { message: 'This is a test webhook from StowStack', webhookId: webhook.id },
        timestamp: new Date().toISOString(),
      }
      const body = JSON.stringify(testPayload)
      const signature = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex')

      const start = Date.now()
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)

        const resp = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-StowStack-Event': 'webhook.test',
            'X-StowStack-Signature': `sha256=${signature}`,
            'X-StowStack-Delivery': crypto.randomUUID(),
          },
          body,
          signal: controller.signal,
        })

        clearTimeout(timeout)
        const responseBody = (await resp.text()).slice(0, 1024)
        const durationMs = Date.now() - start

        // Log delivery
        await query(
          `INSERT INTO webhook_deliveries (webhook_id, event, payload, status, response_body, duration_ms)
           VALUES ($1, 'webhook.test', $2, $3, $4, $5)`,
          [webhook.id, testPayload, resp.status, responseBody, durationMs]
        ).catch(() => {})

        return res.status(200).json({
          success: resp.status >= 200 && resp.status < 300,
          status: resp.status,
          durationMs,
          responsePreview: responseBody.slice(0, 200),
        })
      } catch (err) {
        const durationMs = Date.now() - start
        const error = err.name === 'AbortError' ? 'Timeout (5s)' : err.message
        return res.status(200).json({ success: false, error, durationMs })
      }
    }

    const { url, events } = req.body || {}

    if (!url || !events?.length) {
      return res.status(400).json({ error: 'url and events[] are required' })
    }

    const invalid = events.filter(e => !VALID_EVENTS.includes(e))
    if (invalid.length) {
      return res.status(400).json({ error: `Invalid events: ${invalid.join(', ')}. Valid: ${VALID_EVENTS.join(', ')}` })
    }

    try {
      const urlObj = new URL(url)
      if (urlObj.protocol !== 'https:') {
        return res.status(400).json({ error: 'Webhook URL must use HTTPS' })
      }
    } catch {
      return res.status(400).json({ error: 'Invalid webhook URL' })
    }

    const secret = crypto.randomBytes(32).toString('hex')

    try {
      const webhook = await queryOne(
        `INSERT INTO webhooks (organization_id, url, events, secret)
         VALUES ($1, $2, $3, $4)
         RETURNING id, url, events, active, secret, created_at`,
        [orgId, url, events, secret]
      )
      return res.status(200).json({ webhook })
    } catch (err) {
      console.error('v1/webhooks POST failed:', err.message)
      return res.status(500).json({ error: 'Failed to create webhook' })
    }
  }

  // ── PATCH: update webhook ──
  if (req.method === 'PATCH') {
    if (!id) return res.status(400).json({ error: 'id query param is required' })

    const fieldMap = { url: 'url', events: 'events', active: 'active' }
    const sets = []
    const params = []
    let paramIdx = 1

    for (const [bodyKey, dbCol] of Object.entries(fieldMap)) {
      if (req.body?.[bodyKey] !== undefined) {
        sets.push(`${dbCol} = $${paramIdx++}`)
        params.push(req.body[bodyKey])
      }
    }

    if (!sets.length) return res.status(400).json({ error: 'No valid fields to update' })

    // Validate events if provided
    if (req.body?.events) {
      const invalid = req.body.events.filter(e => !VALID_EVENTS.includes(e))
      if (invalid.length) {
        return res.status(400).json({ error: `Invalid events: ${invalid.join(', ')}` })
      }
    }

    // Reset failure count if reactivating
    if (req.body?.active === true) {
      sets.push('failure_count = 0')
    }

    sets.push('updated_at = NOW()')
    params.push(id, orgId)

    try {
      const webhook = await queryOne(
        `UPDATE webhooks SET ${sets.join(', ')}
         WHERE id = $${paramIdx++} AND organization_id = $${paramIdx}
         RETURNING id, url, events, active, failure_count, last_triggered_at, created_at, updated_at`,
        params
      )
      if (!webhook) return res.status(404).json({ error: 'Webhook not found' })
      return res.status(200).json({ webhook })
    } catch (err) {
      console.error('v1/webhooks PATCH failed:', err.message)
      return res.status(500).json({ error: 'Failed to update webhook' })
    }
  }

  // ── DELETE ──
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id query param is required' })

    try {
      const row = await queryOne(
        'DELETE FROM webhooks WHERE id = $1 AND organization_id = $2 RETURNING id',
        [id, orgId]
      )
      if (!row) return res.status(404).json({ error: 'Webhook not found' })
      return res.status(200).json({ success: true, id: row.id })
    } catch (err) {
      console.error('v1/webhooks DELETE failed:', err.message)
      return res.status(500).json({ error: 'Failed to delete webhook' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
