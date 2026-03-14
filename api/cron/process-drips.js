import { Redis } from '@upstash/redis'
import { SEQUENCES } from '../drip-sequences.js'

/*
  Vercel Cron: Process Drip Sequences
  Schedule: Every hour (0 * * * *)

  Scans all drip:* keys in Redis, sends due emails, and advances sequences.
  Auto-cancels sequences when lead status changes to call_scheduled/client_signed/lost.
*/

const CANCEL_STATUSES = ['call_scheduled', 'client_signed', 'lost']

function getRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null
  return new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })
}

function esc(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function logActivity(redis, { type, leadId, leadName, facilityName, detail, meta }) {
  if (!redis) return
  const entry = JSON.stringify({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type, leadId, leadName, facilityName,
    detail: (detail || '').slice(0, 500),
    meta: meta || {},
    timestamp: new Date().toISOString(),
  })
  return Promise.all([
    redis.lpush('activity:global', entry).then(() => redis.ltrim('activity:global', 0, 499)),
    redis.lpush(`activity:lead:${leadId}`, entry).then(() => redis.ltrim(`activity:lead:${leadId}`, 0, 99)),
  ]).catch(err => console.error('Activity log error:', err))
}

// Import template definitions inline to avoid circular deps with handler
// We only need subject + body generation, which lives in send-template.js TEMPLATES
// For the cron, we re-import the templates directly
async function getTemplates() {
  // Dynamic import to get TEMPLATES from send-template
  // Since Vercel serverless bundles each file independently, we inline the template lookup
  const mod = await import('../send-template.js')
  // send-template.js default export is the handler, but TEMPLATES is not exported
  // So we need to fetch template subject/body via the send-template API
  // Instead, we'll send directly using Resend with the lead data
  return null
}

async function sendTemplateEmail(templateId, lead, apiKey) {
  // We need the template definitions — since they're not exported from send-template.js,
  // we'll call the Resend API directly with the lead data.
  // The cron processor sends emails by hitting the send-template endpoint internally.
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  const adminKey = process.env.ADMIN_SECRET || 'stowstack-admin-2024'

  const res = await fetch(`${baseUrl}/api/send-template`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey,
    },
    body: JSON.stringify({ templateId, leadId: lead.id }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`send-template failed (${res.status}): ${text}`)
  }

  return res.json()
}

export default async function handler(req, res) {
  // Vercel Cron sends GET requests with Authorization header
  // Verify the cron secret to prevent unauthorized access
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const redis = getRedis()
  if (!redis) {
    return res.status(200).json({ message: 'No data store configured, skipping' })
  }

  const now = new Date()
  const results = { processed: 0, sent: 0, cancelled: 0, completed: 0, errors: [] }

  try {
    // Scan for all drip:* keys
    const dripKeys = []
    let cursor = 0
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: 'drip:*', count: 100 })
      cursor = Number(nextCursor)
      dripKeys.push(...keys)
    } while (cursor !== 0)

    for (const key of dripKeys) {
      try {
        const raw = await redis.get(key)
        if (!raw) continue
        const drip = typeof raw === 'string' ? JSON.parse(raw) : raw

        // Skip non-active drips
        if (drip.status !== 'active') continue
        results.processed++

        // Check if lead status should cancel the sequence
        const leadRaw = await redis.get(`lead:${drip.leadId}`)
        if (!leadRaw) {
          // Lead deleted — cancel drip
          drip.status = 'cancelled'
          drip.cancelledAt = now.toISOString()
          drip.cancelReason = 'lead_deleted'
          await redis.set(key, JSON.stringify(drip))
          results.cancelled++
          continue
        }

        const lead = typeof leadRaw === 'string' ? JSON.parse(leadRaw) : leadRaw
        lead.id = drip.leadId // ensure id is available for send-template

        if (CANCEL_STATUSES.includes(lead.status)) {
          drip.status = 'cancelled'
          drip.cancelledAt = now.toISOString()
          drip.cancelReason = `lead_status_${lead.status}`
          await redis.set(key, JSON.stringify(drip))
          await logActivity(redis, {
            type: 'drip_cancelled',
            leadId: drip.leadId,
            leadName: lead.name || '',
            facilityName: lead.facilityName || '',
            detail: `Drip sequence auto-cancelled: lead status changed to ${lead.status}`,
            meta: { sequenceId: drip.sequenceId },
          })
          results.cancelled++
          continue
        }

        // Check if it's time to send
        const nextSendAt = new Date(drip.nextSendAt)
        if (nextSendAt > now) continue // Not due yet

        const sequence = SEQUENCES[drip.sequenceId]
        if (!sequence) continue

        const step = sequence.steps[drip.currentStep]
        if (!step) {
          // No more steps — mark complete
          drip.status = 'completed'
          drip.completedAt = now.toISOString()
          await redis.set(key, JSON.stringify(drip))
          results.completed++
          continue
        }

        // Send the email
        try {
          await sendTemplateEmail(step.templateId, lead, process.env.RESEND_API_KEY)

          // Record in history
          drip.history.push({
            step: drip.currentStep,
            templateId: step.templateId,
            sentAt: now.toISOString(),
          })

          // Advance to next step
          drip.currentStep++

          if (drip.currentStep >= sequence.steps.length) {
            // Sequence complete
            drip.status = 'completed'
            drip.completedAt = now.toISOString()
            results.completed++
          } else {
            // Calculate next send time
            const nextStep = sequence.steps[drip.currentStep]
            const enrolledAt = new Date(drip.enrolledAt)
            drip.nextSendAt = new Date(enrolledAt.getTime() + nextStep.delayDays * 24 * 60 * 60 * 1000).toISOString()
          }

          await redis.set(key, JSON.stringify(drip))

          await logActivity(redis, {
            type: 'drip_sent',
            leadId: drip.leadId,
            leadName: lead.name || '',
            facilityName: lead.facilityName || '',
            detail: `Drip email sent: "${step.label}" (${step.templateId})`,
            meta: { sequenceId: drip.sequenceId, step: drip.currentStep - 1, templateId: step.templateId },
          })

          results.sent++
        } catch (emailErr) {
          console.error(`Failed to send drip email for lead ${drip.leadId}:`, emailErr.message)
          results.errors.push({ leadId: drip.leadId, error: emailErr.message })
        }
      } catch (dripErr) {
        console.error(`Error processing drip ${key}:`, dripErr.message)
        results.errors.push({ key, error: dripErr.message })
      }
    }

    console.log('Drip cron results:', JSON.stringify(results))
    return res.status(200).json({ success: true, ...results })
  } catch (err) {
    console.error('Drip cron fatal error:', err)
    return res.status(500).json({ error: 'Cron processing failed', message: err.message })
  }
}
