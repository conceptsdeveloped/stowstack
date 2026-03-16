/**
 * Attribution Mapping and Multi-Touch Attribution Utility
 *
 * Links UTM parameters to conversion events and builds complete attribution chains.
 * Supports first-touch, last-touch, and linear attribution models.
 * Provides attribution data bundles for API calls and reporting.
 */

import {
  getUtmParams,
  getVisitorId,
  getFirstTouchUtm,
  getLastTouchUtm,
  getCurrentSession,
  type UtmParams,
  type UtmSession,
  type FirstTouchAttribution,
  type LastTouchAttribution,
} from './utm';

import { getQueuedEvents, type QueuedEvent } from './events';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Single touch point in the customer journey
 */
export interface TouchPoint {
  timestamp: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  stow_ad_id?: string;
  stow_lp_id?: string;
  landing_page_url: string;
  referrer: string;
}

/**
 * Complete attribution chain for a conversion
 */
export interface AttributionChain {
  visitor_id: string;
  first_touch: TouchPoint;
  last_touch: TouchPoint;
  touch_count: number;
  session_duration_ms: number;
  events_triggered: string[]; // event types that occurred
  conversion_event_type: string;
  conversion_timestamp: number;
}

/**
 * Attribution credit distribution across attribution model
 */
export interface AttributionCredit {
  visitor_id: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string;
  utm_term?: string;
  stow_ad_id?: string;
  stow_lp_id?: string;
  first_touch_credit: number;
  last_touch_credit: number;
  linear_credit: number;
  time_decay_credit: number;
  position_based_credit: number;
}

/**
 * Complete attribution data for API submission
 */
