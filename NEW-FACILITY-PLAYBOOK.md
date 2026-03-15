# StowStack: New Facility Onboarding Playbook

Step-by-step checklist for bringing a self-storage facility into StowStack. Takes 2-3 weeks start to finish.

## Phase 1: Pre-Launch Discovery (Days 1-3)

You need to understand the facility's current situation before you can set up anything meaningful. Do this first.

### Facility Information

- [ ] **Facility name, address, phone:** Get exact details
  - Example: "Paw Paw Self Storage, 234 Madison Ave, Paw Paw MI 49079, (269) 657-2200"
- [ ] **Manager/owner contact:** Name and direct phone/email
- [ ] **Current occupancy:** Percentage full? What's the vacancy goal?
  - Example: "Currently 78% occupied, target is 92%"
- [ ] **Unit mix:** How many 5x5, 5x10, 10x10, 10x15, 10x20, climate-controlled?
  - Example: "24x 5x5, 36x 5x10, 48x 10x10, 20x 10x15, 8x 10x20"
- [ ] **Pricing:** What's the monthly rate for each unit size?
  - Example: "5x5: $35/mo, 5x10: $65/mo, 10x10: $125/mo, 10x15: $185/mo, 10x20: $225/mo"
- [ ] **Peak season:** When are move-ins heaviest? (seasonal pattern)
  - Example: "Peak June-August. Slow Nov-Jan."
- [ ] **Geographic service area:** What cities/towns does it serve?
  - Example: "Serves Paw Paw, Lawrence, Gobles, and surrounding 10-mile radius"

### Current Marketing & PMS

- [ ] **PMS system:** What property management software do they use?
  - Examples: "SiteLink, Syslog, StoragePRO, Evolve, Custom system"
  - Required for: Lease tracking, occupancy reporting, unit availability
- [ ] **Current tenants:** How many are paying customers? (for baseline revenue)
- [ ] **Website:** Do they have one? Outdated? What's the domain?
  - Example: "pawpaw-storage.com (built 2018, rarely updated)"
- [ ] **Current marketing:** How are they filling units now?
  - Examples: "Google Local, word-of-mouth, old Facebook ads, nothing organized"
  - Budget? ROI tracking?
- [ ] **Phone system:** Do they use call tracking? Can we see which ads drive calls?
- [ ] **Ad accounts:** Do they have Meta/Google Ads accounts already?
  - If yes, who manages them? Are they active?

### storEDGE Integration

- [ ] **storEDGE account:** Do they have one? Who's the primary contact?
  - storEDGE is the embedded reservation/move-in system
  - If no account: Refer to storEDGE sales first. They'll set up the facility and provide API access.
- [ ] **storEDGE facility ID:** Provided by storEDGE
  - Example: "facility_paw_paw_001"
- [ ] **storEDGE API key/token:** For embedding widgets on landing pages
- [ ] **storEDGE branding:** Do they want custom colors/logo in the widget?
- [ ] **storEDGE payment integration:** Can it accept ACH/card? Which gateway (Stripe, Square)?

### Competitive Landscape

- [ ] **Nearby competitors:** Who else offers storage in the area?
  - Go on Google Maps. Write down names, addresses, estimated sizes
  - Example: "Extra Space Storage (1 mile), CubeSmart (2 miles), Mom & Pop Storage (0.5 miles)"
- [ ] **Competitor pricing:** What are they charging for similar units?
- [ ] **Competitor marketing:** Are they running ads? What channels?
  - Check Google Ads (example.com?utm_source=google_ads), Meta (look for ads)

---

## Phase 2: Website Setup (Days 4-7)

Every facility needs a branded website with a working storEDGE reservation flow. This is your funnel top.

### Website Architecture

- [ ] **Decide: new site or update existing?**
  - If they don't have one: Use StowStack templates (see TEMPLATES.md)
  - If they have one: Can we add StowStack landing pages as subdirectory? (e.g., `pawpaw-storage.com/reserve/` or `pawpaw-storage.com/move-in/`)
  - Option: Keep their old site, we host landing pages on our domain
- [ ] **Domain:** Where will the main website live?
  - Option A: Their own domain (pawpaw-storage.com) — requires DNS setup
  - Option B: StowStack-hosted subdomain (pawpaw.stowstack.co) — faster setup
