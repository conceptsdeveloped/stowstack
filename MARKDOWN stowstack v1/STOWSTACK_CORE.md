# StowStack — Core Tenets & Product Architecture

> **What StowStack is:** A full-funnel acquisition and conversion system for self-storage operators.
> **What StowStack is not:** A marketing agency, an SEO shop, or an ad management SaaS platform.

---

## 1. The One-Liner

StowStack is a full-funnel acquisition and conversion system for self-storage. We build ad-specific landing pages with embedded online reservation and move-in functionality, so every campaign has its own URL, message, and offer. We track exactly which ads produce reservations and move-ins, run A/B tests, and optimize based on actual revenue outcomes — not clicks or form fills.

---

## 2. Founder Differentiator

The founder is an **active self-storage operator**. This is not a tech company selling to operators. This is an operator who built the system for their own facilities first, then productized it.

This matters because:

- StowStack understands NOI, occupancy dips, seasonal demand, move-out patterns, and rate management.
- "I tested this with my own money first" is a trust signal no competitor can replicate.
- Operators trust other operators. They've been burned by agencies that don't understand the business.

---

## 3. The Core Architecture

StowStack operates as a **closed-loop system** with four layers. Each feeds the next. Together they form a complete path from ad impression to signed lease with full attribution.

### Layer 1: Demand Creation

**What it does:** Creates new demand through paid media — reaching people before they search.

