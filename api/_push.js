import webpush from 'web-push'
import { query } from './_db.js'

const configured =
  process.env.VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_SUBJECT

if (configured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

/**
 * Send a push notification to all active subscribers (or filtered by user).
 * Automatically cleans up stale subscriptions (410 Gone).
 *
 * @param {{ title: string, body: string, url?: string, tag?: string }} payload
 * @param {{ userType?: string, userId?: string }} [filter]
 */
export async function sendPushToAll(payload, { userType, userId } = {}) {
  if (!configured) {
    console.warn('[push] VAPID keys not configured — skipping push')
    return
  }

  let sql = 'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE active = true'
  const params = []

  if (userType) {
    params.push(userType)
    sql += ` AND user_type = $${params.length}`
  }
  if (userId) {
    params.push(userId)
    sql += ` AND user_id = $${params.length}`
  }

  const subs = await query(sql, params)
  if (!subs.length) return

  const message = JSON.stringify(payload)
  const staleIds = []

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message
        )
        // Update last_used_at
        query('UPDATE push_subscriptions SET last_used_at = NOW() WHERE id = $1', [sub.id])
          .catch(() => {})
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          staleIds.push(sub.id)
        } else {
          console.error(`[push] Failed to send to ${sub.endpoint}:`, err.message)
        }
      }
    })
  )

  // Clean up stale subscriptions
  if (staleIds.length) {
    await query(
      `UPDATE push_subscriptions SET active = false WHERE id = ANY($1::uuid[])`,
      [staleIds]
    ).catch((err) => console.error('[push] Cleanup error:', err.message))
  }
}
