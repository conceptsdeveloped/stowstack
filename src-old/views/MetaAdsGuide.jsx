import { useState } from 'react'
import {
  ArrowRight, ArrowLeft, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Target, BarChart3, Phone, Users, TrendingUp, Zap, Shield,
  Building2, Eye, Megaphone, Search, DollarSign, Layers,
  MousePointerClick, Monitor, Smartphone, MessageSquare,
  Settings, Code, RefreshCw, ArrowUpRight, AlertTriangle,
  Clock, Rocket, FileText, Globe, Linkedin, Mail,
  BookOpen, ChevronRight, Star, Play, Crosshair,
  SlidersHorizontal, PieChart, LayoutGrid, Image,
  ListChecks, Lightbulb, Sparkles, CircleDot, Lock
} from 'lucide-react'

const BRAND = 'StowStack'
const PRIMARY_CTA = 'Get a Facility Audit'
const CTA_HREF = '#guide-cta'

/* ─────────────── TABLE OF CONTENTS DATA ─────────────── */
const tocItems = [
  { id: 'why-meta', label: 'Why Meta Ads for Self-Storage' },
  { id: 'prerequisites', label: 'What You Need First' },
  { id: 'ads-manager', label: 'Inside Facebook Ads Manager' },
  { id: 'campaign-setup', label: 'Campaign Setup Process' },
  { id: 'buying-type', label: 'Buying Types: Auction vs Reservation' },
  { id: 'objectives', label: 'Campaign Objectives Explained' },
  { id: 'budget', label: 'Budget & Schedule Strategy' },
  { id: 'audience', label: 'Audience Targeting for Storage' },
  { id: 'placement', label: 'Ad Placement Options' },
  { id: 'creative', label: 'Ad Creative & Format' },
  { id: 'meta-pixel', label: 'The Meta Pixel' },
  { id: 'retargeting', label: 'Retargeting: The Real Weapon' },
  { id: 'why-stowstack', label: 'Why Operators Hire StowStack' },
]

/* ─────────────── NAV BAR ─────────────── */
function GuideNav({ onBack }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors cursor-pointer">
              <ArrowLeft size={16} /> Back to Site
            </button>
            <div className="hidden sm:block w-px h-6 bg-slate-200" />
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
                <Building2 size={14} className="text-white" />
              </div>
              <span className="font-bold text-slate-900">{BRAND}</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Guide</span>
            </div>
          </div>
          <a href={CTA_HREF} className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors">
            <Search size={14} /> {PRIMARY_CTA}
          </a>
        </div>
      </div>
    </nav>
  )
}

/* ─────────────── HERO ─────────────── */
function GuideHero() {
  return (
    <section className="pt-24 pb-12 sm:pt-32 sm:pb-16 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-500/20 text-brand-300 px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-brand-500/30">
          <BookOpen size={14} /> The Complete Operator's Guide
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
          How Meta Ads Actually Work for Self-Storage
        </h1>
        <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          A detailed walkthrough of the Facebook Ads process — campaign objectives, audience targeting, budgets, the Meta Pixel,
          retargeting, and why most of it works differently for storage than for other industries.
          Written by an operator, not a marketer.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5"><Clock size={14} /> 15 min read</span>
          <span className="flex items-center gap-1.5"><BookOpen size={14} /> Adapted from StoragePug's Marketing Playbook</span>
        </div>
      </div>
    </section>
  )
}

