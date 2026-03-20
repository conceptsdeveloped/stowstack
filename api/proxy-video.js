import { requireAdmin } from './_auth.js'
export const config = { maxDuration: 30 }

const ALLOWED_ORIGINS = [
  'https://stowstack.co',
  'https://www.stowstack.co',
  'http://localhost:5173',
  'http://localhost:3000',
]

// SSRF protection: only allow proxying from trusted video domains
const ALLOWED_VIDEO_HOSTS = [
  'storage.googleapis.com',
  'res.cloudinary.com',
  'player.vimeo.com',
  'www.youtube.com',
  'i.ytimg.com',
  'cdn.stowstack.co',
  'stowstack.co',
]

function isAllowedUrl(urlString) {
  try {
    const parsed = new URL(urlString)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    // Block private/internal IPs
    const hostname = parsed.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') return false
    if (hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.')) return false
    if (hostname === '169.254.169.254') return false // AWS metadata
    if (hostname.endsWith('.internal') || hostname.endsWith('.local')) return false
    // Only allow known video hosting domains
    return ALLOWED_VIDEO_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h))
  } catch {
    return false
  }
}

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

  if (!isAllowedUrl(url)) {
    return res.status(400).json({ error: 'URL not allowed. Only trusted video hosting domains are permitted.' })
  }

  try {
    const videoRes = await fetch(url, { signal: AbortSignal.timeout(25000), redirect: 'error' })
    if (!videoRes.ok) return res.status(502).json({ error: `Upstream error` })

    const contentType = videoRes.headers.get('content-type') || 'video/mp4'
    // Only allow video content types
    if (!contentType.startsWith('video/') && !contentType.startsWith('audio/')) {
      return res.status(400).json({ error: 'Response is not a video' })
    }

    res.setHeader('Content-Type', contentType)
    res.setHeader('Access-Control-Allow-Origin', origin || ALLOWED_ORIGINS[0])

    const buffer = Buffer.from(await videoRes.arrayBuffer())
    // Use .end() for compatibility with both Vercel and local dev server
    res.setHeader('Content-Length', buffer.length)
    res.writeHead ? res.writeHead(200) : res.status(200)
    return res.end(buffer)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch video' })
  }
}
