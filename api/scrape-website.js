import * as cheerio from 'cheerio'
import { query } from './_db.js'

export const config = { maxDuration: 60 }

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

function resolveUrl(base, relative) {
  try {
    return new URL(relative, base).href
  } catch {
    return null
  }
}

function isUsefulImage(src, width, height) {
  if (!src) return false
  if (src.startsWith('data:')) return false
  if (src.includes('facebook.com') || src.includes('google-analytics') || src.includes('doubleclick') || src.includes('pixel')) return false
  if (src.endsWith('.svg') || src.endsWith('.ico') || src.endsWith('.gif')) return false
  if (width && height && (width < 150 || height < 150)) return false
  // Skip common junk patterns
  if (/logo|icon|spinner|loading|avatar|badge|widget|pixel\.|tracking/i.test(src)) return false
  return true
}

const PRIORITY_PAGE_KEYWORDS = [
  // Image-rich pages
  'gallery', 'photos', 'photo', 'images', 'pictures',
  'units', 'unit-sizes', 'unit-types', 'storage-units', 'sizes',
  'amenities', 'features', 'facility', 'tour', 'virtual-tour',
  'about', 'about-us',
  // Content-rich pages
  'services', 'pricing', 'prices', 'rates', 'specials', 'promotions',
  'offers', 'deals', 'coupons', 'discounts',
  'locations', 'location', 'find-us', 'directions',
  'faq', 'frequently-asked', 'help', 'tips',
  'contact', 'contact-us',
  'blog', 'news', 'articles',
  'reviews', 'testimonials',
  'climate-controlled', 'rv-storage', 'boat-storage', 'vehicle-storage',
  'moving', 'packing', 'supplies',
]

// Determine if a link is worth crawling
function isWorthCrawling(href, baseOrigin) {
  if (!href) return false
  try {
    const url = new URL(href)
    // Must be same origin
    if (url.origin !== baseOrigin) return false
    // Skip non-HTML resources
    if (/\.(pdf|zip|doc|xls|csv|mp4|mp3|avi|mov)$/i.test(url.pathname)) return false
    // Skip anchors, mailto, tel
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
    // Skip common junk pages
    if (/\/(wp-admin|wp-login|cart|checkout|account|login|signup|feed|rss|xmlrpc)/i.test(url.pathname)) return false
    return true
  } catch {
    return false
  }
}

// Score a URL by how likely it is to contain useful images
function pageScore(href) {
  const lower = href.toLowerCase()
  for (const kw of PRIORITY_PAGE_KEYWORDS) {
    if (lower.includes(kw)) return 10
  }
  // Home page is decent
  try {
    const url = new URL(href)
    if (url.pathname === '/' || url.pathname === '') return 5
  } catch {}
  return 1
}

