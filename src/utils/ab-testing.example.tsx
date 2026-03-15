/**
 * A/B Testing Framework - Implementation Examples
 *
 * Practical examples showing how to set up and run A/B tests for self-storage
 * facility landing pages. Covers headline tests, offer tests, and page layout tests.
 *
 * These examples demonstrate integration with React components, the events
 * tracking system, and statistical analysis.
 */

import {
  type ABTest,
  type ABTestVariant,
  getVariant,
  trackABEvent,
  getTestResults,
  calculateSignificance,
  getVariantResults,
  exportTestResultsAsCSV,
} from './ab-testing';

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 1: HEADLINE TEST
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Test different value propositions in the hero headline
 *
 * Setup:
 * - Variant A: "Find Your Perfect Storage Unit in [City]"
 * - Variant B: "Secure Storage Starts at $99/month. Move In Today."
 * - Split: 50/50
 * - Primary metric: reservation_completed
 */

export const headlineTest: ABTest = {
  id: 'headline-value-prop-2026-03',
  name: 'Hero Headline: Value Prop vs Price',
  facilityId: 'denver-main',
  status: 'active',
  startDate: '2026-03-14',
  description: 'Testing whether emphasizing price vs. ease drives more reservations',
  variants: [
    {
      id: 'headline-a',
      name: 'Generic Value Prop',
      slug: 'find-perfect',
      weight: 50,
    },
    {
      id: 'headline-b',
      name: 'Price + CTA',
      slug: 'price-cta',
      weight: 50,
    },
  ],
  metrics: {
    primary: 'reservation_completed',
    secondary: ['page_view', 'unit_selected', 'reservation_started'],
  },
};

/**
 * Usage in a React component
 *
 * ```tsx
 * import { getVariant, trackABEvent } from '@/utils/ab-testing';
 * import { headlineTest } from '@/utils/ab-testing.example';
 *
 * export function HeroSection() {
 *   const variant = getVariant(headlineTest.id, headlineTest.variants);
 *
 *   const headlineText = variant.slug === 'find-perfect'
 *     ? 'Find Your Perfect Storage Unit in Denver'
 *     : 'Secure Storage Starts at $99/month. Move In Today.';
 *
 *   return (
 *     <div className="hero">
 *       <h1>{headlineText}</h1>
 *       <button
 *         onClick={() => {
 *           trackABEvent(headlineTest.id, variant.id, 'cta_clicked');
 *         }}
 *       >
 *         Reserve Now
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 2: OFFER TEST
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Test different promotional offers
 *
 * Setup:
 * - Variant A: "First 2 Months Free"
 * - Variant B: "50% Off First 3 Months"
 * - Variant C: "No Move-In Fees"
 * - Split: 40/40/20 (Control gets 40%, test variants get 40% and 20%)
 * - Primary metric: move_in_completed
 * - Secondary: reservation_completed (to track dropoff)
 */

export const offerTest: ABTest = {
  id: 'offer-promotion-2026-03',
  name: 'Promotional Offer: Free Months vs Discount vs No Fees',
  facilityId: 'denver-main',
  status: 'active',
  startDate: '2026-03-14',
  description: 'Testing which offer converts best to actual move-ins (not just reservations)',
  variants: [
    {
      id: 'offer-free-months',
      name: 'First 2 Months Free',
      slug: 'offer-a',
      weight: 40,
    },
    {
      id: 'offer-discount',
      name: '50% Off First 3 Months',
      slug: 'offer-b',
      weight: 40,
    },
    {
      id: 'offer-no-fees',
      name: 'No Move-In Fees',
      slug: 'offer-c',
      weight: 20,
    },
  ],
  metrics: {
    primary: 'move_in_completed',
    secondary: ['reservation_completed', 'reservation_started'],
  },
};

