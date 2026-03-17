import Stripe from 'stripe'
import crypto from 'crypto'
import { query, queryOne } from './_db.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})

// Vercel doesn't parse the body when we export a config disabling it,
// but we need the raw body for signature verification.
export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  let event
  try {
    const rawBody = await getRawBody(req)
    const sig = req.headers['stripe-signature']
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  try {
    // Log all webhook events for debugging and audit trail
    await query(
      `INSERT INTO activity_log (type, detail, meta)
       VALUES ('stripe_webhook', $1, $2)`,
      [
        `Stripe event: ${event.type}`,
        JSON.stringify({
          eventId: event.id,
          eventType: event.type,
          customerId: event.data.object?.customer || null,
          livemode: event.livemode,
          created: event.created,
        }),
      ]
    ).catch(() => {}) // fire-and-forget — don't block webhook processing

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
      default:
        break
    }

    return res.json({ received: true })
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err)
    return res.status(500).json({ error: 'Webhook handler failed' })
  }
}

/* ── checkout.session.completed ── */
async function handleCheckoutCompleted(session) {
  const { companyName, contactName, email, phone, facilityCount, plan } = session.metadata
  if (!companyName || !email) return // Not our signup session

  const customerId = session.customer
  const subscriptionId = session.subscription

  // Check if org already exists for this Stripe customer (idempotency)
  const existing = await queryOne(
    'SELECT id FROM organizations WHERE stripe_customer_id = $1',
    [customerId]
  )
  if (existing) {
    // Update subscription info in case it changed
    await query(
      `UPDATE organizations SET stripe_subscription_id = $1, subscription_status = 'active', updated_at = NOW() WHERE id = $2`,
      [subscriptionId, existing.id]
    )
    return
  }

  // Also check by email (in case partner-signup was used before)
  const existingByEmail = await queryOne(
    'SELECT ou.id FROM org_users ou WHERE ou.email = $1',
    [email.toLowerCase()]
  )
  if (existingByEmail) {
    // Link Stripe to existing org
    const user = await queryOne(
      'SELECT organization_id FROM org_users WHERE email = $1',
      [email.toLowerCase()]
    )
    if (user) {
      await query(
        `UPDATE organizations SET stripe_customer_id = $1, stripe_subscription_id = $2, subscription_status = 'active', plan = $3, updated_at = NOW() WHERE id = $4`,
        [customerId, subscriptionId, plan, user.organization_id]
      )
    }
    return
  }

  // Generate slug from company name
  const baseSlug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50)

  let slug = baseSlug
  let suffix = 1
  while (await queryOne('SELECT id FROM organizations WHERE slug = $1', [slug])) {
    slug = `${baseSlug}-${suffix}`
    suffix++
  }

  // Determine plan limits
  const facilityLimits = { launch: 1, growth: 3, portfolio: 999 }
  const selectedPlan = ['launch', 'growth', 'portfolio'].includes(plan) ? plan : 'launch'

  // Create organization with Stripe IDs
  const org = await queryOne(
    `INSERT INTO organizations (name, slug, contact_email, contact_phone, plan, facility_limit, status, stripe_customer_id, stripe_subscription_id, subscription_status)
     VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, 'active') RETURNING *`,
    [companyName, slug, email.toLowerCase(), phone || null, selectedPlan, facilityLimits[selectedPlan], customerId, subscriptionId]
  )

  // Create admin user with temp password
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
      `${companyName} signed up via Stripe (${selectedPlan} plan)`,
      JSON.stringify({ orgId: org.id, email, plan: selectedPlan, facilityCount, stripeCustomerId: customerId }),
    ]
  )

  // Store credentials in Stripe customer metadata so success page can retrieve them
  await stripe.customers.update(customerId, {
    metadata: {
      orgSlug: slug,
      tempPassword,
      orgId: org.id,
      userId,
      signupComplete: 'true',
    },
  })

  // Auto-provision landing page with StorEdge embed for Growth/Portfolio plans
  await provisionDefaultLandingPage(org.id, slug, companyName, selectedPlan)

  // Send welcome email via Resend
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
                <p style="color: #334155; font-size: 15px;">Your partner account for <strong>${companyName}</strong> is ready. Your ${selectedPlan} plan subscription is now active.</p>
                <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">Your login credentials:</p>
                  <p style="margin: 0 0 4px; font-size: 14px;"><strong>Organization:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${slug}</code></p>
                  <p style="margin: 0 0 4px; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                  <p style="margin: 0; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
                </div>
                <p style="color: #334155; font-size: 14px;">Sign in at <strong>stowstack.co/partner</strong> to get started.</p>
                <p style="color: #64748b; font-size: 13px;">You can manage your billing anytime from Settings → Manage Billing.</p>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">— The StowStack Team</p>
              </div>
            </div>
          `,
        }),
      })
    } catch { /* email send failed, not critical */ }
  }
}

/* ── customer.subscription.updated ── */
async function handleSubscriptionUpdated(subscription) {
  const { status } = subscription
  const customerId = subscription.customer

  // Map Stripe status to our status
  const statusMap = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'past_due',
    trialing: 'trialing',
    incomplete: 'incomplete',
    incomplete_expired: 'canceled',
    paused: 'past_due',
  }

  const subscriptionStatus = statusMap[status] || status

  // Detect plan changes (upgrades/downgrades) from the subscription's price
  const PRICE_TO_PLAN = {
    [process.env.STRIPE_PRICE_LAUNCH]: 'launch',
    [process.env.STRIPE_PRICE_GROWTH]: 'growth',
    [process.env.STRIPE_PRICE_PORTFOLIO]: 'portfolio',
  }
  const facilityLimits = { launch: 1, growth: 3, portfolio: 999 }

  const currentPriceId = subscription.items?.data?.[0]?.price?.id
  const newPlan = currentPriceId ? PRICE_TO_PLAN[currentPriceId] : null

  let planUpdateFields = ''
  let planUpdateParams = [subscriptionStatus, subscription.id, customerId]

  if (newPlan) {
    planUpdateFields = ', plan = $4, facility_limit = $5'
    planUpdateParams.push(newPlan, facilityLimits[newPlan])
  }

  await query(
    `UPDATE organizations SET subscription_status = $1, stripe_subscription_id = $2${planUpdateFields}, updated_at = NOW()
     WHERE stripe_customer_id = $3`,
    planUpdateParams
  )

  // If canceled, update org status too
  if (status === 'canceled') {
    await query(
      `UPDATE organizations SET status = 'cancelled', updated_at = NOW() WHERE stripe_customer_id = $1`,
      [customerId]
    )
  }

  // If reactivated, restore org status
  if (status === 'active') {
    await query(
      `UPDATE organizations SET status = 'active', updated_at = NOW() WHERE stripe_customer_id = $1`,
      [customerId]
    )

    // On upgrade to growth/portfolio, provision landing page if not already done
    if (newPlan === 'growth' || newPlan === 'portfolio') {
      const org = await queryOne(
        'SELECT id, slug, name FROM organizations WHERE stripe_customer_id = $1',
        [customerId]
      )
      if (org) {
        await provisionDefaultLandingPage(org.id, org.slug, org.name, newPlan)
      }
    }
  }

  // Log plan changes
  if (newPlan) {
    await query(
      `INSERT INTO activity_log (type, detail, meta)
       VALUES ('plan_changed', $1, $2)`,
      [
        `Subscription updated to ${newPlan} plan`,
        JSON.stringify({ stripeCustomerId: customerId, plan: newPlan, status: subscriptionStatus }),
      ]
    )
  }
}

/* ── customer.subscription.deleted ── */
async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer

  await query(
    `UPDATE organizations SET subscription_status = 'canceled', status = 'cancelled', updated_at = NOW()
     WHERE stripe_customer_id = $1`,
    [customerId]
  )

  await query(
    `INSERT INTO activity_log (type, detail, meta)
     VALUES ('subscription_canceled', $1, $2)`,
    [
      'Subscription canceled via Stripe',
      JSON.stringify({ stripeCustomerId: customerId, subscriptionId: subscription.id }),
    ]
  )

  // Send cancellation email
  const org = await queryOne(
    `SELECT o.name, o.contact_email, ou.name as admin_name
     FROM organizations o
     LEFT JOIN org_users ou ON ou.organization_id = o.id AND ou.role = 'org_admin'
     WHERE o.stripe_customer_id = $1 LIMIT 1`,
    [customerId]
  )
  if (org?.contact_email) {
    await sendBillingEmail(org.contact_email, org.admin_name || 'there', 'subscription_canceled', {
      companyName: org.name,
    })
  }
}

/* ── invoice.payment_failed ── */
async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer

  await query(
    `UPDATE organizations SET subscription_status = 'past_due', updated_at = NOW()
     WHERE stripe_customer_id = $1`,
    [customerId]
  )

  await query(
    `INSERT INTO activity_log (type, detail, meta)
     VALUES ('payment_failed', $1, $2)`,
    [
      'Invoice payment failed',
      JSON.stringify({ stripeCustomerId: customerId, invoiceId: invoice.id, amountDue: invoice.amount_due }),
    ]
  )

  // Notify org admin about failed payment
  const org = await queryOne(
    `SELECT o.name, o.contact_email, ou.name as admin_name
     FROM organizations o
     LEFT JOIN org_users ou ON ou.organization_id = o.id AND ou.role = 'org_admin'
     WHERE o.stripe_customer_id = $1 LIMIT 1`,
    [customerId]
  )
  if (org?.contact_email) {
    await sendBillingEmail(org.contact_email, org.admin_name || 'there', 'payment_failed', {
      companyName: org.name,
      amountDue: (invoice.amount_due / 100).toFixed(2),
    })
  }
}

/* ── invoice.payment_succeeded ── */
async function handlePaymentSucceeded(invoice) {
  const customerId = invoice.customer

  // Check if recovering from past_due
  const wasPastDue = await queryOne(
    `SELECT id FROM organizations WHERE stripe_customer_id = $1 AND subscription_status = 'past_due'`,
    [customerId]
  )

  // Recover from past_due — restore active status when payment succeeds
  await query(
    `UPDATE organizations SET subscription_status = 'active', status = 'active', updated_at = NOW()
     WHERE stripe_customer_id = $1 AND subscription_status = 'past_due'`,
    [customerId]
  )

  await query(
    `INSERT INTO activity_log (type, detail, meta)
     VALUES ('payment_succeeded', $1, $2)`,
    [
      'Invoice payment succeeded',
      JSON.stringify({ stripeCustomerId: customerId, invoiceId: invoice.id, amountPaid: invoice.amount_paid }),
    ]
  )

  // If recovering from past_due, send confirmation email
  if (wasPastDue) {
    const org = await queryOne(
      `SELECT o.name, o.contact_email, ou.name as admin_name
       FROM organizations o
       LEFT JOIN org_users ou ON ou.organization_id = o.id AND ou.role = 'org_admin'
       WHERE o.stripe_customer_id = $1 LIMIT 1`,
      [customerId]
    )
    if (org?.contact_email) {
      await sendBillingEmail(org.contact_email, org.admin_name || 'there', 'payment_recovered', {
        companyName: org.name,
        amountPaid: (invoice.amount_paid / 100).toFixed(2),
      })
    }
  }
}

/* ── Billing email helper ── */
async function sendBillingEmail(to, name, type, data) {
  if (!process.env.RESEND_API_KEY) return

  const templates = {
    payment_failed: {
      subject: `Action required: Payment failed for ${data.companyName}`,
      body: `
        <p>Hi ${name},</p>
        <p>We were unable to process your payment of <strong>$${data.amountDue}</strong> for your StowStack subscription.</p>
        <p>Please update your payment method within 7 days to avoid service interruption. During this time, your dashboard remains accessible in read-only mode.</p>
        <div style="margin: 20px 0;">
          <a href="https://stowstack.co/partner" style="background: #f59e0b; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Update Payment Method</a>
        </div>
        <p style="color: #64748b; font-size: 13px;">If you believe this is an error, reply to this email or contact us at partners@stowstack.co.</p>
      `,
    },
    payment_recovered: {
      subject: `Payment successful — ${data.companyName} is back to full access`,
      body: `
        <p>Hi ${name},</p>
        <p>Great news! Your payment of <strong>$${data.amountPaid}</strong> was processed successfully and your StowStack account is fully active again.</p>
        <p>All features have been restored. Your campaigns and landing pages are live.</p>
        <div style="margin: 20px 0;">
          <a href="https://stowstack.co/partner" style="background: #10b981; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Go to Dashboard</a>
        </div>
      `,
    },
    subscription_canceled: {
      subject: `Your StowStack subscription has been canceled`,
      body: `
        <p>Hi ${name},</p>
        <p>Your StowStack subscription for <strong>${data.companyName}</strong> has been canceled. Your campaigns and landing pages have been paused.</p>
        <p>If this wasn't intentional, you can resubscribe anytime to restore service immediately:</p>
        <div style="margin: 20px 0;">
          <a href="https://stowstack.co/partner" style="background: #6366f1; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Resubscribe</a>
        </div>
        <p style="color: #64748b; font-size: 13px;">Your data is retained for 90 days. After that, it may be permanently deleted.</p>
      `,
    },
  }

  const template = templates[type]
  if (!template) return

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'StowStack Billing <billing@stowstack.co>',
        to,
        subject: template.subject,
        html: `
          <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 500px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 20px 24px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 18px;">StowStack Billing</h1>
            </div>
            <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px;">
              ${template.body}
              <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">— The StowStack Team</p>
            </div>
          </div>
        `,
      }),
    })
  } catch { /* email send failed — not critical */ }
}

/* ── Auto-provision landing page for Growth/Portfolio ── */
async function provisionDefaultLandingPage(orgId, orgSlug, companyName, plan) {
  if (plan !== 'growth' && plan !== 'portfolio') return

  // Idempotency: check if a landing page already exists for this org
  const existingPage = await queryOne(
    `SELECT lp.id FROM landing_pages lp
     JOIN facilities f ON f.id = lp.facility_id
     WHERE f.organization_id = $1 LIMIT 1`,
    [orgId]
  )
  if (existingPage) return

  // Create a placeholder facility for the org
  const facility = await queryOne(
    `INSERT INTO facilities (name, location, organization_id, status)
     VALUES ($1, $2, $3, 'intake') RETURNING id`,
    [`${companyName} - Primary`, 'To be configured', orgId]
  )

  // Create a draft landing page
  const pageSlug = `${orgSlug}-main`
  const landingPage = await queryOne(
    `INSERT INTO landing_pages (facility_id, slug, title, status, theme, storedge_widget_url)
     VALUES ($1, $2, $3, 'draft', $4, NULL) RETURNING id`,
    [
      facility.id,
      pageSlug,
      `${companyName} — Self Storage`,
      JSON.stringify({ colorScheme: 'brand', layout: 'modern' }),
    ]
  )

  // Create default sections with StorEdge embed placeholder
  const sections = [
    { sort: 0, type: 'hero', config: { headline: `${companyName} Self Storage`, subheadline: 'Secure, convenient storage solutions', ctaText: 'Reserve Your Unit', ctaAction: 'scroll_to_units' } },
    { sort: 1, type: 'trust_bar', config: { items: ['24/7 Access', 'Security Cameras', 'Climate Controlled', 'Month-to-Month'] } },
    { sort: 2, type: 'unit_types', config: { heading: 'Available Units & Pricing', storedgeEmbed: true, placeholder: 'Configure your StorEdge widget URL in Settings to enable live unit availability and one-click rentals.' } },
    { sort: 3, type: 'testimonials', config: { heading: 'What Our Customers Say', items: [] } },
    { sort: 4, type: 'cta', config: { heading: 'Ready to Reserve?', subheading: 'Lock in your rate today — reserve online in under 60 seconds.', ctaText: 'Reserve Now', ctaAction: 'scroll_to_units' } },
  ]

  for (const s of sections) {
    await query(
      `INSERT INTO landing_page_sections (landing_page_id, sort_order, section_type, config)
       VALUES ($1, $2, $3, $4)`,
      [landingPage.id, s.sort, s.type, JSON.stringify(s.config)]
    )
  }

  await query(
    `INSERT INTO activity_log (type, detail, meta)
     VALUES ('landing_page_provisioned', $1, $2)`,
    [
      `Auto-provisioned landing page for ${companyName} (${plan} plan)`,
      JSON.stringify({ orgId, facilityId: facility.id, landingPageId: landingPage.id, slug: pageSlug }),
    ]
  )
}
