import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  httpClient: Stripe.createFetchHttpClient(),
})

const PRICE_MAP = {
  launch: process.env.STRIPE_PRICE_LAUNCH,
  growth: process.env.STRIPE_PRICE_GROWTH,
  portfolio: process.env.STRIPE_PRICE_PORTFOLIO,
}

// Annual price IDs (optional — set in env when created in Stripe)
const ANNUAL_PRICE_MAP = {
  launch: process.env.STRIPE_PRICE_LAUNCH_ANNUAL,
  growth: process.env.STRIPE_PRICE_GROWTH_ANNUAL,
  portfolio: process.env.STRIPE_PRICE_PORTFOLIO_ANNUAL,
}

const ALLOWED_ORIGINS = [
  'https://stowstack.co',
  'https://www.stowstack.co',
  'http://localhost:5173',
  'http://localhost:3000',
]

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ''
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { companyName, contactName, email, phone, facilityCount, plan, billing, promoCode } = req.body

    if (!companyName || !email || !contactName) {
      return res.status(400).json({ error: 'Company name, contact name, and email are required' })
    }

    if (!PRICE_MAP[plan]) {
      return res.status(400).json({ error: 'Invalid plan. Choose launch, growth, or portfolio.' })
    }

    // Determine monthly vs annual pricing
    const isAnnual = billing === 'annual'
    const priceId = isAnnual && ANNUAL_PRICE_MAP[plan]
      ? ANNUAL_PRICE_MAP[plan]
      : PRICE_MAP[plan]

    // Create or retrieve Stripe customer
    const existingCustomers = await stripe.customers.list({ email: email.toLowerCase(), limit: 1 })
    let customer
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
    } else {
      customer = await stripe.customers.create({
        email: email.toLowerCase(),
        name: contactName,
        metadata: {
          companyName,
          phone: phone || '',
          facilityCount: facilityCount || '',
        },
      })
    }

    const lineItems = [
      { price: priceId, quantity: 1 },
    ]

    const sessionParams = {
      customer: customer.id,
      mode: 'subscription',
      line_items: lineItems,
      success_url: `${req.headers.origin || 'https://stowstack.co'}/partner?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'https://stowstack.co'}/partner?checkout=canceled`,
      allow_promotion_codes: true,
      metadata: {
        companyName,
        contactName,
        email: email.toLowerCase(),
        phone: phone || '',
        facilityCount: facilityCount || '',
        plan,
        billing: isAnnual ? 'annual' : 'monthly',
      },
      subscription_data: {
        metadata: {
          companyName,
          plan,
          billing: isAnnual ? 'annual' : 'monthly',
        },
      },
    }

    // Apply specific promo code if provided (in addition to allow_promotion_codes)
    if (promoCode) {
      try {
        const promotionCodes = await stripe.promotionCodes.list({
          code: promoCode,
          active: true,
          limit: 1,
        })
        if (promotionCodes.data.length > 0) {
          sessionParams.discounts = [{ promotion_code: promotionCodes.data[0].id }]
          delete sessionParams.allow_promotion_codes // can't use both
        }
      } catch {
        // Invalid promo code — continue without it, user can enter at checkout
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return res.json({ url: session.url })
  } catch (err) {
    console.error('Checkout session error:', err.message, err.type, err.code, err.statusCode)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
