import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import AdminDashboard from '@/components/AdminDashboard'
import ClientPortal from '@/components/ClientPortal'
import { PrivacyPolicy, TermsOfService } from '@/components/LegalPages'
import DemoDashboard from '@/components/DemoDashboard'
import {
  ArrowRight, BarChart3, Target, TrendingUp, Zap, Clock,
  ChevronDown, ChevronUp, Menu, X, Phone, Mail, Check,
  Star, Building2, DollarSign, Megaphone, Layers,
  Truck, Home, Heart, Package, GraduationCap, Hammer, Boxes,
  Car, Calendar, Users, Shield, Rocket, Search, Eye, RefreshCw,
  Code, Headphones, BarChart2, Key, Calculator, ArrowUpRight,
  XCircle, CheckCircle2, Crosshair, Timer, Cpu,
  SlidersHorizontal, Sparkles, MousePointerClick, PhoneCall,
  MessageSquare, UserCheck, Linkedin, Globe, Play
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════ */
/*  DATA                                                    */
/* ═══════════════════════════════════════════════════════ */

const BRAND = 'StowStack'

const TEAM = [
  { name: 'Blake Burkett', role: 'CEO & Founder', avatar: 'BB', bio: 'Blake has 7+ years in self-storage, U-Haul, and moving operations in Michigan. A walking encyclopedia of storage know-how with 4 fully automated facilities of his own. He needed a system that could actually fill units and could not find one. <em>So he built it.</em> StowStack was tried, tested, and born inside his own portfolio.', linkedin: 'https://linkedin.com/in/mruhaul' },
  { name: 'Angelo Vogley', role: 'Co-Founder & Chief Design Officer', avatar: 'AV', bio: 'Angelo obsesses over the details most people never notice. He leads creative across the entire company and his talent and training let him look at a landing page, an ad, or a brand and know exactly what is costing you conversions. Every pixel, every headline, every layout goes through him. His job is turning eyeballs on screens into feet inside your facility.' },
  { name: 'Anna Almeida', role: 'Onboarding Specialist & Scrum Master', avatar: 'AA', bio: 'Anna is the reason clients say we are easy to work with. She owns your experience before the first campaign launches, keeps the entire team on schedule while it runs, and checks in long after the work is done. She answers fast, asks the right questions, and treats your facility like it is the only one on her list. Fill out our facility audit form and Anna will be the first person you hear from and the last one to let anything slip.' },
]

const STATS = [
  { value: '47%', label: 'Avg. occupancy lift', icon: TrendingUp },
  { value: '$8.20', label: 'Cost per lead', icon: DollarSign },
  { value: '3.2x', label: 'Return on ad spend', icon: BarChart3 },
  { value: '14 days', label: 'Avg. time to first lead', icon: Clock },
]

const PROBLEMS = [
  { title: 'Vacant Units Hemorrhaging MRR', desc: 'Every empty 10x10 at $120/mo is $1,440/year in lost Monthly Recurring Revenue. Multiply that across a row of units and you are bleeding five figures annually while your marketing team reports "impressions."' },
  { title: 'Nobody Can Define Occupancy Velocity', desc: 'They run ads for dentists, HVAC, and restaurants on the same playbook. They do not understand lease-up curves, revenue per available unit (RevPAU), or how unit-mix strategy affects yield.' },
  { title: 'Speed-to-Lead Is Nonexistent', desc: 'Industry data shows leads contacted within 5 minutes convert at 8x the rate of leads contacted after 30. Most marketing partners never mention this because they do not track past the click.' },
  { title: 'Promos Driving Unqualified Traffic', desc: 'High CPM, low conversion rate, inflated CTR on broad audiences. Traditional marketing celebrates "engagement" while your front desk wastes hours on tire-kickers who never sign a lease.' },
  { title: 'No Pixel. No CAPI. No Retargeting.', desc: 'Without Meta Pixel and Conversions API installed, your campaigns have zero feedback loop. No Custom Audiences, no Lookalike targeting, no retargeting. You are running blind and paying for it.' },
  { title: 'Stale Unit Mix With Zero Demand Segmentation', desc: 'Climate-controlled 5x10s need different creative than outdoor parking or drive-up 10x20s. One generic ad set because nobody understands unit-type economics.' },
]

const COMPARISON_ROWS = [
  { generic: 'Reports CPM and CTR, vanity metrics only', stow: 'Reports CPL, cost-per-move-in, and occupancy velocity' },
  { generic: 'Cannot explain unit-mix strategy or RevPAU', stow: 'Segments campaigns by unit type, pricing tier, and demand trigger' },
  { generic: 'Ignores everything past the ad click', stow: 'Audits full funnel: ad to landing page to call to follow-up to move-in' },
  { generic: 'Treats storage like another local-service client', stow: 'Built by operators who run our own storage portfolio' },
  { generic: 'Generic audiences with no pixel data', stow: 'Custom Audiences, Lookalikes, and retargeting powered by Pixel + CAPI' },
  { generic: '2 to 4 week onboarding with "strategy decks"', stow: 'Campaigns live in 48 to 72 hours. No decks. Just results.' },
  { generic: 'One ad set, one audience, set it and forget it', stow: 'CBO structures with dynamic creative testing across multiple ad sets' },
  { generic: 'No operator experience. Learning on your budget.', stow: 'Team with 7+ years in storage ops, U-Haul, and moving services' },
]

const SERVICES_FULL = [
  { icon: Megaphone, title: 'Full-Funnel Meta Campaigns', desc: 'Custom campaign architecture with CBO, Auction buying, and Advantage+ placements. Built around your specific vacant unit types. Live in 48 to 72 hours.' },
  { icon: Eye, title: 'Operator-Informed Creative', desc: 'Ad headlines, angles, and creative assets built around real demand triggers, not stock "secure storage" copy. We A/B test 3 to 5 variants per ad set and kill underperformers fast.' },
  { icon: Target, title: 'Precision Audience Targeting', desc: 'Lookalike Audiences from your highest-value move-ins, Custom Audiences from Pixel data, life-event behavioral targeting, and radius-based geo-fencing. No wasted impressions.' },
  { icon: RefreshCw, title: 'Retargeting Sequences', desc: 'Multi-window retargeting for website visitors, video viewers, and lead form openers. Sequential creative that moves prospects through the funnel with frequency capping to prevent fatigue.' },
  { icon: Code, title: 'Pixel + Conversions API Setup', desc: 'Full Meta Pixel and server-side Conversions API installation. Custom conversion events for lead form submits, calls, and move-ins. Event match quality optimization.' },
  { icon: Key, title: 'Move-In Conversion Strategy', desc: 'Tactical recommendations on offer structure, pricing presentation, urgency messaging, and lease-up acceleration. We optimize the path from lead to signed lease, not just the ad.' },
  { icon: Headphones, title: 'Call & Follow-Up Audit', desc: 'We audit your speed-to-lead metrics, missed call recovery, voicemail scripts, and SMS follow-up sequences. If your office kills conversions, we tell you directly and show you the fix.' },
  { icon: BarChart2, title: 'Operator-Grade Reporting', desc: 'Monthly performance tied to CPL, cost-per-move-in, ROAS, and occupancy impact. Attribution by unit type, campaign, and audience. No vanity dashboards. Actionable intelligence only.' },
]

const DEMAND_TRIGGERS = [
  { icon: Truck, label: 'Moving & Relocation', desc: 'Local and long-distance moves. We know this demand from running U-Haul dealerships and a moving company.' },
  { icon: Heart, label: 'Divorce & Life Disruption', desc: 'Urgent belongings management with high intent. These prospects convert fast if your campaign reaches them first.' },
  { icon: Home, label: 'Downsizing', desc: 'Transitioning to smaller space. Overflow storage is mandatory, not optional. High LTV tenants.' },
  { icon: Package, label: 'Estate Cleanouts', desc: 'Sorting inherited belongings. Temporary but high-volume. Often invisible to marketing teams that do not understand the demand cycle.' },
  { icon: Hammer, label: 'Remodeling & Renovation', desc: 'Home projects require clearing rooms. Predictable seasonal demand we target proactively with pre-season campaigns.' },
  { icon: Boxes, label: 'Business Overflow', desc: 'Contractors, e-commerce sellers, small businesses needing inventory staging. Commercial tenants with longer lease durations.' },
  { icon: GraduationCap, label: 'College Transitions', desc: 'Students cycling in and out between semesters. Repeatable annual demand we build campaign calendars around.' },
  { icon: Car, label: 'Vehicle / RV / Boat Storage', desc: 'Seasonal vehicle storage with premium rates. We have built and operated heated indoor storage for this vertical.' },
  { icon: Calendar, label: 'Seasonal & Overflow', desc: 'Holiday items, sports gear, off-season belongings. Consistent base demand that fills standard units year-round.' },
]

const ENGINE_STEPS = [
  { icon: MousePointerClick, label: 'Demand Generation', desc: 'Targeted campaigns reach local prospects during life transitions before they search Google. Demand creation, not just demand capture.' },
  { icon: Users, label: 'Qualified Leads', desc: 'Lead forms filter for intent, location, unit type, and urgency. Conversion-optimized landing pages eliminate tire-kickers.' },
  { icon: PhoneCall, label: 'Calls & Inquiries', desc: 'Leads convert to real phone calls and online inquiries from people who actually need a unit now.' },
  { icon: MessageSquare, label: 'Speed-to-Lead System', desc: 'Sub-5-minute response, missed call recovery, and automated SMS sequences. Leads do not decay in your inbox.' },
  { icon: UserCheck, label: 'Move-Ins', desc: 'Qualified prospects convert into signed leases. Optimized offers, reduced friction, clear urgency. The metric that matters.' },
  { icon: TrendingUp, label: 'Occupancy & Revenue Growth', desc: 'Vacancy decreases. RevPAU increases. Pricing power returns. Recurring revenue recovered and compounding.' },
]

const IDEAL_CLIENTS = [
  { title: 'Independent Owner-Operators', desc: 'Single-location owners who want occupancy-focused demand generation managed by people who understand the business, not another generalist marketing firm.' },
  { title: 'Small Multi-Site Operators (2-10 Locations)', desc: 'Groups needing consistent lead flow across facilities with per-location CPL tracking, centralized reporting, and portfolio-level budget optimization.' },
  { title: 'Underperforming Facilities with Stubborn Vacancy', desc: 'Mature properties where specific unit types have been sitting empty. You need demand segmentation by unit class, not more broad campaigns.' },
  { title: 'Lease-Up & New Build Properties', desc: 'New facilities that need to accelerate occupancy velocity. Meta campaigns build local awareness and drive move-ins before SEO has time to compound.' },
  { title: 'Operators Who Want Operators', desc: 'You have paid someone who could not define RevPAU, never configured a Pixel, and ran the same playbook they use for HVAC clients. You want a team that operates storage.' },
]

const KPI_METRICS = [
  { label: 'Leads Generated', value: '197', change: '+18%' },
  { label: 'Cost Per Lead', value: '$28.40', change: '-22%' },
  { label: 'Phone Calls', value: '134', change: '+22%' },
  { label: 'Move-Ins', value: '57', change: '+15%' },
  { label: 'Cost Per Move-In', value: '$97.89', change: '-8%' },
  { label: 'Occupancy Velocity', value: '+4.2%', change: '/month' },
]

const PRICING_TIERS = [
  {
    name: 'Launch', price: '$750', period: '/mo', popular: false,
    desc: 'For single-location operators ready to start recovering lost MRR with targeted Meta campaigns.',
    features: [
      'Full facility audit + competitor analysis',
      'Meta Pixel + Conversions API installation',
      'Campaign build: 2 ad sets, 3 creatives each',
      'Lookalike + Custom Audience setup',
      'Local radius geo-targeting',
      'Lead form or landing page optimization',
      'Monthly performance report (CPL, move-ins)',
      'Campaigns live in 48 to 72 hours',
    ],
  },
  {
    name: 'Growth', price: '$1,500', period: '/mo', popular: true,
    desc: 'For operators serious about occupancy velocity with full-funnel conversion support and retargeting.',
    features: [
      'Everything in Launch',
      'Expanded campaign: 4+ ad sets, dynamic creative',
      'Multi-window retargeting sequences',
      'A/B split testing on audiences + creative',
      'Call handling + speed-to-lead audit',
      'Move-in conversion strategy',
      'Unit-type specific campaign segmentation',
      'Bi-weekly strategy calls with the team',
      'Priority Slack support',
    ],
  },
  {
    name: 'Portfolio', price: 'Custom', period: '', popular: false,
    desc: 'For multi-site operators (3+ locations) needing centralized campaign management and portfolio optimization.',
    features: [
      'Everything in Growth per location',
      'Centralized multi-facility dashboard',
      'Cross-location budget allocation optimization',
      'Market-specific campaign strategy per facility',
      'Dedicated onboarding specialist (Anna)',
      'Weekly strategy calls with Blake + Angelo',
      'Full-funnel audit for each location',
      'Custom KPI tracking + attribution modeling',
      'Quarterly business review',
    ],
  },
]

const TESTIMONIALS = [
  { name: 'Mark D.', role: 'Owner, 3 Locations, Michigan', text: 'Went from 72% to 89% occupancy in four months. They actually understand what drives move-ins, not just ad metrics. The call handling audit alone was worth the fee.', metric: '+17% occ.' },
  { name: 'Lisa R.', role: 'Operator, Single Site, Ohio', text: 'First team that did not try to sell me on "brand awareness." They set up the Pixel, built retargeting from day one, and focused entirely on cost-per-move-in. Results showed in month one.', metric: '$6.40 CPL' },
  { name: 'Jeff T.', role: 'Regional Manager, 6 Locations, Indiana', text: 'The per-location CPL tracking and unit-type campaign segmentation changed everything. I finally know which facilities are converting and which ad sets to scale. Real operator reporting.', metric: '3.8x ROAS' },
]

const FAQS = [
  { q: 'Why Meta ads instead of Google for self-storage?', a: 'Google captures existing demand: people already searching "storage near me." Meta creates new demand by reaching local people during life events (moving, divorce, downsizing, renovation) before they ever search. By the time someone is on Google, they are already comparing four facilities. Meta gets your facility in front of them first. We run both channels for some clients, but Meta consistently delivers lower CPL when properly configured with Pixel tracking and retargeting.' },
  { q: 'How fast do campaigns actually go live?', a: 'Campaigns are live within 48 to 72 hours of our initial audit call. Our team moves this fast because we already know the industry. There is no learning curve. We audit your facility, build the CBO campaign structure with Lookalike and Custom Audiences, upload dynamic creative, and launch. Most firms burn 2 to 4 weeks on onboarding decks before a single ad runs.' },
  { q: 'What makes this different from hiring a regular agency?', a: 'We operate self-storage facilities. That is the difference. Our team runs our own portfolio: drive-up, climate, industrial conversions, heated boat/RV, U-Haul dealerships. Every campaign we build is informed by real operational data: unit-mix economics, seasonal demand patterns, lease-up curves, and conversion bottlenecks we see in our own business. We do not just run ads. We audit your full funnel from ads to website to call handling to follow-up to move-in process.' },
  { q: 'What if our website or follow-up process is weak?', a: 'We will tell you directly and give specific, actionable fixes. A strong campaign still fails if leads hit a weak website or calls go unanswered past five rings. Our audit covers speed-to-lead, website conversion rate, call scripts, missed call recovery, and SMS follow-up sequences. Most agencies never mention operational friction because they do not know what good storage operations look like.' },
  { q: 'Do you handle Pixel and Conversions API setup?', a: 'Yes. Full Meta Pixel installation, server-side Conversions API (CAPI) configuration, custom conversion event setup, and event match quality optimization are included in every engagement. Without this infrastructure, campaigns have no feedback loop and cannot build Custom or Lookalike Audiences. We consider it non-negotiable.' },
  { q: 'What KPIs do you report on?', a: 'Cost per lead (CPL), cost per move-in, leads by source, phone calls, move-ins, ROAS, occupancy velocity, and unit-type attribution. Not impressions, not reach, not CTR. Every metric ties directly to whether units are getting filled and what it cost to fill them. Reports are in plain English with clear action items.' },
  { q: 'Who is behind StowStack?', a: 'Blake Burkett (CEO/Founder) is a CRE owner with 7+ years in self-storage and U-Haul operations in Michigan. Angelo Vogley (Co-Founder/CDO) leads all design vision, creative strategy, and brand identity. Anna Almeida (Onboarding Specialist/Scrum Master) ensures every client gets fast, responsive support from day one through mission complete. We built this for our own facilities first, proved it worked, and now run it for operators across the US and Canada.' },
  { q: 'Do you require long-term contracts?', a: 'No. 90-day initial engagement, then month-to-month. We earn your business every month. That said, campaign performance compounds over time as Pixel data matures, Lookalike audiences sharpen, and creative testing narrows to top performers. The operators who stay past 90 days see significantly stronger ROAS because the system gets smarter every month.' },
  { q: 'What ad spend do you recommend?', a: 'Minimum $1,000/month paid directly to Meta (not to us). For most single-location facilities, $1,500 to $2,500/month in ad spend produces the strongest CPL and enough data volume for meaningful optimization. Multi-site operators typically allocate $1,000 to $2,000 per location. Our management fee is separate and transparent.' },
]

const WHY_US = [
  { icon: Building2, title: 'We Operate Storage Facilities', desc: 'Our team runs our own portfolio: drive-up, climate, industrial, boat/RV, U-Haul, moving. We know the business because we are in it every day.' },
  { icon: DollarSign, title: 'Revenue Recovery, Not Vanity Metrics', desc: 'We track CPL, cost-per-move-in, and occupancy velocity. Not impressions. Not reach. Your monthly report tells you exactly how many units we helped fill.' },
  { icon: Phone, title: 'We Audit Past the Click', desc: 'Most marketing stops at the ad. We audit your call handling, website conversion rate, speed-to-lead, follow-up sequences, and move-in friction.' },
  { icon: TrendingUp, title: 'Pricing & Promo Intelligence', desc: 'We understand rate sensitivity, promotional ROI, competitor price positioning, and how discounting strategy affects lease-up velocity and tenant quality.' },
  { icon: Crosshair, title: 'Demand-Trigger Targeting', desc: 'Our campaigns target life events that create storage need: moving, downsizing, divorce, remodels. We see these triggers in our own facilities daily.' },
  { icon: Timer, title: '48-72 Hour Launch', desc: 'No 3-week onboarding. No strategy decks. Our team builds your full campaign architecture and goes live in days, not months.' },
]

const CAMPAIGN_ARCH = [
  {
    icon: Layers, title: 'CBO Campaign Structure',
    items: ['Campaign Budget Optimization across ad sets', 'Separate ad sets per unit type and demand trigger', 'Dynamic creative testing (3-5 variants per set)', 'Automated rules for pausing underperformers'],
  },
  {
    icon: Target, title: 'Audience Architecture',
    items: ['Custom Audiences from website visitors (Pixel + CAPI)', 'Lookalike Audiences (1%, 3%, 5%) from move-in conversions', 'Life-event targeting: recently moved, listed home, newly engaged', 'Radius-based geo-fencing around your facility'],
  },
  {
    icon: RefreshCw, title: 'Retargeting Engine',
    items: ['Website visitor retargeting (7, 14, 30-day windows)', 'Engaged viewer retargeting (video, lead form openers)', 'Sequential ad creative based on funnel stage', 'Frequency capping to prevent ad fatigue'],
  },
]

/* ═══════════════════════════════════════════════════════ */
/*  SCROLL REVEAL HOOK                                      */
/* ═══════════════════════════════════════════════════════ */

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return { ref, className: `transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}` }
}

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const r = useReveal()
  return (
    <div ref={r.ref} className={`${r.className} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  COMPONENTS                                              */
/* ═══════════════════════════════════════════════════════ */

function AuditBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div data-audit-banner className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3 text-white text-sm">
        <Zap size={14} className="shrink-0 animate-pulse" />
        <span className="font-medium">Same-Day Facility Audits Available</span>
        <span className="hidden sm:inline text-white/80">Book before 2PM and get your audit today.</span>
        <a href="#cta" className="shrink-0 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold transition-all">
          Book Now
        </a>
        <button onClick={() => setDismissed(true)} className="shrink-0 text-white/60 hover:text-white cursor-pointer ml-1">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hasBanner, setHasBanner] = useState(true)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const check = () => {
      const banner = document.querySelector('[data-audit-banner]')
      setHasBanner(!!banner)
    }
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  const links = [
    { label: 'Why Us', href: '#why-us' },
    { label: 'Services', href: '#services' },
    { label: 'System', href: '#engine' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ]

  return (
    <header className={`fixed left-0 right-0 z-50 transition-all duration-300 ${hasBanner ? 'top-[42px]' : 'top-0'} ${
      scrolled ? 'bg-white/90 backdrop-blur-xl shadow-[0_1px_0_0_rgba(0,0,0,0.06)]' : 'bg-transparent'
    }`}>
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-5 h-16">
        <a href="#" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center shadow-md shadow-emerald-600/20">
            <Building2 size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight font-['Space_Grotesk']">
            Stow<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600">Stack</span>
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <a key={l.href} href={l.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a href="/portal" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Client Login
          </a>
          <a href="tel:+12699298541" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
            <Phone size={14} /> (269) 929-8541
          </a>
          <Button size="sm" className="rounded-full px-5 font-semibold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 border-0 shadow-md shadow-emerald-600/20" asChild>
            <a href="#cta">Get Free Audit</a>
          </Button>
        </div>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 -mr-2">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t px-5 pb-5 pt-2 shadow-lg">
          {links.map(l => (
            <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
              className="block py-3 text-sm text-muted-foreground hover:text-foreground border-b border-border/50 last:border-0">
              {l.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 mt-4">
            <a href="/portal" onClick={() => setMobileOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">
              Client Login
            </a>
            <a href="tel:+12699298541" className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Phone size={14} /> (269) 929-8541
            </a>
            <Button className="rounded-full font-semibold w-full bg-gradient-to-r from-emerald-500 to-green-600" asChild>
              <a href="#cta">Get Free Audit</a>
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}

function Hero() {
  return (
    <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden" style={{ background: 'linear-gradient(to bottom, #020617, #0f172a, #022c22)' }}>
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-pulse" style={{ background: 'rgba(16,185,129,0.1)' }} />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(99,102,241,0.05)' }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
      </div>

      <div className="max-w-6xl mx-auto px-5">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-medium mb-6">
              <Rocket size={14} /> The Occupancy Demand Engine for Self-Storage
            </div>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] mb-6 text-white">
              The{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Demand Engine</span>{' '}
              That Fills Vacant Storage Units
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto mb-8">
              We built this system for our own self-storage portfolio. After it cut vacancy rates and drove qualified
              move-ins across our facilities, we opened it to operators in our network.
              Our demand engine combines precision audience targeting, conversion-optimized creative, full-funnel tracking,
              and retargeting — launching in 48 to 72 hours.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Button size="lg" className="rounded-full px-8 text-base font-semibold h-13 group bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 border-0 shadow-lg shadow-emerald-600/25 w-full sm:w-auto" asChild>
                <a href="#cta">
                  <Search size={18} className="mr-2" />
                  Get Your Free Facility Audit
                  <ArrowRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8 text-base font-semibold h-13 group border-white/20 text-white hover:bg-white/10 !bg-transparent w-full sm:w-auto" asChild>
                <a href="#engine">
                  See the Occupancy Engine
                </a>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={350}>
            <a
              href="/demo"
              onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/demo'); window.dispatchEvent(new PopStateEvent('popstate')) }}
              className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors mb-4"
            >
              <Play size={14} /> See a live demo dashboard with simulated results
            </a>
          </Reveal>

          <Reveal delay={400}>
            <p className="text-sm text-slate-400 mb-10">No contracts. No setup fees. No learning-your-industry phase. We already operate in it.</p>
          </Reveal>

          {/* Credibility pills */}
          <Reveal delay={500}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-4xl mx-auto">
              {[
                { icon: Building2, text: 'Self-Storage Only' },
                { icon: Key, text: 'Operator-Built' },
                { icon: Target, text: 'Move-In Focused' },
                { icon: Timer, text: '48-72hr Launch' },
                { icon: DollarSign, text: 'Revenue Recovery' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center justify-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2.5">
                  <Icon size={14} className="text-emerald-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-300">{text}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function SocialProofStrip() {
  return (
    <section className="py-5 bg-white border-b border-border/50">
      <div className="max-w-6xl mx-auto px-5">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
          {[
            { icon: Building2, text: 'Self-Storage Exclusive' },
            { icon: Users, text: 'Operator-Run Team' },
            { icon: Rocket, text: '48hr Launch' },
            { icon: Shield, text: 'No Contracts' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon size={16} className="text-emerald-600" />
              <span><strong className="text-foreground">{text}</strong></span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function StatsBar() {
  return (
    <section className="border-b bg-gradient-to-r from-emerald-50/50 via-white to-teal-50/50">
      <div className="max-w-6xl mx-auto px-5 py-12 md:py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {STATS.map((s, i) => (
            <Reveal key={i} delay={i * 100}>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <s.icon size={18} className="text-emerald-600" />
                  <span className="text-3xl md:text-4xl font-bold tracking-tight">{s.value}</span>
                </div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function LaunchTimeline() {
  const steps = [
    { day: 'Day 1', title: 'Facility Audit Call', desc: 'Blake and the team map your vacancy gaps, unit mix, market comps, and conversion bottlenecks. You walk away with a full-funnel diagnostic, free of charge.', icon: Search },
    { day: 'Day 1-2', title: 'Market & Funnel Audit', desc: 'Our analytics team audits your website conversion rate, Google Business Profile, competitor ad presence, reviews, and call-to-move-in ratio.', icon: Eye },
    { day: 'Day 2-3', title: 'Campaign Build', desc: 'Our team builds your campaign architecture: CBO structure, Lookalike and Custom Audiences, dynamic creative, lead forms, and retargeting sequences.', icon: Megaphone },
    { day: 'Day 3', title: 'Ads Go Live', desc: 'Campaigns launch across Facebook and Instagram with full Meta Pixel + Conversions API tracking. Qualified leads start flowing within hours of launch.', icon: Rocket },
  ]

  return (
    <section className="py-16 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%)] bg-[length:20px_20px] opacity-20" />
      <div className="relative max-w-6xl mx-auto px-5">
        <Reveal>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white">From Audit Call to Live Ads in 48-72 Hours</h2>
            <p className="mt-3 text-white/80 text-lg">Most agencies burn 2-4 weeks on onboarding. We launch in days because we already know the industry cold.</p>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 100}>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5 h-full hover:bg-white/15 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <s.icon size={16} className="text-white" />
                  </div>
                  <span className="text-xs font-bold text-white/70 uppercase tracking-wider">{s.day}</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-1">{s.title}</h3>
                <p className="text-sm text-white/80 leading-relaxed">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProblemSection() {
  return (
    <section id="why-us" className="py-20 md:py-28 relative overflow-hidden" style={{ background: '#020617' }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.08), transparent 70%)' }} />
      <div className="relative max-w-6xl mx-auto px-5">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Why Operators Switch to {BRAND}
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              You are paying for marketing that cannot define RevPAU, does not know what a move-in funnel looks like, and has never set foot in a storage facility.
            </p>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROBLEMS.map((p, i) => (
            <Reveal key={p.title} delay={i * 80}>
              <div className="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-xl p-6 h-full hover:border-red-500/30 transition-colors">
                <XCircle size={22} className="text-red-400 mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">{p.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function ComparisonSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Traditional Marketing vs. {BRAND}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              This is not a branding debate. It is a fundamental difference in campaign architecture, audience strategy, and what gets measured.
            </p>
          </div>
        </Reveal>
        <div className="max-w-4xl mx-auto">
          <div className="hidden sm:grid grid-cols-2 gap-4 mb-4 px-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center"><X size={14} className="text-red-500" /></div>
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Traditional Marketing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center"><Check size={14} className="text-emerald-600" /></div>
              <span className="text-sm font-bold text-emerald-700 uppercase tracking-wider">{BRAND}</span>
            </div>
          </div>
          <div className="space-y-2">
            {COMPARISON_ROWS.map((row, i) => (
              <Reveal key={i} delay={i * 60}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div className="bg-red-50/80 border border-red-100 rounded-xl px-4 sm:px-5 py-3 sm:py-4">
                    <span className="sm:hidden text-[10px] font-bold text-red-400 uppercase tracking-wider">Traditional Marketing</span>
                    <p className="text-sm text-red-700">{row.generic}</p>
                  </div>
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl px-4 sm:px-5 py-3 sm:py-4">
                    <span className="sm:hidden text-[10px] font-bold text-emerald-500 uppercase tracking-wider">{BRAND}</span>
                    <p className="text-sm text-emerald-800 font-medium">{row.stow}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function VacancyCostCalculator() {
  const [units, setUnits] = useState(15)
  const [avgRent, setAvgRent] = useState(120)
  const [months, setMonths] = useState(3)
  const lost = units * avgRent * months
  const launchBreakeven = Math.ceil(750 / avgRent)
  const growthBreakeven = Math.ceil(1500 / avgRent)
  const launchAnnualUpside = (units * avgRent * 12) - (750 * 12)
  const growthAnnualUpside = (units * avgRent * 12) - (1500 * 12)

  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-slate-50 to-white relative">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-red-200">
              <Calculator size={14} /> Vacancy Cost + ROI Calculator
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              See the Real Cost of Empty Units — and How Fast We Pay for Ourselves
            </h2>
          </div>
        </Reveal>

        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8">
          <Reveal>
            <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-900/5 border border-border/50 h-full">
              <h3 className="font-semibold mb-1">Adjust Your Numbers</h3>
              <p className="text-sm text-muted-foreground mb-6">Drag the sliders to match your facility. Watch the lost revenue and ROI update in real time.</p>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Vacant Units</label>
                    <span className="text-sm font-bold bg-muted px-2.5 py-0.5 rounded-lg">{units}</span>
                  </div>
                  <input type="range" min={5} max={100} value={units} onChange={(e) => setUnits(+e.target.value)} className="w-full accent-red-500" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Avg Monthly Rent per Unit</label>
                    <span className="text-sm font-bold bg-muted px-2.5 py-0.5 rounded-lg">${avgRent}</span>
                  </div>
                  <input type="range" min={50} max={400} step={10} value={avgRent} onChange={(e) => setAvgRent(+e.target.value)} className="w-full accent-red-500" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Months Vacant</label>
                    <span className="text-sm font-bold bg-muted px-2.5 py-0.5 rounded-lg">{months}</span>
                  </div>
                  <input type="range" min={1} max={12} value={months} onChange={(e) => setMonths(+e.target.value)} className="w-full accent-red-500" />
                </div>
              </div>
              <div className="mt-6 rounded-xl p-6 text-center" style={{ background: '#0f172a' }}>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Lost Recurring Revenue</p>
                <p className="text-4xl sm:text-5xl font-extrabold text-red-400">${lost.toLocaleString()}</p>
                <p className="text-slate-500 mt-1 text-xs">{units} units x ${avgRent}/mo x {months} months</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="space-y-4 h-full flex flex-col">
              <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-900/5 border border-border/50 flex-1">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-600" /> ROI Payoff by Tier
                </h3>
                <p className="text-sm text-muted-foreground mb-5">See exactly how few units you need to rent to cover the cost of our service.</p>

                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold">Launch Tier</span>
                    <span className="text-sm font-semibold text-emerald-700">$750/mo</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-white/80 rounded-lg p-3 text-center">
                      <p className="text-2xl font-extrabold text-emerald-700">{launchBreakeven}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Units to Break Even</p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3 text-center">
                      <p className="text-2xl font-extrabold text-emerald-700">${launchAnnualUpside.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Annual Upside</p>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-800 mt-3 font-medium">
                    Rent just {launchBreakeven} unit{launchBreakeven !== 1 ? 's' : ''} at ${avgRent}/mo and the service pays for itself.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold">Growth Tier</span>
                    <span className="text-sm font-semibold text-indigo-700">$1,500/mo</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-white/80 rounded-lg p-3 text-center">
                      <p className="text-2xl font-extrabold text-indigo-700">{growthBreakeven}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Units to Break Even</p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3 text-center">
                      <p className="text-2xl font-extrabold text-indigo-700">${growthAnnualUpside.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Annual Upside</p>
                    </div>
                  </div>
                  <p className="text-xs text-indigo-800 mt-3 font-medium">
                    Rent {growthBreakeven} unit{growthBreakeven !== 1 ? 's' : ''} and you are profitable. Full retargeting included.
                  </p>
                </div>
              </div>

              <div className="text-center">
                <Button className="rounded-full px-6 font-semibold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 border-0 shadow-lg shadow-emerald-600/20" asChild>
                  <a href="#cta"><Search size={16} className="mr-2" /> Get Your Free Facility Audit</a>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function TeamSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-emerald-200">
              Not Marketers Learning Storage. Operators Who Built an Ad Engine.
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Meet the Team Behind {BRAND}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Storage operators, media buyers, designers, and data people. A small team that moves fast and knows this industry inside out.
            </p>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {TEAM.map((m, i) => (
            <Reveal key={m.name} delay={i * 80}>
              <div className="bg-white rounded-xl p-5 border border-border/50 shadow-lg shadow-slate-900/5 h-full hover:shadow-xl hover:border-emerald-200/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-md">
                    {m.avatar}
                  </div>
                  <div>
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-xs text-emerald-600 font-medium">{m.role}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: m.bio }} />
                {m.linkedin && (
                  <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emerald-600 mt-3 transition-colors">
                    <Linkedin size={12} /> LinkedIn
                  </a>
                )}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={300}>
          <div className="max-w-3xl mx-auto mt-12">
            <div className="rounded-2xl p-6 sm:p-8 text-slate-300 text-[15px] leading-relaxed space-y-4" style={{ background: '#0f172a' }}>
              <p>
                Blake, Angelo, and Anna have built {BRAND} from the ground up — combining deep CRE and storage operations
                experience, world-class design thinking, and the kind of client support that makes you feel like the only account
                on the roster. We have built ground-up drive-up facilities, climate-controlled builds, industrial conversions,
                heated indoor boat and RV storage, and U-Box container warehousing.
              </p>
              <p>
                We watched storage owners get burned by marketing firms that could not define RevPAU, did not know what a
                move-in funnel looked like, and had never configured a Meta Pixel for a storage website. So we built the demand
                engine ourselves, tested it on our own portfolio, and when it worked, operators in our network started asking for it.
              </p>
              <p className="text-white font-medium">
                That is the difference between a marketing vendor and a team that operates storage facilities and built the demand engine to fill them.
                We are the second one.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function WhyUsSection() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-emerald-50/50 to-white">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-emerald-200">
              The {BRAND} Advantage
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Built by a Team That Knows Where Facilities Leak Revenue
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Not marketers who Googled "self-storage." A team of operators and media buyers who run our own facilities and built the ad engine to fill them.
            </p>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {WHY_US.map((a, i) => (
            <Reveal key={a.title} delay={i * 80}>
              <div className="bg-white rounded-xl p-6 border border-border/50 shadow-lg shadow-slate-900/5 h-full hover:shadow-xl hover:border-emerald-200/50 transition-all">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center mb-4 shadow-md">
                  <a.icon size={20} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{a.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{a.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function DemandTriggersSection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden" style={{ background: '#020617' }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at top right, rgba(16,185,129,0.08), transparent 60%)' }} />
      <div className="relative max-w-6xl mx-auto px-5">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Why Our Targeting Outperforms Every Traditional Marketing
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              We understand storage demand because we see these triggers in our own facilities every week. Meta lets us put your
              facility in front of these prospects before they ever open Google.
            </p>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEMAND_TRIGGERS.map((t, i) => (
            <Reveal key={t.label} delay={i * 60}>
              <div className="flex items-start gap-4 bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-xl p-5 h-full hover:border-emerald-500/30 transition-colors">
                <div className="shrink-0 w-9 h-9 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center justify-center">
                  <t.icon size={18} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-0.5">{t.label}</h3>
                  <p className="text-sm text-slate-400">{t.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function CampaignArchSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-muted text-muted-foreground px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-border">
              <Cpu size={14} /> Under the Hood
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Campaign Architecture Built for Storage Economics
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Every campaign our media buying team builds follows a proven structure optimized for self-storage conversion, not a repurposed template from another industry.
            </p>
          </div>
        </Reveal>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5">
          {CAMPAIGN_ARCH.map((col, i) => (
            <Reveal key={col.title} delay={i * 100}>
              <div className="bg-white rounded-xl p-6 border border-border/50 shadow-lg shadow-slate-900/5 h-full hover:shadow-xl transition-all">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center mb-4 shadow-md">
                  <col.icon size={20} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-3">{col.title}</h3>
                <ul className="space-y-2">
                  {col.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="max-w-5xl mx-auto mt-6 rounded-xl p-5" style={{ background: '#0f172a' }}>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              {[
                { label: 'Meta Pixel', icon: Code },
                { label: 'Conversions API', icon: Cpu },
                { label: 'Custom Conversions', icon: Target },
                { label: 'Advantage+ Placements', icon: Sparkles },
                { label: 'Dynamic Creative', icon: Layers },
                { label: 'A/B Split Testing', icon: SlidersHorizontal },
              ].map(({ label, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2 text-slate-400">
                  <Icon size={14} className="text-emerald-400" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function ServicesSection() {
  return (
    <section id="services" className="py-20 md:py-28 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center mb-14">
            <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">What Our Team Delivers</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              A complete occupancy-recovery system engineered for self-storage economics
            </h2>
            <p className="text-muted-foreground text-lg">
              Not a recycled digital marketing menu.
            </p>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SERVICES_FULL.map((s, i) => (
            <Reveal key={s.title} delay={i * 60}>
              <div className="group bg-white rounded-xl p-5 border border-border/50 shadow-lg shadow-slate-900/5 h-full hover:shadow-xl hover:border-emerald-200/50 transition-all">
                <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform">
                  <s.icon size={18} className="text-white" />
                </div>
                <h3 className="text-base font-semibold mb-1.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function OccupancyEngine() {
  return (
    <section id="engine" className="py-20 md:py-28" style={{ background: '#0f172a' }}>
      <div className="max-w-6xl mx-auto px-5">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-emerald-900/40 text-emerald-400 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-emerald-700/40">
              The Occupancy Engine
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">From Ad Click to Signed Lease</h2>
            <p className="mt-4 text-lg text-slate-400">
              A complete system engineered to move local prospects from first impression to signed lease, launched in 48-72 hours.
            </p>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ENGINE_STEPS.map((step, i) => (
            <Reveal key={step.label} delay={i * 80}>
              <div className="relative rounded-xl p-6 border border-slate-700/50 h-full hover:border-emerald-700/50 transition-all" style={{ background: '#1e293b' }}>
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {i + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <step.icon size={16} className="text-emerald-400" />
                      <h3 className="font-semibold text-white">{step.label}</h3>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
                {i < ENGINE_STEPS.length - 1 && (i + 1) % 3 !== 0 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-emerald-500">
                    <ArrowRight size={20} />
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function IdealClientSection() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Best Fit Clients</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We work exclusively with self-storage operators across the US & Canada. Independent and small multi-site owners who want more move-ins
              without the overhead of a marketing firm that does not understand the business.
            </p>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {IDEAL_CLIENTS.map((t, i) => (
            <Reveal key={t.title} delay={i * 80}>
              <div className="flex items-start gap-3 bg-white rounded-xl p-5 border border-border/50 shadow-lg shadow-slate-900/5 h-full hover:shadow-xl transition-all">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">{t.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

const SCORECARD_QUESTIONS = [
  { id: 'pixel', question: 'Is the Meta Pixel installed on your website?', weight: 15, yesText: 'Pixel active — your campaigns can build audiences.', noText: 'No Pixel means zero retargeting, no Lookalikes, and no conversion tracking. You are running blind.' },
  { id: 'capi', question: 'Do you have Conversions API (CAPI) configured?', weight: 12, yesText: 'Server-side tracking in place — strong data signal.', noText: 'Without CAPI, iOS privacy changes gut your data. Expect 30-40% of conversions to go untracked.' },
  { id: 'retargeting', question: 'Are you running retargeting campaigns?', weight: 13, yesText: 'Retargeting active — recapturing warm prospects.', noText: 'Website visitors who leave never see your facility again. Retargeting recaptures 10-20% of lost traffic.' },
  { id: 'speedToLead', question: 'Do leads get contacted within 5 minutes?', weight: 15, yesText: 'Fast follow-up — you are converting at the highest rate.', noText: 'Leads contacted in 5 min convert 8x more than those contacted after 30. This is likely your biggest leak.' },
  { id: 'unitSegmentation', question: 'Do your ads target specific unit types separately?', weight: 10, yesText: 'Unit-type segmentation — smart budget allocation.', noText: 'One generic ad for all units wastes budget. A 5x5 renter and a 10x30 RV parker need completely different messaging.' },
  { id: 'cpl', question: 'Do you know your cost per move-in (not just cost per lead)?', weight: 12, yesText: 'Tracking cost-per-move-in — real ROI visibility.', noText: 'CPL means nothing if leads do not convert. Cost-per-move-in is the only metric that ties ad spend to revenue.' },
  { id: 'creative', question: 'Are you A/B testing ad creatives regularly?', weight: 10, yesText: 'Active creative testing — finding top performers.', noText: 'Running one ad set indefinitely guarantees fatigue. You need 3-5 variants per audience with regular rotation.' },
  { id: 'missedCalls', question: 'Do you have a missed call recovery system?', weight: 13, yesText: 'Missed call recovery — no leads falling through the cracks.', noText: 'Missed calls are dead leads. An automated callback or SMS within 2 minutes recovers 25-40% of them.' },
]

function getGrade(score: number): { letter: string; color: string; bg: string; border: string; message: string } {
  if (score >= 90) return { letter: 'A', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', message: 'Your marketing stack is strong. Fine-tuning and scale are your next moves.' }
  if (score >= 75) return { letter: 'B', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', message: 'Solid foundation with key gaps. Fixing them could significantly improve your cost-per-move-in.' }
  if (score >= 55) return { letter: 'C', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', message: 'Several critical gaps in your funnel. You are likely overpaying for leads and missing conversions.' }
  if (score >= 35) return { letter: 'D', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', message: 'Major infrastructure missing. Your ad spend is working against you without these fundamentals.' }
  return { letter: 'F', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', message: 'Your marketing needs a complete overhaul. The good news: the upside from here is massive.' }
}

function MarketingScorecard() {
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({})
  const [submitted, setSubmitted] = useState(false)

  const answeredCount = Object.values(answers).filter(v => v !== null && v !== undefined).length
  const allAnswered = answeredCount === SCORECARD_QUESTIONS.length

  const score = SCORECARD_QUESTIONS.reduce((sum, q) => {
    return sum + (answers[q.id] === true ? q.weight : 0)
  }, 0)

  const grade = getGrade(score)
  const weaknesses = SCORECARD_QUESTIONS.filter(q => answers[q.id] === false)

  const handleAnswer = (id: string, value: boolean) => {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }

  const handleSubmit = () => {
    if (allAnswered) setSubmitted(true)
  }

  const handleReset = () => {
    setAnswers({})
    setSubmitted(false)
  }

  return (
    <section className="py-20 md:py-28" style={{ background: '#0f172a' }}>
      <div className="max-w-6xl mx-auto px-5">
        <Reveal>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-amber-500/20">
              <SlidersHorizontal size={14} /> Free Marketing Assessment
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Grade Your Storage Marketing in 60 Seconds
            </h2>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
              Answer 8 questions about your current setup. Get an instant score with specific recommendations for your facility.
            </p>
          </div>
        </Reveal>

        {!submitted ? (
          <Reveal>
            <div className="max-w-3xl mx-auto">
              <div className="space-y-3">
                {SCORECARD_QUESTIONS.map((q, i) => (
                  <div
                    key={q.id}
                    className={`rounded-xl p-5 border transition-all ${
                      answers[q.id] !== null && answers[q.id] !== undefined
                        ? 'bg-slate-800/50 border-slate-700'
                        : 'bg-slate-800/30 border-slate-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-500 bg-slate-800 w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-sm font-medium text-white leading-relaxed">{q.question}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleAnswer(q.id, true)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            answers[q.id] === true
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => handleAnswer(q.id, false)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            answers[q.id] === false
                              ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="h-2 flex-1 max-w-xs bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-500"
                      style={{ width: `${(answeredCount / SCORECARD_QUESTIONS.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{answeredCount}/{SCORECARD_QUESTIONS.length}</span>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={!allAnswered}
                  className={`rounded-full px-8 py-3 font-semibold border-0 shadow-lg transition-all ${
                    allAnswered
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/20 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Sparkles size={16} className="mr-2" /> Get My Score
                </Button>
              </div>
            </div>
          </Reveal>
        ) : (
          <Reveal>
            <div className="max-w-3xl mx-auto">
              {/* Score Header */}
              <div className="text-center mb-8">
                <div className={`inline-flex items-center justify-center w-28 h-28 rounded-2xl ${grade.bg} ${grade.border} border-2 mb-4`}>
                  <span className={`text-6xl font-extrabold ${grade.color}`}>{grade.letter}</span>
                </div>
                <p className="text-4xl font-extrabold text-white mb-2">{score}/100</p>
                <p className="text-slate-400 max-w-lg mx-auto">{grade.message}</p>
              </div>

              {/* Breakdown */}
              <div className="space-y-2 mb-8">
                {SCORECARD_QUESTIONS.map((q) => {
                  const yes = answers[q.id] === true
                  return (
                    <div key={q.id} className={`rounded-xl p-4 border ${yes ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                      <div className="flex items-start gap-3">
                        {yes ? (
                          <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{q.question}</p>
                          <p className={`text-xs mt-1 ${yes ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
                            {yes ? q.yesText : q.noText}
                          </p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${yes ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {yes ? `+${q.weight}` : '0'}/{q.weight}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* CTA based on score */}
              {weaknesses.length > 0 && (
                <div className="rounded-2xl p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 mb-6">
                  <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                    <Zap size={16} className="text-amber-400" /> Your Biggest Opportunities
                  </h3>
                  <p className="text-sm text-slate-400 mb-3">
                    Fixing these {weaknesses.length} area{weaknesses.length !== 1 ? 's' : ''} could recover thousands in lost monthly revenue:
                  </p>
                  <ul className="space-y-1.5">
                    {weaknesses.slice(0, 3).map((w) => (
                      <li key={w.id} className="flex items-start gap-2 text-sm text-amber-200/80">
                        <ArrowRight size={14} className="shrink-0 mt-0.5 text-amber-400" />
                        {w.noText}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button className="rounded-full px-6 font-semibold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 border-0 shadow-lg shadow-emerald-600/20" asChild>
                  <a href="#cta"><Search size={16} className="mr-2" /> Get a Free Facility Audit</a>
                </Button>
                <button
                  onClick={handleReset}
                  className="text-sm text-slate-500 hover:text-slate-300 font-medium transition-colors cursor-pointer"
                >
                  Retake Assessment
                </button>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}

function KPIDashboard() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-emerald-200">
              Example Reporting Framework
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Metrics That Actually Move the Needle
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Every number maps to revenue and occupancy. Not impressions. Not CTR. Not reach. The KPIs operators actually need to make decisions.
            </p>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="max-w-4xl mx-auto bg-white rounded-2xl p-6 shadow-xl shadow-slate-900/5 border border-border/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="font-semibold">Monthly Performance — Illustrative Example</h3>
                <p className="text-sm text-muted-foreground">Sample data showing the type of reporting your facility receives</p>
              </div>
              <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full whitespace-nowrap">Active Campaign</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {KPI_METRICS.map((m) => (
                <div key={m.label} className="bg-slate-50 rounded-xl p-4 border border-border/30 hover:border-emerald-200 transition-colors">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{m.label}</p>
                  <p className="text-2xl font-bold">{m.value}</p>
                  <p className="text-xs font-medium mt-1 text-emerald-600">{m.change} vs last month</p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-5 border-t flex flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-emerald-500" /> ROAS: 4.2x
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-blue-500" /> Lead Quality Score: 8.1/10
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-amber-500" /> Speed-to-Lead: 4.2 min avg
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function PricingSection() {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center mb-4">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Straightforward Pricing</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              No hidden fees. No long contracts. No mystery surcharges. Campaigns go live in 48-72 hours.
            </p>
          </div>
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl px-6 py-4 text-center">
              <p className="text-sm text-amber-800">
                <strong>The math is simple:</strong> 10 empty 10x10s at $110/month = $1,100 in lost MRR. That is $13,200/year
                from just one row. If our campaigns recover even 3-4 of those units, the service pays for itself in month one.
              </p>
            </div>
          </div>
        </Reveal>
        <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PRICING_TIERS.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 100}>
              <div className={`relative rounded-2xl p-6 h-full transition-all ${tier.popular
                ? 'border-2 border-emerald-600 bg-white shadow-xl shadow-emerald-600/10 scale-[1.02]'
                : 'border border-border bg-white shadow-lg shadow-slate-900/5'}`}>
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-semibold px-4 py-1 rounded-full shadow-md">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold">{tier.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">{tier.price}</span>
                  <span className="text-muted-foreground">{tier.period}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{tier.desc}</p>
                <ul className="mt-6 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`mt-6 w-full rounded-xl font-semibold ${tier.popular
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 border-0 shadow-md shadow-emerald-600/20'
                    : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                  asChild
                >
                  <a href="#cta"><Search size={14} className="mr-2" /> Get Your Free Facility Audit</a>
                </Button>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          Ad spend is paid directly to Meta (not to us). Recommended minimum: $1,000/mo. No long-term contracts. 90-day initial, then month-to-month.
        </p>
      </div>
    </section>
  )
}

function CaseStudyTeaser() {
  return (
    <section className="py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal>
          <div className="max-w-4xl mx-auto bg-white rounded-2xl overflow-hidden border border-border/50 shadow-xl shadow-slate-900/5">
            <div className="grid md:grid-cols-2">
              <div className="p-8">
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Illustrative Results Framework</span>
                <h3 className="text-xl font-bold mt-2 mb-3">From 64% to 87% Occupancy in 90 Days</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  A suburban facility was stuck at 64% with traditional marketing running broad awareness campaigns.
                  After switching to the {BRAND} demand engine with unit-type segmentation, retargeting,
                  and Lookalike audiences, occupancy climbed 23 points in three months.
                </p>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-2xl font-bold">+23%</p>
                    <p className="text-xs text-muted-foreground">Occupancy Lift</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">$24</p>
                    <p className="text-xs text-muted-foreground">Avg CPL</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">47</p>
                    <p className="text-xs text-muted-foreground">Move-Ins</p>
                  </div>
                </div>
                <a href="#cta" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                  See what this looks like for your facility <ArrowUpRight size={16} />
                </a>
              </div>
              <a
                href="/demo"
                onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/demo'); window.dispatchEvent(new PopStateEvent('popstate')) }}
                className="bg-gradient-to-br from-emerald-50 to-teal-100 p-8 flex items-center justify-center group hover:from-emerald-100 hover:to-teal-200 transition-all cursor-pointer"
              >
                <div className="text-center text-emerald-600">
                  <BarChart3 size={48} className="mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-semibold">Explore the Live Demo</p>
                  <p className="text-xs text-emerald-600/60">See a full client dashboard in action</p>
                </div>
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function TestimonialsSection() {
  return (
    <section id="results" className="py-20 md:py-28 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center mb-14">
            <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">Results</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">What Operators Say</h2>
            <p className="text-sm text-muted-foreground">Representative feedback reflecting the type of results and outcomes our campaigns deliver.</p>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 100}>
              <div className="relative bg-white p-6 md:p-8 rounded-xl border border-border/50 shadow-lg shadow-slate-900/5 flex flex-col h-full hover:shadow-xl transition-all">
                <div className="absolute top-5 right-5">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">{t.metric}</span>
                </div>
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={14} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-6 flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-sm font-bold text-white">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="py-20 md:py-28 border-t">
      <div className="max-w-3xl mx-auto px-5">
        <Reveal>
          <div className="mb-12">
            <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>
        </Reveal>
        <div className="space-y-2">
          {FAQS.map((f, i) => (
            <Reveal key={i} delay={i * 40}>
              <div className="bg-white rounded-xl overflow-hidden border border-border/50 shadow-sm">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left group cursor-pointer hover:bg-slate-50/50 transition-colors"
                >
                  <span className="text-base font-medium pr-8 group-hover:text-emerald-700 transition-colors">{f.q}</span>
                  <ChevronDown size={18} className={`shrink-0 text-muted-foreground transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${open === i ? 'max-h-80 pb-5' : 'max-h-0'}`}>
                  <p className="text-sm text-muted-foreground leading-relaxed px-5 pr-12">{f.a}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section id="cta" className="py-20 md:py-28 text-white" style={{ background: '#020617' }}>
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <Reveal>
            <div>
              <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">Get Started</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5">
                Free audit. No commitment. Real answers.
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                We'll analyze your current digital presence, show you what your competitors are doing, and give you a concrete plan to fill more units.
              </p>
              <div className="space-y-3">
                {[
                  'Full competitive analysis of your local market',
                  'Ad account audit (if you have one)',
                  'Custom campaign strategy & budget recommendation',
                  'No sales pressure — we show the numbers and let them speak',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check size={16} className="shrink-0 text-emerald-400 mt-0.5" />
                    <span className="text-sm text-white/70">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row gap-4 text-sm text-white/40">
                <a href="tel:+12699298541" className="flex items-center gap-2 hover:text-white/70 transition-colors">
                  <Phone size={14} /> (269) 929-8541
                </a>
                <a href="mailto:blake@stowstack.co" className="flex items-center gap-2 hover:text-white/70 transition-colors">
                  <Mail size={14} /> blake@stowstack.co
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="bg-white/[0.06] rounded-xl p-6 md:p-8 border border-white/10">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <Check size={28} className="text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">We got it.</h3>
                  <p className="text-white/50 text-sm">Expect a reply within 24 hours with your audit.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-lg font-semibold mb-1">Request Your Free Audit</h3>
                  <p className="text-xs text-white/40 mb-4">Takes 30 seconds. No spam, ever.</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-white/60 mb-1.5 block">Name *</label>
                      <input required type="text" placeholder="Blake Burkett"
                        className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-white/25 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-white/60 mb-1.5 block">Email *</label>
                      <input required type="email" placeholder="blake@facility.com"
                        className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-white/25 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1.5 block">Facility Name *</label>
                    <input required type="text" placeholder="Lakeside Self Storage"
                      className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-white/25 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-white/60 mb-1.5 block">Number of Facilities</label>
                      <select className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all appearance-none">
                        <option value="1">1</option>
                        <option value="2-5">2-5</option>
                        <option value="6-10">6-10</option>
                        <option value="11+">11+</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-white/60 mb-1.5 block">Current Occupancy</label>
                      <select className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all appearance-none">
                        <option value="">Select...</option>
                        <option value="below-60">Below 60%</option>
                        <option value="60-75">60-75%</option>
                        <option value="75-85">75-85%</option>
                        <option value="85-95">85-95%</option>
                        <option value="95+">95%+</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1.5 block">Anything else?</label>
                    <textarea rows={3} placeholder="Tell us about your biggest challenge..."
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-white/25 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all resize-none" />
                  </div>
                  <Button type="submit" size="lg" className="w-full rounded-full font-semibold h-11 text-base group bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 border-0">
                    Submit — It's Free
                    <ArrowRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                  <p className="text-[11px] text-white/25 text-center">No credit card. No obligation. Just insights.</p>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="py-12 md:py-16 border-t border-white/5" style={{ background: '#020617' }}>
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                <Building2 size={14} className="text-white" />
              </div>
              <span className="text-base font-bold tracking-tight font-['Space_Grotesk'] text-white">
                Stow<span className="text-emerald-400">Stack</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              The operator-built demand engine for self-storage. Occupancy growth. Revenue recovery. Full-funnel performance.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3 text-white">Company</h4>
            <div className="space-y-2">
              {['Why Us', 'Services', 'System', 'Pricing', 'FAQ'].map(l => (
                <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`} className="block text-sm text-slate-400 hover:text-white transition-colors">{l}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3 text-white">Resources</h4>
            <div className="space-y-2">
              {['Free Audit', 'Case Studies', 'Demand Engine Guide', 'Blog'].map(l => (
                <a key={l} href="#cta" className="block text-sm text-slate-400 hover:text-white transition-colors">{l}</a>
              ))}
              <a href="/portal" className="block text-sm text-slate-400 hover:text-white transition-colors">Client Login</a>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3 text-white">Contact</h4>
            <div className="space-y-2 text-sm text-slate-400">
              <a href="tel:+12699298541" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone size={13} /> (269) 929-8541
              </a>
              <a href="mailto:blake@stowstack.co" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail size={13} /> blake@stowstack.co
              </a>
              <a href="https://linkedin.com/in/mruhaul" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                <Linkedin size={13} /> LinkedIn
              </a>
              <a href="https://midwayselfstoragemi.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                <Globe size={13} /> Midway Self Storage
              </a>
            </div>
          </div>
        </div>
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">&copy; {new Date().getFullYear()} {BRAND}. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Serving operators across the US & Canada</span>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

function MobileCTABar() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const ctaSection = document.getElementById('cta')
      if (ctaSection) {
        const rect = ctaSection.getBoundingClientRect()
        setVisible(window.scrollY > 600 && rect.top > window.innerHeight)
      } else {
        setVisible(window.scrollY > 600)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-lg border-t px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
      <a href="#cta"
        className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/20">
        <Search size={14} /> Get Your Free Facility Audit <ArrowRight size={14} />
      </a>
    </div>
  )
}

function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 1200)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!show) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-20 md:bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur-sm text-white shadow-lg flex items-center justify-center hover:bg-slate-700 transition-all cursor-pointer"
      aria-label="Back to top"
    >
      <ChevronUp size={20} />
    </button>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  APP                                                     */
/* ═══════════════════════════════════════════════════════ */

type View = 'website' | 'admin' | 'portal' | 'privacy' | 'terms' | 'demo'

function pathToView(pathname: string): View {
  if (pathname === '/admin') return 'admin'
  if (pathname === '/portal') return 'portal'
  if (pathname === '/privacy') return 'privacy'
  if (pathname === '/terms') return 'terms'
  if (pathname === '/demo') return 'demo'
  return 'website'
}

export default function App() {
  const [view, setView] = useState<View>(() => pathToView(window.location.pathname))

  useEffect(() => {
    const onPop = () => setView(pathToView(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const goHome = () => { window.history.pushState({}, '', '/'); setView('website') }

  if (view === 'admin') return <AdminDashboard onBack={goHome} />
  if (view === 'portal') return <ClientPortal onBack={goHome} />
  if (view === 'privacy') return <PrivacyPolicy onBack={goHome} />
  if (view === 'terms') return <TermsOfService onBack={goHome} />
  if (view === 'demo') return <DemoDashboard onBack={goHome} />

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <AuditBanner />
      <Nav />
      <main>
        <Hero />
        <SocialProofStrip />
        <StatsBar />
        <LaunchTimeline />
        <ProblemSection />
        <ComparisonSection />
        <OccupancyEngine />
        <VacancyCostCalculator />
        <TeamSection />
        <WhyUsSection />
        <DemandTriggersSection />
        <CampaignArchSection />
        <ServicesSection />
        <IdealClientSection />
        <MarketingScorecard />
        <KPIDashboard />
        <PricingSection />
        <CaseStudyTeaser />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
      <MobileCTABar />
      <BackToTop />
    </div>
  )
}
