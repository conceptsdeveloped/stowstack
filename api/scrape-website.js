import * as cheerio from 'cheerio'
import { query } from './_db.js'

export const config = { maxDuration: 30 }

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return req.headers['x-admin-key'] === ADMIN_KEY
}

// Resolve relative URLs to absolute
function resolveUrl(base, relative) {
  try {
    return new URL(relative, base).href
  } catch {
    return null
  }
}

// Filter out tiny icons, trackers, and junk images
function isUsefulImage(src, width, height) {
  if (!src) return false
  // Skip data URIs, tracking pixels, SVGs (usually icons)
  if (src.startsWith('data:')) return false
  if (src.includes('facebook.com') || src.includes('google-analytics') || src.includes('doubleclick')) return false
  if (src.endsWith('.svg') || src.endsWith('.ico')) return false
  // Skip tiny images (likely icons/buttons)
  if (width && height && (width < 100 || height < 100)) return false
  return true
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { url, facilityId } = req.body || {}
  if (!url?.trim()) return res.status(400).json({ error: 'url is required' })

  // Validate URL
  let targetUrl
  try {
    targetUrl = new URL(url.trim())
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return res.status(400).json({ error: 'URL must use http or https' })
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }

  try {
    // Fetch the page
    const response = await fetch(targetUrl.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return res.status(200).json({ error: `Website returned ${response.status}`, scraped: false })
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    const baseUrl = targetUrl.origin

    // --- Extract metadata ---
    const meta = {
      title: $('title').first().text().trim() || null,
      description: $('meta[name="description"]').attr('content')?.trim() ||
                   $('meta[property="og:description"]').attr('content')?.trim() || null,
      ogImage: $('meta[property="og:image"]').attr('content')?.trim() || null,
      ogTitle: $('meta[property="og:title"]').attr('content')?.trim() || null,
      favicon: $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href') || null,
    }

    // --- Extract all images ---
    const imageSet = new Set()
    const images = []

    // OG image first (usually the best one)
    if (meta.ogImage) {
      const resolved = resolveUrl(baseUrl, meta.ogImage)
      if (resolved && !imageSet.has(resolved)) {
        imageSet.add(resolved)
        images.push({ url: resolved, alt: meta.ogTitle || '', source: 'og_image' })
      }
    }

    // All img tags
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src')
      const width = parseInt($(el).attr('width') || '0')
      const height = parseInt($(el).attr('height') || '0')
      const alt = $(el).attr('alt') || ''

      if (!isUsefulImage(src, width, height)) return

      const resolved = resolveUrl(baseUrl, src)
      if (resolved && !imageSet.has(resolved)) {
        imageSet.add(resolved)
        images.push({ url: resolved, alt, source: 'img_tag', width: width || null, height: height || null })
      }
    })

    // Background images in style attributes
    $('[style*="background"]').each((_, el) => {
      const style = $(el).attr('style') || ''
      const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/)
      if (match) {
        const resolved = resolveUrl(baseUrl, match[1])
        if (resolved && !imageSet.has(resolved) && isUsefulImage(resolved)) {
          imageSet.add(resolved)
          images.push({ url: resolved, alt: '', source: 'background' })
        }
      }
    })

    // srcset images (get the largest)
    $('img[srcset], source[srcset]').each((_, el) => {
      const srcset = $(el).attr('srcset') || ''
      const entries = srcset.split(',').map(s => s.trim()).filter(Boolean)
      // Get the last (usually largest) entry
      if (entries.length) {
        const last = entries[entries.length - 1].split(/\s+/)[0]
        const resolved = resolveUrl(baseUrl, last)
        if (resolved && !imageSet.has(resolved) && isUsefulImage(resolved)) {
          imageSet.add(resolved)
          images.push({ url: resolved, alt: '', source: 'srcset' })
        }
      }
    })

    // --- Extract videos ---
    const videos = []
    $('video source, video[src]').each((_, el) => {
      const src = $(el).attr('src')
      if (src) {
        const resolved = resolveUrl(baseUrl, src)
        if (resolved) videos.push({ url: resolved, type: $(el).attr('type') || 'video/mp4' })
      }
    })

    // YouTube/Vimeo embeds
    $('iframe[src]').each((_, el) => {
      const src = $(el).attr('src') || ''
      if (src.includes('youtube.com') || src.includes('youtu.be') || src.includes('vimeo.com')) {
        videos.push({ url: src, type: 'embed' })
      }
    })

    // --- Extract structured data (JSON-LD) ---
    const structuredData = []
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html())
        structuredData.push(data)
      } catch {}
    })

    // --- Extract contact info ---
    const bodyText = $('body').text()
    const contact = {
      phones: [...new Set((bodyText.match(/(?:\+1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g) || []))].slice(0, 5),
      emails: [...new Set((bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []))].slice(0, 5),
    }

    // Extract address from structured data
    let address = null
    for (const sd of structuredData) {
      const addr = sd.address || sd?.['@graph']?.find?.(n => n.address)?.address
      if (addr) {
        address = typeof addr === 'string' ? addr : [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode].filter(Boolean).join(', ')
        break
      }
    }

    // --- Extract business hours from structured data ---
    let hours = null
    for (const sd of structuredData) {
      const oh = sd.openingHoursSpecification || sd?.['@graph']?.find?.(n => n.openingHoursSpecification)?.openingHoursSpecification
      if (oh) {
        hours = oh
        break
      }
    }

    // --- Extract page text sections for context ---
    const headings = []
    $('h1, h2, h3').each((_, el) => {
      const t = $(el).text().trim()
      if (t && t.length < 200) headings.push(t)
    })

    const result = {
      scraped: true,
      url: targetUrl.href,
      meta,
      images: images.slice(0, 30),
      videos,
      contact,
      address,
      hours,
      structuredData: structuredData.slice(0, 3),
      headings: headings.slice(0, 20),
    }

    // Save scraped images as assets if we have a facilityId
    if (facilityId && images.length > 0) {
      try {
        for (const img of images.slice(0, 15)) {
          await query(
            `INSERT INTO assets (facility_id, type, source, url, metadata)
             VALUES ($1, 'photo', 'website_scrape', $2, $3)
             ON CONFLICT DO NOTHING`,
            [facilityId, img.url, JSON.stringify({ alt: img.alt, scrapeSource: img.source, scrapedFrom: targetUrl.href })]
          )
        }
      } catch (err) {
        console.error('Failed to save scraped assets:', err.message)
      }
    }

    // Update facility with scraped contact info if available
    if (facilityId && (address || contact.phones.length || contact.emails.length)) {
      try {
        const updates = []
        const params = []
        let idx = 1

        if (address && !await hasGoogleAddress(facilityId)) {
          updates.push(`google_address = $${idx++}`)
          params.push(address)
        }
        if (contact.phones.length && !await hasGooglePhone(facilityId)) {
          updates.push(`google_phone = $${idx++}`)
          params.push(contact.phones[0])
        }
        if (meta.title || meta.ogTitle) {
          // Don't overwrite facility name, but store website URL
          const websiteUrl = targetUrl.origin
          updates.push(`website = COALESCE(website, $${idx++})`)
          params.push(websiteUrl)
        }
        if (hours) {
          updates.push(`hours = COALESCE(hours, $${idx++})`)
          params.push(JSON.stringify(hours))
        }

        if (updates.length) {
          params.push(facilityId)
          await query(`UPDATE facilities SET ${updates.join(', ')} WHERE id = $${idx}`, params)
        }
      } catch (err) {
        console.error('Failed to update facility with scraped data:', err.message)
      }
    }

    return res.status(200).json(result)
  } catch (err) {
    console.error('Scrape failed:', err.message)
    return res.status(500).json({ error: 'Scrape failed', details: err.message })
  }
}

// Helper to check if facility already has google data (don't overwrite API data with scraped data)
async function hasGoogleAddress(facilityId) {
  const rows = await query(`SELECT google_address FROM facilities WHERE id = $1`, [facilityId])
  return rows.length > 0 && rows[0].google_address
}

async function hasGooglePhone(facilityId) {
  const rows = await query(`SELECT google_phone FROM facilities WHERE id = $1`, [facilityId])
  return rows.length > 0 && rows[0].google_phone
}
