/**
 * UTM Parameter Capture and Tracking Utility
 *
 * Captures UTM parameters from URL query strings and stores them in sessionStorage
 * and localStorage for cross-session attribution tracking. Generates and maintains
 * a unique visitor_id for the browser session.
 *
 * Standard UTM params: utm_source, utm_medium, utm_campaign, utm_content, utm_term
 * Custom StowStack params: stow_ad_id, stow_lp_id, stow_facility_id
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  stow_ad_id?: string;
  stow_lp_id?: string;
  stow_facility_id?: string;
  [key: string]: string | undefined;
}

export interface UtmSession {
  visitor_id: string;
  utm_params: UtmParams;
  landing_page_url: string;
  referrer: string;
  timestamp: number;
  first_visit_timestamp: number;
}

export interface FirstTouchAttribution {
  visitor_id: string;
  utm_params: UtmParams;
  first_visit_timestamp: number;
}

export interface LastTouchAttribution {
  visitor_id: string;
  utm_params: UtmParams;
  last_visit_timestamp: number;
}

export interface AttributionData {
  visitor_id: string;
  first_touch: FirstTouchAttribution;
  last_touch: LastTouchAttribution;
  current_session: UtmSession;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  VISITOR_ID: 'stowstack_visitor_id',
  CURRENT_SESSION: 'stowstack_current_session',
  FIRST_TOUCH: 'stowstack_first_touch',
  LAST_TOUCH: 'stowstack_last_touch',
  SESSION_HISTORY: 'stowstack_session_history',
} as const;

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
// const VISITOR_ID_EXPIRY_DAYS = 365; // Future: implement expiry logic

const UTM_PARAM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

const CUSTOM_PARAM_KEYS = [
  'stow_ad_id',
  'stow_lp_id',
  'stow_facility_id',
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a UUID v4 for visitor tracking
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Parse query parameters from URL
 */
function getQueryParams(url: string = typeof window !== 'undefined' ? window.location.href : ''): Record<string, string> {
  const params: Record<string, string> = {};
  const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://stowstack.co');

  urlObj.searchParams.forEach((value, key) => {
    params[key.toLowerCase()] = value;
  });

  return params;
}

/**
 * Extract UTM and custom StowStack parameters from query params
 */
function extractUtmParams(queryParams: Record<string, string>): UtmParams {
  const utmParams: UtmParams = {};

  // Extract standard UTM parameters
  for (const key of UTM_PARAM_KEYS) {
    if (queryParams[key]) {
      utmParams[key] = queryParams[key];
    }
  }

  // Extract custom StowStack parameters
  for (const key of CUSTOM_PARAM_KEYS) {
    if (queryParams[key]) {
      utmParams[key] = queryParams[key];
    }
  }

  return utmParams;
}

/**
 * Get or create visitor ID
 */
function getOrCreateVisitorId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.VISITOR_ID);
    if (stored) {
      return stored;
    }
  } catch (e) {
    // localStorage might not be available in some contexts
    if (import.meta.env.DEV) {
      console.warn('[UTM] Failed to read localStorage:', e);
    }
  }

  const newId = generateUUID();
  try {
    localStorage.setItem(STORAGE_KEYS.VISITOR_ID, newId);
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[UTM] Failed to write localStorage:', e);
    }
  }

  return newId;
}

/**
 * Check if current session is still active
 */
