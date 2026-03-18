# StowStack — Deep Feature Prompts

> These are implementation-ready prompts for 5 demand engine features. Each prompt contains exact file paths, data shapes, API contracts, UI specs, copy, and strategic rationale. Review and greenlight whichever you want built.

---

## FEATURE 1: "Revenue You're Leaving on the Table" Calculator

### Strategic Purpose
This is the Zoom closer. When an operator fills out the audit form, they get invited to a call. On that call you screenshare this component. It shows them a ticking debt clock of revenue they're hemorrhaging — broken into 5 categories they can't argue with because the numbers come from THEIR data. The goal is a visceral "oh shit" moment where the operator realizes inaction costs more than StowStack. This is the difference between "why should I pay you" and "how fast can you start."

### Files to Create
- `src/components/dashboard/RevenueLossCalculator.tsx` — main component
- `api/revenue-loss.js` — server-side calculation endpoint
- `src/components/dashboard/revenue/AnimatedCounter.tsx` — ticking number animation
- `src/components/dashboard/revenue/LossCategory.tsx` — expandable row component
- `src/components/dashboard/revenue/RecoverySlider.tsx` — "what if" interactive slider
- `src/components/dashboard/revenue/LossReport.tsx` — print/PDF export version

### Data Pipeline

**Input Sources (all exist in the database already):**
1. `facility_pms_snapshots` → total_units, occupied_units, occupancy_pct, actual_revenue, gross_potential, delinquency_pct, move_ins_mtd, move_outs_mtd
2. `facility_pms_units` → unit_type, size_label, total_count, occupied_count, street_rate, actual_avg_rate, web_rate
3. `facility_market_intel` → competitors[].rating, competitors[].reviewCount, competitors[].website, demographics.population, demographics.median_income, demographics.renter_pct
4. `facilities` → occupancy_range, total_units, biggest_issue, location
5. `marketing_plans` → spend_recommendation.monthlyBudget

**If PMS data doesn't exist yet (pre-onboarding leads):** Fall back to audit form data — use OCCUPANCY_MID mapping from `audit-report.js` (below-60: 50, 60-75: 67.5, 75-85: 80, 85-95: 90, above-95: 97) and AVG_UNIT_RATE of $125/mo. This means the calculator works for cold leads on the Zoom call even before full onboarding.

### API Endpoint: `GET /api/revenue-loss?facilityId=X`

**Response shape:**
```json
{
  "facilityName": "Paw Paw Storage",
  "calculatedAt": "2026-03-17T...",
  "totalAnnualLoss": 87420,
  "categories": {
    "vacancyDrag": {
      "label": "Empty Units Sitting Idle",
      "annualLoss": 36000,
      "monthlyLoss": 3000,
      "detail": "You have 20 vacant units at an average rate of $150/mo. That's $3,000/mo walking out the door.",
      "vacantUnits": 20,
      "avgRate": 150,
      "severity": "critical"
    },
    "rateGap": {
      "label": "Underpriced vs. Market",
      "annualLoss": 21600,
      "monthlyLoss": 1800,
      "detail": "Your average 10x10 rate is $95/mo. Competitors within 5 miles average $110/mo. Across 120 occupied units, you're leaving $1,800/mo on the table.",
      "yourAvgRate": 95,
      "marketAvgRate": 110,
      "affectedUnits": 120,
      "severity": "high"
    },
    "marketingVoid": {
      "label": "Leads You're Not Getting",
      "annualLoss": 18000,
      "monthlyLoss": 1500,
      "detail": "With $0 ad spend, you're invisible to the 2,400 people searching for storage in your area each month. At industry benchmarks, $1,500/mo in ads would generate 8-12 move-ins/quarter.",
      "currentAdSpend": 0,
      "estimatedSearchVolume": 2400,
      "missedMoveInsPerQuarter": 10,
      "severity": "critical"
    },
    "competitorCapture": {
      "label": "Demand Your Competitors Are Taking",
      "annualLoss": 7200,
      "monthlyLoss": 600,
      "detail": "3 of 5 competitors within 5 miles are running Google Ads. They have 340 combined reviews vs. your 28. They're capturing demand you're not even competing for.",
      "competitorsWithAds": 3,
      "totalCompetitors": 5,
      "theirTotalReviews": 340,
      "yourReviews": 28,
      "severity": "high"
    },
    "churnBleed": {
      "label": "Net Move-Out Trend",
      "annualLoss": 4620,
      "monthlyLoss": 385,
      "detail": "You've had 8 move-outs vs. 5 move-ins this month. At this pace, you'll lose 9 more units over 6 months — that's another $4,620 in annual revenue gone.",
      "moveInsThisMonth": 5,
      "moveOutsThisMonth": 8,
      "projectedLossUnits6mo": 9,
      "severity": "warning"
    }
  },
  "recovery": {
    "withStowStack": {
      "projectedMoveInsPerMonth": 8,
      "projectedRevenueRecovered": 57600,
      "projectedROAS": 4.8,
      "timeToImpact": "7-14 days"
    },
    "breakeven": {
      "plan": "Growth",
      "monthlyCost": 999,
      "unitsNeededToBreakeven": 1.2,
      "message": "You need 1.2 move-ins per month to pay for StowStack. We project 8."
    }
  }
}
```

### Calculation Logic (in `api/revenue-loss.js`)

```
VACANCY DRAG:
  vacantUnits = total_units - occupied_units
  IF PMS units data exists:
    avgRate = weighted average of street_rate across all unit types
  ELSE:
    avgRate = $125 (canonical)
  monthlyLoss = vacantUnits × avgRate
  annualLoss = monthlyLoss × 12
  severity = vacantUnits > (total_units × 0.2) ? "critical" : vacantUnits > (total_units × 0.1) ? "high" : "warning"

RATE GAP:
  FOR each unit_type in facility_pms_units:
    yourRate = actual_avg_rate
    competitorRates = scrape competitor sites OR use market median estimate
    IF no competitor rate data:
      marketRate = yourRate × 1.08 (conservative 8% underpricing assumption)
    gap = marketRate - yourRate
    IF gap > 0:
      monthlyGap += occupied_count × gap
  annualLoss = monthlyGap × 12
  severity = (monthlyGap / actual_revenue) > 0.1 ? "critical" : > 0.05 ? "high" : "warning"

MARKETING VOID:
  currentSpend = from onboarding data OR 0
  IF currentSpend == 0:
    estimatedSearchVolume = demographics.population × 0.02 (2% monthly storage search rate)
    missedLeads = estimatedSearchVolume × 0.03 (3% click-through benchmark)
    missedMoveIns = missedLeads × 0.20 (20% lead-to-move-in)
    monthlyLoss = missedMoveIns × avgRate
  ELSE:
    Use benchmark CPL ($35) vs their actual to estimate efficiency gap
  annualLoss = monthlyLoss × 12

COMPETITOR CAPTURE:
  competitors = from facility_market_intel
  competitorsWithAds = count where website exists AND rating > 4.0 (proxy for active marketing)
  reviewGap = sum(competitor.reviewCount) - facility reviews
  monthlyLoss = (competitorsWithAds / totalCompetitors) × 2 × avgRate (each active competitor captures ~2 units/mo of demand)
  annualLoss = monthlyLoss × 12

CHURN BLEED:
  netMovement = move_ins_mtd - move_outs_mtd
  IF netMovement < 0:
    projectedLoss6mo = abs(netMovement) × 3 (extrapolate 6 months conservatively)
    monthlyLoss = projectedLoss6mo × avgRate / 6
    annualLoss = monthlyLoss × 12
  ELSE:
    annualLoss = 0 (positive trend — don't scare them here)

RECOVERY PROJECTION:
  recommendedSpend = from marketing_plan OR $1500 default
  projectedCPL = $35 benchmark
  projectedLeads = recommendedSpend / projectedCPL
  projectedMoveIns = projectedLeads × 0.25
  projectedRevenue = projectedMoveIns × avgRate × 12
  breakeven = stowstackFee / avgRate (how many move-ins to cover the subscription)
```