- [ ] **Facility information site:** Create/update these pages:
  - [ ] Home page with facility overview
  - [ ] Unit sizes & pricing page
  - [ ] Photo gallery (use phone photos if no professional shots)
  - [ ] Contact/location page
  - [ ] About/why-us page (differentiators vs. competitors)
  - [ ] FAQ page (address local concerns)

### storEDGE Widget Embed

- [ ] **Embed code:** Get from storEDGE
  - Example:
    ```html
    <iframe
      src="https://storeedge.app?facility=facility_paw_paw_001"
      width="100%" height="600"
      frameborder="0"></iframe>
    ```
- [ ] **Placement:** Where does the widget go?
  - Primary: "Reserve Now" or "Move In" page
  - Secondary: Unit listing pages (click unit → open storEDGE)
  - Tertiary: FAQ/Contact page (if relevant)
- [ ] **Styling:** Does the widget match the website's colors/branding?
- [ ] **Testing:** Can you select units, start a reservation, and see the payment screen?
  - Do NOT complete a test reservation. Stop at payment page.

### Core Pages for Landing Traffic

Even if the main website exists, add these dedicated pages for paid traffic:

- [ ] **"Reserve a Unit Now"** — Direct-to-storEDGE page
- [ ] **"Specials & Offers"** — Promo landing page with discount offer
- [ ] **"Move In Today"** — Urgency page for immediate movers
- [ ] **"Compare Units"** — Interactive unit size/price comparison

---

## Phase 3: Landing Page Creation (Days 8-12)

Each campaign gets its own landing page. Never drive traffic from ads to your general website — that's money left on the table.

### Landing Page Templates

Use these templates. Customize headlines/offers/CTAs per campaign.

**Template 1: "Reserve Now" (High Conversion)**
- Headline: "[City] Storage - Reserve Your Unit Now"
- Subheadline: "Secure a unit in 2 minutes. Move in [timeframe]."
- Image: Unit photo or facility exterior
- storEDGE embed: Full-width below fold
- CTA: "Start Your Reservation"
- Focus: Speed, simplicity, direct to booking
- Use for: Branded search, Google Local

**Template 2: "Limited Time Offer"**
- Headline: "[City] Storage - Move In Free This Month"
- Subheadline: "New customers get [specific offer]. Limited time."
- Image: Promotion/savings graphic
- Form: Email/phone capture before showing offer details (lead magnet)
- CTA: "Claim Your Offer"
- storEDGE link: Shown after lead capture
- Use for: Broad audience ads (no search intent)

**Template 3: "Size/Price Comparison"**
- Headline: "Storage Units in [City] - Compare Sizes & Prices"
- Content: Interactive table: Unit size → Monthly price → storEDGE link
- Images: Photos of each unit type
- Form: Optional (only after scroll depth >50%)
- Use for: Informational traffic, Google Ads broad match

**Template 4: "Local Authority"**
- Headline: "[City]'s #1 Rated Self-Storage"
- Content: Reviews, ratings, testimonials, facility facts
- Image: Facility exterior + happy customer quotes
- Form: "Request a Tour" or "Get Quote"
- storEDGE embed: Below form
- Use for: Brand competitors, retargeting

### Page Configuration Checklist

For each landing page:

- [ ] **URL structure:** Use pattern `stowstack.co/[facility-slug]/[campaign]`
  - Example: `stowstack.co/paw-paw-storage/reserve-now`
  - Example: `stowstack.co/paw-paw-storage/summer-special`
- [ ] **Page title & meta:** Include city + offer
  - Example: `"Paw Paw Storage Units - Reserve Now | StowStack"`
- [ ] **Headline:** Benefit-driven, specific
  - Good: "Find Your Storage Unit in Paw Paw in 2 Minutes"
  - Bad: "Storage Solutions"
- [ ] **Offer/Discount:** Clear, specific, urgent if applicable
  - Good: "Move in free. No fees this month."
  - Bad: "Great rates!"
- [ ] **Form fields:** Keep it minimal (3-4 fields maximum)
  - Essential: Email, Phone, Name (for storEDGE + lead follow-up)
  - Optional: City/Zip (for lead qualification)
- [ ] **Unit details:** Show sizes AND prices (transparency = trust)
- [ ] **Social proof:** Include reviews, ratings, testimonial quotes
- [ ] **Mobile responsive:** Test on iPhone and Android
- [ ] **Load speed:** Target < 3 seconds. Optimize images.
- [ ] **storEDGE embed:** Works? Can reserve without errors?

