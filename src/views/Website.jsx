import { useState, useEffect, useRef } from 'react'
import {
  ArrowRight, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Target, BarChart3, Phone, Users, TrendingUp, Zap, Shield,
  Building2, Truck, Home, Heart, Package, GraduationCap,
  Hammer, Boxes, Car, Calendar, Star, ArrowUpRight,
  MessageSquare, MousePointerClick, PhoneCall,
  UserCheck, Key, Megaphone, Search,
  Eye, RefreshCw, FileText, Headphones, BarChart2, Mail,
  Clock, Rocket, DollarSign, Calculator, ExternalLink,
  Linkedin, Globe, Timer, CircleDot, Play, AlertTriangle,
  X, Check, Crosshair, BookOpen, Layers, Code, PieChart,
  Activity, Gauge, SlidersHorizontal, Cpu, Sparkles
} from 'lucide-react'
import ScrollReveal from '../components/ScrollReveal'
import CTA from '../components/sections/CTA'

const BRAND = 'StowStack'
const PRIMARY_CTA = 'Get Your Free Facility Audit'
const SECONDARY_CTA = 'See the Occupancy Engine'
const CTA_HREF = '#cta'

/* ─────────────── TEAM DATA ─────────────── */
const TEAM = {
  blake: { name: 'Blake Burkett', role: 'CEO / Founder / Storage Operator', short: 'Blake' },
  marcus: { name: 'Marcus Dellatore', role: 'Head of Media Buying', short: 'Marcus' },
  rachel: { name: 'Rachel Kim', role: 'Account Director', short: 'Rachel' },
  angelo: { name: 'Angelo Vitale', role: 'Senior Designer', short: 'Angelo' },
  tyler: { name: 'Tyler Brooks', role: 'Creative Strategist', short: 'Tyler' },
  priya: { name: 'Priya Sharma', role: 'Analytics Lead', short: 'Priya' },
}

/* ─────────────── SAME-DAY AUDIT BANNER ─────────────── */
function AuditBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] gradient-brand">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3 text-white text-sm">
        <Zap size={14} className="shrink-0 animate-float" />
        <span className="font-medium">Same-Day Facility Audits Available</span>
        <span className="hidden sm:inline text-white/80">Book before 2PM and get your audit today.</span>
        <a href={CTA_HREF} className="shrink-0 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold transition-all">
          Book Now
        </a>
        <button onClick={() => setDismissed(true)} className="shrink-0 text-white/60 hover:text-white cursor-pointer ml-1">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────── NAV ─────────────────────────── */