### UI Specification

**Layout:** Full-width dark card (`bg-slate-900 border border-red-500/20`) with sections stacked vertically. Designed to look devastating on a screenshare.

**Header:**
- Facility name + location
- "Revenue Gap Analysis" title
- "Generated [date]" timestamp
- Severity badge: "CRITICAL" (red pulse) / "HIGH" (orange) / "MODERATE" (yellow)

**The Big Number (top center):**
- `$XX,XXX` in large red text (`text-5xl font-bold text-red-500`)
- Label: "Estimated Annual Revenue You're Losing"
- Animated counter: starts at $0 and ticks up over 2 seconds using requestAnimationFrame
- Below: monthly equivalent in smaller text: "That's $X,XXX every month"

**Category Breakdown (5 expandable rows):**
Each row: icon | category name | monthly loss | annual loss | severity badge | expand arrow
- Collapsed: single line with key metric
- Expanded: full detail paragraph + supporting data points
- Color coding: critical = red-500, high = orange-500, warning = yellow-500
- Rows sorted by annual loss descending (biggest bleeder first)

**"What If" Recovery Slider:**
- Slider: "If you filled just [X] more units per month..." (range: 1 to vacantUnits)
- As slider moves, show green counter: "That's $[Y] recovered annually"
- Below slider: "StowStack operators fill an average of 8 additional units per month"

**Side-by-Side Comparison:**
- Left column (red background): "Next 12 Months Without StowStack" → show projected losses continuing
- Right column (green background): "Next 12 Months With StowStack" → show projected recovery
- Bottom: "Net difference: $XX,XXX" in bold green

**Breakeven Callout:**
- Card: "You need [1.2] move-ins per month to cover your StowStack subscription. We project [8]."
- Visual: progress bar showing 1.2 out of 8 filled in green

**Actions:**
- "Download PDF Report" → generates branded PDF with all data (use html2canvas or similar)
- "Share with Partner" → generates unique URL (reuse shared-audits pattern)
- "Start Your Free Audit" → routes to audit form (for website-facing version)

### Integration Points
1. **Audit Report Page** — embed RevenueLossCalculator below the existing audit report scores. Wire into `api/audit-report.js` response.
2. **AdminDashboard Pipeline** — show `totalAnnualLoss` as a red badge on each lead card in the pipeline view. Quick visual: "This lead is bleeding $87K/yr."
3. **ClientPortal** — show ongoing version that updates monthly as PMS data refreshes. Track improvement over time: "You've recovered $12,400 since starting."
4. **Marketing Website** — teaser version on the front page: "Enter your unit count and vacancy to see what you're losing" with a simplified calculator that leads into the audit form.

### Dark Mode
Follow existing patterns: `bg-slate-800 border-slate-700` for cards, `text-slate-100` for text, `text-slate-400` for secondary. The red/green accent colors stay the same in both modes.

---

## FEATURE 2: Front Page Rebuild — Demand Engine Positioning

### Strategic Purpose
The front page is the first thing an operator sees. Right now it reads like a competent SaaS marketing page. The problem: your target customer is a cowboy operator who "doesn't know shit about marketing and is making money in spite of themselves." They don't respond to SaaS copy. They respond to fear, plain English, and proof that you understand their world. The rebuild positions StowStack as a demand engine — a machine that fills units — not a service, not an agency, not software. The entire page should make them feel two things: (1) "holy shit I'm losing money" and (2) "these guys actually operate storage, they get it."