### Tracking Parameters Setup

Every landing page URL must include UTM parameters. (See TRACKING-SETUP.md for full reference.)

Standard pattern:
```
?utm_source=PLATFORM&utm_medium=MEDIUM&utm_campaign=CAMPAIGN&utm_content=VARIANT
```

Examples:
- Google Ads branded search:
  ```
  ?utm_source=google&utm_medium=cpc&utm_campaign=paw_paw_branded&utm_content=reserve_now
  ```
- Meta Ads audience:
  ```
  ?utm_source=facebook&utm_medium=cpc&utm_campaign=paw_paw_summer&utm_content=offer_video_1
  ```
- Retargeting:
  ```
  ?utm_source=facebook&utm_medium=cpc&utm_campaign=paw_paw_retarget&utm_content=cart_abandoners
  ```

- [ ] **Build URL spreadsheet:** List all landing page URLs + their UTM parameters
  - Keep this in shared Google Sheet with the facility manager
  - Update as campaigns change
- [ ] **Test each URL:** Verify UTM parameters are captured in query string (right-click → Inspect, look at Network tab)

---

## Phase 4: Tracking Configuration (Days 10-12)

Parallel with landing page creation. Install tracking pixels and set up attribution.

See detailed instructions in TRACKING-SETUP.md. Summary:

### Meta Pixel

- [ ] **Pixel ID:** Create if needed (Facebook Ads Manager → Events Manager)
- [ ] **Install browser pixel:** Add Meta Pixel code to landing page header
- [ ] **Install CAPI:** Set up server-to-Meta event sending (via Vercel function `/api/meta-capi`)
- [ ] **Test:** Trigger a test event. Watch Meta Events Manager for it to appear (real-time).
  - Example: Fill form, submit → should see "Lead" event in Meta within 5 seconds

### Google Ads Conversion Tracking

- [ ] **Conversion ID:** Create conversion action in Google Ads
- [ ] **Conversion label:** Copy the label code
- [ ] **Install gtag:** Add Google tag to landing page
- [ ] **Install server conversion:** Set up Vercel function `/api/google-conversion`
- [ ] **Test:** Fill form, submit → watch Google Ads conversion data (24-hour delay)

### UTM Parameter Capture

Landing pages must pass UTM parameters through to conversions. This is critical for attribution.

- [ ] **On form submission:** Capture URL parameters
  - Example: User lands on `?utm_source=facebook&utm_campaign=summer`
  - When they submit form: Store those params with the lead record
- [ ] **In storEDGE flow:** Pass UTMs through to reservation
  - storEDGE should include source/medium/campaign in the move-in data
  - Example: "Lead source: facebook | Campaign: summer | Content: offer_video_1"

### GCLID & FBCLID Capture

- [ ] **Google GCLID:** Automatically appended to URLs when clicked from Google Ads
  - Landing page should auto-capture from URL and store in sessionStorage
  - Send to Google Ads API with conversion
- [ ] **Meta FBCLID:** Automatically appended when clicked from Meta
  - Landing page should auto-capture from URL and store in sessionStorage
  - Send to Meta CAPI with event

See TRACKING-SETUP.md for implementation details.

---

## Phase 5: Campaign Launch Checklist (Days 13-16)

Set up ads in Meta and Google. Start small, scale what works.

### Meta Ads Setup

**Audience Strategy:**
- [ ] **Branded:** Target people searching "[City] storage" or "self storage near me"
  - Audience: Interests in "Self-storage" + Location geo-target (city + 5-10 mile radius)
  - Example: Paw Paw MI + 10 miles = covers Lawrence, Gobles, Lawton
- [ ] **Competitors:** Target people who've engaged with competitor ads/pages
  - Get competitor Facebook page URLs
  - Create custom audience: "Website visitors" + competitor domain
- [ ] **Lookalike:** Build lookalike audience from current customers (if available)
- [ ] **Broad audience:** Target people planning a move in the area
  - Interests: "Moving", "Relocation", "Home & Garden", "DIY", similar storage pages

**Campaign Structure:**

- [ ] **Create campaign:** Objective = "Leads" or "Conversions"
  - If driving to form: "Leads"
  - If driving to storEDGE reservation: "Conversions"