export interface CompleteAttributionData {
  visitor_id: string;
  current_session: UtmSession;
  first_touch: FirstTouchAttribution;
  last_touch: LastTouchAttribution;
  attribution_chain: AttributionChain | null;
  pending_events: QueuedEvent[];
  calculated_at: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a touch point from UTM data
 */
function createTouchPoint(
  utmParams: UtmParams,
  landingPageUrl: string,
  referrer: string,
  timestamp: number
): TouchPoint {
  return {
    timestamp,
    utm_source: utmParams.utm_source,
    utm_medium: utmParams.utm_medium,
    utm_campaign: utmParams.utm_campaign,
    utm_content: utmParams.utm_content,
    utm_term: utmParams.utm_term,
    stow_ad_id: utmParams.stow_ad_id,
    stow_lp_id: utmParams.stow_lp_id,
    landing_page_url: landingPageUrl,
    referrer,
  };
}

/**
 * Calculate time decay credit weight
 * More recent touches get exponentially higher weight
 * (Future use for multi-touch attribution models)
 */
export function calculateTimeDecayWeight(
  touchTimestamp: number,
  currentTimestamp: number,
  totalTouches: number
): number {
  if (totalTouches === 0) return 0;
  if (totalTouches === 1) return 1;

  const ageMs = currentTimestamp - touchTimestamp;
  const ageHours = ageMs / (1000 * 60 * 60);

  // Exponential decay: weight = e^(-0.1 * ageHours)
  // More recent = higher weight
  return Math.exp(-0.1 * ageHours);
}

/**
 * Calculate position-based credit (40% first, 40% last, 20% middle)
 * (Future use for multi-touch attribution models)
 */
export function calculatePositionBasedCredit(
  touchPosition: number,
  totalTouches: number
): number {
  if (totalTouches === 1) return 1;
  if (totalTouches === 2) {
    return touchPosition === 0 ? 0.5 : 0.5;
  }

  if (touchPosition === 0) return 0.4; // First touch
  if (touchPosition === totalTouches - 1) return 0.4; // Last touch
  return 0.2 / (totalTouches - 2); // Evenly split remaining 20%
}

/**
 * Build channel from utm_source and utm_medium
 */
function buildChannel(source?: string, medium?: string): string {
  if (!source && !medium) return 'direct';
  if (!medium) return source || 'unknown';
  return `${source || 'unknown'}_${medium}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build attribution chain from current session and UTM data
 * Maps the complete journey from first touch to conversion
 */
export function buildAttributionChain(
  conversionEventType: string,
  conversionTimestamp: number
): AttributionChain | null {
  const currentSession = getCurrentSession();
  const firstTouch = getFirstTouchUtm();
  const lastTouch = getLastTouchUtm();
  const visitorId = getVisitorId();

  if (!currentSession || !firstTouch || !lastTouch) {
    return null;
  }

  const firstTouchPoint = createTouchPoint(
    firstTouch.utm_params,
    'first-visit', // This would ideally be captured
    'first-visit',
    firstTouch.first_visit_timestamp
  );

  const lastTouchPoint = createTouchPoint(
    lastTouch.utm_params,
    currentSession.landing_page_url,
    currentSession.referrer,
    lastTouch.last_visit_timestamp
  );

  const sessionDurationMs = conversionTimestamp - firstTouch.first_visit_timestamp;
  const touchCount = 1; // Would be 2+ if we tracked multiple sessions

  const queuedEvents = getQueuedEvents();
  const eventTypes = queuedEvents.map(q => q.event.event.type);

  return {
    visitor_id: visitorId,
    first_touch: firstTouchPoint,
    last_touch: lastTouchPoint,
    touch_count: touchCount,
    session_duration_ms: sessionDurationMs,
    events_triggered: eventTypes,
    conversion_event_type: conversionEventType,
    conversion_timestamp: conversionTimestamp,
  };
}

/**
 * Calculate attribution credits across multiple attribution models
 */
export function calculateAttributionCredits(): AttributionCredit | null {
  const lastTouch = getLastTouchUtm();
  if (!lastTouch) {
    return null;
  }

  const visitorId = getVisitorId();
  const { utm_source, utm_medium, utm_campaign, utm_content, utm_term, stow_ad_id, stow_lp_id } = lastTouch.utm_params;

  // First-touch attribution: 100% credit to first touch
  // Last-touch attribution: 100% credit to last touch
  // Linear attribution: split evenly across all touches
  // Time-decay: exponential weight to recent touches
  // Position-based: 40% first, 40% last, 20% middle

  const firstTouch = getFirstTouchUtm();
  const currentTime = Date.now();

  // For now, we have first and last touch
  // In a more complex system with multi-session tracking, these would be weighted
  const creditFraction = firstTouch && lastTouch && firstTouch.first_visit_timestamp !== lastTouch.last_visit_timestamp
    ? 0.5
    : 1;

  return {
    visitor_id: visitorId,
    utm_source: utm_source || 'direct',
    utm_medium: utm_medium || 'direct',
    utm_campaign: utm_campaign || 'untagged',
    utm_content,
    utm_term,
    stow_ad_id,
    stow_lp_id,
    first_touch_credit: firstTouch && firstTouch.first_visit_timestamp === currentTime ? creditFraction : 0,
    last_touch_credit: lastTouch ? creditFraction : 0,
    linear_credit: creditFraction,
    time_decay_credit: creditFraction,
    position_based_credit: creditFraction,
  };
}

/**
 * Get complete attribution data bundle for API calls
 * Includes UTM, visitor ID, and attribution chain for a conversion
 */
export function getAttributionDataBundle(): CompleteAttributionData | null {
  const visitorId = getVisitorId();
  const currentSession = getCurrentSession();
  const firstTouch = getFirstTouchUtm();
  const lastTouch = getLastTouchUtm();
  const pendingEvents = getQueuedEvents();

  if (!currentSession || !firstTouch || !lastTouch) {
    return null;
  }

  // Determine if there was a conversion based on queued events
  const conversionEvent = pendingEvents.find(
    q => q.event.event.type === 'reservation_completed' || q.event.event.type === 'move_in_completed'
  );

  const attributionChain = conversionEvent
    ? buildAttributionChain(conversionEvent.event.event.type, conversionEvent.event.session_timestamp)
    : null;

  return {
    visitor_id: visitorId,
    current_session: currentSession,
    first_touch: firstTouch,
    last_touch: lastTouch,
    attribution_chain: attributionChain,
    pending_events: pendingEvents,
    calculated_at: Date.now(),
  };
}

/**
 * Get attribution channel breakdown for reporting
 * Groups by utm_source and utm_medium
 */
export function getAttributionChannelBreakdown(): {
  first_touch_channel: string;
  last_touch_channel: string;
  current_channel: string;
} {
  const firstTouch = getFirstTouchUtm();
  const lastTouch = getLastTouchUtm();
  const currentUtm = getUtmParams();

  const firstTouchChannel = firstTouch
    ? buildChannel(firstTouch.utm_params.utm_source, firstTouch.utm_params.utm_medium)
    : 'direct';

  const lastTouchChannel = lastTouch
    ? buildChannel(lastTouch.utm_params.utm_source, lastTouch.utm_params.utm_medium)
    : 'direct';

  const currentChannel = buildChannel(currentUtm.utm_source, currentUtm.utm_medium);

  return {
    first_touch_channel: firstTouchChannel,
    last_touch_channel: lastTouchChannel,
    current_channel: currentChannel,
  };
}

/**
 * Get campaign sequence for this visitor
 */
export function getCampaignSequence(): string[] {
  const campaigns = [];

  const firstTouch = getFirstTouchUtm();
  if (firstTouch?.utm_params.utm_campaign) {
    campaigns.push(firstTouch.utm_params.utm_campaign);
  }

  const lastTouch = getLastTouchUtm();
  if (
    lastTouch?.utm_params.utm_campaign &&
    firstTouch?.utm_params.utm_campaign !== lastTouch.utm_params.utm_campaign
  ) {
    campaigns.push(lastTouch.utm_params.utm_campaign);
  }

  return campaigns;
}

/**
 * Get ad sequence for this visitor
 */
export function getAdSequence(): string[] {
  const ads = [];

  const firstTouch = getFirstTouchUtm();
  if (firstTouch?.utm_params.stow_ad_id) {
    ads.push(firstTouch.utm_params.stow_ad_id);
  }

  const lastTouch = getLastTouchUtm();
  if (
    lastTouch?.utm_params.stow_ad_id &&
    firstTouch?.utm_params.stow_ad_id !== lastTouch.utm_params.stow_ad_id
  ) {
    ads.push(lastTouch.utm_params.stow_ad_id);
  }

  return ads;
}

/**
 * Get landing page sequence for this visitor
 */
export function getLandingPageSequence(): string[] {
  const pages = [];

  const firstTouch = getFirstTouchUtm();
  if (firstTouch) {
    // In a real system, we'd capture the landing page URL separately
    pages.push(`first-touch-${firstTouch.utm_params.stow_lp_id || 'default'}`);
  }

  const currentSession = getCurrentSession();
  if (currentSession) {
    pages.push(currentSession.landing_page_url);
  }

  return pages;
}

/**
 * Check if visitor is in remarketing/retargeting context
 */
export function isRetargetingVisitor(): boolean {
  const firstTouch = getFirstTouchUtm();
  const lastTouch = getLastTouchUtm();

  if (!firstTouch || !lastTouch) {
    return false;
  }

  // Visitor is in remarketing context if:
  // 1. They have both first and last touch data
  // 2. The source/medium combination suggests retargeting
  const lastTouchMedium = lastTouch.utm_params.utm_medium?.toLowerCase() || '';
  const isRetargetingMedium = lastTouchMedium.includes('remarketing') ||
    lastTouchMedium.includes('retargeting') ||
    lastTouchMedium.includes('prospecting');

  return isRetargetingMedium || firstTouch.first_visit_timestamp !== lastTouch.last_visit_timestamp;
}

/**
 * Get days since first touch
 */
export function getDaysSinceFirstTouch(): number {
  const firstTouch = getFirstTouchUtm();
  if (!firstTouch) {
    return 0;
  }

  const now = Date.now();
  const firstTouchMs = firstTouch.first_visit_timestamp;
  const diffMs = now - firstTouchMs;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get time since last touch in seconds
 */
export function getSecondsSinceLastTouch(): number {
  const lastTouch = getLastTouchUtm();
  if (!lastTouch) {
    return 0;
  }

  const now = Date.now();
  const lastTouchMs = lastTouch.last_visit_timestamp;
  const diffMs = now - lastTouchMs;
  const diffSeconds = Math.floor(diffMs / 1000);

  return diffSeconds;
}

/**
 * Serialize attribution data to JSON for API submission
 */
export function serializeAttributionDataForApi(): string | null {
  const data = getAttributionDataBundle();
  if (!data) {
    return null;
  }

  try {
    return JSON.stringify(data, null, 2);
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error('[Attribution] Failed to serialize attribution data:', e);
    }
    return null;
  }
}

/**
 * Create a concise attribution summary for logging/debugging
 */
export function getAttributionSummary(): Record<string, unknown> {
  const firstTouch = getFirstTouchUtm();
  const lastTouch = getLastTouchUtm();
  const channels = getAttributionChannelBreakdown();
  const campaigns = getCampaignSequence();
  const ads = getAdSequence();

  return {
    visitor_id: getVisitorId(),
    days_since_first_touch: getDaysSinceFirstTouch(),
    seconds_since_last_touch: getSecondsSinceLastTouch(),
    first_touch_channel: channels.first_touch_channel,
    last_touch_channel: channels.last_touch_channel,
    current_channel: channels.current_channel,
    campaigns: campaigns,
    ads: ads,
    is_retargeting: isRetargetingVisitor(),
    first_touch_utm_source: firstTouch?.utm_params.utm_source,
    last_touch_utm_source: lastTouch?.utm_params.utm_source,
  };
}

/**
 * Log attribution data to console for debugging
 */
export function logAttributionDebug(): void {
  if (!import.meta.env.DEV) {
    return;
  }

  console.group('[Attribution] Debug Summary');
  console.table(getAttributionSummary());
  console.log('[Attribution] Full Data:', getAttributionDataBundle());
  console.groupEnd();
}