/**
 * Usage: Banner component showing different offers
 *
 * ```tsx
 * import { getVariant, trackABEvent } from '@/utils/ab-testing';
 * import { offerTest } from '@/utils/ab-testing.example';
 * import { trackConversion } from '@/utils/events';
 *
 * export function PromoBanner() {
 *   const variant = getVariant(offerTest.id, offerTest.variants);
 *
 *   const offerContent = {
 *     'offer-a': {
 *       title: 'First 2 Months Free!',
 *       description: 'Move in today and enjoy your first 60 days free.',
 *     },
 *     'offer-b': {
 *       title: '50% Off First 3 Months',
 *       description: 'Lock in savings with 50% off your first quarter.',
 *     },
 *     'offer-c': {
 *       title: 'No Move-In Fees',
 *       description: 'Save on upfront costs with our zero-fee guarantee.',
 *     },
 *   }[variant.slug] || {};
 *
 *   const handleReserve = async () => {
 *     trackABEvent(offerTest.id, variant.id, 'cta_clicked');
 *     // Show reservation form...
 *   };
 *
 *   const handleMoveInConfirmed = async (unitId: string) => {
 *     // Track move-in conversion
 *     await trackConversion({
 *       type: 'move_in_completed',
 *       unit_id: unitId,
 *       facility_id: 'denver-main',
 *       customer_id: 'customer123',
 *       actual_move_in_date: new Date().toISOString(),
 *       monthly_rent: 10000, // in cents
 *       timestamp: Date.now(),
 *     });
 *
 *     // Also track for the A/B test
 *     trackABEvent(offerTest.id, variant.id, 'move_in_completed', {
 *       unit_id: unitId,
 *       monthly_rent: 10000,
 *     });
 *   };
 *
 *   return (
 *     <div className="promo-banner">
 *       <h2>{offerContent.title}</h2>
 *       <p>{offerContent.description}</p>
 *       <button onClick={handleReserve}>Claim Offer</button>
 *     </div>
 *   );
 * }
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 3: PAGE LAYOUT TEST
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Test different page layouts and section ordering
 *
 * Setup:
 * - Variant A: Traditional layout (Features → Pricing → CTA → FAQ)
 * - Variant B: Social proof first (Testimonials → Features → Pricing → CTA)
 * - Split: 50/50
 * - Primary metric: reservation_completed
 * - Tracks secondary metrics to understand where engagement differences occur
 */

export const layoutTest: ABTest = {
  id: 'layout-section-order-2026-03',
  name: 'Page Layout: Traditional vs Social Proof First',
  facilityId: 'denver-main',
  status: 'active',
  startDate: '2026-03-14',
  description: 'Testing if showing testimonials/social proof early improves conversions',
  variants: [
    {
      id: 'layout-traditional',
      name: 'Traditional Layout',
      slug: 'layout-a',
      weight: 50,
    },
    {
      id: 'layout-social-first',
      name: 'Social Proof First',
      slug: 'layout-b',
      weight: 50,
    },
  ],
  metrics: {
    primary: 'reservation_completed',
    secondary: ['page_view', 'unit_selected', 'phone_call_clicked'],
  },
};

/**
 * Usage: Layout router component
 *
 * ```tsx
 * import { getVariant, trackABEvent } from '@/utils/ab-testing';
 * import { layoutTest } from '@/utils/ab-testing.example';
 *
 * export function LandingPage() {
 *   const variant = getVariant(layoutTest.id, layoutTest.variants);
 *
 *   // Track page view for this variant
 *   React.useEffect(() => {
 *     trackABEvent(layoutTest.id, variant.id, 'page_view');
 *   }, [variant.id]);
 *
 *   if (variant.slug === 'layout-a') {
 *     return (
 *       <div>
 *         <HeroSection />
 *         <FeaturesSection onUnitSelected={() => trackABEvent(layoutTest.id, variant.id, 'unit_selected')} />
 *         <PricingSection />
 *         <CTASection />
 *         <FAQSection />
 *       </div>
 *     );
 *   } else {
 *     return (
 *       <div>
 *         <HeroSection />
 *         <TestimonialsSection /> {/* Moved up */}
 *         <FeaturesSection onUnitSelected={() => trackABEvent(layoutTest.id, variant.id, 'unit_selected')} />
 *         <PricingSection />
 *         <CTASection />
 *         <FAQSection />
 *       </div>
 *     );
 *   }
 * }
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════
// ANALYSIS EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyze test results and determine winner
 *
 * Example: After running the headline test for 2 weeks with sufficient traffic
 */
