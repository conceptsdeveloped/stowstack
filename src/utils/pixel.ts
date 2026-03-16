/**
 * Client-side pixel tracking utility for StowStack.
 *
 * Handles:
 * - Meta Pixel (fbq) initialization and browser-side tracking
 * - Google Ads gtag initialization and conversion tracking
 * - Server-side event firing to Meta CAPI and Google Ads APIs
 * - Event deduplication between browser pixel and server API
 * - Unified interface for firing conversions across both platforms
 *
 * All client-side tracking is gated behind user consent (GDPR/CCPA).
 * Server-side CAPI events still fire for first-party data collection.
 */

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void
      push: (...args: unknown[]) => void
      loaded: boolean
      version: string
      queue: unknown[]
    }
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

import { hasTrackingConsent, onConsentChange } from './consent'

/**
 * Event data structure for StowStack conversions.
 */
export interface StowStackEvent {
  event_name: string
  event_time?: number
  event_id?: string
  user_data?: {
    email?: string
    phone?: string
    firstName?: string
    lastName?: string
    city?: string
    state?: string
    zip?: string
    country?: string
  }
  custom_data?: {
    value?: number
    currency?: string
    content_name?: string
    content_category?: string
    content_type?: string
    content_id?: string
    num_items?: number
    [key: string]: string | number | undefined
  }
  gclid?: string
  fbclid?: string
  conversion_value?: number
  conversion_currency?: string
}

/**
 * Pixel configuration.
 */
export interface PixelConfig {
  metaPixelId?: string
  googleConversionId?: string
  googleConversionLabel?: string
  debug?: boolean
  capiEndpoint?: string
  googleConversionEndpoint?: string
}

/** Response from a server-side pixel API call */
interface PixelApiResponse {
  [key: string]: unknown
}

/** Combined response from both Meta and Google tracking */
interface ConversionResult {
  meta: PixelApiResponse | null
  google: PixelApiResponse | null
}

/**
 * Pixel manager class for unified tracking.
 */
class PixelManager {
  // @ts-ignore stored for potential future use
  private _config: PixelConfig
  private metaPixelId: string | null = null
  private googleConversionId: string | null = null
  private googleConversionLabel: string | null = null
  private debug: boolean = false
  private capiEndpoint: string
  private googleConversionEndpoint: string

  constructor(config: PixelConfig = {}) {
    this._config = config
    this.metaPixelId = config.metaPixelId || null
    this.googleConversionId = config.googleConversionId || null
    this.googleConversionLabel = config.googleConversionLabel || null
    this.debug = config.debug || false
    this.capiEndpoint = config.capiEndpoint || '/api/meta-capi'
    this.googleConversionEndpoint =
      config.googleConversionEndpoint || '/api/google-conversion'

    // Only initialize client-side pixels if user has granted consent
    if (hasTrackingConsent()) {
      this.initializePixels()
    }

    // Listen for future consent grants to initialize pixels later
    onConsentChange((status) => {
      if (status === 'granted') {
        this.initializePixels()
      }
    })
  }

  /**
   * Initialize Meta Pixel and Google Ads tracking.
   * Should be called once on app initialization.
   */
  private initializePixels(): void {
    // Initialize Meta Pixel
    if (this.metaPixelId) {
      this.initializeMetaPixel()
    }

    // Initialize Google Ads
    this.initializeGoogleAds()

  }

  /**
   * Initialize Meta Pixel (fbq).
   * Adds Facebook Pixel script and configures event tracking.
   */
  private initializeMetaPixel(): void {
    // Check if fbq already exists (if Meta Pixel script was loaded)
    if (window.fbq) {
        return
    }

    // Create fbq object if not present
    const queue: unknown[] = []
    const fbq = Object.assign(
      (...args: unknown[]) => {
        if (fbq.callMethod) {
          fbq.callMethod(...args)
        } else {
          fbq.queue.push(args)
        }
      },
      {
        callMethod: undefined as ((...a: unknown[]) => void) | undefined,
        push: (...args: unknown[]) => { queue.push(args) },
        loaded: true,
        version: '2.0',
        queue,
      }
    )
    window.fbq = fbq

    // Initialize pixel
    window.fbq('init', this.metaPixelId)

    // Track standard PageView
    window.fbq('track', 'PageView')

  }

  /**
   * Initialize Google Ads (gtag).
   * Adds Google Ads conversion tracking script.
   */
  private initializeGoogleAds(): void {
    // Check if gtag already exists
    if (window.gtag) {
        return
    }

    // Create gtag object
    window.dataLayer = window.dataLayer || []
    window.gtag = (...args: unknown[]) => {
      window.dataLayer!.push(args)
    }
    window.gtag('js', new Date())

  }

