import { query, queryOne } from './_db.js'
import { requireSession } from './_session-auth.js'

/**
 * GET /api/subscription-usage
 * Returns current plan usage metrics for the authenticated org.
 * Used by the partner portal to show usage vs limits.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Org-Token')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const session = await requireSession(req, res)
    if (!session) return

    const orgId = session.organization.id
    const plan = session.organization.plan
    const facilityLimit = session.organization.facilityLimit

    // Count facilities
    const facilityCount = await queryOne(
      'SELECT COUNT(*)::int as count FROM facilities WHERE organization_id = $1',
      [orgId]
    )

    // Count landing pages
    const landingPageCount = await queryOne(
      `SELECT COUNT(*)::int as count FROM landing_pages lp
       JOIN facilities f ON f.id = lp.facility_id
       WHERE f.organization_id = $1`,
      [orgId]
    )

    // Count published landing pages
    const publishedPageCount = await queryOne(
      `SELECT COUNT(*)::int as count FROM landing_pages lp
       JOIN facilities f ON f.id = lp.facility_id
       WHERE f.organization_id = $1 AND lp.status = 'published'`,
      [orgId]
    )

    // Count team members
    const userCount = await queryOne(
      'SELECT COUNT(*)::int as count FROM org_users WHERE organization_id = $1 AND status = \'active\'',
      [orgId]
    )

    // Count active ad variations
    const adCount = await queryOne(
      `SELECT COUNT(*)::int as count FROM ad_variations av
       JOIN facilities f ON f.id = av.facility_id
       WHERE f.organization_id = $1 AND av.status = 'published'`,
      [orgId]
    )

    // Plan-based limits
    const planLimits = {
      launch: { facilities: 1, landingPages: 3, teamMembers: 3, channels: ['meta'] },
      growth: { facilities: 3, landingPages: -1, teamMembers: 10, channels: ['meta', 'google'] },
      portfolio: { facilities: -1, landingPages: -1, teamMembers: -1, channels: ['meta', 'google', 'tiktok'] },
    }

    const limits = planLimits[plan] || planLimits.launch

    return res.json({
      plan,
      subscriptionStatus: session.organization.subscriptionStatus,
      usage: {
        facilities: { used: facilityCount.count, limit: facilityLimit || limits.facilities, unlimited: limits.facilities === -1 },
        landingPages: { used: landingPageCount.count, published: publishedPageCount.count, limit: limits.landingPages, unlimited: limits.landingPages === -1 },
        teamMembers: { used: userCount.count, limit: limits.teamMembers, unlimited: limits.teamMembers === -1 },
        liveAds: { used: adCount.count },
      },
      features: {
        channels: limits.channels,
        abTesting: plan !== 'launch',
        videoCreative: plan !== 'launch',
        callTracking: plan !== 'launch',
        churnPrediction: plan === 'portfolio',
        whiteLabel: plan === 'portfolio',
        dedicatedStrategist: plan === 'portfolio',
      },
    })
  } catch (err) {
    console.error('Subscription usage error:', err)
    return res.status(500).json({ error: 'Failed to fetch usage data' })
  }
}
