import { query } from './_db.js'
import { requireAdmin, isAdmin } from './_auth.js'

export const config = { maxDuration: 15 }

const ALLOWED_ORIGINS = [
  'https://stowstack.co',
  'https://www.stowstack.co',
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return isAdmin(req)
}

// Build the OAuth URL for a given platform
function getOAuthUrl(platform, facilityId) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_ENV === 'production' ? 'https://www.stowstack.co' : null)
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const state = Buffer.from(JSON.stringify({ facilityId, platform })).toString('base64url')

  if (platform === 'meta') {
    const appId = process.env.META_APP_ID
    if (!appId) return null

    const redirectUri = `${baseUrl}/api/auth/meta/callback`
    const scopes = [
      'ads_management',
      'ads_read',
      'business_management',
      'pages_read_engagement',
    ].join(',')

    return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`
  }

  if (platform === 'google_ads') {
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID
    if (!clientId) return null

    const redirectUri = `${baseUrl}/api/auth/google/callback`
    const scopes = [
      'https://www.googleapis.com/auth/adwords',
    ].join(' ')

    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&response_type=code&access_type=offline&prompt=consent`
  }

  if (platform === 'tiktok') {
    const clientKey = process.env.TIKTOK_CLIENT_KEY
    if (!clientKey) return null

    const redirectUri = `${baseUrl}/api/auth/tiktok/callback`
    const scopes = [
      'video.publish',
      'video.upload',
      'user.info.basic',
    ].join(',')

    // TikTok uses client_key (not client_id) and uses CSRF state
    return `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code&state=${state}`
  }

  return null
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  // GET — list connections for a facility + available platforms
  if (req.method === 'GET') {
    const { facilityId } = req.query
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    try {
      const connections = await query(
        `SELECT id, facility_id, platform, status, account_id, account_name, page_id, page_name, created_at, updated_at,
                token_expires_at, metadata
         FROM platform_connections WHERE facility_id = $1`,
        [facilityId]
      )

      // Build available platforms with connect URLs
      const platforms = [
        {
          id: 'meta',
          name: 'Meta (Facebook & Instagram)',
          description: 'Publish ads to Facebook Feed, Instagram Feed, and Instagram Stories',
          configured: !!process.env.META_APP_ID,
          connectUrl: getOAuthUrl('meta', facilityId),
          icon: 'meta',
        },
        {
          id: 'google_ads',
          name: 'Google Ads',
          description: 'Publish Search and Display ads to Google Ads',
          configured: !!process.env.GOOGLE_ADS_CLIENT_ID,
          connectUrl: getOAuthUrl('google_ads', facilityId),
          icon: 'google',
        },
        {
          id: 'tiktok',
          name: 'TikTok',
          description: 'Post organic content to target local audiences on TikTok',
          configured: !!process.env.TIKTOK_CLIENT_KEY,
          connectUrl: getOAuthUrl('tiktok', facilityId),
          icon: 'tiktok',
        },
      ]

      return res.status(200).json({ connections, platforms })
    } catch (err) {
      console.error('platform-connections GET failed:', err.message)
      return res.status(500).json({ error: 'Failed to fetch connections' })
    }
  }

  // DELETE — disconnect a platform
  if (req.method === 'DELETE') {
    const { connectionId } = req.body || {}
    if (!connectionId) return res.status(400).json({ error: 'connectionId required' })

    try {
      await query(
        `UPDATE platform_connections SET status = 'disconnected', access_token = NULL, refresh_token = NULL WHERE id = $1`,
        [connectionId]
      )
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('platform-connections DELETE failed:', err.message)
      return res.status(500).json({ error: 'Failed to disconnect' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