- [ ] **Ad set per audience:**
  - Ad Set 1: Branded (high intent)
  - Ad Set 2: Competitors (high intent)
  - Ad Set 3: Lookalike (medium intent)
  - Ad Set 4: Broad (low intent, test)
- [ ] **Budget allocation:**
  - Start with 40% branded, 40% competitors, 20% lookalike
  - Pause broad audience after 5 days (low intent, high CPC)
- [ ] **Daily budget:** Start at $20-30/day per audience
  - Total: ~$50-100/day to start
  - Scale once ROAS > 1.5x

**Creative Assets:**

- [ ] **Video ads:** 15-30 seconds
  - Option 1: Facility tour (music, text overlay with offer)
  - Option 2: Customer testimonial ("I found my unit in 5 minutes")
  - Option 3: Problem/solution (messy garage → organized unit)
- [ ] **Image ads:** 1080x1080 (square) or 1200x628 (feed)
  - Option 1: Facility exterior + headline overlay
  - Option 2: Unit photo + price/size overlay
  - Option 3: Offer/discount graphic + facility logo
  - Use 3-5 image variations per audience
- [ ] **Copy variations:**
  - Variation 1: Urgency ("Move in free this month")
  - Variation 2: Authority ("Top-rated storage in [City]")
  - Variation 3: Convenience ("Reserve in 2 minutes")
  - A/B test across audiences

**Ad Targeting & Placement:**

- [ ] **Platform:** Feed, Stories, Reels, Audience Network
  - Start with Feed + Stories (high intent users)
  - Add Reels after week 1 if CTR > 3%
- [ ] **Device:** Mobile primary, desktop secondary
  - Mobile CPC usually 30-40% lower for storage
- [ ] **Placement:** Specific pages if available, otherwise automatic
- [ ] **Language:** English (English-speaking regions only)

**Landing Page URLs:**

- [ ] **Ad 1 (Branded):** → `stowstack.co/paw-paw-storage/reserve-now?utm_source=facebook&utm_medium=cpc&utm_campaign=branded&utm_content=video_1`
- [ ] **Ad 2 (Offer):** → `stowstack.co/paw-paw-storage/summer-special?utm_source=facebook&utm_medium=cpc&utm_campaign=summer&utm_content=carousel_1`
- [ ] **Ad 3 (Testimonial):** → `stowstack.co/paw-paw-storage/reviews?utm_source=facebook&utm_medium=cpc&utm_campaign=social_proof&utm_content=image_1`

### Google Ads Setup

**Search Campaigns:**

- [ ] **Branded keywords:**
  - "[Facility name] storage", "[Facility name] units", "[Facility name] self storage"
  - Bid high (you own this intent)
  - Landing page: Branded reserve page
  - Typical CPC: $0.50-2.00
- [ ] **Local keywords:**
  - "storage units [city]", "self storage [city]", "[city] storage facility", "storage near me [city]"
  - Medium-high bid
  - Landing page: Local authority page
  - Typical CPC: $1.00-4.00
- [ ] **Competitor keywords:**
  - "[Competitor name] storage", "[Competitor name] units", etc.
  - High bid (capturing switchers)
  - Ad copy highlights your differentiators
  - Landing page: Comparison/offer page
  - Typical CPC: $2.00-8.00

**Keyword Bid Strategy:**

- [ ] Set conversion tracking first (see Tracking Configuration)
- [ ] Use "Maximize conversions" bid strategy
- [ ] Start with $1.50 CPC bid
- [ ] Adjust based on conversions after 100 clicks

**Ad Copy Examples:**

Branded (high intent):
```
Headline 1: Paw Paw Storage Units - Move In Today
Headline 2: Reserve Your Unit in 2 Minutes
Headline 3: Flexible Lease - No Long-Term Contract

Description 1: Secure a unit online in minutes. Climate-controlled options available.
Description 2: Move in free. New customers get first month free.
```

Local (medium intent):
```
Headline 1: Storage Units in Paw Paw, MI
Headline 2: 24-Hour Access - Climate Control Available
Headline 3: Lowest Prices in the Area - Guaranteed

Description 1: Find your perfect unit. Compare sizes and prices instantly.
Description 2: Top-rated storage facility serving Paw Paw & surrounding areas.
```

**Landing Pages:**

