# A/B Testing Framework for StowStack

## Overview

A production-ready A/B testing system for StowStack landing pages. Provides deterministic variant assignment, persistent tracking, statistical significance testing, and revenue-based lift calculations for self-storage facility acquisition campaigns.

## Files Created

- **`src/utils/ab-testing.ts`** (696 lines) - Core framework with all utilities
- **`src/utils/ab-testing.example.ts`** (568 lines) - Practical implementation examples

## Core Features

### 1. Deterministic Variant Assignment
```typescript
import { getVariant } from '@/utils/ab-testing';

const variants = [
  { id: 'offer-a', name: 'Free 2 Months', slug: 'offer-a', weight: 50 },
  { id: 'offer-b', name: '50% Off', slug: 'offer-b', weight: 50 },
];

const variant = getVariant('my-test-id', variants);
// Same visitor always gets same variant, respects weighted distribution
```

**Key properties:**
- Hashes visitor_id to deterministically assign variants
- localStorage persistence for returning visitor consistency
- Weighted distribution support (e.g., 70/30, 40/40/20 splits)
- No need for server-side implementation

### 2. Event Tracking Integration
```typescript
import { trackABEvent } from '@/utils/ab-testing';

// Track any event
trackABEvent(testId, variantId, 'unit_selected', {
  unit_size: '5x5',
  price: 7500
});

// Integrates seamlessly with main events.ts system
```

**Tracks:**
- Primary metrics: `reservation_completed`, `move_in_completed`
- Secondary metrics: `page_view`, `unit_selected`, `reservation_started`
- Custom metadata per event

### 3. Statistical Significance Testing
```typescript
import { calculateSignificance } from '@/utils/ab-testing';

const result = calculateSignificance(
  controlConversions: 45,
  controlVisitors: 1200,
  treatmentConversions: 62,
  treatmentVisitors: 1100
);

console.log(result.isSignificant); // true at 95% confidence
console.log(result.pValue);        // 0.042
console.log(result.confidence);    // 0.958 (95.8%)
```

**Uses Chi-square test** with 95% confidence threshold (p < 0.05)

### 4. Results Aggregation & Lift Calculation
```typescript
import { getTestResults, calculateLift } from '@/utils/ab-testing';

const results = getTestResults(myTest);

results.variants.forEach(variant => {
  console.log(`${variant.variantName}`);
  console.log(`  Conversion Rate: ${(variant.conversionRate * 100).toFixed(2)}%`);
  console.log(`  Revenue: $${(variant.revenue / 100).toFixed(2)}`);
  console.log(`  Revenue per Visitor: $${(variant.revenuePerVisitor / 100).toFixed(2)}`);
});

if (results.winner) {
  console.log(`Winner: ${results.winner.variantName}`);
  console.log(`Lift: +${(results.winner.lift * 100).toFixed(1)}%`);
  console.log(`Confidence: ${(results.winner.confidence * 100).toFixed(0)}%`);
}
```

## Test Configuration

```typescript
const myTest: ABTest = {
  id: 'headline-2026-03',
  name: 'Hero Headline Test',
  facilityId: 'denver-main',
  status: 'active',
  startDate: '2026-03-14',
  description: 'Testing value proposition messaging',
  
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
```

## Usage Examples

### Example 1: Headline Test
See `ab-testing.example.ts` for the `headlineTest` - tests two hero headlines (50/50 split).

```tsx
export function HeroSection() {
  const variant = getVariant(headlineTest.id, headlineTest.variants);
  
  const text = variant.slug === 'find-perfect'
    ? 'Find Your Perfect Storage Unit'
    : 'Secure Storage Starts at $99/month';
  
  return <h1>{text}</h1>;
}
```

### Example 2: Offer Test
See `ab-testing.example.ts` for the `offerTest` - tests three promotional offers (40/40/20 split).

### Example 3: Page Layout Test
See `ab-testing.example.ts` for the `layoutTest` - tests section ordering and social proof placement.

## API Reference

### Variant Assignment
- `getVariant(testId, variants)` - Get/assign variant for current visitor
- `getAllAssignments()` - Get all current visitor assignments
- `clearAllAssignments()` - Clear localStorage assignments (for testing)

### Event Tracking
- `trackABEvent(testId, variantId, eventName, metadata?)` - Record A/B test event
- `getAllEvents()` - Get all recorded events (internal)
- `clearAllEvents()` - Clear all events (for testing)

### Analysis
- `calculateSignificance(cc, cv, tc, tv)` - Chi-square test
- `calculateLift(controlRate, treatmentRate)` - Relative improvement %
- `getVariantResults(testId, variantId, test)` - Single variant stats
- `getTestResults(test)` - Full test results with winner
- `getMultipleTestResults(tests)` - Multiple test results
- `exportTestResultsAsCSV(result)` - Export for sharing