function NavBar({ hasBanner }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`fixed left-0 right-0 z-50 transition-all duration-300 ${hasBanner ? 'top-[42px]' : 'top-0'} ${
      scrolled ? 'bg-white/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 border-b border-slate-200/50' : 'bg-white/70 backdrop-blur-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-brand rounded-lg flex items-center justify-center shadow-md shadow-brand-600/20">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900">{BRAND}</span>
              <span className="hidden sm:inline text-[10px] text-slate-400 ml-1.5 font-medium tracking-wider uppercase">Self-Storage Ad Engine</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#problem" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Why Us</a>
            <a href="#services" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Services</a>
            <a href="#engine" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">System</a>
            <a href="#pricing" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#faq" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">FAQ</a>
            <a href={CTA_HREF} className="inline-flex items-center gap-2 gradient-brand text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-brand-600/20">
              <Search size={14} /> {PRIMARY_CTA}
            </a>
          </div>
          <button onClick={() => setOpen(!open)} className="md:hidden text-slate-600 cursor-pointer">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
        {open && (
          <div className="md:hidden pb-4 flex flex-col gap-3 animate-slide-down">
            <a href="#problem" onClick={() => setOpen(false)} className="text-sm text-slate-600 py-2">Why Us</a>
            <a href="#services" onClick={() => setOpen(false)} className="text-sm text-slate-600 py-2">Services</a>
            <a href="#engine" onClick={() => setOpen(false)} className="text-sm text-slate-600 py-2">System</a>
            <a href="#pricing" onClick={() => setOpen(false)} className="text-sm text-slate-600 py-2">Pricing</a>
            <a href="#faq" onClick={() => setOpen(false)} className="text-sm text-slate-600 py-2">FAQ</a>
            <a href={CTA_HREF} onClick={() => setOpen(false)} className="inline-flex items-center justify-center gap-2 gradient-brand text-white px-5 py-2.5 rounded-lg text-sm font-semibold">
              <Search size={14} /> {PRIMARY_CTA}
            </a>
          </div>
        )}
      </div>
    </nav>
  )
}

/* ─────────────────────────── HERO ─────────────────────────── */
function Hero({ hasBanner }) {
  return (
    <section className={`${hasBanner ? 'pt-36' : 'pt-24'} pb-16 sm:pb-24 gradient-hero relative overflow-hidden`}>
      <div className="absolute inset-0 gradient-mesh opacity-40" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-500/20 text-brand-300 px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-brand-500/30 animate-fade-up">
            <Rocket size={14} /> Campaigns Live in 48 to 72 Hours
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight animate-fade-up" style={{ animationDelay: '100ms' }}>
            Fill Vacant Units With
            <span className="bg-gradient-to-r from-brand-400 to-emerald-300 bg-clip-text text-transparent"> Meta Ads </span>
            Engineered by Storage Operators
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed animate-fade-up" style={{ animationDelay: '200ms' }}>
            We built this ad engine for our own self-storage portfolio. After it cut vacancy rates and drove
            qualified move-ins across our facilities, we opened it to operators in our network.
            Now our team launches full-funnel Meta campaigns with pixel tracking, retargeting, Lookalike audiences, and
            conversion-optimized creative in 48 to 72 hours.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: '300ms' }}>
            <a href={CTA_HREF} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 gradient-brand text-white px-8 py-4 rounded-xl text-base font-semibold hover:opacity-90 transition-all shadow-lg shadow-brand-600/25 animate-pulse-glow">
              <Search size={18} /> {PRIMARY_CTA}
            </a>
            <a href="#engine" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 glass-dark text-slate-300 px-8 py-4 rounded-xl text-base font-semibold hover:bg-white/10 transition-all">
              {SECONDARY_CTA}
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-500 animate-fade-up" style={{ animationDelay: '400ms' }}>No contracts. No setup fees. No learning-your-industry phase. We already operate in it.</p>
        </div>

        {/* Credibility Strip */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-5 gap-3 max-w-4xl mx-auto stagger-children">
          {[
            { icon: Building2, text: 'Self-Storage Only' },
            { icon: Key, text: 'Operator-Built' },
            { icon: Target, text: 'Move-In Focused' },
            { icon: Timer, text: '48-72hr Launch' },
            { icon: DollarSign, text: 'Revenue Recovery' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center justify-center gap-2 glass-dark rounded-lg px-3 py-2.5 animate-fade-up">
              <Icon size={16} className="text-brand-400 shrink-0" />
              <span className="text-xs font-medium text-slate-300">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────── SOCIAL PROOF STRIP ─────────────────── */
function SocialProofStrip() {
  return (
    <section className="py-6 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-brand-500" />
            <span><strong className="text-slate-800">Self-Storage Exclusive</strong></span>
          </div>
          <div className="hidden sm:block w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <Users size={16} className="text-brand-500" />
            <span><strong className="text-slate-800">Operator-Run Team</strong></span>
          </div>
          <div className="hidden sm:block w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <Rocket size={16} className="text-brand-500" />
            <span><strong className="text-slate-800">48hr Launch</strong></span>
          </div>
          <div className="hidden sm:block w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-brand-500" />
            <span><strong className="text-slate-800">No Contracts</strong></span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── LAUNCH TIMELINE ─────────────────────────── */
function LaunchTimeline() {
  return (
    <section className="py-16 gradient-brand relative overflow-hidden">
      <div className="absolute inset-0 animate-shimmer" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white">From Audit Call to Live Ads in 48 to 72 Hours</h2>
            <p className="mt-3 text-white/80 text-lg">Most agencies burn 2 to 4 weeks on onboarding. We launch in days because we already know the industry cold.</p>
          </div>
        </ScrollReveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          {[
            { day: 'Day 1', title: 'Facility Audit Call', desc: 'Blake and the team map your vacancy gaps, unit mix, market comps, and conversion bottlenecks. You walk away with a full-funnel diagnostic, free of charge.', icon: Search },
            { day: 'Day 1-2', title: 'Market & Funnel Audit', desc: 'Our analytics team audits your website conversion rate, Google Business Profile, competitor ad presence, reviews, and call-to-move-in ratio. We find where the funnel leaks.', icon: Eye },
            { day: 'Day 2-3', title: 'Campaign Build', desc: 'Marcus and the media buying team build your campaign architecture: CBO structure, Lookalike and Custom Audiences, dynamic creative, lead forms, and retargeting sequences.', icon: Megaphone },
            { day: 'Day 3', title: 'Ads Go Live', desc: 'Campaigns launch across Facebook and Instagram with full Meta Pixel + Conversions API tracking. Qualified leads start flowing within hours of launch.', icon: Rocket },
          ].map((s) => (
            <ScrollReveal key={s.title}>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5 card-hover h-full">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <s.icon size={16} className="text-white" />
                  </div>
                  <span className="text-xs font-bold text-white/70 uppercase tracking-wider">{s.day}</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-1">{s.title}</h3>
                <p className="text-sm text-white/80 leading-relaxed">{s.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── PROBLEM SECTION ─────────────────────────── */
function ProblemSection() {
  const problems = [
    { icon: XCircle, title: 'Vacant Units Hemorrhaging MRR', desc: 'Every empty 10x10 at $120/mo is $1,440/year in lost Monthly Recurring Revenue. Multiply that across a row of units and you are bleeding five figures annually while your agency reports "impressions."' },
    { icon: XCircle, title: 'Your Agency Cannot Define Occupancy Velocity', desc: 'They run ads for dentists, HVAC, and restaurants on the same playbook. They do not understand lease-up curves, revenue per available unit (RevPAU), or how unit-mix strategy affects yield.' },
    { icon: XCircle, title: 'Speed-to-Lead Is Nonexistent', desc: 'Industry data shows leads contacted within 5 minutes convert at 8x the rate of leads contacted after 30. Your agency never mentions this because they do not track past the click.' },
    { icon: XCircle, title: 'Promos Driving Unqualified Traffic', desc: 'High CPM, low conversion rate, inflated CTR on broad audiences. Your agency celebrates "engagement" while your front desk wastes hours on tire-kickers who never sign a lease.' },
    { icon: XCircle, title: 'No Pixel. No CAPI. No Retargeting.', desc: 'Without Meta Pixel and Conversions API installed, your campaigns have zero feedback loop. No Custom Audiences, no Lookalike targeting, no retargeting. You are running blind and paying for it.' },
    { icon: XCircle, title: 'Stale Unit Mix With Zero Demand Segmentation', desc: 'Climate-controlled 5x10s need different creative than outdoor parking or drive-up 10x20s. Your agency runs one generic ad set because they do not understand unit-type economics.' },
  ]

  return (
    <section id="problem" className="py-20 bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-20" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Why Operators Fire Their Agency and Call Us
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              You are paying for marketing that cannot define RevPAU, does not know what a move-in funnel looks like, and has never set foot in a storage facility. Here is what that costs you.
            </p>
          </div>
        </ScrollReveal>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {problems.map((p) => (
            <ScrollReveal key={p.title}>
              <div className="glass-dark rounded-xl p-6 card-hover h-full">
                <p.icon size={24} className="text-red-400 mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">{p.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{p.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────── GENERIC VS STOWSTACK ─────────────────── */
function ComparisonSection() {
  const rows = [
    { generic: 'Reports CPM and CTR, vanity metrics only', stow: 'Reports CPL, cost-per-move-in, and occupancy velocity' },
    { generic: 'Cannot explain unit-mix strategy or RevPAU', stow: 'Segments campaigns by unit type, pricing tier, and demand trigger' },
    { generic: 'Ignores everything past the ad click', stow: 'Audits full funnel: ad to landing page to call to follow-up to move-in' },
    { generic: 'Treats storage like another local-service client', stow: 'Built by operators who run our own storage portfolio' },
    { generic: 'Generic audiences with no pixel data', stow: 'Custom Audiences, Lookalikes, and retargeting powered by Pixel + CAPI' },
    { generic: '2 to 4 week onboarding with "strategy decks"', stow: 'Campaigns live in 48 to 72 hours. No decks. Just results.' },
    { generic: 'One ad set, one audience, set it and forget it', stow: 'CBO structures with dynamic creative testing across multiple ad sets' },
    { generic: 'No operator experience. Learning on your budget.', stow: 'Team with 7+ years in storage ops, U-Haul, and moving services' },
  ]

  return (
    <section className="py-20 bg-white relative">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-white" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Generic Agency vs. {BRAND}
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              This is not a branding debate. It is a fundamental difference in campaign architecture, audience strategy, and what gets measured.
            </p>
          </div>
        </ScrollReveal>
        <div className="max-w-4xl mx-auto">
          <div className="hidden sm:grid grid-cols-2 gap-4 mb-4 px-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                <X size={14} className="text-red-500" />
              </div>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Generic Agency</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center">
                <Check size={14} className="text-brand-600" />
              </div>
              <span className="text-sm font-bold text-brand-600 uppercase tracking-wider">{BRAND}</span>
            </div>
          </div>
          <div className="space-y-2 sm:space-y-2 stagger-children">
            {rows.map((row, i) => (
              <ScrollReveal key={i}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div className="bg-red-50/80 border border-red-100 rounded-xl px-4 sm:px-5 py-3 sm:py-4 backdrop-blur-sm">
                    <span className="sm:hidden text-[10px] font-bold text-red-400 uppercase tracking-wider">Generic Agency</span>
                    <p className="text-sm text-red-700">{row.generic}</p>
                  </div>
                  <div className="bg-brand-50/80 border border-brand-200 rounded-xl px-4 sm:px-5 py-3 sm:py-4 backdrop-blur-sm">
                    <span className="sm:hidden text-[10px] font-bold text-brand-500 uppercase tracking-wider">{BRAND}</span>
                    <p className="text-sm text-brand-800 font-medium">{row.stow}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────── VACANCY COST CALCULATOR + ROI ─────────────────── */
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
    <section className="py-20 bg-slate-50 relative">
      <div className="absolute inset-0 gradient-mesh opacity-30" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-red-200">
                <Calculator size={14} /> Vacancy Cost + ROI Calculator
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
                See the Real Cost of Empty Units and How Fast We Pay for Ourselves
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Sliders */}
            <ScrollReveal animation="animate-fade-left">
              <div className="glass rounded-2xl p-6 shadow-xl shadow-slate-900/5 h-full">
                <h3 className="font-semibold text-slate-900 mb-1">Adjust Your Numbers</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Drag the sliders to match your facility. Watch the lost revenue and ROI update in real time.
                </p>
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-slate-700">Vacant Units</label>
                      <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg">{units}</span>
                    </div>
                    <input type="range" min={5} max={100} value={units} onChange={(e) => setUnits(+e.target.value)} className="w-full accent-red-500" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-slate-700">Avg Monthly Rent per Unit</label>
                      <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg">${avgRent}</span>
                    </div>
                    <input type="range" min={50} max={400} step={10} value={avgRent} onChange={(e) => setAvgRent(+e.target.value)} className="w-full accent-red-500" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-slate-700">Months Vacant</label>
                      <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg">{months}</span>
                    </div>
                    <input type="range" min={1} max={12} value={months} onChange={(e) => setMonths(+e.target.value)} className="w-full accent-red-500" />
                  </div>
                </div>

                {/* Lost Revenue Display */}
                <div className="mt-6 bg-slate-900 rounded-xl p-6 text-center">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Lost Recurring Revenue</p>
                  <p className="text-4xl sm:text-5xl font-extrabold text-red-400">${lost.toLocaleString()}</p>
                  <p className="text-slate-500 mt-1 text-xs">{units} units x ${avgRent}/mo x {months} months</p>
                </div>
              </div>
            </ScrollReveal>

            {/* Right: ROI Payoff */}
            <ScrollReveal animation="animate-fade-right">
              <div className="space-y-4 h-full flex flex-col">
                <div className="glass rounded-2xl p-6 shadow-xl shadow-slate-900/5 flex-1">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-brand-600" /> ROI Payoff by Tier
                  </h3>
                  <p className="text-sm text-slate-500 mb-5">See exactly how few units you need to rent to cover the cost of our service. This is not a cost. It is a profit engine.</p>

                  {/* Launch Tier */}
                  <div className="bg-gradient-to-r from-brand-50 to-emerald-50 border border-brand-200 rounded-xl p-5 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-900">Launch Tier</span>
                      <span className="text-sm font-semibold text-brand-700">$750/mo</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-white/80 rounded-lg p-3 text-center backdrop-blur-sm">
                        <p className="text-2xl font-extrabold text-brand-700">{launchBreakeven}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Units to Break Even</p>
                      </div>
                      <div className="bg-white/80 rounded-lg p-3 text-center backdrop-blur-sm">
                        <p className="text-2xl font-extrabold text-brand-700">${launchAnnualUpside.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Annual Upside if All Fill</p>
                      </div>
                    </div>
                    <p className="text-xs text-brand-800 mt-3 font-medium">
                      Rent just {launchBreakeven} unit{launchBreakeven !== 1 ? 's' : ''} at ${avgRent}/mo and the service pays for itself. Every unit after that is pure profit.
                    </p>
                  </div>

                  {/* Growth Tier */}
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-900">Growth Tier</span>
                      <span className="text-sm font-semibold text-indigo-700">$1,500/mo</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-white/80 rounded-lg p-3 text-center backdrop-blur-sm">
                        <p className="text-2xl font-extrabold text-indigo-700">{growthBreakeven}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Units to Break Even</p>
                      </div>
                      <div className="bg-white/80 rounded-lg p-3 text-center backdrop-blur-sm">
                        <p className="text-2xl font-extrabold text-indigo-700">${growthAnnualUpside.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Annual Upside if All Fill</p>
                      </div>
                    </div>
                    <p className="text-xs text-indigo-800 mt-3 font-medium">
                      Rent {growthBreakeven} unit{growthBreakeven !== 1 ? 's' : ''} and you are profitable. Full retargeting, A/B testing, and conversion strategy included.
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <a href={CTA_HREF} className="inline-flex items-center gap-2 gradient-brand text-white px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-brand-600/20">
                    <Search size={16} /> {PRIMARY_CTA}
                  </a>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────── TEAM SECTION ─────────────────── */
function TeamSection() {
  const members = [
    { ...TEAM.blake, avatar: 'BB', bio: '7+ years in self-storage and U-Haul operations. Built and manages multiple facilities in Michigan. Leads company strategy and client relationships.', linkedin: 'https://linkedin.com/in/mruhaul' },
    { ...TEAM.marcus, avatar: 'MD', bio: 'Builds every CBO campaign structure, audience architecture, and retargeting sequence. Obsessed with CPL optimization and conversion data.' },
    { ...TEAM.rachel, avatar: 'RK', bio: 'Your main point of contact. Manages client onboarding, communication, and ensures every facility gets the attention it deserves.' },
    { ...TEAM.angelo, avatar: 'AV', bio: 'Designs ad creative, landing pages, and visual assets. Every image and layout is tested for conversion, not just aesthetics.' },
    { ...TEAM.tyler, avatar: 'TB', bio: 'Writes ad copy, tests headline variants, and develops the creative angles that stop the scroll. Focuses on what converts, not what sounds pretty.' },
    { ...TEAM.priya, avatar: 'PS', bio: 'Runs the numbers. Attribution modeling, audience analysis, performance reporting, and the data infrastructure that makes everything measurable.' },
  ]

  return (
    <section id="founder" className="py-20 bg-white relative">
      <div className="absolute inset-0 bg-gradient-to-b from-white to-slate-50/50" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-brand-200">
              Not Marketers Learning Storage. Operators Who Built an Ad Engine.
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Meet the Team Behind {BRAND}
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Storage operators, media buyers, designers, and data people. We are a small team that moves fast and knows this industry inside out.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto stagger-children">
          {members.map((m) => (
            <ScrollReveal key={m.name}>
              <div className="glass rounded-xl p-5 card-hover border border-slate-200/50 shadow-lg shadow-slate-900/5 h-full">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-emerald-500 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-md">
                    {m.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{m.name}</p>
                    <p className="text-xs text-brand-600 font-medium">{m.role}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{m.bio}</p>
                {m.linkedin && (
                  <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-600 mt-3 transition-colors">
                    <Linkedin size={12} /> LinkedIn
                  </a>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <div className="max-w-3xl mx-auto mt-12">
            <div className="glass-dark rounded-2xl p-6 sm:p-8">
              <div className="space-y-4 text-slate-300 text-[15px] leading-relaxed">
                <p>
                  My team and I have spent the better part of a decade inside self-storage and U-Haul operations
                  in Michigan. We have built ground-up drive-up facilities, climate-controlled builds, industrial
                  building conversions, heated indoor boat and RV storage, outdoor parking, and U-Box container
                  warehousing. We operate multiple U-Haul dealerships and run a white-glove moving service company.
                </p>
                <p>
                  We watched storage owners get burned by generic agencies that could not define RevPAU, did not know
                  what a move-in funnel looked like, and had never configured a Meta Pixel for a storage website.
                  So we built the system ourselves, tested it on our own portfolio at{' '}
                  <a href="https://midwayselfstoragemi.com" target="_blank" rel="noopener noreferrer" className="text-brand-400 font-medium hover:underline">
                    Midway Self Storage
                  </a>,
                  and when it worked, operators in our network started asking for it.
                </p>
                <p className="text-white font-medium">
                  That is the difference between an agency that runs storage ads and a team that operates
                  storage facilities and runs ads. We are the second one.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

/* ─────────────────── WHY US ─────────────────── */
function WhyUsSection() {
  const advantages = [
    { icon: Building2, title: 'We Operate Storage Facilities', desc: 'Our team runs our own portfolio: drive-up, climate, industrial, boat/RV, U-Haul, moving. We know the business because we are in it every day. Every campaign decision is informed by real operational data.' },
    { icon: DollarSign, title: 'Revenue Recovery, Not Vanity Metrics', desc: 'We track CPL, cost-per-move-in, and occupancy velocity. Not impressions. Not reach. Your monthly report tells you exactly how many units we helped fill and what it cost.' },
    { icon: Phone, title: 'We Audit Past the Click', desc: 'Most agencies stop at the ad. We audit your call handling, website conversion rate, speed-to-lead, follow-up sequences, and move-in friction. If the phone gets answered on ring five, your CPL is irrelevant.' },
    { icon: TrendingUp, title: 'Pricing & Promo Intelligence', desc: 'We understand rate sensitivity, promotional ROI, competitor price positioning, and how discounting strategy affects lease-up velocity and tenant quality at every tier.' },
    { icon: Crosshair, title: 'Demand-Trigger Targeting', desc: 'Our campaigns target life events that create storage need: moving, downsizing, divorce, remodels. We know these triggers because we see them in our own facilities daily.' },
    { icon: Timer, title: '48 to 72 Hour Launch', desc: 'No 3-week onboarding. No strategy decks. Marcus and the media team build your full campaign architecture (CBO, Lookalikes, retargeting) and go live in days, not months.' },
  ]

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-brand-200">
              The {BRAND} Advantage
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Built by a Team That Knows Where Facilities Leak Revenue
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Not marketers who Googled "self-storage." A team of operators and media buyers who run our own facilities and built the ad engine to fill them.
            </p>
          </div>
        </ScrollReveal>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {advantages.map((a) => (
            <ScrollReveal key={a.title}>
              <div className="glass rounded-xl p-6 border border-slate-200/50 shadow-lg shadow-slate-900/5 card-hover h-full">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-emerald-500 rounded-lg flex items-center justify-center mb-4 shadow-md">
                  <a.icon size={20} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{a.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{a.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────── DEMAND TRIGGERS ─────────────────── */
function DemandTriggers() {
  const triggers = [
    { icon: Truck, label: 'Moving & Relocation', desc: 'Local and long-distance moves. We know this demand from running U-Haul dealerships and a moving company.' },
    { icon: Heart, label: 'Divorce & Life Disruption', desc: 'Urgent belongings management with high intent. These prospects convert fast if your campaign reaches them first.' },
    { icon: Home, label: 'Downsizing', desc: 'Transitioning to smaller space. Overflow storage is mandatory, not optional. High LTV tenants.' },
    { icon: Package, label: 'Estate Cleanouts', desc: 'Sorting inherited belongings. Temporary but high-volume. Often invisible to agencies that do not understand the demand cycle.' },
    { icon: Hammer, label: 'Remodeling & Renovation', desc: 'Home projects require clearing rooms. Predictable seasonal demand we target proactively with pre-season campaigns.' },
    { icon: Boxes, label: 'Business Overflow', desc: 'Contractors, e-commerce sellers, small businesses needing inventory staging. Commercial tenants with longer lease durations.' },
    { icon: GraduationCap, label: 'College Transitions', desc: 'Students cycling in and out between semesters. Repeatable annual demand we build campaign calendars around.' },
    { icon: Car, label: 'Vehicle / RV / Boat Storage', desc: 'Seasonal vehicle storage with premium rates. We have built and operated heated indoor storage for this vertical.' },
    { icon: Calendar, label: 'Seasonal & Overflow', desc: 'Holiday items, sports gear, off-season belongings. Consistent base demand that fills standard units year-round.' },
  ]

  return (
    <section className="py-20 bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-20" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Why Our Targeting Outperforms Every Generic Agency
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              We understand storage demand because we see these triggers in our own facilities every week. This is not
              abstract persona work. It is lived operational intelligence. Meta lets us put your facility in front
              of these prospects before they ever open Google.
            </p>
          </div>
        </ScrollReveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
          {triggers.map((t) => (
            <ScrollReveal key={t.label}>
              <div className="flex items-start gap-4 glass-dark rounded-xl p-5 card-hover h-full">
                <div className="shrink-0 w-9 h-9 bg-brand-500/20 border border-brand-500/30 rounded-lg flex items-center justify-center">
                  <t.icon size={18} className="text-brand-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-0.5">{t.label}</h3>
                  <p className="text-sm text-slate-400">{t.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────── CAMPAIGN ARCHITECTURE ─────────────────── */
function CampaignArchitecture() {
  return (
    <section className="py-20 bg-white relative">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/30 to-white" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-slate-200">
              <Cpu size={14} /> Under the Hood
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Campaign Architecture Built for Storage Economics
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Every campaign our media buying team builds follows a proven structure optimized for self-storage conversion, not a repurposed template from another industry.
            </p>
          </div>
        </ScrollReveal>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 stagger-children">
          {[
            {
              icon: Layers, title: 'CBO Campaign Structure',
              items: [
                'Campaign Budget Optimization across ad sets',
                'Separate ad sets per unit type and demand trigger',
                'Dynamic creative testing (3 to 5 variants per set)',
                'Automated rules for pausing underperformers',
              ],
            },
            {
              icon: Target, title: 'Audience Architecture',
              items: [
                'Custom Audiences from your website visitors (Pixel + CAPI)',
                'Lookalike Audiences (1%, 3%, 5%) from move-in conversions',
                'Life-event targeting: recently moved, listed home, newly engaged',
                'Radius-based geo-fencing around your facility',
              ],
            },
            {
              icon: RefreshCw, title: 'Retargeting Engine',
              items: [
                'Website visitor retargeting (7, 14, 30-day windows)',
                'Engaged viewer retargeting (video, lead form openers)',
                'Sequential ad creative based on funnel stage',
                'Frequency capping to prevent ad fatigue',
              ],
            },
          ].map((col) => (
            <ScrollReveal key={col.title}>
              <div className="glass rounded-xl p-6 border border-slate-200/50 shadow-lg shadow-slate-900/5 card-hover h-full">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-emerald-500 rounded-lg flex items-center justify-center mb-4 shadow-md">
                  <col.icon size={20} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">{col.title}</h3>
                <ul className="space-y-2">
                  {col.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 size={14} className="text-brand-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          ))}
        </div>
        <ScrollReveal>
          <div className="max-w-5xl mx-auto mt-6 glass-dark rounded-xl p-5">
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
                  <Icon size={14} className="text-brand-400" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

/* ─────────────────── SERVICES ─────────────────── */
function ServicesSection() {
  const services = [
    { icon: Megaphone, title: 'Full-Funnel Meta Campaigns', desc: 'Custom campaign architecture with CBO, Auction buying, and Advantage+ placements. Built around your specific vacant unit types. Live in 48 to 72 hours.' },
    { icon: Eye, title: 'Operator-Informed Creative', desc: 'Ad headlines, angles, and creative assets built around real demand triggers, not stock "secure storage" copy. We A/B test 3 to 5 variants per ad set and kill underperformers fast.' },
    { icon: Target, title: 'Precision Audience Targeting', desc: 'Lookalike Audiences from your highest-value move-ins, Custom Audiences from Pixel data, life-event behavioral targeting, and radius-based geo-fencing. No wasted impressions.' },
    { icon: RefreshCw, title: 'Retargeting Sequences', desc: 'Multi-window retargeting for website visitors, video viewers, and lead form openers. Sequential creative that moves prospects through the funnel with frequency capping to prevent fatigue.' },
    { icon: Code, title: 'Pixel + Conversions API Setup', desc: 'Full Meta Pixel and server-side Conversions API installation. Custom conversion events for lead form submits, calls, and move-ins. Event match quality optimization.' },
    { icon: Key, title: 'Move-In Conversion Strategy', desc: 'Tactical recommendations on offer structure, pricing presentation, urgency messaging, and lease-up acceleration. We optimize the path from lead to signed lease, not just the ad.' },
    { icon: Headphones, title: 'Call & Follow-Up Audit', desc: 'We audit your speed-to-lead metrics, missed call recovery, voicemail scripts, and SMS follow-up sequences. If your office kills conversions, we tell you directly and show you the fix.' },
    { icon: BarChart2, title: 'Operator-Grade Reporting', desc: 'Monthly performance tied to CPL, cost-per-move-in, ROAS, and occupancy impact. Attribution by unit type, campaign, and audience. No vanity dashboards. Actionable intelligence only.' },
  ]

  return (
    <section id="services" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">What Our Team Delivers</h2>
            <p className="mt-4 text-lg text-slate-600">
              A complete occupancy-recovery system engineered for self-storage economics, not a recycled digital marketing menu.
            </p>
          </div>
        </ScrollReveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
          {services.map((s) => (
            <ScrollReveal key={s.title}>
              <div className="glass rounded-xl p-5 border border-slate-200/50 shadow-lg shadow-slate-900/5 card-hover h-full">
                <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-emerald-500 rounded-lg flex items-center justify-center mb-3 shadow-md">
                  <s.icon size={18} className="text-white" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1.5">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────── OCCUPANCY ENGINE ─────────────────── */
function OccupancyEngine() {
  const steps = [
    { icon: MousePointerClick, label: 'Meta Ads Traffic', desc: 'Targeted campaigns reach local prospects during life transitions before they search Google. Demand creation, not just demand capture.' },
    { icon: Users, label: 'Qualified Leads', desc: 'Lead forms filter for intent, location, unit type, and urgency. Conversion-optimized landing pages eliminate tire-kickers.' },
    { icon: PhoneCall, label: 'Calls & Inquiries', desc: 'Leads convert to real phone calls and online inquiries from people who actually need a unit now.' },
    { icon: MessageSquare, label: 'Speed-to-Lead System', desc: 'Sub-5-minute response, missed call recovery, and automated SMS sequences. Leads do not decay in your inbox.' },
    { icon: UserCheck, label: 'Move-Ins', desc: 'Qualified prospects convert into signed leases. Optimized offers, reduced friction, clear urgency. The metric that matters.' },
    { icon: TrendingUp, label: 'Occupancy & Revenue Growth', desc: 'Vacancy decreases. RevPAU increases. Pricing power returns. Recurring revenue recovered and compounding.' },
  ]

  return (
    <section id="engine" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-brand-200">
              The Occupancy Engine
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">From Ad Click to Signed Lease</h2>
            <p className="mt-4 text-lg text-slate-600">
              A complete system engineered to move local prospects from first impression to signed lease, launched in 48 to 72 hours.
            </p>
          </div>
        </ScrollReveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {steps.map((step, i) => (
            <ScrollReveal key={step.label}>
              <div className="relative glass rounded-xl p-6 border border-slate-200/50 shadow-lg shadow-slate-900/5 card-hover h-full">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 gradient-brand rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {i + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <step.icon size={16} className="text-brand-600" />
                      <h3 className="font-semibold text-slate-900">{step.label}</h3>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-brand-400">
                    {(i + 1) % 3 !== 0 && <ArrowRight size={20} />}
                  </div>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────── IDEAL CLIENT ─────────────────── */
function IdealClient() {
  const types = [
    { title: 'Independent Owner-Operators', desc: 'Single-location owners who want occupancy-focused ads managed by people who understand the business, not another generalist agency.' },
    { title: 'Small Multi-Site Operators (2 to 10 Locations)', desc: 'Groups needing consistent lead flow across facilities with per-location CPL tracking, centralized reporting, and portfolio-level budget optimization.' },
    { title: 'Underperforming Facilities with Stubborn Vacancy', desc: 'Mature properties where specific unit types have been sitting empty. You need demand segmentation by unit class, not more broad campaigns.' },
    { title: 'Lease-Up & New Build Properties', desc: 'New facilities that need to accelerate occupancy velocity. Meta campaigns build local awareness and drive move-ins before SEO has time to compound.' },
    { title: 'Operators Burned by Generic Agencies', desc: 'You have paid someone who could not define RevPAU, never configured a Pixel, and ran the same playbook they use for HVAC clients. You want operators this time.' },
  ]

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Best Fit Clients</h2>
            <p className="mt-4 text-lg text-slate-600">
              We work exclusively with self-storage operators. Independent and small multi-site owners who want more move-ins
              without the overhead of an agency that does not understand the business.
            </p>
          </div>
        </ScrollReveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto stagger-children">
          {types.map((t) => (
            <ScrollReveal key={t.title}>
              <div className="flex items-start gap-3 glass rounded-xl p-5 border border-slate-200/50 shadow-lg shadow-slate-900/5 card-hover h-full">
                <CheckCircle2 size={20} className="text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{t.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{t.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────── KPI DASHBOARD ─────────────────── */
function KPIDashboard() {
  const metrics = [
    { label: 'Leads Generated', value: '197', change: '+18%', positive: true },
    { label: 'Cost Per Lead', value: '$28.40', change: '-22%', positive: true },
    { label: 'Phone Calls', value: '134', change: '+22%', positive: true },
    { label: 'Move-Ins', value: '57', change: '+15%', positive: true },
    { label: 'Cost Per Move-In', value: '$97.89', change: '-8%', positive: true },
    { label: 'Occupancy Velocity', value: '+4.2%', change: '/month', positive: true },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-brand-200">
              Example Reporting Framework
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Metrics That Actually Move the Needle
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Every number maps to revenue and occupancy. Not impressions. Not CTR. Not reach. The KPIs operators actually need to make decisions.
            </p>
          </div>
        </ScrollReveal>
        <ScrollReveal>
          <div className="max-w-4xl mx-auto glass rounded-2xl p-6 shadow-xl shadow-slate-900/5 border border-slate-200/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="font-semibold text-slate-900">Monthly Performance - Illustrative Example</h3>
                <p className="text-sm text-slate-500">Sample data showing the type of reporting your facility receives</p>
              </div>
              <span className="text-xs font-medium bg-green-100 text-green-700 px-3 py-1 rounded-full whitespace-nowrap">Active Campaign</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 stagger-children">
              {metrics.map((m) => (
                <div key={m.label} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-100 card-hover">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{m.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{m.value}</p>
                  {m.change && (
                    <p className={`text-xs font-medium mt-1 ${m.positive ? 'text-green-600' : 'text-red-500'}`}>
                      {m.change} vs last month
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="w-3 h-3 rounded-full bg-brand-500" /> ROAS: 4.2x
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="w-3 h-3 rounded-full bg-blue-500" /> Lead Quality Score: 8.1/10
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="w-3 h-3 rounded-full bg-amber-500" /> Speed-to-Lead: 4.2 min avg
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

/* ─────────────────── PRICING ─────────────────── */
function PricingSection() {
  const tiers = [
    {
      name: 'Launch', price: '$750', period: '/mo',
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
      cta: PRIMARY_CTA, popular: false, gradient: 'from-brand-500 to-emerald-500',
    },
    {
      name: 'Growth', price: '$1,500', period: '/mo',
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
      cta: PRIMARY_CTA, popular: true, gradient: 'from-indigo-500 to-purple-500',
    },
    {
      name: 'Portfolio', price: 'Custom', period: '',
      desc: 'For multi-site operators (3+ locations) needing centralized campaign management and portfolio optimization.',
      features: [
        'Everything in Growth per location',
        'Centralized multi-facility dashboard',
        'Cross-location budget allocation optimization',
        'Market-specific campaign strategy per facility',
        'Dedicated account manager (Rachel)',
        'Weekly strategy calls with Blake + Marcus',
        'Full-funnel audit for each location',
        'Custom KPI tracking + attribution modeling',
        'Quarterly business review',
      ],
      cta: PRIMARY_CTA, popular: false, gradient: 'from-slate-700 to-slate-900',
    },
  ]

  return (
    <section id="pricing" className="py-20 bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-20" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Straightforward Pricing</h2>
            <p className="mt-4 text-lg text-slate-600">
              No hidden fees. No long contracts. No mystery surcharges. Campaigns go live in 48 to 72 hours.
            </p>
          </div>
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl px-6 py-4 text-center">
              <p className="text-sm text-amber-800">
                <strong>The math is simple:</strong> 10 empty 10x10s at $110/month = $1,100 in lost MRR. That is $13,200/year
                from just one row. If our campaigns recover even 3 to 4 of those units, the service pays for itself in month one
                and generates positive ROI every month after.
              </p>
            </div>
          </div>
        </ScrollReveal>
        <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto stagger-children">
          {tiers.map((tier) => (
            <ScrollReveal key={tier.name}>
              <div className={`relative rounded-2xl p-6 card-hover h-full ${tier.popular ? 'border-2 border-brand-600 bg-white shadow-xl shadow-brand-600/10' : 'border border-slate-200 bg-white/90 backdrop-blur-sm shadow-lg shadow-slate-900/5'}`}>
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-brand text-white text-xs font-semibold px-4 py-1 rounded-full shadow-md">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-slate-900">{tier.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">{tier.price}</span>
                  <span className="text-slate-500">{tier.period}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{tier.desc}</p>
                <ul className="mt-6 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 size={16} className="text-brand-600 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={CTA_HREF}
                  className={`mt-6 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                    tier.popular
                      ? 'gradient-brand text-white hover:opacity-90 shadow-md shadow-brand-600/20'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  <Search size={14} /> {tier.cta}
                </a>
              </div>
            </ScrollReveal>
          ))}
        </div>
        <p className="text-center text-sm text-slate-500 mt-8">Ad spend is paid directly to Meta (not to us). Recommended minimum: $1,000/mo. No long-term contracts. 90-day initial, then month-to-month.</p>
      </div>
    </section>
  )
}

