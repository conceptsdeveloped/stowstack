import { query } from './_db.js'

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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return req.headers['x-admin-key'] === ADMIN_KEY
}

const VALID_SECTION_TYPES = [
  'hero', 'trust_bar', 'features', 'unit_types', 'gallery',
  'testimonials', 'faq', 'cta', 'location_map',
]

const VALID_STATUSES = ['draft', 'published', 'archived']

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    if (req.method === 'GET') return await handleGet(req, res)
    if (req.method === 'POST') return await handlePost(req, res)
    if (req.method === 'PATCH') return await handlePatch(req, res)
    if (req.method === 'DELETE') return await handleDelete(req, res)
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('landing-pages error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(req, res) {
  const { facilityId, slug, id } = req.query || {}

  // Public: fetch published page by slug (no auth needed)
  if (slug) {
    const isAdmin = checkAuth(req)
    const statusFilter = isAdmin ? '' : "AND lp.status = 'published'"
    const pages = await query(
      `SELECT lp.* FROM landing_pages lp WHERE lp.slug = $1 ${statusFilter} LIMIT 1`,
      [slug]
    )
    if (pages.length === 0) return res.status(404).json({ error: 'Landing page not found' })

    const page = pages[0]
    const sections = await query(
      `SELECT id, section_type, sort_order, config FROM landing_page_sections
       WHERE landing_page_id = $1 ORDER BY sort_order`,
      [page.id]
    )

    // Inherit org branding if facility belongs to an organization
    let orgBranding = null
    const orgRows = await query(
      `SELECT o.name, o.logo_url, o.primary_color, o.accent_color, o.white_label
       FROM organizations o
       JOIN facilities f ON f.organization_id = o.id
       WHERE f.id = $1 AND o.status = 'active'`,
      [page.facility_id]
    )
    if (orgRows.length > 0) {
      const org = orgRows[0]
      orgBranding = {
        orgName: org.name,
        logoUrl: org.logo_url,
        primaryColor: org.primary_color,
        accentColor: org.accent_color,
        whiteLabel: org.white_label,
      }
      // Apply org colors as fallback if page has no theme
      if (!page.theme || (!page.theme.primaryColor && org.primary_color)) {
        page.theme = {
          ...page.theme,
          primaryColor: page.theme?.primaryColor || org.primary_color,
          accentColor: page.theme?.accentColor || org.accent_color,
        }
      }
    }

    return res.json({ success: true, data: { ...page, sections, orgBranding } })
  }

  // Admin: fetch by id
  if (id) {
    if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })
    const pages = await query(`SELECT * FROM landing_pages WHERE id = $1 LIMIT 1`, [id])
    if (pages.length === 0) return res.status(404).json({ error: 'Landing page not found' })

    const page = pages[0]
    const sections = await query(
      `SELECT id, section_type, sort_order, config FROM landing_page_sections
       WHERE landing_page_id = $1 ORDER BY sort_order`,
      [page.id]
    )
    return res.json({ success: true, data: { ...page, sections } })
  }

  // Admin: list pages for a facility
  if (facilityId) {
    if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })
    const pages = await query(
      `SELECT id, facility_id, slug, title, status, variation_ids, meta_title,
              created_at, updated_at, published_at
       FROM landing_pages WHERE facility_id = $1 ORDER BY created_at DESC`,
      [facilityId]
    )
    return res.json({ success: true, data: pages })
  }

  return res.status(400).json({ error: 'Missing facilityId, slug, or id parameter' })
}

async function handlePost(req, res) {
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { facilityId, title, slug, sections, metaTitle, metaDescription, ogImageUrl, theme, storedgeWidgetUrl, variationIds, cloneFrom } = req.body

  // Clone existing page
  if (cloneFrom) {
    const srcPages = await query(`SELECT * FROM landing_pages WHERE id = $1`, [cloneFrom])
    if (srcPages.length === 0) return res.status(404).json({ error: 'Source page not found' })
    const src = srcPages[0]

    // Generate unique slug
    let newSlug = src.slug + '-copy'
    let attempt = 0
    while (true) {
      const exists = await query(`SELECT id FROM landing_pages WHERE slug = $1`, [newSlug])
      if (exists.length === 0) break
      attempt++
      newSlug = src.slug + '-copy-' + attempt
    }

    const cloned = await query(
      `INSERT INTO landing_pages (facility_id, slug, title, meta_title, meta_description, og_image_url, theme, storedge_widget_url, variation_ids)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [src.facility_id, newSlug, src.title + ' (Copy)', src.meta_title, src.meta_description, src.og_image_url, src.theme || {}, src.storedge_widget_url, null]
    )
    const newPage = cloned[0]

    // Copy sections
    const srcSections = await query(
      `SELECT section_type, sort_order, config FROM landing_page_sections WHERE landing_page_id = $1 ORDER BY sort_order`,
      [cloneFrom]
    )
    for (const s of srcSections) {
      await query(
        `INSERT INTO landing_page_sections (landing_page_id, sort_order, section_type, config) VALUES ($1, $2, $3, $4)`,
        [newPage.id, s.sort_order, s.section_type, s.config]
      )
    }

    const newSections = await query(
      `SELECT id, section_type, sort_order, config FROM landing_page_sections WHERE landing_page_id = $1 ORDER BY sort_order`,
      [newPage.id]
    )
    return res.status(201).json({ success: true, data: { ...newPage, sections: newSections } })
  }

  // Validate required fields
  const errors = {}
  if (!facilityId) errors.facilityId = 'Required'
  if (!title || !title.trim()) errors.title = 'Required'
  if (!slug || !slug.trim()) errors.slug = 'Required'
  if (slug && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length > 1) {
    errors.slug = 'Must be lowercase letters, numbers, and hyphens only'
  }
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Validation failed', fields: errors })
  }

  // Check slug uniqueness
  const existing = await query(`SELECT id FROM landing_pages WHERE slug = $1`, [slug])
  if (existing.length > 0) {
    return res.status(409).json({ error: 'Slug already taken', fields: { slug: 'This URL is already in use' } })
  }

  // Validate sections
  if (sections && Array.isArray(sections)) {
    for (const s of sections) {
      if (!VALID_SECTION_TYPES.includes(s.sectionType)) {
        return res.status(400).json({ error: `Invalid section type: ${s.sectionType}` })
      }
    }
  }

  // Insert landing page
  const pageRows = await query(
    `INSERT INTO landing_pages (facility_id, slug, title, meta_title, meta_description, og_image_url, theme, storedge_widget_url, variation_ids)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [facilityId, slug, title.trim(), metaTitle || null, metaDescription || null, ogImageUrl || null, theme || {}, storedgeWidgetUrl || null, variationIds || null]
  )
  const page = pageRows[0]

  // Insert sections
  if (sections && Array.isArray(sections) && sections.length > 0) {
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i]
      await query(
        `INSERT INTO landing_page_sections (landing_page_id, sort_order, section_type, config)
         VALUES ($1, $2, $3, $4)`,
        [page.id, s.sortOrder ?? i, s.sectionType, s.config || {}]
      )
    }
  }

  const insertedSections = await query(
    `SELECT id, section_type, sort_order, config FROM landing_page_sections
     WHERE landing_page_id = $1 ORDER BY sort_order`,
    [page.id]
  )

  return res.status(201).json({ success: true, data: { ...page, sections: insertedSections } })
}

