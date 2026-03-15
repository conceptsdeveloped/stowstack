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

// Style references that users can select to influence video aesthetics
const STYLE_PRESETS = {
  none: { name: 'Default', suffix: '' },
  cinematic: { name: 'Cinematic', suffix: 'Cinematic color grading, anamorphic lens flare, shallow depth of field, 35mm film grain, Hollywood commercial quality.' },
  vintage: { name: 'Vintage / Retro', suffix: 'Vintage 70s film look, warm analog color palette, soft focus, Super 8 texture, nostalgic and warm.' },
  wes_anderson: { name: 'Wes Anderson', suffix: 'Wes Anderson style symmetrical composition, pastel color palette, centered framing, whimsical and meticulously composed, flat perspective.' },
  drone: { name: 'Aerial / Drone', suffix: 'Aerial drone shot, smooth overhead flyover, DJI Mavic quality, sweeping landscape view, golden hour from above.' },
  minimal: { name: 'Clean / Minimal', suffix: 'Clean minimal aesthetic, lots of negative space, muted tones, modern Scandinavian design feel, quiet and elegant.' },
  bold: { name: 'Bold / High Energy', suffix: 'Bold saturated colors, high contrast, dynamic camera movement, fast-paced energy, punchy commercial style like a Nike ad.' },
  moody: { name: 'Moody / Dark', suffix: 'Moody dark tones, dramatic shadows, teal and orange color grade, cinematic noir feel, atmospheric and brooding.' },
  iphone: { name: 'iPhone / Authentic', suffix: 'Shot on iPhone style, handheld casual feel, natural lighting, authentic and unpolished, real and relatable social media content.' },
  timelapse: { name: 'Timelapse', suffix: 'Smooth timelapse footage, accelerated motion, clouds moving rapidly overhead, day passing quickly, hyperlapse movement.' },
}

// Video templates with prompt engineering — NO dialogue or talking heads
const VIDEO_TEMPLATES = {
  facility_showcase: {
    name: 'Facility Showcase',
    description: 'Cinematic walkthrough of storage units with smooth camera motion',
    mode: 'image_to_video',
    promptTemplate: (facility) =>
      `Smooth cinematic camera push forward through a clean, well-lit self-storage facility hallway. Rows of orange and blue storage unit doors on both sides. Professional, commercial quality. Bright fluorescent lighting. Clean concrete floors. No people. The camera slowly glides forward revealing more units. ${facility.name} storage facility.`,
  },
  hero_shot: {
    name: 'Hero B-Roll',
    description: 'Beautiful establishing shot of a storage facility exterior',
    mode: 'text_to_video',
    promptTemplate: (facility) =>
      `Wide establishing shot of a modern self-storage facility exterior at golden hour. Clean building with rows of unit doors, well-maintained landscaping, American flag. Camera slowly pushes in or tracks sideways. No people. Warm sunset lighting. Commercial real estate quality. ${facility.location}.`,
  },
  seasonal_promo: {
    name: 'Seasonal Promo',
    description: 'Eye-catching space transformation for promotions',
    mode: 'text_to_video',
    promptTemplate: (facility) =>
      `Dynamic visual transformation. A cluttered, overflowing garage with boxes stacked everywhere smoothly transforms into a clean, organized space. No people, no dialogue. Fast-paced transitions. Storage units appear with doors rolling up to reveal neatly organized belongings. Bright, energetic colors. Modern commercial style.`,
  },
  quick_cta: {
    name: 'Quick CTA',
    description: '5-second punchy visual for ads',
    mode: 'image_to_video',
    promptTemplate: (facility) =>
      `Dramatic reveal shot of a storage facility gate opening smoothly. Camera pushes through revealing a pristine row of storage units. Golden hour lighting. No people. Professional commercial quality. Cinematic. The facility looks secure, clean, and inviting. Quick dynamic movement.`,
  },
  packing_asmr: {
    name: 'Packing ASMR',
    description: 'Satisfying overhead shot of boxes being packed',
    mode: 'text_to_video',
    promptTemplate: (facility) =>
      `Top-down overhead shot of hands neatly packing cardboard boxes with bubble wrap and tape. No face visible, only hands and workspace. Organized packing station with labels and markers. Satisfying, methodical movements. ASMR-style packing. Clean workspace. Professional lighting. No dialogue.`,
  },
  before_after: {
    name: 'Before & After',
    description: 'Cluttered space transforming into organized storage',
    mode: 'text_to_video',
    promptTemplate: (facility) =>
      `Smooth morph transition from a messy, overflowing garage with boxes stacked haphazardly, bikes, holiday decorations everywhere, into the same items perfectly organized inside a clean, well-lit storage unit with shelving and labeled boxes. No people, no dialogue. Satisfying transformation. Before and after reveal.`,
  },
  custom: {
    name: 'Custom Prompt',
    description: 'Write your own prompt — full creative control over the generated video',
    mode: 'text_to_video',
    promptTemplate: (facility) =>
      `A professional, cinematic video related to self-storage. ${facility.name} in ${facility.location}. High quality, commercial grade.`,
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
      content: `You are writing a prompt for an AI video generator (like Runway ML). The video is for a self-storage facility's marketing.

Template type: ${template.name}
Base prompt: ${basePrompt}
Facility: ${facility.name} in ${facility.location}
${facility.google_rating ? `Rating: ${facility.google_rating} stars` : ''}
${customNotes ? `Custom notes from the operator: ${customNotes}` : ''}

Refine and enhance the base prompt to be more specific and visually compelling. Keep it under 200 words. Focus on visual descriptions that a video AI can render well. Return ONLY the prompt text, nothing else.`
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

      // Append style preset if selected
      const style = STYLE_PRESETS[stylePreset]
      if (style?.suffix) {
        prompt = `${prompt} ${style.suffix}`
      }

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
