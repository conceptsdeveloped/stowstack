import crypto from 'crypto'
import { query, queryOne } from './_db.js'

/**
 * Dispatch webhooks for an event to all matching active webhooks for an org.
 * Fire-and-forget — never throws, never blocks the caller.
 *
 * @param {string} organizationId
 * @param {string} event - e.g. 'lead.created', 'unit.updated'
 * @param {object} payload - event data to send
 */
export async function dispatchWebhook(organizationId, event, payload) {
  try {
    const hooks = await query(
      `SELECT id, url, secret FROM webhooks
       WHERE organization_id = $1 AND $2 = ANY(events) AND active = TRUE`,
      [organizationId, event]
    )

    if (!hooks.length) return

    await Promise.allSettled(hooks.map(hook => deliverWebhook(hook, event, payload)))
  } catch (err) {
    console.error('[webhook] dispatch error:', err.message)
  }
}

/**
 * Deliver a single webhook: POST with HMAC signature, log the result.
 */
async function deliverWebhook(hook, event, payload) {
  const deliveryId = crypto.randomUUID()
  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() })
  const signature = crypto.createHmac('sha256', hook.secret).update(body).digest('hex')

  const start = Date.now()
  let status = null
  let responseBody = null
  let error = null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const resp = await fetch(hook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-StowStack-Event': event,
        'X-StowStack-Signature': `sha256=${signature}`,
        'X-StowStack-Delivery': deliveryId,
      },
      body,
      signal: controller.signal,
    })

    clearTimeout(timeout)
    status = resp.status
    responseBody = (await resp.text()).slice(0, 1024)

    // Success: reset failure count
    if (status >= 200 && status < 300) {
      await query(
        `UPDATE webhooks SET failure_count = 0, last_triggered_at = NOW(), last_status = $2, updated_at = NOW() WHERE id = $1`,
        [hook.id, status]
      )
    } else {
      await incrementFailure(hook.id, status)
    }
  } catch (err) {
    error = err.name === 'AbortError' ? 'Timeout (5s)' : err.message
    await incrementFailure(hook.id, null)
  }

  const durationMs = Date.now() - start

  // Log delivery
  await query(
    `INSERT INTO webhook_deliveries (webhook_id, event, payload, status, response_body, duration_ms, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [hook.id, event, payload, status, responseBody, durationMs, error]
  ).catch(e => console.error('[webhook] delivery log failed:', e.message))
}

/**
 * Increment failure count; auto-disable webhook at 10 consecutive failures.
 */
async function incrementFailure(hookId, status) {
  try {
    await query(
      `UPDATE webhooks SET
        failure_count = failure_count + 1,
        last_triggered_at = NOW(),
        last_status = $2,
        active = CASE WHEN failure_count + 1 >= 10 THEN FALSE ELSE active END,
        updated_at = NOW()
       WHERE id = $1`,
      [hookId, status]
    )
  } catch (err) {
    console.error('[webhook] failure update error:', err.message)
  }
}
