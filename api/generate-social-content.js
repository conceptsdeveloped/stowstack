/**
 * AI-Powered Social Media Content Generator
 *
 * POST /api/generate-social-content
 * Body: { facilityId, platforms, count, timeframeDays, postTypes, tone }
 *
 * Uses Claude to generate batches of social posts with facility context.
 * Saves generated posts to social_posts table as drafts.
 *
 * Does NOT modify any existing tables or endpoints.
 */
import Anthropic from '@anthropic-ai/sdk'
import { query, queryOne } from './_db.js'
import { requireAdmin } from './_auth.js'

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

const anthropic = new Anthropic()

/* ── Storage-specific seasonal events ── */
const SEASONAL_EVENTS = [
  { month: 1, event: 'New Year Declutter', tip: 'Start fresh — get the clutter out of your house and into storage' },
  { month: 3, event: 'Spring Cleaning', tip: 'Spring cleaning means clearing out. Storage makes it easy.' },
  { month: 4, event: 'Tax Season', tip: 'Business owners: secure document storage for tax records' },
  { month: 5, event: 'Moving Season Starts', tip: 'Moving? Store the overflow while you settle in.' },
  { month: 6, event: 'Summer Moving Peak', tip: 'Peak moving season — reserve your unit before they fill up' },
  { month: 8, event: 'College Move-In', tip: 'Students: store your stuff between semesters' },
  { month: 9, event: 'Back to School', tip: 'Downsizing the kids\' rooms? We\'ve got space.' },
  { month: 10, event: 'Fall Transition', tip: 'Swap out summer gear for fall — storage keeps it organized' },
  { month: 11, event: 'Holiday Prep', tip: 'Make room for holiday guests — store the extras' },
  { month: 12, event: 'Holiday Storage', tip: 'Decorations, gifts, seasonal items — store it all safely' },
]

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!requireAdmin(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    facilityId,
    platforms = ['facebook', 'instagram', 'gbp'],
    count = 10,
    timeframeDays = 14,
    postTypes = ['promotion', 'tip', 'seasonal', 'community'],
    tone = 'friendly',
  } = req.body

  if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

  try {
    /* ── Gather facility context (read-only from existing tables) ── */
    const [facility, snapshot, units, specials, intel, onboarding] = await Promise.all([
      queryOne(`SELECT * FROM facilities WHERE id = $1`, [facilityId]),
      queryOne(`SELECT * FROM facility_pms_snapshots WHERE facility_id = $1 ORDER BY snapshot_date DESC LIMIT 1`, [facilityId]),
      query(`SELECT * FROM facility_pms_units WHERE facility_id = $1 ORDER BY sqft ASC`, [facilityId]),
      query(`SELECT * FROM facility_pms_specials WHERE facility_id = $1 AND active = true`, [facilityId]),
      queryOne(`SELECT * FROM facility_market_intel WHERE facility_id = $1`, [facilityId]),
      queryOne(`SELECT * FROM client_onboarding WHERE facility_id = $1`, [facilityId]),
    ])

    if (!facility) return res.status(404).json({ error: 'Facility not found' })

    /* ── Build context for Claude ── */
    const occupancyPct = snapshot ? parseFloat(snapshot.occupancy_pct || 0) : null
    const vacantUnits = snapshot ? parseInt(snapshot.total_units || 0) - parseInt(snapshot.occupied_units || 0) : null

    const availableUnits = units
      .filter(u => parseInt(u.occupied_count || 0) < parseInt(u.total_count || 0))
      .map(u => `${u.unit_type} (${u.size_label}): $${u.street_rate}/mo — ${parseInt(u.total_count) - parseInt(u.occupied_count)} available`)
      .join('\n')

    const fullUnits = units
      .filter(u => parseInt(u.occupied_count || 0) >= parseInt(u.total_count || 0))
      .map(u => u.unit_type)
      .join(', ')

    const activePromos = specials
      .map(s => `${s.name}: ${s.description} (${s.discount_type === 'percent' ? s.discount_value + '% off' : s.discount_type === 'months_free' ? s.discount_value + ' months free' : '$' + s.discount_value + ' off'})`)
      .join('\n')

    const onboardingData = onboarding?.data ? (typeof onboarding.data === 'string' ? JSON.parse(onboarding.data) : onboarding.data) : {}
    const facilityDetails = onboardingData?.steps?.facilityDetails?.data || {}
    const adPrefs = onboardingData?.steps?.adPreferences?.data || {}

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const relevantEvents = SEASONAL_EVENTS.filter(e =>
      e.month >= currentMonth && e.month <= currentMonth + 2
    )

    const prompt = `You are a social media manager for a self-storage facility. Generate exactly ${count} social media posts spread across the next ${timeframeDays} days.

FACILITY CONTEXT:
- Name: ${facility.name}
- Location: ${facility.location}
${occupancyPct !== null ? `- Occupancy: ${occupancyPct}% (${vacantUnits} vacant units)` : ''}
${availableUnits ? `- Available units:\n${availableUnits}` : ''}
${fullUnits ? `- FULL (don't promote): ${fullUnits}` : ''}
${activePromos ? `- Active promotions:\n${activePromos}` : '- No current promotions'}
${facilityDetails.brandDescription ? `- Brand description: ${facilityDetails.brandDescription}` : ''}
${facilityDetails.sellingPoints?.length ? `- Key selling points: ${facilityDetails.sellingPoints.join(', ')}` : ''}
${facility.google_phone ? `- Phone: ${facility.google_phone}` : ''}
${facility.website ? `- Website: ${facility.website}` : ''}

TONE: ${tone} (${tone === 'professional' ? 'authoritative, clean, no slang' : tone === 'friendly' ? 'warm, approachable, conversational' : tone === 'urgent' ? 'direct, action-oriented, time-sensitive' : 'polished, high-end feel'})

PLATFORMS TO POST TO: ${platforms.join(', ')}
POST TYPES TO INCLUDE: ${postTypes.join(', ')}

PLATFORM FORMATTING:
- facebook: 150-300 words, conversational, can include links and emojis. No hashtags.
- instagram: 100-200 words, visual-first caption with emojis, add 15-20 relevant hashtags at the END separated by spaces. Include storage, moving, organization, and LOCAL area hashtags.
- gbp: 80-150 words, direct and informative, include a call to action. No hashtags. No emojis.

POST TYPE GUIDELINES:
- promotion: Highlight available units, specials, or seasonal offers. Include specific pricing and unit sizes. Always include a CTA.
- tip: Storage tips, organization advice, packing guides, moving tips. Position the facility as the local expert.
- seasonal: Tie into current season/holiday/event.${relevantEvents.length ? ' Upcoming events: ' + relevantEvents.map(e => e.event).join(', ') : ''}
- community: Local events, neighborhood shoutouts, partnerships. Make the facility feel like a neighbor.
- behind_the_scenes: Facility improvements, security features, cleanliness, staff. Build trust.
- unit_spotlight: Feature a specific available unit type with dimensions, use cases, and pricing.
- testimonial: Simulate a customer success story (e.g., "One of our tenants just told us..."). Keep it authentic.
- holiday: Tie into an upcoming holiday if relevant.

RULES:
- Write like a real person, not a brand. No corporate buzzwords.
- Include specific details (unit sizes, prices, hours, address) when relevant.
- Every promotion post MUST include a specific CTA with a reason to act now.
- NEVER use "state-of-the-art", "premier", "solutions", "utilize". Use "clean", "dry", "secure", "affordable", "easy".
- Mix post types — don't do 3 of the same type in a row.
- Space posts 1-3 days apart across the timeframe.
- Vary platforms — distribute evenly across requested platforms.
- For Instagram, every post needs a suggested image description.

Return a JSON array of objects:
[{
  "platform": "facebook" | "instagram" | "gbp",
  "post_type": "promotion" | "tip" | "seasonal" | etc,
  "content": "The full post text including emojis if appropriate",
  "hashtags": ["#storage", "#moving", ...],
  "suggested_image": "Description of ideal photo to pair with this post",
  "day_offset": 1-${timeframeDays},
  "cta_url": "${facility.website || ''}"
}]

Return ONLY the JSON array, no markdown or explanation.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0]?.text || '[]'
    let posts
    try {
      // Handle potential markdown code block wrapper
      const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
      posts = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse AI response:', text.slice(0, 200))
      return res.status(500).json({ error: 'Failed to parse AI-generated content' })
    }

    if (!Array.isArray(posts) || posts.length === 0) {
      return res.status(500).json({ error: 'AI returned empty or invalid content' })
    }

    /* ── Save posts as drafts ── */
    const batchId = crypto.randomUUID()
    const savedPosts = []

    for (const post of posts) {
      const scheduledDate = new Date(now)
      scheduledDate.setDate(scheduledDate.getDate() + (post.day_offset || 1))
      // Default to 10am local time
      scheduledDate.setHours(10, 0, 0, 0)

      const rows = await query(`
        INSERT INTO social_posts (
          facility_id, platform, post_type, content, hashtags, cta_url,
          status, scheduled_at, ai_generated, batch_id, suggested_image
        ) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, true, $8, $9)
        RETURNING *
      `, [
        facilityId,
        post.platform || 'facebook',
        post.post_type || 'tip',
        post.content,
        post.hashtags || [],
        post.cta_url || null,
        scheduledDate.toISOString(),
        batchId,
        post.suggested_image || null,
      ])

      savedPosts.push(rows[0])
    }

    return res.status(200).json({
      batchId,
      count: savedPosts.length,
      posts: savedPosts,
    })
  } catch (err) {
    console.error('Social content generation error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