### Files to Create/Modify
- `src/components/website/` — new directory, extract sections from App.tsx
  - `HeroSection.tsx`
  - `RevenueLeak.tsx` (the problem section)
  - `DemandEngine.tsx` (the engine visual)
  - `ComparisonTable.tsx` (3-way comparison)
  - `InactionTimeline.tsx` (what happens when you don't act)
  - `PricingSection.tsx` (with ROI calculator)
  - `TestimonialsSection.tsx`
  - `FAQSection.tsx`
  - `FooterCTA.tsx`
  - `QuickCalculator.tsx` (inline unit count → loss estimator)
- Modify `src/App.tsx` — replace inline website sections with imported components

### Section-by-Section Spec

#### SECTION 1: Hero
**Layout:** Full-viewport dark section (`min-h-screen`) with gradient mesh background (reuse `.gradient-mesh`)

**Headline options (pick one, A/B test later):**
- A: "Your Facility Is Leaking Revenue. Every. Single. Day."
- B: "Stop Paying for Clicks. Start Filling Units."
- C: "Every Empty Unit Is a $150/Month Problem Nobody's Solving."

**Subheadline:** "StowStack is the demand engine that turns vacant units into paying tenants — from the first ad impression to the signed lease. Full attribution. No contracts. Built by a storage operator."

**Visual:** Animated horizontal pipeline. Five connected nodes with arrows between them, each showing a step and a dollar amount:
```
[Ad Impression] → [Landing Page Click] → [Unit Selected] → [Reservation] → [Move-In + Revenue]
   $0.50 CPC        8.7% conv rate         47 this month      34 move-ins      $41 cost each
```
Each node animates in sequence (stagger-children pattern), arrows pulse with data flowing through them. Use existing `.animate-fade-left` / `.animate-fade-right` classes.

**CTA:** Two buttons side by side:
- Primary (green): "See What You're Losing → Free Audit"
- Secondary (outline): "Watch How It Works" (scrolls to engine section)

**Credibility pills (below CTA):** Keep existing but rewrite:
- "Built by a Storage Operator" (not "Full Funnel Ownership")
- "Results in 7 Days" (not "No Contracts")
- "$41 Average Cost Per Move-In"
- "Month-to-Month, Cancel Anytime"

#### SECTION 2: The Revenue Leak (Problem Section)
**Headline:** "6 Ways Your Facility Bleeds Revenue (and You Don't Even Know It)"
**Subheadline:** "Most operators lose $3,000–$8,000 per month. Here's where it goes."

**6 leak cards** in a 2×3 grid. Each card:
- Red accent left border
- Icon (Lucide)
- Leak name
- Dollar estimate
- One-sentence explanation

Cards:
1. 🔍 **No Online Visibility** — "~$2,000/mo in missed leads. 2,400 people search for storage in your area monthly. If you're not showing up, your competitors are getting every one of them."
2. 🏠 **Traffic Goes to Your Homepage** — "~$800/mo wasted. Generic homepages convert at 2%. Ad-specific landing pages convert at 8.7%. Same traffic, 4x the move-ins."
3. 🔗 **Off-Brand Rental Flow** — "~$600/mo in abandoned reservations. The customer clicks your ad, then bounces to a generic storEDGE page that doesn't look like you. They leave."
4. 📊 **Zero Attribution** — "~$1,200/mo burned on ads that may not work. You don't know which ad produced which move-in. So you can't kill the losers or scale the winners."
5. 💰 **Underpriced Units** — "~$1,500/mo left on the table. If your 10x10s are $95 and the market average is $110, that's $15/unit × 100 occupied units = real money."
6. 📉 **No Follow-Up System** — "~$900/mo in lost conversions. 70% of storage leads don't convert on first visit. Without automated follow-up, they go to your competitor."

**Bottom of section:** Red banner: "Add it up. That's $42,000–$96,000 per year. → Get Your Free Revenue Audit"

#### SECTION 3: The Demand Engine (How It Works)
**Headline:** "This Isn't an Ad Agency. This Is a Revenue Machine."
**Subheadline:** "Six connected systems that work together to fill your units. Automatically."

**Visual:** Machine/engine diagram — NOT numbered steps. A circular or connected flowchart showing 6 interlocking components. Each is clickable and expands to show detail.

Components:
1. **Demand Intelligence** — "We analyze your market, competitors, pricing, occupancy, and demographics to find where demand exists and how to capture it."
2. **Ad Engine** — "Meta ads create new demand. Google PPC captures search intent. Retargeting brings back visitors. All three channels, managed together."
3. **Landing Pages** — "Every ad gets its own page with its own headline, offer, and tracking. Not your homepage. A conversion-optimized page built for that specific audience."
4. **Conversion Flow** — "Embedded storEDGE rental functionality. The customer reserves on YOUR branded page. No redirect. No off-brand experience. No friction."
5. **Attribution Layer** — "Every move-in traces to the specific ad that produced it. Cost per reservation. Cost per move-in. ROAS by creative. Revenue, not clicks."
6. **Optimization Loop** — "A/B testing on headlines, offers, and layouts. Winners are picked by actual move-in behavior. The machine gets smarter every month."

**Interaction:** Click a component → it highlights and expands a detail panel below the diagram. Panel shows: description + 2-3 bullet points + a small screenshot/mockup of that feature in the StowStack dashboard.

#### SECTION 4: Three-Way Comparison
**Headline:** "Doing It Yourself vs. Hiring an Agency vs. Using a Demand Engine"

**Table with 3 columns and 10 rows:**

| | Do It Yourself | Ad Agency | StowStack (Demand Engine) |
|---|---|---|---|
| **Landing Pages** | Your homepage (2% conv) | Generic template (3-4% conv) | Ad-specific pages (8.7% conv) |
| **Rental Flow** | Customer bounces to storEDGE | Same bounce, different URL | Embedded on your branded page |
| **Attribution** | "We got some calls this month" | Clicks and impressions report | Cost per move-in by specific ad |
| **Ad Channels** | Boosted Facebook post | Google or Facebook, not both | Meta + Google PPC + Retargeting |
| **A/B Testing** | None | Occasionally tests ad copy | Tests pages, offers, and creative on revenue |
| **Reporting** | Nothing | Monthly PDF of vanity metrics | Real-time dashboard: leads → reservations → move-ins |
| **Who Builds It** | You, at 11pm after gate calls | Agency that also does dentists | An operator who built this for his own facilities |
| **Time to Results** | Months (if ever) | 30-60 days (maybe) | 7 days to first leads |
| **Follow-Up** | You forgot to call them back | Not their job | Automated SMS + email nurture sequences |
| **Cost** | Your time + wasted ad spend | $1,500-5,000/mo + ad spend | $499-1,499/mo + ad spend |

Style each column: DIY = gray/muted, Agency = orange/warning, StowStack = green/success. Checkmarks and X marks for quick scanning.

#### SECTION 5: "What Happens When You Don't Act"
**Headline:** "Every Month You Wait Costs You More Than StowStack"

**Visual:** A horizontal timeline showing 6 months of inaction:

```
MONTH 1: 3 vacant units → $450/mo lost
MONTH 2: Competitor launches Google Ads → they're capturing your demand
MONTH 3: 5 move-outs, 2 move-ins → net loss of 3 units → now 6 vacant
MONTH 4: Summer moving season starts → your competitors fill up, you don't
MONTH 5: 8 vacant units → $1,200/mo lost → competitor raises rates (you can't)
MONTH 6: Occupancy below 80% → revenue spiral → cutting rates to attract tenants
```

Each month is a card that scrolls horizontally, getting progressively redder. Final card:
- **"Month 6 Total: $7,200 in lost revenue. StowStack would have cost $5,994 and projected to recover $43,200."**

**Below timeline:** "The math isn't complicated. Inaction is the most expensive option."

CTA: "Get Your Free Revenue Audit →"

#### SECTION 6: Pricing
Keep existing 3-tier structure ($499/$999/$1,499) but add:

**Inline ROI Calculator** above the tiers:
- Two inputs: "How many total units?" (number input) + "Current occupancy %" (slider, 50-100%)
- Output: "You're losing approximately $X,XXX per month in vacant unit revenue. StowStack Growth plan costs $999/mo and projects Y move-ins. ROI: Z.Xx"
- This feeds into the CTA: "See the full breakdown → Free Audit"

**Badges on each tier:**
- Launch: "Pays for itself with 4 move-ins"
- Growth: "Most operators see 6.4x ROAS" (MOST POPULAR)
- Portfolio: "Best for 3+ facilities"

#### SECTION 7: Testimonials
Keep the 3 existing testimonials (Mark D., Lisa R., Jeff T.) — they're good. Add a header:
**"Operators Who Stopped Guessing and Started Filling"**

Add context below each: "Mark went from 71% to 84% occupancy. At 200 units and $130 avg rate, that's $20,280 in recovered annual revenue."

#### SECTION 8: FAQ
Keep existing 8 FAQs. Add 2 more:
9. **"What if I only have one small facility?"** → "StowStack Launch was built for you. Most of our operators run 1-3 facilities with 50-200 units. You don't need a big portfolio to see results — you need a system that fills units."
10. **"What makes this different from Adverank?"** → "Adverank provides analytics. StowStack provides the entire demand engine — we create the ads, build the landing pages, embed the rental flow, run the follow-up sequences, and attribute every move-in to the ad that produced it. Analytics tell you what happened. A demand engine makes it happen."

#### SECTION 9: Final CTA
**Full-width section, dark background with green gradient accent:**
- Headline: "Every Day Without a Demand Engine Is Revenue Walking Out the Door."
- Sub: "Free audit. No contracts. Results in 7 days. Built by an operator, for operators."
- Two buttons: "Get Your Free Audit" (primary) + "Call Us: (XXX) XXX-XXXX" (secondary)
- Below: Small text: "Join 34+ operators who stopped guessing."

### Technical Approach
- Extract each section into `src/components/website/[SectionName].tsx`
- Keep `App.tsx` as the shell that imports and renders sections in order
- Use Intersection Observer for scroll-triggered animations (components animate in as they enter viewport)
- Reuse existing animation classes: `.animate-fade-up`, `.animate-scale-in`, `.stagger-children`
- Mobile: stack all grids to single column, reduce padding, hide horizontal timeline on mobile (show vertical)
- Keep existing dark mode support pattern

### Copy Rules
- Never say "SaaS" or "platform" — say "demand engine" or "system"
- Never say "we help" — say "we fill units" or "we create demand"
- Always tie back to dollars or move-ins, never impressions or clicks
- Use operator language: "gate calls," "move-ins," "street rate," "lease-up"
- Fear before benefit: show the problem THEN the solution

---

## FEATURE 3: Social Media Command Center

### Strategic Purpose
Storage operators post nothing on social media. Zero. Their Facebook page has a profile photo from 2019 and their last post was "Happy Thanksgiving 2023." This is low-hanging fruit that no competitor offers as an integrated feature. The command center turns "I should probably post something" into 2 clicks: generate → schedule → done. It makes StowStack stickier because the operator now depends on it for their entire online presence, not just ads. It also feeds the demand engine narrative — social media is another demand channel, not a separate service.

### Files to Create
- `src/components/dashboard/SocialCommandCenter.tsx` — main tab component
- `src/components/dashboard/social/ContentCalendar.tsx` — monthly/weekly calendar view
- `src/components/dashboard/social/PostComposer.tsx` — create/edit a post
- `src/components/dashboard/social/PostCard.tsx` — individual post preview card
- `src/components/dashboard/social/BatchGenerator.tsx` — AI batch content generation
- `src/components/dashboard/social/EngagementFeed.tsx` — unified comments/reviews feed
- `src/components/dashboard/social/PlatformConnector.tsx` — connect Facebook/Instagram/GBP
- `api/social-posts.js` — CRUD for social posts
- `api/generate-social-content.js` — Claude-powered batch content generation
- `api/publish-social.js` — publish to Facebook/Instagram (extends existing Meta integration)
- `db/migrate-social.js` — new tables

### Database Schema

```sql
-- Social posts table
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'gbp')),
  post_type TEXT NOT NULL CHECK (post_type IN ('promotion', 'tip', 'testimonial', 'seasonal', 'behind_the_scenes', 'unit_spotlight', 'community', 'holiday')),
  content TEXT NOT NULL,
  hashtags TEXT[],
  media_urls TEXT[],
  cta_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  external_post_id TEXT,
  external_url TEXT,
  error_message TEXT,
  engagement_metrics JSONB DEFAULT '{}',
  ai_generated BOOLEAN DEFAULT false,
  batch_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social engagement tracking
CREATE TABLE IF NOT EXISTS social_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL,
  platform TEXT NOT NULL,
  post_id UUID REFERENCES social_posts(id),
  metric_date DATE NOT NULL,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### AI Content Generation (`api/generate-social-content.js`)

**Endpoint:** `POST /api/generate-social-content`

**Request body:**
```json
{
  "facilityId": "uuid",
  "platforms": ["facebook", "instagram", "gbp"],
  "count": 10,
  "timeframe": "2_weeks",
  "postTypes": ["promotion", "tip", "seasonal", "community"],
  "tone": "friendly"
}
```

**Claude Prompt (injected with facility context — same pattern as `gbp-posts.js` lines 240-264):**
```
You are a social media manager for a self-storage facility. Generate {count} social media posts for the next {timeframe}.

FACILITY CONTEXT:
- Name: {facilityName}
- Location: {location}
- Occupancy: {occupancyPct}% ({vacantUnits} vacant units)
- Unit types available: {unitTypes with sizes and pricing}
- Active promotions: {specials}
- Brand description: {from onboarding wizard}
- Brand tone: {toneOfVoice from onboarding}
- Selling points: {sellingPoints from onboarding}

PLATFORM REQUIREMENTS:
- Facebook: 150-300 words, conversational, can include links. No hashtags.
- Instagram: 100-200 words, visual-first caption, include 15-20 relevant hashtags at the end. Storage, moving, organization, local hashtags.
- GBP: 80-150 words, direct and informative, include CTA. No hashtags.

POST TYPES TO INCLUDE:
- promotion: Highlight available units, specials, or seasonal offers. Include specific pricing.
- tip: Storage tips, organization advice, packing guides. Position facility as the expert.
- seasonal: Tie into current season/holiday. Spring cleaning, summer moves, holiday storage, etc.
- community: Local events, partnerships, neighborhood shoutouts. Make the facility feel local.
- behind_the_scenes: Facility improvements, staff spotlights, security features. Build trust.
- unit_spotlight: Feature a specific unit type with dimensions, use cases, and pricing.

RULES:
- Write like a real person, not a brand. No corporate buzzwords.
- Include specific details (unit sizes, prices, hours, address) when relevant.
- Every promotion post must include a specific CTA with a reason to act now.
- Never use "state-of-the-art" or "premier" or "solutions." Use "clean," "dry," "secure," "affordable."
- Mix post types — don't do 5 promotions in a row.
- Space posts 2-3 days apart.
- Reference local landmarks, weather, events when possible.

Return JSON array:
[{
  "platform": "facebook|instagram|gbp",
  "post_type": "promotion|tip|seasonal|...",
  "content": "The post text",
  "hashtags": ["#storage", "#moving", ...] (Instagram only),
  "suggested_image": "description of ideal image to pair with this post",
  "scheduled_day": 1-14 (day number in the timeframe),
  "cta_url": "optional link"
}]
```

### Content Calendar UI (`ContentCalendar.tsx`)

**View modes:** Monthly (default) / Weekly toggle

**Monthly view:**
- Standard calendar grid (Sun-Sat)
- Each day cell shows post dots colored by platform:
  - Facebook: blue dot
  - Instagram: pink/purple dot
  - GBP: green dot
- Click a day → shows posts for that day in a slide-out panel
- Days with posts have subtle background tint
- Current day highlighted

**Weekly view:**
- 7-column layout with time slots
- Posts shown as cards in their scheduled time
- Drag-and-drop to reschedule (update `scheduled_at`)

**Top bar:**
- Month/week navigation arrows
- "Generate Content" button → opens BatchGenerator modal
- Filter by platform (all / facebook / instagram / gbp)
- Filter by status (all / draft / scheduled / published)
- Post count: "12 posts scheduled this month"

**Storage-specific calendar events (auto-populated):**
- Jan: "New Year Declutter" campaign window
- Mar-Apr: "Spring Cleaning" peak
- May-Aug: "Moving Season" peak
- Aug-Sep: "College Move-In"
- Oct: "Fall Transition"
- Nov-Dec: "Holiday Storage"
- These show as banner events at the top of relevant weeks

### Post Composer (`PostComposer.tsx`)

**Modal with 3 sections:**

1. **Content area:**
   - Platform selector tabs (Facebook / Instagram / GBP)
   - Text editor with character count
   - Hashtag field (Instagram only, comma-separated)
   - Media upload (select from facility assets OR upload new)
   - CTA URL field
   - Post type dropdown

2. **Preview area:**
   - Mock Facebook/Instagram/GBP post preview
   - Shows how the post will look on each platform
   - Updates live as content is typed

3. **Scheduling:**
   - "Post now" vs "Schedule" toggle
   - Date/time picker
   - Platform-specific optimal time suggestions:
    - Facebook: Tue-Thu, 10am-2pm
    - Instagram: Mon-Fri, 11am-1pm
    - GBP: Mon/Wed/Fri, 9am-11am

**Actions:** Save as Draft / Schedule / Publish Now

### Engagement Feed (`EngagementFeed.tsx`)

**Unified feed showing:**
- Facebook page comments (via Graph API `/page/feed` with comments)
- GBP reviews (already built in `GBPTab.tsx` — reuse the review fetching)
- Instagram comments (via Instagram Graph API)

**Each item shows:**
- Platform icon
- Author name + avatar
- Comment/review text
- Star rating (reviews only)
- Timestamp
- AI-suggested reply button → generates response using Claude (same pattern as GBP review response AI)
- "Reply" button → sends response to platform
- "Mark as handled" button

### Publishing Flow

**Facebook publishing** — extend existing Meta OAuth in `platform_connections`:
```
POST /{page-id}/feed
  message: post content
  link: cta_url (if provided)
  // OR for image posts:
POST /{page-id}/photos
  message: post content
  url: image_url
```

**Instagram publishing** — via Facebook Graph API:
```
// Step 1: Create media container
POST /{ig-user-id}/media
  caption: content + hashtags
  image_url: media_url

// Step 2: Publish container
POST /{ig-user-id}/media_publish
  creation_id: container_id
```

**GBP publishing** — already built in `gbp-posts.js`. Import and reuse `publishPost()` function.

### Integration with Existing Features
- **Assets tab** — pull facility photos from `assets` table for media selection
- **Platform connections** — reuse existing OAuth flow for Meta, extend for Instagram
- **GBP tab** — migrate GBP posting into the unified command center (keep GBP tab for reviews/Q&A management)
- **Creative tab** — allow "Export to Social" action on approved ad variations

---

## FEATURE 4: Lead Nurturing Engine

### Strategic Purpose
Here's where "demand engine" stops being a marketing phrase and becomes real. An ad agency runs ads. A demand engine runs ads AND follows up with the 70% of people who didn't convert on first visit. The lead nurturing engine is the invisible backend that turns a $35 lead into a $150/month tenant by systematically following up via SMS and email at the exact right moments. This is what makes StowStack irreplaceable — operators can't replicate automated multi-channel nurture sequences. It's also the feature that reduces churn, because operators see the full pipeline working even after ads stop running.

### Files to Create
- `src/components/dashboard/LeadNurtureEngine.tsx` — main tab component
- `src/components/dashboard/nurture/SequenceBuilder.tsx` — visual sequence editor
- `src/components/dashboard/nurture/EnrollmentTable.tsx` — active enrollments view
- `src/components/dashboard/nurture/SequenceCard.tsx` — sequence template card
- `src/components/dashboard/nurture/StepEditor.tsx` — individual step editor
- `src/components/dashboard/nurture/ExitIntentPopup.tsx` — landing page email capture
- `src/components/dashboard/nurture/NurtureMetrics.tsx` — conversion metrics per sequence
- `api/nurture-sequences.js` — CRUD + enrollment management (extends drip-sequences.js)
- `api/nurture-process.js` — cron endpoint that processes pending sends
- `api/sms-send.js` — Twilio SMS sending
- `api/nurture-webhook.js` — handles Twilio delivery receipts + email open/click tracking
- `db/migrate-nurture.js` — new tables

### Database Schema

```sql
-- Nurture sequence definitions (extends concept from drip_sequences)
CREATE TABLE IF NOT EXISTS nurture_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'landing_page_abandon', 'reservation_abandon',
    'post_move_in', 'win_back', 'post_audit', 'custom'
  )),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  steps JSONB NOT NULL DEFAULT '[]',
  -- steps shape: [{
  --   step_number: 1,
  --   delay_minutes: 60,
  --   channel: "sms" | "email",
  --   subject: "..." (email only),
  --   body: "...",
  --   merge_tags: ["first_name", "unit_size", ...],
  --   send_window: { start: "09:00", end: "20:00" } (SMS compliance)
  -- }]
  exit_conditions JSONB DEFAULT '[]',
  -- exit_conditions: ["converted", "unsubscribed", "manual_stop"]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active nurture enrollments
