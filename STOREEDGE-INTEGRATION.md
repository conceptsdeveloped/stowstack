# StowStack: storEDGE Integration Guide

How to embed and configure storEDGE rental flows in StowStack landing pages.

## What Is storEDGE?

storEDGE is the transaction engine. It handles:
- Unit availability lookup (real-time)
- Reservation workflow (select unit → enter info → pay)
- Payment processing (Stripe, Square, ACH)
- Move-in documentation (lease auto-gen, proof of ID, etc.)
- Facility notification (alerts facility of new reservation)

StowStack drives traffic to landing pages. storEDGE completes the transaction.

---

## Embed Options

### Option 1: iFrame Embed (Recommended)

**Pros:** Isolated, simple, reliable
**Cons:** Harder to customize styling, requires knowledge of storEDGE config

**Implementation:**

Add to landing page HTML:

```html
<iframe
  id="storeedge-embed"
  src="https://reserve.storeedge.app/facilities/FACILITY_ID?branding=true&utm_source=stowstack"
  width="100%"
  height="800"
  frameborder="0"
  allow="payment"
  style="border: none; border-radius: 8px;">
</iframe>
```

**Parameters:**

| Parameter | Value | Required | Purpose |
|-----------|-------|----------|---------|
| `FACILITY_ID` | Provided by storEDGE | Yes | Identifies facility |
| `branding=true` | true/false | No | Use facility colors |
| `unit_type` | `5x5`, `10x10`, etc. | No | Filter to specific unit type |
| `utm_source` | Campaign identifier | No | Passes through to storEDGE |

**Example:**

```html
<!-- Paw Paw Storage - iFrame embed -->
<iframe
  id="storeedge-embed"
  src="https://reserve.storeedge.app/facilities/facility_paw_paw_001?branding=true&utm_source=stowstack&utm_campaign=summer"
  width="100%"
  height="800"
  frameborder="0"
  allow="payment"
  style="border: none; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
</iframe>
```

### Option 2: JavaScript Widget

**Pros:** More flexible styling, can customize flow
**Cons:** More complex setup, requires storEDGE SDK

**Implementation:**

```html
<!-- storEDGE SDK -->
<script src="https://sdk.storeedge.app/widget.js"></script>

<div id="storeedge-widget"></div>

<script>
  const widget = new StoreEDGEWidget({
    containerId: 'storeedge-widget',
    facilityId: 'facility_paw_paw_001',
    branding: {
      primaryColor: '#16a34a',  // Your brand color
      fontFamily: 'Inter, sans-serif'
    },
    callbacks: {
      onReservationStart: (data) => {
        console.log('Reservation started:', data);
        // Track to pixel
        trackEvent('InitiateCheckout', data);
      },
      onReservationComplete: (data) => {
        console.log('Reservation complete:', data);
        // Track to pixel
        trackEvent('Purchase', data);
      }
    }
  });

  widget.render();
</script>
```

**Use this only if:**
- You need deep customization
- You're building a custom interface
- storEDGE is part of a larger app flow

**For StowStack landing pages, use iFrame (Option 1).**

---

## Placement Strategies

### Strategy 1: Full-Page Embed

Best for: High-intent traffic (branded search, direct)

```html
<!DOCTYPE html>
<html>
<head>
  <!-- ... head content ... -->
</head>
<body>
  <div class="container">
    <h1>Reserve Your Unit Now</h1>
    <p>Find available units and complete your reservation below.</p>

    <!-- Full-width embed -->
    <iframe
      src="https://reserve.storeedge.app/facilities/facility_paw_paw_001?branding=true"
      width="100%"
      height="900"
      frameborder="0"
      allow="payment"
      style="border: none;">
    </iframe>
  </div>
</body>
</html>
```

**Placement on page:** Above fold or first visible section
**Conversion rate expectation:** 3-8% (form fill → reservation)

### Strategy 2: Below-Fold Embed

Best for: Informational traffic (Google ads, organic)

```html
<div class="page-content">
  <!-- Above fold: Information -->
  <section class="hero">
    <h1>Storage Units in Paw Paw</h1>
    <p>See available sizes and prices below.</p>
  </section>

  <section class="pricing-table">
    <!-- Show pricing table, images, etc. -->
  </section>

  <!-- Below fold: Reservation -->
  <section class="reserve-section">
    <h2>Ready to Reserve?</h2>
    <iframe
      src="https://reserve.storeedge.app/facilities/facility_paw_paw_001?branding=true"
      width="100%"
      height="800"
      frameborder="0"
      allow="payment"
      style="border: none;">
    </iframe>
  </section>
</div>
```

