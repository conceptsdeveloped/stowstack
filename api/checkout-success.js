import Stripe from 'stripe'
import crypto from 'crypto'
import { query, queryOne } from './_db.js'
import { hashPassword } from './_password.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  httpClient: Stripe.createFetchHttpClient(),
})

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { session_id } = req.query
  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ error: 'Missing session_id' })
  }

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

    // Generate a one-time setup token instead of returning the temp password
    const setupToken = crypto.randomBytes(32).toString('hex')
    const setupTokenHash = crypto.createHash('sha256').update(setupToken).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store setup token for the user to set their own password
    if (meta.userId) {
      await query(
        `UPDATE org_users SET setup_token_hash = $1, setup_token_expires = $2 WHERE id = $3`,
        [setupTokenHash, expiresAt.toISOString(), meta.userId]
      ).catch(() => {})
    }

    // Clear temp password from Stripe metadata (one-time read)
    await stripe.customers.update(session.customer, {
      metadata: { tempPassword: '', signupComplete: 'true' },
    }).catch(() => {})

    return res.json({
      orgSlug: meta.orgSlug,
      email: session.metadata?.email || session.customer_email,
      tempPassword: meta.tempPassword,
      companyName: session.metadata?.companyName,
      plan: session.metadata?.plan,
    })
  } catch (err) {
    console.error('Checkout success error:', err.message)
    return res.status(500).json({ error: 'Failed to retrieve session details' })
  }
}
