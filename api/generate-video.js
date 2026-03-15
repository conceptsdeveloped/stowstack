import { query } from './_db.js'
import Anthropic from '@anthropic-ai/sdk'

export const config = { maxDuration: 60 }

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
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return req.headers['x-admin-key'] === ADMIN_KEY
}

// Core aesthetic DNA — applied to ALL generations as a baseline.
// Inspired by: warm analog textures, restrained confidence, every frame a poster,
// bold simplicity, emotional resonance, quiet craft, trusting the visual.
const CORE_STYLE = 'Warm muted color palette with subtle film grain texture. Intentional composition with generous negative space. Slow deliberate camera movement. Soft natural lighting with gentle warmth. Understated and confident. Every frame feels carefully considered. Quiet elegance.'

// Style references that users can select to layer on top of core aesthetic
const STYLE_PRESETS = {
  none: { name: 'Default', suffix: '' },
  cinematic: { name: 'Cinematic', suffix: 'Anamorphic lens quality, shallow depth of field, 35mm film texture, rich shadow detail.' },
  vintage: { name: 'Vintage / Analog', suffix: 'Warm analog color shift, soft halation around highlights, Super 8 texture, nostalgic and tactile.' },
  storybook: { name: 'Storybook Symmetry', suffix: 'Perfectly symmetrical centered framing, soft pastel tones, flat perspective, meticulously composed like a dollhouse.' },
  drone: { name: 'Aerial / Drone', suffix: 'Aerial overhead perspective, smooth sweeping movement, landscape scale, golden hour from above.' },
  minimal: { name: 'Clean / Minimal', suffix: 'Maximum negative space, muted earth tones, single subject focus, quiet and sparse, architectural simplicity.' },
  bold: { name: 'Bold / Graphic', suffix: 'High contrast, bold saturated accent colors against muted backgrounds, graphic composition, confident and striking.' },
  moody: { name: 'Moody / Atmospheric', suffix: 'Deep shadows, teal and amber tones, atmospheric haze, contemplative and brooding, dramatic light shafts.' },
  handheld: { name: 'Handheld / Raw', suffix: 'Slight handheld movement, natural available light, candid documentary feel, authentic and unposed.' },
  timelapse: { name: 'Timelapse', suffix: 'Smooth accelerated motion, clouds and light shifting rapidly, day passing in seconds, hyperlapse quality.' },
  textile: { name: 'Tactile / Textured', suffix: 'Rich material textures, close-up surface detail, tangible and physical, you can almost feel the materials through the screen.' },
}

// Video templates with prompt engineering — NO dialogue or talking heads
const VIDEO_TEMPLATES = {
  facility_showcase: {
    name: 'Facility Showcase',
    description: 'Slow, deliberate walkthrough of storage units',
    mode: 'image_to_video',
    promptTemplate: () =>
      `Slow deliberate camera glide through a storage facility hallway. Rows of unit doors recede into soft vanishing point. Clean geometry. Quiet. No people. Warm overhead lighting casting gentle shadows on concrete floor.`,
  },
  hero_shot: {
    name: 'Hero B-Roll',
    description: 'Contemplative exterior establishing shot',
    mode: 'text_to_video',
    promptTemplate: () =>
      `Wide still establishing shot of a storage facility exterior. Late afternoon light raking across rows of unit doors. Long shadows. Quiet suburban landscape. No people. Camera holds steady then slowly pushes forward almost imperceptibly.`,
  },
  seasonal_promo: {
    name: 'Seasonal Promo',
    description: 'Satisfying transformation from chaos to order',
    mode: 'text_to_video',
    promptTemplate: () =>
      `A cluttered garage slowly dissolves into a perfectly organized storage unit. Objects find their place. Boxes align. Labels appear. The mess becomes order. No people. Smooth contemplative pace. Satisfying visual resolution.`,
  },
  quick_cta: {
    name: 'Quick CTA',
    description: '5-second visual punch',
    mode: 'image_to_video',
    promptTemplate: () =>
      `A storage unit door rolls up in one smooth motion revealing a perfectly lit interior. Clean. Simple. Camera holds. The light inside is warm and inviting against the cooler exterior. No people.`,
  },
  packing_asmr: {
    name: 'Packing ASMR',
    description: 'Tactile close-up of careful packing',
    mode: 'text_to_video',
    promptTemplate: () =>
      `Close overhead shot of hands carefully wrapping an object in kraft paper and placing it into a cardboard box. Deliberate precise movements. Natural light from a window. Wooden table surface. Tape dispenser and marker nearby. Quiet focus.`,
  },
  before_after: {
    name: 'Before & After',
    description: 'From disorder to calm',
    mode: 'text_to_video',
    promptTemplate: () =>
      `A room full of stacked boxes and clutter. Camera slowly pans. The scene seamlessly transitions into the same view but everything is gone, replaced by clean empty space and warm light. Absence as relief. No people.`,
  },
  custom: {
    name: 'Custom Prompt',
    description: 'Write your own prompt — full creative control over the generated video',
    mode: 'text_to_video',
    promptTemplate: () =>
      `A beautifully composed scene. Warm muted tones. Deliberate camera movement. Quiet and confident.`,
  },
}

// Generate a custom prompt using Claude based on template + facility data
async function generateVideoPrompt(template, facility, customNotes) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    // Fall back to template prompt
    return template.promptTemplate(facility)
  }

  const client = new Anthropic({ apiKey: anthropicKey })
  const basePrompt = template.promptTemplate(facility)

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You are writing a prompt for an AI video generator (Runway ML). The video is b-roll for a storage facility's marketing.

