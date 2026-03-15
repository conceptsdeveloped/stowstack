/**
 * Nominatim — Free geocoding via OpenStreetMap
 * Rate limit: 1 request/second (respect usage policy)
 * https://nominatim.org
 *
 * No API key needed. Used for facility location search and "near me" features.
 */

const BASE_URL = 'https://nominatim.openstreetmap.org'
const USER_AGENT = 'StowStack/1.0 (stowstack.co)'

interface NominatimResult {
  place_id: number
  lat: string
  lon: string
  display_name: string
  address: {
    house_number?: string
    road?: string
    city?: string
    town?: string
    village?: string
    state?: string
    postcode?: string
    country?: string
    county?: string
  }
  boundingbox: [string, string, string, string]
  type: string
  importance: number
}

export interface GeocodedLocation {
  lat: number
  lon: number
  displayName: string
  city: string
  state: string
  zip: string
  county: string
}

// ── Rate limiter (1 req/sec) ──
let lastRequest = 0

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now()
  const wait = Math.max(0, 1000 - (now - lastRequest))
  if (wait > 0) {
    await new Promise(resolve => setTimeout(resolve, wait))
  }
  lastRequest = Date.now()

  return fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })
}

function parseResult(r: NominatimResult): GeocodedLocation {
  return {
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    displayName: r.display_name,
    city: r.address.city || r.address.town || r.address.village || '',
    state: r.address.state || '',
    zip: r.address.postcode || '',
    county: r.address.county || '',
  }
}

// ── Forward Geocoding (address → coordinates) ──

export async function geocode(query: string, limit = 5): Promise<GeocodedLocation[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: String(limit),
    countrycodes: 'us',
  })

  const res = await rateLimitedFetch(`${BASE_URL}/search?${params}`)
  if (!res.ok) return []

  const data: NominatimResult[] = await res.json()
  return data.map(parseResult)
}

// ── Reverse Geocoding (coordinates → address) ──

export async function reverseGeocode(lat: number, lon: number): Promise<GeocodedLocation | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'json',
    addressdetails: '1',
  })

  const res = await rateLimitedFetch(`${BASE_URL}/reverse?${params}`)
  if (!res.ok) return null

  const data: NominatimResult = await res.json()
  return parseResult(data)
}

// ── Distance Calculation (Haversine) ──

export function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

// ── "Near Me" Helper ──

export function getUserLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000, // Cache for 5 minutes
    })
  })
}

/**
 * Get facilities sorted by distance from user's current location.
 * Each facility needs { lat, lon } coordinates.
 */
export async function sortByDistance<T extends { lat: number; lon: number }>(
  facilities: T[]
): Promise<(T & { distanceMi: number })[]> {
  const pos = await getUserLocation()
  const userLat = pos.coords.latitude
  const userLon = pos.coords.longitude

  return facilities
    .map(f => ({
      ...f,
      distanceMi: Math.round(distanceMiles(userLat, userLon, f.lat, f.lon) * 10) / 10,
    }))
    .sort((a, b) => a.distanceMi - b.distanceMi)
}
