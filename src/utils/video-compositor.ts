/**
 * Video text compositor — takes a source video URL and overlays
 * animated text (headlines, CTAs, facility name) frame-by-frame
 * using Canvas + MediaRecorder. Exports a finished video with
 * crisp typography baked in.
 */

export interface TextLayer {
  text: string
  style: 'headline' | 'subhead' | 'cta' | 'minimal'
  position: 'top' | 'center' | 'bottom'
  enterAt: number   // 0-1, when in the video timeline this text appears
  exitAt: number    // 0-1, when it fades out (1 = stays until end)
  animation: 'fade' | 'typewriter' | 'slide-up' | 'cut'
}

export interface CompositorOptions {
  width: number
  height: number
  fps: number
  textLayers: TextLayer[]
}

const FONT_STYLES = {
  headline: {
    size: (w: number) => Math.floor(w * 0.065),
    family: '"Space Grotesk", "SF Pro Display", -apple-system, sans-serif',
    weight: '700',
    color: '#ffffff',
    letterSpacing: -1,
    lineHeight: 1.15,
    maxWidth: 0.8,
  },
  subhead: {
    size: (w: number) => Math.floor(w * 0.035),
    family: '"DM Sans", "SF Pro", -apple-system, sans-serif',
    weight: '400',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0,
    lineHeight: 1.4,
    maxWidth: 0.7,
  },
  cta: {
    size: (w: number) => Math.floor(w * 0.032),
    family: '"Space Grotesk", "SF Pro Display", -apple-system, sans-serif',
    weight: '600',
    color: '#ffffff',
    letterSpacing: 2,
    lineHeight: 1,
    maxWidth: 0.6,
  },
  minimal: {
    size: (w: number) => Math.floor(w * 0.028),
    family: '"DM Sans", -apple-system, sans-serif',
    weight: '400',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
    lineHeight: 1.3,
    maxWidth: 0.6,
  },
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

function getTextY(position: TextLayer['position'], height: number): number {
  switch (position) {
    case 'top': return height * 0.15
    case 'center': return height * 0.45
    case 'bottom': return height * 0.75
  }
}

function getAnimationProgress(layer: TextLayer, videoProgress: number): { opacity: number; offsetY: number; charReveal: number } {
  // Before enter
  if (videoProgress < layer.enterAt) {
    return { opacity: 0, offsetY: 0, charReveal: 0 }
  }

  // After exit
  if (videoProgress > layer.exitAt) {
    const fadeOutDuration = 0.05
    const fadeOutProgress = Math.min(1, (videoProgress - layer.exitAt) / fadeOutDuration)
    return { opacity: 1 - fadeOutProgress, offsetY: 0, charReveal: 1 }
  }

  // Active — calculate enter animation
  const layerDuration = layer.exitAt - layer.enterAt
  const layerProgress = (videoProgress - layer.enterAt) / layerDuration
  const enterDuration = 0.15 // First 15% of layer duration is the enter animation
  const enterProgress = Math.min(1, layerProgress / enterDuration)

  // Smooth easing
  const eased = 1 - Math.pow(1 - enterProgress, 3) // ease-out cubic

  switch (layer.animation) {
    case 'fade':
      return { opacity: eased, offsetY: 0, charReveal: 1 }
    case 'slide-up':
      return { opacity: eased, offsetY: (1 - eased) * 30, charReveal: 1 }
    case 'typewriter':
      return { opacity: 1, offsetY: 0, charReveal: eased }
    case 'cut':
      return { opacity: enterProgress > 0 ? 1 : 0, offsetY: 0, charReveal: 1 }
  }
}

function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  videoProgress: number,
  width: number,
  height: number
) {
  const { opacity, offsetY, charReveal } = getAnimationProgress(layer, videoProgress)
  if (opacity <= 0) return

  const fontStyle = FONT_STYLES[layer.style]
  const fontSize = fontStyle.size(width)
  const maxWidth = width * fontStyle.maxWidth

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.font = `${fontStyle.weight} ${fontSize}px ${fontStyle.family}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  // Shadow for readability
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 20
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 4

  let baseY = getTextY(layer.position, height) + offsetY

  // For CTA style, draw a pill background
  if (layer.style === 'cta') {
    const textWidth = ctx.measureText(layer.text.toUpperCase()).width
    const pillW = textWidth + 48
    const pillH = fontSize + 24
    const pillX = (width - pillW) / 2
    const pillY = baseY - 12

    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2)
    ctx.fill()

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.shadowBlur = 20
    ctx.fillStyle = fontStyle.color
    const displayText = layer.text.toUpperCase()
    const revealed = charReveal < 1 ? displayText.slice(0, Math.ceil(displayText.length * charReveal)) : displayText
    if (fontStyle.letterSpacing) ctx.letterSpacing = `${fontStyle.letterSpacing}px`
    ctx.fillText(revealed, width / 2, baseY)
  } else {
    // Regular text with word wrap
    ctx.fillStyle = fontStyle.color
    if (fontStyle.letterSpacing) ctx.letterSpacing = `${fontStyle.letterSpacing}px`

    const displayText = charReveal < 1 ? layer.text.slice(0, Math.ceil(layer.text.length * charReveal)) : layer.text
    const lines = wrapText(ctx, displayText, maxWidth)

    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, baseY + i * (fontSize * fontStyle.lineHeight))
    })
  }

  ctx.restore()
}

// Load video element from URL
function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'

    video.onloadeddata = () => resolve(video)
    video.onerror = () => reject(new Error('Failed to load video'))
    video.src = url
  })
}

/**
 * Takes a source video URL and overlays text layers, exports as WebM.
 */
export async function compositeVideo(
  sourceVideoUrl: string,
  options: CompositorOptions,
  onProgress?: (percent: number) => void,
  adminKey?: string
): Promise<Blob> {
  const { width, height, fps, textLayers } = options

  onProgress?.(2)

  // Proxy the video through our server to avoid CORS issues
  let videoSrc = sourceVideoUrl
  if (adminKey && !sourceVideoUrl.startsWith('blob:')) {
    onProgress?.(3)
    const proxyRes = await fetch(`/api/proxy-video?url=${encodeURIComponent(sourceVideoUrl)}`, {
      headers: { 'X-Admin-Key': adminKey },
    })
    if (!proxyRes.ok) throw new Error('Failed to proxy video for compositing')
    const blob = await proxyRes.blob()
    videoSrc = URL.createObjectURL(blob)
  }

  onProgress?.(10)

  // Load the source video
  const video = await loadVideo(videoSrc)
  const videoDuration = video.duration

  onProgress?.(15)

  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  // Set up MediaRecorder
  const stream = canvas.captureStream(fps)
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm'

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8_000_000,
  })

  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const recordingDone = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
  })

  recorder.start()

  // Render frame by frame
  const totalFrames = Math.ceil(videoDuration * fps)

  for (let frame = 0; frame < totalFrames; frame++) {
    const currentTime = frame / fps
    const progress = currentTime / videoDuration

    // Seek video to current frame
    video.currentTime = currentTime
    await new Promise<void>((resolve) => {
      const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve() }
      video.addEventListener('seeked', onSeeked)
    })

    // Draw video frame
    ctx.drawImage(video, 0, 0, width, height)

    // Subtle vignette
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, width * 0.3,
      width / 2, height / 2, width * 0.8
    )
    vignette.addColorStop(0, 'rgba(0,0,0,0)')
    vignette.addColorStop(1, 'rgba(0,0,0,0.25)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, width, height)

    // Draw text layers
    for (const layer of textLayers) {
      drawTextLayer(ctx, layer, progress, width, height)
    }

    // Report progress
    const percent = 15 + (frame / totalFrames) * 80
    onProgress?.(Math.min(95, percent))

    // Yield to browser
    await new Promise(r => setTimeout(r, 1))
  }

  recorder.stop()
  onProgress?.(98)

  const blob = await recordingDone
  onProgress?.(100)
  return blob
}
