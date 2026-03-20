import { query } from './_db.js'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin } from './_auth.js'
import { getCreativeContext } from './_creative.js'
import { put } from '@vercel/blob'

export const config = { maxDuration: 60 }

const ALLOWED_ORIGINS = [
  'https://stowstack.co', 'https://www.stowstack.co',
  'http://localhost:5173', 'http://localhost:3000',
]

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

// Image templates
const IMAGE_TEMPLATES = {
  ad_hero: {
    name: 'Ad Hero Image',
    description: 'Styled hero image for Meta/Instagram ads — facility exterior or interior at golden hour',
    aspect: '1:1',
    promptBase: 'Professional photograph of a modern self-storage facility. Clean, well-maintained. Warm golden hour lighting. Commercial advertising quality.',
  },
  ad_hero_wide: {
    name: 'Ad Hero (Wide)',
    description: 'Wide format hero for Facebook feed or Google Display ads',
    aspect: '16:9',
    promptBase: 'Wide cinematic shot of a self-storage facility exterior. Clean architecture, warm evening light, inviting atmosphere. Commercial real estate photography.',
  },
  lifestyle_moving: {
    name: 'Lifestyle — Moving Day',
    description: 'People loading boxes into a vehicle or carrying items — authentic moving day scene',
    aspect: '1:1',
    promptBase: 'Candid photograph of a person carrying a cardboard box, walking toward a clean storage unit. Natural daylight. Authentic, warm, relatable. Not posed or stock-photo feeling.',
  },
  lifestyle_organized: {
    name: 'Lifestyle — Organized Space',
    description: 'Satisfying organized storage unit or clean garage after decluttering',
    aspect: '1:1',
    promptBase: 'Photograph of a perfectly organized storage unit interior. Neatly stacked labeled boxes, clean shelving, warm overhead lighting. Satisfying, aspirational order.',
  },
  lifestyle_packing: {
    name: 'Lifestyle — Packing',
    description: 'Close-up of someone carefully packing items into boxes',
    aspect: '4:5',
    promptBase: 'Close-up photograph of hands wrapping an item in kraft paper and placing it into a cardboard box. Warm natural window light. Wooden table surface. Tactile, ASMR-like quality.',
  },
  social_promo: {
    name: 'Social Promo Graphic',
    description: 'Eye-catching promotional image for social media — bold colors, clean composition',
    aspect: '1:1',
    promptBase: 'Clean minimal graphic design composition. Storage unit door as central element. Bold typography space at top and bottom. Modern, bright, professional. Not cluttered.',
  },
  social_seasonal: {
    name: 'Seasonal Graphic',
    description: 'Seasonal themed image — spring cleaning, summer moving, holiday storage',
    aspect: '1:1',
    promptBase: 'Warm seasonal photograph related to home organization and storage. Cozy, inviting atmosphere. Natural materials — cardboard, wood, warm fabrics. Seasonal color palette.',
  },
  before_after: {
    name: 'Before/After Split',
    description: 'Cluttered space on one side, organized storage on the other',
    aspect: '1:1',
    promptBase: 'Split composition photograph. Left half: cluttered messy garage with boxes everywhere, disorganized. Right half: same items perfectly organized in a clean well-lit storage unit. Dramatic contrast. Satisfying transformation.',
  },
  text_ad: {
    name: 'Text Ad Creative',
    description: 'Complete ad image with space for headline and CTA overlay',
    aspect: '1:1',
    promptBase: 'Clean, modern background photograph of a storage facility with large areas of negative space for text overlay. Soft, muted tones. Intentional composition leaving room at top and bottom for headlines and CTA buttons. Advertising layout ready.',
  },
  story_bg: {
    name: 'Story Background',
    description: 'Vertical image for Instagram/TikTok story backgrounds',
    aspect: '9:16',
    promptBase: 'Vertical photograph of a storage facility hallway or exterior. Dramatic perspective, warm lighting. Large areas of subtle gradient for text readability. Story-format composition.',
  },
}

const ASPECT_RATIOS = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1344, height: 768 },
  '4:5': { width: 896, height: 1088 },
  '9:16': { width: 768, height: 1344 },
}