**Placement on page:** After descriptive content, pricing, testimonials
**Conversion rate expectation:** 1-3% (page view → reservation)

### Strategy 3: Conditional Rendering

Best for: Lead capture → conditional storEDGE unlock

```jsx
// React component example
import { useState } from 'react';

export default function ReservePage() {
  const [showReservation, setShowReservation] = useState(false);
  const [leadData, setLeadData] = useState(null);

  const handleLeadSubmit = async (data) => {
    // Submit to lead API
    await submitLead(data);

    // Track to pixel
    await trackLead(data);

    // Unlock storEDGE
    setLeadData(data);
    setShowReservation(true);
  };

  return (
    <div className="container">
      <h1>Reserve a Unit</h1>

      {!showReservation ? (
        <form onSubmit={(e) => {
          e.preventDefault();
          handleLeadSubmit({
            name: e.target.name.value,
            email: e.target.email.value,
            phone: e.target.phone.value,
          });
        }}>
          <input name="name" placeholder="Your name" required />
          <input name="email" placeholder="Email" required />
          <input name="phone" placeholder="Phone" required />
          <button type="submit">Next: Select Unit</button>
        </form>
      ) : (
        <iframe
          src="https://reserve.storeedge.app/facilities/facility_paw_paw_001?branding=true&contact_email=" + encodeURIComponent(leadData.email)
          width="100%"
          height="800"
          frameborder="0"
          allow="payment"
          style="border: none;">
        </iframe>
      )}
    </div>
  );
}
```

**This pattern:**
- Collects lead data first (email, phone, name)
- Sends to pixel immediately (counts as lead)
- Pre-fills storEDGE with email (better UX)
- Shows conversion rate from leads → reservations

---

## Parameter Passing

### UTM Parameters

Pass campaign info through to storEDGE:

```html
<iframe
  src="https://reserve.storeedge.app/facilities/facility_paw_paw_001?
    branding=true&
    utm_source=facebook&
    utm_campaign=summer&
    utm_content=video_1"
  ...>
</iframe>
```

storEDGE will include these in the reservation data sent back to facility PMS.

**How to construct the URL dynamically:**

```javascript
// Capture URL params
const params = new URLSearchParams(window.location.search);
const utmSource = params.get('utm_source') || 'direct';
const utmCampaign = params.get('utm_campaign') || 'organic';

// Build storEDGE URL
const storeedgeUrl = new URL('https://reserve.storeedge.app/facilities/facility_paw_paw_001');
storeedgeUrl.searchParams.set('branding', 'true');
storeedgeUrl.searchParams.set('utm_source', utmSource);
storeedgeUrl.searchParams.set('utm_campaign', utmCampaign);

// Set iframe src
document.getElementById('storeedge-embed').src = storeedgeUrl.toString();
```

### Pre-Fill Customer Data

Pass known customer info to storEDGE to reduce form friction:

```html
<iframe
  src="https://reserve.storeedge.app/facilities/facility_paw_paw_001?
    branding=true&
    contact_email=john@example.com&
    contact_phone=5551234567&
    contact_name=John+Doe"
  ...>
</iframe>
```

storEDGE will pre-fill these fields in its form.

**Example: After lead form submission:**

```javascript
async function handleLeadSubmit(formData) {
  // Submit lead
  await submitLead(formData);

  // Build storEDGE URL with pre-fill
  const storeedgeUrl = new URL('https://reserve.storeedge.app/facilities/facility_paw_paw_001');
  storeedgeUrl.searchParams.set('branding', 'true');
  storeedgeUrl.searchParams.set('contact_name', formData.name);
  storeedgeUrl.searchParams.set('contact_email', formData.email);
  storeedgeUrl.searchParams.set('contact_phone', formData.phone);

  // Update iframe
  document.getElementById('storeedge-embed').src = storeedgeUrl.toString();

  // Scroll to iframe
  document.getElementById('storeedge-embed').scrollIntoView({ behavior: 'smooth' });
}
```

---

## Styling & Customization

### iFrame Styling (CSS)

```css
#storeedge-embed {
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: white;
  margin: 40px 0;
}
```

### Inside-Widget Styling (storEDGE Config)

If storEDGE allows branding config, customize:

