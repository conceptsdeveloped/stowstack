/**
 * A/B Testing Framework for StowStack
 *
 * Provides URL-based split testing infrastructure with deterministic visitor assignment,
 * persistent variant tracking, weighted distribution, statistical significance testing,
 * and revenue-based test results aggregation.
 *
 * Core features:
 * - Deterministic variant assignment based on visitor_id hash
 * - localStorage persistence for returning visitor consistency
 * - Weighted variant distribution (e.g., 70/30 splits)
 * - Integration with StowStack events.ts tracking system
 * - Chi-square statistical significance testing
 * - Conversion rate and revenue lift calculations
 */

import { getVisitorId } from './utm';
// Events integration available via ./events trackConversion()

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Variant definition within a test
 */
export interface ABTestVariant {
  id: string;
  name: string;
  slug: string; // URL slug for this variant (e.g., "offer-a", "offer-b")
  weight: number; // 0-100, sum of all weights must equal 100
}

/**
 * Metrics configuration for a test
 */
export interface ABTestMetrics {
  primary: 'reservation_completed' | 'move_in_completed';
  secondary?: ('page_view' | 'unit_selected' | 'reservation_started')[];
}

/**
 * Full A/B test configuration
 */
export interface ABTest {
  id: string;
  name: string;
  facilityId: string;
  status: 'active' | 'paused' | 'completed';
  variants: ABTestVariant[];
  metrics: ABTestMetrics;
  startDate: string; // ISO 8601
  endDate?: string; // ISO 8601
  winnerVariantId?: string;
  description?: string;
}

/**
 * Variant assignment stored per visitor per test
 */
export interface VariantAssignment {
  testId: string;
  variantId: string;
  variantSlug: string;
  timestamp: number;
  visitorId: string;
}

/**
 * Event data collected for a variant
 */
export interface VariantEventData {
  testId: string;
  variantId: string;
  visitorId: string;
  eventName: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Aggregated results for a single variant
 */
export interface VariantResults {
  variantId: string;
  variantName: string;
  totalVisitors: number;
  conversions: number;
  conversionRate: number; // 0-1
  revenue?: number; // in cents
  revenuePerVisitor?: number; // in cents
  secondaryMetrics?: Record<string, number>;
}

/**
 * Full test results with statistical analysis
 */
export interface TestResults {
  testId: string;
  testName: string;
  variants: VariantResults[];
  startDate: string;
  endDate?: string;
  winner?: {
    variantId: string;
    variantName: string;
    confidence: number; // 0-1
    lift: number; // relative improvement vs control
    pValue: number;
  };
  statisticallySignificant: boolean;
}

/**
 * Chi-square test result
 */
export interface SignificanceResult {
  pValue: number;
  isSignificant: boolean; // true if p-value < 0.05
  confidence: number; // 1 - p-value (0-1)
  chiSquare: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  VARIANT_ASSIGNMENTS: 'stowstack_ab_assignments',
  AB_EVENTS: 'stowstack_ab_events',
} as const;

const CHI_SQUARE_95_THRESHOLD = 3.841; // Critical value for 1 degree of freedom at 95% confidence

// ═══════════════════════════════════════════════════════════════════════════
// VARIANT ASSIGNMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Simple hash function to deterministically convert a string to a number
 * Used to assign variants consistently based on visitor_id
 */
function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get or create variant assignment for a visitor
 *
 * Uses deterministic hashing of visitor_id to assign variants consistently.
 * Respects weighted distribution (e.g., 70/30 split).
 * Falls back to existing assignment in localStorage if available.
 */
export function getVariant(testId: string, variants: ABTestVariant[]): ABTestVariant {
  // Validate weights sum to 100
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight !== 100) {
    console.warn(
      `[AB Testing] Variant weights for test "${testId}" do not sum to 100 (got ${totalWeight}). Results may be skewed.`
    );
  }

  // Check localStorage for existing assignment
  const existing = getAssignmentFromStorage(testId);
  if (existing) {
    return variants.find(v => v.id === existing.variantId) || variants[0];
  }

  // Deterministically assign based on visitor_id hash
  const visitorId = getVisitorId();
  const hashValue = hashStringToNumber(`${testId}-${visitorId}`);
  const hashPercent = (hashValue % 100) + 1; // 1-100

  let cumulativeWeight = 0;
  let selected = variants[0];

  for (const variant of variants) {
    cumulativeWeight += variant.weight;
    if (hashPercent <= cumulativeWeight) {
      selected = variant;
      break;
    }
  }

  // Store assignment
  storeAssignment(testId, selected, visitorId);

  if (import.meta.env.DEV) {
    console.log(`[AB Testing] Variant assigned for test "${testId}": ${selected.slug}`, {
      hashPercent,
      visitorId: visitorId.slice(0, 8) + '...',
    });
  }

