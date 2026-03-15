import { useState, useMemo } from 'react'
import {
  Calendar, Sun, Snowflake, Leaf, Flower2, CloudRain, GraduationCap,
  Home, Heart, Shield, TrendingUp, TrendingDown, Zap, Users,
  ChevronRight, ChevronDown, Play, Pause, Settings, BarChart3,
  Thermometer, DollarSign,
  Target, MessageSquare
} from 'lucide-react'

/* ── Types ── */

interface SeasonalTrigger {
  id: string
  name: string
  category: 'seasonal' | 'life-event' | 'weather' | 'market'
  months: number[] // 0-indexed
  icon: typeof Sun
  color: string
  demandImpact: 'high' | 'medium' | 'low'
  description: string
  unitEmphasis: string[]
  messagingAngles: string[]
  budgetModifier: number // multiplier, e.g. 1.3 = +30%
  adCopy: { headline: string; body: string }[]
  audienceTargeting: string[]
  channels: string[]
}

type PlaybookStatus = 'active' | 'scheduled' | 'inactive'

interface PlaybookOverride {
  triggerId: string
  status: PlaybookStatus
  budgetOverride?: number
  notes?: string
}

/* ── Trigger Data ── */

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const TRIGGERS: SeasonalTrigger[] = [
  // ── Seasonal ──
  {
    id: 'spring-cleaning',
    name: 'Spring Cleaning & Declutter',
    category: 'seasonal',
    months: [2, 3, 4],
    icon: Flower2,
    color: 'emerald',
    demandImpact: 'high',
    description: 'Spring cleaning drives decluttering. Households purge winter gear, rotate wardrobes, and tackle garage cleanouts. Peak demand for small-to-medium units.',
    unitEmphasis: ['5×5', '5×10', '10×10', 'Climate-controlled'],
    messagingAngles: [
      'Declutter your home this spring',
      'Make room for what matters',
      'Spring cleaning? We\'ve got the space',
      'Out with the old — store it, don\'t toss it',
    ],
    budgetModifier: 1.25,
    adCopy: [
      { headline: 'Spring Cleaning Starts Here', body: 'Declutter your home without throwing it all away. Affordable storage from $X/mo.' },
      { headline: 'Too Much Stuff? We Get It.', body: 'Spring cleaning doesn\'t mean losing things you love. Store with us starting at $X/mo.' },
    ],
    audienceTargeting: ['Homeowners 30-55', 'Home improvement interest', 'Marie Kondo / organizing content'],
    channels: ['Meta Ads', 'Google Search', 'Local Display'],
  },
  {
    id: 'summer-moves',
    name: 'Summer Moving Season',
    category: 'seasonal',
    months: [4, 5, 6, 7],
    icon: Sun,
    color: 'amber',
    demandImpact: 'high',
    description: 'Peak moving season. Families relocate between school years, leases turn over, and home sales close. Highest overall storage demand of the year.',
    unitEmphasis: ['10×10', '10×15', '10×20', '10×30', 'Drive-up'],
    messagingAngles: [
      'Moving? Store between homes',
      'Sold your house — need time before the new one?',
      'Temporary storage while you settle in',
      'Don\'t rush your move — store with us',
    ],
    budgetModifier: 1.40,
    adCopy: [
      { headline: 'Moving This Summer?', body: 'Bridge the gap between homes. Month-to-month storage, no long-term commitment.' },
      { headline: 'Between Homes? We\'ve Got You.', body: 'Flexible storage for your move. Drive-up access, month-to-month, from $X/mo.' },
    ],
    audienceTargeting: ['Recent home sellers', 'Apartment lease expiring', 'Moving company searches', 'New to area'],
    channels: ['Google Search', 'Meta Ads', 'Google Local Services'],
  },
  {
    id: 'college-move',
    name: 'College Move-In/Move-Out',
    category: 'seasonal',
    months: [4, 5, 7, 8],
    icon: GraduationCap,
    color: 'blue',
    demandImpact: 'high',
    description: 'College students need summer storage (May-Jun) and move-in storage (Aug-Sep). High volume of small units near university towns.',
    unitEmphasis: ['5×5', '5×10', '10×10', 'Climate-controlled'],
    messagingAngles: [
      'Headed home for summer? Store your dorm stuff here',
      'Student storage — pickup & delivery available',
      'Don\'t haul it home, store it close to campus',
      'Back to school? Your stuff\'s been safe with us',
    ],
    budgetModifier: 1.30,
    adCopy: [
      { headline: 'Student Summer Storage', body: 'Don\'t ship it home. Store near campus from $X/mo. Easy move-in, flexible terms.' },
      { headline: 'Dorm Closing? We\'re Ready.', body: 'Affordable student storage just minutes from campus. Reserve your unit now.' },
    ],
    audienceTargeting: ['College students 18-24', 'University parents', 'Dorm life interest', 'College town geo-fence'],
    channels: ['Meta Ads', 'TikTok', 'Instagram', 'Campus flyers'],
  },
  {
    id: 'holiday-storage',
    name: 'Holiday Decoration Storage',
    category: 'seasonal',
    months: [0, 10, 11],
    icon: Snowflake,
    color: 'sky',
    demandImpact: 'medium',
    description: 'Pre-holiday prep and post-holiday cleanup. People store decorations, seasonal items, and gifts. Good for small climate-controlled units.',
    unitEmphasis: ['5×5', '5×10', 'Climate-controlled'],
    messagingAngles: [
      'Make room for the holidays',
      'Store your decorations safely year-round',
      'Post-holiday cleanup — we\'ll hold onto it',
      'New gifts, no space? We can help',
    ],
    budgetModifier: 1.10,
    adCopy: [
      { headline: 'Holiday Clutter? Solved.', body: 'Store seasonal decorations and free up your garage. Climate-controlled from $X/mo.' },
      { headline: 'Make Room for the Holidays', body: 'Clear out the guest room, store the extras. Affordable monthly storage.' },
    ],
    audienceTargeting: ['Homeowners', 'Holiday shopping interest', 'Home decor interest'],
    channels: ['Meta Ads', 'Google Display', 'Email'],
  },
  {
    id: 'new-year-declutter',
    name: 'New Year Resolution Declutter',
    category: 'seasonal',
    months: [0, 1],
    icon: Zap,
    color: 'violet',
    demandImpact: 'medium',
    description: 'New Year resolutions drive organizing and decluttering. "New year, new space" messaging resonates. Good conversion window for first-time renters.',
    unitEmphasis: ['5×5', '5×10', '10×10'],
    messagingAngles: [
      'New year, cleaner space',
      'Resolution #1: Get organized',
      'Start fresh — declutter your home this January',
      'Finally tackle that garage this year',
    ],
    budgetModifier: 1.15,
    adCopy: [
      { headline: 'New Year, New Space', body: 'Start 2026 clutter-free. Affordable self-storage starting at $X/mo.' },
      { headline: 'Resolution: Get Organized', body: 'We\'ll help you keep it. Month-to-month storage, no commitments.' },
    ],
    audienceTargeting: ['Resolution content consumers', 'Organizing & productivity interest', 'Homeowners 25-55'],
    channels: ['Meta Ads', 'Google Search', 'Email drip'],
  },
  {
    id: 'fall-transition',
    name: 'Fall Transition & Prep',
    category: 'seasonal',
    months: [8, 9, 10],
    icon: Leaf,
    color: 'orange',
    demandImpact: 'medium',
    description: 'Seasonal gear swaps — summer items go in, winter items come out. Boat/RV storage demand peaks. Good for vehicle and outdoor equipment units.',
    unitEmphasis: ['10×20', '10×30', 'Vehicle/RV/Boat', 'Outdoor parking'],
    messagingAngles: [
      'Store your boat before winter hits',
      'RV season\'s over — park it safe with us',
      'Swap summer gear for winter — we\'ll hold the rest',
      'Protect your toys from the elements',
    ],
    budgetModifier: 1.20,
    adCopy: [
      { headline: 'Winter-Ready Your Garage', body: 'Store boats, RVs, and summer gear. Covered and outdoor parking available.' },
      { headline: 'Boat Storage Season Is Here', body: 'Don\'t leave it in the driveway. Secure, affordable vehicle storage from $X/mo.' },
    ],
    audienceTargeting: ['Boat owners', 'RV enthusiasts', 'Outdoor recreation interest', 'Marina proximity'],
    channels: ['Google Search', 'Meta Ads', 'Boating forums'],
  },

  // ── Life Events ──
  {
    id: 'home-renovation',
    name: 'Home Renovation',
    category: 'life-event',
    months: [2, 3, 4, 5, 6, 7, 8, 9],
    icon: Home,
    color: 'teal',
    demandImpact: 'high',
    description: 'Renovations require clearing rooms. Furniture, belongings need temporary storage for weeks or months. Strong year-round but peaks spring–fall.',
    unitEmphasis: ['10×10', '10×15', '10×20', 'Climate-controlled'],
    messagingAngles: [
      'Renovating? Store your furniture while the work gets done',
      'Protect your stuff during construction',
      'Temporary storage for home projects',
      'Kitchen remodel? We\'ll hold your dining set',
    ],
    budgetModifier: 1.20,
    adCopy: [
      { headline: 'Home Reno? Store Your Stuff.', body: 'Keep furniture safe during renovations. Flexible terms, drive-up access.' },
      { headline: 'Remodeling? We\'ll Hold Your Things.', body: 'Month-to-month storage while the contractors work. From $X/mo.' },
    ],
    audienceTargeting: ['Home renovation interest', 'Contractor services searchers', 'Home Depot/Lowe\'s shoppers'],
    channels: ['Google Search', 'Meta Ads', 'Nextdoor'],
  },
  {
    id: 'divorce-separation',
    name: 'Divorce / Separation',
    category: 'life-event',
    months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    icon: Heart,
    color: 'rose',
    demandImpact: 'medium',
    description: 'Divorce filings spike in January–March. People need storage while sorting living arrangements. Sensitive messaging required — focus on "fresh start" not the event.',
    unitEmphasis: ['10×10', '10×15', '5×10'],
    messagingAngles: [
      'Starting fresh? We\'ll help you store what matters',
      'Need space while you figure things out?',
      'Flexible storage for life transitions',
      'Your stuff, safe and accessible — on your timeline',
    ],
    budgetModifier: 1.10,
    adCopy: [
      { headline: 'Life Changing? Store With Flexibility.', body: 'No long-term contracts. Access your things anytime. From $X/mo.' },
      { headline: 'Need Space? Take Your Time.', body: 'Month-to-month storage for life transitions. Secure, accessible, affordable.' },
    ],
    audienceTargeting: ['Life transition interest', 'Apartment hunting', 'Recently moved'],
    channels: ['Google Search', 'Meta Ads'],
  },
  {
    id: 'military-deployment',
    name: 'Military Deployment / PCS',
    category: 'life-event',
    months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    icon: Shield,
    color: 'slate',
    demandImpact: 'medium',
    description: 'PCS moves and deployments create long-term storage needs. Facilities near military bases see consistent demand. Military discounts drive loyalty.',
    unitEmphasis: ['10×15', '10×20', '10×30', 'Vehicle/RV/Boat'],
    messagingAngles: [
      'Deploying? Your belongings are safe with us',
      'PCS move — store while you relocate',
      'Military discount: 15% off monthly rate',
      'We serve those who serve — secure storage for military families',
    ],
    budgetModifier: 1.05,
    adCopy: [
      { headline: 'Military Storage — 15% Discount', body: 'PCS or deployment? We\'ll keep your things safe. Military families get 15% off.' },
      { headline: 'Deploying Soon?', body: 'Long-term storage with military discount. Secure, climate-controlled, month-to-month.' },
    ],
    audienceTargeting: ['Military affiliation', 'Base proximity geo-fence', 'Military family groups'],
    channels: ['Google Search', 'Meta Ads', 'Base bulletin boards'],
  },
  {
    id: 'downsizing',
    name: 'Downsizing / Empty Nest',
    category: 'life-event',
    months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    icon: TrendingDown,
    color: 'indigo',
    demandImpact: 'medium',
    description: 'Retirees and empty-nesters moving to smaller homes. Sentimental items, furniture, and family heirlooms need long-term climate-controlled storage.',
    unitEmphasis: ['10×10', '10×15', 'Climate-controlled'],
    messagingAngles: [
      'Downsizing doesn\'t mean giving up what you love',
      'Keep the memories, not the clutter',
      'Moving to a smaller place? We\'ve got the overflow',
      'Your grandmother\'s china deserves climate-controlled care',
    ],
    budgetModifier: 1.10,
    adCopy: [
      { headline: 'Downsizing? Keep What Matters.', body: 'Climate-controlled storage for the things you can\'t part with. From $X/mo.' },
      { headline: 'Smaller Home, Same Memories', body: 'Store heirlooms, furniture, and more. Secure, affordable, climate-controlled.' },
    ],
    audienceTargeting: ['55+ homeowners', 'Downsizing interest', 'Senior living searches', 'Estate planning'],
    channels: ['Google Search', 'Meta Ads', 'Facebook Groups'],
  },
  {
    id: 'estate-death',
    name: 'Estate & Probate',
    category: 'life-event',
    months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    icon: Home,
    color: 'gray',
    demandImpact: 'low',
    description: 'After a death, families need to clear out a home during probate. Sensitive messaging required. Longer rental duration average.',
    unitEmphasis: ['10×15', '10×20', '10×30'],
    messagingAngles: [
      'Take the time you need — we\'ll hold everything safely',
      'Clearing a loved one\'s home? We can help',
      'Flexible storage while you sort through belongings',
    ],
    budgetModifier: 1.0,
    adCopy: [
      { headline: 'Storage While You Sort Things Out', body: 'No rush. Flexible, month-to-month storage for estate cleanouts. Compassionate service.' },
    ],
    audienceTargeting: ['Estate sale interest', 'Probate searches', 'Senior care proximity'],
    channels: ['Google Search'],
  },

  // ── Weather ──
  {
    id: 'hurricane-season',
    name: 'Hurricane / Storm Prep',
    category: 'weather',
    months: [5, 6, 7, 8, 9, 10],
    icon: CloudRain,
    color: 'cyan',
    demandImpact: 'high',
    description: 'Coastal and flood-prone areas see storage demand spike before and after storms. Elevated/climate-controlled units at premium.',
    unitEmphasis: ['Climate-controlled', '2nd floor units', '10×10', '10×15'],
    messagingAngles: [
      'Protect your valuables before the storm hits',
      'Elevated, climate-controlled storage — hurricane ready',
      'Don\'t wait for the warning — secure your space now',
      'Storm recovery? We have immediate availability',
    ],
    budgetModifier: 1.35,
    adCopy: [
      { headline: 'Hurricane Season — Protect Your Stuff', body: 'Elevated, climate-controlled units available. Reserve before the rush.' },
      { headline: 'Storm Coming? Be Prepared.', body: 'Secure storage above flood level. Climate-controlled, 24/7 access.' },
    ],
    audienceTargeting: ['Coastal residents', 'Flood zone homeowners', 'Hurricane prep searches'],
    channels: ['Google Search', 'Meta Ads', 'Local radio/display'],
  },
  {
    id: 'extreme-heat',
    name: 'Extreme Heat Protection',
    category: 'weather',
    months: [5, 6, 7, 8],
    icon: Thermometer,
    color: 'red',
    demandImpact: 'medium',
    description: 'Extreme heat damages electronics, wine, photos, and furniture. Climate-controlled unit demand increases in southern/western markets.',
    unitEmphasis: ['Climate-controlled'],
    messagingAngles: [
      'Heat can destroy electronics and photos — store them safely',
      'Climate-controlled storage: your stuff stays cool',
      'Don\'t let the heat ruin what you\'re storing',
      '110°F outside, 72°F inside our units',
    ],
    budgetModifier: 1.15,
    adCopy: [
      { headline: 'Too Hot for Your Garage?', body: 'Climate-controlled storage keeps your things safe from extreme heat. From $X/mo.' },
    ],
    audienceTargeting: ['Wine collectors', 'Electronics hobbyists', 'Southern/desert geo', 'Temperature-sensitive searches'],
    channels: ['Google Search', 'Meta Ads'],
  },

  // ── Market ──
  {
    id: 'tax-season',
    name: 'Tax Season Business Storage',
    category: 'market',
    months: [1, 2, 3],
    icon: DollarSign,
    color: 'green',
    demandImpact: 'low',
    description: 'Small businesses need document storage for tax records. Tax refunds also fund storage rentals for personal items.',
    unitEmphasis: ['5×5', '5×10', 'Climate-controlled'],
    messagingAngles: [
      'Tax refund? Finally get organized',
      'Business document storage — secure & accessible',
      'Got your refund? Invest in a clutter-free home',
    ],
    budgetModifier: 1.05,
    adCopy: [
      { headline: 'Tax Refund = Clutter-Free Home', body: 'Use your refund to finally get organized. Storage from $X/mo.' },
    ],
    audienceTargeting: ['Small business owners', 'Tax preparation interest', 'Refund anticipation'],
    channels: ['Google Search', 'Email'],
  },
  {
    id: 'small-biz-inventory',
    name: 'Small Business Inventory',
    category: 'market',
    months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    icon: BarChart3,
    color: 'purple',
    demandImpact: 'medium',
    description: 'E-commerce sellers, contractors, and small retailers need overflow inventory storage year-round. Larger units, longer terms, commercial rates.',
    unitEmphasis: ['10×15', '10×20', '10×30', 'Drive-up'],
    messagingAngles: [
      'Growing business? We\'ve got the warehouse space',
      'E-commerce inventory storage — drive-up access',
      'Cheaper than a warehouse, more flexible than a lease',
      'Contractor tool and material storage',
    ],
    budgetModifier: 1.10,
    adCopy: [
      { headline: 'Business Storage That Scales', body: 'Drive-up access, month-to-month flexibility. No warehouse lease required.' },
      { headline: 'E-Commerce Overflow? Sorted.', body: 'Store inventory close to your operation. Large units available, flexible terms.' },
    ],
    audienceTargeting: ['Small business owners', 'E-commerce sellers', 'Etsy/Amazon seller interest', 'Contractor services'],
    channels: ['Google Search', 'Meta Ads', 'LinkedIn'],
  },
]

