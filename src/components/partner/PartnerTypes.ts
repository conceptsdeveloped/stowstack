/* ── Types ── */

export interface OrgUser {
  id: string
  email: string
  name: string
  role: string
  status: string
  last_login_at: string | null
  created_at: string
}

export interface OrgFacility {
  id: string
  name: string
  location: string
  status: string
  occupancy_range: string
  total_units: string
  google_rating: number | null
  review_count: number | null
  created_at: string
  campaigns: CampaignEntry[] | null
  live_pages: number
  live_ads: number
}

export interface CampaignEntry {
  month: string
  spend: number
  leads: number
  cpl: number
  moveIns: number
  roas: number
  occupancyDelta: number
}

export interface Organization {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  primaryColor: string
  accentColor: string
  whiteLabel: boolean
  plan: string
  facilityLimit: number
  settings: Record<string, unknown>
  subscriptionStatus?: string
  hasStripe?: boolean
}

export interface AuthState {
  token: string
  user: { id: string; email: string; name: string; role: string }
  organization: Organization
}

/* ── Constants ── */

export const STORAGE_KEY = 'stowstack_partner'

export const OCCUPANCY_LABELS: Record<string, string> = {
  'below-60': 'Below 60%',
  '60-75': '60\u201375%',
  '75-85': '75\u201385%',
  '85-95': '85\u201395%',
  'above-95': 'Above 95%',
}

export const STATUS_COLORS: Record<string, string> = {
  intake: 'bg-slate-100 text-slate-600',
  scraped: 'bg-blue-100 text-blue-700',
  briefed: 'bg-indigo-100 text-indigo-700',
  generating: 'bg-purple-100 text-purple-700',
  review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-emerald-100 text-emerald-700',
  live: 'bg-green-100 text-green-700',
  reporting: 'bg-teal-100 text-teal-700',
}

/* ── Revenue Share Constants ── */

import { Star, Award, Crown, Sparkles } from 'lucide-react'

export const REV_SHARE_TIERS = [
  { name: 'Bronze', min: 1, max: 10, pct: 20, icon: Star, color: '#cd7f32', bgGradient: 'from-amber-600 to-yellow-700' },
  { name: 'Silver', min: 11, max: 25, pct: 25, icon: Award, color: '#94a3b8', bgGradient: 'from-slate-400 to-slate-500' },
  { name: 'Gold', min: 26, max: 50, pct: 30, icon: Crown, color: '#eab308', bgGradient: 'from-yellow-500 to-amber-500' },
  { name: 'Platinum', min: 51, max: Infinity, pct: 35, icon: Sparkles, color: '#8b5cf6', bgGradient: 'from-violet-500 to-purple-600' },
] as const

export const PER_FACILITY_MRR = 99

export function getRevShareTier(facilityCount: number) {
  return REV_SHARE_TIERS.find(t => facilityCount >= t.min && facilityCount <= t.max) || REV_SHARE_TIERS[0]
}

export function getNextTier(facilityCount: number) {
  const currentIdx = REV_SHARE_TIERS.findIndex(t => facilityCount >= t.min && facilityCount <= t.max)
  return currentIdx < REV_SHARE_TIERS.length - 1 ? REV_SHARE_TIERS[currentIdx + 1] : null
}