function isSessionActive(lastSessionTimestamp: number): boolean {
  const now = Date.now();
  return now - lastSessionTimestamp < SESSION_TIMEOUT_MS;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize UTM tracking on page load
 * Call this once on app initialization
 */
export function initUtmTracking(): void {
  if (typeof window === 'undefined') return;

  const visitorId = getOrCreateVisitorId();
  const queryParams = getQueryParams();
  const utmParams = extractUtmParams(queryParams);

  const now = Date.now();
  const currentUrl = window.location.href;
  const referrer = document.referrer;

  // Check if we're continuing an existing session
  let firstVisitTimestamp = now;
  try {
    const currentSession = sessionStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
    if (currentSession) {
      const parsed = JSON.parse(currentSession) as UtmSession;
      if (isSessionActive(parsed.timestamp)) {
        firstVisitTimestamp = parsed.first_visit_timestamp;
      }
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[UTM] Failed to parse current session:', e);
    }
  }

  // Create current session object
  const session: UtmSession = {
    visitor_id: visitorId,
    utm_params: utmParams,
    landing_page_url: currentUrl,
    referrer,
    timestamp: now,
    first_visit_timestamp: firstVisitTimestamp,
  };

  // Save to sessionStorage
  try {
    sessionStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[UTM] Failed to write sessionStorage:', e);
    }
  }

  // Update first-touch attribution if this is first visit
  if (firstVisitTimestamp === now) {
    const firstTouch: FirstTouchAttribution = {
      visitor_id: visitorId,
      utm_params: utmParams,
      first_visit_timestamp: now,
    };
    try {
      localStorage.setItem(STORAGE_KEYS.FIRST_TOUCH, JSON.stringify(firstTouch));
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn('[UTM] Failed to write first-touch:', e);
      }
    }
  }

  // Always update last-touch attribution
  const lastTouch: LastTouchAttribution = {
    visitor_id: visitorId,
    utm_params: utmParams,
    last_visit_timestamp: now,
  };
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_TOUCH, JSON.stringify(lastTouch));
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[UTM] Failed to write last-touch:', e);
    }
  }

}

/**
 * Get current session UTM parameters
 */
export function getUtmParams(): UtmParams {
  try {
    const session = sessionStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
    if (session) {
      const parsed = JSON.parse(session) as UtmSession;
      return parsed.utm_params;
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[UTM] Failed to get UTM params:', e);
    }
  }

  return {};
}

/**
 * Get first-touch attribution data
 */
export function getFirstTouchUtm(): FirstTouchAttribution | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.FIRST_TOUCH);
    if (stored) {
      return JSON.parse(stored) as FirstTouchAttribution;
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[UTM] Failed to get first-touch UTM:', e);
    }
  }

  return null;
}

/**
 * Get last-touch attribution data
 */
export function getLastTouchUtm(): LastTouchAttribution | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_TOUCH);
    if (stored) {
      return JSON.parse(stored) as LastTouchAttribution;
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[UTM] Failed to get last-touch UTM:', e);
    }
  }

  return null;
}

/**
 * Get current visitor ID
 */
export function getVisitorId(): string {
  return getOrCreateVisitorId();
}

/**
 * Get current session data
 */
export function getCurrentSession(): UtmSession | null {
  try {
    const session = sessionStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
    if (session) {
      return JSON.parse(session) as UtmSession;
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[UTM] Failed to get current session:', e);
    }
  }

  return null;
}

/**
 * Get complete attribution data including first-touch, last-touch, and current session
 */
export function getAttributionData(): AttributionData | null {
  const visitorId = getVisitorId();
  const firstTouch = getFirstTouchUtm();
  const lastTouch = getLastTouchUtm();
  const currentSession = getCurrentSession();

  if (!firstTouch || !lastTouch || !currentSession) {
    return null;
  }

  return {
    visitor_id: visitorId,
    first_touch: firstTouch,
    last_touch: lastTouch,
    current_session: currentSession,
  };
}

/**
 * Clear all UTM tracking data (for testing or explicit user privacy request)
 */
export function clearUtmTracking(): void {
  const keysToDelete = Object.values(STORAGE_KEYS);

  try {
    keysToDelete.forEach(key => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });

  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[UTM] Failed to clear tracking data:', e);
    }
  }
}

/**
 * Reset session (for manual session boundary)
 */
export function resetSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);

  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[UTM] Failed to reset session:', e);
    }
  }
}

/**
 * Update current session with new UTM parameters (if re-landing with new params)
 */
export function updateSessionUtmParams(newParams: UtmParams): void {
  const currentSession = getCurrentSession();
  if (!currentSession) {
    initUtmTracking();
    return;
  }

  const mergedParams = {
    ...currentSession.utm_params,
    ...newParams,
  };

  const updatedSession: UtmSession = {
    ...currentSession,
    utm_params: mergedParams,
    timestamp: Date.now(),
  };

  try {
    sessionStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(updatedSession));

  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[UTM] Failed to update session UTM params:', e);
    }
  }
}
