import Stripe from 'stripe'
import { queryOne } from './_db.js'
import { requireSession } from './_session-auth.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Org-Token')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const session = await requireSession(req, res)
    if (!session) return

    const org = await queryOne(
      'SELECT stripe_customer_id FROM organizations WHERE id = $1',
      [session.user.organization_id]
    )

    if (!org?.stripe_customer_id) return res.status(400).json({ error: 'No billing account found. Contact support.' })

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${req.headers.origin || 'https://stowstack.co'}/partner`,
    })

    return res.json({ url: portalSession.url })
  } catch (err) {
    console.error('Billing portal error:', err)
    return res.status(500).json({ error: 'Failed to create billing portal session' })
  }
}
