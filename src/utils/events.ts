/**
 * Event Taxonomy and Conversion Tracking
 *
 * Defines all tracked conversion events in the StowStack funnel with typed properties.
 * Integrates with Meta Pixel (fbq), Google Analytics (gtag), and custom attribution API.
 * Includes offline event queue for failed events and deduplication.
 */

import { getUtmParams, getVisitorId } from './utm';

// ═══════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Page view event - fired on every page load/navigation
 */
export interface PageViewEvent {
  type: 'page_view';
  page_url: string;
  page_title: string;
  timestamp: number;
}

/**
 * Unit selected - visitor selects a specific storage unit
 */
export interface UnitSelectedEvent {
  type: 'unit_selected';
  unit_id: string;
  unit_size: string; // e.g., "5x5", "10x10"
  unit_type: string; // e.g., "climate_controlled", "standard", "outdoor"
  price: number; // monthly rent in cents
  facility_id: string;
  timestamp: number;
}

/**
 * Reservation started - visitor begins the reservation form
 */
export interface ReservationStartedEvent {
  type: 'reservation_started';
  unit_id: string;
  unit_size: string;
  unit_type: string;
  facility_id: string;
  timestamp: number;
}

/**
 * Reservation completed - visitor successfully reserves a unit
 */
export interface ReservationCompletedEvent {
  type: 'reservation_completed';
  unit_id: string;
  unit_size: string;
  unit_type: string;
  price: number; // monthly rent in cents
  facility_id: string;
  customer_email?: string;
  customer_phone?: string;
  move_in_date?: string; // ISO 8601
  timestamp: number;
}

/**
 * Move-in completed - customer actually moves in
 */
export interface MoveInCompletedEvent {
  type: 'move_in_completed';
  unit_id: string;
  facility_id: string;
  customer_id: string;
  actual_move_in_date: string; // ISO 8601
  monthly_rent: number; // in cents
  timestamp: number;
}

/**
 * Form submitted - any form on the page submitted (audit form, contact form, etc.)
 */
export interface FormSubmittedEvent {
  type: 'form_submitted';
  form_name: string; // e.g., "audit_intake", "contact_form", "demo_request"
  form_fields?: Record<string, string | boolean>; // field names and values (scrubbed of sensitive data)
  timestamp: number;
}

/**
 * Phone call clicked - visitor clicked a phone call button/link
 */
export interface PhoneCallClickedEvent {
  type: 'phone_call_clicked';
  phone_number: string;
  context?: string; // e.g., "header", "footer", "cta_section"
  facility_id?: string;
  timestamp: number;
}

/**
 * CTA clicked - visitor clicked a call-to-action button
 */
export interface CtaClickedEvent {
  type: 'cta_clicked';
  cta_text: string;
  cta_section?: string; // e.g., "hero", "pricing", "footer"
  cta_action: string; // e.g., "start_audit", "schedule_demo", "contact_sales"
  facility_id?: string;
  timestamp: number;
}

/**
 * Union type of all conversion events
 */
export type ConversionEvent =
  | PageViewEvent
  | UnitSelectedEvent
  | ReservationStartedEvent
  | ReservationCompletedEvent
  | MoveInCompletedEvent
  | FormSubmittedEvent
  | PhoneCallClickedEvent
  | CtaClickedEvent;

/**
 * Event with attribution data
 */
export interface AttributedEvent {
  event: ConversionEvent;
  visitor_id: string;
  utm_params: Record<string, string | undefined>;
  session_timestamp: number;
}

/**
 * Queued event for offline/retry scenarios
 */
export interface QueuedEvent {
  id: string;
  event: AttributedEvent;
  queued_at: number;
  retry_count: number;
  last_error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  EVENT_QUEUE: 'stowstack_event_queue',
  EVENT_DEDUP: 'stowstack_event_dedup',
} as const;

const DEDUP_WINDOW_MS = 5000; // 5 second window for duplicate detection
const MAX_QUEUE_SIZE = 50;
const MAX_RETRY_ATTEMPTS = 3;

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a unique event ID for deduplication
 */
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create deduplication key from event
 */
function getEventDeduplicationKey(event: ConversionEvent): string {
  const { type } = event;

  switch (type) {
    case 'page_view':
      return `${type}-${event.page_url}`;
    case 'unit_selected':
      return `${type}-${event.facility_id}-${event.unit_id}`;
    case 'reservation_started':
      return `${type}-${event.facility_id}-${event.unit_id}`;
    case 'reservation_completed':
      return `${type}-${event.facility_id}-${event.unit_id}`;
    case 'move_in_completed':
      return `${type}-${event.facility_id}-${event.customer_id}`;
    case 'form_submitted':
      return `${type}-${event.form_name}`;
    case 'phone_call_clicked':
      return `${type}-${event.phone_number}`;
    case 'cta_clicked':
      return `${type}-${event.cta_text}`;
    default:
      return `${type}-${Date.now()}`;
  }
}

/**
 * Check if event is a duplicate within the dedup window
 */