/* ── Color helpers ── */

const COLOR_MAP: Record<string, { bg: string; bgDark: string; text: string; textDark: string; border: string; borderDark: string; badge: string; badgeDark: string }> = {
  emerald:  { bg: 'bg-emerald-50', bgDark: 'bg-emerald-900/20', text: 'text-emerald-700', textDark: 'text-emerald-400', border: 'border-emerald-200', borderDark: 'border-emerald-800', badge: 'bg-emerald-100 text-emerald-700', badgeDark: 'bg-emerald-900/40 text-emerald-400' },
  amber:    { bg: 'bg-amber-50', bgDark: 'bg-amber-900/20', text: 'text-amber-700', textDark: 'text-amber-400', border: 'border-amber-200', borderDark: 'border-amber-800', badge: 'bg-amber-100 text-amber-700', badgeDark: 'bg-amber-900/40 text-amber-400' },
  blue:     { bg: 'bg-blue-50', bgDark: 'bg-blue-900/20', text: 'text-blue-700', textDark: 'text-blue-400', border: 'border-blue-200', borderDark: 'border-blue-800', badge: 'bg-blue-100 text-blue-700', badgeDark: 'bg-blue-900/40 text-blue-400' },
  sky:      { bg: 'bg-sky-50', bgDark: 'bg-sky-900/20', text: 'text-sky-700', textDark: 'text-sky-400', border: 'border-sky-200', borderDark: 'border-sky-800', badge: 'bg-sky-100 text-sky-700', badgeDark: 'bg-sky-900/40 text-sky-400' },
  violet:   { bg: 'bg-violet-50', bgDark: 'bg-violet-900/20', text: 'text-violet-700', textDark: 'text-violet-400', border: 'border-violet-200', borderDark: 'border-violet-800', badge: 'bg-violet-100 text-violet-700', badgeDark: 'bg-violet-900/40 text-violet-400' },
  orange:   { bg: 'bg-orange-50', bgDark: 'bg-orange-900/20', text: 'text-orange-700', textDark: 'text-orange-400', border: 'border-orange-200', borderDark: 'border-orange-800', badge: 'bg-orange-100 text-orange-700', badgeDark: 'bg-orange-900/40 text-orange-400' },
  teal:     { bg: 'bg-teal-50', bgDark: 'bg-teal-900/20', text: 'text-teal-700', textDark: 'text-teal-400', border: 'border-teal-200', borderDark: 'border-teal-800', badge: 'bg-teal-100 text-teal-700', badgeDark: 'bg-teal-900/40 text-teal-400' },
  rose:     { bg: 'bg-rose-50', bgDark: 'bg-rose-900/20', text: 'text-rose-700', textDark: 'text-rose-400', border: 'border-rose-200', borderDark: 'border-rose-800', badge: 'bg-rose-100 text-rose-700', badgeDark: 'bg-rose-900/40 text-rose-400' },
  slate:    { bg: 'bg-slate-50', bgDark: 'bg-slate-800/40', text: 'text-slate-700', textDark: 'text-slate-400', border: 'border-slate-200', borderDark: 'border-slate-700', badge: 'bg-slate-100 text-slate-600', badgeDark: 'bg-slate-800 text-slate-400' },
  indigo:   { bg: 'bg-indigo-50', bgDark: 'bg-indigo-900/20', text: 'text-indigo-700', textDark: 'text-indigo-400', border: 'border-indigo-200', borderDark: 'border-indigo-800', badge: 'bg-indigo-100 text-indigo-700', badgeDark: 'bg-indigo-900/40 text-indigo-400' },
  gray:     { bg: 'bg-gray-50', bgDark: 'bg-gray-800/40', text: 'text-gray-700', textDark: 'text-gray-400', border: 'border-gray-200', borderDark: 'border-gray-700', badge: 'bg-gray-100 text-gray-600', badgeDark: 'bg-gray-800 text-gray-400' },
  cyan:     { bg: 'bg-cyan-50', bgDark: 'bg-cyan-900/20', text: 'text-cyan-700', textDark: 'text-cyan-400', border: 'border-cyan-200', borderDark: 'border-cyan-800', badge: 'bg-cyan-100 text-cyan-700', badgeDark: 'bg-cyan-900/40 text-cyan-400' },
  red:      { bg: 'bg-red-50', bgDark: 'bg-red-900/20', text: 'text-red-700', textDark: 'text-red-400', border: 'border-red-200', borderDark: 'border-red-800', badge: 'bg-red-100 text-red-700', badgeDark: 'bg-red-900/40 text-red-400' },
  green:    { bg: 'bg-green-50', bgDark: 'bg-green-900/20', text: 'text-green-700', textDark: 'text-green-400', border: 'border-green-200', borderDark: 'border-green-800', badge: 'bg-green-100 text-green-700', badgeDark: 'bg-green-900/40 text-green-400' },
  purple:   { bg: 'bg-purple-50', bgDark: 'bg-purple-900/20', text: 'text-purple-700', textDark: 'text-purple-400', border: 'border-purple-200', borderDark: 'border-purple-800', badge: 'bg-purple-100 text-purple-700', badgeDark: 'bg-purple-900/40 text-purple-400' },
}

