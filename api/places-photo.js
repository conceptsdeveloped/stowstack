// Proxy endpoint for Google Places photos
// Resolves photo_reference to a direct CDN URL without exposing the API key
// Usage: GET /api/places-photo?ref=PHOTO_REFERENCE&maxwidth=800

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { ref, maxwidth } = req.query
  if (!ref) {
    return res.status(400).json({ error: 'ref (photo_reference) is required' })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const width = parseInt(maxwidth, 10) || 800
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photo_reference=${ref}&key=${apiKey}`

  try {
    const photoRes = await fetch(url, { redirect: 'follow' })
    if (!photoRes.ok) {
      return res.status(photoRes.status).json({ error: 'Photo fetch failed' })
    }

    // Stream the image back with proper headers
    const contentType = photoRes.headers.get('content-type') || 'image/jpeg'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800') // cache 1d client, 7d CDN

    const buffer = Buffer.from(await photoRes.arrayBuffer())
    return res.status(200).send(buffer)
  } catch (err) {
    console.error('Places photo proxy failed:', err.message)
    return res.status(500).json({ error: 'Photo proxy failed' })
  }
}
