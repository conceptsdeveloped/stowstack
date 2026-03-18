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

function esc(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Fetch facility data from Google Places API
async function fetchPlacesData(facilityName, location) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return null

  try {
    // Search for the facility
    const searchQuery = `${facilityName} ${location} self storage`
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}`
    )
    const searchData = await searchRes.json()

    if (!searchData.results || searchData.results.length === 0) return null
    const place = searchData.results[0]

    // Get detailed info
    const detailRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,rating,user_ratings_total,opening_hours,website,reviews,photos,url&key=${apiKey}`
    )
    const detailData = await detailRes.json()
    const details = detailData.result || {}

    return {
      placeId: place.place_id,
      name: details.name || facilityName,
      address: details.formatted_address || location,
      phone: details.formatted_phone_number || null,
      rating: details.rating || null,
      reviewCount: details.user_ratings_total || 0,
      website: details.website || null,
      mapsUrl: details.url || null,
      hours: details.opening_hours?.weekday_text || null,
      reviews: (details.reviews || []).slice(0, 5).map(r => ({
        author: r.author_name,
        rating: r.rating,
        text: r.text?.slice(0, 300),
        time: r.relative_time_description,
      })),
      photos: (details.photos || []).slice(0, 5).map((p, i) => ({
        index: i,
        url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${apiKey}`,
        width: p.width,
        height: p.height,
      })),
    }
  } catch (err) {
    console.error('Google Places lookup failed:', err.message)
    return null
  }
}

// Fetch nearby competitors
async function fetchCompetitors(location) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return []

  try {
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(`self storage near ${location}`)}&key=${apiKey}`
    )
    const searchData = await searchRes.json()

    return (searchData.results || []).slice(0, 5).map(p => ({
      name: p.name,
      address: p.formatted_address,
      rating: p.rating || null,
      reviewCount: p.user_ratings_total || 0,
      placeId: p.place_id,
    }))
  } catch (err) {
    console.error('Competitor lookup failed:', err.message)
    return []
  }
}

// Generate audit using Anthropic API
async function generateAuditWithAI(facility, placesData, competitors) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const OCCUPANCY_MID = {
    'below-60': 50, '60-75': 67.5, '75-85': 80, '85-95': 90, 'above-95': 97,
  }
  const UNIT_COUNTS = {
    'under-100': 75, '100-300': 200, '300-500': 400, '500+': 650,
  }

  const occupancy = OCCUPANCY_MID[facility.occupancy_range] || 80
  const totalUnits = UNIT_COUNTS[facility.total_units] || 200
  const vacantUnits = Math.round(totalUnits * (1 - occupancy / 100))
  const monthlyLoss = vacantUnits * 110
  const annualLoss = monthlyLoss * 12

  const prompt = `You are an expert self-storage marketing analyst. Generate a professional facility audit report as JSON.

Facility Data:
- Name: ${facility.name}
- Location: ${facility.location}
- Occupancy: ${facility.occupancy_range} (est. ${occupancy}%)
- Total Units: ${facility.total_units} (est. ${totalUnits})
- Estimated Vacant: ${vacantUnits}
- Primary Issue: ${facility.biggest_issue}
- Google Rating: ${placesData?.rating || 'Unknown'} (${placesData?.reviewCount || 0} reviews)
- Website: ${placesData?.website || 'Unknown'}
${facility.notes ? `- Notes: ${facility.notes}` : ''}

Competitors (within 5 miles):
${competitors.map((c, i) => `${i + 1}. ${c.name} - ${c.rating || 'N/A'} rating (${c.reviewCount} reviews) - ${c.address}`).join('\n') || 'No competitor data available'}

Generate a JSON object with these exact keys:
{
  "facility_summary": {
    "name": string,
    "location": string,
    "occupancy_estimate": number,
    "total_units_estimate": number,
    "vacant_units_estimate": number,
    "google_rating": number or null,
    "review_count": number,
    "website": string or null
  },
  "market_position": {
    "summary": "2-3 sentence market position analysis",
    "competitors": [{ "name": string, "rating": number, "reviews": number, "distance": string, "threat_level": "low"|"medium"|"high" }]
  },
  "digital_presence": {
    "score": number (0-100),
    "grade": "A"|"B"|"C"|"D"|"F",
    "findings": ["finding 1", "finding 2", "finding 3"],
    "summary": "2-3 sentence assessment"
  },
  "revenue_leakage": {
    "monthly_loss": ${monthlyLoss},
    "annual_loss": ${annualLoss},
    "per_unit_monthly": 110,
    "vacancy_rate": ${(100 - occupancy).toFixed(1)},
    "summary": "1-2 sentence revenue impact statement"
  },
  "recommended_actions": [
    { "title": string, "detail": string, "priority": "high"|"medium"|"low", "impact": string, "timeline": string }
  ],
  "stowstack_fit": {
    "score": number (0-100),
    "summary": "2-3 sentences on why StowStack is a good fit for this facility",
    "projected_monthly_spend": number,
    "projected_cost_per_move_in": number,
    "projected_months_to_target": number
  },
  "overall_score": number (0-100),
  "grade": "A"|"B"|"C"|"D"|"F"
}

Important: Use operator vocabulary (occupancy, move-ins, vacancy, unit mix, cost per move-in). Be direct and specific. No fluff. Every recommendation should be actionable. Revenue leakage uses $110/month average unit rate.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Anthropic API error:', res.status, text)
      return null
    }

    const data = await res.json()
    const content = data.content?.[0]?.text
    if (!content) return null

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    return JSON.parse(jsonMatch[0])
  } catch (err) {
    console.error('AI audit generation failed:', err.message)
    return null
  }
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Admin only
  const authErr = requireAdmin(req)
  if (authErr) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const { facilityId } = req.body
    if (!facilityId) return res.status(400).json({ error: 'Missing facilityId' })

    // Get facility data
    const facility = await queryOne('SELECT * FROM facilities WHERE id = $1', [facilityId])
    if (!facility) return res.status(404).json({ error: 'Facility not found' })

    // Step 1: Google Places research
    const placesData = await fetchPlacesData(facility.name, facility.location)

    // Save places data if found
    if (placesData) {
      // Update facility with Google data
      await query(
        `UPDATE facilities SET
          place_id = COALESCE($2, place_id),
          google_address = COALESCE($3, google_address),
          google_phone = COALESCE($4, google_phone),
          google_rating = COALESCE($5, google_rating),
          review_count = COALESCE($6, review_count),
          website = COALESCE($7, website),
          google_maps_url = COALESCE($8, google_maps_url),
          hours = COALESCE($9, hours),
          updated_at = NOW()
        WHERE id = $1`,
        [
          facilityId,
          placesData.placeId,
          placesData.address,
          placesData.phone,
          placesData.rating,
          placesData.reviewCount,
          placesData.website,
          placesData.mapsUrl,
          placesData.hours ? JSON.stringify(placesData.hours) : null,
        ]
      )

      // Save places data snapshot
      await query(
        `INSERT INTO places_data (facility_id, photos, reviews)
         VALUES ($1, $2, $3)
         ON CONFLICT (facility_id) DO UPDATE SET
           photos = EXCLUDED.photos,
           reviews = EXCLUDED.reviews,
           fetched_at = NOW()`,
        [
          facilityId,
          JSON.stringify(placesData.photos),
          JSON.stringify(placesData.reviews),
        ]
      ).catch(() => {
        // If ON CONFLICT doesn't work (no unique constraint), just insert
        query(
          'INSERT INTO places_data (facility_id, photos, reviews) VALUES ($1, $2, $3)',
          [facilityId, JSON.stringify(placesData.photos), JSON.stringify(placesData.reviews)]
        ).catch(() => {})
      })
    }

    // Step 2: Fetch competitors
    const competitors = await fetchCompetitors(facility.location)

    // Step 3: Generate audit with AI
    const auditJson = await generateAuditWithAI(facility, placesData, competitors)

    if (!auditJson) {
      return res.status(500).json({ error: 'Failed to generate audit. Check API keys.' })
    }

    // Step 4: Save audit
    const auditRow = await query(
      `INSERT INTO audits (facility_id, audit_json, overall_score, grade)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [facilityId, JSON.stringify(auditJson), auditJson.overall_score || 0, auditJson.grade || 'C']
    )

    // Update facility pipeline status
    await query(
      `UPDATE facilities SET status = 'scraped', pipeline_status = 'audit_generated', updated_at = NOW() WHERE id = $1`,
      [facilityId]
    )

    // Log activity
    query(
      'INSERT INTO activity_log (type, facility_id, facility_name, detail) VALUES ($1, $2, $3, $4)',
      ['audit_generated', facilityId, facility.name, `Auto-generated audit for ${facility.name} — Score: ${auditJson.overall_score}`]
    ).catch(() => {})

    // Step 5: Email Blake for review
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: 'StowStack <notifications@stowstack.co>',
          to: (process.env.AUDIT_NOTIFICATION_EMAILS || 'blake@urkovro.resend.app').split(',').map(e => e.trim()),
          subject: `Audit Generated: ${facility.name} — Score ${auditJson.overall_score}/100`,
          html: `
            <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="margin: 0 0 12px; color: #1a1a1a;">Audit Ready for Review</h2>
              <p style="color: #666; margin: 0 0 16px;">An auto-generated audit for <strong>${esc(facility.name)}</strong> is ready for your review.</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666; width: 120px;">Facility</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;"><strong>${esc(facility.name)}</strong></td></tr>
                <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Location</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${esc(facility.location)}</td></tr>
                <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Score</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;"><strong>${auditJson.overall_score}/100 (${auditJson.grade})</strong></td></tr>
                <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Revenue Leakage</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #dc2626;"><strong>$${auditJson.revenue_leakage?.annual_loss?.toLocaleString() || 'N/A'}/yr</strong></td></tr>
                <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Google Rating</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${placesData?.rating || 'N/A'} (${placesData?.reviewCount || 0} reviews)</td></tr>
              </table>
              <p style="margin-top: 20px;">
                <a href="https://stowstack.co/admin" style="display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Review in Dashboard</a>
              </p>
              <p style="margin-top: 16px; font-size: 12px; color: #999;">After review, approve the audit to share it with the lead and send the Calendly link.</p>
            </div>`,
        }),
      }).catch(err => console.error('Audit email error:', err.message))
    }

    return res.json({
      success: true,
      auditId: auditRow[0].id,
      audit: auditJson,
      placesData: placesData ? {
        rating: placesData.rating,
        reviewCount: placesData.reviewCount,
        website: placesData.website,
        address: placesData.address,
      } : null,
      competitorCount: competitors.length,
    })
  } catch (err) {
    console.error('audit-generate error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
