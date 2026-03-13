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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

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

/*
  Quick Action Email Templates

  Pre-built email templates for common pipeline actions.
  Each template can be customized with lead data before sending via Resend.

  Templates:
  1. follow_up — Warm follow-up after initial audit submission
  2. audit_delivery — Send the generated audit report link
  3. proposal — Send pricing/proposal details with next steps
  4. check_in — Periodic check-in for leads that have gone quiet
  5. onboarding_reminder — Remind signed client to complete onboarding
  6. campaign_update — Share campaign performance highlights

  GET — list available templates
  POST — send a template email to a lead
*/

const TEMPLATES = {
  follow_up: {
    id: 'follow_up',
    name: 'Follow Up',
    description: 'Warm follow-up after audit form submission',
    subject: (lead) => `Quick question about ${esc(lead.facilityName)}`,
    body: (lead) => {
      const firstName = esc(lead.name.trim().split(' ')[0])
      return `
        <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.7; color: #1a1a1a;">
          <p>Hey ${firstName},</p>
          <p>Thanks for filling out the facility audit form for <strong>${esc(lead.facilityName)}</strong>. I took a look at your numbers and I have some initial thoughts on how we could help you fill units faster.</p>
          <p>Would you have 15 minutes this week for a quick call? I'd love to walk you through what we're seeing in your market and share a few ideas specific to your facility.</p>
          <p>No pressure at all — just want to make sure you have the full picture before deciding if we're a fit.</p>
          <p style="margin-top: 24px;">
            Blake Burkett<br/>
            StowStack<br/>
            <a href="tel:2699298541" style="color: #16a34a; text-decoration: none;">269-929-8541</a><br/>
            <a href="mailto:blake@storepawpaw.com" style="color: #16a34a; text-decoration: none;">blake@storepawpaw.com</a>
          </p>
        </div>`
    },
  },
  audit_delivery: {
    id: 'audit_delivery',
    name: 'Audit Delivery',
    description: 'Deliver the marketing audit report',
    subject: (lead) => `Your ${esc(lead.facilityName)} marketing audit is ready`,
    body: (lead) => {
      const firstName = esc(lead.name.trim().split(' ')[0])
      return `
        <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.7; color: #1a1a1a;">
          <p>Hey ${firstName},</p>
          <p>Your marketing audit for <strong>${esc(lead.facilityName)}</strong> is ready. I've broken down your vacancy cost, identified your market opportunity score, and put together projected metrics for what a targeted Meta campaign could look like.</p>
          <div style="margin: 24px 0; padding: 20px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px;">
            <p style="margin: 0 0 8px; font-weight: 600; color: #166534;">Key Highlights</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #374151;">
              <li>Vacancy cost analysis for your facility size and occupancy</li>
              <li>Market opportunity assessment with competitive positioning</li>
              <li>Projected campaign performance and ROI estimates</li>
              <li>6 specific action items to start filling units</li>
            </ul>
          </div>
          <p>I'd love to walk you through the numbers on a quick call. What does your schedule look like this week?</p>
          <p style="margin-top: 24px;">
            Blake Burkett<br/>
            StowStack<br/>
            <a href="tel:2699298541" style="color: #16a34a; text-decoration: none;">269-929-8541</a><br/>
            <a href="mailto:blake@storepawpaw.com" style="color: #16a34a; text-decoration: none;">blake@storepawpaw.com</a>
          </p>
        </div>`
    },
  },
  proposal: {
    id: 'proposal',
    name: 'Proposal',
    description: 'Send pricing and next steps',
    subject: (lead) => `StowStack proposal for ${esc(lead.facilityName)}`,
    body: (lead) => {
      const firstName = esc(lead.name.trim().split(' ')[0])
      return `
        <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.7; color: #1a1a1a;">
          <p>Hey ${firstName},</p>
          <p>Great talking with you about <strong>${esc(lead.facilityName)}</strong>. As discussed, here's what working with StowStack looks like:</p>
          <div style="margin: 24px 0; padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
            <p style="margin: 0 0 12px; font-weight: 600; color: #0f172a;">What's Included</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #374151; line-height: 2;">
              <li>Full-funnel Meta campaign architecture (CBO + Advantage+)</li>
              <li>Custom creative development and A/B testing</li>
              <li>Meta Pixel + Conversions API installation</li>
              <li>Monthly performance reporting tied to move-ins</li>
              <li>Dedicated account management</li>
              <li>Call handling and speed-to-lead audit</li>
            </ul>
          </div>
          <p>Campaigns typically go live within 48-72 hours of sign-on. You'll have access to your own client portal where you can track leads, move-ins, and ROAS in real time.</p>
          <p>Ready to get started? Just reply to this email and we'll kick things off.</p>
          <p style="margin-top: 24px;">
            Blake Burkett<br/>
            StowStack<br/>
            <a href="tel:2699298541" style="color: #16a34a; text-decoration: none;">269-929-8541</a><br/>
            <a href="mailto:blake@storepawpaw.com" style="color: #16a34a; text-decoration: none;">blake@storepawpaw.com</a>
          </p>
        </div>`
    },
  },
  check_in: {
    id: 'check_in',
    name: 'Check In',
    description: 'Re-engage a quiet lead',
    subject: (lead) => `Still thinking about ${esc(lead.facilityName)}?`,
    body: (lead) => {
      const firstName = esc(lead.name.trim().split(' ')[0])
      return `
        <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.7; color: #1a1a1a;">
          <p>Hey ${firstName},</p>
          <p>Just checking in — I know things get busy. Wanted to see if you still had questions about filling units at <strong>${esc(lead.facilityName)}</strong>.</p>
          <p>No worries if the timing isn't right. But if occupancy is still a concern, we're here whenever you're ready to chat.</p>
          <p>Either way, I appreciate you taking the time to fill out the audit form.</p>
          <p style="margin-top: 24px;">
            Blake Burkett<br/>
            StowStack<br/>
            <a href="tel:2699298541" style="color: #16a34a; text-decoration: none;">269-929-8541</a><br/>
            <a href="mailto:blake@storepawpaw.com" style="color: #16a34a; text-decoration: none;">blake@storepawpaw.com</a>
          </p>
        </div>`
    },
  },
  onboarding_reminder: {
    id: 'onboarding_reminder',
    name: 'Onboarding Reminder',
    description: 'Remind client to complete campaign setup',
    subject: (lead) => `Quick reminder: Finish your ${esc(lead.facilityName)} campaign setup`,
    body: (lead) => {
      const firstName = esc(lead.name.trim().split(' ')[0])
      return `
        <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.7; color: #1a1a1a;">
          <p>Hey ${firstName},</p>
          <p>Just a quick reminder — we're getting your campaigns ready to launch, but we still need a few details from you to make sure everything is dialed in for <strong>${esc(lead.facilityName)}</strong>.</p>
          <div style="margin: 24px 0; padding: 20px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; text-align: center;">
            <p style="margin: 0 0 12px; font-weight: 600; color: #166534;">Complete Your Campaign Setup</p>
            <a href="https://stowstack.co/portal" style="display: inline-block; padding: 14px 28px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Open Your Portal</a>
          </div>
          <p>It only takes about 5 minutes. The sooner we have your info, the sooner your ads go live.</p>
          <p style="margin-top: 24px;">
            Anna Almeida<br/>
            StowStack<br/>
            <a href="mailto:anna@storepawpaw.com" style="color: #16a34a; text-decoration: none;">anna@storepawpaw.com</a>
          </p>
        </div>`
    },
  },
  campaign_update: {
    id: 'campaign_update',
    name: 'Campaign Update',
    description: 'Share performance highlights with client',
    subject: (lead) => `${esc(lead.facilityName)} campaign update`,
    body: (lead) => {
      const firstName = esc(lead.name.trim().split(' ')[0])
      return `
        <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.7; color: #1a1a1a;">
          <p>Hey ${firstName},</p>
          <p>Here's a quick update on how your <strong>${esc(lead.facilityName)}</strong> campaigns are performing.</p>
          <p>You can always check your full dashboard with real-time metrics at any time:</p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="https://stowstack.co/portal" style="display: inline-block; padding: 14px 28px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">View Your Dashboard</a>
          </div>
          <p>Let us know if you have any questions about the numbers or if there's anything you'd like us to adjust in the campaigns.</p>
          <p style="margin-top: 24px;">
            Blake Burkett<br/>
            StowStack<br/>
            <a href="tel:2699298541" style="color: #16a34a; text-decoration: none;">269-929-8541</a><br/>
            <a href="mailto:blake@storepawpaw.com" style="color: #16a34a; text-decoration: none;">blake@storepawpaw.com</a>
          </p>
        </div>`
    },
  },
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
  Promise.all([
    redis.lpush('activity:global', entry).then(() => redis.ltrim('activity:global', 0, 499)),
    redis.lpush(`activity:lead:${leadId}`, entry).then(() => redis.ltrim(`activity:lead:${leadId}`, 0, 99)),
  ]).catch(err => console.error('Activity log error:', err))
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' })

  // GET — list available templates
  if (req.method === 'GET') {
    const templateList = Object.values(TEMPLATES).map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
    }))
    return res.status(200).json({ templates: templateList })
  }

  // POST — send a template email
  if (req.method === 'POST') {
    const { templateId, leadId } = req.body || {}
    if (!templateId || !leadId) {
      return res.status(400).json({ error: 'Missing templateId or leadId' })
    }

    const template = TEMPLATES[templateId]
    if (!template) {
      return res.status(400).json({ error: 'Unknown template' })
    }

    const redis = getRedis()
    if (!redis) {
      return res.status(200).json({ success: true, preview: true, message: 'No data store — email not sent' })
    }

    try {
      const raw = await redis.get(`lead:${leadId}`)
      if (!raw) return res.status(404).json({ error: 'Lead not found' })
      const lead = typeof raw === 'string' ? JSON.parse(raw) : raw

      if (!lead.email) {
        return res.status(400).json({ error: 'Lead has no email address' })
      }

      const subject = template.subject(lead)
      const html = template.body(lead)

      // Send via Resend
      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey) {
        return res.status(200).json({
          success: true,
          preview: true,
          message: 'No email API key configured — email not sent',
          subject,
        })
      }

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: templateId === 'onboarding_reminder'
            ? 'Anna at StowStack <noreply@stowstack.co>'
            : 'Blake at StowStack <noreply@stowstack.co>',
          to: lead.email,
          cc: 'anna@storepawpaw.com',
          reply_to: ['blake@storepawpaw.com', 'anna@storepawpaw.com'],
          subject,
          html,
        }),
      })

      if (!emailRes.ok) {
        const text = await emailRes.text()
        console.error('Template email failed:', emailRes.status, text)
        return res.status(500).json({ error: 'Failed to send email' })
      }

      // Log activity
      logActivity(redis, {
        type: 'note_added',
        leadId,
        leadName: lead.name || '',
        facilityName: lead.facilityName || '',
        detail: `Sent "${template.name}" email to ${lead.email}`,
        meta: { templateId },
      })

      return res.status(200).json({ success: true, subject })
    } catch (err) {
      console.error('Send template error:', err)
      return res.status(500).json({ error: 'Failed to send email' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
