import { requireSession } from '../_session-auth.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Org-Token')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const session = await requireSession(req, res)
    if (!session) return // 401 already sent

    return res.json({
      user: session.user,
      organization: session.organization,
    })
  } catch (err) {
    console.error('Auth me error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