AESTHETIC DIRECTION:
- Warm, muted, slightly analog feel. Subtle film grain. Intentional negative space.
- Slow, deliberate camera movement. Every frame should feel like a considered photograph.
- Quiet confidence — no hard sell energy, no stock footage look.
- Think premium brand campaign: restrained, tactile, beautiful.

HARD RULES:
- No business names, addresses, locations, or brand names
- No text on screen
- No people talking. Hands-only if people needed.
- Under 120 words
- Focus on: camera movement, lighting quality, composition, texture, color

Template: ${template.name}
Base prompt: ${basePrompt}
${customNotes ? `Notes: ${customNotes}` : ''}

Refine into a visually compelling prompt. Return ONLY the prompt, nothing else.`
    }],
  })

  return message.content[0].text.trim()
}

// Call Runway ML API
async function callRunway(prompt, imageUrl, mode) {
  const runwayKey = process.env.RUNWAY_API_KEY
  if (!runwayKey) throw new Error('RUNWAY_API_KEY not configured. Add it in Vercel → Settings → Environment Variables.')

  const baseUrl = 'https://api.dev.runwayml.com/v1'
  const endpoint = mode === 'image_to_video'
    ? `${baseUrl}/image_to_video`
    : `${baseUrl}/text_to_video`

  // 720:1280 = 9:16 portrait (TikTok/Reels/Shorts)
  const body = mode === 'image_to_video'
    ? {
        model: 'gen4_turbo',
        promptImage: imageUrl,
        promptText: prompt.slice(0, 1000),
        duration: 5,
        ratio: '720:1280',
      }
    : {
        model: 'gen4.5',
        promptText: prompt.slice(0, 1000),
        duration: 5,
        ratio: '720:1280',
      }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${runwayKey}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || data.message || JSON.stringify(data) || `Runway API error: ${res.status}`)
  }

  return data
}

// Poll Runway task status
async function pollRunwayTask(taskId) {
  const runwayKey = process.env.RUNWAY_API_KEY
  const maxAttempts = 60 // 5 minutes max
  let attempts = 0

  while (attempts < maxAttempts) {
    const res = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${runwayKey}`,
        'X-Runway-Version': '2024-11-06',
      },
    })
    const data = await res.json()

    if (data.status === 'SUCCEEDED') {
      return data.output?.[0] || data.artifacts?.[0]?.url || null
    }
    if (data.status === 'FAILED') {
      throw new Error(data.failure || 'Video generation failed')
    }

    attempts++
    await new Promise(r => setTimeout(r, 5000))
  }

  throw new Error('Video generation timed out')
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  // GET — list templates or check task status
  if (req.method === 'GET') {
    const { taskId } = req.query

    if (taskId) {
      // Poll task status
      try {
        const runwayKey = process.env.RUNWAY_API_KEY
        if (!runwayKey) return res.status(500).json({ error: 'RUNWAY_API_KEY not configured' })

        const taskRes = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
          headers: {
            Authorization: `Bearer ${runwayKey}`,
            'X-Runway-Version': '2024-11-06',
          },
        })
        const data = await taskRes.json()
        return res.status(200).json({
          status: data.status,
          progress: data.progress || null,
          videoUrl: data.status === 'SUCCEEDED' ? (data.output?.[0] || null) : null,
          error: data.status === 'FAILED' ? (data.failure || 'Generation failed') : null,
        })
      } catch (err) {
        return res.status(500).json({ error: err.message })
      }
    }

    // Return available templates
    const templates = Object.entries(VIDEO_TEMPLATES).map(([id, t]) => ({
      id,
      name: t.name,
      description: t.description,
      mode: t.mode,
    }))
    const styles = Object.entries(STYLE_PRESETS).map(([id, s]) => ({ id, name: s.name }))
    return res.status(200).json({
      templates,
      styles,
      configured: !!process.env.RUNWAY_API_KEY,
    })
  }

  // POST — start video generation
  if (req.method === 'POST') {
    const { templateId, facilityId, imageUrl, customNotes, promptOverride, stylePreset } = req.body || {}
    if (!templateId || !facilityId) {
      return res.status(400).json({ error: 'templateId and facilityId required' })
    }

    const template = VIDEO_TEMPLATES[templateId]
    if (!template) return res.status(400).json({ error: 'Invalid template' })

    try {
      // Fetch facility data
      const facilities = await query(`SELECT * FROM facilities WHERE id = $1`, [facilityId])
      if (!facilities.length) return res.status(404).json({ error: 'Facility not found' })
      const facility = facilities[0]

      // Use override prompt if provided, otherwise generate one
      let prompt = promptOverride?.trim() || await generateVideoPrompt(template, facility, customNotes)

      // Layer core aesthetic + selected style preset
      prompt = `${prompt} ${CORE_STYLE}`
      const style = STYLE_PRESETS[stylePreset]
      if (style?.suffix) {
        prompt = `${prompt} ${style.suffix}`
      }
      // Ensure under 1000 char limit
      prompt = prompt.slice(0, 1000)

      // For image_to_video mode, we need an image
      const sourceImage = imageUrl || null
      if (template.mode === 'image_to_video' && !sourceImage) {
        // Try to find a facility image
        const assets = await query(
          `SELECT url FROM assets WHERE facility_id = $1 AND type = 'photo' ORDER BY created_at DESC LIMIT 1`,
          [facilityId]
        )
        if (assets.length) {
          // Use the first available image
        } else {
          return res.status(400).json({ error: 'This template requires an image. Upload or scrape facility images first.' })
        }
      }

      // Call Runway
      const result = await callRunway(prompt, sourceImage, template.mode)
      const taskId = result.id

      return res.status(200).json({
        taskId,
        prompt,
        template: templateId,
        status: 'PENDING',
        message: 'Video generation started. Poll the task status endpoint to check progress.',
      })
    } catch (err) {
      console.error('generate-video failed:', err.message)
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