CREATE TABLE IF NOT EXISTS nurture_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES nurture_sequences(id),
  facility_id UUID NOT NULL,
  lead_id UUID,
  tenant_id UUID,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'converted', 'unsubscribed', 'failed')),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  next_send_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  exit_reason TEXT,
  metadata JSONB DEFAULT '{}'
  -- metadata: { unit_size, unit_rate, landing_page_url, utm_source, reservation_id, ... }
);

-- Individual message send log
CREATE TABLE IF NOT EXISTS nurture_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES nurture_enrollments(id),
  step_number INTEGER NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  to_address TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed', 'unsubscribed')),
  external_id TEXT, -- Twilio SID or Resend message ID
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Pre-Built Sequence Templates

**Template 1: Landing Page Abandonment**
```json
{
  "name": "Landing Page Visitor Recovery",
  "trigger_type": "landing_page_abandon",
  "steps": [
    {
      "step_number": 1,
      "delay_minutes": 60,
      "channel": "sms",
      "body": "Hey {first_name}, still looking for storage near {facility_location}? That {unit_size} at {facility_name} is still available at ${unit_rate}/mo. Reserve it here: {reserve_link}",
      "send_window": { "start": "09:00", "end": "20:00" }
    },
    {
      "step_number": 2,
      "delay_minutes": 1440,
      "channel": "email",
      "subject": "Your {unit_size} unit is still waiting at {facility_name}",
      "body": "Hi {first_name},\n\nYou were looking at a {unit_size} unit at {facility_name} yesterday. Good news — it's still available.\n\n• Size: {unit_size}\n• Rate: ${unit_rate}/month\n• Location: {facility_location}\n• Features: {unit_features}\n\nReserve it now and lock in this rate: {reserve_link}\n\nQuestions? Call us at {facility_phone} or just reply to this email.\n\n— {facility_name} Team"
    },
    {
      "step_number": 3,
      "delay_minutes": 4320,
      "channel": "sms",
      "body": "Heads up {first_name} — {view_count} people looked at storage near {facility_location} today. Your {unit_size} unit is still open but we can't hold rates forever. Lock it in: {reserve_link}",
      "send_window": { "start": "10:00", "end": "19:00" }
    },
    {
      "step_number": 4,
      "delay_minutes": 10080,
      "channel": "email",
      "subject": "Last chance: {unit_size} at {facility_name} — special offer inside",
      "body": "Hi {first_name},\n\nWe're running a limited-time offer at {facility_name}: get your first month at 50% off when you reserve this week.\n\n{unit_size} unit: ${unit_rate}/mo (first month just ${half_rate})\n\nThis offer expires in 48 hours: {reserve_link}\n\nDon't let someone else grab it.\n\n— {facility_name} Team"
    },
    {
      "step_number": 5,
      "delay_minutes": 20160,
      "channel": "email",
      "subject": "We saved a spot for you, {first_name}",
      "body": "Hi {first_name},\n\nA couple weeks ago you were looking for storage near {facility_location}. If you still need space, we've got you covered.\n\n\"{testimonial_quote}\" — {testimonial_name}, {facility_name} tenant\n\nReserve your unit: {reserve_link}\n\nIf your plans changed, no worries — just ignore this and we won't bother you again.\n\n— {facility_name} Team"
    }
  ],
  "exit_conditions": ["converted", "unsubscribed", "reserved"]
}
```

