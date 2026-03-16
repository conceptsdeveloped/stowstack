import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const PRICE_MAP = {
  starter: process.env.STRIPE_PRICE_STARTER,
  growth: process.env.STRIPE_PRICE_GROWTH,
}

const SETUP_FEES = {
  starter: 500,
  growth: 1000,
}

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

    if (!PRICE_MAP[plan]) {
      return res.status(400).json({ error: 'Invalid plan. Choose starter or growth, or contact sales for enterprise.' })
    }

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

    // Build line items: recurring subscription + one-time setup fee
    const lineItems = [
      { price: PRICE_MAP[plan], quantity: 1 },
    ]

    const setupFee = SETUP_FEES[plan]

    const sessionParams = {
      customer: customer.id,
      mode: 'subscription',
      line_items: lineItems,
      success_url: `${req.headers.origin || 'https://stowstack.co'}/partner?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'https://stowstack.co'}/partner?checkout=canceled`,
      metadata: {
        companyName,
        contactName,
        email: email.toLowerCase(),
        phone: phone || '',
        facilityCount: facilityCount || '',
        plan,
      },
      subscription_data: {
        metadata: {
          companyName,
          plan,
        },
      },
    }

    // Add setup fee as invoice item (charged on first invoice)
    if (setupFee > 0) {
      await stripe.invoiceItems.create({
        customer: customer.id,
        amount: setupFee * 100, // cents
        currency: 'usd',
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan — One-time setup fee`,
      })
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return res.json({ url: session.url })
  } catch (err) {
    console.error('Checkout session error:', err)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