### Utilities
- `getDebugInfo()` - Development debugging info
- `simulateEvents()` - Generate mock data for testing (dev only)

## Design Patterns

### Pattern 1: React Hook for A/B Testing
```tsx
function usePrimerABTest(testId: string, variants: ABTestVariant[]) {
  const [variant] = React.useState(() => getVariant(testId, variants));
  
  React.useEffect(() => {
    trackABEvent(testId, variant.id, 'page_view');
  }, [testId, variant.id]);
  
  return variant;
}

// Usage:
const variant = usePrimerABTest(myTest.id, myTest.variants);
```

### Pattern 2: Conditional Rendering
```tsx
const variant = getVariant(test.id, test.variants);

if (variant.slug === 'offer-a') {
  return <OfferVariantA />;
} else {
  return <OfferVariantB />;
}
```

### Pattern 3: Multi-Facility Tests
```tsx
const tests = {
  denver: { ...baseTest, facilityId: 'denver-main' },
  phoenix: { ...baseTest, facilityId: 'phoenix-central' },
  austin: { ...baseTest, facilityId: 'austin-north' },
};

const allResults = Object.values(tests).map(t => getTestResults(t));
```

## Data Storage

- **Variant assignments**: localStorage under `stowstack_ab_assignments`
- **Event data**: localStorage under `stowstack_ab_events` (keeps last 7 days, max 1000 events)
- **Visitor ID**: Shared with utm.ts as `stowstack_visitor_id`

## Important Notes

1. **No Database Required** - All data stored in localStorage. For production dashboards, send events to your backend via the `trackConversion()` integration.

2. **Deterministic Hashing** - Uses SHA-like hash of `{testId}-{visitorId}` to assign variants. Same visitor always gets same variant, no server state needed.

3. **Statistical Significance** - Uses Chi-square test at 95% confidence (p < 0.05). Results are significant when chi-square > 3.841.

4. **Revenue Tracking** - Primary metric can be `move_in_completed` (with `monthly_rent` metadata) to calculate revenue lift directly.

5. **Secondary Metrics** - Track engagement through the funnel with secondary metrics like `unit_selected` and `reservation_started` to identify dropoff points.

## Integration with Events System

A/B test events integrate with the main `events.ts` tracking system:

```typescript
// Both fire to Meta Pixel, Google Analytics, and attribution API
await trackConversion({
  type: 'reservation_completed',
  unit_id: 'unit-123',
  price: 10000,
  facility_id: 'denver-main',
  timestamp: Date.now(),
});

trackABEvent(testId, variantId, 'reservation_completed', {
  unit_id: 'unit-123',
  monthly_rent: 10000,
});
```

The A/B test event is stored locally for aggregation, while the conversion event is sent to external platforms.

## Testing & Development

```typescript
// Get debug info about current visitor's tests
const debug = getDebugInfo();
console.log(debug.visitorId);
console.log(debug.assignments); // All test assignments
console.log(debug.eventCount);

// Simulate test data for analysis (dev only)
simulateEvents('test-id', 'variant-a', 50, 1000);
// Creates 1000 page views with 50 conversions for the variant

// Analyze results
const results = getTestResults(myTest);
console.log(exportTestResultsAsCSV(results));
```

## Production Checklist

- [ ] Define test configuration (variants, weights, metrics)
- [ ] Deploy code with test configured as `status: 'active'`
- [ ] Implement variant assignment in React components
- [ ] Add `trackABEvent()` calls for primary metric
- [ ] (Optional) Add secondary metric tracking for funnel analysis
- [ ] Monitor results via `getTestResults()` or dashboard
- [ ] Verify statistical significance before declaring winner
- [ ] Update `status: 'completed'` and set `winnerVariantId` when done
- [ ] Export results as CSV or JSON for stakeholders

## Common Mistakes to Avoid

1. **Not storing variant assignment** - Always call `getVariant()` at component load, not on every render
2. **Forgetting to track conversions** - Must call `trackABEvent()` with primary metric event name
3. **Insufficient traffic** - Need ~1000 visitors per variant for statistical significance
4. **Running too many tests** - Dilutes traffic; recommend 1-2 active tests per page
5. **Confusing weights** - Weights must sum to 100, not be percentages (50/50 = 50+50, not 0.5+0.5)

## References

See `src/utils/ab-testing.example.ts` for:
- `headlineTest` - Value proposition messaging test
- `offerTest` - Promotional offer comparison (3-way split)
- `layoutTest` - Page section ordering and social proof placement
- `pricingTest` - Pricing anchor effects with complete React integration
- `analyzeHeadlineTestResults()` - Results analysis walkthrough
- `checkOfferTestSignificance()` - Manual significance checking
- `facilityTestSuite` - Multi-facility test configuration
