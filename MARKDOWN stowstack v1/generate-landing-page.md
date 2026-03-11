---
name: generate-landing-page
description: Generate a facility-specific landing page for ad campaigns. Usage: /stowstack:generate-landing-page "Facility Name"
arguments:
  - name: facility
    description: Client facility name
    required: true
---

# Generate Landing Page

Read the campaign spec from output/campaigns/ for this facility. Also check /clients/ for onboarding data (unit mix, rates, address, phone, promotions, photos).

Generate a single-file HTML landing page optimized for self-storage lead conversion.

## Page Structure

### Hero Section
- Facility name + city in headline
- Primary offer (first month free, 50% off, etc.) — big and bold
- Phone number with click-to-call link
- Short lead capture form: name, phone, email, unit size dropdown, move-in timeline dropdown
- Submit button: "Reserve My Unit" or "Get My Quote"

### Trust Bar
- Google review rating + count (e.g., "4.8★ from 127 reviews")
- Years in business
- Key features as icons: 24/7 Access, Security Cameras, Climate Controlled, Month-to-Month

### Available Units Section
- Cards for each available unit type
- Each card: unit size, monthly rate, key features, "Reserve Now" button
- If promotion applies to specific units, show the discounted rate with strikethrough on original

### Why Choose {Facility} Section
- 3-4 bullet points specific to this facility
- Keep it operator-grounded, not salesy

### FAQ Section
- 4-5 common questions auto-generated for this facility type:
  - "What size unit do I need?"
  - "Is there a long-term contract?" (No — month-to-month)
  - "What are your access hours?"
  - "Is the facility secure?"
  - "How do I reserve a unit?"

### Final CTA
- Repeat the form
- Phone number again
- "Limited availability — reserve today"

### Footer
- Facility address with Google Maps link
- Phone number
- Hours of operation

## Technical Requirements
- Single HTML file, all CSS and JS inline
- Mobile-first responsive design
- No external dependencies except one Google Font (Inter or similar)
- Fast loading — no images unless provided as URLs
- Meta Pixel placeholder: replace PIXEL_ID_HERE with actual ID
- Google Analytics placeholder: replace GA_ID_HERE
- Form action: configurable endpoint URL (placeholder)
- Schema.org LocalBusiness JSON-LD with facility data
- OpenGraph tags with facility name and city
- Clean, modern design — white bg, facility brand color as accent if provided, otherwise green

## Save
Save to output/landing-pages/{facility-slug}-landing-{date}.html