**Channels:**
- Meta / Facebook ads (primary — this is StowStack's core competency)
- Instagram ads
- Google PPC (captures existing search intent)
- Display retargeting (re-engages abandoned visitors)

**Key insight:** Meta ads create demand. Google PPC captures existing demand. SEO waits for demand. StowStack leads with demand creation, which is the lane neither competitor owns.

### Layer 2: Ad-Specific Landing Pages

**What it does:** Every ad sends traffic to its own dedicated landing page URL — not a generic homepage, not a default storEDGE rental page.

**Each landing page has:**
- Its own headline
- Its own offer
- Its own targeting intent
- Its own tracking
- Its own embedded reservation / move-in flow
- Its own conversion data

**Examples:**
- Google ad for "Climate Controlled Storage in Paw Paw" → `stowstacksite.com/climate-pawpaw-a`
- Facebook ad for "First Month Free 10x10" → `stowstacksite.com/10x10-offer-b`
- Retargeting ad for abandoned shoppers → `stowstacksite.com/finish-your-rental-c`

**Why this matters:** Different intent should map to different pages, different offers, and different CTAs. Someone searching "cheap storage near me" should hit a different page than "boat storage" or "secure climate controlled storage." That is how conversion rate goes up.

### Layer 3: Embedded storEDGE Rental Flow

**What it does:** The actual online reservation and move-in functionality is embedded directly into each StowStack-built landing page. The customer never leaves the branded page. storEDGE handles the transaction infrastructure underneath.

**The split:**
- **StowStack owns:** Demand capture and conversion optimization (branding, copy, layout, trust building, speed, CRO, pixel/event tracking, campaign segmentation)
- **storEDGE owns:** Transaction infrastructure (real-time availability, reservation processing, move-in completion, payment processing)

**Important distinction:**
- Data integration = pulling data in and out for audits, reporting, analytics, pricing, leads, dashboards
- Embedded rental flow = putting the actual storEDGE online rental / move-in tool inside a website StowStack creates so customers can reserve or rent units there

### Layer 4: Attribution & Optimization

**What it does:** Because every ad maps to its own landing page with its own tracking, StowStack can report exactly which ad produced which reservation and which move-in.

**StowStack can report:**
- Which ad generated the visit
- Which landing page they saw
- Which offer they responded to
- Whether they reserved
- Whether they completed move-in
- Cost per reservation
- Cost per move-in
- Conversion rate by campaign / ad / audience / keyword / creative
- ROAS by creative

**This is the difference between vanity marketing and operator-grade revenue tracking.**

---

## 4. What This Architecture Enables

### 4.1 Real A/B Testing Based on Revenue

StowStack can test:
- Headline A vs headline B
- Offer A vs offer B
- Page layout A vs page layout B
- Urgency language vs informational language
- Climate-focused messaging vs price-focused messaging
- Long form vs short form
- Trust badges vs no trust badges
- Facility-specific imagery vs generic imagery

Because the page is tied to actual reservation/move-in behavior, **the winner is based on revenue behavior, not just clicks.**

### 4.2 Campaign-Specific Funnels

Different ads land on different pages. Different intent maps to different offers and CTAs. This is how conversion rate compounds over time.

### 4.3 Front-End Control

Instead of forcing customers into ugly, generic, off-brand rental flows from a default system link, StowStack controls the entire front-end experience while storEDGE handles the backend.

### 4.4 Performance-Based Pricing

Because StowStack can prove which campaign produced X reservations, which page converted at Y%, and which client gained Z recurring monthly revenue, pricing can move beyond flat retainers into premium retainers, setup fees, performance bonuses, and portfolio rollout fees.

---

## 5. Product Lines

### Product A: Demand Engine (Paid Media)

Monthly retainer. StowStack creates, manages, and optimizes paid ad campaigns. Every campaign maps to a specific landing page URL.

| Tier | Price | What's Included |
|------|-------|-----------------|
| **Launch** | $750/mo per facility | Meta ad campaigns, 2 ad-specific landing pages, embedded storEDGE rental flow, monthly performance report, static creative + copy |
| **Growth** (recommended) | $1,500/mo per facility | Meta + Google PPC, 5 ad-specific landing pages, embedded storEDGE rental flow, retargeting campaigns, A/B testing (creative + pages), video creative, full attribution dashboard, bi-weekly optimization calls |
| **Portfolio** | Custom (5+ facilities) | Everything in Growth + unlimited landing pages, cross-facility budget allocation, portfolio-level attribution, dedicated strategist, volume discount (20-35%) |

### Product B: Conversion Layer (Custom Website + storEDGE Embed)

One-time build + monthly hosting/management. StowStack designs a branded facility website with embedded storEDGE rental and move-in functionality. Can be sold standalone or bundled with Product A.

| Tier | Build Cost | Monthly | What's Included |
|------|-----------|---------|-----------------|
| **Single Site** | $3,000 one-time | $199/mo hosting & maintenance | Custom design + branding, embedded storEDGE rental flow, mobile-optimized, speed-optimized, trust elements + social proof |
| **Site + Landing Pages** (best value) | $5,000 one-time | $299/mo hosting, maintenance, CRO | Everything in Single Site + 5 ad-specific landing pages, per-page tracking setup, A/B testing framework, conversion rate optimization |
| **Portfolio Build** | Custom (3+ facilities) | Bulk rates negotiated | Everything in Site + LPs + shared brand system, per-facility customization, centralized management, volume pricing (25-40% off) |

### The Bundle: Full-Stack Acquisition System (Product A + B)

- **One-time build:** $2,500 - $4,000 (website build fee waived or discounted when bundled with 6-month Growth retainer)
- **Monthly retainer:** $1,500 - $2,000/mo per facility
- **Performance bonus:** Optional tier ($X per move-in over target)

**The bundle pitch:** Commit to 6 months of Growth and the site build drops from $5,000 to $2,500. That's a $2,500 discount that locks in $9,000+ in retainer revenue. The math works every time.

### Revenue Model Options

| Model | Range | Notes |
|-------|-------|-------|
| Flat retainer | $750 - $2,000/mo | Core recurring revenue |
| Setup / build fee | $2,500 - $5,000 | One-time per facility |
| Performance bonus | $X per move-in over target | Aligns revenue with operator outcomes |
| Portfolio rollout fee | Per-facility onboarding | Scales with multi-facility clients |

---

## 6. Competitive Landscape

### 6.1 StorageRankers (storagerankers.com)

**What they are:** A self-storage SEO and web design agency based in Arkansas.

**Their model:** Monthly retainer for website design + local SEO packages. No paid media at all.

**Pricing:**
- Starter: $299/mo + $599 setup (10 keywords, bimonthly SEO pages, GMB optimization)
- Pro: $599/mo + $999 setup (15 keywords, blog, citations, reputation management)
- Elite: $899/mo + $999 setup (25 keywords, social media organic posting, custom landing pages)
- Enterprise: Custom for 10+ locations

**CMS Integrations:** Storable (SiteLink), Storable Easy, Tenant Inc (Mariposa), CCStorage

**Strengths:**
- Transparent pricing
- Clear CMS integration messaging
- Published case studies (40% lead increase, 3-4x organic traffic)
- Solid FAQ content for SEO
- Month-to-month, no contracts

**Weaknesses:**
- Zero paid media capability — no Meta ads, no Google PPC, no display, nothing
- No embedded rental flow on their websites (CMS links only)
- No ad-to-move-in attribution
- No A/B testing
- SEO takes 3-6 months minimum for results (their own FAQ says this)
- Background is web dev/SEO generalists who niched into storage (DesignWorks agency creation)
- No operator credibility

**Relationship to StowStack:** Complementary, not competitive. StorageRankers handles organic long game. StowStack handles paid demand + conversion. Could be positioned as a partner: "They handle your SEO, we fill your units right now."

### 6.2 Adverank (adverank.ai)

**What they are:** A SaaS-first advertising platform for self-storage. Software + managed service hybrid.

**Their model:** AI-powered dashboard that analyzes facility data (occupancy, goals, market search demand) and recommends ad spend allocation. They run Google PPC, display retargeting, and social ads (top tier only).

**Pricing:**
- Software only: $49/mo (dashboard + AI recommendations)
- Get Found: $149/mo (Google Search Ads + AI recs)
- Essential: $329/mo (Google Ads + retargeting display)
- Go Bananas: $399/mo (Google Ads + display + social media ads)
- Flex Enterprise: Custom for 25+ locations

**Key features:**
- Zero commission on ad spend
- Month-to-month contracts
- 3 AI modes (Classic, Search Dominance, AI)
- PMS integrations
- Portfolio-level budget allocation
- "Edward the Ape" AI mascot / "Storage is Bananas" blog + newsletter

**Strengths:**
- Real product infrastructure (dashboard, AI modes, reporting)
- Multiple published case studies (400% ROAS, 36% rental surge, 6% occupancy growth in 6 weeks)
- Active conference presence (FSSA, SSA shows)
- Content marketing engine already running
- Community brand building

**Weaknesses:**
- Social media ads only available at highest tier ($399/mo "Go Bananas") — it's an afterthought, not a core competency
- Sends traffic to the facility's default rental page — no custom landing pages
- No embedded rental flow
- No ad-specific landing pages
- No real ad-to-move-in attribution (estimated at best, Google-only)
- No A/B testing of pages or creative based on revenue behavior
- Optimizing up-market (25+ locations for enterprise) — underserves 1-10 facility independents
- AdTech background, not operator background
- Complex product (3 AI modes, 4+ pricing tiers, software vs managed bundles)

**Relationship to StowStack:** Closest competitor — both in paid ads for storage. But Adverank plays the Google/SaaS game while StowStack plays the Meta/full-funnel game. Key positioning angles:
- For operators already on Adverank: "You're capturing search demand. We create NEW demand on Meta that Google never touches."
- For operators overwhelmed by Adverank: "You don't need another login. You need more move-ins."
- For operators who've tried Google and plateaued: "Search demand has a ceiling. Meta breaks through it."

### 6.3 Competitive Capability Matrix

| Capability | StowStack | StorageRankers | Adverank |
|-----------|-----------|----------------|----------|
| Meta / social ads (core) | ✅ Yes | ❌ No | ⚠️ Top tier only |
| Google PPC | ✅ Yes (Growth+) | ❌ No | ✅ Yes (core) |
| Custom branded website | ✅ Yes | ✅ Yes | ⚠️ Via SSM (separate) |
| Ad-specific landing pages | ✅ Yes (core) | ❌ No | ❌ No |
| Embedded rental / move-in flow | ✅ Yes (storEDGE) | ⚠️ CMS links only | ❌ No |
| Ad-to-move-in attribution | ✅ Yes (per campaign) | ❌ No | ⚠️ Partial (Google only) |
| A/B testing (pages + creative) | ✅ Yes | ❌ No | ❌ No |
| Cost per move-in reporting | ✅ Yes | ❌ No | ⚠️ Estimated |
| CRO / conversion optimization | ✅ Yes (ongoing) | ⚠️ Basic | ❌ No |
| Operator-run (eats own cooking) | ✅ Yes | ❌ No | ❌ No |
| Full funnel ownership (ad → lease) | ✅ Yes | ❌ No | ❌ No |
| Campaign-specific funnels | ✅ Yes | ❌ No | ❌ No |
| Intent-matched messaging | ✅ Yes | ❌ No | ❌ No |

**Score: StowStack 13/13. StorageRankers 2/13. Adverank 3/13.**

### 6.4 Strategic Overlap Map

- **StowStack + StorageRankers** = Complementary (paid demand + organic long game)
- **StowStack vs Adverank** = Closest competitor (both paid ads, different channels and architecture)
- **StorageRankers vs Adverank** = Zero overlap (SEO vs PPC, completely different services)

---

## 7. Where StowStack Mogs

### 7.1 Full Funnel Ownership

StowStack is the **only** company that controls the complete path from ad impression to signed lease. StorageRankers builds websites with no traffic source. Adverank drives traffic to generic pages they don't control. StowStack creates the demand, catches the click on a custom page, converts through embedded rental flow, and attributes the move-in back to the specific ad.

### 7.2 The Channel Nobody Else Owns

Meta ads are StowStack's primary channel. StorageRankers doesn't touch paid media at all. Adverank treats social as a $399/mo bolt-on afterthought. Nobody in this space is building a brand around Meta ad expertise for self-storage.

Meta creates demand (reaches people before they search). Google captures existing demand (people already searching). SEO waits for demand (hopes they find you). StowStack leads with demand creation.

### 7.3 Speed to Results

- **StowStack:** Days to weeks. Meta ads generate leads within the first week of launch.
- **StorageRankers:** 3-12 months. Their own FAQ says 3-6 months for measurable SEO results.
- **Adverank:** 7-10 days to launch Google ads, results vary after.

An operator at 78% occupancy heading into summer can't wait 6 months for SEO. StowStack is the emergency room, not the annual physical.

### 7.4 Operator Credibility

Neither competitor operates facilities. StowStack's founder does. When you say "I tested this at my own facilities first," that converts skeptics who've been burned by agencies that don't understand occupancy, rate management, move-out patterns, or seasonal demand.

### 7.5 Simplicity for the Independent Operator

Adverank is building for portfolio operators who want dashboards, AI modes, and budget optimization algorithms. StowStack speaks directly to the 1-10 facility owner who doesn't want another software login — they want someone who gets it to fill their units.

### 7.6 Integration + Execution Moat

Any random marketer can say "we run Meta ads." Far fewer can say:
- We understand storage operations
- We understand reservation flow
- We understand move-in economics
- We can connect traffic source to actual move-in behavior
- We can improve the landing layer and the reporting layer together

That combination is harder to replace than any single service.

### 7.7 The "Leaky Bucket" Pitch

"Adverank sends your Google clicks to a generic rental page you can't customize. StorageRankers builds you a nice website with no traffic source. We build you a site that looks like yours, converts like ours, and is powered by storEDGE underneath — then we drive Meta traffic directly to it."

---

## 8. Target Customer

**Primary:** 1-10 facility independent operators and owner-operators. The overlooked backbone of the industry. They don't want another SaaS login. They want units filled.

**Secondary:** Regional operators with 10-25 facilities looking for a performance-accountable partner, not a vendor.

**Tertiary:** Portfolio operators (25+) who are dissatisfied with current agency/SaaS results and want real ad-to-move-in attribution.

---

## 9. Positioning Language

### The Elevator Pitch
"StowStack is a full-funnel acquisition and conversion system for self-storage. We build ad-specific landing pages with embedded online reservation and move-in functionality, so every campaign has its own URL, message, and offer. We track exactly which ads produce reservations and move-ins, run A/B tests, and optimize based on actual revenue outcomes."

### The Operator Pitch
"I'm a storage operator too. I built this because I was tired of paying agencies that couldn't tell me which ad produced which move-in. StowStack connects every dollar you spend on ads to an actual reservation. You see what's working, we kill what's not, and your cost per move-in goes down every month."

### The Competitive Pitch
"SEO shops build you a website and tell you to wait 6 months. Google PPC platforms send your clicks to a page you can't control. We build the page, drive the traffic, embed the rental flow, and tell you exactly which ad filled which unit."

### The Bundle Pitch
"You're paying one company for a website and another for ads. Neither one can tell you which ad produced a move-in. With StowStack, it's one system: the ad, the page, the rental flow, and the reporting — all connected. That's how you stop guessing and start scaling."

---

## 10. Key Definitions

| Term | Meaning |
|------|---------|
| **Demand engine** | Product A — paid media campaigns (Meta, Google PPC, retargeting) that create and capture demand |
| **Conversion layer** | Product B — custom branded websites and ad-specific landing pages with embedded storEDGE rental flow |
| **Ad-specific landing page** | A dedicated URL built for a single ad campaign with its own headline, offer, tracking, and embedded rental flow |
| **Embedded rental flow** | The actual storEDGE online reservation / move-in tool placed inside a StowStack-built page so customers can reserve or rent units without leaving |
| **Data integration** | Pulling data in and out for audits, reporting, analytics, pricing, leads, dashboards (separate from embedded rental flow) |
| **Full-funnel attribution** | Tracking the complete path from ad impression → landing page visit → offer seen → reservation → move-in → revenue, tied to the specific campaign/ad/creative that produced it |
| **Campaign-specific funnel** | Different ads landing on different pages with different offers matched to different user intent |
| **CRO** | Conversion rate optimization — ongoing testing and improvement of landing pages based on revenue behavior |
| **storEDGE** | The transaction infrastructure layer — handles real-time availability, reservation processing, move-in completion, and payment processing underneath StowStack's front end |

---

## 11. What StowStack Does NOT Do

- StowStack is not an SEO company (that's StorageRankers' lane)
- StowStack is not a SaaS dashboard (that's Adverank's lane)
- StowStack does not replace storEDGE — it sits on top of it
- StowStack does not sell "marketing services" — it sells a closed-loop acquisition system
- StowStack does not optimize for clicks or impressions — it optimizes for reservations and move-ins
- StowStack does not operate as an agency that "runs ads" — it owns the full funnel from ad to lease

---

## 12. The ROI Math

A single move-in at a typical self-storage facility is worth **$100-150/mo in recurring revenue**. At a 12-month average tenant stay, that's **$1,200-1,800 in lifetime value per move-in**.

If StowStack's Growth tier ($1,500/mo) produces even **5-10 incremental move-ins per month**, the operator is generating $6,000-18,000 in annualized revenue from a $1,500/mo investment.

That is a **4-12x return** before the system even starts optimizing.

As A/B testing and attribution data compound over 6+ months, cost per move-in drops and conversion rate climbs. The ROI only gets better with time.

---

## 13. Long-Term Strategic Plays

1. **Performance bonus model:** Once 6+ months of attribution data proves cost-per-move-in across multiple clients, introduce hybrid pricing: lower base retainer + per-move-in bonus above a baseline. Aligns StowStack's revenue with the operator's revenue. Makes StowStack nearly impossible to fire.

2. **Portfolio rollout:** Once proven at single-facility level, the system can be rolled out across multi-facility portfolios with shared brand systems, centralized management, and cross-facility budget allocation.

3. **Data moat:** Over time, StowStack accumulates conversion data across facilities, markets, unit types, offer structures, and creative approaches. This data becomes a proprietary advantage that no new competitor can replicate without years of testing.

4. **Conference presence:** Follow Adverank's playbook — build brand at SSA, FSSA, and state association shows. But lead with operator credibility, not AI buzzwords.

5. **Content engine:** Build a content arm (blog, newsletter, social) that speaks operator language. Not "AI-powered budget optimization." Instead: "This ad produced 14 move-ins at $38 each last month. Here's the page it landed on."

---

*This document represents the complete StowStack product architecture, competitive positioning, pricing framework, and strategic vision as of March 2026. Every decision, feature, and piece of messaging should trace back to the core principle: StowStack owns the full path from ad impression to signed lease, and can prove it.*