function getColors(color: string, darkMode: boolean) {
  const c = COLOR_MAP[color] || COLOR_MAP.slate
  return {
    bg: darkMode ? c.bgDark : c.bg,
    text: darkMode ? c.textDark : c.text,
    border: darkMode ? c.borderDark : c.border,
    badge: darkMode ? c.badgeDark : c.badge,
  }
}

/* ── Component ── */

export default function SeasonalPlaybookTab({ darkMode }: { adminKey: string; darkMode: boolean }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<string, PlaybookOverride>>({})
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list')

  const currentMonth = new Date().getMonth()
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'

  const categories = [
    { id: 'all', label: 'All Triggers', count: TRIGGERS.length },
    { id: 'seasonal', label: 'Seasonal', count: TRIGGERS.filter(t => t.category === 'seasonal').length },
    { id: 'life-event', label: 'Life Events', count: TRIGGERS.filter(t => t.category === 'life-event').length },
    { id: 'weather', label: 'Weather', count: TRIGGERS.filter(t => t.category === 'weather').length },
    { id: 'market', label: 'Market', count: TRIGGERS.filter(t => t.category === 'market').length },
  ]

  const filtered = useMemo(() => {
    const list = selectedCategory === 'all' ? TRIGGERS : TRIGGERS.filter(t => t.category === selectedCategory)
    return list
  }, [selectedCategory])

  const activeTriggers = useMemo(() => TRIGGERS.filter(t => t.months.includes(currentMonth)), [currentMonth])

  const getStatus = (t: SeasonalTrigger): PlaybookStatus => {
    if (overrides[t.id]?.status) return overrides[t.id].status
    if (t.months.includes(currentMonth)) return 'active'
    const nextMonth = (currentMonth + 1) % 12
    const nextNext = (currentMonth + 2) % 12
    if (t.months.includes(nextMonth) || t.months.includes(nextNext)) return 'scheduled'
    return 'inactive'
  }

  const toggleStatus = (id: string) => {
    const current = overrides[id]?.status || getStatus(TRIGGERS.find(t => t.id === id)!)
    const next: PlaybookStatus = current === 'active' ? 'inactive' : current === 'inactive' ? 'active' : 'active'
    setOverrides(prev => ({ ...prev, [id]: { ...prev[id], triggerId: id, status: next } }))
  }

  const totalBudgetImpact = useMemo(() => {
    const active = TRIGGERS.filter(t => getStatus(t) === 'active')
    if (active.length === 0) return 0
    const avg = active.reduce((sum, t) => sum + (overrides[t.id]?.budgetOverride ?? t.budgetModifier), 0) / active.length
    return Math.round((avg - 1) * 100)
  }, [overrides, currentMonth])

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className={`rounded-xl border p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={16} className="text-emerald-500" />
            <span className={`text-xs font-medium ${sub}`}>Active Playbooks</span>
          </div>
          <p className={`text-2xl font-bold ${text}`}>{activeTriggers.length}</p>
          <p className={`text-xs ${sub}`}>triggers firing now</p>
        </div>
        <div className={`rounded-xl border p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-blue-500" />
            <span className={`text-xs font-medium ${sub}`}>Current Season</span>
          </div>
          <p className={`text-2xl font-bold ${text}`}>{MONTH_FULL[currentMonth]}</p>
          <p className={`text-xs ${sub}`}>{activeTriggers.map(t => t.name.split(' ')[0]).join(', ') || 'No active triggers'}</p>
        </div>
        <div className={`rounded-xl border p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-amber-500" />
            <span className={`text-xs font-medium ${sub}`}>Budget Impact</span>
          </div>
          <p className={`text-2xl font-bold ${text}`}>
            {totalBudgetImpact >= 0 ? '+' : ''}{totalBudgetImpact}%
          </p>
          <p className={`text-xs ${sub}`}>avg modifier across active</p>
        </div>
        <div className={`rounded-xl border p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-violet-500" />
            <span className={`text-xs font-medium ${sub}`}>Unit Types in Focus</span>
          </div>
          <p className={`text-2xl font-bold ${text}`}>
            {[...new Set(activeTriggers.flatMap(t => t.unitEmphasis))].length}
          </p>
          <p className={`text-xs ${sub}`}>emphasized unit categories</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                selectedCategory === c.id
                  ? 'bg-emerald-600 text-white'
                  : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.label} ({c.count})
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-emerald-600 text-white'
                : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              viewMode === 'calendar'
                ? 'bg-emerald-600 text-white'
                : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className={`rounded-xl border overflow-hidden ${card}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className={darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                  <th className={`text-left text-xs font-medium px-4 py-3 ${sub} w-48`}>Trigger</th>
                  {MONTH_NAMES.map((m, i) => (
                    <th key={m} className={`text-center text-xs font-medium px-1 py-3 ${i === currentMonth ? 'text-emerald-600 font-bold' : sub}`}>
                      {m}
                    </th>
                  ))}
                  <th className={`text-center text-xs font-medium px-3 py-3 ${sub}`}>Budget</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(trigger => {
                  const colors = getColors(trigger.color, darkMode)
                  const status = getStatus(trigger)
                  return (
                    <tr
                      key={trigger.id}
                      className={`border-t ${darkMode ? 'border-slate-700 hover:bg-slate-700/30' : 'border-slate-100 hover:bg-slate-50'} cursor-pointer transition-colors`}
                      onClick={() => setExpandedId(expandedId === trigger.id ? null : trigger.id)}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <trigger.icon size={14} className={colors.text} />
                          <span className={`text-sm font-medium ${text}`}>{trigger.name}</span>
                          {status === 'active' && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          )}
                        </div>
                      </td>
                      {MONTH_NAMES.map((_, i) => (
                        <td key={i} className="px-1 py-2.5 text-center">
                          {trigger.months.includes(i) ? (
                            <div className={`mx-auto w-6 h-6 rounded ${colors.bg} ${colors.border} border flex items-center justify-center`}>
                              {i === currentMonth && trigger.months.includes(i) ? (
                                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                              ) : (
                                <div className={`w-2 h-2 rounded-sm ${darkMode ? 'bg-slate-500' : 'bg-slate-300'}`} />
                              )}
                            </div>
                          ) : (
                            <div className="mx-auto w-6 h-6" />
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-xs font-medium ${trigger.budgetModifier > 1 ? 'text-emerald-600' : sub}`}>
                          {trigger.budgetModifier > 1 ? `+${Math.round((trigger.budgetModifier - 1) * 100)}%` : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filtered.map(trigger => {
            const expanded = expandedId === trigger.id
            const colors = getColors(trigger.color, darkMode)
            const status = getStatus(trigger)

            return (
              <div key={trigger.id} className={`rounded-xl border transition-all ${card} ${status === 'active' ? `ring-1 ${darkMode ? 'ring-emerald-800' : 'ring-emerald-200'}` : ''}`}>
                {/* Collapsed Row */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(expanded ? null : trigger.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center flex-shrink-0`}>
                    <trigger.icon size={18} className={colors.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${text}`}>{trigger.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                        {trigger.category}
                      </span>
                      {trigger.demandImpact === 'high' && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${darkMode ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                          high demand
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 ${sub} line-clamp-1`}>
                      {trigger.months.map(m => MONTH_NAMES[m]).join(', ')} · Budget {trigger.budgetModifier > 1 ? `+${Math.round((trigger.budgetModifier - 1) * 100)}%` : 'baseline'} · {trigger.unitEmphasis.slice(0, 3).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Status badge */}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      status === 'active'
                        ? darkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                        : status === 'scheduled'
                          ? darkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-700'
                          : darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {status === 'active' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />}
                      {status}
                    </span>
                    {/* Toggle */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleStatus(trigger.id) }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        status === 'active'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : darkMode ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                      title={status === 'active' ? 'Deactivate playbook' : 'Activate playbook'}
                    >
                      {status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    {expanded ? <ChevronDown size={16} className={sub} /> : <ChevronRight size={16} className={sub} />}
                  </div>
                </div>

                {/* Expanded Detail */}
                {expanded && (
                  <div className={`border-t px-5 py-5 space-y-5 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                    {/* Description */}
                    <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{trigger.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Messaging Angles */}
                      <div>
                        <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${text}`}>
                          <MessageSquare size={13} /> Messaging Angles
                        </h4>
                        <ul className="space-y-1.5">
                          {trigger.messagingAngles.map((angle, i) => (
                            <li key={i} className={`text-sm flex items-start gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.bg} ${colors.border} border`} />
                              {angle}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Unit Emphasis */}
                      <div>
                        <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${text}`}>
                          <Target size={13} /> Unit Emphasis
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {trigger.unitEmphasis.map(unit => (
                            <span key={unit} className={`text-xs px-2.5 py-1 rounded-lg ${colors.badge}`}>
                              {unit}
                            </span>
                          ))}
                        </div>

                        <h4 className={`text-xs font-semibold mt-4 mb-2 flex items-center gap-1.5 ${text}`}>
                          <Settings size={13} /> Channels
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {trigger.channels.map(ch => (
                            <span key={ch} className={`text-xs px-2.5 py-1 rounded-lg ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                              {ch}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Ad Copy Suggestions */}
                    <div>
                      <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${text}`}>
                        <Zap size={13} /> Ready-to-Use Ad Copy
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {trigger.adCopy.map((ad, i) => (
                          <div key={i} className={`rounded-lg border p-3 ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                            <p className={`text-sm font-semibold mb-1 ${text}`}>{ad.headline}</p>
                            <p className={`text-xs ${sub}`}>{ad.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Audience Targeting */}
                    <div>
                      <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${text}`}>
                        <Users size={13} /> Audience Targeting
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {trigger.audienceTargeting.map(aud => (
                          <span key={aud} className={`text-xs px-2.5 py-1 rounded-lg ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                            {aud}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Budget Controls */}
                    <div className={`rounded-lg border p-4 ${darkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className={`text-xs font-semibold flex items-center gap-1.5 ${text}`}>
                            <DollarSign size={13} /> Budget Modifier
                          </h4>
                          <p className={`text-xs mt-0.5 ${sub}`}>
                            Recommended: +{Math.round((trigger.budgetModifier - 1) * 100)}% above baseline
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const current = overrides[trigger.id]?.budgetOverride ?? trigger.budgetModifier
                              setOverrides(prev => ({
                                ...prev,
                                [trigger.id]: { ...prev[trigger.id], triggerId: trigger.id, status: getStatus(trigger), budgetOverride: Math.max(0.5, current - 0.05) }
                              }))
                            }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${darkMode ? 'bg-slate-600 text-slate-200 hover:bg-slate-500' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                          >
                            −
                          </button>
                          <span className={`text-lg font-bold min-w-[60px] text-center ${text}`}>
                            {overrides[trigger.id]?.budgetOverride
                              ? `${overrides[trigger.id].budgetOverride! > 1 ? '+' : ''}${Math.round((overrides[trigger.id].budgetOverride! - 1) * 100)}%`
                              : `+${Math.round((trigger.budgetModifier - 1) * 100)}%`
                            }
                          </span>
                          <button
                            onClick={() => {
                              const current = overrides[trigger.id]?.budgetOverride ?? trigger.budgetModifier
                              setOverrides(prev => ({
                                ...prev,
                                [trigger.id]: { ...prev[trigger.id], triggerId: trigger.id, status: getStatus(trigger), budgetOverride: Math.min(3, current + 0.05) }
                              }))
                            }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${darkMode ? 'bg-slate-600 text-slate-200 hover:bg-slate-500' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Active Months Visual */}
                    <div>
                      <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${text}`}>
                        <Calendar size={13} /> Active Months
                      </h4>
                      <div className="flex gap-1">
                        {MONTH_NAMES.map((m, i) => (
                          <div
                            key={m}
                            className={`flex-1 text-center py-2 rounded-lg text-xs font-medium transition-colors ${
                              trigger.months.includes(i)
                                ? i === currentMonth
                                  ? 'bg-emerald-600 text-white'
                                  : `${colors.bg} ${colors.text} ${colors.border} border`
                                : darkMode ? 'bg-slate-700/30 text-slate-500' : 'bg-slate-50 text-slate-400'
                            }`}
                          >
                            {m}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Monthly Demand Forecast */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${text}`}>
          <BarChart3 size={16} className="text-emerald-500" />
          12-Month Demand Trigger Density
        </h3>
        <div className="flex gap-1 items-end h-32">
          {MONTH_NAMES.map((m, i) => {
            const count = TRIGGERS.filter(t => t.months.includes(i)).length
            const maxCount = Math.max(...MONTH_NAMES.map((_, j) => TRIGGERS.filter(t => t.months.includes(j)).length))
            const height = (count / maxCount) * 100
            const isCurrent = i === currentMonth
            return (
              <div key={m} className="flex-1 flex flex-col items-center gap-1">
                <span className={`text-[10px] font-medium ${isCurrent ? 'text-emerald-600' : sub}`}>{count}</span>
                <div
                  className={`w-full rounded-t-md transition-all ${
                    isCurrent
                      ? 'bg-emerald-500'
                      : darkMode ? 'bg-slate-600' : 'bg-slate-200'
                  }`}
                  style={{ height: `${height}%`, minHeight: '4px' }}
                />
                <span className={`text-[10px] font-medium ${isCurrent ? 'text-emerald-600 font-bold' : sub}`}>{m}</span>
              </div>
            )
          })}
        </div>
        <p className={`text-xs mt-3 ${sub}`}>
          Number of demand triggers active per month. Current month highlighted. Use this to anticipate budget allocation needs.
        </p>
      </div>
    </div>
  )
}
