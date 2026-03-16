import { query, queryOne } from './_db.js'
import crypto from 'crypto'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { action } = req.body

    // ── Request password reset (send email) ──
    if (action === 'request') {
      const { email, orgSlug } = req.body
      if (!email || !orgSlug) return res.status(400).json({ error: 'Email and organization required' })

      const user = await queryOne(
        `SELECT ou.id, ou.name, ou.email, o.name as org_name, o.slug
         FROM org_users ou JOIN organizations o ON o.id = ou.organization_id
         WHERE ou.email = $1 AND o.slug = $2 AND ou.status = 'active'`,
        [email.toLowerCase(), orgSlug]
      )

      // Always return success to prevent email enumeration
      if (!user) return res.json({ success: true })

      const resetToken = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await query(
        `UPDATE org_users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3`,
        [resetToken, expiresAt.toISOString(), user.id]
      )

      // Send reset email via Resend
      if (process.env.RESEND_API_KEY) {
        const resetUrl = `${process.env.NEXT_PUBLIC_URL || 'https://stowstack.co'}/partner?reset=${resetToken}`
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'StowStack <noreply@stowstack.co>',
              to: user.email,
              subject: 'Reset Your StowStack Password',
              html: `
                <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 500px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 20px;">Password Reset</h1>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">StowStack Partner Portal</p>
                  </div>
                  <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px;">
                    <p style="color: #334155; font-size: 15px;">Hi ${user.name || 'there'},</p>
                    <p style="color: #334155; font-size: 15px;">We received a request to reset your password for <strong>${user.org_name}</strong>.</p>
                    <div style="margin: 24px 0; text-align: center;">
                      <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                        Reset Password
                      </a>
                    </div>
                    <p style="color: #64748b; font-size: 13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">— The StowStack Team</p>
                  </div>
                </div>
              `,
            }),
          })
        } catch { /* email send failed, not critical */ }
      }

      return res.json({ success: true })
    }

    // ── Verify reset token ──
    if (action === 'verify') {
      const { token } = req.body
      if (!token) return res.status(400).json({ error: 'Token required' })

      const user = await queryOne(
        `SELECT ou.id, ou.email, o.slug as org_slug
         FROM org_users ou JOIN organizations o ON o.id = ou.organization_id
         WHERE ou.reset_token = $1 AND ou.reset_token_expires_at > NOW()`,
        [token]
      )

      if (!user) return res.status(400).json({ error: 'Invalid or expired reset link' })
      return res.json({ valid: true, email: user.email, orgSlug: user.org_slug })
    }

    // ── Reset password with token ──
    if (action === 'reset') {
      const { token, newPassword } = req.body
      if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' })
      if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })

      const user = await queryOne(
        `SELECT id FROM org_users WHERE reset_token = $1 AND reset_token_expires_at > NOW()`,
        [token]
      )
      if (!user) return res.status(400).json({ error: 'Invalid or expired reset link' })

      const passwordHash = crypto.createHash('sha256').update(newPassword + user.id).digest('hex')
      await query(
        `UPDATE org_users SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL WHERE id = $2`,
        [passwordHash, user.id]
      )

      return res.json({ success: true })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err) {
    console.error('Password reset error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
