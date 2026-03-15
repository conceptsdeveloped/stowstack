import { query, queryOne } from './_db.js'

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://stowstack.co',
  'https://www.stowstack.co',
  'https://stowstack-app.vercel.app',
]

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

// Credit amounts per referral milestone
const CREDIT_TIERS = {
  signed_up: 50,    // $50 when referral signs up
  active: 150,      // $150 when referral goes live (first month billed)
  bonus_5: 250,     // $250 bonus at 5 successful referrals
  bonus_10: 500,    // $500 bonus at 10 successful referrals
  bonus_25: 1000,   // $1000 bonus at 25 successful referrals
}

function generateCode(name) {
  const prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase()
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${suffix}`
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(200).end()

  const adminKey = req.headers['x-admin-key']
  const isAdmin = adminKey === (process.env.ADMIN_SECRET || 'stowstack-admin-2024')

  if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const { action } = req.query

    // ── GET: list referral codes + their referrals ──
    if (req.method === 'GET' && !action) {
      const codes = await query(`
        SELECT rc.*,
          (SELECT COUNT(*) FROM referrals r WHERE r.referral_code_id = rc.id) as referral_count,
          (SELECT COUNT(*) FROM referrals r WHERE r.referral_code_id = rc.id AND r.status = 'active') as active_count
        FROM referral_codes rc
        ORDER BY rc.total_earned DESC, rc.created_at DESC
      `)
      return res.status(200).json({ codes })
    }

    // ── GET: referrals for a specific code ──
    if (req.method === 'GET' && action === 'referrals') {
      const { code_id } = req.query
      if (!code_id) return res.status(400).json({ error: 'code_id required' })
      const referrals = await query(
        `SELECT * FROM referrals WHERE referral_code_id = $1 ORDER BY created_at DESC`,
        [code_id]
      )
      return res.status(200).json({ referrals })
    }

    // ── GET: credit ledger for a code ──
    if (req.method === 'GET' && action === 'credits') {
      const { code_id } = req.query
      if (!code_id) return res.status(400).json({ error: 'code_id required' })
      const credits = await query(
        `SELECT * FROM referral_credits WHERE referral_code_id = $1 ORDER BY created_at DESC`,
        [code_id]
      )
      return res.status(200).json({ credits })
    }

    // ── GET: leaderboard ──
    if (req.method === 'GET' && action === 'leaderboard') {
      const leaders = await query(`
        SELECT rc.id, rc.code, rc.referrer_name, rc.referral_count, rc.total_earned, rc.credit_balance,
          (SELECT COUNT(*) FROM referrals r WHERE r.referral_code_id = rc.id AND r.status = 'active') as active_referrals
        FROM referral_codes rc
        WHERE rc.status = 'active' AND rc.referral_count > 0
        ORDER BY rc.referral_count DESC, rc.total_earned DESC
        LIMIT 20
      `)
      return res.status(200).json({ leaders })
    }

    // ── POST: create a new referral code ──
    if (req.method === 'POST' && !action) {
      const { facility_id, referrer_name, referrer_email } = req.body
      if (!facility_id || !referrer_name || !referrer_email) {
        return res.status(400).json({ error: 'facility_id, referrer_name, and referrer_email required' })
      }
      const existing = await queryOne(
        `SELECT id FROM referral_codes WHERE facility_id = $1`,
        [facility_id]
      )
      if (existing) {
        return res.status(409).json({ error: 'Referral code already exists for this facility' })
      }
      const code = generateCode(referrer_name)
      const row = await queryOne(
        `INSERT INTO referral_codes (facility_id, code, referrer_name, referrer_email)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [facility_id, code, referrer_name, referrer_email]
      )
      return res.status(201).json({ referral_code: row })
    }

    // ── POST: submit a new referral ──
    if (req.method === 'POST' && action === 'refer') {
      const { referral_code_id, referred_name, referred_email, referred_phone, facility_name, facility_location, notes } = req.body
      if (!referral_code_id || !referred_name || !referred_email) {
        return res.status(400).json({ error: 'referral_code_id, referred_name, and referred_email required' })
      }
      const dup = await queryOne(
        `SELECT id FROM referrals WHERE referral_code_id = $1 AND referred_email = $2`,
        [referral_code_id, referred_email]
      )
      if (dup) {
        return res.status(409).json({ error: 'This person has already been referred' })
      }
      const row = await queryOne(
        `INSERT INTO referrals (referral_code_id, referred_name, referred_email, referred_phone, facility_name, facility_location, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [referral_code_id, referred_name, referred_email, referred_phone || null, facility_name || null, facility_location || null, notes || null]
      )
      // Update referral count
      await query(
        `UPDATE referral_codes SET referral_count = referral_count + 1 WHERE id = $1`,
        [referral_code_id]
      )
      return res.status(201).json({ referral: row })
    }

    // ── PATCH: update referral status (triggers credit logic) ──
    if (req.method === 'PATCH' && action === 'status') {
      const { referral_id, status } = req.body
      if (!referral_id || !status) {
        return res.status(400).json({ error: 'referral_id and status required' })
      }
      const ref = await queryOne(`SELECT * FROM referrals WHERE id = $1`, [referral_id])
      if (!ref) return res.status(404).json({ error: 'Referral not found' })

      const updates = { status }
      if (status === 'signed_up' && !ref.signed_up_at) updates.signed_up_at = new Date().toISOString()
      if (status === 'active' && !ref.activated_at) updates.activated_at = new Date().toISOString()

      const setClauses = Object.entries(updates).map(([k], i) => `${k} = $${i + 2}`).join(', ')
      const vals = Object.values(updates)

      await query(
        `UPDATE referrals SET ${setClauses}, updated_at = NOW() WHERE id = $1`,
        [referral_id, ...vals]
      )

      // Issue credits on status milestones
      if ((status === 'signed_up' || status === 'active') && !ref.credit_issued) {
        const creditAmount = CREDIT_TIERS[status] || 0
        if (creditAmount > 0) {
          const codeRow = await queryOne(`SELECT * FROM referral_codes WHERE id = $1`, [ref.referral_code_id])
          const newBalance = parseFloat(codeRow.credit_balance) + creditAmount
          const newTotal = parseFloat(codeRow.total_earned) + creditAmount

          await query(
            `UPDATE referral_codes SET credit_balance = $2, total_earned = $3 WHERE id = $1`,
            [ref.referral_code_id, newBalance, newTotal]
          )
          await query(
            `INSERT INTO referral_credits (referral_code_id, referral_id, type, amount, description, balance_after)
             VALUES ($1, $2, 'earned', $3, $4, $5)`,
            [ref.referral_code_id, referral_id, creditAmount,
             `Referral ${status === 'signed_up' ? 'signup' : 'activation'} credit for ${ref.referred_name}`,
             newBalance]
          )
          await query(
            `UPDATE referrals SET credit_amount = credit_amount + $2, credit_issued = TRUE, credit_issued_at = NOW() WHERE id = $1`,
            [referral_id, creditAmount]
          )

          // Check for milestone bonuses
          const totalActive = await queryOne(
            `SELECT COUNT(*) as cnt FROM referrals WHERE referral_code_id = $1 AND status = 'active'`,
            [ref.referral_code_id]
          )
          const cnt = parseInt(totalActive.cnt)
          let bonus = 0
          let bonusLabel = ''
          if (cnt === 5) { bonus = CREDIT_TIERS.bonus_5; bonusLabel = '5-referral milestone bonus' }
          if (cnt === 10) { bonus = CREDIT_TIERS.bonus_10; bonusLabel = '10-referral milestone bonus' }
          if (cnt === 25) { bonus = CREDIT_TIERS.bonus_25; bonusLabel = '25-referral milestone bonus' }

          if (bonus > 0) {
            const updatedCode = await queryOne(`SELECT credit_balance, total_earned FROM referral_codes WHERE id = $1`, [ref.referral_code_id])
            const bonusBalance = parseFloat(updatedCode.credit_balance) + bonus
            const bonusTotal = parseFloat(updatedCode.total_earned) + bonus
            await query(
              `UPDATE referral_codes SET credit_balance = $2, total_earned = $3 WHERE id = $1`,
              [ref.referral_code_id, bonusBalance, bonusTotal]
            )
            await query(
              `INSERT INTO referral_credits (referral_code_id, type, amount, description, balance_after)
               VALUES ($1, 'bonus', $2, $3, $4)`,
              [ref.referral_code_id, bonus, bonusLabel, bonusBalance]
            )
          }
        }
      }

      return res.status(200).json({ success: true })
    }

    // ── PATCH: redeem credits ──
    if (req.method === 'PATCH' && action === 'redeem') {
      const { code_id, amount, description } = req.body
      if (!code_id || !amount) return res.status(400).json({ error: 'code_id and amount required' })

      const codeRow = await queryOne(`SELECT * FROM referral_codes WHERE id = $1`, [code_id])
      if (!codeRow) return res.status(404).json({ error: 'Referral code not found' })
      if (parseFloat(codeRow.credit_balance) < amount) {
        return res.status(400).json({ error: 'Insufficient credit balance' })
      }

      const newBalance = parseFloat(codeRow.credit_balance) - amount
      await query(`UPDATE referral_codes SET credit_balance = $2 WHERE id = $1`, [code_id, newBalance])
      await query(
        `INSERT INTO referral_credits (referral_code_id, type, amount, description, balance_after)
         VALUES ($1, 'redeemed', $2, $3, $4)`,
        [code_id, -amount, description || 'Credit redemption', newBalance]
      )

      return res.status(200).json({ success: true, new_balance: newBalance })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Referrals API error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