  /**
   * Generate a unique event ID for deduplication.
   * Should be the same on client and server for proper dedup.
   * @returns Unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Get GCLID from URL or localStorage.
   * GCLID is set by Google Ads and used for conversion attribution.
   * @returns GCLID or empty string
   */
  private getGclid(): string {
    // Try to get from URL params
    const params = new URLSearchParams(window.location.search)
    const gclid = params.get('gclid')
    if (gclid) {
      // Store in session storage for later use
      try {
        sessionStorage.setItem('stowstack_gclid', gclid)
      } catch (e) {
        // sessionStorage might be disabled
      }
      return gclid
    }

    // Try to get from session storage
    try {
      return sessionStorage.getItem('stowstack_gclid') || ''
    } catch (e) {
      return ''
    }
  }

  /**
   * Get FBCLID from URL or localStorage.
   * FBCLID is set by Facebook Ads for conversion tracking.
   * @returns FBCLID or empty string
   */
  private getFbclid(): string {
    // Try to get from URL params
    const params = new URLSearchParams(window.location.search)
    const fbclid = params.get('fbclid')
    if (fbclid) {
      // Store in session storage for later use
      try {
        sessionStorage.setItem('stowstack_fbclid', fbclid)
      } catch (e) {
        // sessionStorage might be disabled
      }
      return fbclid
    }

    // Try to get from session storage
    try {
      return sessionStorage.getItem('stowstack_fbclid') || ''
    } catch (e) {
      return ''
    }
  }

  /**
   * Fire an event on the browser-side Meta Pixel.
   * This tracks conversions in the Meta Pixel UI.
   * @param eventName - Event name (PageView, Lead, Purchase, etc.)
   * @param customData - Optional custom data for the event
   */
  public fireClientMetaEvent(
    eventName: string,
    customData?: Record<string, unknown>
  ): void {
    if (!hasTrackingConsent()) {
      if (this.debug) {
        console.info('[Pixel] Meta event skipped — no tracking consent')
      }
      return
    }

    if (!this.metaPixelId || !window.fbq) {
      if (this.debug) {
        console.warn('[Pixel] Meta Pixel not available')
      }
      return
    }

    const eventData = customData || {}
    window.fbq('track', eventName, eventData)

  }

  /**
   * Fire an event on the browser-side Google Ads (gtag).
   * @param eventName - Event name or conversion ID
   * @param customData - Optional custom data for the event
   */
  public fireClientGoogleEvent(
    eventName: string,
    customData?: Record<string, unknown>
  ): void {
    if (!hasTrackingConsent()) {
      if (this.debug) {
        console.info('[Pixel] Google event skipped — no tracking consent')
      }
      return
    }

    if (!window.gtag) {
      if (this.debug) {
        console.warn('[Pixel] Google Ads not available')
      }
      return
    }

    const eventData = customData || {}
    window.gtag('event', eventName, eventData)

  }

