/**
 * Canvas-based video renderer for TikTok slideshows.
 * Renders slides with Ken Burns effects and text overlays,
 * captures via MediaRecorder, and returns a downloadable blob.
 */

interface RenderSlide {
  imageUrl: string
  textOverlay: string
  subText: string
  duration: number
  kenBurns: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'none'
  textPosition: 'top' | 'center' | 'bottom'
}

interface RenderOptions {
  width: number
  height: number
  fps: number
  facilityName: string
}

// Preload all images before rendering
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

// Calculate Ken Burns transform for a given progress (0-1)
function getKenBurnsTransform(effect: RenderSlide['kenBurns'], progress: number) {
  switch (effect) {
    case 'zoom-in':
      return { scale: 1 + progress * 0.15, translateX: 0, translateY: 0 }
    case 'zoom-out':
      return { scale: 1.15 - progress * 0.15, translateX: 0, translateY: 0 }
    case 'pan-left':
      return { scale: 1.1, translateX: -progress * 0.05, translateY: 0 }
    case 'pan-right':
      return { scale: 1.1, translateX: progress * 0.05 - 0.05, translateY: 0 }
    default:
      return { scale: 1, translateX: 0, translateY: 0 }
  }
}

// Draw a single frame
function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  slide: RenderSlide,
  progress: number,
  options: RenderOptions
) {
  const { width, height } = options
  const transform = getKenBurnsTransform(slide.kenBurns, progress)

  ctx.save()
  ctx.clearRect(0, 0, width, height)

  // Draw image with Ken Burns transform, covering the canvas
  const imgAspect = img.naturalWidth / img.naturalHeight
  const canvasAspect = width / height
  let drawW: number, drawH: number
  if (imgAspect > canvasAspect) {
    drawH = height * transform.scale
    drawW = drawH * imgAspect
  } else {
    drawW = width * transform.scale
    drawH = drawW / imgAspect
  }

  const drawX = (width - drawW) / 2 + transform.translateX * width
  const drawY = (height - drawH) / 2 + transform.translateY * height

  ctx.drawImage(img, drawX, drawY, drawW, drawH)

  // Gradient overlay
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, 'rgba(0,0,0,0.3)')
  gradient.addColorStop(0.4, 'rgba(0,0,0,0)')
  gradient.addColorStop(0.6, 'rgba(0,0,0,0)')
  gradient.addColorStop(1, 'rgba(0,0,0,0.7)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  // Text overlays with fade-in
  const textOpacity = Math.min(1, progress * 4) // Fade in over first 25% of slide
  if (textOpacity > 0 && (slide.textOverlay || slide.subText)) {
    ctx.globalAlpha = textOpacity
    const textYOffset = Math.max(0, (1 - progress * 4) * 20) // Slide up effect

    let textY: number
    if (slide.textPosition === 'top') {
      textY = height * 0.15
    } else if (slide.textPosition === 'center') {
      textY = height * 0.45
    } else {
      textY = height * 0.72
    }

    textY += textYOffset

    // Text shadow
    ctx.shadowColor = 'rgba(0,0,0,0.7)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 2

    if (slide.textOverlay) {
      const fontSize = slide.textOverlay.length > 30 ? Math.floor(width * 0.042) : Math.floor(width * 0.056)
      ctx.font = `bold ${fontSize}px "DM Sans", "SF Pro", -apple-system, sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'

      // Word wrap
      const lines = wrapText(ctx, slide.textOverlay, width * 0.8)
      lines.forEach((line, i) => {
        ctx.fillText(line, width / 2, textY + i * (fontSize * 1.3))
      })

      textY += lines.length * (fontSize * 1.3) + 8
    }

    if (slide.subText) {
      const subFontSize = Math.floor(width * 0.03)
      ctx.font = `${subFontSize}px "DM Sans", "SF Pro", -apple-system, sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.textAlign = 'center'

      const lines = wrapText(ctx, slide.subText, width * 0.75)
      lines.forEach((line, i) => {
        ctx.fillText(line, width / 2, textY + i * (subFontSize * 1.3))
      })
    }

    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }

  // Crossfade transition at the end of each slide (last 15%)
  if (progress > 0.85) {
    const fadeOut = (progress - 0.85) / 0.15
    ctx.fillStyle = `rgba(0,0,0,${fadeOut * 0.5})`
    ctx.fillRect(0, 0, width, height)
  }

  ctx.restore()
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

export async function renderVideo(
  slides: RenderSlide[],
  options: RenderOptions,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const { width, height, fps } = options

  // Create offscreen canvas
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  // Preload all images
  onProgress?.(5)
  const images: HTMLImageElement[] = []
  for (let i = 0; i < slides.length; i++) {
    try {
      const img = await loadImage(slides[i].imageUrl)
      images.push(img)
    } catch {
      // Create a fallback solid color frame
      const fallback = document.createElement('canvas')
      fallback.width = 100
      fallback.height = 100
      const fctx = fallback.getContext('2d')!
      fctx.fillStyle = '#1e293b'
      fctx.fillRect(0, 0, 100, 100)
      const img = new window.Image()
      img.src = fallback.toDataURL()
      await new Promise(r => { img.onload = r })
      images.push(img)
    }
    onProgress?.(5 + (i / slides.length) * 20)
  }

  // Set up MediaRecorder
  const stream = canvas.captureStream(fps)
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
    ? 'video/webm;codecs=vp8'
    : 'video/webm'

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 5_000_000, // 5 Mbps for good quality
  })

  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const recordingDone = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }))
    }
  })

  recorder.start()

  // Calculate total frames
  const totalDuration = slides.reduce((sum, s) => sum + s.duration, 0)
  const totalFrames = Math.ceil(totalDuration * fps)
  let currentFrame = 0

  // Render frame by frame
  for (let slideIdx = 0; slideIdx < slides.length; slideIdx++) {
    const slide = slides[slideIdx]
    const img = images[slideIdx]
    const slideFrames = Math.ceil(slide.duration * fps)

    for (let f = 0; f < slideFrames; f++) {
      const progress = f / slideFrames
      drawFrame(ctx, img, slide, progress, options)

      currentFrame++
      const percent = 25 + (currentFrame / totalFrames) * 70
      onProgress?.(Math.min(95, percent))

      // Wait for next frame timing
      await new Promise(r => setTimeout(r, 1000 / fps))
    }
  }

  // Draw final black frame
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
  await new Promise(r => setTimeout(r, 100))

  recorder.stop()
  onProgress?.(98)

  const blob = await recordingDone
  onProgress?.(100)
  return blob
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