```html
<iframe
  src="https://reserve.storeedge.app/facilities/facility_paw_paw_001?
    branding=true&
    primaryColor=%2316a34a&
    accentColor=%234f46e5&
    fontFamily=Inter"
  ...>
</iframe>
```

**Common customizations:**
- `primaryColor` — Button color (hex)
- `accentColor` — Focus/highlight color
- `fontFamily` — Font stack
- `logoUrl` — Facility logo URL

**Ask storEDGE which params they support.**

---

## Event Tracking Integration

### storEDGE → Pixel Events

storEDGE doesn't fire events directly. You must:

1. **Detect storEDGE actions** via callbacks or URL changes
2. **Fire pixel events** manually
3. **Send server-side events** to Meta CAPI / Google Ads

### Method 1: postMessage Communication

If storEDGE supports `postMessage`:

```javascript
// Listen for messages from storEDGE iframe
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://reserve.storeedge.app') return;

  const { type, data } = event.data;

  if (type === 'reservation_started') {
    console.log('Reservation started:', data);

    // Fire pixel event
    trackConversion({
      event_name: 'InitiateCheckout',
      user_data: {
        email: data.email,
        phone: data.phone,
      },
      custom_data: {
        content_name: data.unit_size,
        value: data.unit_price,
      }
    });
  }

  if (type === 'reservation_completed') {
    console.log('Reservation completed:', data);

    // Fire pixel event
    trackConversion({
      event_name: 'Purchase',
      user_data: {
        email: data.email,
        phone: data.phone,
      },
      custom_data: {
        content_name: data.unit_size,
        value: data.move_in_value,
      }
    });
  }
});

// Send message to iframe
document.getElementById('storeedge-embed').contentWindow.postMessage(
  { type: 'ready' },
  'https://reserve.storeedge.app'
);
```

**Check with storEDGE:** Do they support postMessage? What events?

### Method 2: URL Change Detection

Monitor for URL changes after storEDGE redirect:

```javascript
// After storEDGE completes, watch for redirect back
let previousUrl = window.location.href;

const urlChangeDetector = setInterval(() => {
  if (window.location.href !== previousUrl) {
    console.log('URL changed:', window.location.href);

    // If success page: fire purchase event
    if (window.location.href.includes('reservation=success')) {
      trackConversion({
        event_name: 'Purchase',
        user_data: { /* get from URL or form */ },
      });
    }

    clearInterval(urlChangeDetector);
  }
}, 500);
```

### Method 3: Form Interception (Fallback)

If storEDGE form is accessible:

```javascript
// Detect storEDGE form submission
const observer = new MutationObserver(() => {
  const storeedgeForm = document.querySelector('iframe')
    .contentDocument?.querySelector('form');

  if (storeedgeForm) {
    storeedgeForm.addEventListener('submit', () => {
      console.log('Form submitted to storEDGE');
      trackConversion({
        event_name: 'InitiateCheckout',
        user_data: { /* extract from form */ },
      });
    });

    observer.disconnect();
  }
});

observer.observe(document.body, { childList: true, subtree: true });
```

---

## Testing the Embed Locally

### Test 1: iFrame Loads

1. Create test HTML file:
   ```html
   <!DOCTYPE html>
   <html>
   <body>
     <iframe
       src="https://reserve.storeedge.app/facilities/facility_paw_paw_001?branding=true"
       width="100%"
       height="800"
       frameborder="0"
       allow="payment">
     </iframe>
   </body>
   </html>
   ```

