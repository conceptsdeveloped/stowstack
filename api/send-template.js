import { query, queryOne } from './_db.js'

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

function esc(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/*
  Quick Action Email Templates
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
  value_add: {
    id: 'value_add',
    name: 'Value Add',
    description: 'Personalized tip based on facility challenge (drip sequence)',
    subject: (lead) => `A quick tip for ${esc(lead.facilityName)}`,
    body: (lead) => {
      const firstName = esc(lead.name.trim().split(' ')[0])
      const issue = lead.biggestIssue || ''
      let tip = ''
      if (issue === 'lease-up' || issue === 'low-occupancy') {
        tip = `
          <p>Since you mentioned occupancy is a priority at <strong>${esc(lead.facilityName)}</strong>, here is something we have seen work really well for facilities in your position:</p>
          <div style="margin: 20px 0; padding: 16px 20px; background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 0 8px 8px 0;">
            <p style="margin: 0 0 8px; font-weight: 600; color: #166534;">Geo-targeted move-in specials</p>
            <p style="margin: 0; font-size: 14px; color: #374151;">Operators who run hyper-local Meta ads with a first-month discount to people actively searching for storage within a 10-mile radius typically see 3-5x better cost-per-lead than broad campaigns. The key is pairing the offer with a dedicated landing page that has one clear call to action.</p>
          </div>`
      } else if (issue === 'climate-controlled') {
        tip = `
          <p>Climate-controlled units sitting empty is more common than you'd think, and it is usually a positioning problem rather than a demand problem. Here is what we have seen work:</p>
          <div style="margin: 20px 0; padding: 16px 20px; background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 0 8px 8px 0;">
            <p style="margin: 0 0 8px; font-weight: 600; color: #166534;">Lead with the problem, not the feature</p>
            <p style="margin: 0; font-size: 14px; color: #374151;">Instead of advertising "climate-controlled units available," target people storing furniture, electronics, wine, or documents and emphasize protection. Ads that say "Don't let humidity ruin your furniture" outperform generic unit listings by 2-3x in our experience.</p>
          </div>`
      } else if (issue === 'drive-up') {
        tip = `
          <p>Drive-up units are usually the easiest to fill when you nail the targeting. Here is a pattern we keep seeing work:</p>
          <div style="margin: 20px 0; padding: 16px 20px; background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 0 8px 8px 0;">
            <p style="margin: 0 0 8px; font-weight: 600; color: #166534;">Target life events in your zip codes</p>
            <p style="margin: 0; font-size: 14px; color: #374151;">People moving, downsizing, renovating, or going through a divorce are your best prospects for drive-up units. Meta lets you target these life events with surprising precision. Pair that with "reserve online in 60 seconds" messaging and conversion rates jump significantly.</p>
          </div>`
      } else if (issue === 'vehicle-rv-boat') {
        tip = `
          <p>Vehicle, RV, and boat storage has massive seasonal demand swings, and the operators who win are the ones who get ahead of the curve:</p>
          <div style="margin: 20px 0; padding: 16px 20px; background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 0 8px 8px 0;">
            <p style="margin: 0 0 8px; font-weight: 600; color: #166534;">Start campaigns 6-8 weeks before peak season</p>
            <p style="margin: 0; font-size: 14px; color: #374151;">Most operators wait until demand picks up, but by then ad costs are higher and spots are filling at competitors. Running early-bird reservation campaigns with a small deposit to lock in a spot consistently fills vehicle storage before the rush even starts.</p>
          </div>`
      } else {
        tip = `
          <p>I have been looking at facilities similar to <strong>${esc(lead.facilityName)}</strong> in your area and noticed something interesting:</p>
          <div style="margin: 20px 0; padding: 16px 20px; background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 0 8px 8px 0;">
            <p style="margin: 0 0 8px; font-weight: 600; color: #166534;">Most operators leave money on the table with their online presence</p>
            <p style="margin: 0; font-size: 14px; color: #374151;">The #1 thing we see across the board is facilities sending paid traffic to their homepage instead of a dedicated landing page. A simple landing page with unit availability, pricing, and a reservation form typically converts 3-4x better than a homepage.</p>
          </div>`
      }
      return `
        <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.7; color: #1a1a1a;">
          <p>Hey ${firstName},</p>
          ${tip}
          <p>Happy to dig into this more if you are interested — no pitch, just sharing what is working in your market right now.</p>
          <p style="margin-top: 24px;">
            Blake Burkett<br/>
            StowStack<br/>
            <a href="tel:2699298541" style="color: #16a34a; text-decoration: none;">269-929-8541</a><br/>
            <a href="mailto:blake@storepawpaw.com" style="color: #16a34a; text-decoration: none;">blake@storepawpaw.com</a>
          </p>
        </div>`
    },
  },
  last_chance: {
    id: 'last_chance',
    name: 'Last Chance',
    description: 'Final soft touch before marking lead cold (drip sequence)',
    subject: (lead) => `One last thought on ${esc(lead.facilityName)}`,
    body: (lead) => {
      const firstName = esc(lead.name.trim().split(' ')[0])
      return `
        <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.7; color: #1a1a1a;">
          <p>Hey ${firstName},</p>
          <p>I know I have reached out a few times, so I will keep this short. Totally understand if the timing is not right for <strong>${esc(lead.facilityName)}</strong> — running a storage facility is a lot and marketing is just one of a hundred things on the list.</p>
          <p>This will be my last follow-up unless you want to keep the conversation going. But if occupancy ever becomes a priority again, we are here and happy to help. No expiration on that offer.</p>
          <p>Either way, wishing you the best with the facility.</p>
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

function logActivity({ type, facilityId, leadName, facilityName, detail, meta }) {
  query(
    `INSERT INTO activity_log (type, facility_id, lead_name, facility_name, detail, meta)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [type, facilityId, leadName || '', facilityName || '', (detail || '').slice(0, 500), JSON.stringify(meta || {})]
  ).catch(err => console.error('Activity log error:', err))
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

    try {
      const facility = await queryOne(`SELECT * FROM facilities WHERE id = $1`, [leadId])
      if (!facility) return res.status(404).json({ error: 'Lead not found' })

      const lead = {
        name: facility.contact_name || '',
        email: facility.contact_email || '',
        facilityName: facility.name || '',
        biggestIssue: facility.biggest_issue || '',
        occupancyRange: facility.occupancy_range || '',
        totalUnits: facility.total_units || '',
      }

      if (!lead.email) {
        return res.status(400).json({ error: 'Lead has no email address' })
      }

      const subject = template.subject(lead)
      const html = template.body(lead)

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

      logActivity({
        type: 'note_added',
        facilityId: leadId,
        leadName: lead.name,
        facilityName: lead.facilityName,
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