export function analyzeHeadlineTestResults(): void {
  // Get results for the test
  const results = getTestResults(headlineTest);

  console.log('=== Headline Test Results ===');
  console.log(`Test: ${results.testName}`);
  console.log(`Duration: ${results.startDate} to ${results.endDate || 'Ongoing'}`);
  console.log();

  // Display variant results
  for (const variant of results.variants) {
    console.log(`${variant.variantName}:`);
    console.log(`  Visitors: ${variant.totalVisitors}`);
    console.log(`  Conversions: ${variant.conversions}`);
    console.log(`  Conversion Rate: ${(variant.conversionRate * 100).toFixed(2)}%`);
    if (variant.secondaryMetrics) {
      for (const [metric, rate] of Object.entries(variant.secondaryMetrics)) {
        console.log(`  ${metric}: ${(rate * 100).toFixed(2)}%`);
      }
    }
    console.log();
  }

  // Display winner if significant
  if (results.winner) {
    console.log(`✓ Winner: ${results.winner.variantName}`);
    console.log(`  Confidence: ${(results.winner.confidence * 100).toFixed(1)}%`);
    console.log(`  Lift: +${(results.winner.lift * 100).toFixed(1)}%`);
  } else {
    console.log('✗ No statistically significant winner yet');
  }

  // Export as CSV
  const csv = exportTestResultsAsCSV(results);
  console.log('\n=== CSV Export ===');
  console.log(csv);
}

/**
 * Calculate statistical significance manually
 *
 * Example: Comparing offer test variants
 */
export function checkOfferTestSignificance(): void {
  // After collecting data, get results for variant B vs variant A
  const variantA = getVariantResults(offerTest.id, offerTest.variants[0].id, offerTest);
  const variantB = getVariantResults(offerTest.id, offerTest.variants[1].id, offerTest);

  const significance = calculateSignificance(
    variantA.conversions,
    variantA.totalVisitors,
    variantB.conversions,
    variantB.totalVisitors
  );

  console.log(`Variant A: ${(variantA.conversionRate * 100).toFixed(2)}% conversion`);
  console.log(`Variant B: ${(variantB.conversionRate * 100).toFixed(2)}% conversion`);
  console.log();
  console.log(`Chi-square: ${significance.chiSquare.toFixed(2)}`);
  console.log(`P-value: ${significance.pValue.toFixed(4)}`);
  console.log(
    `Significant at 95% confidence: ${significance.isSignificant ? 'YES ✓' : 'NO ✗ (need more data)'}`
  );
}

/**
 * Multi-facility test setup
 *
 * Run the same test across multiple facilities and aggregate results
 */

export const facilityTests = {
  denver: {
    ...headlineTest,
    id: 'headline-value-prop-denver',
    facilityId: 'denver-main',
  },
  phoenix: {
    ...headlineTest,
    id: 'headline-value-prop-phoenix',
    facilityId: 'phoenix-central',
  },
  austin: {
    ...headlineTest,
    id: 'headline-value-prop-austin',
    facilityId: 'austin-north',
  },
};

/**
 * Aggregate results across facilities
 *
 * Usage:
 * ```tsx
 * const allResults = Object.values(facilityTests).map(test => getTestResults(test));
 * const aggregated = {
 *   totalVisitors: allResults.reduce((sum, r) => sum + r.variants[0].totalVisitors, 0),
 *   totalConversions: allResults.reduce((sum, r) => sum + r.variants[0].conversions, 0),
 * };
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════
// REAL-WORLD SCENARIO: Complete Test Flow
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Complete implementation of a pricing test with all tracking integrated
 *
 * This demonstrates a full test lifecycle with proper event tracking.
 */

export const pricingTest: ABTest = {
  id: 'pricing-anchor-2026-03',
  name: 'Pricing Page: $99 vs $149 Anchor',
  facilityId: 'denver-main',
  status: 'active',
  startDate: '2026-03-14',
  variants: [
    {
      id: 'price-low-anchor',
      name: '$99 Anchor',
      slug: 'price-99',
      weight: 50,
    },
    {
      id: 'price-high-anchor',
      name: '$149 Anchor',
      slug: 'price-149',
      weight: 50,
    },
  ],
  metrics: {
    primary: 'reservation_completed',
    secondary: ['unit_selected'],
  },
};

