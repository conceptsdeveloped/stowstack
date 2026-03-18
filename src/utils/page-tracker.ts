/**
 * Landing Page Interaction Tracker
 *
 * Lightweight tracker for clicks, scroll depth, section visibility,
 * and time on page. Batches events and flushes to /api/page-interactions.
 */

interface PageEvent {
  event_type: string
  element_id?: string
  element_text?: string
  section_index?: number
  x_pct?: number
  y_pct?: number
  scroll_depth?: number
  viewport_width?: number
  viewport_height?: number
  time_on_page?: number
}

let eventQueue: PageEvent[] = []
let maxScrollDepth = 0
let startTime = Date.now()
let flushTimer: ReturnType<typeof setInterval> | null = null
let initialized = false
let landingPageId: string | null = null
let facilityId: string | null = null
let sessionId: string | null = null

function getSessionId(): string {
  if (sessionId) return sessionId
  const stored = sessionStorage.getItem('stowstack_session_id')
  if (stored) { sessionId = stored; return stored }
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  sessionStorage.setItem('stowstack_session_id', id)
  sessionId = id
  return id
}

function queueEvent(event: PageEvent) {
  eventQueue.push({
    ...event,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    time_on_page: Math.round((Date.now() - startTime) / 1000),
  })
}

async function flushEvents() {
  if (eventQueue.length === 0 || !landingPageId || !facilityId) return

  const events = [...eventQueue]
  eventQueue = []

  try {
    const params = new URLSearchParams(window.location.search)
    await fetch('/api/page-interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        landingPageId,
        facilityId,
        sessionId: getSessionId(),
        utmSource: params.get('utm_source') || undefined,
        utmCampaign: params.get('utm_campaign') || undefined,
        events,
      }),
      keepalive: true,
    })
  } catch {
    // Re-queue on failure (drop if queue gets too large)
    if (eventQueue.length < 50) {
      eventQueue.push(...events)
    }
  }
}

function handleClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target) return

  const x_pct = Math.round((e.clientX / window.innerWidth) * 10000) / 100
  const y_pct = Math.round(((e.clientY + window.scrollY) / document.documentElement.scrollHeight) * 10000) / 100

  // Get meaningful element info
  const el = target.closest('a, button, [role="button"]') || target
  const elementId = el.id || el.getAttribute('data-track') || el.tagName.toLowerCase()
  const elementText = (el.textContent || '').trim().slice(0, 100)

  // Find section index
  const section = target.closest('section')
  const sectionIndex = section ? Array.from(document.querySelectorAll('main > section, main section')).indexOf(section) : undefined

  queueEvent({
    event_type: 'click',
    element_id: elementId,
    element_text: elementText || undefined,
    section_index: sectionIndex !== -1 ? sectionIndex : undefined,
    x_pct,
    y_pct,
  })
}

function handleScroll() {
  const scrollTop = window.scrollY
  const docHeight = document.documentElement.scrollHeight - window.innerHeight
  const depth = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0

  if (depth > maxScrollDepth) {
    maxScrollDepth = depth
  }
}

function setupSectionObserver() {
  const sections = document.querySelectorAll('main > section, main section')
  if (sections.length === 0) return

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = Array.from(sections).indexOf(entry.target as Element)
          queueEvent({
            event_type: 'section_view',
            section_index: idx,
          })
        }
      })
    },
    { threshold: 0.3 }
  )

  sections.forEach(section => observer.observe(section))
}

function handleBeforeUnload() {
  // Record final scroll depth
  queueEvent({
    event_type: 'scroll',
    scroll_depth: maxScrollDepth,
  })
  flushEvents()
}

export function initPageTracker(lpId: string, facId: string) {
  if (initialized) return

  landingPageId = lpId
  facilityId = facId
  startTime = Date.now()
  initialized = true

  // Click tracking
  document.addEventListener('click', handleClick, { passive: true })

  // Scroll tracking (debounced)
  let scrollTimeout: ReturnType<typeof setTimeout>
  document.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(handleScroll, 150)
  }, { passive: true })

  // Section visibility
  // Delay to let page render
  setTimeout(setupSectionObserver, 1000)

  // Flush every 10 seconds
  flushTimer = setInterval(flushEvents, 10000)

  // Flush on page leave
  window.addEventListener('beforeunload', handleBeforeUnload)

  // Initial page view event
  queueEvent({ event_type: 'page_load' })
}

export function destroyPageTracker() {
  if (!initialized) return
  initialized = false

  document.removeEventListener('click', handleClick)
  window.removeEventListener('beforeunload', handleBeforeUnload)

  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }

  // Final flush
  handleBeforeUnload()

  eventQueue = []
  maxScrollDepth = 0
  landingPageId = null
  facilityId = null
}