  /**
   * Send an event to Meta CAPI for server-side conversion tracking.
   * Provides better event matching, lower pixel wait, and cross-domain tracking.
   * @param event - StowStack event data
   * @returns Promise resolving to the API response
   */
  public async fireServerMetaEvent(event: StowStackEvent): Promise<PixelApiResponse | null> {
    if (!this.metaPixelId) {
      if (this.debug) {
        console.warn('[Pixel] Meta Pixel not configured')
      }
      return null
    }

    // Add client context if not provided
    const eventData = {
      ...event,
      event_time: event.event_time || Math.floor(Date.now() / 1000),
      event_id: event.event_id || this.generateEventId(),
    }

    try {
      const response = await fetch(this.capiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      return data
    } catch (error) {
      console.error('[Pixel] Meta CAPI error:', error)
      return null
    }
  }

  /**
   * Send a conversion to Google Ads API for server-side tracking.
   * Provides better matching and attribution.
   * @param event - StowStack event data
   * @returns Promise resolving to the API response
   */
  public async fireServerGoogleEvent(event: StowStackEvent): Promise<PixelApiResponse | null> {
    if (!this.googleConversionId) {
      if (this.debug) {
        console.warn('[Pixel] Google Ads not configured')
      }
      return null
    }

    const eventData = {
      ...event,
      event_time: event.event_time || Math.floor(Date.now() / 1000),
      conversion_id: this.googleConversionId,
      conversion_label: this.googleConversionLabel,
      gclid: event.gclid || this.getGclid(),
    }

    try {
      const response = await fetch(this.googleConversionEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      return data
    } catch (error) {
      console.error('[Pixel] Google Conversion error:', error)
      return null
    }
  }

  /**
   * Send a conversion to both Meta and Google simultaneously.
   * This is the primary method for tracking conversions.
   * Handles deduplication with event_id.
   * @param event - StowStack event data
   * @returns Promise resolving to { meta: response, google: response }
   */
  public async sendConversion(event: StowStackEvent): Promise<ConversionResult> {
    // Enrich event with auto-captured data
    const enrichedEvent = {
      ...event,
      gclid: event.gclid || this.getGclid(),
      fbclid: event.fbclid || this.getFbclid(),
      event_id: event.event_id || this.generateEventId(),
    }

    // Fire both browser pixels
    this.fireClientMetaEvent(enrichedEvent.event_name, enrichedEvent.custom_data)
    this.fireClientGoogleEvent(enrichedEvent.event_name, enrichedEvent.custom_data)

    // Fire both server-side APIs in parallel
    const [metaResponse, googleResponse] = await Promise.all([
      this.fireServerMetaEvent(enrichedEvent),
      this.fireServerGoogleEvent(enrichedEvent),
    ])

    return {
      meta: metaResponse,
      google: googleResponse,
    }
  }

  /**
   * Track a page view.
   */
  public trackPageView(): void {
    this.fireClientMetaEvent('PageView')
    this.fireClientGoogleEvent('page_view')

  }

  /**
   * Track a lead / form submission.
   * @param userData - User information from form
   * @param value - Optional lead value
   */
  public async trackLead(
    userData: StowStackEvent['user_data'],
    value?: number
  ): Promise<ConversionResult> {
    return this.sendConversion({
      event_name: 'Lead',
      user_data: userData,
      custom_data: {
        value: value,
        currency: 'USD',
        content_name: 'Audit Form Lead',
      },
    })
  }

  /**
   * Track a reservation initiation (move-in started).
   * @param userData - User information
   * @param value - Reservation value
   */
  public async trackReservationStart(
    userData: StowStackEvent['user_data'],
    value?: number
  ): Promise<ConversionResult> {
    return this.sendConversion({
      event_name: 'InitiateCheckout',
      user_data: userData,
      custom_data: {
        value: value,
        currency: 'USD',
        content_name: 'Reservation Started',
        content_type: 'reservation',
      },
    })
  }

  /**
   * Track a move-in completion / purchase.
   * @param userData - User information
   * @param value - Move-in revenue
   */
  public async trackMoveInCompleted(
    userData: StowStackEvent['user_data'],
    value: number
  ): Promise<ConversionResult> {
    return this.sendConversion({
      event_name: 'Purchase',
      user_data: userData,
      custom_data: {
        value: value,
        currency: 'USD',
        content_name: 'Move-In Completed',
        content_type: 'move_in',
      },
    })
  }

  /**
   * Track a unit view / ViewContent.
   * @param userData - User information (optional)
   * @param unitData - Unit information
   */
  public async trackUnitViewed(
    userData: StowStackEvent['user_data'] | undefined,
    unitData?: {
      unit_id?: string
      unit_size?: string
      unit_type?: string
      price?: number
    }
  ): Promise<ConversionResult> {
    return this.sendConversion({
      event_name: 'ViewContent',
      user_data: userData,
      custom_data: {
        value: unitData?.price,
        currency: 'USD',
        content_name: `${unitData?.unit_size} ${unitData?.unit_type}`,
        content_id: unitData?.unit_id,
        content_type: 'unit',
      },
    })
  }

  /**
   * Enable debug logging.
   */
  public setDebug(debug: boolean): void {
    this.debug = debug
  }
}

/**
 * Global pixel instance.
 */
let pixelInstance: PixelManager | null = null

/**
 * Initialize the pixel manager.
 * Call this once on app startup with your config.
 * @param config - Pixel configuration
 * @returns PixelManager instance
 */
export function initializePixel(config: PixelConfig): PixelManager {
  if (pixelInstance) {
    console.warn('[Pixel] Already initialized')
    return pixelInstance
  }

  pixelInstance = new PixelManager(config)
  return pixelInstance
}

/**
 * Get the global pixel instance.
 * Must call initializePixel() first.
 * @returns PixelManager instance
 */
export function getPixel(): PixelManager {
  if (!pixelInstance) {
    throw new Error(
      '[Pixel] Must call initializePixel() before using pixel tracking'
    )
  }
  return pixelInstance
}

/**
 * Quick conversion tracking method.
 * @param event - StowStack event
 * @returns Promise resolving to { meta, google } responses
 */
export async function trackConversion(event: StowStackEvent): Promise<ConversionResult> {
  return getPixel().sendConversion(event)
}

/**
 * Quick lead tracking.
 * @param userData - User data from form
 * @param value - Optional lead value
 * @returns Promise resolving to { meta, google } responses
 */
export async function trackLead(
  userData: StowStackEvent['user_data'],
  value?: number
): Promise<ConversionResult> {
  return getPixel().trackLead(userData, value)
}

/**
 * Quick move-in tracking.
 * @param userData - User data
 * @param value - Move-in revenue
 * @returns Promise resolving to { meta, google } responses
 */
export async function trackMoveIn(
  userData: StowStackEvent['user_data'],
  value: number
): Promise<ConversionResult> {
  return getPixel().trackMoveInCompleted(userData, value)
}

export default PixelManager
