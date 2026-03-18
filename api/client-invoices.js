import { query, queryOne } from './_db.js'
import { isAdmin } from './_auth.js'

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function esc(str) {
  if (!str) return ''
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const PLAN_PRICES = {
  launch: 499,
  growth: 999,
  portfolio: 1499,
}

function generateInvoiceNumber(facilityName, date) {
  const prefix = (facilityName || 'INV').replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase()
  const month = date.toISOString().slice(0, 7).replace('-', '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `SS-${prefix}-${month}-${rand}`
}

function renderInvoiceHTML(invoice) {
  const { invoiceNumber, facilityName, clientName, clientEmail, period, plan, planPrice, adSpend, lineItems, total, dueDate } = invoice

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,system-ui,sans-serif;background:#f8fafc;">
<div style="max-width:700px;margin:0 auto;padding:32px 16px;">
  <div style="background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    <!-- Header -->
    <div style="padding:24px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;">
      <div>
        <h1 style="margin:0;font-size:20px;color:#0f172a;">Invoice</h1>
        <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;">${esc(invoiceNumber)}</p>
      </div>
      <div style="text-align:right;">
        <p style="margin:0;font-size:13px;font-weight:600;color:#0f172a;">StowStack by StorageAds.com</p>
        <p style="margin:2px 0 0;font-size:11px;color:#94a3b8;">blake@storepawpaw.com</p>
      </div>
    </div>

    <!-- Bill To -->
    <div style="padding:24px;border-bottom:1px solid #f1f5f9;">
      <div style="display:flex;justify-content:space-between;">
        <div>
          <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Bill To</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0f172a;">${esc(clientName)}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#64748b;">${esc(facilityName)}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#64748b;">${esc(clientEmail)}</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Period</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0f172a;">${esc(period)}</p>
          <p style="margin:8px 0 0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Due Date</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0f172a;">${esc(dueDate)}</p>
        </div>
      </div>
    </div>

    <!-- Line Items -->
    <div style="padding:0;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:12px 24px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Description</th>
            <th style="padding:12px 24px;text-align:right;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItems.map(item => `
          <tr style="border-top:1px solid #f1f5f9;">
            <td style="padding:12px 24px;font-size:13px;color:#0f172a;">${esc(item.description)}</td>
            <td style="padding:12px 24px;font-size:13px;color:#0f172a;text-align:right;font-weight:500;">$${Number(item.amount).toLocaleString()}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr style="border-top:2px solid #e2e8f0;background:#f8fafc;">
            <td style="padding:16px 24px;font-size:14px;font-weight:700;color:#0f172a;">Total</td>
            <td style="padding:16px 24px;font-size:14px;font-weight:700;color:#0f172a;text-align:right;">$${Number(total).toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:20px 24px;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8;">
      <p style="margin:0;">Payment is processed automatically via Stripe. If you have questions about this invoice, reply to this email or contact blake@storepawpaw.com.</p>
    </div>
  </div>
</div>
</body>
</html>`
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    // POST — Generate and send invoice
    if (req.method === 'POST') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

      const { clientId, adSpend, additionalItems } = req.body
      if (!clientId) return res.status(400).json({ error: 'Missing clientId' })

      const client = await queryOne(
        `SELECT c.*, f.name AS fac_name, o.plan
         FROM clients c
         JOIN facilities f ON c.facility_id = f.id
         LEFT JOIN organizations o ON f.organization_id = o.id
         WHERE c.id = $1`,
        [clientId]
      )
      if (!client) return res.status(404).json({ error: 'Client not found' })

      const plan = client.plan || 'launch'
      const planPrice = PLAN_PRICES[plan] || 499

      const now = new Date()
      const period = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

      const lineItems = [
        { description: `StowStack ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan — ${client.fac_name || client.facility_name}`, amount: planPrice },
      ]

      if (adSpend && adSpend > 0) {
        lineItems.push({ description: 'Ad Spend (Meta + Google) — pass-through', amount: adSpend })
      }

      if (additionalItems && Array.isArray(additionalItems)) {
        for (const item of additionalItems) {
          if (item.description && item.amount) {
            lineItems.push({ description: item.description, amount: Number(item.amount) })
          }
        }
      }

      const total = lineItems.reduce((s, i) => s + Number(i.amount), 0)
      const invoiceNumber = generateInvoiceNumber(client.fac_name || client.facility_name, now)

      const invoiceData = {
        invoiceNumber,
        facilityName: client.fac_name || client.facility_name,
        clientName: client.name,
        clientEmail: client.email,
        period,
        plan,
        planPrice,
        adSpend: adSpend || 0,
        lineItems,
        total,
        dueDate,
      }

      const html = renderInvoiceHTML(invoiceData)

      // Send via Resend
      const apiKey = process.env.RESEND_API_KEY
      if (apiKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: 'StowStack Billing <billing@stowstack.co>',
            to: client.email,
            cc: 'blake@storepawpaw.com',
            subject: `Invoice ${invoiceNumber} — ${client.fac_name || client.facility_name} — ${period}`,
            html,
          }),
        })
      }

      // Log activity
      query(
        'INSERT INTO activity_log (type, facility_id, facility_name, detail) VALUES ($1, $2, $3, $4)',
        ['invoice_sent', client.facility_id, client.fac_name, `Invoice ${invoiceNumber} for $${total.toLocaleString()} sent to ${client.email}`]
      ).catch(() => {})

      return res.json({ success: true, invoiceNumber, total, sentTo: client.email })
    }

    // GET — List invoices (from activity log)
    if (req.method === 'GET') {
      const { clientId, accessCode, email } = req.query || {}

      let facilityFilter = ''
      const params = []

      if (clientId && isAdmin(req)) {
        const client = await queryOne('SELECT facility_id FROM clients WHERE id = $1', [clientId])
        if (client) {
          params.push(client.facility_id)
          facilityFilter = 'AND facility_id = $1'
        }
      } else if (accessCode && email) {
        const client = await queryOne(
          'SELECT facility_id FROM clients WHERE access_code = $1 AND LOWER(email) = LOWER($2)',
          [accessCode, email.trim()]
        )
        if (client) {
          params.push(client.facility_id)
          facilityFilter = 'AND facility_id = $1'
        }
      }

      const invoices = await query(
        `SELECT * FROM activity_log WHERE type = 'invoice_sent' ${facilityFilter} ORDER BY created_at DESC LIMIT 24`,
        params
      )

      return res.json({ success: true, data: invoices })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('client-invoices error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