/* ─────────────── TABLE OF CONTENTS ─────────────── */
function TableOfContents() {
  return (
    <section className="py-10 bg-slate-50 border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">In This Guide</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
          {tocItems.map((item, i) => (
            <a key={item.id} href={`#${item.id}`} className="flex items-center gap-3 py-2 text-sm text-slate-600 hover:text-brand-600 transition-colors group">
              <span className="w-6 h-6 bg-white border border-slate-200 rounded-md flex items-center justify-center text-xs font-bold text-slate-400 group-hover:border-brand-300 group-hover:text-brand-600 transition-colors">
                {i + 1}
              </span>
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────── REUSABLE SECTION COMPONENTS ─────────────── */
function SectionHeading({ id, number, title, subtitle }) {
  return (
    <div id={id} className="scroll-mt-24 mb-8">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">{number}</span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{title}</h2>
      </div>
      {subtitle && <p className="text-lg text-slate-600 leading-relaxed">{subtitle}</p>}
    </div>
  )
}

function OperatorNote({ children }) {
  return (
    <div className="bg-brand-50 border border-brand-200 rounded-xl px-5 py-4 my-6">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 bg-brand-600 rounded-md flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb size={14} className="text-white" />
        </div>
        <div className="text-sm text-brand-800 leading-relaxed">
          <span className="font-bold">Operator's Take:</span> {children}
        </div>
      </div>
    </div>
  )
}

function WarningNote({ children }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 my-6">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function ComparisonRow({ left, right }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
        <p className="text-sm text-slate-700">{left}</p>
      </div>
      <div className="bg-brand-50 border border-brand-200 rounded-lg px-4 py-3">
        <p className="text-sm text-brand-800 font-medium">{right}</p>
      </div>
    </div>
  )
}

/* ─────────────── INLINE CTA ─────────────── */
function InlineCTA({ heading, text }) {
  return (
    <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 my-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">{heading}</h3>
          <p className="text-sm text-slate-400 mt-1">{text}</p>
        </div>
        <a href={CTA_HREF} className="shrink-0 inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-all">
          <Search size={16} /> {PRIMARY_CTA}
        </a>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN GUIDE CONTENT
   ═══════════════════════════════════════════════════════ */
function GuideContent() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <section className="py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ─── INTRO ─── */}
        <div className="prose-slate mb-12">
          <p className="text-lg text-slate-600 leading-relaxed">
            Most self-storage operators know they should be running ads online. Fewer understand exactly how
            Facebook and Instagram advertising works — the campaign structure, the targeting options, the budgeting mechanics,
            and why retargeting is the single most valuable tactic for storage facilities specifically.
          </p>
          <p className="text-lg text-slate-600 leading-relaxed mt-4">
            This guide breaks it all down. It is adapted from StoragePug's marketing playbook with additional
            operator-level context from someone who has spent 7 years inside the business. If you want to understand
            what goes into a Meta ads campaign before you hand it off to someone (or before you try it yourself),
            this is the resource.
          </p>
        </div>

        {/* ═══════ SECTION 1: WHY META ADS ═══════ */}
        <SectionHeading
          id="why-meta"
          number="1"
          title="Why Meta Ads for Self-Storage"
          subtitle="Facebook has over 3 billion active users. Its ads convert at a higher rate than Google ads in many categories. But the real question is: does it make sense for storage?"
        />

        <div className="space-y-4 text-slate-600 leading-relaxed">
          <p>
            Here is the honest answer: Meta ads are not the first thing you should do. They are an advanced step.
            Before you touch Facebook advertising, you should already have the basics covered:
          </p>
          <ul className="space-y-2 ml-1">
            {[
              'An optimized website that actually converts visitors into inquiries',
              'A Google Business Profile that is complete, accurate, and actively managed',
              'Google Ads running (or at least evaluated) for local search traffic',
              'A referral system or word-of-mouth strategy in place',
              'Solid customer service that generates organic reviews',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-brand-600 shrink-0 mt-1" />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
          <p>
            Once those boxes are checked and you are seeing results from them, Meta ads become the next multiplier.
            The reason is simple: Google captures existing demand — people already searching for storage.
            Meta creates new demand by reaching people during the life events that trigger storage need,
            before they ever type anything into a search engine.
          </p>
        </div>

        <OperatorNote>
          This is where most generic agencies get it wrong. They start running Facebook ads for storage clients
          who do not even have a decent website or Google profile yet. You are spending money sending people to
          a broken funnel. I always audit the full stack first — website, Google, reviews, call handling — before
          touching Meta ads. If the foundation is weak, the ads will underperform no matter how good they are.
        </OperatorNote>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 my-6">
          <h3 className="font-bold text-slate-900 mb-3">Facebook vs. Google: The Storage-Specific Tradeoff</h3>
          <div className="space-y-3">
            <ComparisonRow
              left="Google Ads: Captures people actively searching 'storage near me'"
              right="Meta Ads: Reaches people during life events before they search"
            />
            <ComparisonRow
              left="Google: Higher intent, but you are competing with every facility in the radius"
              right="Meta: Lower starting intent, but you can target specific demand triggers"
            />
            <ComparisonRow
              left="Google: Everyone uses it — more crowded, higher cost per click"
              right="Meta: Less saturated for storage — better cost-per-lead potential"
            />
          </div>
        </div>

        <p className="text-slate-600 leading-relaxed">
          The key insight is that storage demand is almost always triggered by a life event — moving, divorce, downsizing,
          renovation, estate cleanout, business overflow. Meta's targeting tools let you get your facility in front
          of people experiencing these exact moments. That is something Google cannot do as precisely.
        </p>

        {/* ═══════ SECTION 2: PREREQUISITES ═══════ */}
        <div className="mt-16" />
        <SectionHeading
          id="prerequisites"
          number="2"
          title="What You Need Before Running Ads"
          subtitle="Three foundational steps before you create your first campaign."
        />

        <div className="grid sm:grid-cols-3 gap-4 my-6">
          {[
            {
              step: '1',
              title: 'Define Your Goal',
              desc: 'Are you optimizing for leads (form fills, calls), conversions (actual move-ins), or awareness (getting your facility name known locally)? Your goal shapes every decision that follows.',
              icon: Target,
            },
            {
              step: '2',
              title: 'Set Up a Business Page',
              desc: 'You need a Facebook Page for your facility in Meta Business Suite. This is the public identity your ads will come from and where people land when they click through.',
              icon: Globe,
            },
            {
              step: '3',
              title: 'Add a Payment Method',
              desc: 'Enter a valid payment method in Meta Business Suite. You will set spending limits later so you only spend what you agree to — Meta will not exceed the budget you set.',
              icon: DollarSign,
            },
          ].map((item) => (
            <div key={item.step} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-brand-100 rounded-md flex items-center justify-center">
                  <item.icon size={16} className="text-brand-600" />
                </div>
                <span className="text-xs font-bold text-brand-600 uppercase">Step {item.step}</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1.5">{item.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <OperatorNote>
          Most operators I work with already have a Facebook page but it is incomplete or outdated.
          Before running ads, I make sure the page has correct hours, address, phone number, a link to
          your website, and recent activity. A dead-looking business page hurts ad credibility.
        </OperatorNote>

        {/* ═══════ SECTION 3: ADS MANAGER ═══════ */}
        <div className="mt-16" />
        <SectionHeading
          id="ads-manager"
          number="3"
          title="Inside Facebook Ads Manager"
          subtitle="The Ads Manager is your command center for creating, managing, and analyzing ad campaigns. Here is what you need to know."
        />

        <div className="text-slate-600 leading-relaxed space-y-4">
          <p>
            To access it, go to your Facebook Business Page, click <strong>Ad Center</strong> on the left sidebar,
            then <strong>All Ads</strong>, then <strong>Ads Manager</strong>. You can also use the Meta Ads Manager
            mobile app — same functionality, same steps.
          </p>
          <p>
            The Ads Manager is where you build campaigns from scratch: choosing objectives, setting budgets,
            defining audiences, uploading creative, and tracking performance. It has three levels of hierarchy:
          </p>
        </div>

        <div className="bg-slate-900 rounded-xl p-6 my-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            {[
              { level: 'Campaign', desc: 'The top level. This is where you choose your objective — what you want the ads to accomplish.' },
              { level: 'Ad Set', desc: 'The middle level. This is where you define audience, budget, schedule, and placement.' },
              { level: 'Ad', desc: 'The bottom level. This is the actual creative — the image, video, headline, and call-to-action people see.' },
            ].map((item, i) => (
              <div key={item.level} className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-brand-500 rounded-md flex items-center justify-center text-white text-xs font-bold">{i + 1}</div>
                  <h4 className="font-semibold text-white">{item.level}</h4>
                </div>
                <p className="text-sm text-slate-400">{item.desc}</p>
                {i < 2 && <div className="hidden sm:block mt-3"><ArrowRight size={16} className="text-slate-600" /></div>}
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 leading-relaxed">
          This hierarchy matters because it lets you test different variables at each level. You might have one
          campaign with multiple ad sets targeting different audiences, and each ad set might have multiple
          ads with different images or headlines. That structure is how you learn what works.
        </p>

        {/* ═══════ SECTION 4: CAMPAIGN SETUP ═══════ */}
        <div className="mt-16" />
        <SectionHeading
          id="campaign-setup"
          number="4"
          title="Campaign Setup Process"
          subtitle="Click the green Create button in Ads Manager to start. Here is what Facebook asks you to configure — and what each setting actually means."
        />

        <div className="text-slate-600 leading-relaxed space-y-4">
          <p>
            The campaign creation flow walks you through several decisions in sequence: buying type, campaign objective,
            naming, ad category, A/B testing, Advantage+ settings, budget, audience, placement, creative, and destination.
            Each one matters. Here is a breakdown of the critical ones.
          </p>
        </div>

        <WarningNote>
          <strong>Ad Category:</strong> Facebook will ask you to select an ad category (housing, credit, politics, etc.).
          For self-storage, you do not select any of these boxes. Self-storage is classified as a general ad.
          Selecting a housing category would restrict your targeting options unnecessarily.
        </WarningNote>

        {/* ═══════ SECTION 5: BUYING TYPE ═══════ */}
        <div className="mt-16" />
        <SectionHeading
          id="buying-type"
          number="5"
          title="Buying Types: Auction vs. Reservation"
          subtitle="This determines how you pay for ad space and how your budget gets allocated."
        />

        <div className="grid sm:grid-cols-2 gap-4 my-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={18} className="text-brand-600" />
              <h3 className="font-bold text-slate-900">Auction</h3>
            </div>
            <ul className="space-y-2">
              {[
                'Priced based on a real-time bidding system',
                'Launches instantly — no scheduling delay',
                'More flexible placement and budget control',
                'More precise targeting options',
                'Best for local, focused campaigns',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 size={14} className="text-brand-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-4 bg-brand-50 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-brand-700">Recommended for self-storage</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={18} className="text-slate-500" />
              <h3 className="font-bold text-slate-900">Reservation</h3>
            </div>
            <ul className="space-y-2">
              {[
                'Fixed price — no bidding variability',
                'Booked in advance, launches on schedule',
                'Guaranteed placement and visibility',
                'Broader reach targeting',
                'Better for brand awareness campaigns',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                  <CircleDot size={14} className="text-slate-400 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <OperatorNote>
          For self-storage, Auction is almost always the right choice. Storage is a proximity-based business — most
          renters choose based on distance from their home. The focused, local reach of an Auction campaign maps
          directly to how storage demand actually works. You do not need national reach. You need hyper-local precision.
        </OperatorNote>

        {/* ═══════ SECTION 6: OBJECTIVES ═══════ */}
        <div className="mt-16" />
        <SectionHeading
          id="objectives"
          number="6"
          title="Campaign Objectives: What Facebook Offers"
          subtitle="Your campaign objective tells Facebook what you want to accomplish — and it will optimize ad delivery accordingly."
        />

        <div className="space-y-3 my-6">
          {[
            {
              name: 'Awareness',
              desc: 'Gets your ad in front of people most likely to remember it. Good for new facilities building local name recognition.',
              fit: 'secondary',
              icon: Eye,
            },
            {
              name: 'Traffic',
              desc: 'Drives clicks to your website. If your site converts well, this pushes visitors to your rates page or contact form.',
              fit: 'primary',
              icon: MousePointerClick,
            },
            {
              name: 'Engagement',
              desc: 'Optimizes for people who will message you or interact with your post. Useful for starting conversations.',
              fit: 'secondary',
              icon: MessageSquare,
            },
            {
              name: 'Leads',
              desc: 'Collects information from potential customers through forms or calls — directly inside Facebook without sending them to your website.',
              fit: 'primary',
              icon: Users,
            },
            {
              name: 'App Promotion',
              desc: 'Encourages app downloads. Not relevant for self-storage operators.',
              fit: 'skip',
              icon: Smartphone,
            },
            {
              name: 'Sales',
              desc: 'Puts ads in front of people Facebook thinks are ready to buy. Tempting to always choose, but works best when combined with retargeting data.',
              fit: 'primary',
              icon: DollarSign,
            },
          ].map((obj) => (
            <div key={obj.name} className={`flex items-start gap-4 rounded-xl p-5 border ${
              obj.fit === 'primary' ? 'bg-brand-50 border-brand-200' :
              obj.fit === 'skip' ? 'bg-slate-50 border-slate-200 opacity-60' :
              'bg-white border-slate-200'
            }`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                obj.fit === 'primary' ? 'bg-brand-600' :
                obj.fit === 'skip' ? 'bg-slate-300' :
                'bg-slate-100'
              }`}>
                <obj.icon size={18} className={obj.fit === 'primary' ? 'text-white' : obj.fit === 'skip' ? 'text-slate-500' : 'text-slate-600'} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900">{obj.name}</h3>
                  {obj.fit === 'primary' && <span className="text-[10px] font-bold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full uppercase">Best for Storage</span>}
                  {obj.fit === 'skip' && <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full uppercase">Skip</span>}
                </div>
                <p className="text-sm text-slate-600">{obj.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <OperatorNote>
          Here is where self-storage breaks from conventional marketing advice. In most industries, awareness and
          engagement campaigns build long-term brand equity. In storage, demand is needs-based — people rent when
          they have to, not because they saw your brand seven times. That means Traffic, Leads, and Sales objectives
          are almost always your primary focus. I run awareness campaigns only for brand-new lease-up facilities
          that need to establish local presence from zero.
        </OperatorNote>

        {/* ═══════ SECTION 7: BUDGET ═══════ */}
        <div className="mt-16" />
        <SectionHeading
          id="budget"
          number="7"
          title="Budget & Schedule Strategy"
          subtitle="How much you spend — and how Facebook allocates it."
        />

        <div className="text-slate-600 leading-relaxed space-y-4">
          <p>
            Facebook offers two budgeting models: <strong>Daily Budget</strong> and <strong>Lifetime Budget</strong>.
            Both set hard spending limits — Facebook will not exceed what you authorize.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 my-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-bold text-slate-900 mb-2">Daily Budget</h3>
            <p className="text-sm text-slate-600 mb-3">
              Sets a maximum spend per day. The ad runs at the optimal time each day until the daily budget is exhausted,
              then pauses until the next day.
            </p>
            <div className="bg-slate-50 rounded-lg px-3 py-2">
              <p className="text-xs text-slate-500"><strong>Best when:</strong> Your budget fluctuates, or you want tight daily control over spend.</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-bold text-slate-900 mb-2">Lifetime Budget</h3>
            <p className="text-sm text-slate-600 mb-3">
              Sets a total amount for the entire campaign duration. Facebook allocates the spend over time
              based on performance data, trying to maximize results per dollar.
            </p>
            <div className="bg-slate-50 rounded-lg px-3 py-2">
              <p className="text-xs text-slate-500"><strong>Best when:</strong> You want to set it and let Facebook optimize distribution automatically.</p>
            </div>
          </div>
        </div>

        <OperatorNote>
          For most storage operators, I recommend starting with a daily budget of $20–50 per day. That gives
          you enough data to see what is working without burning through cash. Once we know which audiences
          and creative are performing, we scale up deliberately. The minimum recommended monthly ad budget
          I work with is $1,000 — anything below that does not generate enough data to optimize effectively.
        </OperatorNote>

        <p className="text-slate-600 leading-relaxed">
          Facebook also offers <strong>Advantage+</strong> budget optimization, which uses AI to automatically
          distribute funds across ad sets based on performance. It works well when you have multiple ad sets
          running simultaneously, but gives you less manual control. For first-time campaigns, manual control
          is usually better until you have performance data to validate the AI's decisions.
        </p>

        {/* ═══════ SECTION 8: AUDIENCE ═══════ */}
        <div className="mt-16" />
        <SectionHeading
          id="audience"
          number="8"
          title="Audience Targeting for Storage"
          subtitle="This is where most agencies waste your money — and where operator knowledge makes the biggest difference."
        />

        <div className="text-slate-600 leading-relaxed space-y-4">
          <p>
            Facebook lets you target by location, age, language, interests, behaviors, and more.
            But here is the critical insight for self-storage: <strong>proximity is everything</strong>.
            There is almost no value in your ad reaching the right age group if they live an hour away.
            Location targeting should always be your primary filter.
          </p>
          <p>
            Set a radius around your facility (typically 10–20 miles depending on your market density)
            and let that be the hard boundary. Then layer in secondary filters like age range and
            language as refinements — not the other way around.
          </p>
        </div>

        <div className="bg-slate-900 rounded-xl p-6 my-6">
          <h3 className="font-bold text-white mb-4">Targeting Priority for Self-Storage</h3>
          <div className="space-y-3">
            {[
              { priority: 'Primary', label: 'Location radius around your facility', detail: '10–20 mile radius based on market density' },
              { priority: 'Secondary', label: 'Life-event and behavioral signals', detail: 'Recently moved, listed home for sale, recently engaged/divorced' },
              { priority: 'Tertiary', label: 'Age and demographics', detail: 'Gen Z uses Instagram more; much older demographics less active on Meta' },
            ].map((item, i) => (
              <div key={item.priority} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0 ? 'bg-brand-500 text-white' : i === 1 ? 'bg-brand-700 text-brand-200' : 'bg-slate-700 text-slate-400'
                }`}>{i + 1}</div>
                <div>
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <WarningNote>
          <strong>The biggest waste of ad money in storage:</strong> Even if you target a specific radius, you are still
          sending ads to thousands of people who have zero interest in renting a storage unit. This is why
          general Facebook ads — without retargeting — have limited ROI for storage. The real power comes
          from Custom Audiences and the Meta Pixel, which we cover below. That is where the game changes.
        </WarningNote>

        <InlineCTA
          heading="This is exactly what I handle for operators."
          text="Audience targeting, pixel setup, retargeting, creative — all built around your specific vacancy gaps and local market."
        />

        {/* ═══════ SECTION 9: PLACEMENT ═══════ */}
        <div className="mt-16" />
        <SectionHeading
          id="placement"
          number="9"
          title="Ad Placement Options"
          subtitle="Where your ad actually appears across Facebook and Instagram."
        />

        <div className="text-slate-600 leading-relaxed space-y-4">
          <p>
            Facebook offers multiple placement options for your ads. You can let Advantage+ automate this,
            or choose manually. Here are the main options:
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
          {[
            { icon: LayoutGrid, label: 'Feeds', desc: 'Facebook & Instagram main feeds' },
            { icon: Play, label: 'Stories & Reels', desc: 'Full-screen vertical format' },
            { icon: Monitor, label: 'In-Stream', desc: 'During video content' },
            { icon: Search, label: 'Search Results', desc: 'Facebook search listings' },
            { icon: MessageSquare, label: 'Messages', desc: 'Messenger inbox' },
            { icon: Layers, label: 'Reels Overlay', desc: 'Overlaid on Reels content' },
            { icon: Globe, label: 'Apps & Sites', desc: 'Meta Audience Network' },
            { icon: Image, label: 'Marketplace', desc: 'Facebook Marketplace' },
          ].map((item) => (
            <div key={item.label} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <item.icon size={20} className="text-brand-600 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-900">{item.label}</p>
              <p className="text-[10px] text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>

        <OperatorNote>
          Do not select everything. Each placement type has different costs and format requirements. More
          importantly, when you are tracking effectiveness over time, fewer variables means cleaner data.
          For storage campaigns, I primarily run Feed ads (Facebook and Instagram) and Stories. Those are
          where your local audience is most active and where the creative formats work best for showing
          facility images and unit availability.
        </OperatorNote>

        {/* ═══════ SECTION 10: CREATIVE ═══════ */}
        <div className="mt-16" />
        <SectionHeading
          id="creative"
          number="10"
          title="Ad Creative & Format"
          subtitle="The actual content people see — image, video, headline, and call-to-action."
        />

        <div className="text-slate-600 leading-relaxed space-y-4">
          <p>
            Facebook offers three main ad formats:
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 my-6">
          {[
            {
              format: 'Single Image or Video',
              desc: 'One image or video with headline and description. The most common and versatile format for storage ads.',
              best: true,
              icon: Image,
            },
            {
              format: 'Carousel',
              desc: 'Multiple images or videos users can swipe through. Great for showing different unit types or facility features.',
              best: true,
              icon: Layers,
            },
            {
              format: 'Collection',
              desc: 'A group of products displayed as a full-screen mobile experience. Designed for e-commerce — not a strong fit for storage.',
              best: false,
              icon: LayoutGrid,
            },
          ].map((item) => (
            <div key={item.format} className={`rounded-xl p-5 border ${item.best ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
              <item.icon size={24} className={item.best ? 'text-brand-600 mb-3' : 'text-slate-400 mb-3'} />
              <h3 className="font-semibold text-slate-900 mb-1.5">{item.format}</h3>
              <p className="text-sm text-slate-600">{item.desc}</p>
              {item.best && <span className="inline-block mt-2 text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">Good for Storage</span>}
            </div>
          ))}
        </div>

        <div className="text-slate-600 leading-relaxed space-y-4">
          <p>
            Under your chosen format, you upload media and write your ad text. The most important element is your
            <strong> call-to-action (CTA)</strong>. This is what you are asking the viewer to do — visit your website,
            call your facility, fill out a form, or reserve a unit.
          </p>
          <p>
            Your CTA should align with your campaign objective. If your goal is leads, the CTA should be
            "Get a Quote" or "Reserve Your Unit." If your goal is traffic, the CTA should be "See Prices" or
            "View Available Units." Make it specific and action-oriented.
          </p>
        </div>

        <OperatorNote>
          This is where operator knowledge matters most. Generic agencies write generic ad copy —
          things like "secure storage solutions" or "safe and convenient." That does not convert.
          I write ads around specific demand triggers: "Moving this month? Reserve your 10x10 before
          it is gone." or "Downsizing? First month free on climate-controlled units." The creative has
          to speak to the specific reason someone needs storage right now.
        </OperatorNote>

        <div className="text-slate-600 leading-relaxed space-y-4 mt-4">
          <p>
            The final setting is <strong>Destination</strong> — where clicking the ad sends someone. Facebook will
            suggest their own landing page (Instant Experience), but you can also send people directly to your
            website or inbox. For storage, sending them to your rates page or a dedicated landing page with
            unit availability is almost always the best choice. If someone clicks your ad, they are interested in
            renting — send them to a page where they can.
          </p>
        </div>

        {/* ═══════ SECTION 11: META PIXEL ═══════ */}
        <div className="mt-16" />
        <SectionHeading
          id="meta-pixel"
          number="11"
          title="The Meta Pixel: Your Data Collection Engine"
          subtitle="This is where Facebook advertising shifts from basic to powerful — and where the real ROI lives for self-storage."
        />

        <div className="bg-slate-900 rounded-xl p-6 my-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-brand-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Code size={24} className="text-brand-400" />
            </div>
            <div>
              <h3 className="font-bold text-white mb-2">What Is the Meta Pixel?</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                The Meta Pixel is a small snippet of code you install on your website. It has one job:
                track what visitors do on your site and report that data back to Facebook. Which pages
                they view, how long they stay, whether they fill out a form, whether they leave without acting.
                That data becomes the foundation for everything that follows.
              </p>
            </div>
          </div>
        </div>

        <div className="text-slate-600 leading-relaxed space-y-4">
          <p>
            With the Meta Pixel installed, Facebook can tell you exactly who visited your website but left
            without taking action — no form fill, no phone call, no move-in. That group of people is gold.
            They already showed interest in your facility. They just did not convert yet.
          </p>
          <p>
            The Pixel also enables Facebook to build <strong>Custom Audiences</strong> based on real visitor behavior,
            and to create <strong>Lookalike Audiences</strong> — groups of new people who resemble your existing
            website visitors in demographics, behavior, and interests. Both of these are dramatically more
            effective than generic targeting.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 my-6">
          <h3 className="font-bold text-slate-900 mb-3">What the Meta Pixel Tracks</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              'Page views (which pages visitors see)',
              'Time on site (how long they browse)',
              'Form submissions (leads captured)',
              'Button clicks (reserve, call, directions)',
              'Cart additions (if you have online reservations)',
              'Website exits (where visitors drop off)',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
                <div className="w-1.5 h-1.5 bg-brand-500 rounded-full shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <OperatorNote>
          The Meta Pixel is the single most important technical setup for any storage facility running Meta ads.
          Without it, you are running blind — spending money on broad audiences with no feedback loop.
          With it, you have a data engine that gets smarter over time. I install and configure the pixel as
          part of every campaign I build. It is not optional.
        </OperatorNote>

        {/* ═══════ SECTION 12: RETARGETING ═══════ */}
        <div className="mt-16" />
        <SectionHeading
          id="retargeting"
          number="12"
          title="Retargeting: The Real Weapon"
          subtitle="This is the tactic that makes Meta ads actually work for self-storage — and the reason most generic agencies fall short."
        />

        <div className="text-slate-600 leading-relaxed space-y-4">
          <p>
            Here is the core concept: the Meta Pixel identifies people who visited your website but did not convert.
            Retargeting sends ads <em>specifically to those people</em> — following them on Facebook and Instagram
            until they come back and take action. Instead of casting a wide net to strangers, you are putting
            your ad budget behind people who already raised their hand.
          </p>
          <p>
            In marketing, there is a concept often called the Rule of Seven — potential customers need to see your
            brand multiple times before they make a decision. Retargeting is how you get those additional touchpoints
            in front of the right people without wasting money on everyone else.
          </p>
        </div>

        <div className="bg-brand-600 rounded-xl p-6 my-6">
          <h3 className="font-bold text-white mb-4">How Retargeting Works for Storage</h3>
          <div className="grid sm:grid-cols-4 gap-3">
            {[
              { step: '1', title: 'Visitor Arrives', desc: 'Someone visits your website — maybe from Google, maybe from a basic Facebook ad, maybe direct.' },
              { step: '2', title: 'Pixel Fires', desc: 'The Meta Pixel records their visit, what pages they viewed, and whether they took any action.' },
              { step: '3', title: 'They Leave', desc: 'They browse your rates page but do not call, fill out a form, or reserve. They leave your site.' },
              { step: '4', title: 'Retargeted Ad', desc: 'Within hours, they see your ad on Facebook or Instagram — specific to what they viewed. Your facility stays top of mind.' },
            ].map((item) => (
              <div key={item.step} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
                <span className="text-xs font-bold text-brand-200 uppercase">Step {item.step}</span>
                <h4 className="font-semibold text-white mt-1 mb-1">{item.title}</h4>
                <p className="text-xs text-brand-100">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-slate-600 leading-relaxed space-y-4">
          <p>
            This is fundamentally different from sending ads to random people in a radius. You are spending money
            on people who have already demonstrated interest. The conversion rates are dramatically higher, and the
            cost per lead drops significantly because you are not wasting impressions on people who will never need storage.
          </p>
          <p>
            For self-storage specifically, retargeting is powerful because the purchase decision is often time-sensitive
            but not instant. Someone looking at your rates page today might need to move in two weeks. If you are not
            following up with retargeted ads during that window, your competitor will be.
          </p>
        </div>

        <OperatorNote>
          This is the centerpiece of every campaign I build. Basic Facebook ads are just the opening move.
          Retargeting is where the real ROI lives. I set up the pixel, build custom audiences from your
          website traffic, create retargeting campaigns with ads tailored to what visitors actually viewed,
          and run this as an ongoing system — not a one-time blast. Most generic agencies skip this entirely
          because they do not know how to configure it properly for storage.
        </OperatorNote>

        <InlineCTA
          heading="Pixel setup. Custom audiences. Retargeting campaigns. All handled."
          text="I build the complete system — not just the ads — so your facility stays in front of interested prospects until they convert."
        />

        {/* ═══════ SECTION 13: WHY STOWSTACK ═══════ */}
        <div className="mt-16" />
        <SectionHeading
          id="why-stowstack"
          number="13"
          title="Why Operators Hire StowStack Instead of Doing This Themselves"
          subtitle="You just read through the entire process. Here is the honest question: do you want to do all of that yourself?"
        />

        <div className="text-slate-600 leading-relaxed space-y-4">
          <p>
            Running Meta ads for a storage facility is not impossible to learn. But doing it well — with the right
            objectives, the right audiences, the right creative, pixel tracking, retargeting, and ongoing optimization —
            takes significant time, experimentation, and knowledge of both the Meta platform and the storage business.
          </p>
          <p>
            Most operators have facilities to run. They have phones to answer, tenants to manage, units to maintain,
            and occupancy pressure to deal with every day. Learning Facebook Ads Manager, configuring pixels,
            building retargeting audiences, and testing ad creative is a full-time marketing job on top of
            the full-time operations job they already have.
          </p>
          <p>
            That is why I built {BRAND}. I already know both sides — the operations side and the ad platform side.
            I have spent 7 years inside storage and U-Haul operations. I know what actually fills units.
            And I have built the ad system to make it happen in 48–72 hours, not weeks.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 my-8">
          <h3 className="font-bold text-slate-900 mb-4">What You Get When I Handle It</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              'Full facility audit before any ads run',
              'Meta Pixel installed and configured',
              'Custom audiences built from your real traffic',
              'Retargeting campaigns running within 48–72 hours',
              'Ad creative written around your specific vacant unit types',
              'Demand-trigger targeting (moving, divorce, downsizing, etc.)',
              'Call handling and follow-up audit included',
              'Monthly reporting tied to occupancy impact — not vanity metrics',
              'Ongoing optimization based on what is actually converting',
              'Someone who understands storage economics, not just ad settings',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-brand-600 shrink-0 mt-0.5" />
                <span className="text-sm text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 my-6">
          <p className="text-sm text-amber-800">
            <strong>The cost of doing nothing:</strong> 10 empty 10x10 units at $110/month = $1,100 in recurring revenue
            lost every month. Over 90 days, that is $3,300 from just one row of units. The service pays for itself
            if it recovers even a handful of those.
          </p>
        </div>

        {/* ─── FINAL CTA ─── */}
        <div id="guide-cta" className="scroll-mt-24 bg-slate-900 rounded-2xl p-8 mt-12">
          <div className="text-center max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-brand-500/20 text-brand-300 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-brand-500/30">
              <Rocket size={14} /> Campaigns Live in 48–72 Hours
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Ready to Stop Losing Revenue to Empty Units?
            </h2>
            <p className="text-slate-400 mb-6">
              Get a facility audit. I will walk through your vacancy gaps, identify where your funnel is
              leaking conversions, and show you how I fill units — operator to operator.
            </p>
            <a href={CTA_HREF} className="inline-flex items-center gap-2 bg-brand-600 text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-brand-700 transition-all shadow-lg shadow-brand-600/25">
              <Search size={18} /> {PRIMARY_CTA} <ArrowRight size={18} />
            </a>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-brand-400" /> No obligation</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-brand-400" /> Operator-to-operator</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-brand-400" /> 48-72hr launch</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <a href="https://linkedin.com/in/mruhaul" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors">
                <Linkedin size={14} /> LinkedIn
              </a>
              <a href="https://midwayselfstoragemi.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors">
                <Globe size={14} /> My Facility
              </a>
              <a href="mailto:blake@stowstack.com" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors">
                <Mail size={14} /> Email
              </a>
            </div>
          </div>
        </div>

        {/* ─── SOURCE ATTRIBUTION ─── */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <p className="text-xs text-slate-400 text-center">
            Core process framework adapted from StoragePug's Self Storage Marketing Playbook, with additional
            operator-level context and strategic recommendations from {BRAND}.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ─────────────── FOOTER ─────────────── */
function GuideFooter() {
  return (
    <footer className="bg-slate-950 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <Building2 size={14} className="text-white" />
            </div>
            <span className="font-bold text-white">{BRAND}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Self-Storage Ad Engine</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://linkedin.com/in/mruhaul" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
              <Linkedin size={14} /> LinkedIn
            </a>
            <a href="https://midwayselfstoragemi.com" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
              <Globe size={14} /> Midway Self Storage
            </a>
            <a href="mailto:blake@stowstack.com" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
              <Mail size={14} /> Email
            </a>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} {BRAND}. Self-Storage Ad Engine. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════ */
export default function MetaAdsGuide({ onBack }) {
  return (
    <div className="bg-white">
      <GuideNav onBack={onBack} />
      <GuideHero />
      <TableOfContents />
      <GuideContent />
      <GuideFooter />
    </div>
  )
}
