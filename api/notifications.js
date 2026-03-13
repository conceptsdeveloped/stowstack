import { Redis } from '@upstash/redis'

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return req.headers['x-admin-key'] === ADMIN_KEY
}

function getRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null
  return new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const redis = getRedis()
  if (!redis) {
    return res.status(200).json({ notifications: [], unreadCount: 0, lastSeen: null })
  }

  try {
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const notifications = []

    // Fetch lastSeen timestamp
    let lastSeen = await redis.get('notifications:lastSeen')

    // --- 1. New leads (submitted in last 24h) ---
    const leadKeys = await redis.keys('lead:*')
    if (leadKeys.length) {
      const pipeline = redis.pipeline()
      leadKeys.forEach(k => pipeline.get(k))
      const leadResults = await pipeline.exec()

      for (let i = 0; i < leadResults.length; i++) {
        const raw = leadResults[i]
        const record = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (!record) continue

        const leadId = leadKeys[i].replace('lead:', '')
        const createdAt = record.createdAt ? new Date(record.createdAt) : null

        // New leads within 24h
        if (createdAt && createdAt >= twentyFourHoursAgo) {
          notifications.push({
            id: `new_lead_${leadId}`,
            type: 'new_lead',
            title: 'New lead submitted',
            detail: `${record.name || 'Unknown'} — ${record.facilityName || 'Unknown facility'}`,
            timestamp: record.createdAt,
            leadId,
            read: false,
          })
        }

        // Overdue follow-ups
        if (
          record.followUpDate &&
          new Date(record.followUpDate) < now &&
          !['lost', 'client_signed'].includes(record.status)
        ) {
          notifications.push({
            id: `overdue_${leadId}`,
            type: 'overdue',
            title: 'Overdue follow-up',
            detail: `${record.name || 'Unknown'} — follow-up was due ${record.followUpDate}`,
            timestamp: record.followUpDate,
            leadId,
            read: false,
          })
        }
      }
    }

    // --- 2. New unread client messages (last 24h) ---
    const messageKeys = await redis.keys('messages:*')
    if (messageKeys.length) {
      const msgPipeline = redis.pipeline()
      messageKeys.forEach(k => msgPipeline.lrange(k, 0, 0)) // get most recent message
      const msgResults = await msgPipeline.exec()

      for (let i = 0; i < msgResults.length; i++) {
        const messages = msgResults[i]
        if (!messages || !messages.length) continue

        const lastMsg = typeof messages[0] === 'string' ? JSON.parse(messages[0]) : messages[0]
        if (!lastMsg) continue

        if (
          lastMsg.from === 'client' &&
          lastMsg.timestamp &&
          new Date(lastMsg.timestamp) >= twentyFourHoursAgo
        ) {
          const threadId = messageKeys[i].replace('messages:', '')
          notifications.push({
            id: `new_message_${threadId}_${lastMsg.timestamp}`,
            type: 'new_message',
            title: 'New client message',
            detail: lastMsg.text
              ? lastMsg.text.slice(0, 120) + (lastMsg.text.length > 120 ? '…' : '')
              : 'New message received',
            timestamp: lastMsg.timestamp,
            leadId: threadId,
            read: false,
          })
        }
      }
    }

    // --- 3. Campaign alerts ---
    const alertKeys = await redis.keys('campaign-alert:*')
    if (alertKeys.length) {
      const alertPipeline = redis.pipeline()
      alertKeys.forEach(k => alertPipeline.get(k))
      const alertResults = await alertPipeline.exec()

      for (let i = 0; i < alertResults.length; i++) {
        const raw = alertResults[i]
        const alert = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (!alert) continue

        notifications.push({
          id: `alert_${alertKeys[i].replace('campaign-alert:', '')}`,
          type: 'alert',
          title: alert.title || 'Campaign alert',
          detail: alert.detail || alert.message || '',
          timestamp: alert.timestamp || alert.createdAt || now.toISOString(),
          read: false,
        })
      }
    }

    // Sort by timestamp descending, cap at 50
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    const capped = notifications.slice(0, 50)

    // Mark read status based on lastSeen
    if (lastSeen) {
      const lastSeenDate = new Date(lastSeen)
      capped.forEach(n => {
        if (new Date(n.timestamp) <= lastSeenDate) {
          n.read = true
        }
      })
    }

    const unreadCount = capped.filter(n => !n.read).length

    // Update lastSeen if ?markSeen=true
    const { markSeen } = req.query || {}
    if (markSeen === 'true') {
      const nowISO = now.toISOString()
      await redis.set('notifications:lastSeen', nowISO)
      lastSeen = nowISO
      // Mark all as read in response
      capped.forEach(n => { n.read = true })
    }

    return res.status(200).json({
      notifications: capped,
      unreadCount: markSeen === 'true' ? 0 : unreadCount,
      lastSeen,
    })
  } catch (err) {
    console.error('Notifications error:', err)
    return res.status(500).json({ error: 'Failed to aggregate notifications' })
  }
}
