import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { session_id } = req.query
  if (!session_id) return res.status(400).json({ error: 'Missing session_id' })

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id)
    if (!session || session.status !== 'complete') {
      return res.status(400).json({ error: 'Session not complete' })
    }

    const customer = await stripe.customers.retrieve(session.customer)
    if (!customer || customer.deleted) {
      return res.status(400).json({ error: 'Customer not found' })
    }

    const meta = customer.metadata || {}
    if (!meta.signupComplete) {
      return res.status(400).json({ error: 'Signup not yet processed. Please wait a moment and refresh.' })
    }

    return res.json({
      orgSlug: meta.orgSlug,
      email: session.metadata?.email || session.customer_email,
      tempPassword: meta.tempPassword,
      companyName: session.metadata?.companyName,
      plan: session.metadata?.plan,
    })
  } catch (err) {
    console.error('Checkout success error:', err)
    return res.status(500).json({ error: 'Failed to retrieve session details' })
  }
}
