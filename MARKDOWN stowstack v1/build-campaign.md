---
name: build-campaign
description: Generate a full Meta ad campaign spec for a new client. Usage: /stowstack:build-campaign "Facility Name"
arguments:
  - name: facility
    description: Client facility name
    required: true
---

# Build Campaign Spec

Read context/service-stack.md. Check /clients/ and /leads/ for this facility's data (onboarding info, unit mix, vacancy details, budget).

Generate a complete campaign specification saved to output/campaigns/{facility-slug}-campaign-spec-{date}.md:

## 1. Campaign Architecture
- Campaign naming convention: SS_{FacilityCode}_{UnitType}_{Objective}
- Ad set structure for each vacant unit type (prospecting + retargeting per type)
- Budget allocation: recommend split across ad sets based on vacancy priority
- Campaign objectives: Lead generation for high-vacancy types, traffic for retargeting

## 2. Audience Targeting
Per ad set, specify:
- Location: radius from facility address (typically 10-15 miles, adjust for market density)
- Age range: 25-65 for standard, 30-55 for climate/premium, 45-70 for downsizing
- Demand-trigger targeting mapped to unit types:
  - Standard units → moving, divorce, downsizing, remodel
  - Climate units → business overflow, collectors, wine/documents
  - Large units → estate cleanout, renovation, business inventory
  - Vehicle/RV/boat → seasonal vehicle owners, boat/RV interest
  - Small units → college, military deployment, decluttering
- Custom audiences: website visitors (if pixel exists), lead form engagers
- Lookalike audiences: from existing customer list (if available)
- Exclusions: existing customers, employees, outside radius

## 3. Ad Creative Briefs
Per ad set, 2-3 variations. For each:
- **Headline** (max 40 chars): specific to unit type and trigger
- **Primary text** (max 125 chars): benefit-driven, urgency if applicable
- **Description**: supporting detail
- **CTA button**: "Learn More" for awareness, "Sign Up" for lead forms, "Call Now" for direct response
- **Creative direction**: what image/video to use or create
- **Format**: single image, carousel, or video recommendation

Creative angle bank:
- Moving: "Moving to {City}? Lock in storage before move-in day."
- Urgency: "Only {X} {unit type}s left at ${rate}/mo."
- Price anchor: "First month free on {unit type} at {Facility}."
- Social proof: "{X}+ families store with {Facility}. {Rating}★ on Google."
- Problem-solution: "Downsizing? Don't throw it away. {Unit type} from ${rate}/mo."
- Seasonal: "Winter is coming. Heated indoor boat storage from ${rate}/mo."

## 4. Lead Form Spec (for Meta lead form campaigns)
- Form name: "{Facility} — Reserve Your Unit"
- Headline: "Reserve a {unit type} at {Facility}"
- Description: 1-2 sentences about the facility + current offer
- Questions: Full name (prefilled), Email (prefilled), Phone (prefilled), "What size unit do you need?" (multiple choice), "When do you need to move in?" (This week / Within 2 weeks / Within a month / Just exploring)
- Privacy policy URL: facility website privacy page
- Thank you screen: "Thanks! {Facility} will call you within 2 hours to help you reserve your unit." + phone number + directions link

## 5. Landing Page Brief
- Headline: "{City}'s {adjective} Self Storage — {Offer}"
- Subheadline: "Drive-up access, climate-controlled, and secure. Reserve online in 2 minutes."
- Key selling points: 3-4 specific to this facility (24hr access, security cameras, climate control, month-to-month, etc.)
- Form: name, email, phone, unit size, move-in date
- Urgency element: "Only {X} units left at this rate" or "Offer ends {date}"
- Phone number: click-to-call, prominently displayed
- Trust signals: Google rating, years in business, facility photos

## 6. Tracking Setup Checklist
- [ ] Meta Pixel installed on facility website
- [ ] Pixel events configured: PageView, Lead, ViewContent, Contact
- [ ] Conversions API setup (server-side event deduplication)
- [ ] UTM parameters: utm_source=meta&utm_medium=paid&utm_campaign={campaign_name}&utm_content={ad_set_name}
- [ ] Lead form webhook connected to notification system
- [ ] Call tracking number provisioned (if applicable)
- [ ] Google Analytics linked (if applicable)
