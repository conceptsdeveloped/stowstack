export const config = { maxDuration: 15 }

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

// Curated self-storage industry search queries organized by category
const STORAGE_QUERIES = {
  exterior: [
    'self storage facility building',
    'storage unit doors row',
    'storage facility entrance gate',
    'storage units outdoor',
    'mini storage building',
  ],
  interior: [
    'storage unit interior clean',
    'climate controlled storage hallway',
    'storage locker organized',
    'warehouse storage shelves boxes',
    'indoor storage units corridor',
  ],
  moving: [
    'people moving boxes',
    'loading moving truck',
    'couple packing cardboard boxes',
    'moving day family',
    'stacking moving boxes',
  ],
  packing: [
    'packing supplies boxes tape',
    'cardboard boxes stacked',
    'packing materials bubble wrap',
    'organized packing boxes labels',
    'moving boxes garage',
  ],
  lifestyle: [
    'cluttered garage storage',
    'garage cleanout organizing',
    'decluttering home',
    'organized garage storage',
    'household overflow storage',
  ],
  vehicle: [
    'rv storage facility',
    'boat storage outdoor',
    'vehicle storage covered',
    'car storage facility',
  ],
}

// Fallback curated images — verified self-storage relevant Unsplash photos
const CURATED_IMAGES = [
  // Storage units and facilities
  { id: 'curated-1', url: 'https://images.unsplash.com/photo-1565610222536-ef125c59da2e?w=800&q=80', alt: 'Row of storage unit doors', category: 'exterior' },
  { id: 'curated-2', url: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=800&q=80', alt: 'Storage facility exterior', category: 'exterior' },
  { id: 'curated-3', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80', alt: 'Storage hallway interior', category: 'interior' },
  // Moving and packing
  { id: 'curated-4', url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80', alt: 'Moving boxes packed', category: 'moving' },
  { id: 'curated-5', url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80', alt: 'Person packing boxes', category: 'packing' },
  { id: 'curated-6', url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7a5a2e?w=800&q=80', alt: 'Moving truck loading', category: 'moving' },
  { id: 'curated-7', url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80', alt: 'Cardboard boxes stacked', category: 'packing' },
  { id: 'curated-8', url: 'https://images.unsplash.com/photo-1603796846097-bee99e4a601f?w=800&q=80', alt: 'Family packing for move', category: 'moving' },
  // Garage / decluttering
  { id: 'curated-9', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80', alt: 'Clean organized space', category: 'interior' },
  { id: 'curated-10', url: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80', alt: 'Cluttered garage needing storage', category: 'lifestyle' },
  { id: 'curated-11', url: 'https://images.unsplash.com/photo-1615876063860-d971f6dca5dc?w=800&q=80', alt: 'Home decluttering organization', category: 'lifestyle' },
  { id: 'curated-12', url: 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800&q=80', alt: 'Organized storage space', category: 'interior' },
  // Packing supplies
  { id: 'curated-13', url: 'https://images.unsplash.com/photo-1607166452427-7e4477c3a3ad?w=800&q=80', alt: 'Packing supplies and tape', category: 'packing' },
  { id: 'curated-14', url: 'https://images.unsplash.com/photo-1595079676339-1534801ad6cf?w=800&q=80', alt: 'Boxes ready for storage', category: 'packing' },
  // Vehicle storage
  { id: 'curated-15', url: 'https://images.unsplash.com/photo-1504215680853-026ed2a45def?w=800&q=80', alt: 'RV parked at storage', category: 'vehicle' },
  { id: 'curated-16', url: 'https://images.unsplash.com/photo-1558449028-b53a39d100fc?w=800&q=80', alt: 'Boat storage outdoor', category: 'vehicle' },
]

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' })
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { category, query: searchQuery } = req.query || {}
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY

  // If no Unsplash key, return curated images filtered by category
  if (!unsplashKey) {
    const filtered = category && category !== 'all'
      ? CURATED_IMAGES.filter(img => img.category === category)
      : CURATED_IMAGES
    return res.status(200).json({ images: filtered, source: 'curated' })
  }

  // Use Unsplash API for dynamic search
  try {
    let query = searchQuery?.trim()

    if (!query) {
      // Pick a relevant query based on category
      const queries = STORAGE_QUERIES[category] || [
        'self storage facility',
        'storage units',
        'moving boxes packing',
        'storage building exterior',
      ]
      query = queries[Math.floor(Math.random() * queries.length)]
    }

    const params = new URLSearchParams({
      query,
      per_page: '20',
      orientation: 'landscape',
      content_filter: 'high',
    })

    const response = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: { Authorization: `Client-ID ${unsplashKey}` },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      // Fallback to curated
      const filtered = category && category !== 'all'
        ? CURATED_IMAGES.filter(img => img.category === category)
        : CURATED_IMAGES
      return res.status(200).json({ images: filtered, source: 'curated_fallback' })
    }

    const data = await response.json()
    const images = data.results.map((photo, i) => ({
      id: `unsplash-${photo.id}`,
      url: `${photo.urls.regular}&w=800&q=80`,
      thumb: photo.urls.thumb,
      alt: photo.alt_description || photo.description || query,
      category: category || 'search',
      photographer: photo.user.name,
      unsplashLink: photo.links.html,
    }))

    return res.status(200).json({ images, source: 'unsplash', query })
  } catch (err) {
    console.error('Stock image search failed:', err.message)
    // Fallback to curated
    const filtered = category && category !== 'all'
      ? CURATED_IMAGES.filter(img => img.category === category)
      : CURATED_IMAGES
    return res.status(200).json({ images: filtered, source: 'curated_fallback' })
  }
}