function isDuplicateEvent(event: ConversionEvent): boolean {
  try {
    const dedupKey = getEventDeduplicationKey(event);
    const stored = sessionStorage.getItem(STORAGE_KEYS.EVENT_DEDUP);

    if (!stored) {
      recordEventDedup(dedupKey);
      return false;
    }

    const dedupMap = JSON.parse(stored) as Record<string, number>;
    const lastTime = dedupMap[dedupKey];

    if (!lastTime) {
      recordEventDedup(dedupKey);
      return false;
    }

    const isWithinWindow = Date.now() - lastTime < DEDUP_WINDOW_MS;
    if (!isWithinWindow) {
      recordEventDedup(dedupKey);
    }

    return isWithinWindow;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[Events] Failed to check for duplicates:', e);
    }
    return false;
  }
}

/**
 * Record event deduplication timestamp
 */
function recordEventDedup(dedupKey: string): void {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEYS.EVENT_DEDUP);
    let dedupMap = {} as Record<string, number>;

    if (stored) {
      dedupMap = JSON.parse(stored);
    }

    dedupMap[dedupKey] = Date.now();
    sessionStorage.setItem(STORAGE_KEYS.EVENT_DEDUP, JSON.stringify(dedupMap));
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[Events] Failed to record event dedup:', e);
    }
  }
}

/**
 * Add event to offline queue
 */
function enqueueEvent(attributedEvent: AttributedEvent): void {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEYS.EVENT_QUEUE);
    const queue: QueuedEvent[] = stored ? JSON.parse(stored) : [];

    // Trim queue if it gets too large
    if (queue.length >= MAX_QUEUE_SIZE) {
      queue.shift();
    }

    const queuedEvent: QueuedEvent = {
      id: generateEventId(),
      event: attributedEvent,
      queued_at: Date.now(),
      retry_count: 0,
    };

    queue.push(queuedEvent);
    sessionStorage.setItem(STORAGE_KEYS.EVENT_QUEUE, JSON.stringify(queue));

  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[Events] Failed to enqueue event:', e);
    }
  }
}

/**
 * Get all queued events
 */
export function getQueuedEvents(): QueuedEvent[] {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEYS.EVENT_QUEUE);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[Events] Failed to get queued events:', e);
    }
    return [];
  }
}

/**
 * Remove queued event after successful transmission
 */
export function removeQueuedEvent(queuedEventId: string): void {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEYS.EVENT_QUEUE);
    if (!stored) return;

    const queue = JSON.parse(stored) as QueuedEvent[];
    const filtered = queue.filter(q => q.id !== queuedEventId);

    if (filtered.length === 0) {
      sessionStorage.removeItem(STORAGE_KEYS.EVENT_QUEUE);
    } else {
      sessionStorage.setItem(STORAGE_KEYS.EVENT_QUEUE, JSON.stringify(filtered));
    }

  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[Events] Failed to remove queued event:', e);
    }
  }
}

/**
 * Update retry count for queued event
 */
export function incrementQueuedEventRetry(queuedEventId: string, error?: string): void {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEYS.EVENT_QUEUE);
    if (!stored) return;

    const queue = JSON.parse(stored) as QueuedEvent[];
    const event = queue.find(q => q.id === queuedEventId);

    if (event) {
      event.retry_count++;
      event.last_error = error;

      if (event.retry_count >= MAX_RETRY_ATTEMPTS) {
        removeQueuedEvent(queuedEventId);
      } else {
        sessionStorage.setItem(STORAGE_KEYS.EVENT_QUEUE, JSON.stringify(queue));
      }
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[Events] Failed to increment queued event retry:', e);
    }
  }
}

/**
 * Fire event to Meta Pixel (Facebook Pixel)
 */
function fireMetaPixelEvent(event: ConversionEvent): void {
  try {
    const fbq = (window as any).fbq;
    if (!fbq) {
      if (import.meta.env.DEV) {
        console.warn('[Events] Meta Pixel not initialized');
      }
      return;
    }

    switch (event.type) {
      case 'page_view':
        fbq('track', 'PageView');
        break;
      case 'unit_selected':
        fbq('track', 'ViewContent', {
          content_name: `${event.unit_size} ${event.unit_type}`,
          content_type: 'product',
          value: event.price / 100,
          currency: 'USD',
        });
        break;
      case 'reservation_started':
        fbq('track', 'InitiateCheckout', {
          content_name: `${event.unit_size} ${event.unit_type}`,
          content_type: 'product',
        });
        break;
      case 'reservation_completed':
        fbq('track', 'Purchase', {
          content_name: `${event.unit_size} ${event.unit_type}`,
          content_type: 'product',
          value: event.price / 100,
          currency: 'USD',
        });
        break;
      case 'move_in_completed':
        fbq('track', 'CompleteRegistration', {
          content_name: 'Move-in Completed',
          value: event.monthly_rent / 100,
          currency: 'USD',
        });
        break;
      case 'form_submitted':
        fbq('track', 'Lead', {
          content_name: event.form_name,
        });
        break;
      case 'phone_call_clicked':
        fbq('track', 'Contact');
        break;
      case 'cta_clicked':
        fbq('track', 'FindLocation', {
          content_name: event.cta_text,
        });
        break;
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[Events] Failed to fire Meta Pixel event:', e);
    }
  }
}

