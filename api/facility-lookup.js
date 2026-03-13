import { query } from './_db.js'

const ALLOWED_ORIGINS = [
  'https://stowstack.co',
  'https://www.stowstack.co',
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsHeaders(req) {
  const origin = req.headers['origin'] || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ''
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

// Search for a place and return its place_id
async function findPlaceId(facilityName, location, apiKey) {
  const searchQuery = encodeURIComponent(`${facilityName} ${location}`)
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${searchQuery}&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Places text search failed: ${res.status}`)
  const data = await res.json()
  if (!data.results?.length) {
    throw new Error(`Places API returned: ${data.status}${data.error_message ? ' — ' + data.error_message : ''}`)
  }
  return data.results[0].place_id
}

// Get full place details including photos, reviews, website, etc.
async function getPlaceDetails(placeId, apiKey) {
  const fields = [
    'name',
    'formatted_address',
    'formatted_phone_number',
    'website',
    'rating',
    'user_ratings_total',
    'reviews',
    'photos',
    'opening_hours',
    'business_status',
    'url',
  ].join(',')

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Place details failed: ${res.status}`)
  const data = await res.json()
  return data.result
}

// Build a photo URL from a photo reference (max 1200px wide for ad quality)
function buildPhotoUrl(photoReference, apiKey, maxWidth = 1200) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req)
  Object.entries(cors).forEach(([key, value]) => res.setHeader(key, value))

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: missing Google API key' })
  }

  const { facilityName, location, facilityId } = req.body || {}

  if (!facilityName?.trim() || !location?.trim()) {
    return res.status(400).json({ error: 'facilityName and location are required' })
  }

  try {
    // Step 1: Find the place
    const placeId = await findPlaceId(facilityName.trim(), location.trim(), apiKey)

    if (!placeId) {
      return res.status(200).json({
        found: false,
        message: 'No matching facility found on Google Maps',
        _debug: { query: `${facilityName} ${location}` },
      })
    }

    // Step 2: Get full details
    const place = await getPlaceDetails(placeId, apiKey)

    // Step 3: Build photo URLs (up to 10 photos)
    const photos = (place.photos || []).slice(0, 10).map((photo, i) => ({
      index: i,
      url: buildPhotoUrl(photo.photo_reference, apiKey),
      width: photo.width,
      height: photo.height,
      attribution: photo.html_attributions?.[0] || null,
    }))

    // Step 4: Extract top reviews (up to 5, English only if available)
    const reviews = (place.reviews || [])
      .filter((r) => r.rating >= 3) // skip low reviews for ad use
      .slice(0, 5)
      .map((r) => ({
        author: r.author_name,
        rating: r.rating,
        text: r.text,
        time: r.relative_time_description,
      }))

    const result = {
      found: true,
      placeId,
      name: place.name,
      address: place.formatted_address,
      phone: place.formatted_phone_number || null,
      website: place.website || null,
      googleMapsUrl: place.url || null,
      rating: place.rating || null,
      reviewCount: place.user_ratings_total || 0,
      businessStatus: place.business_status || null,
      hours: place.opening_hours?.weekday_text || null,
      photos,
      reviews,
    }

    // Persist Places data and update facility record if we have a facilityId
    if (facilityId) {
      await Promise.all([
        query(
          `UPDATE facilities SET
            place_id = $1, google_address = $2, google_phone = $3,
            website = $4, google_rating = $5, review_count = $6,
            google_maps_url = $7, hours = $8, status = 'scraped'
           WHERE id = $9`,
          [
            placeId,
            place.formatted_address,
            place.formatted_phone_number || null,
            place.website || null,
            place.rating || null,
            place.user_ratings_total || 0,
            place.url || null,
            JSON.stringify(place.opening_hours?.weekday_text || null),
            facilityId,
          ]
        ),
        query(
          `INSERT INTO places_data (facility_id, photos, reviews)
           VALUES ($1, $2, $3)`,
          [facilityId, JSON.stringify(photos), JSON.stringify(reviews)]
        ),
      ]).catch((err) => console.error('DB save for places data failed:', err.message))
    }

    return res.status(200).json(result)
  } catch (err) {
    console.error('Facility lookup failed:', err.message)
    return res.status(500).json({ error: 'Facility lookup failed', details: err.message, _debug: { facilityName, location } })
  }
}
