import { query } from './_db.js'

const ALLOWED_ORIGINS = [
  'https://stowstack.co',
  'https://www.stowstack.co',
  'http://localhost:5173',
  'http://localhost:3000',
]

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { c } = req.query
  if (!c) return res.redirect(302, 'https://stowstack.co')

  try {
    const rows = await query(
      `UPDATE utm_links
       SET click_count = click_count + 1, last_clicked_at = NOW()
       WHERE short_code = $1
       RETURNING *`,
      [c]
    )

    if (!rows.length) return res.redirect(302, 'https://stowstack.co')

    const link = rows[0]

    // Build destination URL
    let destination = 'https://stowstack.co'

    if (link.landing_page_id) {
      const lp = await query(`SELECT slug FROM landing_pages WHERE id = $1`, [link.landing_page_id])
      if (lp.length) {
        destination = `https://stowstack.co/lp/${lp[0].slug}`
      }
    }

    // Append UTM params
    const params = new URLSearchParams()
    if (link.utm_source) params.set('utm_source', link.utm_source)
    if (link.utm_medium) params.set('utm_medium', link.utm_medium)
    if (link.utm_campaign) params.set('utm_campaign', link.utm_campaign)
    if (link.utm_content) params.set('utm_content', link.utm_content)
    if (link.utm_term) params.set('utm_term', link.utm_term)

    const qs = params.toString()
    const finalUrl = qs ? `${destination}?${qs}` : destination

    return res.redirect(302, finalUrl)
  } catch (err) {
    console.error('redirect error:', err.message)
    return res.redirect(302, 'https://stowstack.co')
  }
}
