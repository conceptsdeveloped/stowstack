import { useState, useMemo, useCallback } from 'react'
import {
  Calendar, Sun, Snowflake, Leaf, Flower2, CloudRain, GraduationCap,
  Home, Heart, Shield, TrendingUp, TrendingDown, Zap, Users,
  ChevronRight, ChevronDown, Play, Pause, Settings, BarChart3,
  Thermometer, DollarSign, Copy, Check, AlertTriangle, Clock,
  Target, MessageSquare, ArrowRight, Layers, Tag,
  Lightbulb, ArrowUpRight, Percent, Bell, Eye
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

interface PricingRec {
  unitType: string
  adjustment: number // percentage, e.g. +10 or -5
  reason: string
}

interface CompetitorInsight {
  action: string
  timing: string
  response: string
}

interface PerformanceData {
  estimatedLeads: number
  estimatedCPL: number
  avgRentalDuration: string
  conversionLift: string
  historicalROAS: number
}

/* ── Trigger Data ── */

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/* ── Pricing Recommendations by Trigger ── */
const PRICING_RECS: Record<string, PricingRec[]> = {
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
const COMPETITOR_INSIGHTS: Record<string, CompetitorInsight[]> = {
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
const PERFORMANCE_DATA: Record<string, PerformanceData> = {
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
interface WeatherAlert {
  id: string
  type: 'storm' | 'heat' | 'cold' | 'flood'
  severity: 'watch' | 'warning' | 'advisory'
  title: string
  description: string
  region: string
  activatesPlaybook: string
  expiresIn: string
}

const SIMULATED_ALERTS: WeatherAlert[] = [
  { id: 'wa1', type: 'storm', severity: 'watch', title: 'Severe Thunderstorm Watch', description: 'NWS issued watch for heavy rain and high winds through Wednesday. Potential for localized flooding.', region: 'Central Region', activatesPlaybook: 'hurricane-season', expiresIn: '2 days' },
  { id: 'wa2', type: 'heat', severity: 'advisory', title: 'Heat Advisory', description: 'Temperatures expected to reach 95°F+. Climate-controlled unit demand may increase.', region: 'Southern Markets', activatesPlaybook: 'extreme-heat', expiresIn: '5 days' },
]

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
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [showActionPlan, setShowActionPlan] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['performance', 'pricing', 'competitors']))

  const currentMonth = new Date().getMonth()
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'

  const copyToClipboard = useCallback((content: string, id: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }, [])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const visibleAlerts = SIMULATED_ALERTS.filter(a => !dismissedAlerts.has(a.id))

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

      {/* Weather Alerts */}
      {visibleAlerts.length > 0 && (
        <div className="space-y-2">
          {visibleAlerts.map(alert => (
            <div key={alert.id} className={`rounded-xl border p-4 flex items-start gap-3 ${
              alert.severity === 'warning'
                ? darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
                : alert.severity === 'watch'
                  ? darkMode ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'
                  : darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
            }`}>
              <AlertTriangle size={18} className={
                alert.severity === 'warning' ? 'text-red-500' : alert.severity === 'watch' ? 'text-amber-500' : 'text-blue-500'
              } />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-sm font-semibold ${text}`}>{alert.title}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                    alert.severity === 'warning'
                      ? darkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700'
                      : alert.severity === 'watch'
                        ? darkMode ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700'
                        : darkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-700'
                  }`}>{alert.severity}</span>
                  <span className={`text-[10px] ${sub}`}>{alert.region}</span>
                </div>
                <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{alert.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-[10px] flex items-center gap-1 ${sub}`}>
                    <Clock size={10} /> Expires in {alert.expiresIn}
                  </span>
                  <button
                    onClick={() => {
                      setExpandedId(alert.activatesPlaybook)
                      setSelectedCategory('all')
                    }}
                    className="text-[10px] text-emerald-600 hover:text-emerald-500 font-medium flex items-center gap-1"
                  >
                    <ArrowRight size={10} /> View playbook
                  </button>
                </div>
              </div>
              <button
                onClick={() => setDismissedAlerts(prev => new Set([...prev, alert.id]))}
                className={`p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-white'}`}
              >
                <span className={`text-xs ${sub}`}>Dismiss</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* This Month's Action Plan */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowActionPlan(!showActionPlan)}
          className="flex items-center justify-between px-5 py-4 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-amber-500" />
            <h3 className={`text-sm font-semibold ${text}`}>This Month&apos;s Action Plan</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${darkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
              {activeTriggers.length} triggers active
            </span>
          </div>
          {showActionPlan ? <ChevronDown size={16} className={sub} /> : <ChevronRight size={16} className={sub} />}
        </div>
        {showActionPlan && (
          <div className={`border-t px-5 py-5 space-y-5 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            {/* Priority Actions */}
            <div>
              <h4 className={`text-xs font-semibold mb-3 flex items-center gap-1.5 ${text}`}>
                <Zap size={13} /> Priority Actions for {MONTH_FULL[currentMonth]}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeTriggers
                  .sort((a, b) => {
                    const impact = { high: 3, medium: 2, low: 1 }
                    return impact[b.demandImpact] - impact[a.demandImpact]
                  })
                  .slice(0, 6)
                  .map((trigger, i) => {
                    const colors = getColors(trigger.color, darkMode)
                    const perf = PERFORMANCE_DATA[trigger.id]
                    return (
                      <div key={trigger.id} className={`rounded-lg border p-3 ${darkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>#{i + 1}</span>
                          <trigger.icon size={14} className={colors.text} />
                          <span className={`text-xs font-semibold ${text}`}>{trigger.name}</span>
                        </div>
                        <div className="space-y-1">
                          <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            <span className="font-medium">Push:</span> {trigger.unitEmphasis.slice(0, 2).join(', ')}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            <span className="font-medium">Budget:</span> +{Math.round((trigger.budgetModifier - 1) * 100)}% above baseline
                          </p>
                          {perf && (
                            <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                              <span className="font-medium">Est:</span> ~{perf.estimatedLeads} leads at ${perf.estimatedCPL} CPL
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => { setExpandedId(trigger.id); setSelectedCategory('all'); setViewMode('list') }}
                          className="text-[10px] text-emerald-600 hover:text-emerald-500 font-medium flex items-center gap-1 mt-2"
                        >
                          View full playbook <ArrowRight size={10} />
                        </button>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Combined Unit Pricing Strategy */}
            <div>
              <h4 className={`text-xs font-semibold mb-3 flex items-center gap-1.5 ${text}`}>
                <Tag size={13} /> Recommended Pricing Adjustments
              </h4>
              {(() => {
                const allRecs: Record<string, { adjustments: number[]; reasons: string[] }> = {}
                activeTriggers.forEach(t => {
                  const recs = PRICING_RECS[t.id] || []
                  recs.forEach(r => {
                    if (!allRecs[r.unitType]) allRecs[r.unitType] = { adjustments: [], reasons: [] }
                    allRecs[r.unitType].adjustments.push(r.adjustment)
                    allRecs[r.unitType].reasons.push(r.reason)
                  })
                })
                const combined = Object.entries(allRecs).map(([unitType, data]) => ({
                  unitType,
                  adjustment: Math.round(data.adjustments.reduce((a, b) => a + b, 0) / data.adjustments.length),
                  reasons: data.reasons,
                })).sort((a, b) => b.adjustment - a.adjustment)

                if (combined.length === 0) return <p className={`text-xs ${sub}`}>No pricing recommendations for active triggers.</p>

                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {combined.map(rec => (
                      <div key={rec.unitType} className={`rounded-lg border p-3 text-center ${darkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`} title={rec.reasons.join('; ')}>
                        <p className={`text-xs font-medium mb-1 ${sub}`}>{rec.unitType}</p>
                        <p className={`text-lg font-bold ${rec.adjustment > 0 ? 'text-emerald-600' : rec.adjustment < 0 ? 'text-blue-600' : sub}`}>
                          {rec.adjustment > 0 ? '+' : ''}{rec.adjustment}%
                        </p>
                        <p className={`text-[10px] mt-0.5 ${sub}`}>
                          {rec.adjustment > 0 ? 'raise rate' : rec.adjustment < 0 ? 'discount' : 'hold'}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* Messaging Theme Summary */}
            <div>
              <h4 className={`text-xs font-semibold mb-3 flex items-center gap-1.5 ${text}`}>
                <MessageSquare size={13} /> Top Messaging Themes This Month
              </h4>
              <div className="flex flex-wrap gap-2">
                {[...new Set(activeTriggers.flatMap(t => t.messagingAngles))].slice(0, 8).map(angle => (
                  <div
                    key={angle}
                    className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${darkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>&ldquo;{angle}&rdquo;</span>
                    <button
                      onClick={() => copyToClipboard(angle, `theme-${angle}`)}
                      className={`p-0.5 rounded transition-colors ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}
                      title="Copy to clipboard"
                    >
                      {copiedId === `theme-${angle}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className={sub} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upcoming Triggers Timeline */}
      {(() => {
        const upcoming = TRIGGERS
          .filter(t => {
            const status = getStatus(t)
            return status === 'scheduled'
          })
          .map(t => {
            const nextMonth = (currentMonth + 1) % 12
            const startsIn = t.months.includes(nextMonth) ? 1 : 2
            return { ...t, startsIn }
          })
          .sort((a, b) => a.startsIn - b.startsIn)

        if (upcoming.length === 0) return null

        return (
          <div className={`rounded-xl border p-5 ${card}`}>
            <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${text}`}>
              <Clock size={16} className="text-blue-500" />
              Upcoming Triggers (Next 60 Days)
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {upcoming.map(trigger => {
                const colors = getColors(trigger.color, darkMode)
                return (
                  <div
                    key={trigger.id}
                    className={`flex-shrink-0 w-56 rounded-lg border p-3 cursor-pointer transition-all hover:scale-[1.02] ${darkMode ? 'bg-slate-700/30 border-slate-600 hover:border-slate-500' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
                    onClick={() => { setExpandedId(trigger.id); setSelectedCategory('all'); setViewMode('list') }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 rounded-lg ${colors.bg} ${colors.border} border flex items-center justify-center`}>
                        <trigger.icon size={14} className={colors.text} />
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${text}`}>{trigger.name}</p>
                        <p className={`text-[10px] ${sub}`}>Starts in ~{trigger.startsIn * 30} days</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className={`text-[10px] ${sub}`}>
                        <span className="font-medium">Impact:</span> {trigger.demandImpact} · Budget +{Math.round((trigger.budgetModifier - 1) * 100)}%
                      </p>
                      <p className={`text-[10px] ${sub}`}>
                        <span className="font-medium">Prep:</span> Update creatives, review landing pages
                      </p>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-600 font-medium">
                      <Bell size={10} /> Prep now <ArrowRight size={10} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Trigger Stacking Analysis */}
      {(() => {
        const overlapping = activeTriggers.filter(t => t.demandImpact === 'high' || t.demandImpact === 'medium')
        if (overlapping.length < 2) return null

        const allUnits = [...new Set(overlapping.flatMap(t => t.unitEmphasis))]
        const unitOverlap = allUnits.filter(u => overlapping.filter(t => t.unitEmphasis.includes(u)).length > 1)

        return (
          <div className={`rounded-xl border p-5 ${card}`}>
            <h3 className={`text-sm font-semibold mb-1 flex items-center gap-2 ${text}`}>
              <Layers size={16} className="text-violet-500" />
              Trigger Stacking — {overlapping.length} Overlapping Playbooks
            </h3>
            <p className={`text-xs mb-4 ${sub}`}>
              Multiple demand triggers are active simultaneously. Coordinate messaging to avoid audience fatigue.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className={`text-xs font-semibold mb-2 ${text}`}>Overlapping Unit Demand</h4>
                {unitOverlap.length > 0 ? (
                  <div className="space-y-2">
                    {unitOverlap.map(unit => {
                      const triggers = overlapping.filter(t => t.unitEmphasis.includes(unit))
                      return (
                        <div key={unit} className={`flex items-center justify-between text-xs rounded-lg px-3 py-2 ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                          <span className={`font-medium ${text}`}>{unit}</span>
                          <div className="flex items-center gap-1">
                            {triggers.map(t => {
                              const c = getColors(t.color, darkMode)
                              return <span key={t.id} className={`px-1.5 py-0.5 rounded text-[10px] ${c.badge}`}>{t.name.split(' ')[0]}</span>
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className={`text-xs ${sub}`}>No overlapping unit demand detected.</p>
                )}
              </div>
              <div>
                <h4 className={`text-xs font-semibold mb-2 ${text}`}>Combined Budget Impact</h4>
                <div className={`rounded-lg px-4 py-3 ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs ${sub}`}>Aggregate modifier</span>
                    <span className={`text-lg font-bold text-emerald-600`}>
                      +{Math.round(overlapping.reduce((sum, t) => sum + (t.budgetModifier - 1), 0) * 100 / overlapping.length)}%
                    </span>
                  </div>
                  <p className={`text-[10px] ${sub}`}>
                    Tip: When triggers stack, allocate budget proportionally to demand impact. High-impact triggers should get 60% of incremental budget.
                  </p>
                </div>
                <h4 className={`text-xs font-semibold mt-3 mb-2 ${text}`}>Recommended Strategy</h4>
                <ul className="space-y-1">
                  <li className={`text-xs flex items-start gap-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <ArrowUpRight size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    Rotate ad creatives every 7 days to prevent fatigue
                  </li>
                  <li className={`text-xs flex items-start gap-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <ArrowUpRight size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    Use audience exclusions to prevent overlap between trigger campaigns
                  </li>
                  <li className={`text-xs flex items-start gap-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <ArrowUpRight size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    Prioritize {overlapping.filter(t => t.demandImpact === 'high').map(t => t.name.split(' ')[0]).join(', ') || 'highest-impact'} triggers for landing page variations
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )
      })()}

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

                    {/* Performance Estimates */}
                    {PERFORMANCE_DATA[trigger.id] && (
                      <div>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleSection(`perf-${trigger.id}`)}
                          className="flex items-center gap-1.5 cursor-pointer mb-2"
                        >
                          <BarChart3 size={13} className={text} />
                          <h4 className={`text-xs font-semibold ${text}`}>Performance Estimates</h4>
                          {expandedSections.has(`perf-${trigger.id}`) || expandedSections.has('performance')
                            ? <ChevronDown size={12} className={sub} />
                            : <ChevronRight size={12} className={sub} />}
                        </div>
                        {(expandedSections.has(`perf-${trigger.id}`) || expandedSections.has('performance')) && (() => {
                          const perf = PERFORMANCE_DATA[trigger.id]
                          return (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                              <div className={`rounded-lg p-3 text-center ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                                <p className={`text-lg font-bold ${text}`}>~{perf.estimatedLeads}</p>
                                <p className={`text-[10px] ${sub}`}>Est. Leads/mo</p>
                              </div>
                              <div className={`rounded-lg p-3 text-center ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                                <p className={`text-lg font-bold ${text}`}>${perf.estimatedCPL}</p>
                                <p className={`text-[10px] ${sub}`}>Est. CPL</p>
                              </div>
                              <div className={`rounded-lg p-3 text-center ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                                <p className={`text-lg font-bold ${text}`}>{perf.avgRentalDuration}</p>
                                <p className={`text-[10px] ${sub}`}>Avg Duration</p>
                              </div>
                              <div className={`rounded-lg p-3 text-center ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                                <p className={`text-lg font-bold text-emerald-600`}>{perf.conversionLift}</p>
                                <p className={`text-[10px] ${sub}`}>Conv. Lift</p>
                              </div>
                              <div className={`rounded-lg p-3 text-center ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                                <p className={`text-lg font-bold text-emerald-600`}>{perf.historicalROAS}x</p>
                                <p className={`text-[10px] ${sub}`}>Hist. ROAS</p>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}

                    {/* Pricing Recommendations */}
                    {PRICING_RECS[trigger.id] && (
                      <div>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleSection(`price-${trigger.id}`)}
                          className="flex items-center gap-1.5 cursor-pointer mb-2"
                        >
                          <Percent size={13} className={text} />
                          <h4 className={`text-xs font-semibold ${text}`}>Pricing Recommendations</h4>
                          {expandedSections.has(`price-${trigger.id}`) || expandedSections.has('pricing')
                            ? <ChevronDown size={12} className={sub} />
                            : <ChevronRight size={12} className={sub} />}
                        </div>
                        {(expandedSections.has(`price-${trigger.id}`) || expandedSections.has('pricing')) && (
                          <div className="space-y-1.5">
                            {PRICING_RECS[trigger.id].map(rec => (
                              <div key={rec.unitType} className={`flex items-center justify-between text-xs rounded-lg px-3 py-2 ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${text}`}>{rec.unitType}</span>
                                  <span className={`${sub}`}>—</span>
                                  <span className={sub}>{rec.reason}</span>
                                </div>
                                <span className={`font-bold ${rec.adjustment > 0 ? 'text-emerald-600' : rec.adjustment < 0 ? 'text-blue-600' : sub}`}>
                                  {rec.adjustment > 0 ? '+' : ''}{rec.adjustment}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Competitor Intelligence */}
                    {COMPETITOR_INSIGHTS[trigger.id] && (
                      <div>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleSection(`comp-${trigger.id}`)}
                          className="flex items-center gap-1.5 cursor-pointer mb-2"
                        >
                          <Eye size={13} className={text} />
                          <h4 className={`text-xs font-semibold ${text}`}>Competitive Intelligence</h4>
                          {expandedSections.has(`comp-${trigger.id}`) || expandedSections.has('competitors')
                            ? <ChevronDown size={12} className={sub} />
                            : <ChevronRight size={12} className={sub} />}
                        </div>
                        {(expandedSections.has(`comp-${trigger.id}`) || expandedSections.has('competitors')) && (
                          <div className="space-y-2">
                            {COMPETITOR_INSIGHTS[trigger.id].map((insight, i) => (
                              <div key={i} className={`rounded-lg border p-3 ${darkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-start gap-2">
                                  <AlertTriangle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className={`text-xs font-medium ${text}`}>{insight.action}</p>
                                    <p className={`text-[10px] ${sub} mb-1`}>Timing: {insight.timing}</p>
                                    <div className="flex items-start gap-1.5">
                                      <ArrowRight size={10} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                                      <p className={`text-xs ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>{insight.response}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ad Copy Suggestions — with copy button */}
                    <div>
                      <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${text}`}>
                        <Zap size={13} /> Ready-to-Use Ad Copy
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {trigger.adCopy.map((ad, i) => {
                          const copyKey = `${trigger.id}-ad-${i}`
                          return (
                            <div key={i} className={`rounded-lg border p-3 relative group ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                              <p className={`text-sm font-semibold mb-1 ${text}`}>{ad.headline}</p>
                              <p className={`text-xs ${sub}`}>{ad.body}</p>
                              <button
                                onClick={() => copyToClipboard(`${ad.headline}\n${ad.body}`, copyKey)}
                                className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${darkMode ? 'bg-slate-600 hover:bg-slate-500' : 'bg-white hover:bg-slate-100'} shadow-sm`}
                                title="Copy ad copy"
                              >
                                {copiedId === copyKey ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className={sub} />}
                              </button>
                            </div>
                          )
                        })}
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
