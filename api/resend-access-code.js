import { queryOne } from './_db.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email required' })

    const client = await queryOne(
      `SELECT name, email, access_code FROM clients WHERE LOWER(email) = $1`,
      [email.toLowerCase()]
    )

    // Always return success to prevent email enumeration
    if (!client) return res.json({ success: true })

    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'StowStack <noreply@stowstack.co>',
            to: client.email,
            subject: 'Your StowStack Access Code',
            html: `
              <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 500px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #16a34a, #059669); padding: 24px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 20px;">Your Access Code</h1>
                  <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">StowStack Client Portal</p>
                </div>
                <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px;">
                  <p style="color: #334155; font-size: 15px;">Hi ${client.name || 'there'},</p>
                  <p style="color: #334155; font-size: 15px;">Here's your access code to sign in to your StowStack dashboard:</p>
                  <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
                    <code style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #16a34a; background: #dcfce7; padding: 8px 20px; border-radius: 6px;">
                      ${client.access_code}
                    </code>
                  </div>
                  <p style="color: #334155; font-size: 14px;">Sign in at <strong>stowstack.co/client</strong> with your email and this code.</p>
                  <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">— The StowStack Team</p>
                </div>
              </div>
            `,
          }),
        })
      } catch { /* email send failed, not critical */ }
    }

    return res.json({ success: true })
  } catch (err) {
    console.error('Resend access code error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
