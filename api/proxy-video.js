import { requireAdmin } from './_auth.js'
export const config = { maxDuration: 30 }

const ALLOWED_ORIGINS = [
  'https://stowstack.co',
  'https://www.stowstack.co',
  'http://localhost:5173',
  'http://localhost:3000',
]

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!requireAdmin(req, res)) return

  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'url query param required' })

  try {
    const videoRes = await fetch(url, { signal: AbortSignal.timeout(25000) })
    if (!videoRes.ok) return res.status(502).json({ error: `Upstream returned ${videoRes.status}` })

    const contentType = videoRes.headers.get('content-type') || 'video/mp4'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Access-Control-Allow-Origin', origin || ALLOWED_ORIGINS[0])

    const buffer = Buffer.from(await videoRes.arrayBuffer())
    return res.status(200).send(buffer)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