async function handlePatch(req, res) {
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.query || {}
  if (!id) return res.status(400).json({ error: 'Missing id parameter' })

  const existing = await query(`SELECT * FROM landing_pages WHERE id = $1`, [id])
  if (existing.length === 0) return res.status(404).json({ error: 'Landing page not found' })

  const { title, slug, status, sections, metaTitle, metaDescription, ogImageUrl, theme, storedgeWidgetUrl, variationIds } = req.body

  // Validate slug uniqueness if changing
  if (slug && slug !== existing[0].slug) {
    const taken = await query(`SELECT id FROM landing_pages WHERE slug = $1 AND id != $2`, [slug, id])
    if (taken.length > 0) {
      return res.status(409).json({ error: 'Slug already taken', fields: { slug: 'This URL is already in use' } })
    }
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status: ${status}` })
  }

  // Build update
  const updates = []
  const params = []
  let paramIdx = 1

  if (title !== undefined) { updates.push(`title = $${paramIdx++}`); params.push(title.trim()) }
  if (slug !== undefined) { updates.push(`slug = $${paramIdx++}`); params.push(slug) }
  if (status !== undefined) {
    updates.push(`status = $${paramIdx++}`); params.push(status)
    if (status === 'published') { updates.push(`published_at = NOW()`) }
  }
  if (metaTitle !== undefined) { updates.push(`meta_title = $${paramIdx++}`); params.push(metaTitle) }
  if (metaDescription !== undefined) { updates.push(`meta_description = $${paramIdx++}`); params.push(metaDescription) }
  if (ogImageUrl !== undefined) { updates.push(`og_image_url = $${paramIdx++}`); params.push(ogImageUrl) }
  if (theme !== undefined) { updates.push(`theme = $${paramIdx++}`); params.push(theme) }
  if (storedgeWidgetUrl !== undefined) { updates.push(`storedge_widget_url = $${paramIdx++}`); params.push(storedgeWidgetUrl) }
  if (variationIds !== undefined) { updates.push(`variation_ids = $${paramIdx++}`); params.push(variationIds) }

  if (updates.length > 0) {
    updates.push('updated_at = NOW()')
    params.push(id)
    await query(
      `UPDATE landing_pages SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
      params
    )
  }

  // Replace sections if provided
  if (sections && Array.isArray(sections)) {
    await query(`DELETE FROM landing_page_sections WHERE landing_page_id = $1`, [id])
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i]
      if (!VALID_SECTION_TYPES.includes(s.sectionType)) {
        return res.status(400).json({ error: `Invalid section type: ${s.sectionType}` })
      }
      await query(
        `INSERT INTO landing_page_sections (landing_page_id, sort_order, section_type, config)
         VALUES ($1, $2, $3, $4)`,
        [id, s.sortOrder ?? i, s.sectionType, s.config || {}]
      )
    }
  }

  // Return updated page
  const updatedPage = await query(`SELECT * FROM landing_pages WHERE id = $1`, [id])
  const updatedSections = await query(
    `SELECT id, section_type, sort_order, config FROM landing_page_sections
     WHERE landing_page_id = $1 ORDER BY sort_order`,
    [id]
  )

  return res.json({ success: true, data: { ...updatedPage[0], sections: updatedSections } })
}

async function handleDelete(req, res) {
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.query || {}
  if (!id) return res.status(400).json({ error: 'Missing id parameter' })

  const existing = await query(`SELECT id FROM landing_pages WHERE id = $1`, [id])
  if (existing.length === 0) return res.status(404).json({ error: 'Landing page not found' })

  // Sections cascade-delete via FK
  await query(`DELETE FROM landing_pages WHERE id = $1`, [id])

  return res.json({ success: true })
}
