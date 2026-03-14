import { query } from '../../_db.js'

export const config = { maxDuration: 15 }

export default async function handler(req, res) {
  const { code, state, error } = req.query

  if (error) {
    console.error('Google OAuth error:', error)
    return res.redirect('/?auth=error&platform=google_ads&message=' + encodeURIComponent(error))
  }

  if (!code || !state) {
    return res.redirect('/?auth=error&platform=google_ads&message=Missing+authorization+code')
  }

  let facilityId
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString())
    facilityId = parsed.facilityId
  } catch {
    return res.redirect('/?auth=error&platform=google_ads&message=Invalid+state+parameter')
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return res.redirect('/?auth=error&platform=google_ads&message=Google+Ads+not+configured')
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/google/callback`

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      console.error('Google token exchange failed:', tokenData.error)
      return res.redirect('/?auth=error&platform=google_ads&message=' + encodeURIComponent(tokenData.error_description || tokenData.error))
    }

    const { access_token, refresh_token, expires_in } = tokenData
    const tokenExpiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString()

    // Try to fetch accessible Google Ads customer accounts
    let customers = []
    try {
      const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
      if (developerToken) {
        const customersRes = await fetch(
          'https://googleads.googleapis.com/v17/customers:listAccessibleCustomers',
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              'developer-token': developerToken,
            },
          }
        )
        const customersData = await customersRes.json()
        customers = (customersData.resourceNames || []).map(rn => rn.replace('customers/', ''))
      }
    } catch (err) {
      console.error('Failed to list Google Ads customers:', err.message)
    }

    const defaultCustomer = customers[0] || null

    // Upsert connection
    await query(
      `INSERT INTO platform_connections (facility_id, platform, status, access_token, refresh_token, token_expires_at, account_id, account_name, metadata, updated_at)
       VALUES ($1, 'google_ads', 'connected', $2, $3, $4, $5, $6, $7, NOW())
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
        defaultCustomer,
        defaultCustomer ? `Account ${defaultCustomer}` : null,
        JSON.stringify({ customers }),
      ]
    )

    return res.redirect('/?auth=success&platform=google_ads')
  } catch (err) {
    console.error('Google OAuth callback failed:', err.message)
    return res.redirect('/?auth=error&platform=google_ads&message=' + encodeURIComponent(err.message))
  }
}
