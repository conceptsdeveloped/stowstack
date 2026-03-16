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
      default:
        // Unhandled event type — ignore
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
  const facilityLimits = { starter: 10, growth: 50, enterprise: 999 }
  const selectedPlan = ['starter', 'growth', 'enterprise'].includes(plan) ? plan : 'starter'

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

  await query(
    `UPDATE organizations SET subscription_status = $1, stripe_subscription_id = $2, updated_at = NOW()
     WHERE stripe_customer_id = $3`,
    [subscriptionStatus, subscription.id, customerId]
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
}
