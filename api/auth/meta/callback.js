import { query } from '../../_db.js'

export const config = { maxDuration: 15 }

export default async function handler(req, res) {
  const { code, state, error, error_description } = req.query

  if (error) {
    console.error('Meta OAuth error:', error, error_description)
    return res.redirect('/?auth=error&platform=meta&message=' + encodeURIComponent(error_description || error))
  }

  if (!code || !state) {
    return res.redirect('/?auth=error&platform=meta&message=Missing+authorization+code')
  }

  let facilityId
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString())
    facilityId = parsed.facilityId
  } catch {
    return res.redirect('/?auth=error&platform=meta&message=Invalid+state+parameter')
  }

  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET

  if (!appId || !appSecret) {
    return res.redirect('/?auth=error&platform=meta&message=Meta+app+not+configured')
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/meta/callback`

  try {
    // Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
    )
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      console.error('Meta token exchange failed:', tokenData.error)
      return res.redirect('/?auth=error&platform=meta&message=' + encodeURIComponent(tokenData.error.message))
    }

    // Exchange for long-lived token (60 days)
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    )
    const longLivedData = await longLivedRes.json()
    const accessToken = longLivedData.access_token || tokenData.access_token
    const expiresIn = longLivedData.expires_in || tokenData.expires_in || 5184000

    // Fetch user's ad accounts
    const accountsRes = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status&access_token=${accessToken}`
    )
    const accountsData = await accountsRes.json()
    const adAccounts = accountsData.data || []

    // Fetch user's pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`
    )
    const pagesData = await pagesRes.json()
    const pages = pagesData.data || []

    // Use first ad account and page as defaults
    const defaultAccount = adAccounts[0]
    const defaultPage = pages[0]

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    // Upsert connection
    await query(
      `INSERT INTO platform_connections (facility_id, platform, status, access_token, token_expires_at, account_id, account_name, page_id, page_name, metadata, updated_at)
       VALUES ($1, 'meta', 'connected', $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (facility_id, platform) DO UPDATE SET
         status = 'connected',
         access_token = $2,
         token_expires_at = $3,
         account_id = COALESCE($4, platform_connections.account_id),
         account_name = COALESCE($5, platform_connections.account_name),
         page_id = COALESCE($6, platform_connections.page_id),
         page_name = COALESCE($7, platform_connections.page_name),
         metadata = $8,
         updated_at = NOW()`,
      [
        facilityId,
        accessToken,
        tokenExpiresAt,
        defaultAccount?.id?.replace('act_', '') || null,
        defaultAccount?.name || null,
        defaultPage?.id || null,
        defaultPage?.name || null,
        JSON.stringify({
          adAccounts: adAccounts.map(a => ({ id: a.id, name: a.name })),
          pages: pages.map(p => ({ id: p.id, name: p.name })),
          pageAccessToken: defaultPage?.access_token || null,
        }),
      ]
    )

    return res.redirect('/?auth=success&platform=meta')
  } catch (err) {
    console.error('Meta OAuth callback failed:', err.message)
    return res.redirect('/?auth=error&platform=meta&message=' + encodeURIComponent(err.message))
  }
}