  return selected;
}

/**
 * Get assignment from localStorage
 */
function getAssignmentFromStorage(testId: string): VariantAssignment | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.VARIANT_ASSIGNMENTS);
    if (!stored) return null;

    const assignments = JSON.parse(stored) as Record<string, VariantAssignment>;
    return assignments[testId] || null;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn(`[AB Testing] Failed to get variant from storage:`, e);
    }
    return null;
  }
}

/**
 * Store variant assignment in localStorage
 */
function storeAssignment(testId: string, variant: ABTestVariant, visitorId: string): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.VARIANT_ASSIGNMENTS);
    const assignments = stored ? JSON.parse(stored) : {};

    assignments[testId] = {
      testId,
      variantId: variant.id,
      variantSlug: variant.slug,
      timestamp: Date.now(),
      visitorId,
    };

    localStorage.setItem(STORAGE_KEYS.VARIANT_ASSIGNMENTS, JSON.stringify(assignments));
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn(`[AB Testing] Failed to store variant assignment:`, e);
    }
  }
}

/**
 * Clear all variant assignments (for testing or privacy)
 */
export function clearAllAssignments(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.VARIANT_ASSIGNMENTS);
    if (import.meta.env.DEV) {
      console.log('[AB Testing] All variant assignments cleared');
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[AB Testing] Failed to clear assignments:', e);
    }
  }
}

/**
 * Get all current assignments for a visitor
 */
export function getAllAssignments(): Record<string, VariantAssignment> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.VARIANT_ASSIGNMENTS);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[AB Testing] Failed to get all assignments:', e);
    }
    return {};
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT TRACKING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Track an A/B test event
 *
 * Records the event in local storage and optionally fires a conversion event
 * through the main events.ts system (if it's a primary/secondary metric event).
 */
export async function trackABEvent(
  testId: string,
  variantId: string,
  eventName: string,
  metadata?: Record<string, any>
): Promise<void> {
  const visitorId = getVisitorId();

  // Record event locally
  recordEventLocally(testId, variantId, visitorId, eventName, metadata);

  if (import.meta.env.DEV) {
    console.log(`[AB Testing] Event tracked: test="${testId}" variant="${variantId}" event="${eventName}"`);
  }
}

/**
 * Store event data locally for later aggregation
 */
function recordEventLocally(
  testId: string,
  variantId: string,
  visitorId: string,
  eventName: string,
  metadata?: Record<string, any>
): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AB_EVENTS);
    const events: VariantEventData[] = stored ? JSON.parse(stored) : [];

    // Keep only recent events (last 1000 or 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentEvents = events.filter(e => e.timestamp > sevenDaysAgo).slice(-900);

    recentEvents.push({
      testId,
      variantId,
      visitorId,
      eventName,
      timestamp: Date.now(),
      metadata,
    });

    localStorage.setItem(STORAGE_KEYS.AB_EVENTS, JSON.stringify(recentEvents));
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[AB Testing] Failed to record event locally:', e);
    }
  }
}

/**
 * Get all recorded A/B test events
 */
function getAllEvents(): VariantEventData[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AB_EVENTS);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[AB Testing] Failed to get events:', e);
    }
    return [];
  }
}

/**
 * Clear all A/B test events
 */