- [ ] Branded keywords → Reserve Now page
- [ ] Local keywords → Local Authority page
- [ ] Competitor keywords → Comparison/offer page

**Daily Budget:**

- [ ] Start: $20-30/day
- [ ] Target: $100-200/day after 2 weeks (if ROI positive)

### Retargeting Setup

- [ ] **Website pixel:** Track all visitors to your landing pages (already installed)
- [ ] **Form abandoners:** Retarget people who visited but didn't submit
  - Audience: Visited landing page, didn't convert
  - Use offer ad ("First month free if you move by [date]")
  - Budget: 20% of main campaign
- [ ] **storEDGE viewers:** Retarget people who started reservation but didn't complete
  - Audience: Engaged with storEDGE widget
  - Use urgency/social proof ads
  - Budget: 30% of main campaign (high intent)

---

## Phase 6: Post-Launch Monitoring (Weeks 3-4)

### Week 1: Stability Check

**Days 1-3 (Launch):**

- [ ] **Traffic check:** Are ads serving? Check Google Ads dashboard, Meta Ads Manager
  - Expected: 10-30 clicks/day (depends on budget)
  - If zero clicks after 6 hours: Check ads are approved, budget is set, bid is active
- [ ] **Conversion check:** Are leads coming in?
  - Check landing page analytics
  - Check Meta Events Manager (real-time events)
  - Check Google Ads conversions (24-hour delay)
  - If zero conversions after 50 clicks: Check form validation, storEDGE embed, pixel firing

**Days 4-7 (Week 1):**

- [ ] **Cost per lead:** Calculate average CPC × form conversion rate
  - Example: $2.00 CPC × 5% form conversion = $40 cost per lead
  - Is this acceptable? (Typical: $15-60 for storage)
- [ ] **Lead quality:** Are leads real?
  - Check facility manager: Do phones have real names? Do emails appear genuine?
  - If high spam rate: Tighten audience targeting, add form validation
- [ ] **Reservation start rate:** Of leads, how many start a reservation?
  - Example: 20 leads → 8 start reservation = 40% conversion
  - If low: Check storEDGE embed, unit availability, pricing
- [ ] **Move-in rate:** Of reservations, how many complete and move in?
  - Example: 8 reservations → 1 move-in = 12.5% conversion
  - This is harder to track early (move-in takes 1-4 weeks)
  - Follow up with facility manager to track completions

### Week 2: Optimization

- [ ] **Pause underperforming:** If any ad set has CPC > 2x average, pause it
  - Example: Broad audience CPCs $6.00+ → pause, reallocate budget
- [ ] **Scale winners:** If CPL < target, increase budget 20-30%
  - Example: Branded search at $25 CPL → increase budget from $30 to $40/day
- [ ] **Test new creative:** If CTR < 2% (benchmark: 3-5% for storage), test new images/videos
  - Keep 2-3 winning creatives rotating
  - Test 1 new creative every 3-4 days
- [ ] **Refine audiences:** Check which audience has lowest CPL
  - Example: Branded audience CPL $20 vs. Broad $45
  - Reallocate budget toward branded
- [ ] **Ad copy testing:** A/B test headlines/descriptions
  - Test 1 variable per week
  - Example: Week 1 test urgency ("Move in free THIS MONTH") vs. authority ("Top-rated")

### Week 3-4: Attribution & Reporting

- [ ] **Map reservations to leads:** Which campaign drove which reservation?
  - storEDGE should include UTM source/campaign with each reservation
  - Example: "Lead from facebook | summer campaign" → reservation ID 12345
- [ ] **Map move-ins to campaigns:** Which campaigns produce actual tenants?
  - Work with facility manager to match move-in dates/names to reservation data
  - This is critical for understanding true ROAS
  - Example: 20 leads from Facebook → 2 move-ins = $X cost per actual tenant
- [ ] **Attribution dashboard:** Build weekly reporting view
  - See REPORTING.md for dashboard config
  - Minimum: Spend, Clicks, Leads, Reservations, Move-ins by Campaign
- [ ] **Weekly report:** Send facility manager a summary
  - Example:
    ```
    Week 1 Results (Paw Paw Storage)

    Google Ads:
    - Spend: $147
    - Clicks: 71
    - Leads: 8
    - Cost/Lead: $18.38

    Meta Ads:
    - Spend: $98
    - Clicks: 54
    - Leads: 6
    - Cost/Lead: $16.33

    Top Performer: Google Branded (5 leads, $14.80 CPL)
    Action: Increase budget +30%, test new ad copy

    Next Week: Test video ads on Meta, launch retargeting
    ```

