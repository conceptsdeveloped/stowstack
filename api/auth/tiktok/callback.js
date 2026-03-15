import { query } from '../../_db.js'

export const config = { maxDuration: 15 }

export default async function handler(req, res) {
  const { code, state, error, error_description } = req.query

  if (error) {
    console.error('TikTok OAuth error:', error, error_description)
    return res.redirect('/?auth=error&platform=tiktok&message=' + encodeURIComponent(error_description || error))
  }

  if (!code || !state) {
    return res.redirect('/?auth=error&platform=tiktok&message=Missing+authorization+code')
  }

  let facilityId
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString())
    facilityId = parsed.facilityId
  } catch {
    return res.redirect('/?auth=error&platform=tiktok&message=Invalid+state+parameter')
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET

  if (!clientKey || !clientSecret) {
    return res.redirect('/?auth=error&platform=tiktok&message=TikTok+app+not+configured')
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_ENV === 'production' ? 'https://www.stowstack.co' : null)
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const redirectUri = `${baseUrl}/api/auth/tiktok/callback`

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error || !tokenData.access_token) {
      const errMsg = tokenData.error_description || tokenData.error || 'Token exchange failed'
      console.error('TikTok token exchange failed:', errMsg)
      return res.redirect('/?auth=error&platform=tiktok&message=' + encodeURIComponent(errMsg))
    }

    const { access_token, refresh_token, expires_in, open_id } = tokenData
    const tokenExpiresAt = new Date(Date.now() + (expires_in || 86400) * 1000).toISOString()

    // Fetch user info
    let userName = null
    let displayName = null
    try {
      const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,username', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      const userData = await userRes.json()
      if (userData.data?.user) {
        userName = userData.data.user.username
        displayName = userData.data.user.display_name
      }
    } catch (err) {
      console.error('Failed to fetch TikTok user info:', err.message)
    }

    // Upsert connection
    await query(
      `INSERT INTO platform_connections (facility_id, platform, status, access_token, refresh_token, token_expires_at, account_id, account_name, metadata, updated_at)
       VALUES ($1, 'tiktok', 'connected', $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (facility_id, platform) DO UPDATE SET
         status = 'connected',
         access_token = $2,
         refresh_token = COALESCE($3, platform_connections.refresh_token),
         token_expires_at = $4,
         account_id = COALESCE($5, platform_connections.account_id),
         account_name = COALESCE($6, platform_connections.account_name),
         metadata = $7,
         updated_at = NOW()`,
      [
        facilityId,
        access_token,
        refresh_token || null,
        tokenExpiresAt,
        open_id || null,
        displayName || userName || null,
        JSON.stringify({ open_id, username: userName, displayName }),
      ]
    )

    return res.redirect('/?auth=success&platform=tiktok')
  } catch (err) {
    console.error('TikTok OAuth callback failed:', err.message)
    return res.redirect('/?auth=error&platform=tiktok&message=' + encodeURIComponent(err.message))
  }
}