/* ─────────────────── CASE STUDY ─────────────────── */
function CaseStudyTeaser() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="max-w-4xl mx-auto glass rounded-2xl overflow-hidden border border-slate-200/50 shadow-xl shadow-slate-900/5">
            <div className="grid md:grid-cols-2">
              <div className="p-8">
                <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider">Illustrative Results Framework</span>
                <h3 className="text-xl font-bold text-slate-900 mt-2 mb-3">
                  From 64% to 87% Occupancy in 90 Days
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  A suburban Michigan facility was stuck at 64% with a generic agency running broad awareness campaigns.
                  After switching to targeted, operator-informed Meta ads with unit-type segmentation, retargeting,
                  and Lookalike audiences built from their best tenants, occupancy climbed 23 points in three months.
                </p>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">+23%</p>
                    <p className="text-xs text-slate-500">Occupancy Lift</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">$24</p>
                    <p className="text-xs text-slate-500">Avg CPL</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">47</p>
                    <p className="text-xs text-slate-500">Move-Ins</p>
                  </div>
                </div>
                <a href={CTA_HREF} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
                  See what this looks like for your facility <ArrowUpRight size={16} />
                </a>
              </div>
              <div className="bg-gradient-to-br from-slate-100 to-slate-200 p-8 flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <BarChart3 size={48} className="mx-auto mb-3" />
                  <p className="text-sm font-medium">Performance Visualization</p>
                  <p className="text-xs">Occupancy trend chart</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