---

## Phase 7: Ongoing A/B Testing Schedule

### Weekly Tests

- [ ] **Ad creative:** Rotate new images/videos every 3-4 days
  - Keep 3-5 best performers active
  - Monitor CTR (target: 3-5%)
- [ ] **Ad copy variations:** Test 1 variable per week
  - Week 1: Urgency vs. authority
  - Week 2: Price focus vs. convenience focus
  - Week 3: Specific offer vs. generic offer

### Bi-Weekly Tests

- [ ] **Landing page elements:**
  - Headline variations (5-10 different headlines)
  - Form length (3-field vs. 5-field)
  - storEDGE placement (above fold vs. below)
  - CTA button text ("Reserve Now" vs. "Get Started")
- [ ] **Audience adjustments:**
  - Expand/contract geographic radius
  - Test age targeting (18-35 vs. 25-55)
  - Add/remove interest audiences

### Monthly Tests

- [ ] **Offer variations:**
  - "Move in free" vs. "First month 50% off" vs. "No fees"
  - Month-long promotions vs. limited-time offers
  - Which offer drives most conversions?
- [ ] **Campaign structure:**
  - New audience segments
  - New keyword themes (Google)
  - New remarketing audiences

---

## Phase 8: Reporting & Dashboard Setup

### Attribution Dashboard

Create a shared Google Sheet with tabs:

**Tab 1: Weekly Summary**
- Columns: Week, Google Spend, Google Leads, Google CPL, Meta Spend, Meta Leads, Meta CPL, Total Spend, Total Leads, Total CPL, Reservations, Move-ins
- Example:
  ```
  Week | Google $ | G Leads | G CPL | Meta $ | M Leads | M CPL | Total $ | T Leads | T CPL | Reserv. | Move-in
  1    | $147     | 8       | $18   | $98    | 6       | $16   | $245    | 14      | $18   | 5       | 1
  2    | $198     | 12      | $17   | $127   | 9       | $14   | $325    | 21      | $15   | 8       | 2
  ```

**Tab 2: Campaign Performance**
- Columns: Campaign, Source, Spend, Clicks, CTR, Leads, CPL, Reservations, Cost/Reservation, Move-ins, Cost/Move-in
- Example:
  ```
  Campaign | Source | Spend | Clicks | CTR  | Leads | CPL   | Reserv | Cost/R | Move-in | Cost/MV
  Branded  | Google | $180  | 95     | 4.2% | 10    | $18   | 7      | $26    | 2       | $90
  Summer   | Meta   | $125  | 68     | 3.1% | 5     | $25   | 2      | $63    | 0       | N/A
  ```

**Tab 3: Unit Conversion**
- Columns: Campaign, Leads, Reservations, Res Rate, Move-ins, MV Rate, Units Filled
- Tracks: Funnel from lead → reservation → actual occupancy

**Tab 4: Monthly P&L**
- Columns: Month, Total Ad Spend, Total Leads, CPL, Total Move-ins, Avg Unit Rent, Monthly Occupancy Revenue, ROAS
- Example:
  ```
  Month | Spend | Leads | CPL  | Move-in | MR/mo | Revenue/mo | ROAS
  Jan   | $980  | 56    | $18  | 7       | $125  | $10,500    | 10.7x
  ```

### Monthly Report Template

Every month, send the facility manager:

```markdown
# Marketing Report - [Facility] - [Month/Year]

## Summary
- Total ad spend: $X
- Total leads: Y
- Cost per lead: $Z
- Leads to reservations: A%
- Reservations to move-in: B%
- Units filled via StowStack: C

## Campaign Breakdown
[Table with performance by campaign]

## What's Working
- [Top 3 performers with numbers]

## What Needs Work
- [Bottom 2 performers + recommendations]

## Next Month's Plan
- [Testing schedule + optimization focus]

## Contact
[Your contact info for questions/changes]
```

---

## Troubleshooting & Common Issues

### No Leads Coming In

**Check in order:**

1. Are ads serving?
   - Log into Meta Ads Manager / Google Ads
   - Is daily budget showing spend?
   - If not: Check payment method, ad approval status
