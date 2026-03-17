import { query, queryOne } from './_db.js'
import { requireAdmin } from './_auth.js'

export const config = { maxDuration: 60 }

const ALLOWED_ORIGINS = [
  'https://stowstack.co', 'https://www.stowstack.co',
  'http://localhost:5173', 'http://localhost:3000',
]

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

/** Haversine distance in miles between two lat/lng points */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3958.8 // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Extract zip code from an address string */
function extractZip(address) {
  if (!address) return null
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b/)
  return match ? match[1] : null
}

/** Search Google Places (New) text search */
async function searchPlaces(textQuery, apiKey, maxResults = 10) {
  const fieldMask = 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri,places.location,places.websiteUri'
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify({ textQuery, maxResultCount: maxResults }),
    })
    if (!res.ok) {
      console.error('Places API error:', res.status, await res.text().catch(() => ''))
      return []
    }
    const data = await res.json()
    return data.places || []
  } catch (err) {
    console.error('Places API fetch failed:', err.message)
    return []
  }
}

/** Fetch Census ACS demographics by zip code */
async function fetchCensusDemographics(zip) {
  if (!zip) return null
  const vars = 'B01003_001E,B19013_001E,B25003_002E,B25003_003E,B01002_001E,B25077_001E'
  const url = `https://api.census.gov/data/2022/acs/acs5?get=${vars}&for=zip%20code%20tabulation%20area:${zip}`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.error('Census API error:', res.status)
      return null
    }
    const data = await res.json()
    if (!data || data.length < 2) return null
    const [, values] = data
    const population = parseInt(values[0]) || 0
    const medianIncome = parseInt(values[1]) || 0
    const ownerOccupied = parseInt(values[2]) || 0
    const renterOccupied = parseInt(values[3]) || 0
    const medianAge = parseFloat(values[4]) || 0
    const medianHomeValue = parseInt(values[5]) || 0
    const totalHousing = ownerOccupied + renterOccupied
    const renterPct = totalHousing > 0 ? Math.round((renterOccupied / totalHousing) * 1000) / 10 : 0
    return {
      zip,
      population,
      median_income: medianIncome,
      median_age: medianAge,
      owner_occupied: ownerOccupied,
      renter_occupied: renterOccupied,
      renter_pct: renterPct,
      median_home_value: medianHomeValue,
      source: 'census_acs_2022',
    }
  } catch (err) {
    console.error('Census API fetch failed:', err.message)
    return null
  }
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!requireAdmin(req, res)) return

  // GET — return cached market intel for a facility
  if (req.method === 'GET') {
    const { facilityId } = req.query
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })
    try {
      const intel = await queryOne(
        `SELECT * FROM facility_market_intel WHERE facility_id = $1`, [facilityId]
      )
      return res.status(200).json({ intel: intel || null })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // POST — run a market scan
  if (req.method === 'POST') {
    const { facilityId } = req.body || {}
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY not configured' })

    try {
      // Get facility info
      const facility = await queryOne(`SELECT * FROM facilities WHERE id = $1`, [facilityId])
      if (!facility) return res.status(404).json({ error: 'Facility not found' })

      const address = facility.google_address || facility.location || ''
      const zip = extractZip(address)

      // Run all searches in parallel
      const demandCategories = [
        { query: 'apartment complex', category: 'apartment_complex' },
        { query: 'university', category: 'university' },
        { query: 'military base', category: 'military_base' },
        { query: 'real estate office', category: 'real_estate' },
        { query: 'moving company', category: 'moving_company' },
        { query: 'senior living', category: 'senior_living' },
      ]

      const [competitorResults, ...demandResults] = await Promise.all([
        // Competitors: self storage within 15 miles
        searchPlaces(`self storage near ${address}`, apiKey, 10),
        // Demand drivers: each category within 5 miles
        ...demandCategories.map(cat =>
          searchPlaces(`${cat.query} near ${address}`, apiKey, 5)
        ),
      ])

      // Also fetch census demographics
      const demographics = await fetchCensusDemographics(zip)

      // Get facility lat/lng from Google Places data or from the facility's own place data
      let facilityLat = null, facilityLng = null
      const placesRow = await queryOne(
        `SELECT metadata FROM places_data WHERE facility_id = $1 ORDER BY fetched_at DESC LIMIT 1`, [facilityId]
      ).catch(() => null)

      // Try to get lat/lng from competitor results (facility itself might appear)
      // or from facility's stored data
      if (facility.google_address) {
        // Search for the facility itself to get its coordinates
        const selfResults = await searchPlaces(facility.google_address, apiKey, 1)
        if (selfResults.length && selfResults[0].location) {
          facilityLat = selfResults[0].location.latitude
          facilityLng = selfResults[0].location.longitude
        }
      }

      // Build competitors array
      const competitors = competitorResults
        .filter(p => {
          // Filter out the facility itself
          const pName = (p.displayName?.text || '').toLowerCase()
          const fName = (facility.name || '').toLowerCase()
          return !pName.includes(fName) && !fName.includes(pName)
        })
        .map(p => {
          const lat = p.location?.latitude
          const lng = p.location?.longitude
          let distance_miles = null
          if (facilityLat && facilityLng && lat && lng) {
            distance_miles = Math.round(haversineDistance(facilityLat, facilityLng, lat, lng) * 10) / 10
          }
          return {
            name: p.displayName?.text || 'Unknown',
            address: p.formattedAddress || '',
            rating: p.rating || null,
            reviewCount: p.userRatingCount || 0,
            distance_miles,
            mapsUrl: p.googleMapsUri || null,
            website: p.websiteUri || null,
            source: 'google_places',
          }
        })
        .filter(c => c.distance_miles === null || c.distance_miles <= 15)
        .sort((a, b) => (a.distance_miles ?? 99) - (b.distance_miles ?? 99))

      // Build demand drivers array
      const demand_drivers = []
      demandCategories.forEach((cat, i) => {
        const results = demandResults[i] || []
        results.forEach(p => {
          const lat = p.location?.latitude
          const lng = p.location?.longitude
          let distance_miles = null
          if (facilityLat && facilityLng && lat && lng) {
            distance_miles = Math.round(haversineDistance(facilityLat, facilityLng, lat, lng) * 10) / 10
          }
          // Only include within 5 miles
          if (distance_miles !== null && distance_miles > 5) return
          demand_drivers.push({
            name: p.displayName?.text || 'Unknown',
            category: cat.category,
            address: p.formattedAddress || '',
            distance_miles,
            source: 'google_places',
          })
        })
      })
      demand_drivers.sort((a, b) => (a.distance_miles ?? 99) - (b.distance_miles ?? 99))

      // Upsert into facility_market_intel
      const intel = await queryOne(
        `INSERT INTO facility_market_intel (facility_id, last_scanned, competitors, demand_drivers, demographics)
         VALUES ($1, NOW(), $2, $3, $4)
         ON CONFLICT (facility_id) DO UPDATE SET
           last_scanned = NOW(),
           competitors = $2,
           demand_drivers = $3,
           demographics = $4,
           updated_at = NOW()
         RETURNING *`,
        [facilityId, JSON.stringify(competitors), JSON.stringify(demand_drivers), JSON.stringify(demographics || {})]
      )

      return res.status(200).json({ intel })
    } catch (err) {
      console.error('Market scan failed:', err.message)
      return res.status(500).json({ error: err.message })
    }
  }

  // PATCH — update manual_notes and operator_overrides
  if (req.method === 'PATCH') {
    const { facilityId, manual_notes, operator_overrides } = req.body || {}
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    try {
      // Upsert: create row if it doesn't exist, then update the fields
      const intel = await queryOne(
        `INSERT INTO facility_market_intel (facility_id, manual_notes, operator_overrides)
         VALUES ($1, $2, $3)
         ON CONFLICT (facility_id) DO UPDATE SET
           manual_notes = COALESCE($2, facility_market_intel.manual_notes),
           operator_overrides = COALESCE($3, facility_market_intel.operator_overrides),
           updated_at = NOW()
         RETURNING *`,
        [facilityId, manual_notes ?? null, operator_overrides ? JSON.stringify(operator_overrides) : null]
      )

      return res.status(200).json({ intel })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