/**
 * Complete React component using the test
 *
 * ```tsx
 * import React from 'react';
 * import { getVariant, trackABEvent } from '@/utils/ab-testing';
 * import { pricingTest } from '@/utils/ab-testing.example';
 * import { trackConversion } from '@/utils/events';
 *
 * export function PricingSection() {
 *   const variant = getVariant(pricingTest.id, pricingTest.variants);
 *   const anchorPrice = variant.slug === 'price-99' ? 99 : 149;
 *
 *   const units = [
 *     { id: 'unit-5x5', size: '5x5', displayPrice: anchorPrice, actualPrice: 79 },
 *     { id: 'unit-10x10', size: '10x10', displayPrice: anchorPrice + 50, actualPrice: 129 },
 *     { id: 'unit-climate', size: 'Climate Controlled', displayPrice: anchorPrice + 100, actualPrice: 199 },
 *   ];
 *
 *   const handleSelectUnit = async (unit) => {
 *     // Track unit selection
 *     trackABEvent(pricingTest.id, variant.id, 'unit_selected', {
 *       unit_id: unit.id,
 *       unit_size: unit.size,
 *       price: unit.actualPrice * 100, // in cents
 *     });
 *
 *     // Also track in main event system
 *     await trackConversion({
 *       type: 'unit_selected',
 *       unit_id: unit.id,
 *       unit_size: unit.size,
 *       unit_type: 'standard',
 *       price: unit.actualPrice * 100,
 *       facility_id: pricingTest.facilityId,
 *       timestamp: Date.now(),
 *     });
 *   };
 *
 *   const handleReserve = async (unit) => {
 *     // Show reservation form
 *     const result = await showReservationForm(unit);
 *
 *     if (result.success) {
 *       // Track conversion
 *       trackABEvent(pricingTest.id, variant.id, 'reservation_completed', {
 *         unit_id: unit.id,
 *         monthly_rent: unit.actualPrice * 100,
 *       });
 *
 *       await trackConversion({
 *         type: 'reservation_completed',
 *         unit_id: unit.id,
 *         unit_size: unit.size,
 *         unit_type: 'standard',
 *         price: unit.actualPrice * 100,
 *         facility_id: pricingTest.facilityId,
 *         customer_email: result.email,
 *         customer_phone: result.phone,
 *         timestamp: Date.now(),
 *       });
 *     }
 *   };
 *
 *   return (
 *     <div className="pricing">
 *       <p className="anchor-text">Starting at ${anchorPrice}/month</p>
 *       <div className="units-grid">
 *         {units.map(unit => (
 *           <UnitCard
 *             key={unit.id}
 *             unit={unit}
 *             displayPrice={unit.displayPrice}
 *             onSelect={() => handleSelectUnit(unit)}
 *             onReserve={() => handleReserve(unit)}
 *           />
 *         ))}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY: Setting Up Multiple Tests
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration for running multiple simultaneous tests on a facility
 *
 * Note: Running too many tests simultaneously dilutes traffic per variant.
 * Generally recommend 1-2 active tests per page at a time.
 */

export const facilityTestSuite = [
  {
    test: headlineTest,
    enabled: true,
    description: 'Value prop messaging in hero section',
  },
  {
    test: offerTest,
    enabled: true,
    description: 'Promotional offer comparison',
  },
  {
    test: layoutTest,
    enabled: false, // Paused this week
    description: 'Section ordering and social proof placement',
  },
];

/**
 * Helper to get active tests for a facility
 */
export function getActiveTests(facilityId: string) {
  return facilityTestSuite
    .filter(item => item.enabled && item.test.facilityId === facilityId)
    .map(item => item.test);
}

/**
 * Helper to get variant assignments for all active tests
 */
export function getVariantAssignmentsForPage(facilityId: string) {
  const activeTests = getActiveTests(facilityId);
  return activeTests.reduce(
    (acc, test) => {
      const variant = getVariant(test.id, test.variants);
      acc[test.id] = variant;
      return acc;
    },
    {} as Record<string, typeof headlineTest.variants[0]>
  );
}