2. Is traffic reaching landing page?
   - Check Google Analytics for pageviews
   - If zero pageviews: Ad isn't showing or click tracking is broken
   - If high pageviews but no leads: Landing page conversion issue (see below)
3. Is form submitting?
   - Load landing page yourself
   - Try to submit form. Do you get success message?
   - Check browser console (F12 → Console) for JavaScript errors
   - If form won't submit: Check field validation, email confirmation requirement

### Low Conversion Rate (Leads)

**Landing page not converting?**

1. **Form friction:** Can you fill and submit in < 30 seconds?
   - Remove unnecessary fields
   - Auto-detect location if possible
   - Use autofill for email/phone
2. **storEDGE embed:** Does it load? Can you select units?
   - Test in incognito mode (no cache)
   - Check network tab for JavaScript errors
   - Verify facility ID is correct
3. **Mobile experience:** Does form look good on phone?
   - Most storage leads come from mobile
   - Buttons big enough? Text readable?
4. **Copy clarity:** Does the offer jump out?
   - Headline should have number or specific benefit
   - "Move in free" > "Great rates"
   - Color-code the offer text

### Low Move-In Rate (Reservations Not Completing)

1. **storEDGE issues:** Does the payment step work?
   - Contact storEDGE support if payment form has errors
   - Check if they're testing (some users abandon before payment intentionally)
2. **Unit availability:** Are the units they want actually available?
   - Ask facility manager to check
   - If all units booked, pause ads or run waiting-list campaign
3. **Follow-up:** Are prospects getting follow-up from facility?
   - Call? Email? Text?
   - Many prospects need a personal touch
   - Recommend facility call within 1 hour of reservation start

### High Ad Spend, No ROI

**Audience problem or targeting problem?**

1. **Audience too broad:** Are you reaching the right people?
   - Pause "Broad" audiences
   - Focus on "Branded" + "Competitors" (high intent)
   - Add "Lookalike" based on actual customers only
2. **Geographic targeting:** Are you in the right area?
   - Example: Ads to wrong city/state will waste spend
   - Verify targeting matches facility's service area
3. **Budget allocation:** Where's the money going?
   - Move budget from low-performing campaigns to winners
   - If all underperforming: Creative isn't resonating
   - Test new images/videos

### Pixel Tracking Not Working

See TRACKING-SETUP.md for debugging. Quick checklist:

- [ ] Pixel ID correct?
- [ ] Browser pixel installed? (Check Facebook Events Manager → real-time)
- [ ] Server endpoint working? (Check Vercel logs for errors)
- [ ] UTM parameters passed through? (Check Network tab)

---

## Facility Success Criteria

By end of month 1, you should see:

- **Traffic:** 300+ clicks/month from paid ads
- **Leads:** 20+ qualified leads/month (CPL < $40)
- **Conversion:** 20-40% lead-to-reservation rate
- **Move-ins:** 3-5 move-ins driven by StowStack (varies by occupancy)
- **ROAS:** 3x-5x return on ad spend (depends on unit price)

If you're hitting these, scale budget. If not, debug and optimize before scaling.

---

## Handoff Checklist

When you're ready to hand off facility to ongoing management:

- [ ] Facility manager trained on dashboard
- [ ] Auto-weekly report configured (email facility manager)
- [ ] Ads running with clear stopping rules
- [ ] Backup contact person identified (if manager unavailable)
- [ ] Budget approval process defined (who approves increases?)
- [ ] Lead quality bar set (what makes a valid lead?)
- [ ] Move-in tracking process defined (how do we know if it worked?)
- [ ] A/B testing schedule documented
- [ ] Seasonal adjustment plan written (budget higher in summer, lower in winter)

---

## Next Steps

After launch stabilizes (week 3-4):

1. Expand to Google Local Services Ads (if available in market)
2. Add organic SEO strategy (local keyword targeting)
3. Implement chatbot on landing pages for qualification
4. Test direct mail to competitors' customers
5. Build lookalike audiences from actual move-in customers (stronger signal)
6. Develop referral program (customer → friends)
7. Expand to YouTube Ads (video testimonials)

---

**Start date:** [Date]
**Launch date:** [Date + 2 weeks]
**First optimization meeting:** [Date + 3 weeks]
**Next review:** [Date + 8 weeks]
