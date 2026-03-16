import Stripe from 'stripe'
import { queryOne } from './_db.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Org-Token')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Authenticate org user
    const orgToken = req.headers['x-org-token']
    if (!orgToken) return res.status(401).json({ error: 'Unauthorized' })

    let orgUser
    try {
      const decoded = Buffer.from(orgToken, 'base64').toString()
      const [orgId, email] = decoded.split(':')
      orgUser = await queryOne(
        `SELECT ou.organization_id, o.stripe_customer_id
         FROM org_users ou JOIN organizations o ON o.id = ou.organization_id
         WHERE ou.organization_id = $1 AND ou.email = $2 AND ou.status = 'active'`,
        [orgId, email]
      )
    } catch { /* invalid token */ }

    if (!orgUser) return res.status(401).json({ error: 'Unauthorized' })
    if (!orgUser.stripe_customer_id) return res.status(400).json({ error: 'No billing account found. Contact support.' })

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: orgUser.stripe_customer_id,
      return_url: `${req.headers.origin || 'https://stowstack.co'}/partner`,
    })

    return res.json({ url: portalSession.url })
  } catch (err) {
    console.error('Billing portal error:', err)
    return res.status(500).json({ error: 'Failed to create billing portal session' })
  }
}
