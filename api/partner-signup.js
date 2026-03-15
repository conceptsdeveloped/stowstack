import { query, queryOne } from './_db.js'
import crypto from 'crypto'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { companyName, contactName, email, phone, facilityCount, plan } = req.body

    if (!companyName || !email || !contactName) {
      return res.status(400).json({ error: 'Company name, contact name, and email are required' })
    }

    // Generate slug from company name
    const baseSlug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50)

    // Ensure unique slug
    let slug = baseSlug
    let suffix = 1
    while (await queryOne('SELECT id FROM organizations WHERE slug = $1', [slug])) {
      slug = `${baseSlug}-${suffix}`
      suffix++
    }

    // Check if email already exists in an org
    const existing = await queryOne(
      'SELECT ou.id FROM org_users ou WHERE ou.email = $1',
      [email.toLowerCase()]
    )
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' })
    }

    // Determine plan and limits
    const validPlans = ['starter', 'growth', 'enterprise']
    const selectedPlan = validPlans.includes(plan) ? plan : 'starter'
    const facilityLimits = { starter: 10, growth: 50, enterprise: 999 }

    // Create organization
    const org = await queryOne(
      `INSERT INTO organizations (name, slug, contact_email, contact_phone, plan, facility_limit, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active') RETURNING *`,
      [companyName, slug, email.toLowerCase(), phone || null, selectedPlan, facilityLimits[selectedPlan]]
    )

    // Create admin user with password
    const userId = crypto.randomUUID()
    const tempPassword = crypto.randomBytes(6).toString('hex')
    const passwordHash = crypto.createHash('sha256').update(tempPassword + userId).digest('hex')

    await query(
      `INSERT INTO org_users (id, organization_id, email, name, role, password_hash, status)
       VALUES ($1, $2, $3, $4, 'org_admin', $5, 'active')`,
      [userId, org.id, email.toLowerCase(), contactName, passwordHash]
    )

    // Log activity
    await query(
      `INSERT INTO activity_log (type, detail, meta)
       VALUES ('partner_signup', $1, $2)`,
      [
        `${companyName} signed up as a partner (${selectedPlan} plan)`,
        JSON.stringify({ orgId: org.id, email, plan: selectedPlan, facilityCount }),
      ]
    )

    // Generate auth token
    const token = Buffer.from(`${org.id}:${email.toLowerCase()}`).toString('base64')

    // Send welcome email via Resend if configured
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'StowStack Partners <partners@stowstack.co>',
            to: email,
            subject: `Welcome to StowStack — ${companyName} Partner Account`,
            html: `
              <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 500px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 20px;">Welcome to StowStack</h1>
                  <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Partner Portal Access</p>
                </div>
                <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px;">
                  <p style="color: #334155; font-size: 15px;">Hi ${contactName},</p>
                  <p style="color: #334155; font-size: 15px;">Your partner account for <strong>${companyName}</strong> is ready.</p>
                  <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">Your login credentials:</p>
                    <p style="margin: 0 0 4px; font-size: 14px;"><strong>Organization:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${slug}</code></p>
                    <p style="margin: 0 0 4px; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                    <p style="margin: 0; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
                  </div>
                  <p style="color: #334155; font-size: 14px;">Sign in at <strong>stowstack.co/partner</strong> to get started.</p>
                  <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">— The StowStack Team</p>
                </div>
              </div>
            `,
          }),
        })
      } catch { /* email send failed, not critical */ }
    }

    return res.json({
      success: true,
      token,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
      },
      user: {
        id: userId,
        email: email.toLowerCase(),
        name: contactName,
        role: 'org_admin',
      },
      tempPassword,
    })
  } catch (err) {
    console.error('Partner signup error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