2. Open in browser (file:// or localhost)
3. Should load storEDGE interface
4. If blank: Check iframe src, network errors

### Test 2: Unit Selection Works

1. Open embed
2. Click "Available Units" or similar
3. Should show list of units with prices
4. Click a unit → should load details
5. Click "Select" → should start reservation flow

**If units not showing:**
- Facility ID wrong?
- Facility has no units in storEDGE?
- Contact storEDGE support

### Test 3: Form Submission

1. Go through reservation flow
2. Fill in: Name, email, phone
3. Select payment method
4. **DO NOT submit payment** (test mode)
5. Check browser console for any JavaScript errors
6. Check Network tab for API calls

**Common issues:**
- Payment form won't load → storEDGE payment config issue
- Form validation fails → check required fields
- "Facility not found" → wrong facility ID

### Test 4: Pre-Fill Works

1. Load with pre-fill params:
   ```html
   <iframe src="...?contact_email=test@example.com&contact_name=John">
   ```
2. storEDGE form should have email/name pre-filled
3. If not pre-filled: storEDGE doesn't support param, skip this feature

### Test 5: UTM Parameters Pass Through

1. Load landing page with UTM params:
   ```
   ?utm_source=facebook&utm_campaign=summer
   ```
2. Pass through to storEDGE iframe URL
3. When facility receives reservation data, should include utm source/campaign
4. Check with facility manager: Do they see utm data in PMS?

---

## Common Issues & Fixes

### Issue: "Invalid facility ID"

**Fix:**
- Double-check facility ID spelling
- Facility ID should be provided by storEDGE (not facility name)
- Test ID format: `facility_[name]_[number]` or similar
- Contact storEDGE support if unsure

**Example:**
```
❌ Wrong: facility_id=Paw Paw Storage
✓ Correct: facility_id=facility_paw_paw_001
```

### Issue: "Facility not found"

**Fix:**
- Facility hasn't been set up in storEDGE yet
- Facility ID doesn't exist
- Contact facility manager or storEDGE support
- Ask: "Is this facility activated in storEDGE?"

### Issue: iFrame Shows Blank/Empty

**Fix:**
1. Check Network tab: Is iframe loading?
   - Should see request to `reserve.storeedge.app`
   - Check response status (200 = good)
2. Check browser console for errors
   - CORS issue? "Blocked by CORS policy"
   - CSP issue? "Content Security Policy blocks..."
3. Check if URL is correct (no typos)
4. Try incognito mode (clear cookies/cache)
5. If still blank: Contact storEDGE support, provide URL + error

### Issue: Payment Form Won't Load

**Fix:**
1. Is payment method configured in storEDGE?
   - storEDGE admin → Settings → Payment methods
   - Should have Stripe/Square/ACH enabled
2. Test with valid test card (4111 1111 1111 1111)
3. Check browser console for payment SDK errors
4. Contact storEDGE support if payment gateway failing

### Issue: Pre-Fill Parameters Not Working

**Fix:**
1. Are params URL-encoded?
   - `contact_email=john@example.com` ✓
   - `contact_email=john@example.com` with special chars needs encoding
2. Are params in iframe src?
   - Check URL in Network tab (right-click iframe → Inspect → src attribute)
3. Does storEDGE support these params?
   - Not all versions support pre-fill
   - Ask storEDGE or check their docs
4. Fallback: Use Method 2 (conditional rendering + post-fill via script)

### Issue: Events Not Tracking

**Fix:**
1. Does storEDGE support postMessage?
   - Not all versions do
   - Fallback: Use callback URLs instead
2. Are you listening correctly?
   - Check `window.addEventListener('message', ...)` is running
   - Add console.log to confirm listener registered
3. Is origin correct?
   - `event.origin !== 'https://reserve.storeedge.app'` filter might block
   - Check actual origin in Network tab
4. Fallback tracking:
   - Can't detect events from iframe
   - Track "InitiateCheckout" when lead form submits
   - Track "Purchase" based on facility feedback (moved-in check)
   - Not real-time but functional

---

## Integration Checklist

For each new facility:

- [ ] Get facility ID from storEDGE
- [ ] Test iFrame loads (facility ID correct)
- [ ] Test unit selection works (units showing)
- [ ] Test form submission doesn't error
- [ ] Add to landing page template
- [ ] Test pre-fill works (if supported)
- [ ] Pass UTM params through
- [ ] Test on mobile (responsive)
- [ ] Configure event tracking (postMessage or fallback)
- [ ] Test pixel fires on reservation
- [ ] Get facility feedback: Does reservation data arrive?
- [ ] Document facility-specific config (if any)
- [ ] Brief facility manager on process
- [ ] Monitor first week for errors

---

## Best Practices

1. **Never change iframe dimensions mid-page** — Causes layout shift, bad UX
2. **Use `allow="payment"` attribute** — Required for payment processing
3. **Test on mobile first** — Most storage traffic is mobile
4. **Respect scroll-to-iframe** — If below fold, auto-scroll when user starts flow
5. **Handle errors gracefully** — If storEDGE fails, show fallback (phone number, email)
6. **Monitor iframe performance** — Iframe adds ~500ms-1s load time (acceptable)
7. **Clear browser cache** — storEDGE updates can be cache-blocking
8. **Keep facility updated** — PMS sync important for real-time availability

---

**Updated:** 2026-03-14