// Enhance prompt with Claude using CREATIVE.md voice
async function enhancePrompt(basePrompt, facility, customNotes, anthropicKey) {
  if (!anthropicKey) return basePrompt

  const creativeContext = getCreativeContext('meta')
  const client = new Anthropic({ apiKey: anthropicKey })

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Enhance this image generation prompt. Make it more visually specific and compelling. Keep under 150 words. No business names, no text on screen. Focus on lighting, composition, color, texture, and mood.

${creativeContext.slice(0, 400)}

Base prompt: ${basePrompt}
Facility: ${facility.name} in ${facility.location}
${customNotes ? `Notes: ${customNotes}` : ''}

Return ONLY the enhanced prompt. Nothing else.`
      }],
    })
    return message.content[0].text.trim()
  } catch {
    return basePrompt
  }
}

// Generate image — tries Nano Banana (Gemini) first, falls back to Replicate/Flux
async function generateImage(prompt, aspect, keys) {
  // Try Nano Banana (Gemini) if key available
  if (keys.gemini) {
    try {
      const aspectMap = { '1:1': '1:1', '16:9': '16:9', '4:5': '3:4', '9:16': '9:16' }
      const model = 'gemini-2.5-flash-image'
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keys.gemini },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: aspectMap[aspect] || '1:1' } },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const parts = data.candidates?.[0]?.content?.parts || []
        const imagePart = parts.find(p => p.inline_data?.mimeType?.startsWith('image/'))
        if (imagePart) {
          return { imageUrl: `data:${imagePart.inline_data.mimeType};base64,${imagePart.inline_data.data}`, predictionId: null }
        }
      }
    } catch {}
  }

  // Fallback: Replicate/Flux
  if (keys.replicate) {
    const dims = ASPECT_RATIOS[aspect] || ASPECT_RATIOS['1:1']
    const startRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${keys.replicate}`, 'Content-Type': 'application/json', Prefer: 'wait' },
      body: JSON.stringify({ input: { prompt, width: dims.width, height: dims.height, num_inference_steps: 25, guidance: 3.5, output_format: 'webp', output_quality: 90 } }),
    })
    if (!startRes.ok) {
      const err = await startRes.json().catch(() => ({}))
      throw new Error(err.detail || JSON.stringify(err) || `Replicate error: ${startRes.status}`)
    }
    const prediction = await startRes.json()
    if (prediction.status === 'succeeded' && prediction.output) {
      const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
      return { imageUrl: output, predictionId: prediction.id }
    }
    // Poll if not immediately ready
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, { headers: { Authorization: `Bearer ${keys.replicate}` } })
      const data = await pollRes.json()
      if (data.status === 'succeeded') return { imageUrl: Array.isArray(data.output) ? data.output[0] : data.output, predictionId: prediction.id }
      if (data.status === 'failed') throw new Error(data.error || 'Generation failed')
    }
    throw new Error('Image generation timed out')
  }

  throw new Error('No image generation API configured. Add GEMINI_API_KEY (with billing) or REPLICATE_API_TOKEN.')
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!requireAdmin(req, res)) return

  // GET — list templates
  if (req.method === 'GET') {

    const templates = Object.entries(IMAGE_TEMPLATES).map(([id, t]) => ({
      id,
      name: t.name,
      description: t.description,
      aspect: t.aspect,
    }))
    return res.status(200).json({
      templates,
      configured: !!(process.env.GEMINI_API_KEY || process.env.REPLICATE_API_TOKEN),
    })
  }

  // POST — generate an image
  if (req.method === 'POST') {
    const { templateId, facilityId, customNotes, promptOverride, aspect } = req.body || {}
    if (!templateId || !facilityId) return res.status(400).json({ error: 'templateId and facilityId required' })

    const keys = { gemini: process.env.GEMINI_API_KEY, replicate: process.env.REPLICATE_API_TOKEN }
    if (!keys.gemini && !keys.replicate) return res.status(500).json({ error: 'No image API configured. Add GEMINI_API_KEY or REPLICATE_API_TOKEN.' })

    const template = IMAGE_TEMPLATES[templateId]
    if (!template) return res.status(400).json({ error: 'Invalid template' })

    try {
      const facilities = await query(`SELECT * FROM facilities WHERE id = $1`, [facilityId])
      if (!facilities.length) return res.status(404).json({ error: 'Facility not found' })
      const facility = facilities[0]

      // Build prompt
      let prompt = promptOverride?.trim()
      if (!prompt) {
        const anthropicKey = process.env.ANTHROPIC_API_KEY
        prompt = await enhancePrompt(template.promptBase, facility, customNotes, anthropicKey)
      }

      // Generate — tries Nano Banana first, falls back to Flux
      const result = await generateImage(prompt, aspect || template.aspect, keys)

      // Upload to Vercel Blob for permanent URL
      let permanentUrl = result.imageUrl
      try {
        let imageBuffer
        if (result.imageUrl.startsWith('data:')) {
          // Base64 data URL (from Gemini)
          const base64Data = result.imageUrl.split(',')[1]
          imageBuffer = Buffer.from(base64Data, 'base64')
        } else {
          // Hosted URL (from Replicate) — download it
          const imgRes = await fetch(result.imageUrl)
          imageBuffer = Buffer.from(await imgRes.arrayBuffer())
        }
        const blob = await put(`generated/${facilityId}/${templateId}-${Date.now()}.webp`, imageBuffer, {
          access: 'public',
          contentType: 'image/webp',
        })
        permanentUrl = blob.url
      } catch (err) {
        console.error('Blob upload failed, using original URL:', err.message)
      }

      // Save as asset with permanent URL
      try {
        await query(
          `INSERT INTO assets (facility_id, type, source, url, metadata) VALUES ($1, 'photo', 'ai_generated', $2, $3)`,
          [facilityId, permanentUrl, JSON.stringify({ template: templateId, prompt, predictionId: result.predictionId })]
        )
      } catch {}

      return res.status(200).json({
        imageUrl: permanentUrl,
        prompt,
        templateId,
        predictionId: result.predictionId,
      })
    } catch (err) {
      console.error('Image generation failed:', err.message)
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
