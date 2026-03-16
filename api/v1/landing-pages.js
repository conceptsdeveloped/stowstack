import { query, queryOne } from '../_db.js'
import { setV1Cors, requireApiAuth, requireScope } from '../_api-auth.js'

export default async function handler(req, res) {
  setV1Cors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const auth = await requireApiAuth(req, res)
  if (!auth) return
  const { apiKey } = auth
  const orgId = apiKey.organization_id

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!requireScope(res, apiKey, 'pages:read')) return

  const { id, facilityId, slug } = req.query

  try {
    // Single page by ID or slug
    if (id || slug) {
      let page
      if (id) {
        page = await queryOne(
          `SELECT lp.id, lp.facility_id, lp.slug, lp.title, lp.status, lp.meta_title,
                  lp.meta_description, lp.og_image_url, lp.storedge_widget_url,
                  lp.created_at, lp.updated_at, lp.published_at
           FROM landing_pages lp
           JOIN facilities f ON f.id = lp.facility_id
           WHERE lp.id = $1 AND f.organization_id = $2`,
          [id, orgId]
        )
      } else {
        page = await queryOne(
          `SELECT lp.id, lp.facility_id, lp.slug, lp.title, lp.status, lp.meta_title,
                  lp.meta_description, lp.og_image_url, lp.storedge_widget_url,
                  lp.created_at, lp.updated_at, lp.published_at
           FROM landing_pages lp
           JOIN facilities f ON f.id = lp.facility_id
           WHERE lp.slug = $1 AND f.organization_id = $2 AND lp.status = 'published'`,
          [slug, orgId]
        )
      }

      if (!page) return res.status(404).json({ error: 'Landing page not found' })

      const sections = await query(
        `SELECT id, section_type, sort_order, config
         FROM landing_page_sections WHERE landing_page_id = $1 ORDER BY sort_order`,
        [page.id]
      )

      // Include UTM links for this page
      const utmLinks = await query(
        `SELECT id, label, utm_source, utm_medium, utm_campaign, utm_content,
                short_code, click_count, last_clicked_at
         FROM utm_links WHERE landing_page_id = $1 ORDER BY created_at DESC`,
        [page.id]
      )

      return res.status(200).json({ page: { ...page, sections, utmLinks } })
    }

    // List by facility
    if (!facilityId) return res.status(400).json({ error: 'facilityId, id, or slug is required' })

    // Verify facility belongs to org
    const facility = await queryOne(
      'SELECT id FROM facilities WHERE id = $1 AND organization_id = $2',
      [facilityId, orgId]
    )
    if (!facility) return res.status(404).json({ error: 'Facility not found' })

    const pages = await query(
      `SELECT id, facility_id, slug, title, status, meta_title,
              created_at, updated_at, published_at
       FROM landing_pages WHERE facility_id = $1 ORDER BY created_at DESC`,
      [facilityId]
    )

    return res.status(200).json({ pages })
  } catch (err) {
    console.error('v1/landing-pages GET failed:', err.message)
    return res.status(500).json({ error: 'Failed to fetch landing pages' })
  }
}