**Template 2: Reservation Abandonment**
```json
{
  "name": "Incomplete Reservation Recovery",
  "trigger_type": "reservation_abandon",
  "steps": [
    {
      "step_number": 1,
      "delay_minutes": 30,
      "channel": "sms",
      "body": "Hey {first_name}, looks like you didn't finish reserving your {unit_size} at {facility_name}. Need help? Reply here or call {facility_phone}. Your unit is held for 24hrs: {reserve_link}",
      "send_window": { "start": "08:00", "end": "21:00" }
    },
    {
      "step_number": 2,
      "delay_minutes": 240,
      "channel": "email",
      "subject": "Finish your reservation at {facility_name}",
      "body": "Hi {first_name},\n\nYou started reserving a {unit_size} unit at {facility_name} but didn't finish. No worries — we saved your spot.\n\nHere's what you selected:\n• Unit: {unit_size}\n• Rate: ${unit_rate}/month\n• Move-in date: {move_in_date}\n\nPick up where you left off: {reserve_link}\n\nIf you ran into any issues, call us at {facility_phone} — we're happy to help.\n\n— {facility_name} Team"
    },
    {
      "step_number": 3,
      "delay_minutes": 1440,
      "channel": "sms",
      "body": "{first_name}, your {unit_size} reservation at {facility_name} expires today. Finish it here before someone else grabs it: {reserve_link}",
      "send_window": { "start": "10:00", "end": "18:00" }
    }
  ],
  "exit_conditions": ["converted", "unsubscribed", "reservation_completed"]
}
```

