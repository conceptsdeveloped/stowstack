import { query, queryOne } from './_db.js'
import { requireAdmin } from './_auth.js'

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function esc(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function generateSlug(facilityName) {
  const base = (facilityName || 'facility')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  const rand = Math.random().toString(36).slice(2, 6)
  return `${base}-${rand}`
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authErr = requireAdmin(req)
  if (authErr) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const { auditId, facilityId } = req.body
    if (!auditId || !facilityId) return res.status(400).json({ error: 'Missing auditId or facilityId' })

    // Get audit and facility data
    const audit = await queryOne('SELECT * FROM audits WHERE id = $1', [auditId])
    if (!audit) return res.status(404).json({ error: 'Audit not found' })

    const facility = await queryOne('SELECT * FROM facilities WHERE id = $1', [facilityId])
    if (!facility) return res.status(404).json({ error: 'Facility not found' })

    // Transform AI-generated audit format to SharedAuditView format
    const aiAudit = audit.audit_json || {}
    const fs = aiAudit.facility_summary || {}
    const occupancy = fs.occupancy_estimate || 80
    const totalUnits = fs.total_units_estimate || 200
    const vacantUnits = fs.vacant_units_estimate || Math.round(totalUnits * (1 - occupancy / 100))
    const rl = aiAudit.revenue_leakage || {}
    const sf = aiAudit.stowstack_fit || {}
    const recSpend = sf.projected_monthly_spend || 2000
    const moveIns = recSpend > 0 ? Math.round(recSpend / (sf.projected_cost_per_move_in || 50)) : 20

    const viewAudit = {
      generatedAt: new Date().toISOString(),
      facility: {
        name: fs.name || facility.name,
        location: fs.location || facility.location,
        totalUnits,
        occupancy,
        vacantUnits,
        biggestIssue: facility.biggest_issue || '',
      },
      vacancyCost: {
        monthlyLoss: rl.monthly_loss || vacantUnits * 110,
        annualLoss: rl.annual_loss || vacantUnits * 110 * 12,
        vacantUnits,
        avgUnitRate: rl.per_unit_monthly || 110,
      },
      marketOpportunity: {
        score: aiAudit.overall_score || 0,
        grade: (aiAudit.overall_score || 0) >= 80 ? 'Excellent' : (aiAudit.overall_score || 0) >= 60 ? 'Strong' : (aiAudit.overall_score || 0) >= 40 ? 'Moderate' : 'Needs Work',
      },
      projections: {
        recommendedSpend: recSpend,
        projectedCpl: 24,
        projectedLeadsPerMonth: Math.round(recSpend / 24),
        projectedMoveInsPerMonth: moveIns,
        projectedMonthlyRevenue: moveIns * 110 * 8,
        projectedRoas: recSpend > 0 ? Math.round((moveIns * 110 * 8 / recSpend) * 10) / 10 : 0,
        projectedMonthsToFill: sf.projected_months_to_target || 6,
        conversionRate: 0.25,
      },
      competitiveInsights: [
        aiAudit.digital_presence?.summary,
        aiAudit.market_position?.summary,
        ...(aiAudit.digital_presence?.findings || []),
      ].filter(Boolean),
      recommendations: (aiAudit.recommended_actions || []).map(a => ({
        title: a.title,
        detail: a.detail,
        priority: a.priority || 'medium',
      })),
    }

    // Create shareable audit link
    const slug = generateSlug(facility.name)
    await query(
      `INSERT INTO shared_audits (slug, facility_name, audit_json, views, expires_at)
       VALUES ($1, $2, $3, 0, NOW() + INTERVAL '90 days')`,
      [slug, facility.name, JSON.stringify(viewAudit)]
    )

    const auditUrl = `https://stowstack.co/audit/${slug}`

    // Email the audit to the lead with Calendly link
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey && facility.contact_email) {
      const firstName = (facility.contact_name || '').trim().split(' ')[0] || 'there'
      const annualLoss = rl.annual_loss || viewAudit.vacancyCost.annualLoss

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: 'Blake at StowStack <noreply@stowstack.co>',
          to: facility.contact_email,
          cc: 'anna@storepawpaw.com',
          reply_to: ['blake@storepawpaw.com', 'anna@storepawpaw.com'],
          subject: `Your ${facility.name} facility audit is ready`,
          html: `
            <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.7; color: #1a1a1a;">
              <p>Hey ${esc(firstName)},</p>
              <p>Your facility audit for <strong>${esc(facility.name)}</strong> is done. I went through your market, competitors, digital presence, and revenue numbers.</p>
              ${annualLoss > 0 ? `<p>Quick headline: your vacancy is costing you an estimated <strong style="color: #dc2626;">$${annualLoss.toLocaleString()}/year</strong> in lost revenue. The audit breaks down exactly where that is coming from and what to do about it.</p>` : ''}
              <p style="margin: 24px 0;">
                <a href="${auditUrl}" style="display: inline-block; padding: 14px 28px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">View Your Audit Report</a>
              </p>
              <p>The report covers:</p>
              <ul style="padding-left: 20px; margin: 12px 0;">
                <li style="margin-bottom: 6px;">Market position and competitor analysis</li>
                <li style="margin-bottom: 6px;">Digital presence assessment</li>
                <li style="margin-bottom: 6px;">Revenue leakage estimate</li>
                <li style="margin-bottom: 6px;">Specific recommended actions with priorities</li>
                <li style="margin-bottom: 6px;">StowStack fit assessment with projected ROI</li>
              </ul>
              <p>I would love to walk you through the findings on a quick call. <strong>Pick a time that works for you:</strong></p>
              <p style="margin: 20px 0;">
                <a href="https://calendly.com/blake-stowstack/facility-audit" style="display: inline-block; padding: 12px 24px; background: #1e293b; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Book a 20-Minute Walkthrough</a>
              </p>
              <p>The report link is active for 90 days. If you have any questions before we talk, just reply to this email.</p>
              <p style="margin-top: 24px;">
                Blake Burkett<br/>
                StowStack<br/>
                <a href="tel:2699298541" style="color: #16a34a; text-decoration: none;">269-929-8541</a>
              </p>
            </div>`,
        }),
      }).catch(err => console.error('Audit delivery email error:', err.message))
    }

    // Update facility pipeline
    await query(
      `UPDATE facilities SET pipeline_status = 'audit_sent', updated_at = NOW() WHERE id = $1`,
      [facilityId]
    )

    // Log activity
    query(
      'INSERT INTO activity_log (type, facility_id, facility_name, detail) VALUES ($1, $2, $3, $4)',
      ['audit_approved', facilityId, facility.name, `Audit approved and sent to ${facility.contact_email}`]
    ).catch(() => {})

    return res.json({
      success: true,
      slug,
      auditUrl,
      sentTo: facility.contact_email,
    })
  } catch (err) {
    console.error('audit-approve error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
