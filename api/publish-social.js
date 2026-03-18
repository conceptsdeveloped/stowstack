/**
 * Social Post Publisher — Publishes posts to Facebook/Instagram pages
 *
 * POST /api/publish-social  { postId }
 *
 * Uses EXISTING platform_connections for Meta OAuth tokens.
 * Uses EXISTING gbp_connections for GBP tokens.
 * Does NOT modify any existing tables — only reads from them and writes to social_posts.
 */
import { query, queryOne } from './_db.js'
import { requireAdmin } from './_auth.js'

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

const META_GRAPH = 'https://graph.facebook.com/v21.0'

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!requireAdmin(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { postId } = req.body
  if (!postId) return res.status(400).json({ error: 'postId required' })

  try {
    const post = await queryOne(`SELECT * FROM social_posts WHERE id = $1`, [postId])
    if (!post) return res.status(404).json({ error: 'Post not found' })

    // Mark as publishing
    await query(`UPDATE social_posts SET status = 'publishing', updated_at = NOW() WHERE id = $1`, [postId])

    let result

    if (post.platform === 'facebook') {
      result = await publishToFacebook(post)
    } else if (post.platform === 'instagram') {
      result = await publishToInstagram(post)
    } else if (post.platform === 'gbp') {
      result = await publishToGBP(post)
    } else {
      throw new Error(`Unsupported platform: ${post.platform}`)
    }

    // Update post with success
    await query(`
      UPDATE social_posts SET
        status = 'published',
        published_at = NOW(),
        external_post_id = $2,
        external_url = $3,
        updated_at = NOW()
      WHERE id = $1
    `, [postId, result.externalId || null, result.externalUrl || null])

    return res.status(200).json({ success: true, ...result })
  } catch (err) {
    // Update post with failure
    await query(`
      UPDATE social_posts SET status = 'failed', error_message = $2, updated_at = NOW() WHERE id = $1
    `, [postId, err.message]).catch(() => {})

    console.error('Social publish error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}

/* ── Facebook Page Post ── */
async function publishToFacebook(post) {
  // Read from EXISTING platform_connections table (not modifying it)
  const connection = await queryOne(
    `SELECT * FROM platform_connections WHERE facility_id = $1 AND platform = 'meta' AND status = 'connected'`,
    [post.facility_id]
  )
  if (!connection) throw new Error('No connected Meta account. Connect in the Ad Publisher tab first.')

  const pageId = connection.page_id
  const metadata = typeof connection.metadata === 'string' ? JSON.parse(connection.metadata) : connection.metadata
  const pageAccessToken = metadata?.pageAccessToken || connection.access_token
  if (!pageId || !pageAccessToken) throw new Error('Meta page not connected. Reconnect in the Ad Publisher tab.')

  // Post to Facebook Page
  const hasMedia = post.media_urls && post.media_urls.length > 0
  let fbResult

  if (hasMedia) {
    // Photo post
    const photoRes = await fetch(`${META_GRAPH}/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: post.media_urls[0],
        message: post.content,
        access_token: pageAccessToken,
      }),
    })
    fbResult = await photoRes.json()
  } else {
    // Text-only post
    const feedRes = await fetch(`${META_GRAPH}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: post.content,
        link: post.cta_url || undefined,
        access_token: pageAccessToken,
      }),
    })
    fbResult = await feedRes.json()
  }

  if (fbResult.error) throw new Error(`Facebook API: ${fbResult.error.message}`)

  return {
    externalId: fbResult.id || fbResult.post_id,
    externalUrl: `https://facebook.com/${fbResult.id || fbResult.post_id}`,
    platform: 'facebook',
  }
}