// Fetch a single page and extract everything useful
async function scrapePage(pageUrl, imageSet) {
  const result = { images: [], videos: [], links: [], meta: null, contact: null, structuredData: [], headings: [], address: null, hours: null, pageCopy: [], services: [], promotions: [] }

  try {
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return result
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) return result

    const html = await response.text()
    const $ = cheerio.load(html)
    const baseUrl = new URL(pageUrl).origin

    // Meta (only from first page usually, but collect anyway)
    result.meta = {
      title: $('title').first().text().trim() || null,
      description: $('meta[name="description"]').attr('content')?.trim() ||
                   $('meta[property="og:description"]').attr('content')?.trim() || null,
      ogImage: $('meta[property="og:image"]').attr('content')?.trim() || null,
      ogTitle: $('meta[property="og:title"]').attr('content')?.trim() || null,
    }

    // OG image
    if (result.meta.ogImage) {
      const resolved = resolveUrl(baseUrl, result.meta.ogImage)
      if (resolved && !imageSet.has(resolved) && isUsefulImage(resolved)) {
        imageSet.add(resolved)
        result.images.push({ url: resolved, alt: result.meta.ogTitle || '', source: 'og_image', page: pageUrl })
      }
    }

    // All img tags
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('data-original')
      const width = parseInt($(el).attr('width') || '0')
      const height = parseInt($(el).attr('height') || '0')
      const alt = $(el).attr('alt') || ''
      if (!isUsefulImage(src, width, height)) return
      const resolved = resolveUrl(baseUrl, src)
      if (resolved && !imageSet.has(resolved)) {
        imageSet.add(resolved)
        result.images.push({ url: resolved, alt, source: 'img_tag', page: pageUrl, width: width || null, height: height || null })
      }
    })

    // Background images
    $('[style*="background"]').each((_, el) => {
      const style = $(el).attr('style') || ''
      const matches = style.matchAll(/url\(['"]?([^'")\s]+)['"]?\)/g)
      for (const match of matches) {
        const resolved = resolveUrl(baseUrl, match[1])
        if (resolved && !imageSet.has(resolved) && isUsefulImage(resolved)) {
          imageSet.add(resolved)
          result.images.push({ url: resolved, alt: '', source: 'background', page: pageUrl })
        }
      }
    })

    // Srcset — get largest variant
    $('img[srcset], source[srcset]').each((_, el) => {
      const srcset = $(el).attr('srcset') || ''
      const entries = srcset.split(',').map(s => s.trim()).filter(Boolean)
      if (entries.length) {
        // Sort by width descriptor to get largest
        const sorted = entries.map(e => {
          const parts = e.split(/\s+/)
          return { url: parts[0], w: parseInt(parts[1]) || 0 }
        }).sort((a, b) => b.w - a.w)

        const best = sorted[0]
        const resolved = resolveUrl(baseUrl, best.url)
        if (resolved && !imageSet.has(resolved) && isUsefulImage(resolved)) {
          imageSet.add(resolved)
          result.images.push({ url: resolved, alt: '', source: 'srcset', page: pageUrl })
        }
      }
    })

    // Picture elements (modern responsive images)
    $('picture source[srcset]').each((_, el) => {
      const srcset = $(el).attr('srcset') || ''
      const firstUrl = srcset.split(',')[0]?.trim().split(/\s+/)[0]
      if (firstUrl) {
        const resolved = resolveUrl(baseUrl, firstUrl)
        if (resolved && !imageSet.has(resolved) && isUsefulImage(resolved)) {
          imageSet.add(resolved)
          result.images.push({ url: resolved, alt: '', source: 'picture', page: pageUrl })
        }
      }
    })

    // CSS-referenced images in inline <style> blocks
    $('style').each((_, el) => {
      const css = $(el).html() || ''
      const matches = css.matchAll(/url\(['"]?([^'")\s]+\.(jpg|jpeg|png|webp)[^'")\s]*)['"]?\)/gi)
      for (const match of matches) {
        const resolved = resolveUrl(baseUrl, match[1])
        if (resolved && !imageSet.has(resolved) && isUsefulImage(resolved)) {
          imageSet.add(resolved)
          result.images.push({ url: resolved, alt: '', source: 'css', page: pageUrl })
        }
      }
    })

    // Videos
    $('video source, video[src]').each((_, el) => {
      const src = $(el).attr('src')
      if (src) {
        const resolved = resolveUrl(baseUrl, src)
        if (resolved) result.videos.push({ url: resolved, type: $(el).attr('type') || 'video/mp4' })
      }
    })

    // YouTube/Vimeo embeds
    $('iframe[src]').each((_, el) => {
      const src = $(el).attr('src') || ''
      if (src.includes('youtube.com') || src.includes('youtu.be') || src.includes('vimeo.com')) {
        result.videos.push({ url: src, type: 'embed' })
      }
    })

    // Structured data
    $('script[type="application/ld+json"]').each((_, el) => {
      try { result.structuredData.push(JSON.parse($(el).html())) } catch {}
    })

    // Contact info
    const bodyText = $('body').text()
    result.contact = {
      phones: [...new Set((bodyText.match(/(?:\+1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g) || []))].slice(0, 5),
      emails: [...new Set((bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []))].filter(e => !e.includes('sentry') && !e.includes('webpack')).slice(0, 5),
    }

    // Address from structured data
    for (const sd of result.structuredData) {
      const addr = sd.address || sd?.['@graph']?.find?.(n => n.address)?.address
      if (addr) {
        result.address = typeof addr === 'string' ? addr : [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode].filter(Boolean).join(', ')
        break
      }
    }

    // Hours from structured data
    for (const sd of result.structuredData) {
      const oh = sd.openingHoursSpecification || sd?.['@graph']?.find?.(n => n.openingHoursSpecification)?.openingHoursSpecification
      if (oh) { result.hours = oh; break }
    }

    // Headings
    $('h1, h2, h3').each((_, el) => {
      const t = $(el).text().trim()
      if (t && t.length < 200) result.headings.push(t)
    })

    // Page copy — extract meaningful paragraph and list text
    const copySelectors = 'p, li, .description, .content, .text, .service-item, .feature-item, [class*="description"], [class*="content"]'
    $(copySelectors).each((_, el) => {
      const t = $(el).text().trim()
      if (t && t.length > 30 && t.length < 500 && !/cookie|privacy|copyright|©|all rights/i.test(t)) {
        result.pageCopy.push(t)
      }
    })

    // Services — look for service/feature descriptions
    $('[class*="service"], [class*="feature"], [class*="amenit"], [class*="benefit"]').each((_, el) => {
      const heading = $(el).find('h2, h3, h4, strong').first().text().trim()
      const desc = $(el).find('p').first().text().trim()
      if (heading || desc) result.services.push({ heading: heading || null, description: desc || null, page: pageUrl })
    })

    // Promotions / specials
    $('[class*="promo"], [class*="special"], [class*="offer"], [class*="deal"], [class*="coupon"], [class*="discount"], [class*="banner"]').each((_, el) => {
      const t = $(el).text().trim()
      if (t && t.length > 10 && t.length < 300) result.promotions.push({ text: t, page: pageUrl })
    })

    // Internal links — for crawling more pages
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')
      const resolved = resolveUrl(baseUrl, href)
      if (resolved && isWorthCrawling(resolved, baseUrl)) {
        result.links.push(resolved)
      }
    })

  } catch (err) {
    console.error(`Failed to scrape ${pageUrl}:`, err.message)
  }

  return result
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { url, facilityId } = req.body || {}
  if (!url?.trim()) return res.status(400).json({ error: 'url is required' })

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
    const imageSet = new Set()
    const allImages = []
    const allVideos = []
    const allHeadings = []
    const allStructuredData = []
    const allPageCopy = []
    const allServices = []
    const allPromotions = []
    let bestMeta = null
    let bestContact = null
    let bestAddress = null
    let bestHours = null
    const pagesScraped = []

    function mergePageResult(r, pageUrl) {
      pagesScraped.push(pageUrl)
      allImages.push(...r.images)
      allVideos.push(...r.videos)
      allHeadings.push(...r.headings)
      allStructuredData.push(...r.structuredData)
      allPageCopy.push(...(r.pageCopy || []))
      allServices.push(...(r.services || []))
      allPromotions.push(...(r.promotions || []))
      if (r.contact) {
        if (!bestContact) bestContact = r.contact
        else {
          bestContact.phones = [...new Set([...bestContact.phones, ...r.contact.phones])].slice(0, 5)
          bestContact.emails = [...new Set([...bestContact.emails, ...r.contact.emails])].slice(0, 5)
        }
      }
      if (r.address && !bestAddress) bestAddress = r.address
      if (r.hours && !bestHours) bestHours = r.hours
    }

    // Step 1: Scrape the homepage
    const homeResult = await scrapePage(targetUrl.href, imageSet)
    mergePageResult(homeResult, targetUrl.href)
    bestMeta = homeResult.meta

    // Step 2: Discover and score internal links
    const discoveredLinks = [...new Set(homeResult.links)]
      .filter(link => !pagesScraped.includes(link))
      .map(link => ({ url: link, score: pageScore(link) }))
      .sort((a, b) => b.score - a.score)

    // Step 3: Crawl up to 15 pages (prioritize gallery/units/about/services/pricing)
    const maxPages = 15
    const pagesToCrawl = discoveredLinks.slice(0, maxPages)

    // Crawl in batches of 4 for speed
    for (let i = 0; i < pagesToCrawl.length; i += 4) {
      const batch = pagesToCrawl.slice(i, i + 4)
      const results = await Promise.all(batch.map(p => scrapePage(p.url, imageSet)))

      for (let j = 0; j < results.length; j++) {
        const r = results[j]
        mergePageResult(r, batch[j].url)

        // If this page found more links, add high-priority ones we haven't seen
        for (const link of r.links) {
          if (!pagesScraped.includes(link) && !pagesToCrawl.some(p => p.url === link)) {
            const score = pageScore(link)
            if (score >= 10 && pagesToCrawl.length < maxPages + 5) {
              pagesToCrawl.push({ url: link, score })
            }
          }
        }
      }
    }

    // Deduplicate page copy
    const uniqueCopy = [...new Set(allPageCopy)].slice(0, 50)

    const result = {
      scraped: true,
      url: targetUrl.href,
      pagesScraped: pagesScraped.length,
      pagesCrawled: pagesScraped,
      meta: bestMeta,
      images: allImages.slice(0, 50),
      videos: [...new Map(allVideos.map(v => [v.url, v])).values()],
      contact: bestContact,
      address: bestAddress,
      hours: bestHours,
      structuredData: allStructuredData.slice(0, 5),
      headings: [...new Set(allHeadings)].slice(0, 30),
      pageCopy: uniqueCopy,
      services: allServices.slice(0, 20),
      promotions: [...new Map(allPromotions.map(p => [p.text, p])).values()].slice(0, 10),
    }

    // Save scraped images as assets
    if (facilityId && allImages.length > 0) {
      try {
        for (const img of allImages.slice(0, 25)) {
          await query(
            `INSERT INTO assets (facility_id, type, source, url, metadata)
             VALUES ($1, 'photo', 'website_scrape', $2, $3)
             ON CONFLICT DO NOTHING`,
            [facilityId, img.url, JSON.stringify({ alt: img.alt, scrapeSource: img.source, scrapedFrom: img.page || targetUrl.href })]
          )
        }
      } catch (err) {
        console.error('Failed to save scraped assets:', err.message)
      }
    }

    // Update facility with scraped data
    if (facilityId && (bestAddress || bestContact?.phones.length || bestContact?.emails.length)) {
      try {
        const updates = []
        const params = []
        let idx = 1

        if (bestAddress && !await hasField(facilityId, 'google_address')) {
          updates.push(`google_address = $${idx++}`)
          params.push(bestAddress)
        }
        if (bestContact?.phones.length && !await hasField(facilityId, 'google_phone')) {
          updates.push(`google_phone = $${idx++}`)
          params.push(bestContact.phones[0])
        }
        updates.push(`website = COALESCE(website, $${idx++})`)
        params.push(targetUrl.origin)

        if (bestHours) {
          updates.push(`hours = COALESCE(hours, $${idx++})`)
          params.push(JSON.stringify(bestHours))
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

async function hasField(facilityId, field) {
  const rows = await query(`SELECT ${field} FROM facilities WHERE id = $1`, [facilityId])
  return rows.length > 0 && rows[0][field]
}