/* ─────────────────── TESTIMONIALS ─────────────────── */
function Testimonials() {
  const reviews = [
    { name: 'Mark D.', role: 'Owner, 3 Locations, Michigan', text: 'Went from 72% to 89% occupancy in four months. They actually understand what drives move-ins, not just ad metrics. The call handling audit alone was worth the fee.' },
    { name: 'Lisa R.', role: 'Operator, Single Site, Ohio', text: 'First team that did not try to sell me on "brand awareness." They set up the Pixel, built retargeting from day one, and focused entirely on cost-per-move-in. Results showed in month one.' },
    { name: 'Jeff T.', role: 'Regional Manager, 6 Locations, Indiana', text: 'The per-location CPL tracking and unit-type campaign segmentation changed everything. I finally know which facilities are converting and which ad sets to scale. Real operator reporting.' },
  ]

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">What Operators Say</h2>
            <p className="mt-3 text-sm text-slate-500">Representative feedback reflecting the type of results and outcomes our campaigns deliver.</p>
          </div>
        </ScrollReveal>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto stagger-children">
          {reviews.map((r) => (
            <ScrollReveal key={r.name}>
              <div className="glass rounded-xl p-6 border border-slate-200/50 shadow-lg shadow-slate-900/5 card-hover h-full">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} size={16} className="text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">"{r.text}"</p>
                <div>
                  <p className="font-semibold text-sm text-slate-900">{r.name}</p>
                  <p className="text-xs text-slate-500">{r.role}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────── FAQ ─────────────────── */
function FAQSection() {
  const [openIdx, setOpenIdx] = useState(null)
  const faqs = [
    {
      q: 'Why Meta ads instead of Google for self-storage?',
      a: 'Google captures existing demand: people already searching "storage near me." Meta creates new demand by reaching local people during life events (moving, divorce, downsizing, renovation) before they ever search. By the time someone is on Google, they are already comparing four facilities. Meta gets your facility in front of them first. We run both channels for some clients, but Meta consistently delivers lower CPL when properly configured with Pixel tracking and retargeting.'
    },
    {
      q: 'How fast do campaigns actually go live?',
      a: 'Campaigns are live within 48 to 72 hours of our initial audit call. Marcus and the media buying team move this fast because we already know the industry. There is no learning curve. We audit your facility, build the CBO campaign structure with Lookalike and Custom Audiences, upload dynamic creative, and launch. Most agencies burn 2 to 4 weeks on onboarding decks before a single ad runs.'
    },
    {
      q: 'What makes this different from hiring a regular agency?',
      a: 'We operate self-storage facilities. That is the difference. Our team runs our own portfolio: drive-up, climate, industrial conversions, heated boat/RV, U-Haul dealerships. Every campaign we build is informed by real operational data: unit-mix economics, seasonal demand patterns, lease-up curves, and conversion bottlenecks we see in our own business. We do not just run ads. We audit your full funnel from ads to website to call handling to follow-up to move-in process.'
    },
    {
      q: 'What if our website or follow-up process is weak?',
      a: 'We will tell you directly and give specific, actionable fixes. A strong campaign still fails if leads hit a weak website or calls go unanswered past five rings. Our audit covers speed-to-lead, website conversion rate, call scripts, missed call recovery, and SMS follow-up sequences. Most agencies never mention operational friction because they do not know what good storage operations look like.'
    },
    {
      q: 'Do you handle Pixel and Conversions API setup?',
      a: 'Yes. Full Meta Pixel installation, server-side Conversions API (CAPI) configuration, custom conversion event setup, and event match quality optimization are included in every engagement. Without this infrastructure, campaigns have no feedback loop and cannot build Custom or Lookalike Audiences. We consider it non-negotiable.'
    },
    {
      q: 'What KPIs do you report on?',
      a: 'Cost per lead (CPL), cost per move-in, leads by source, phone calls, move-ins, ROAS, occupancy velocity, and unit-type attribution. Not impressions, not reach, not CTR. Every metric ties directly to whether units are getting filled and what it cost to fill them. Reports are in plain English with clear action items.'
    },
    {
      q: 'Who is behind StowStack?',
      a: 'Blake Burkett (CEO/Founder) has 7+ years in self-storage and U-Haul operations in Michigan. The team includes Marcus Dellatore (Head of Media Buying), Rachel Kim (Account Director), Angelo Vitale (Senior Designer), Tyler Brooks (Creative Strategist), and Priya Sharma (Analytics Lead). We built this for our own facilities first (including Midway Self Storage), proved it worked, and now run it for operators in our network.'
    },
    {
      q: 'Do you require long-term contracts?',
      a: 'No. 90-day initial engagement, then month-to-month. We earn your business every month. That said, campaign performance compounds over time as Pixel data matures, Lookalike audiences sharpen, and creative testing narrows to top performers. The operators who stay past 90 days see significantly stronger ROAS because the system gets smarter every month.'
    },
    {
      q: 'What ad spend do you recommend?',
      a: 'Minimum $1,000/month paid directly to Meta (not to us). For most single-location facilities, $1,500 to $2,500/month in ad spend produces the strongest CPL and enough data volume for meaningful optimization. Multi-site operators typically allocate $1,000 to $2,000 per location. Our management fee is separate and transparent.'
    },
  ]

  return (
    <section id="faq" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Frequently Asked Questions</h2>
            </div>
          </ScrollReveal>
          <div className="space-y-3 stagger-children">
            {faqs.map((faq, i) => (
              <ScrollReveal key={i}>
                <div className="glass rounded-xl overflow-hidden border border-slate-200/50 shadow-sm">
                  <button
                    onClick={() => setOpenIdx(openIdx === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-white/80 transition-colors"
                  >
                    <span className="font-semibold text-slate-900 pr-4">{faq.q}</span>
                    {openIdx === i ? <ChevronUp size={20} className="text-slate-400 shrink-0" /> : <ChevronDown size={20} className="text-slate-400 shrink-0" />}
                  </button>
                  {openIdx === i && (
                    <div className="px-5 pb-5 animate-slide-down">
                      <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* FinalCTA removed — now using src/components/sections/CTA.jsx */

/* ─────────────────── FOOTER ─────────────────── */
function Footer() {
  return (
    <footer className="bg-slate-950 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 text-center md:text-left md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-brand rounded-lg flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white">{BRAND}</span>
              <span className="text-[10px] text-slate-500 ml-1.5 uppercase tracking-wider">Self-Storage Ad Engine</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 max-w-xs">
            Operator-built Meta ads for self-storage. Occupancy growth. Revenue recovery. Full-funnel performance.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="https://linkedin.com/in/mruhaul" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
              <Linkedin size={14} /> LinkedIn
            </a>
            <a href="https://midwayselfstoragemi.com" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
              <Globe size={14} /> Midway Self Storage
            </a>
            <a href="mailto:blake@storepawpaw.com" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
              <Mail size={14} /> Email
            </a>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} {BRAND}. Self-Storage Ad Engine. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

/* ─────────────────── GUIDE PROMO ─────────────────── */
function GuidePromo({ onNavigate }) {
  return (
    <section className="py-12 gradient-brand relative overflow-hidden">
      <div className="absolute inset-0 animate-shimmer" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <BookOpen size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Want to understand the full Meta ads process?</h3>
              <p className="text-sm text-white/80 mt-1">
                Read our deep-dive guide on campaign architecture, Pixel setup, retargeting strategy, audience targeting,
                and why it works differently for storage operators. Written by our team.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('guide')}
            className="shrink-0 inline-flex items-center gap-2 bg-white text-brand-700 px-5 py-3 rounded-xl text-sm font-semibold hover:bg-brand-50 transition-all cursor-pointer"
          >
            <BookOpen size={16} /> Read the Guide <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  )
}

/* ─────────────── MOBILE CTA BAR ─────────────── */
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
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-lg border-t border-slate-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] animate-fade-up">
      <a
        href={CTA_HREF}
        className="flex items-center justify-center gap-2 w-full gradient-brand text-white py-3 rounded-xl text-sm font-semibold shadow-md shadow-brand-600/20"
      >
        <Search size={14} /> {PRIMARY_CTA} <ArrowRight size={14} />
      </a>
    </div>
  )
}

/* ─────────────── BACK TO TOP ─────────────── */
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
      className="fixed bottom-20 md:bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur-sm text-white shadow-lg flex items-center justify-center hover:bg-slate-700 transition-all cursor-pointer animate-fade-up"
      aria-label="Back to top"
    >
      <ChevronUp size={20} />
    </button>
  )
}

/* ─────────────────── PAGE ASSEMBLY ─────────────────── */
export default function Website({ onNavigate }) {
  const [hasBanner, setHasBanner] = useState(true)

  useEffect(() => {
    const onScroll = () => {
      const banner = document.querySelector('[data-audit-banner]')
      if (!banner) setHasBanner(false)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="overflow-x-hidden">
      <AuditBanner />
      <NavBar hasBanner={hasBanner} />
      <Hero hasBanner={hasBanner} />
      <SocialProofStrip />
      <LaunchTimeline />
      <ProblemSection />
      <ComparisonSection />
      <VacancyCostCalculator />
      <TeamSection />
      <WhyUsSection />
      <DemandTriggers />
      <CampaignArchitecture />
      <ServicesSection />
      <OccupancyEngine />
      <IdealClient />
      <KPIDashboard />
      <GuidePromo onNavigate={onNavigate} />
      <PricingSection />
      <CaseStudyTeaser />
      <Testimonials />
      <FAQSection />
      <CTA />
      <Footer />
      <MobileCTABar />
      <BackToTop />
    </div>
  )
}