/* ── Instagram Post (via Facebook Graph API) ── */
async function publishToInstagram(post) {
  const connection = await queryOne(
    `SELECT * FROM platform_connections WHERE facility_id = $1 AND platform = 'meta' AND status = 'connected'`,
    [post.facility_id]
  )
  if (!connection) throw new Error('No connected Meta account. Connect in the Ad Publisher tab first.')

  const metadata = typeof connection.metadata === 'string' ? JSON.parse(connection.metadata) : connection.metadata
  const pageAccessToken = metadata?.pageAccessToken || connection.access_token

  // Get Instagram Business Account ID from connected page
  const pageId = connection.page_id
  const igRes = await fetch(`${META_GRAPH}/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`)
  const igData = await igRes.json()
  const igUserId = igData?.instagram_business_account?.id

  if (!igUserId) throw new Error('No Instagram Business account linked to your Facebook Page. Link it in Facebook Business Settings first.')

  // Instagram requires an image
  if (!post.media_urls || post.media_urls.length === 0) {
    throw new Error('Instagram posts require at least one image. Add a photo before publishing.')
  }

  // Build caption with hashtags
  const hashtags = post.hashtags && post.hashtags.length > 0
    ? '\n\n' + post.hashtags.join(' ')
    : ''
  const caption = post.content + hashtags

  // Step 1: Create media container
  const containerRes = await fetch(`${META_GRAPH}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: post.media_urls[0],
      caption: caption.slice(0, 2200), // IG caption limit
      access_token: pageAccessToken,
    }),
  })
  const container = await containerRes.json()
  if (container.error) throw new Error(`Instagram API: ${container.error.message}`)

  // Step 2: Publish the container
  const publishRes = await fetch(`${META_GRAPH}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: container.id,
      access_token: pageAccessToken,
    }),
  })
  const published = await publishRes.json()
  if (published.error) throw new Error(`Instagram publish: ${published.error.message}`)

  return {
    externalId: published.id,
    externalUrl: `https://instagram.com/p/${published.id}`,
    platform: 'instagram',
  }
}

/* ── GBP Post (via existing gbp_connections) ── */
async function publishToGBP(post) {
  const connection = await queryOne(
    `SELECT * FROM gbp_connections WHERE facility_id = $1 AND status = 'connected'`,
    [post.facility_id]
  )
  if (!connection) throw new Error('No connected Google Business Profile. Connect in the GBP tab first.')

  let accessToken = connection.access_token
  const tokenExpired = connection.token_expires_at && new Date(connection.token_expires_at) < new Date()

  if (tokenExpired && connection.refresh_token) {
    // Refresh token (same pattern as gbp-posts.js but self-contained)
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_GBP_CLIENT_ID,
        client_secret: process.env.GOOGLE_GBP_CLIENT_SECRET,
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    const tokenData = await tokenRes.json()
    if (tokenData.error) throw new Error(`GBP token refresh failed: ${tokenData.error}`)

    accessToken = tokenData.access_token
    // Update token in gbp_connections — only updating token fields, nothing else
    await query(`
      UPDATE gbp_connections SET access_token = $2, token_expires_at = NOW() + interval '1 hour', updated_at = NOW()
      WHERE id = $1
    `, [connection.id, accessToken])
  }

  const locationName = connection.location_id
  if (!locationName) throw new Error('GBP location not configured. Set it up in the GBP tab first.')

  const gbpPost = {
    languageCode: 'en',
    summary: post.content,
    topicType: 'STANDARD',
  }

  if (post.cta_url) {
    gbpPost.callToAction = { actionType: 'LEARN_MORE', url: post.cta_url }
  }
  if (post.media_urls && post.media_urls.length > 0) {
    gbpPost.media = [{ mediaFormat: 'PHOTO', sourceUrl: post.media_urls[0] }]
  }

  const gbpRes = await fetch(`https://mybusiness.googleapis.com/v4/${locationName}/localPosts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(gbpPost),
  })
  const gbpResult = await gbpRes.json()
  if (gbpResult.error) throw new Error(`GBP API: ${gbpResult.error.message || JSON.stringify(gbpResult.error)}`)

  return {
    externalId: gbpResult.name,
    externalUrl: null,
    platform: 'gbp',
  }
}