**Template 3: Post-Move-In Lifecycle**
```json
{
  "name": "New Tenant Lifecycle",
  "trigger_type": "post_move_in",
  "steps": [
    {
      "step_number": 1,
      "delay_minutes": 120,
      "channel": "sms",
      "body": "Welcome to {facility_name}, {first_name}! 🔑 Your gate code is {gate_code}. Office hours: {office_hours}. Questions anytime: {facility_phone}. Thanks for choosing us!",
      "send_window": { "start": "08:00", "end": "20:00" }
    },
    {
      "step_number": 2,
      "delay_minutes": 10080,
      "channel": "email",
      "subject": "How's everything going, {first_name}?",
      "body": "Hi {first_name},\n\nYou've been with us at {facility_name} for a week now. How's everything going?\n\nIf you need anything — different unit size, packing supplies, access questions — just reply to this email or call {facility_phone}.\n\nWe're here to help.\n\n— {facility_name} Team"
    },
    {
      "step_number": 3,
      "delay_minutes": 43200,
      "channel": "sms",
      "body": "Hey {first_name}! You've been at {facility_name} for 30 days. If we're doing a good job, would you mind leaving us a quick Google review? It really helps: {review_link} 🙏",
      "send_window": { "start": "10:00", "end": "18:00" }
    },
    {
      "step_number": 4,
      "delay_minutes": 86400,
      "channel": "email",
      "subject": "Upgrade opportunity at {facility_name}",
      "body": "Hi {first_name},\n\nYou've been with us for 60 days — thanks for being a great tenant.\n\nDid you know we offer:\n• Tenant protection plans starting at $12/mo\n• Climate-controlled upgrades (keeps your stuff safe from humidity)\n• Larger unit options if you're running out of space\n\nInterested? Reply here or call {facility_phone} and we'll set it up.\n\n— {facility_name} Team"
    },
    {
      "step_number": 5,
      "delay_minutes": 129600,
      "channel": "email",
      "subject": "Your 90-day check-in at {facility_name}",
      "body": "Hi {first_name},\n\nYou've been with us for 3 months. Quick check-in:\n\n✅ Is your unit still the right size?\n✅ Are you on autopay yet? (saves you from late fees)\n✅ Would you like to lock in your current rate with a 6-month commitment?\n\nReply or call {facility_phone} — we'll take care of it.\n\n— {facility_name} Team"
    }
  ],
  "exit_conditions": ["moved_out", "unsubscribed"]
}
```

**Template 4: Win-Back Campaign**
```json
{
  "name": "Move-Out Win-Back",
  "trigger_type": "win_back",
  "steps": [
    {
      "step_number": 1,
      "delay_minutes": 1440,
      "channel": "email",
      "subject": "We'll miss you at {facility_name}, {first_name}",
      "body": "Hi {first_name},\n\nWe're sorry to see you go. If you have 30 seconds, we'd love to know how we did:\n\n{feedback_link}\n\nYour honest feedback helps us get better for our next tenants.\n\nIf you ever need storage again, you'll always have a spot at {facility_name}.\n\n— {facility_name} Team"
    },
    {
      "step_number": 2,
      "delay_minutes": 43200,
      "channel": "sms",
      "body": "Hey {first_name}, it's {facility_name}. Need storage again? Come back and get 25% off your first month. Just mention this text: {promo_code}. Reserve: {reserve_link}",
      "send_window": { "start": "10:00", "end": "18:00" }
    },
    {
      "step_number": 3,
      "delay_minutes": 129600,
      "channel": "email",
      "subject": "Your neighbors are still storing with us, {first_name}",
      "body": "Hi {first_name},\n\nIt's been 3 months since you moved out of {facility_name}. If your storage needs have changed, we'd love to have you back.\n\nReturning tenant special: 25% off your first month + waived admin fee.\n\nReserve your unit: {reserve_link}\n\n— {facility_name} Team"
    }
  ],
  "exit_conditions": ["converted", "unsubscribed", "re_enrolled"]
}
```

### SMS Implementation (`api/sms-send.js`)

**Twilio integration:**
```javascript
// Uses existing Twilio credentials (already have for call tracking)
const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Send SMS
await twilio.messages.create({
  body: resolvedBody, // merge tags replaced
  from: facilityPhoneNumber, // facility's Twilio number (from call tracking)
  to: recipientPhone,
  statusCallback: `${BASE_URL}/api/nurture-webhook` // delivery tracking
});
```

**TCPA Compliance rules (built into the system):**
- Send window enforcement: no SMS before 9am or after 9pm recipient local time
- Opt-out handling: if recipient texts "STOP", auto-update enrollment status to "unsubscribed"
- Opt-in recording: track when/how consent was given (form submission, exit-intent popup)
- Required disclosure in first SMS: "Reply STOP to opt out"

### Exit-Intent Popup (`ExitIntentPopup.tsx`)

**Purpose:** Captures email/phone from landing page visitors who are about to leave without converting. This is the enrollment trigger for the landing page abandonment sequence.

**Trigger:** Mouse moves toward browser chrome (desktop) OR 30-second timer + scroll > 50% (mobile)

**Design:**
- Overlay modal with backdrop blur
- Headline: "Wait — Don't Miss This"
- Sub: "Get notified when rates drop or units open up near [facility location]"
- Fields: Name (optional), Email (required), Phone (optional, but enables SMS)
- CTA: "Keep Me Updated"
- Fine print: "We'll send you 1-2 messages about available units. Unsubscribe anytime."
- Cookie: don't show again for 7 days if dismissed