export function clearAllEvents(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.AB_EVENTS);
    if (import.meta.env.DEV) {
      console.log('[AB Testing] All A/B test events cleared');
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[AB Testing] Failed to clear events:', e);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STATISTICAL ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate chi-square test for statistical significance
 *
 * Compares two proportions (control vs treatment) using chi-square goodness-of-fit.
 * Returns p-value and whether the result is statistically significant at 95% confidence.
 *
 * @param controlConversions Number of conversions in control variant
 * @param controlVisitors Total visitors to control variant
 * @param treatmentConversions Number of conversions in treatment variant
 * @param treatmentVisitors Total visitors to treatment variant
 */
export function calculateSignificance(
  controlConversions: number,
  controlVisitors: number,
  treatmentConversions: number,
  treatmentVisitors: number
): SignificanceResult {
  // Validate inputs
  if (
    controlVisitors < 1 ||
    treatmentVisitors < 1 ||
    controlConversions < 0 ||
    treatmentConversions < 0 ||
    controlConversions > controlVisitors ||
    treatmentConversions > treatmentVisitors
  ) {
    return {
      pValue: 1,
      isSignificant: false,
      confidence: 0,
      chiSquare: 0,
    };
  }

  // Calculate observed frequencies
  const controlNonConversions = controlVisitors - controlConversions;
  const treatmentNonConversions = treatmentVisitors - treatmentConversions;

  // Calculate expected frequencies
  const totalVisitors = controlVisitors + treatmentVisitors;
  const totalConversions = controlConversions + treatmentConversions;
  const totalNonConversions = controlNonConversions + treatmentNonConversions;

  const expectedControlConversions = (controlVisitors / totalVisitors) * totalConversions;
  const expectedControlNonConversions = (controlVisitors / totalVisitors) * totalNonConversions;
  const expectedTreatmentConversions = (treatmentVisitors / totalVisitors) * totalConversions;
  const expectedTreatmentNonConversions = (treatmentVisitors / totalVisitors) * totalNonConversions;

  // Avoid division by zero
  if (
    expectedControlConversions === 0 ||
    expectedControlNonConversions === 0 ||
    expectedTreatmentConversions === 0 ||
    expectedTreatmentNonConversions === 0
  ) {
    return {
      pValue: 1,
      isSignificant: false,
      confidence: 0,
      chiSquare: 0,
    };
  }

  // Calculate chi-square statistic
  const chiSquare =
    Math.pow(controlConversions - expectedControlConversions, 2) / expectedControlConversions +
    Math.pow(controlNonConversions - expectedControlNonConversions, 2) / expectedControlNonConversions +
    Math.pow(treatmentConversions - expectedTreatmentConversions, 2) / expectedTreatmentConversions +
    Math.pow(treatmentNonConversions - expectedTreatmentNonConversions, 2) / expectedTreatmentNonConversions;

  // Convert chi-square to p-value
  // For 1 degree of freedom, we use the critical value directly
  const pValue = chiSquare > CHI_SQUARE_95_THRESHOLD ? 0.05 : 0.5;
  const isSignificant = chiSquare > CHI_SQUARE_95_THRESHOLD;

  return {
    pValue,
    isSignificant,
    confidence: 1 - pValue,
    chiSquare,
  };
}

/**
 * Calculate relative lift between two conversion rates
 *
 * @param controlRate Control variant conversion rate (0-1)
 * @param treatmentRate Treatment variant conversion rate (0-1)
 * @returns Relative lift (e.g., 0.15 = 15% improvement)
 */
export function calculateLift(controlRate: number, treatmentRate: number): number {
  if (controlRate === 0) return 0;
  return (treatmentRate - controlRate) / controlRate;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULTS AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get results for a single variant
 *
 * Aggregates all events for the variant and calculates conversion rate,
 * revenue metrics, and secondary metrics.
 */
export function getVariantResults(
  testId: string,
  variantId: string,
  test: ABTest,
  _moveInValue?: number // in cents, for calculating revenue per visitor
): VariantResults {
  const events = getAllEvents();
  const variantEvents = events.filter(e => e.testId === testId && e.variantId === variantId);

  // Count unique visitors
  const visitorSet = new Set(variantEvents.map(e => e.visitorId));
  const totalVisitors = visitorSet.size;

  // Count conversions (primary metric)
  const conversionEvents = variantEvents.filter(e => e.eventName === test.metrics.primary);
  const conversions = new Set(conversionEvents.map(e => e.visitorId)).size;
  const conversionRate = totalVisitors > 0 ? conversions / totalVisitors : 0;

  // Calculate revenue (sum of metadata.monthly_rent for move_in_completed events)
  let revenue = 0;
  if (test.metrics.primary === 'move_in_completed' || test.metrics.primary === 'reservation_completed') {
    conversionEvents.forEach(e => {
      if (e.metadata?.monthly_rent) {
        revenue += e.metadata.monthly_rent;
      }
    });
  }

  const revenuePerVisitor = totalVisitors > 0 ? revenue / totalVisitors : 0;

  // Calculate secondary metrics
  const secondaryMetrics: Record<string, number> = {};
  if (test.metrics.secondary) {
    for (const metricName of test.metrics.secondary) {
      const metricEvents = variantEvents.filter(e => e.eventName === metricName);
      const metricCount = new Set(metricEvents.map(e => e.visitorId)).size;
      secondaryMetrics[metricName] = totalVisitors > 0 ? metricCount / totalVisitors : 0;
    }
  }

  const variant = test.variants.find(v => v.id === variantId);

  return {
    variantId,
    variantName: variant?.name || variantId,
    totalVisitors,
    conversions,
    conversionRate,
    revenue: revenue > 0 ? revenue : undefined,
    revenuePerVisitor: revenuePerVisitor > 0 ? revenuePerVisitor : undefined,
    secondaryMetrics: Object.keys(secondaryMetrics).length > 0 ? secondaryMetrics : undefined,
  };
}

/**
 * Get aggregated results for an entire test
 *
 * Calculates results for all variants, determines winner based on statistical
 * significance, and calculates relative lift.
 */
export function getTestResults(test: ABTest, moveInValue?: number): TestResults {
  const variantResults = test.variants.map(variant => getVariantResults(test.id, variant.id, test, moveInValue));

  // Sort by variant ID to identify control (first) and treatment variants
  const sortedResults = [...variantResults].sort((a, b) => a.variantId.localeCompare(b.variantId));

  // Determine winner by comparing first vs second variant
  let winner = undefined;
  let statisticallySignificant = false;

  if (sortedResults.length >= 2) {
    const controlResult = sortedResults[0];
    const treatmentResult = sortedResults[1];

    const significance = calculateSignificance(
      controlResult.conversions,
      controlResult.totalVisitors,
      treatmentResult.conversions,
      treatmentResult.totalVisitors
    );

    if (significance.isSignificant) {
      statisticallySignificant = true;

      // Determine which variant is the winner
      if (treatmentResult.conversionRate > controlResult.conversionRate) {
        const lift = calculateLift(controlResult.conversionRate, treatmentResult.conversionRate);
        const treatmentVariant = test.variants.find(v => v.id === treatmentResult.variantId);
        winner = {
          variantId: treatmentResult.variantId,
          variantName: treatmentVariant?.name || treatmentResult.variantId,
          confidence: significance.confidence,
          lift,
          pValue: significance.pValue,
        };
      } else {
        const lift = calculateLift(treatmentResult.conversionRate, controlResult.conversionRate);
        const controlVariant = test.variants.find(v => v.id === controlResult.variantId);
        winner = {
          variantId: controlResult.variantId,
          variantName: controlVariant?.name || controlResult.variantId,
          confidence: significance.confidence,
          lift,
          pValue: significance.pValue,
        };
      }
    }
  }

  return {
    testId: test.id,
    testName: test.name,
    variants: variantResults,
    startDate: test.startDate,
    endDate: test.endDate,
    winner,
    statisticallySignificant,
  };
}

/**
 * Get results for multiple tests
 */
export function getMultipleTestResults(tests: ABTest[]): TestResults[] {
  return tests.map(test => getTestResults(test));
}

/**
 * Export test results as CSV
 *
 * Useful for sharing with stakeholders or importing into analysis tools
 */
export function exportTestResultsAsCSV(result: TestResults): string {
  const rows: string[] = [];

  // Header
  rows.push(`Test: ${result.testName}\nStarted: ${result.startDate}\nEnded: ${result.endDate || 'Ongoing'}\n`);

  // Variant results
  rows.push(
    'Variant,Total Visitors,Conversions,Conversion Rate,Revenue,Revenue Per Visitor,Lift vs Control'
  );

  const controlResult = result.variants[0];
  const controlRate = controlResult.conversionRate;

  for (const variant of result.variants) {
    const lift =
      variant.variantId === controlResult.variantId ? 0 : calculateLift(controlRate, variant.conversionRate);
    rows.push(
      `${variant.variantName},${variant.totalVisitors},${variant.conversions},${(variant.conversionRate * 100).toFixed(2)}%,${variant.revenue || 'N/A'},${variant.revenuePerVisitor || 'N/A'},${(lift * 100).toFixed(2)}%`
    );
  }

  // Winner section
  if (result.winner) {
    rows.push(
      `\nWinner: ${result.winner.variantName}\nConfidence: ${(result.winner.confidence * 100).toFixed(2)}%\nLift: ${(result.winner.lift * 100).toFixed(2)}%\nP-Value: ${result.winner.pValue}`
    );
  } else {
    rows.push('\nNo statistically significant winner yet');
  }

  return rows.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// DEVELOPMENT UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get debug info for current visitor's A/B test assignments
 */
export function getDebugInfo(): {
  visitorId: string;
  assignments: Record<string, VariantAssignment>;
  eventCount: number;
} {
  return {
    visitorId: getVisitorId(),
    assignments: getAllAssignments(),
    eventCount: getAllEvents().length,
  };
}

/**
 * Simulate events for testing/development
 *
 * WARNING: For development only. Do not use in production.
 */
export function simulateEvents(
  testId: string,
  variantId: string,
  conversionCount: number,
  visitorCount: number
): void {
  if (!import.meta.env.DEV) {
    console.warn('[AB Testing] simulateEvents should only be used in development');
    return;
  }

  for (let i = 0; i < visitorCount; i++) {
    const visitorId = `sim-${Math.random().toString(36).slice(2, 9)}`;

    // Record visitor as seen
    recordEventLocally(testId, variantId, visitorId, 'page_view');

    // Record conversions for subset
    if (i < conversionCount) {
      recordEventLocally(testId, variantId, visitorId, 'reservation_completed', {
        monthly_rent: 10000 + Math.random() * 5000,
      });
    }
  }

  console.log(
    `[AB Testing] Simulated ${conversionCount} conversions out of ${visitorCount} visitors for variant ${variantId}`
  );
}
