import { Redis } from '@upstash/redis'

const ADMIN_KEY = process.env.ADMIN_SECRET || 'stowstack-admin-2024'

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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function getRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null
  return new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()

  // Admin-only endpoint
  if (req.headers['x-admin-key'] !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const redis = getRedis()
  if (!redis) {
    return res.status(200).json({ invoices: [] })
  }

  // GET /api/client-billing?code=XXX — get invoices for a client
  // GET /api/client-billing?all=true — get all invoices across all clients
  if (req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const code = url.searchParams.get('code')
    const all = url.searchParams.get('all')

    if (all === 'true') {
      try {
        const keys = await redis.keys('billing:*')
        const results = []
        for (const key of keys) {
          const clientCode = key.replace('billing:', '')
          const raw = await redis.get(key)
          const invoices = typeof raw === 'string' ? JSON.parse(raw) : (raw || [])
          for (const inv of invoices) {
            results.push({ ...inv, code: clientCode })
          }
        }
        return res.status(200).json({ invoices: results })
      } catch (err) {
        console.error('Get all invoices error:', err)
        return res.status(500).json({ error: 'Failed to get invoices' })
      }
    }

    if (!code) return res.status(400).json({ error: 'Missing access code' })

    try {
      const raw = await redis.get(`billing:${code}`)
      const invoices = typeof raw === 'string' ? JSON.parse(raw) : (raw || [])
      return res.status(200).json({ invoices })
    } catch (err) {
      console.error('Get invoices error:', err)
      return res.status(500).json({ error: 'Failed to get invoices' })
    }
  }

  // POST /api/client-billing — create a new invoice
  // body: { code, month, amount, adSpend, managementFee, dueDate, notes }
  if (req.method === 'POST') {
    const { code, month, amount, adSpend, managementFee, dueDate, notes } = req.body || {}
    if (!code || !month || amount == null || adSpend == null || managementFee == null || !dueDate) {
      return res.status(400).json({ error: 'Missing required fields: code, month, amount, adSpend, managementFee, dueDate' })
    }

    try {
      const raw = await redis.get(`billing:${code}`)
      const invoices = typeof raw === 'string' ? JSON.parse(raw) : (raw || [])

      const invoice = {
        id: `inv-${Date.now()}`,
        month,
        amount: Number(amount),
        adSpend: Number(adSpend),
        managementFee: Number(managementFee),
        status: 'draft',
        dueDate,
        paidDate: null,
        notes: notes || '',
        createdAt: new Date().toISOString(),
      }

      invoices.unshift(invoice)

      // Cap at 100 invoices per client
      if (invoices.length > 100) invoices.length = 100

      await redis.set(`billing:${code}`, JSON.stringify(invoices))
      return res.status(200).json({ success: true, invoice })
    } catch (err) {
      console.error('Create invoice error:', err)
      return res.status(500).json({ error: 'Failed to create invoice' })
    }
  }

  // PATCH /api/client-billing — update an invoice
  // body: { code, invoiceId, status, paidDate, notes }
  if (req.method === 'PATCH') {
    const { code, invoiceId, status, paidDate, notes } = req.body || {}
    if (!code || !invoiceId) return res.status(400).json({ error: 'Missing code or invoiceId' })

    const validStatuses = ['draft', 'sent', 'paid', 'overdue']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` })
    }

    try {
      const raw = await redis.get(`billing:${code}`)
      const invoices = typeof raw === 'string' ? JSON.parse(raw) : (raw || [])

      const idx = invoices.findIndex(inv => inv.id === invoiceId)
      if (idx === -1) return res.status(404).json({ error: 'Invoice not found' })

      if (status !== undefined) invoices[idx].status = status
      if (paidDate !== undefined) invoices[idx].paidDate = paidDate
      if (notes !== undefined) invoices[idx].notes = notes

      await redis.set(`billing:${code}`, JSON.stringify(invoices))
      return res.status(200).json({ success: true, invoice: invoices[idx] })
    } catch (err) {
      console.error('Update invoice error:', err)
      return res.status(500).json({ error: 'Failed to update invoice' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