**On submit:**
- Save lead to `consumer_leads` table (already exists)
- Auto-enroll in `landing_page_abandon` sequence
- Fire Meta Pixel `Lead` event (already have pixel.ts integration)
- Set cookie to prevent re-showing

### Nurture Processing (`api/nurture-process.js`)

**Cron endpoint:** Called every 5 minutes by Vercel Cron

```
1. SELECT * FROM nurture_enrollments WHERE status = 'active' AND next_send_at <= NOW()
2. For each enrollment:
   a. Get the sequence definition (steps JSON)
   b. Get current_step
   c. Resolve merge tags against lead/tenant/facility data
   d. Check send window (SMS only — don't send outside 9am-9pm)
   e. If within window: send via email (Resend) or SMS (Twilio)
   f. Log to nurture_messages
   g. Increment current_step
   h. Calculate next_send_at based on next step's delay_minutes
   i. If no more steps: set status = 'completed'
3. Check exit conditions:
   a. If lead has converted (reservation or move-in exists): set status = 'converted'
   b. If unsubscribed: set status = 'unsubscribed'
```

### Nurture Engine UI (`LeadNurtureEngine.tsx`)

**Layout:** Three-panel view

**Left panel: Sequence Templates**
- List of pre-built + custom sequences
- Each shows: name, trigger type, step count, active enrollment count
- "Create Custom Sequence" button
- Click to select → loads in center panel

**Center panel: Sequence Detail**
- Visual step timeline (vertical, connected dots)
- Each step shows: delay, channel icon (📱/📧), preview of message
- Click step to edit in StepEditor modal
- Drag to reorder steps
- Add step button between existing steps
- Toggle sequence active/paused

**Right panel: Active Enrollments**
- Table of leads currently in this sequence
- Columns: Name, Step (e.g., "3/5"), Status, Next Send, Channel
- Actions: Pause, Skip step, Remove
- Filter: active / completed / converted / unsubscribed

**Top metrics bar:**
- Total active enrollments across all sequences
- Conversion rate (enrolled → converted)
- Average time to conversion
- SMS delivery rate
- Email open rate
- "Recovered revenue" estimate (converted leads × avg unit rate × 12)

### Integration Points
- **Landing pages** — embed ExitIntentPopup component into LandingPageView.tsx
- **Consumer leads** — auto-enroll new leads based on source
- **Tenant data** — auto-enroll new move-ins in post_move_in sequence
- **Move-out detection** — auto-enroll move-outs in win_back sequence (from PMS snapshots)
- **Pixel tracking** — fire conversion events when nurture leads convert
- **Attribution** — tag converted leads with `attribution_source: "nurture_sequence_{name}"`

---

## FEATURE 5: Competitor Spy Dashboard

### Strategic Purpose
The one-time audit shows operators what's happening RIGHT NOW. The competitor spy dashboard shows them what's happening OVER TIME. This is the feature that keeps them logging into StowStack even when ads are running smoothly. "Your competitor raised their 10x10 rate by $15 this month." "A new facility opened 3 miles away." "Your competitor got 12 new Google reviews — you got 2." This intel feeds directly into the Revenue Loss Calculator (Feature 1), the AI ad copy generation, and the marketing plan. It also builds the case for Storable acquisition: real-time competitive intelligence layered on top of FMS data is something no PMS offers today.

### Files to Create
- `src/components/dashboard/CompetitorSpyDashboard.tsx` — main tab component
- `src/components/dashboard/competitor/CompetitorCard.tsx` — individual competitor profile
- `src/components/dashboard/competitor/PricingMatrix.tsx` — your rates vs market
- `src/components/dashboard/competitor/ReviewTracker.tsx` — review velocity over time
- `src/components/dashboard/competitor/AdIntelPanel.tsx` — who's running ads
- `src/components/dashboard/competitor/AlertsFeed.tsx` — competitive alerts
- `src/components/dashboard/competitor/MarketTrends.tsx` — market-level trend charts
- `api/competitor-snapshots.js` — snapshot storage and retrieval
- `api/competitor-scrape.js` — scrape competitor websites for pricing (extends scrape-website.js)
- `api/competitor-ads-check.js` — check Google Ads presence
- `api/competitor-digest.js` — weekly digest generation
- `api/competitor-cron.js` — monthly automated scraping
- `db/migrate-competitor.js` — new tables

### Database Schema

```sql
-- Monthly competitor snapshots (tracks changes over time)
CREATE TABLE IF NOT EXISTS competitor_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  competitor_name TEXT NOT NULL,
  competitor_address TEXT,
  competitor_website TEXT,
  google_maps_url TEXT,
  distance_miles NUMERIC(5,2),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Google data
  google_rating NUMERIC(2,1),
  google_review_count INTEGER,
  -- Pricing data (scraped from website)
  pricing JSONB DEFAULT '{}',
  -- pricing: { "5x5": 49, "5x10": 69, "10x10": 99, "10x15": 129, "10x20": 149, "10x30": 199 }
  -- Promotion data
  promotions TEXT[],
  -- Ad presence
  has_google_ads BOOLEAN DEFAULT false,
  has_facebook_page BOOLEAN DEFAULT false,
  facebook_post_frequency TEXT, -- "daily", "weekly", "monthly", "inactive"
  -- Website quality signals
  has_online_rental BOOLEAN DEFAULT false,
  has_virtual_tour BOOLEAN DEFAULT false,
  website_speed_score INTEGER, -- 0-100 via PageSpeed API (future)
  -- Metadata
  scrape_status TEXT DEFAULT 'pending' CHECK (scrape_status IN ('pending', 'success', 'partial', 'failed')),
  scrape_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitor alerts
CREATE TABLE IF NOT EXISTS competitor_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  competitor_name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'price_increase', 'price_decrease', 'new_reviews',
    'rating_change', 'new_promotion', 'started_ads',
    'stopped_ads', 'new_competitor', 'website_change'
  )),
  severity TEXT DEFAULT 'info' CHECK (severity IN ('critical', 'warning', 'info', 'opportunity')),
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_competitor_snapshots_facility_date ON competitor_snapshots(facility_id, snapshot_date);
CREATE INDEX idx_competitor_alerts_facility ON competitor_alerts(facility_id, read, created_at DESC);
```

### Competitor Website Scraping (`api/competitor-scrape.js`)

**Extends existing `scrape-website.js` pattern** but focused on extracting pricing:

```javascript
// After scraping with Cheerio (same crawl logic as scrape-website.js):

// Price extraction heuristics:
// 1. Look for LD+JSON StorageUnit schema
// 2. Look for tables/grids with $ amounts near size indicators (5x5, 10x10, etc.)
// 3. Regex: /\$\d{2,3}(?:\.\d{2})?/ near /\d+x\d+/ or /\d+\s*(?:sq\s*ft|square)/
// 4. Look for elements with classes containing "price", "rate", "cost", "unit"
// 5. Look for storEDGE/SiteLink widget iframes (can't scrape inside, but note presence)

// Additional signals to capture:
// - Does the site have online rental/reservation? (check for storEDGE, SiteLink, Hummingbird iframes)
// - Does it have a virtual tour? (check for Google Street View embed, Matterport, etc.)
// - What promotions are visible? (look for "free", "off", "special", "discount" near $ amounts)
// - Is there a blog? (check for /blog path)
```

