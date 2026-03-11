import { useState, useEffect, useRef } from 'react'
import {
  ArrowRight, Search, Calendar, User, Tag, Clock, ChevronDown,
  BookOpen, TrendingUp, Target, Megaphone, BarChart2, Building2,
  Shield, Zap, Eye, RefreshCw, DollarSign, Mail, Phone, X,
  ArrowLeft, Filter, ChevronRight
} from 'lucide-react'

/* ─── Email / Phone Gate ─── */
function AccessGate({ onUnlock }) {
  const [mode, setMode] = useState('email')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (mode === 'email') {
      if (!value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        setError('Please enter a valid email address')
        return
      }
    } else {
      if (!value.match(/^\+?[\d\s\-()]{7,}$/)) {
        setError('Please enter a valid phone number')
        return
      }
    }
    setSubmitting(true)
    setTimeout(() => {
      localStorage.setItem('stowstack_library_access', JSON.stringify({ mode, value, ts: Date.now() }))
      onUnlock()
    }, 800)
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4">
      <div className="absolute inset-0 gradient-mesh opacity-30" />
      <div className="relative max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-brand mb-4 animate-float">
            <BookOpen size={28} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            The Storage Operator Library
          </h1>
          <p className="text-slate-400 text-base">
            Deep-dive articles on Meta ads strategy, occupancy growth, and revenue recovery written by operators who run their own facilities.
          </p>
        </div>

        <div className="glass-dark rounded-2xl p-6 sm:p-8">
          <p className="text-sm text-slate-300 mb-5 text-center">
            Join 500+ storage operators on our mailing list for instant access.
          </p>

          <div className="flex gap-2 mb-5 bg-slate-800/50 rounded-lg p-1">
            <button
              onClick={() => { setMode('email'); setValue(''); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                mode === 'email' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail size={14} /> Email
            </button>
            <button
              onClick={() => { setMode('phone'); setValue(''); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                mode === 'phone' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Phone size={14} /> Phone
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type={mode === 'email' ? 'email' : 'tel'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={mode === 'email' ? 'you@company.com' : '(555) 123-4567'}
                className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
              />
              {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full gradient-brand text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Unlocking...
                </span>
              ) : (
                <>Unlock the Library <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-[11px] text-slate-500 mt-4 text-center leading-relaxed">
            No spam. Unsubscribe anytime. We send 1-2 articles per month on storage ad strategy and occupancy growth.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { n: '25+', l: 'Articles' },
            { n: '500+', l: 'Operators' },
            { n: 'Free', l: 'Access' },
          ].map((s) => (
            <div key={s.l} className="text-center glass-dark rounded-xl py-3 px-2">
              <p className="text-lg font-bold text-white">{s.n}</p>
              <p className="text-[11px] text-slate-400">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Blog Data ─── */
const AUTHORS = {
  blake: { name: 'Blake Burkett', role: 'CEO / Storage Operator' },
  angelo: { name: 'Angelo Vitale', role: 'Senior Designer' },
  rachel: { name: 'Rachel Kim', role: 'Account Director' },
  marcus: { name: 'Marcus Dellatore', role: 'Head of Media Buying' },
  priya: { name: 'Priya Sharma', role: 'Analytics Lead' },
  tyler: { name: 'Tyler Brooks', role: 'Creative Strategist' },
}

const CATEGORIES = ['All', 'Meta Ads', 'Occupancy Growth', 'Revenue Strategy', 'Creative & Copy', 'Analytics', 'Operations']

const ARTICLES = [
  {
    id: 1, slug: 'cbo-structure-self-storage',
    title: 'How We Structure CBO Campaigns for Self-Storage Facilities',
    excerpt: 'Campaign Budget Optimization is not optional for storage ads. Here is the exact ad set architecture we use across 20+ facility accounts and why most agencies get it wrong.',
    author: 'marcus', category: 'Meta Ads', date: '2026-02-28', readTime: '8 min',
    tags: ['CBO', 'Campaign Structure', 'Ad Sets'],
    body: `Most agencies set up one campaign with one ad set and call it a day. That is not how you run Meta ads for self-storage.\n\nAt StowStack, every facility gets a CBO (Campaign Budget Optimization) structure with separate ad sets for each demand trigger and unit type. This lets Meta's algorithm allocate budget toward the highest-converting segments in real time.\n\n## Why CBO Matters for Storage\n\nStorage demand is not monolithic. Someone moving across town has different urgency than someone downsizing after a divorce. A 5x10 climate-controlled unit serves a different customer than a 10x30 drive-up.\n\nBy splitting these into separate ad sets under a single CBO campaign, you get:\n- Automatic budget shifting toward what converts\n- Clear data on which demand triggers perform\n- Ability to kill underperformers without disrupting winners\n\n## Our Standard CBO Structure\n\n**Campaign 1: Prospecting**\n- Ad Set 1: Life-event targeting (movers, new homeowners)\n- Ad Set 2: Interest-based (storage, moving, home renovation)\n- Ad Set 3: Lookalike 1% from move-in conversions\n- Ad Set 4: Lookalike 3% broad expansion\n\n**Campaign 2: Retargeting**\n- Ad Set 1: Website visitors (7-day window)\n- Ad Set 2: Website visitors (14-30 day window)\n- Ad Set 3: Video viewers / lead form openers\n\nEach ad set runs 3-5 creative variants with dynamic creative testing enabled. We review performance weekly and reallocate based on CPL and cost-per-move-in, not impressions.\n\n## The Takeaway\n\nIf your agency is running one ad set to everyone within 20 miles, you are wasting budget. CBO with proper segmentation is how you drive real move-ins at a sustainable cost.`
  },
  {
    id: 2, slug: 'vacancy-economics-roi',
    title: 'The Vacancy Economics That Should Keep Every Operator Up at Night',
    excerpt: 'One row of empty 10x10s costs more per year than you think. Here is the math we run for every new client, and why most operators underestimate the real cost of inaction.',
    author: 'blake', category: 'Revenue Strategy', date: '2026-02-20', readTime: '6 min',
    tags: ['Revenue', 'Vacancy', 'ROI', 'MRR'],
    body: `Let me walk you through the math we show every operator on their first audit call.\n\nTake 15 empty 10x10 units renting at $120/month. That is $1,800 per month in lost Monthly Recurring Revenue. Over a year, that is $21,600 from just one row.\n\nNow multiply that across your entire vacant inventory. Most operators we talk to are leaving $50,000 to $150,000 per year on the table.\n\n## The Compounding Problem\n\nVacancy does not just cost you rent. It costs you:\n- **Pricing power**: High vacancy forces rate concessions\n- **NOI impact**: Revenue drops but fixed costs stay the same\n- **Refinancing leverage**: Lower NOI means lower property valuation\n- **Competitive position**: Full facilities attract premium tenants\n\n## Where Meta Ads Fit\n\nA properly targeted Meta campaign costs $750-$1,500/month in management plus $1,000-$2,500 in ad spend. If that campaign fills even 5-7 units at $120/month, you are cash-flow positive in month one.\n\nThat is not hypothetical. That is the math we see across our client portfolio.\n\n## The Real Question\n\nThe question is not whether you can afford targeted ads. The question is whether you can afford to let those units sit empty for another quarter while your generic agency reports impressions.`
  },
  {
    id: 3, slug: 'pixel-capi-setup-guide',
    title: 'Meta Pixel and Conversions API: The Setup Guide for Storage Websites',
    excerpt: 'Without Pixel and CAPI, your campaigns are flying blind. No retargeting, no lookalikes, no conversion data. Here is exactly how we set it up for every client.',
    author: 'marcus', category: 'Meta Ads', date: '2026-02-12', readTime: '10 min',
    tags: ['Meta Pixel', 'CAPI', 'Tracking', 'Setup'],
    body: `If your Meta Pixel is not installed, or it is installed but you have no Conversions API running server-side, your campaigns are operating without a feedback loop.\n\nThat means:\n- No Custom Audiences from website visitors\n- No Lookalike Audiences from actual conversions\n- No retargeting for people who visited but did not convert\n- No accurate attribution for move-ins\n\n## What We Install for Every Client\n\n**Meta Pixel (Browser-Side)**\n- Base pixel on every page\n- PageView event on load\n- Lead event on form submissions\n- Contact event on click-to-call\n- Custom event for unit page views\n\n**Conversions API (Server-Side)**\n- Duplicate all pixel events server-side\n- Improved match quality with hashed email/phone\n- Resistant to browser ad blockers\n- Better data for algorithm optimization\n\n**Custom Conversions**\n- Lead form complete\n- Phone call initiated\n- Move-in confirmed (via CRM integration where possible)\n\n## Event Match Quality\n\nMeta gives each event a match quality score. We aim for 7+ out of 10 on every event by passing:\n- Hashed email address\n- Hashed phone number\n- Client IP address\n- User agent\n- Click ID (fbc/fbp cookies)\n\nHigher match quality means better attribution, better Lookalike Audiences, and lower CPL over time.\n\n## The Bottom Line\n\nPixel and CAPI are not optional extras. They are the foundation everything else is built on. If your agency has not set this up, they are running your campaigns blind.`
  },
  {
    id: 4, slug: 'retargeting-sequences-storage',
    title: 'How to Build Retargeting Sequences That Actually Convert Storage Leads',
    excerpt: 'Most people do not rent a storage unit on the first visit. Retargeting keeps your facility in front of them until they are ready, without burning budget on cold audiences.',
    author: 'tyler', category: 'Meta Ads', date: '2026-02-05', readTime: '7 min',
    tags: ['Retargeting', 'Funnel', 'Creative'],
    body: `Here is a stat that most agencies ignore: over 90% of people who visit your storage website do not convert on the first visit. They are browsing, comparing, checking prices.\n\nWithout retargeting, you paid to get them to your site and then let them walk away. With retargeting, you stay in front of them for pennies on the dollar.\n\n## Our 3-Window Retargeting System\n\n**Window 1: Hot (1-7 days)**\nThese people just visited. They are still actively looking.\n- Creative: Urgency-focused ("Units going fast in [area]")\n- Offer: Direct CTA to call or reserve\n- Frequency: 1-2 impressions per day\n\n**Window 2: Warm (8-21 days)**\nStill in the decision window but may need a nudge.\n- Creative: Social proof / testimonial style\n- Offer: Highlight specific unit features or move-in specials\n- Frequency: 1 impression per day\n\n**Window 3: Cool (22-60 days)**\nLong-cycle prospects or people whose plans changed.\n- Creative: Awareness / brand recall\n- Offer: Seasonal or promotional angles\n- Frequency: 3-4 impressions per week\n\n## Sequential Creative\n\nThe key is not showing the same ad 47 times. Each window gets different creative that matches where the prospect is in their decision process.\n\nWe also use frequency capping to prevent ad fatigue, which is something most agencies never configure.\n\n## Results\n\nRetargeting typically delivers 3-5x lower CPL compared to cold prospecting because you are reaching people who already showed intent. It is the highest-ROI segment in every campaign we manage.`
  },
  {
    id: 5, slug: 'lookalike-audiences-storage',
    title: 'Building Lookalike Audiences from Your Best Tenants',
    excerpt: 'Your existing move-ins are a goldmine of targeting data. Here is how we build Lookalike Audiences that find more people just like your highest-value tenants.',
    author: 'priya', category: 'Analytics', date: '2026-01-28', readTime: '6 min',
    tags: ['Lookalike Audiences', 'Targeting', 'Data'],
    body: `Lookalike Audiences are one of the most powerful features in Meta's ad platform, and they are criminally underused in self-storage.\n\nThe concept is simple: you give Meta a list of your best customers, and the algorithm finds more people with similar characteristics, behaviors, and demographics.\n\n## What We Use as Source Audiences\n\n**Tier 1: Move-In Conversions (Best)**\nPeople who actually signed a lease. This is the strongest signal.\n\n**Tier 2: Phone Calls / Lead Form Submits**\nHigh-intent actions that indicate real interest.\n\n**Tier 3: Website Visitors (Unit Pages)**\nPeople who looked at specific unit types and pricing.\n\n## Lookalike Percentages\n\nWe typically run three tiers:\n- **1% Lookalike**: Closest match to your source audience. Highest quality, smallest reach.\n- **3% Lookalike**: Broader but still high quality. Good for scaling.\n- **5% Lookalike**: Widest reach. Used for expansion testing.\n\nAll three run in separate ad sets under CBO so Meta can allocate budget toward whichever converts best.\n\n## The Data Requirement\n\nYou need at minimum 100 events in your source audience for Lookalikes to work well. This is why Pixel and CAPI setup on day one is so critical. Every visitor and every conversion is building your targeting intelligence.\n\n## Why Most Agencies Miss This\n\nBecause they never installed the Pixel properly, never set up conversion events, and therefore have no data to build Lookalikes from. They are running blind interest-based targeting when they could be reaching statistically validated high-probability converters.`
  },
  {
    id: 6, slug: 'speed-to-lead-kills-conversions',
    title: 'Speed-to-Lead Is Killing Your Conversions (and Your Agency Will Never Tell You)',
    excerpt: 'Industry data shows leads contacted within 5 minutes convert at 8x the rate of leads contacted after 30 minutes. Your ad campaign is only as good as your follow-up.',
    author: 'rachel', category: 'Operations', date: '2026-01-20', readTime: '5 min',
    tags: ['Speed-to-Lead', 'Conversion', 'Operations'],
    body: `You can run the best Meta campaign in the world and still lose money if your follow-up process is broken.\n\nHere is the data point that should change how you think about leads: prospects contacted within 5 minutes of their inquiry convert at 8x the rate of prospects contacted after 30 minutes.\n\nAfter an hour, conversion probability drops by over 90%.\n\n## What We See in Operator Audits\n\nIn our facility audits, here is what we typically find:\n- Average response time: 2-4 hours (sometimes next day)\n- Missed calls with no callback: 30-40% of total\n- No SMS follow-up sequence\n- Voicemail messages that do not include hours, website, or callback instructions\n\n## The Fix\n\n1. **Automated SMS**: Instant text response when a lead form is submitted\n2. **Missed call recovery**: Automated text within 60 seconds of a missed call\n3. **Call tracking**: Know which calls came from which campaign\n4. **Follow-up sequence**: 3-touch SMS sequence over 48 hours for non-converters\n5. **Office training**: Answer by ring 3, have a scripted greeting, collect contact info\n\n## Why Your Agency Does Not Mention This\n\nBecause they do not track past the click. Their job ends when the lead comes in. Our job includes making sure that lead actually converts into a move-in, because that is the metric we report on.`
  },
  {
    id: 7, slug: 'creative-testing-storage-ads',
    title: 'The Ad Creative Framework We Use for Every Storage Campaign',
    excerpt: 'Generic "safe and secure storage" ads do not convert. Here is the creative testing framework our design team uses to find winning angles for each facility.',
    author: 'tyler', category: 'Creative & Copy', date: '2026-01-12', readTime: '7 min',
    tags: ['Creative', 'Ad Copy', 'Testing', 'Design'],
    body: `If your ads say "safe, secure, convenient storage" you are invisible. Every storage facility says that.\n\nWinning creative starts with specificity. Here is the framework we use.\n\n## The 4-Angle Testing System\n\nFor every new campaign, we launch with 4 creative angles:\n\n**Angle 1: Urgency / Scarcity**\n"Only 3 climate-controlled 10x10s left at [location]"\nWorks when occupancy is moderate and specific unit types are limited.\n\n**Angle 2: Life-Event Trigger**\n"Moving to [area]? Reserve your unit before you pack the truck."\nTargets people in specific life transitions.\n\n**Angle 3: Problem / Solution**\n"Garage so full you cannot park? We have a 10x10 for $99/mo."\nAddresses a relatable pain point with a specific solution.\n\n**Angle 4: Social Proof**\n"Join 200+ families who trust [facility] for their storage needs."\nLeverages existing tenant count or review ratings.\n\n## Dynamic Creative Testing\n\nWe use Meta's dynamic creative feature to test:\n- 3-5 headline variants\n- 2-3 primary text variants\n- 2-3 image or video options\n\nMeta mixes and matches these to find the best combinations automatically. We review results weekly and graduate winners to dedicated ad sets.\n\n## What Gets Killed\n\nAny creative variant with CPL 2x above the account average gets paused within 7 days. We do not let underperformers eat budget. Fast testing, fast decisions.`
  },
  {
    id: 8, slug: 'unit-mix-campaign-segmentation',
    title: 'Why Your Campaign Needs Unit-Type Segmentation (Not One Ad for Everything)',
    excerpt: 'Climate-controlled 5x10s attract a completely different renter than outdoor 10x30 drive-ups. Running one ad for everything is leaving money on the table.',
    author: 'blake', category: 'Revenue Strategy', date: '2026-01-05', readTime: '6 min',
    tags: ['Unit Mix', 'Segmentation', 'Strategy'],
    body: `Here is something most agencies do not understand about self-storage: different unit types serve different customers with different needs, different price sensitivity, and different urgency levels.\n\nRunning one generic ad that says "storage units available" is like a car dealership running one ad for both a Honda Civic and a Ford F-350. The buyers are completely different.\n\n## How We Segment\n\n**Climate-Controlled Units**\nTarget: People storing furniture, documents, electronics, wine, art\nCreative angle: Protection, quality, peace of mind\nTypical renter: Higher income, longer duration\n\n**Standard Drive-Up Units**\nTarget: People moving, downsizing, decluttering\nCreative angle: Convenience, access, value\nTypical renter: Price-sensitive, medium duration\n\n**Vehicle / Boat / RV Storage**\nTarget: Vehicle owners, seasonal storage needs\nCreative angle: Security, covered/heated options, easy access\nTypical renter: Premium pricing tolerance, very long duration\n\n**Small Units (5x5, 5x10)**\nTarget: Apartment dwellers, students, seasonal overflow\nCreative angle: Affordable, close to home, easy rental process\nTypical renter: Short-to-medium duration\n\n## Why This Matters for ROI\n\nWhen you segment by unit type, you can:\n- Write specific ad copy that resonates with each audience\n- Set different CPL targets based on unit revenue\n- Identify which unit types have the best conversion rates\n- Allocate more budget toward your highest-vacancy unit classes\n\nThis is basic revenue management applied to advertising. But most agencies do not think about it because they do not understand storage economics.`
  },
  {
    id: 9, slug: 'revpau-metric-operators-need',
    title: 'RevPAU: The One Metric Every Storage Operator Should Track',
    excerpt: 'Revenue Per Available Unit is the single best indicator of facility health. Here is how we use it to inform campaign strategy and measure real performance.',
    author: 'priya', category: 'Analytics', date: '2025-12-28', readTime: '5 min',
    tags: ['RevPAU', 'KPIs', 'Analytics', 'Revenue'],
    body: `If you only track one number for your facility, make it RevPAU: Revenue Per Available Unit.\n\nRevPAU = Total Revenue / Total Available Units\n\nThis single metric captures both occupancy and pricing in one number. A facility at 95% occupancy with weak rates might have worse RevPAU than a facility at 85% with strong pricing.\n\n## Why RevPAU Beats Occupancy Alone\n\nOccupancy tells you how full you are. RevPAU tells you how well you are monetizing your space.\n\nConsider:\n- Facility A: 95% occupancy, $90 avg rate = $85.50 RevPAU\n- Facility B: 85% occupancy, $120 avg rate = $102.00 RevPAU\n\nFacility B is generating more revenue per unit even with lower occupancy.\n\n## How We Use RevPAU in Campaign Strategy\n\n1. **Baseline measurement**: What is your current RevPAU before we start?\n2. **Target setting**: Where should RevPAU be based on market comps?\n3. **Campaign optimization**: Are we attracting tenants at rate levels that improve RevPAU?\n4. **Monthly reporting**: RevPAU trend over time is our north star metric\n\n## The RevPAU Improvement Flywheel\n\nTargeted ads fill vacant units, which improves occupancy, which gives you pricing power, which raises rates, which increases RevPAU, which improves NOI, which increases property value.\n\nThat is the chain reaction we are engineering with every campaign.`
  },
  {
    id: 10, slug: 'seasonal-campaign-calendar',
    title: 'The Self-Storage Seasonal Campaign Calendar We Use Internally',
    excerpt: 'Storage demand is predictable if you know the patterns. Here is the month-by-month campaign calendar our team follows to stay ahead of seasonal shifts.',
    author: 'rachel', category: 'Occupancy Growth', date: '2025-12-18', readTime: '8 min',
    tags: ['Seasonal', 'Calendar', 'Planning', 'Strategy'],
    body: `Storage demand follows predictable seasonal patterns. If you are running the same campaign in January that you run in June, you are leaving money on the table.\n\nHere is the campaign calendar our team uses across all client accounts.\n\n## Q1: January - March (The Build Phase)\n\nDemand is lowest. This is when smart operators invest.\n- Focus: Retargeting existing website visitors\n- Creative: New year decluttering, tax season document storage\n- Budget: Moderate. Build Pixel data for spring.\n- Promo: Consider first-month specials to fill stubborn vacancies\n\n## Q2: April - June (The Ramp)\n\nDemand starts climbing. Moving season is approaching.\n- Focus: Scale prospecting campaigns\n- Creative: Moving-related triggers, graduation, spring cleaning\n- Budget: Increase 20-30%. Competition is rising.\n- Promo: Reduce discounts as demand grows\n\n## Q3: July - September (Peak Season)\n\nHighest demand of the year. Conversion rates peak.\n- Focus: Maximum prospecting budget\n- Creative: Urgency-heavy ("limited units"), premium unit types\n- Budget: Maximum allocation. Best CPL of the year.\n- Promo: Minimal discounting. Maximize rate.\n\n## Q4: October - December (The Wind-Down)\n\nDemand cools. Holiday storage picks up.\n- Focus: Retargeting heavy, holiday-specific creative\n- Creative: Holiday storage, seasonal items, vehicle winterization\n- Budget: Moderate. Shift toward retention.\n- Promo: End-of-year specials for slow unit types\n\n## The Key Insight\n\nOperators who maintain campaigns year-round build compounding data advantages. Your Pixel gets smarter, Lookalikes sharpen, and retargeting pools grow. Pausing campaigns in the off-season resets all of that progress.`
  },
  {
    id: 11, slug: 'google-vs-meta-storage',
    title: 'Google Ads vs Meta Ads for Self-Storage: Where to Put Your Budget',
    excerpt: 'Google captures demand. Meta creates it. Here is when each channel makes sense and why we lead with Meta for most new clients.',
    author: 'marcus', category: 'Meta Ads', date: '2025-12-10', readTime: '7 min',
    tags: ['Google Ads', 'Meta Ads', 'Channel Strategy', 'Budget'],
    body: `This is one of the most common questions we get: should I run Google Ads or Meta Ads?\n\nThe short answer: both, but lead with Meta.\n\n## Google Ads: Demand Capture\n\nGoogle Ads reach people actively searching "storage near me" or "10x10 storage unit [city]." These are high-intent keywords, but:\n- Cost per click: $5-15+ in competitive markets\n- You are bidding against 3-5 other facilities\n- Limited targeting beyond search intent\n- No visual creative differentiation\n\n## Meta Ads: Demand Creation\n\nMeta reaches people during life events that create storage need, before they ever search:\n- Lower CPL typically ($15-40 vs $30-80+ on Google)\n- Visual creative lets you differentiate\n- Retargeting turns website visitors into move-ins\n- Lookalike Audiences find more people like your best tenants\n- Life-event targeting reaches movers, downsizers, renovators\n\n## Why We Lead With Meta\n\n1. **Lower entry cost**: You can test for $1,000/month in ad spend\n2. **Data compounding**: Pixel data improves over time\n3. **Full-funnel coverage**: Awareness through conversion in one platform\n4. **Creative flexibility**: Test multiple angles quickly\n5. **Retargeting**: Turn browsers into tenants\n\n## When to Add Google\n\nOnce Meta campaigns are profitable and scaling, add Google Search for high-intent capture. The combination is powerful: Meta creates demand and awareness, Google captures people who search after seeing your ads.\n\nBut starting with Google alone in a competitive market often means burning $3,000-5,000/month for marginal results.`
  },
  {
    id: 12, slug: 'call-handling-audit-checklist',
    title: 'The Call Handling Audit Checklist We Run for Every New Client',
    excerpt: 'Your ad campaign is only as good as what happens when the phone rings. Here is the exact 12-point checklist our team uses to audit call handling and follow-up.',
    author: 'rachel', category: 'Operations', date: '2025-12-01', readTime: '6 min',
    tags: ['Call Handling', 'Audit', 'Operations', 'Conversion'],
    body: `We have seen $2,000/month ad campaigns fail because the front desk answers on ring 7 with "hello?"\n\nBefore we optimize a single ad, our team audits every client's call handling and follow-up process. Here is the checklist.\n\n## The 12-Point Call Audit\n\n1. **Ring count**: How many rings before answer? Target: 3 or fewer\n2. **Greeting script**: Does the team use a consistent, professional greeting?\n3. **Caller info capture**: Are they collecting name, phone, email, unit need?\n4. **Unit availability response**: Can they quickly check and quote available units?\n5. **Pricing presentation**: How do they present rates? Discounts?\n6. **Urgency creation**: Do they mention limited availability or time-sensitive offers?\n7. **Next step clarity**: Do they push for a reservation or visit?\n8. **Missed call rate**: What percentage of calls go unanswered?\n9. **Voicemail quality**: Does the voicemail include hours, website, and callback promise?\n10. **Callback speed**: How fast are missed calls returned?\n11. **SMS follow-up**: Is there an automated text for missed calls and web leads?\n12. **Lead tracking**: Are inquiries logged in a CRM or spreadsheet?\n\n## What We Typically Find\n\nMost operators score 4-6 out of 12. The most common failures:\n- No SMS follow-up (80% of clients)\n- Slow callback on missed calls (70%)\n- No consistent greeting script (60%)\n- No urgency or reservation push (55%)\n\n## Why This Matters for Ad ROI\n\nYou can cut your effective CPL in half just by converting more of the leads you already get. A 20% improvement in call-to-move-in conversion rate means 20% more revenue from the same ad spend.\n\nThat is why we audit operations, not just ads.`
  },
]

/* ─── Article View ─── */
function ArticleView({ article, onBack }) {
  const author = AUTHORS[article.author]
  return (
    <div className="min-h-screen bg-white">
      <div className="gradient-hero py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <button onClick={onBack} className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors cursor-pointer">
            <ArrowLeft size={16} /> Back to Library
          </button>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs font-medium bg-brand-500/20 text-brand-300 px-3 py-1 rounded-full border border-brand-500/30">{article.category}</span>
            <span className="text-xs text-slate-400 flex items-center gap-1"><Clock size={12} /> {article.readTime} read</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-4">{article.title}</h1>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white">
              {author.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{author.name}</p>
              <p className="text-xs text-slate-400">{author.role} &middot; {new Date(article.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="prose prose-slate max-w-none">
          {article.body.split('\n\n').map((block, i) => {
            if (block.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-slate-900 mt-8 mb-3">{block.replace('## ', '')}</h2>
            if (block.startsWith('**') && block.endsWith('**')) return <h3 key={i} className="text-lg font-semibold text-slate-800 mt-6 mb-2">{block.replace(/\*\*/g, '')}</h3>
            if (block.startsWith('- ')) {
              return (
                <ul key={i} className="space-y-1.5 my-3">
                  {block.split('\n').map((li, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-600 leading-relaxed">
                      <span className="text-brand-500 mt-1">&#8226;</span>
                      {li.replace(/^- /, '')}
                    </li>
                  ))}
                </ul>
              )
            }
            return <p key={i} className="text-[15px] text-slate-600 leading-relaxed mb-4">{block}</p>
          })}
        </div>
        <div className="mt-12 flex flex-wrap gap-2">
          {article.tags.map(t => (
            <span key={t} className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200">{t}</span>
          ))}
        </div>
        <div className="mt-12 glass-dark rounded-2xl p-6 text-center">
          <h3 className="text-lg font-bold text-white mb-2">Want this kind of strategy for your facility?</h3>
          <p className="text-sm text-slate-400 mb-4">Get a free facility audit from our team. We will show you exactly where your funnel leaks and what we would build.</p>
          <button className="gradient-brand text-white px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-all cursor-pointer">
            Get Your Free Facility Audit
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Library Main ─── */
function LibraryContent({ onBack }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [sortBy, setSortBy] = useState('newest')
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [authorFilter, setAuthorFilter] = useState('all')

  if (selectedArticle) {
    return <ArticleView article={selectedArticle} onBack={() => setSelectedArticle(null)} />
  }

  let filtered = ARTICLES.filter(a => {
    const matchesSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.excerpt.toLowerCase().includes(search.toLowerCase()) || a.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    const matchesCategory = category === 'All' || a.category === category
    const matchesAuthor = authorFilter === 'all' || a.author === authorFilter
    return matchesSearch && matchesCategory && matchesAuthor
  })

  if (sortBy === 'newest') filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
  else if (sortBy === 'oldest') filtered.sort((a, b) => new Date(a.date) - new Date(b.date))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="gradient-hero py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button onClick={onBack} className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors cursor-pointer">
            <ArrowLeft size={16} /> Back to Site
          </button>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-brand-500/20 text-brand-300 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-brand-500/30">
              <BookOpen size={14} /> Operator Library
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Storage Ad Strategy, Written by Operators</h1>
            <p className="text-slate-400 text-base">In-depth articles on Meta ads, occupancy growth, revenue recovery, and everything we have learned running campaigns for 20+ storage facilities.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search articles..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c} onClick={() => setCategory(c)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                    category === c ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <select value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-600 focus:outline-none focus:border-brand-500">
                <option value="all">All Authors</option>
                {Object.entries(AUTHORS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-600 focus:outline-none focus:border-brand-500">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <p className="text-sm text-slate-500 mb-6">{filtered.length} article{filtered.length !== 1 ? 's' : ''}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {filtered.map((a) => {
            const author = AUTHORS[a.author]
            return (
              <button
                key={a.id} onClick={() => setSelectedArticle(a)}
                className="text-left bg-white border border-slate-200 rounded-xl overflow-hidden card-hover cursor-pointer group"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-medium bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full border border-brand-200">{a.category}</span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1"><Clock size={10} /> {a.readTime}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-brand-600 transition-colors leading-snug">{a.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4 line-clamp-3">{a.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {author.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-700">{author.name}</p>
                        <p className="text-[10px] text-slate-400">{new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-500 transition-colors" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Search size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No articles match your filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Export with Gate ─── */
export default function Library({ onBack }) {
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('stowstack_library_access')
    if (stored) setUnlocked(true)
  }, [])

  if (!unlocked) return <AccessGate onUnlock={() => setUnlocked(true)} />
  return <LibraryContent onBack={onBack} />
}
