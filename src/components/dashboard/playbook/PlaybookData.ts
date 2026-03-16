import {
  Sun, Snowflake, Leaf, Flower2, CloudRain, GraduationCap,
  Home, Heart, Shield, TrendingDown, Zap,
  BarChart3, Thermometer, DollarSign,
} from 'lucide-react'

/* ── Types ── */

export interface SeasonalTrigger {
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

export type PlaybookStatus = 'active' | 'scheduled' | 'inactive'

export interface PlaybookOverride {
  triggerId: string
  status: PlaybookStatus
  budgetOverride?: number
  notes?: string
}

export interface PricingRec {
  unitType: string
  adjustment: number // percentage, e.g. +10 or -5
  reason: string
}

export interface CompetitorInsight {
  action: string
  timing: string
  response: string
}

export interface PerformanceData {
  estimatedLeads: number
  estimatedCPL: number
  avgRentalDuration: string
  conversionLift: string
  historicalROAS: number
}

export interface WeatherAlert {
  id: string
  type: 'storm' | 'heat' | 'cold' | 'flood'
  severity: 'watch' | 'warning' | 'advisory'
  title: string
  description: string
  region: string
  activatesPlaybook: string
  expiresIn: string
}

/* ── Constants ── */

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/* ── Pricing Recommendations by Trigger ── */
export const PRICING_RECS: Record<string, PricingRec[]> = {
  'spring-cleaning': [
    { unitType: '5×5', adjustment: 8, reason: 'High demand for small declutter units' },
    { unitType: '5×10', adjustment: 10, reason: 'Most popular spring cleaning size' },
    { unitType: '10×10', adjustment: 5, reason: 'Moderate demand increase' },
  ],
  'summer-moves': [
    { unitType: '10×10', adjustment: 15, reason: 'Peak moving season — highest demand' },
    { unitType: '10×15', adjustment: 18, reason: 'Family-sized units at premium' },
    { unitType: '10×20', adjustment: 20, reason: 'Whole-home storage premium pricing' },
    { unitType: '10×30', adjustment: 15, reason: 'Large moves willing to pay more' },
  ],
  'college-move': [
    { unitType: '5×5', adjustment: 12, reason: 'Student storage surge near campuses' },
    { unitType: '5×10', adjustment: 15, reason: 'Dorm room contents — peak demand' },
    { unitType: 'Climate-controlled', adjustment: 8, reason: 'Electronics and valuables' },
  ],
  'holiday-storage': [
    { unitType: '5×5', adjustment: 5, reason: 'Decoration overflow' },
    { unitType: 'Climate-controlled', adjustment: 8, reason: 'Protect decorations and gifts' },
  ],
  'new-year-declutter': [
    { unitType: '5×5', adjustment: 5, reason: 'Resolution-driven declutter' },
    { unitType: '5×10', adjustment: 8, reason: 'Garage cleanout size' },
  ],
  'fall-transition': [
    { unitType: 'Vehicle/RV/Boat', adjustment: 20, reason: 'End-of-season rush for covered storage' },
    { unitType: '10×20', adjustment: 12, reason: 'Seasonal gear swap' },
    { unitType: 'Outdoor parking', adjustment: 15, reason: 'Winterization storage demand' },
  ],
  'home-renovation': [
    { unitType: '10×15', adjustment: 10, reason: 'Room-clearing for remodels' },
    { unitType: '10×20', adjustment: 12, reason: 'Whole-floor furniture storage' },
    { unitType: 'Climate-controlled', adjustment: 8, reason: 'Protecting furniture from dust/damage' },
  ],
  'hurricane-season': [
    { unitType: 'Climate-controlled', adjustment: 25, reason: 'Premium for elevated, protected units' },
    { unitType: '2nd floor units', adjustment: 30, reason: 'Flood-proof demand surge' },
  ],
  'extreme-heat': [
    { unitType: 'Climate-controlled', adjustment: 15, reason: 'Heat-sensitive item protection' },
  ],
  'military-deployment': [
    { unitType: '10×20', adjustment: -5, reason: 'Military discount offsets — long-term value' },
    { unitType: 'Vehicle/RV/Boat', adjustment: -5, reason: 'Military vehicle storage — loyalty pricing' },
  ],
  'downsizing': [
    { unitType: '10×10', adjustment: 5, reason: 'Heirloom and furniture overflow' },
    { unitType: 'Climate-controlled', adjustment: 10, reason: 'Premium for sentimental items' },
  ],
}

/* ── Competitor Insights ── */
export const COMPETITOR_INSIGHTS: Record<string, CompetitorInsight[]> = {
  'spring-cleaning': [
    { action: 'Competitors run "first month free" promos', timing: 'March–April', response: 'Counter with "free lock + first month 50% off" — higher perceived value, lower actual cost' },
    { action: 'National chains increase Google Ads spend 30%', timing: 'March', response: 'Shift budget to Meta where CPCs are 40% lower during spring' },
  ],
  'summer-moves': [
    { action: 'Price wars on large units', timing: 'June–August', response: 'Don\'t discount — emphasize convenience, location, and availability instead' },
    { action: 'Competitors partner with moving companies', timing: 'May–July', response: 'Create referral program with local realtors — higher quality leads' },
    { action: 'Extra Space / Public Storage run national TV ads', timing: 'June', response: 'Hyper-local targeting: "Your neighbors trust us" social proof angle' },
  ],
  'college-move': [
    { action: 'Competitors offer student-specific plans', timing: 'April–May', response: 'Bundle with pickup/delivery service — students value convenience over price' },
    { action: 'Campus bulletin board saturation', timing: 'April', response: 'Instagram/TikTok ads geo-fenced to campus — meet students where they are' },
  ],
  'fall-transition': [
    { action: 'RV/boat storage fills up early', timing: 'September', response: 'Open reservations August 1 — first-mover advantage, early-bird pricing' },
    { action: 'Competitors drop prices on small units', timing: 'October', response: 'Hold rates — fall is value season for seasonal gear swap messaging' },
  ],
  'hurricane-season': [
    { action: 'Price gouging complaints spike', timing: 'After storms', response: 'Keep pre-storm rates — PR win + community goodwill = long-term occupancy' },
    { action: 'Insurance companies refer policyholders', timing: 'After events', response: 'Build relationships with local insurance agents before storm season' },
  ],
  'home-renovation': [
    { action: 'PODS and portable storage compete hard', timing: 'Year-round', response: 'Emphasize climate-control and security — PODS can\'t match indoor facilities' },
  ],
}

/* ── Simulated Performance Data ── */
export const PERFORMANCE_DATA: Record<string, PerformanceData> = {
  'spring-cleaning': { estimatedLeads: 35, estimatedCPL: 28, avgRentalDuration: '3.2 months', conversionLift: '+18%', historicalROAS: 4.2 },
  'summer-moves': { estimatedLeads: 65, estimatedCPL: 32, avgRentalDuration: '2.8 months', conversionLift: '+24%', historicalROAS: 5.1 },
  'college-move': { estimatedLeads: 45, estimatedCPL: 22, avgRentalDuration: '3.5 months', conversionLift: '+30%', historicalROAS: 4.8 },
  'holiday-storage': { estimatedLeads: 20, estimatedCPL: 35, avgRentalDuration: '4.5 months', conversionLift: '+8%', historicalROAS: 3.2 },
  'new-year-declutter': { estimatedLeads: 25, estimatedCPL: 30, avgRentalDuration: '5.2 months', conversionLift: '+12%', historicalROAS: 3.8 },
  'fall-transition': { estimatedLeads: 30, estimatedCPL: 38, avgRentalDuration: '6.0 months', conversionLift: '+15%', historicalROAS: 4.5 },
  'home-renovation': { estimatedLeads: 28, estimatedCPL: 42, avgRentalDuration: '2.5 months', conversionLift: '+10%', historicalROAS: 3.5 },
  'divorce-separation': { estimatedLeads: 15, estimatedCPL: 45, avgRentalDuration: '7.8 months', conversionLift: '+5%', historicalROAS: 4.0 },
  'military-deployment': { estimatedLeads: 12, estimatedCPL: 38, avgRentalDuration: '11.2 months', conversionLift: '+6%', historicalROAS: 5.5 },
  'downsizing': { estimatedLeads: 18, estimatedCPL: 40, avgRentalDuration: '14.0 months', conversionLift: '+8%', historicalROAS: 6.2 },
  'estate-death': { estimatedLeads: 8, estimatedCPL: 50, avgRentalDuration: '8.5 months', conversionLift: '+3%', historicalROAS: 3.0 },
  'hurricane-season': { estimatedLeads: 40, estimatedCPL: 25, avgRentalDuration: '4.0 months', conversionLift: '+35%', historicalROAS: 5.8 },
  'extreme-heat': { estimatedLeads: 22, estimatedCPL: 32, avgRentalDuration: '5.5 months', conversionLift: '+12%', historicalROAS: 3.9 },
  'tax-season': { estimatedLeads: 10, estimatedCPL: 48, avgRentalDuration: '8.0 months', conversionLift: '+4%', historicalROAS: 2.8 },
  'small-biz-inventory': { estimatedLeads: 14, estimatedCPL: 55, avgRentalDuration: '18.0 months', conversionLift: '+6%', historicalROAS: 7.2 },
}

/* ── Weather Alerts (simulated) ── */
export const SIMULATED_ALERTS: WeatherAlert[] = [
  { id: 'wa1', type: 'storm', severity: 'watch', title: 'Severe Thunderstorm Watch', description: 'NWS issued watch for heavy rain and high winds through Wednesday. Potential for localized flooding.', region: 'Central Region', activatesPlaybook: 'hurricane-season', expiresIn: '2 days' },
  { id: 'wa2', type: 'heat', severity: 'advisory', title: 'Heat Advisory', description: 'Temperatures expected to reach 95°F+. Climate-controlled unit demand may increase.', region: 'Southern Markets', activatesPlaybook: 'extreme-heat', expiresIn: '5 days' },
]

/* ── Trigger Data ── */
export const TRIGGERS: SeasonalTrigger[] = [
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

export const COLOR_MAP: Record<string, { bg: string; bgDark: string; text: string; textDark: string; border: string; borderDark: string; badge: string; badgeDark: string }> = {
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

export function getColors(color: string, darkMode: boolean) {
  const c = COLOR_MAP[color] || COLOR_MAP.slate
  return {
    bg: darkMode ? c.bgDark : c.bg,
    text: darkMode ? c.textDark : c.text,
    border: darkMode ? c.borderDark : c.border,
    badge: darkMode ? c.badgeDark : c.badge,
  }
}