**AI-assisted price extraction** — if heuristics fail, send page HTML to Claude:
```
Extract self-storage unit pricing from this webpage HTML. Return JSON:
{
  "units": [{ "size": "10x10", "rate": 99, "type": "standard|climate|outdoor" }],
  "promotions": ["First month free on 10x10 and larger"],
  "has_online_rental": true/false,
  "rental_platform": "storEDGE|SiteLink|other|none"
}
Only include pricing you are confident about. Return empty arrays if unclear.
```

### Alert Generation Logic (`api/competitor-cron.js`)

**Runs monthly** (Vercel Cron). For each facility:

```
1. Fetch current market intel (competitors from facility_market_intel)
2. For each competitor:
   a. Scrape website for current pricing
   b. Fetch Google Places data for rating + review count
   c. Compare against previous month's snapshot

3. Generate alerts:
   - PRICE INCREASE: competitor unit rate went up > $5
     severity: "opportunity" (you can raise too)
     title: "{competitor} raised {unit_type} rates by ${amount}"
     detail: "Their 10x10 went from $99 to $115. Your 10x10 is $95. Market is moving up — consider a rate increase."

   - PRICE DECREASE: competitor unit rate went down > $5
     severity: "warning"
     title: "{competitor} dropped {unit_type} rates by ${amount}"
     detail: "They cut their 10x10 from $99 to $89. Could signal low occupancy or aggressive lease-up."

   - NEW REVIEWS: competitor gained 5+ reviews since last snapshot
     severity: "warning"
     title: "{competitor} got {count} new Google reviews this month"
     detail: "They now have {total} reviews (avg {rating}★). You have {your_count} reviews. Consider asking recent tenants for reviews."

   - RATING CHANGE: competitor rating changed by 0.2+
     severity: "info"
     title: "{competitor} rating changed from {old} to {new}"

   - NEW PROMOTION: new promotion text detected
     severity: "info"
     title: "{competitor} is running a new promotion"
     detail: "{promotion_text}"

   - STARTED ADS: has_google_ads changed false → true
     severity: "warning"
     title: "{competitor} started running Google Ads"
     detail: "They're now bidding on storage keywords in your area. They'll capture search demand you're not competing for."

4. Save new snapshot to competitor_snapshots
5. Save alerts to competitor_alerts
6. If critical alerts exist: send notification email to operator
```

### Pricing Matrix UI (`PricingMatrix.tsx`)

**The money feature.** Side-by-side comparison of your rates vs every competitor, by unit type.

**Table layout:**
| Unit Type | Your Rate | Competitor A | Competitor B | Competitor C | Market Median | Your Position |
|-----------|-----------|-------------|-------------|-------------|---------------|---------------|
| 5x5 | $49 | $55 | $52 | $59 | $55 | 🔴 Below (-$6) |
| 10x10 | $95 | $110 | $105 | $115 | $110 | 🔴 Below (-$15) |
| 10x20 | $149 | $155 | $160 | $145 | $155 | 🟡 Close (-$6) |
| 10x30 | $199 | $189 | $195 | $210 | $195 | 🟢 Above (+$4) |

**Color coding:**
- 🔴 Red: your rate is > $10 below market median (you're leaving money on the table)
- 🟡 Yellow: your rate is within $10 of market (competitive but room to optimize)
- 🟢 Green: your rate is at or above market (maximizing revenue)

**Below table:**
- "Total monthly revenue gap: $X,XXX" (sum of occupied_units × rate_gap for all red/yellow units)
- "If you raised to market median, you'd recover $X,XXX/month ($XX,XXX/year)"
- This number feeds directly into the Revenue Loss Calculator (Feature 1)

### Review Tracker UI (`ReviewTracker.tsx`)

**Chart:** Line chart (Recharts) showing review count over time for you vs top 3 competitors.

**Metrics cards:**
- Your reviews: count + avg rating + reviews this month
- Top competitor: count + avg rating + reviews this month
- Review gap: "Competitor A has X more reviews than you"
- Response rate: "You've responded to X% of your reviews" (from GBP data)

**Action items:**
- "You got 2 reviews this month. Competitor A got 8. Turn on post-move-in review requests in the Nurture Engine."
- "Your response rate is 40%. Responding to 90%+ improves your Google ranking."

### Ad Intel Panel (`AdIntelPanel.tsx`)

**For each competitor, show:**
- Running Google Ads? Yes/No (with first detected date)
- Has Facebook page? Active/Inactive (based on post frequency)
- Has online rental? Yes/No + platform name
- Has virtual tour? Yes/No

**Market summary:**
- "3 of 5 competitors are running Google Ads"
- "Only 1 competitor has active social media"
- "4 of 5 competitors have online rental — you need it too" (or "you already have it via StowStack")

### Alerts Feed (`AlertsFeed.tsx`)

**Chronological feed of competitor alerts:**
- Each alert: severity icon + title + detail + timestamp + "Mark as read" button
- Filter by: severity (all / critical / warning / opportunity) + competitor name
- Unread count badge on the tab

### Weekly Digest (`api/competitor-digest.js`)

**Email sent weekly to operator via Resend:**
```
Subject: Your Weekly Competitor Intel — {facility_name}

Hey {operator_name},

Here's what happened in your market this week:

📊 PRICING CHANGES
- ABC Storage raised 10x10 rates from $99 to $110
- XYZ Storage is running "first month free" on all units

⭐ REVIEW ACTIVITY
- You: 1 new review (total: 28, avg 4.2★)
- ABC Storage: 4 new reviews (total: 156, avg 4.5★)
- XYZ Storage: 2 new reviews (total: 89, avg 4.1★)

📢 AD ACTIVITY
- ABC Storage started running Google Ads this week
- You are NOT running Google Ads — they're capturing search demand

💡 RECOMMENDED ACTIONS
1. Raise your 10x10 rate to $105 — you're $15 below market
2. Ask 5 recent tenants for Google reviews
3. Consider starting Google PPC to compete with ABC Storage

See your full dashboard: {dashboard_link}

— StowStack Demand Engine
```

### Integration with Other Features
1. **Revenue Loss Calculator** — `rateGap` category pulls directly from competitor pricing matrix. `competitorCapture` category uses ad presence + review data.
2. **AI Ad Copy** — feed competitor names, pricing, and weaknesses into Claude prompt for creative generation. "Your competitors charge $110 for a 10x10. You charge $95. Highlight your value."
3. **Marketing Plan** — competitor data informs channel strategy recommendations. "3 competitors run Google Ads — you should too."
4. **Audit Report** — competitor snapshot data enriches the audit. "Here's how you stack up vs 5 facilities within 5 miles."
5. **GBP Management** — review tracker data triggers "you need more reviews" nudges.

---

## Implementation Order

1. **Revenue Loss Calculator** — standalone, no dependencies, directly closes Zoom deals
2. **Competitor Spy Dashboard** — feeds data into the calculator, adds ongoing value
3. **Front Page Rebuild** — positions everything correctly for inbound, references features 1-2
4. **Lead Nurturing Engine** — makes product sticky post-sale, needs Twilio SMS setup
5. **Social Media Command Center** — biggest scope, most polish needed, builds on existing Meta/GBP integrations