/**
 * Fire event to Google Analytics (gtag)
 */
function fireGoogleAnalyticsEvent(event: ConversionEvent): void {
  try {
    const gtag = (window as any).gtag;
    if (!gtag) {
      if (import.meta.env.DEV) {
        console.warn('[Events] Google Analytics not initialized');
      }
      return;
    }

    switch (event.type) {
      case 'page_view':
        gtag('event', 'page_view');
        break;
      case 'unit_selected':
        gtag('event', 'view_item', {
          items: [
            {
              item_id: event.unit_id,
              item_name: `${event.unit_size} ${event.unit_type}`,
              price: event.price / 100,
              item_category: 'storage_unit',
            },
          ],
        });
        break;
      case 'reservation_started':
        gtag('event', 'begin_checkout', {
          items: [
            {
              item_id: event.unit_id,
              item_name: `${event.unit_size} ${event.unit_type}`,
              item_category: 'storage_unit',
            },
          ],
        });
        break;
      case 'reservation_completed':
        gtag('event', 'purchase', {
          items: [
            {
              item_id: event.unit_id,
              item_name: `${event.unit_size} ${event.unit_type}`,
              price: event.price / 100,
              item_category: 'storage_unit',
            },
          ],
          value: event.price / 100,
          currency: 'USD',
        });
        break;
      case 'move_in_completed':
        gtag('event', 'sign_up', {
          value: event.monthly_rent / 100,
          currency: 'USD',
        });
        break;
      case 'form_submitted':
        gtag('event', 'generate_lead', {
          form_name: event.form_name,
        });
        break;
      case 'phone_call_clicked':
        gtag('event', 'phone_call_clicked');
        break;
      case 'cta_clicked':
        gtag('event', 'cta_clicked', {
          cta_text: event.cta_text,
          cta_action: event.cta_action,
        });
        break;
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[Events] Failed to fire Google Analytics event:', e);
    }
  }
}

/**
 * Fire event to custom StowStack attribution API
 */
async function fireAttributionApiEvent(attributedEvent: AttributedEvent): Promise<boolean> {
  try {
    const response = await fetch('/api/track-conversion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(attributedEvent),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Attribution API error: ${response.status} ${error}`);
    }

    return true;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error('[Events] Failed to send attribution API event:', e);
    }
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Track a conversion event
 * Fires to Meta Pixel, Google Analytics, and custom attribution API
 * Includes automatic deduplication and offline queuing
 */
export async function trackConversion(event: ConversionEvent): Promise<void> {
  // Check for duplicates
  if (isDuplicateEvent(event)) {
    return;
  }

  // Get attribution data
  const visitorId = getVisitorId();
  const utmParams = getUtmParams();

  const attributedEvent: AttributedEvent = {
    event,
    visitor_id: visitorId,
    utm_params: utmParams,
    session_timestamp: Date.now(),
  };

  // Fire to third-party integrations
  fireMetaPixelEvent(event);
  fireGoogleAnalyticsEvent(event);

  // Fire to custom API with retry logic
  const apiSuccess = await fireAttributionApiEvent(attributedEvent);

  if (!apiSuccess) {
    enqueueEvent(attributedEvent);
  }
}

/**
 * Process queued events (call this periodically or on visibility change)
 */
export async function processEventQueue(): Promise<void> {
  const queue = getQueuedEvents();

  if (queue.length === 0) {
    return;
  }

  for (const queuedEvent of queue) {
    if (queuedEvent.retry_count >= MAX_RETRY_ATTEMPTS) {
      removeQueuedEvent(queuedEvent.id);
      continue;
    }

    const success = await fireAttributionApiEvent(queuedEvent.event);

    if (success) {
      removeQueuedEvent(queuedEvent.id);
    } else {
      incrementQueuedEventRetry(queuedEvent.id);
    }

    // Small delay between retries
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Set up automatic queue processing on visibility change
 */
export function setupEventQueueProcessing(): void {
  if (typeof document === 'undefined') return;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      processEventQueue().catch(e => {
        if (import.meta.env.DEV) {
          console.error('[Events] Queue processing error:', e);
        }
      });
    }
  });

  // Also process queue every 30 seconds
  setInterval(() => {
    processEventQueue().catch(e => {
      if (import.meta.env.DEV) {
        console.error('[Events] Queue processing error:', e);
      }
    });
  }, 30000);
}

/**
 * Clear all events from queue (for testing or privacy)
 */
export function clearEventQueue(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.EVENT_QUEUE);
    sessionStorage.removeItem(STORAGE_KEYS.EVENT_DEDUP);

  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[Events] Failed to clear event queue:', e);
    }
  }
}
