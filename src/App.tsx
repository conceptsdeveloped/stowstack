import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import AdminDashboard from '@/components/AdminDashboard'
import ClientPortal from '@/components/ClientPortal'
import { PrivacyPolicy, TermsOfService, DataDeletion } from '@/components/LegalPages'
import DemoDashboard from '@/components/DemoDashboard'
import GuidePage from '@/components/GuidePage'
import LandingPageView from '@/components/LandingPageView'
import BlogRouter from '@/components/blog/BlogRouter'
import SharedAuditView from '@/components/SharedAuditView'
import {
  ArrowRight, BarChart3, Target, TrendingUp, Zap, Clock,
  ChevronDown, ChevronUp, Menu, X, Phone, Mail, Check,
  Star, Building2, DollarSign, Megaphone, Layers,
  Truck, Home, Heart, Package, GraduationCap, Hammer, Boxes,
  Car, Calendar, Shield, Rocket, Search, Eye, RefreshCw,
  Code, BarChart2, Key, Calculator, ArrowUpRight,
  XCircle, CheckCircle2, Crosshair, Timer, Cpu,
  SlidersHorizontal, Sparkles,
  Linkedin, Globe, Play
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════ */
/*  DATA                                                    */
/* ═══════════════════════════════════════════════════════ */

const BRAND = 'StowStack'

const TEAM = [
  { name: 'Blake Burkett', role: 'CEO & Founder', avatar: 'BB', bio: 'Blake is an active self-storage operator with 7+ years in storage, U-Haul, and moving operations in Michigan. He runs his own portfolio of facilities. He got tired of paying agencies that could not tell him which ad produced which move-in, <em>so he built StowStack for his own facilities first.</em> After it worked, operators in his network started asking for it.', linkedin: 'https://linkedin.com/in/mruhaul' },
  { name: 'Angelo Vogley', role: 'Co-Founder & Chief Design Officer', avatar: 'AV', bio: 'Angelo leads all creative, design, and conversion optimization across StowStack. He can look at a landing page and tell you exactly what is costing you reservations. Every ad-specific landing page, every headline test, every layout decision goes through him. His job is making sure the pages we build convert at rates your default rental page never will.' },
  { name: 'Anna Almeida', role: 'Onboarding Specialist & Scrum Master', avatar: 'AA', bio: 'Anna is the reason clients say working with StowStack is easy. She owns your onboarding, keeps the team on schedule during campaign builds, and checks in long after launch. She answers fast, asks the right questions, and treats your facility like it is the only one on her list. Submit a facility audit and Anna will be the first person you hear from.' },
]

const STATS = [
  { value: '$41', label: 'Avg. cost per move-in', icon: DollarSign },
  { value: '8.7%', label: 'Landing page conversion rate', icon: TrendingUp },
  { value: '4-12x', label: 'Return on investment', icon: BarChart3 },
  { value: '7 days', label: 'Time to first move-in', icon: Clock },
]

const PROBLEMS = [
  { title: 'Every Ad Goes to the Same Page', desc: 'Your Google ads, Facebook ads, and retargeting all dump traffic onto your homepage or a generic storEDGE rental page. Someone searching "climate controlled storage" lands on the same page as someone clicking a "first month free" ad. Different intent, same dead-end experience.' },
  { title: 'Your Rental Flow Lives on Someone Else\'s Page', desc: 'When a customer decides to reserve, they get bounced to an off-brand system page that looks nothing like your facility. You lose trust. You lose conversions. You lose move-ins you already paid to attract.' },
  { title: 'You Cannot Tell What Is Working', desc: 'Which ad produced that move-in last Tuesday? Which campaign is actually driving revenue? Your agency does not know either. They are optimizing for clicks, not leases.' },
  { title: 'No Full-Funnel Attribution', desc: 'Your marketing reports show impressions, clicks, and cost-per-click. None of those numbers connect to a signed lease. You are paying for metrics that have nothing to do with move-ins.' },
  { title: 'No A/B Testing Based on Revenue', desc: 'Nobody is testing which headline, offer, or page layout produces more signed leases. Tests are measured against clicks, not reservations. The winner fills more ad accounts, not more units.' },
  { title: 'Generic Pages With No Conversion Optimization', desc: 'You are sending paid traffic to pages you do not control, with no embedded rental flow, no offer-specific messaging, and no tracking that ties back to the campaign that drove the visit.' },
]

const COMPARISON_ROWS = [
  { generic: 'Sends traffic to your homepage or default rental page', stow: 'Every ad gets its own landing page with its own headline, offer, and tracking' },
  { generic: 'Customer bounces to a generic off-brand rental page', stow: 'Embedded storEDGE rental flow — customer reserves without ever leaving your page' },
  { generic: 'Reports clicks, impressions, and CTR', stow: 'Reports cost per reservation, cost per move-in, and ROAS by creative' },
  { generic: 'Cannot tell you which ad produced which move-in', stow: 'Full-funnel attribution from ad impression to signed lease' },
  { generic: 'No landing page testing or conversion optimization', stow: 'A/B tests headlines, offers, and layouts based on actual revenue behavior' },
  { generic: 'No operator experience. Learning on your budget.', stow: 'Built by an active storage operator who tested this at his own facilities first' },
  { generic: 'SEO shops say wait 3-6 months for results', stow: 'Meta ads create demand in days. Google PPC captures existing search intent.' },
  { generic: 'One-size-fits-all marketing playbook', stow: 'Campaign-specific funnels matched to different intent, audiences, and offers' },
]

const SERVICES_FULL = [
  { icon: Megaphone, title: 'Meta & Google Ad Campaigns', desc: 'Meta ads create new demand by reaching people before they search. Google PPC captures existing search intent. Retargeting brings back visitors who left. We run all three channels.' },
  { icon: Layers, title: 'Ad-Specific Landing Pages', desc: 'Every campaign gets its own dedicated URL with its own headline, offer, tracking, and embedded rental flow. Different intent maps to different pages. That is how conversion rate goes up.' },
  { icon: Code, title: 'Embedded storEDGE Rental Flow', desc: 'The actual reservation and move-in functionality is embedded directly into each landing page we build. Your customer never leaves your branded page. storEDGE handles the transaction underneath.' },
  { icon: BarChart2, title: 'Full-Funnel Attribution', desc: 'Which ad generated the visit. Which page they saw. Which offer they responded to. Whether they reserved. Whether they moved in. Cost per reservation. Cost per move-in. By campaign, ad, and creative.' },
  { icon: Target, title: 'Revenue-Based A/B Testing', desc: 'We test headlines, offers, page layouts, and creative — then pick winners based on actual reservation and move-in behavior. The winner produces more signed leases, not more clicks.' },
  { icon: RefreshCw, title: 'Retargeting Campaigns', desc: 'Multi-window retargeting for website visitors who left without reserving. Sequential creative that brings them back to a specific landing page built to close the deal.' },
  { icon: Eye, title: 'Conversion Rate Optimization', desc: 'Ongoing testing and improvement of landing pages based on revenue behavior. Every page gets smarter over time as A/B testing data and attribution compound.' },
  { icon: Key, title: 'Operator-Grade Reporting', desc: 'Cost per reservation. Cost per move-in. Conversion rate by campaign, audience, keyword, and creative. ROAS by channel. Every number ties to whether units are getting filled.' },
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
  { icon: Megaphone, label: 'Demand Creation', desc: 'Meta ads reach people before they search. Google PPC captures existing intent. Retargeting brings back visitors who left. We create demand, capture it, and recapture it.' },
  { icon: Layers, label: 'Ad-Specific Landing Pages', desc: 'Every ad sends traffic to its own dedicated page with its own headline, offer, and tracking. Not your homepage. Not a generic rental page.' },
  { icon: Code, label: 'Embedded Rental Flow', desc: 'storEDGE reservation and move-in functionality embedded directly in each landing page. The customer stays on your branded page and reserves right there.' },
  { icon: BarChart2, label: 'Full Attribution', desc: 'Every move-in traces back to the specific ad that produced it. Cost per reservation. Cost per move-in. Conversion rate by campaign, ad, and creative.' },
  { icon: Target, label: 'A/B Testing on Revenue', desc: 'Test headlines, offers, and layouts. Winners are measured against actual reservation behavior, not clicks. The system gets smarter every month.' },
  { icon: TrendingUp, label: 'Compounding Returns', desc: 'As attribution data compounds, cost per move-in drops and conversion rate climbs. The ROI only gets better with time.' },
]

const IDEAL_CLIENTS = [
  { title: 'Independent Owner-Operators (1-10 Facilities)', desc: 'The overlooked backbone of the industry. You do not want another SaaS login or another agency that does not understand storage. You want units filled.' },
  { title: 'Operators With Vacancy Pain', desc: 'Specific unit types sitting empty. Seasonal dips hitting harder than expected. You need demand creation and campaign-specific funnels, not another broad awareness campaign.' },
  { title: 'Operators Without Full-Funnel Attribution', desc: 'Your agency reports clicks and impressions but cannot tell you which ad produced which move-in. You want every dollar traced to a result.' },
  { title: 'Operators With Weak Digital Presence', desc: 'Your website is a default template. Your rental flow lives on someone else\'s page. You need a branded conversion layer with embedded reservation functionality.' },
  { title: 'Operators Who Have Been Burned by Agencies', desc: 'You paid for marketing that could not define move-in economics. You want a team that operates storage facilities and built this system for their own portfolio first.' },
]

const KPI_METRICS = [
  { label: 'Total Move-Ins', value: '34', change: '+26%' },
  { label: 'Cost Per Move-In', value: '$41', change: '-18%' },
  { label: 'Reservations', value: '47', change: '+31%' },
  { label: 'Landing Page Conv. Rate', value: '8.7%', change: '+3.2%' },
  { label: 'Return on Ad Spend', value: '6.4x', change: '+1.8x' },
  { label: 'Occupancy Change', value: '+13%', change: 'this quarter' },
]

const PRICING_TIERS = [
  {
    name: 'Launch', price: '$750', period: '/mo per facility', popular: false,
    desc: 'For operators ready to start filling units with paid ads and ad-specific landing pages.',
    features: [
      'Meta ad campaigns (Facebook + Instagram)',
      '2 ad-specific landing pages with embedded storEDGE rental flow',
      'Static creative and ad copy',
      'Per-campaign tracking and attribution',
      'Monthly performance report with cost-per-move-in data',
      'Campaigns live in days, not weeks',
    ],
  },
  {
    name: 'Growth', price: '$1,500', period: '/mo per facility', popular: true,
    desc: 'The full system. Meta + Google + retargeting + 5 landing pages + A/B testing + full attribution dashboard.',
    features: [
      'Everything in Launch',
      'Google PPC campaigns (search + display)',
      '5 ad-specific landing pages with embedded storEDGE rental flow',
      'Retargeting campaigns for abandoned visitors',
      'A/B testing on creative and landing pages',
      'Video creative production',
      'Full attribution dashboard — cost per reservation, cost per move-in, ROAS by creative',
      'Bi-weekly optimization calls',
    ],
  },
  {
    name: 'Portfolio', price: 'Custom', period: '5+ facilities', popular: false,
    desc: 'Everything in Growth, scaled across your portfolio with centralized management and volume pricing.',
    features: [
      'Everything in Growth per facility',
      'Unlimited landing pages across all facilities',
      'Cross-facility budget allocation and optimization',
      'Portfolio-level attribution and reporting',
      'Dedicated strategist',
      'Volume discount: 20-35% off per-facility rates',
      'Weekly strategy calls',
      'Quarterly business review',
    ],
  },
]

const TESTIMONIALS = [
  { name: 'Mark D.', role: 'Owner, 3 Locations, Michigan', text: 'Went from 71% to 84% occupancy in one quarter. For the first time I can see exactly which ad produced which move-in. 34 move-ins at $41 each. The attribution alone changed how I think about marketing.', metric: '+13% occ.' },
  { name: 'Lisa R.', role: 'Operator, Single Site, Ohio', text: 'The ad-specific landing pages converted at 8.7% versus my old homepage at 2.1%. Same traffic, completely different results. The embedded rental flow means customers reserve without ever leaving my branded page.', metric: '8.7% conv.' },
  { name: 'Jeff T.', role: 'Regional Manager, 6 Locations, Indiana', text: 'I can finally see which campaigns produce revenue and which ones waste money. The per-facility attribution and A/B testing on landing pages changed everything. Cost per move-in drops every month.', metric: '6.4x ROAS' },
]

const FAQS = [
  { q: 'How is this different from hiring a regular marketing agency?', a: 'Most agencies run your ads and send traffic to a page they do not control, to a rental flow they did not build, and report metrics that have nothing to do with move-ins. StowStack controls the ad, the page, the rental flow, and the attribution. It is a closed loop. Every dollar traces to a result. And the founder operates storage facilities — this was built for his own portfolio first.' },
  { q: 'What are ad-specific landing pages?', a: 'Every ad campaign gets its own dedicated URL with its own headline, offer, tracking, and embedded storEDGE rental flow. A Google ad for "climate controlled storage in Paw Paw" goes to stowstacksite.com/climate-pawpaw-a. A Facebook ad for "first month free 10x10" goes to stowstacksite.com/10x10-offer-b. Different intent. Different pages. Different offers. That is how conversion rate compounds.' },
  { q: 'How does the embedded storEDGE rental flow work?', a: 'The actual storEDGE reservation and move-in functionality is embedded directly into each landing page we build. Your customer stays on your branded page the entire time — your facility name, your colors, your offer. storEDGE handles real-time unit availability, reservation processing, and payment underneath. The customer never bounces to a generic off-brand page.' },
  { q: 'How fast will I see results?', a: 'Most operators see leads within the first week of campaign launch. Move-ins typically start within 2-3 weeks. This is not SEO — you are not waiting 6 months to find out if it works. An operator at 78% occupancy heading into summer cannot wait. StowStack creates demand immediately through Meta ads.' },
  { q: 'What do you actually report on?', a: 'Which ad generated the visit. Which landing page they saw. Which offer they responded to. Whether they reserved. Whether they completed move-in. Cost per reservation. Cost per move-in. Conversion rate by campaign, ad, audience, keyword, and creative. ROAS by creative. Not clicks. Not impressions. Revenue.' },
  { q: 'Do I need to change my PMS or rental software?', a: 'No. StowStack sits on top of storEDGE. Your current systems stay the same. We embed the storEDGE rental flow into the landing pages we build — nothing changes on your end operationally. If you use a different PMS, reach out and we can discuss whether your system supports the kind of embedding we need.' },
  { q: 'What is the minimum ad spend?', a: 'We recommend at least $1,000/mo in ad spend for a single facility, paid directly to Meta and Google — separate from StowStack fees. More spend means more data, faster optimization, and more move-ins.' },
  { q: 'Do you require long-term contracts?', a: 'No. Month-to-month on the Demand Engine. The only commitment structure is the optional 6-month bundle discount on website builds — commit to 6 months of Growth and the site build drops from $5,000 to $2,500. Operators who stay 6+ months see their cost per move-in drop significantly as A/B testing and attribution data compounds.' },
]

const WHY_US = [
  { icon: Building2, title: 'Full Funnel Ownership', desc: 'The only company that controls the complete path from ad impression to signed lease. We create the demand, catch the click on a custom page, convert through embedded rental flow, and attribute the move-in back to the specific ad.' },
  { icon: Target, title: 'The Channel Nobody Else Owns', desc: 'Meta ads are our primary channel. SEO shops do not touch paid media. Google-only platforms treat social as an afterthought. Nobody else in self-storage is building a system around Meta ad expertise.' },
  { icon: DollarSign, title: 'Attribution That Connects to Revenue', desc: 'Cost per reservation. Cost per move-in. Conversion rate by campaign, ad, and creative. Every number ties to whether units are getting filled and what it cost to fill them.' },
  { icon: Key, title: 'Operator-Built, Operator-Run', desc: 'The founder runs storage facilities. Not a marketing company that decided to specialize in storage. An operator who got tired of paying for reports full of clicks and no move-ins.' },
  { icon: Timer, title: 'Results in Days, Not Months', desc: 'SEO shops tell you to wait 6 months. We create demand in the first week. An operator at 78% occupancy heading into summer cannot wait. StowStack is the emergency room, not the annual physical.' },
  { icon: Crosshair, title: 'Integration + Execution Moat', desc: 'We understand storage operations, reservation flow, and move-in economics. We connect traffic source to actual move-in behavior. That combination is harder to replace than any single service.' },
]

const CAMPAIGN_ARCH = [
  {
    icon: Layers, title: 'Ad-Specific Landing Pages',
    items: ['Dedicated URL for every campaign with its own headline and offer', 'Embedded storEDGE reservation flow on each page', 'Per-page tracking tied to the ad that drove the visit', 'Conversion data by page, campaign, and creative'],
  },
  {
    icon: Target, title: 'Multi-Channel Demand',
    items: ['Meta ads create new demand before people search', 'Google PPC captures existing search intent', 'Display retargeting recaptures abandoned visitors', 'Campaign-specific funnels matched to different audiences'],
  },
  {
    icon: RefreshCw, title: 'Attribution + Optimization',
    items: ['Full path tracking from ad impression to signed lease', 'Cost per reservation and cost per move-in by campaign', 'A/B testing measured against actual revenue behavior', 'Compounding performance as data matures over time'],
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
        <span className="font-medium">Free Facility Audit — See Where You Are Losing Move-Ins</span>
        <span className="hidden sm:inline text-white/80">No contracts. No commitment. Real answers.</span>
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
          <a href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Blog
          </a>
          <a href="/guide" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Guide
          </a>
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
            <a href="/blog" onClick={() => setMobileOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">
              Blog
            </a>
            <a href="/guide" onClick={() => setMobileOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">
              Guide
            </a>
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
              <Rocket size={14} /> Built by an operator. Tested at my own facilities first.
            </div>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] mb-6 text-white">
              Every ad has its own page.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Every move-in traces back to the ad that produced it.</span>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto mb-8">
              StowStack is a full-funnel acquisition and conversion system for self-storage. We build ad-specific
              landing pages with embedded online reservation and move-in functionality. We track exactly which ads
              produce reservations and move-ins, run A/B tests, and optimize based on actual revenue outcomes.
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
                  See How the System Works
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
              <Play size={14} /> See a live attribution dashboard with sample data
            </a>
          </Reveal>

          <Reveal delay={400}>
            <p className="text-sm text-slate-400 mb-10">Not an agency. Not a SaaS dashboard. A closed-loop system that fills units and proves it.</p>
          </Reveal>

          {/* Credibility pills */}
          <Reveal delay={500}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-4xl mx-auto">
              {[
                { icon: Building2, text: 'Operator-Founded' },
                { icon: Layers, text: 'storEDGE Integrated' },
                { icon: Target, text: 'Full-Funnel Attribution' },
                { icon: Key, text: 'Revenue-Based A/B Testing' },
                { icon: DollarSign, text: 'Ad-Specific Landing Pages' },
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
            { icon: Building2, text: 'Full Funnel Ownership' },
            { icon: Layers, text: 'Embedded Rental Flow' },
            { icon: Target, text: 'Ad-to-Move-In Attribution' },
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
    { day: 'Day 1', title: 'Facility Audit', desc: 'We map your vacancy gaps, current digital presence, competitive landscape, and conversion bottlenecks. You walk away with a clear picture of where the leaky bucket is.', icon: Search },
    { day: 'Day 1-2', title: 'Landing Pages Built', desc: 'We build ad-specific landing pages for each campaign — each with its own headline, offer, tracking, and embedded storEDGE rental flow.', icon: Layers },
    { day: 'Day 2-3', title: 'Campaigns Launched', desc: 'Meta and Google campaigns go live, each driving traffic to its own dedicated landing page. Full attribution tracking from the first click.', icon: Megaphone },
    { day: 'Week 1+', title: 'Move-Ins Start', desc: 'Reservations flow through the embedded rental process. You see exactly which ad produced which move-in. We kill what does not work and scale what does.', icon: Rocket },
  ]

  return (
    <section className="py-16 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%)] bg-[length:20px_20px] opacity-20" />
      <div className="relative max-w-6xl mx-auto px-5">
        <Reveal>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white">From Audit to Live Campaigns in Days, Not Months</h2>
            <p className="mt-3 text-white/80 text-lg">SEO shops tell you to wait 6 months. Google-only platforms send clicks to generic pages. We build your landing pages, launch your campaigns, and start attributing move-ins in the first week.</p>
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
              You Are Spending Money on Ads. You Have No Idea Which Ones Are Filling Units.
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Your agency sends you a report full of impressions and click-through rates. None of those numbers connect to a signed lease. Here is what is actually happening.
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
              Most marketing sends all your traffic to the same page, reports vanity metrics, and cannot tell you which ad produced a move-in. StowStack controls the entire path from ad to lease.
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
              See the Real Cost of Empty Units — and the Math Behind StowStack
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
              Not a Tech Company Selling to Operators. An Operator Who Built the System.
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Meet the Team Behind {BRAND}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              An active storage operator, a conversion-focused designer, and an onboarding specialist who treats your facility like the only one on her list.
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
                StowStack was built because we got tired of paying for marketing that could not tell us which ad produced which
                move-in. So we built the system ourselves — ad-specific landing pages with embedded rental flow, full-funnel
                attribution, and A/B testing based on revenue outcomes. We tested it at our own facilities first. It worked.
              </p>
              <p>
                Then operators in our network started asking how we were filling units so fast. StowStack became a product.
                Every decision, feature, and piece of messaging traces back to one core principle: we own the full path from
                ad impression to signed lease, and we can prove it.
              </p>
              <p className="text-white font-medium">
                That is the difference between a marketing vendor and a team that operates storage facilities and built the
                acquisition system to fill them. We are the second one.
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
              What Makes {BRAND} Different
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              The Only Company That Owns the Full Path From Ad to Lease
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Most agencies run your ads and hope for the best. They send traffic to a page they do not control, to a rental flow they did not build, and report metrics that have nothing to do with move-ins.
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
              Meta Ads Create Demand. Google Captures It. SEO Waits for It.
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              We target life events that create storage need — reaching people before they search. Each demand trigger
              maps to its own ad campaign and its own landing page with a specific offer.
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
              <Cpu size={14} /> The Core Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              A Closed-Loop System With Four Layers
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Each layer feeds the next. Demand creation flows to ad-specific landing pages, which flow to embedded rental, which flows to attribution. Full visibility at every step.
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
            <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">What You Get</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Every piece of the system, working together
            </h2>
            <p className="text-muted-foreground text-lg">
              The ad, the page, the rental flow, the attribution. All connected. All optimized for move-ins.
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
              The Full-Funnel System
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">From Ad Impression to Signed Lease. One System. Full Visibility.</h2>
            <p className="mt-4 text-lg text-slate-400">
              Four layers that feed each other. Together they form a complete path from ad click to move-in — with full attribution at every step.
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
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Who StowStack Is Built For</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Independent self-storage operators (1-20 facilities) who want units filled. Not another SaaS login. Not another agency that does not understand the business. A system that proves which ads produce revenue.
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
              You Will Know Exactly Which Ad Produced Which Move-In
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Cost per reservation. Cost per move-in. Conversion rate by campaign, ad, and creative. Not clicks. Not impressions. Revenue.
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
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Before You Look at the Price, Look at the Math</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A single move-in is worth $100-150/mo in recurring revenue. At a 12-month average stay, that is $1,200-1,800 in lifetime value. Now look at the price.
            </p>
          </div>
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl px-6 py-4 text-center">
              <p className="text-sm text-amber-800">
                <strong>The math is simple:</strong> If StowStack produces 5-10 incremental move-ins per month, you are generating
                $6,000-18,000 in annualized revenue from a $1,500/mo investment. That is a 4-12x return before the system even starts optimizing.
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
          Ad spend is paid directly to Meta and Google (not to us). Recommended minimum: $1,000/mo. Month-to-month. Optional 6-month bundle discount on website builds.
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
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Results</span>
                <h3 className="text-xl font-bold mt-2 mb-3">From 71% to 84% Occupancy in One Quarter</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  A 247-unit facility with no paid ads and a default storEDGE rental page. {BRAND} launched Meta campaigns with
                  3 ad-specific landing pages targeting climate-controlled, vehicle storage, and first-month-free audiences.
                  Each page had embedded storEDGE rental flow and per-campaign attribution.
                </p>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-2xl font-bold">34</p>
                    <p className="text-xs text-muted-foreground">Move-Ins (90 days)</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">$41</p>
                    <p className="text-xs text-muted-foreground">Cost per Move-In</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">35x</p>
                    <p className="text-xs text-muted-foreground">Annualized ROAS</p>
                  </div>
                </div>
                <a href="#cta" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                  See what this system looks like for your facility <ArrowUpRight size={16} />
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
            <p className="text-sm text-muted-foreground">What operators see when every ad has its own page and every move-in traces back to the campaign that produced it.</p>
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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState({
    name: '', email: '', phone: '', facilityName: '', location: '',
    occupancyRange: '', totalUnits: '', biggestIssue: '', notes: '',
  })

  const set = (key: string, val: string) => setFields(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/audit-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')

      setSubmitted(true)

      // Fire facility lookup in background — saves Google Places data to DB
      const facilityId = data.facilityId || null
      fetch('/api/facility-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityName: fields.facilityName,
          location: fields.location,
          facilityId,
        }),
      }).catch(() => {}) // background — don't block or surface errors to user

    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = "w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-white/25 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
  const selectClass = "w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all appearance-none"

  return (
    <section id="cta" className="py-20 md:py-28 text-white" style={{ background: '#020617' }}>
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <Reveal>
            <div>
              <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">Get Started</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5">
                Your ads are going to the wrong page. Let's fix that.
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Get a free facility audit. We will look at your current digital presence, landing pages, rental flow, and competitive landscape — then show you exactly where the leaky bucket is.
              </p>
              <div className="space-y-3">
                {[
                  'Your current website and landing pages — converting or just existing?',
                  'Your rental flow — is the customer experience costing you reservations?',
                  'Your competitive landscape — who is outranking you in your market?',
                  'No contracts. No commitment. Operator to operator.',
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
                      <input required type="text" placeholder="Blake Burkett" value={fields.name}
                        onChange={e => set('name', e.target.value)}
                        className={inputClass} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-white/60 mb-1.5 block">Email *</label>
                      <input required type="email" placeholder="blake@facility.com" value={fields.email}
                        onChange={e => set('email', e.target.value)}
                        className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1.5 block">Phone *</label>
                    <input required type="tel" placeholder="(555) 555-5555" value={fields.phone}
                      onChange={e => set('phone', e.target.value)}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1.5 block">Facility Name *</label>
                    <input required type="text" placeholder="Lakeside Self Storage" value={fields.facilityName}
                      onChange={e => set('facilityName', e.target.value)}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1.5 block">Location (City, State) *</label>
                    <input required type="text" placeholder="Austin, TX" value={fields.location}
                      onChange={e => set('location', e.target.value)}
                      className={inputClass} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-white/60 mb-1.5 block">Current Occupancy *</label>
                      <select required value={fields.occupancyRange} onChange={e => set('occupancyRange', e.target.value)} className={selectClass}>
                        <option value="">Select...</option>
                        <option value="below-60">Below 60%</option>
                        <option value="60-75">60–75%</option>
                        <option value="75-85">75–85%</option>
                        <option value="85-95">85–95%</option>
                        <option value="above-95">Above 95%</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-white/60 mb-1.5 block">Total Units *</label>
                      <select required value={fields.totalUnits} onChange={e => set('totalUnits', e.target.value)} className={selectClass}>
                        <option value="">Select...</option>
                        <option value="under-100">Under 100</option>
                        <option value="100-300">100–300</option>
                        <option value="300-500">300–500</option>
                        <option value="500+">500+</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1.5 block">Biggest Challenge *</label>
                    <select required value={fields.biggestIssue} onChange={e => set('biggestIssue', e.target.value)} className={selectClass}>
                      <option value="">Select...</option>
                      <option value="low-occupancy">Low occupancy</option>
                      <option value="lease-up">Lease-up / new facility</option>
                      <option value="standard-units">Filling standard units</option>
                      <option value="climate-controlled">Filling climate-controlled units</option>
                      <option value="drive-up">Filling drive-up units</option>
                      <option value="vehicle-rv-boat">Vehicle / RV / boat storage</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1.5 block">Anything else?</label>
                    <textarea rows={3} placeholder="Tell us about your biggest challenge..."
                      value={fields.notes} onChange={e => set('notes', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-white/25 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all resize-none" />
                  </div>
                  {error && <p className="text-red-400 text-xs">{error}</p>}
                  <Button type="submit" disabled={submitting} size="lg" className="w-full rounded-full font-semibold h-11 text-base group bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 border-0 disabled:opacity-60">
                    {submitting ? 'Submitting...' : 'Submit — It\'s Free'}
                    {!submitting && <ArrowRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />}
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
              Full-funnel acquisition and conversion for self-storage. Ad-specific landing pages. Embedded rental flow. Every move-in traced to the ad that produced it.
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
              {['Free Audit', 'Case Studies', 'How It Works'].map(l => (
                <a key={l} href="#cta" className="block text-sm text-slate-400 hover:text-white transition-colors">{l}</a>
              ))}
              <a href="/blog" className="block text-sm text-slate-400 hover:text-white transition-colors">Blog</a>
              <a href="/guide" className="block text-sm text-slate-400 hover:text-white transition-colors">Platform Guide</a>
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

type View = 'website' | 'admin' | 'portal' | 'privacy' | 'terms' | 'data-deletion' | 'demo' | 'guide' | 'landing-page' | 'blog' | 'shared-audit'

function pathToView(pathname: string): View {
  if (pathname === '/admin') return 'admin'
  if (pathname === '/portal') return 'portal'
  if (pathname === '/privacy') return 'privacy'
  if (pathname === '/terms') return 'terms'
  if (pathname === '/data-deletion') return 'data-deletion'
  if (pathname === '/demo') return 'demo'
  if (pathname === '/guide') return 'guide'
  if (pathname.startsWith('/lp/')) return 'landing-page'
  if (pathname.startsWith('/audit/')) return 'shared-audit'
  if (pathname.startsWith('/blog')) return 'blog'
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
  if (view === 'data-deletion') return <DataDeletion onBack={goHome} />
  if (view === 'demo') return <DemoDashboard onBack={goHome} />
  if (view === 'guide') return <GuidePage onBack={goHome} />
  if (view === 'landing-page') return <LandingPageView slug={window.location.pathname.replace('/lp/', '')} />
  if (view === 'shared-audit') return <SharedAuditView slug={window.location.pathname.replace('/audit/', '')} />
  if (view === 'blog') return <BlogRouter onBack={goHome} />

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
