# StowStack Pixel Tracking - Quick Start

Get pixel tracking running in 5 minutes.

## 1. Set Environment Variables

Add to `.env.local` (development):
```
REACT_APP_META_PIXEL_ID=YOUR_PIXEL_ID
REACT_APP_GOOGLE_CONVERSION_ID=AW-XXXXXXXXX
REACT_APP_GOOGLE_CONVERSION_LABEL=YOUR_LABEL
```

Add to Vercel dashboard (production):
```
META_PIXEL_ID=YOUR_PIXEL_ID
META_ACCESS_TOKEN=YOUR_ACCESS_TOKEN
GOOGLE_CONVERSION_ID=AW-XXXXXXXXX
GOOGLE_CONVERSION_LABEL=YOUR_LABEL
```

## 2. Initialize in Your App

In `src/App.tsx`:

```tsx
import { useEffect } from 'react'
import { initializePixel } from '@/utils/pixel'

function App() {
  useEffect(() => {
    initializePixel({
      metaPixelId: process.env.REACT_APP_META_PIXEL_ID || 'YOUR_ID',
      googleConversionId: process.env.REACT_APP_GOOGLE_CONVERSION_ID,
      googleConversionLabel: process.env.REACT_APP_GOOGLE_CONVERSION_LABEL,
      debug: process.env.NODE_ENV === 'development',
    })
  }, [])

  return (
    // ... your app
  )
}
```

## 3. Track Conversions

### Track a Lead (Form Submission)

```tsx
import { trackLead } from '@/utils/pixel'

async function handleFormSubmit(data) {
  // Submit form
  await submitForm(data)

  // Track conversion
  await trackLead({
    email: data.email,
    phone: data.phone,
    firstName: data.name.split(' ')[0],
  }, 100) // Optional: lead value
}
```

### Track a Move-In

```tsx
import { trackMoveIn } from '@/utils/pixel'

async function handleMoveInComplete(customer) {
  await trackMoveIn({
    email: customer.email,
    phone: customer.phone,
  }, 1250) // Move-in value
}
```

### Track Any Event

```tsx
import { trackConversion } from '@/utils/pixel'

await trackConversion({
  event_name: 'ViewContent',
  user_data: {
    email: 'customer@example.com',
  },
  custom_data: {
    content_name: '10x10 Unit',
    content_id: 'UNIT-001',
  },
})
```

## 4. Verify It Works

1. Enable debug logs (happens auto in dev)
2. Open DevTools Console
3. Look for `[Pixel]` messages
4. Go to Meta Events Manager → events should appear
5. Go to Google Ads → conversions should appear

## 5. Done!

Your pixel is now tracking:
- ✓ Server-side events to Meta CAPI & Google Ads
- ✓ Browser pixel fires for real-time reporting
- ✓ Auto deduplication between browser & server
- ✓ User data hashing for privacy
- ✓ GCLID/FBCLID capture for attribution

---

## Common Integration Points

### Audit Form (AuditIntakeForm.jsx)
```jsx
const handleSubmit = async (data) => {
  await fetch('/api/audit-form', { method: 'POST', body: JSON.stringify(data) })
  await trackLead({ email: data.email, phone: data.phone }, 100)
}
```

### Contact Form
```jsx
const handleSubmit = async (data) => {
  await trackLead({ email: data.email, phone: data.phone })
}
```

### Reservation Start
```jsx
const handleReservationStart = async (userData, unitPrice) => {
  getPixel().trackReservationStart(userData, unitPrice)
}
```

### Move-In Completed
```jsx
const handleMoveIn = async (customer, moveInValue) => {
  await trackMoveIn({ email: customer.email }, moveInValue)
}
```

---

## Troubleshooting

**Events not appearing in Meta Events Manager?**
- Check `META_PIXEL_ID` is correct
- Check `META_ACCESS_TOKEN` is set in Vercel
- Enable debug mode and check console

**Google Ads not recording conversions?**
- Check `GOOGLE_CONVERSION_ID` format (should be `AW-XXXXXXXXX`)
- Verify GCLID is being captured (check sessionStorage)
- Check Google Ads conversion settings

**Seeing double counts?**
- Deduplication should handle this
- Check event_id matches between client & server

---

See **PIXEL_INTEGRATION.md** for full documentation.
