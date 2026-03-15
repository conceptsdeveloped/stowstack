/* ── Shared Types ── */

export interface LeadNote {
  text: string
  at: string
}

export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  facilityName: string
  location: string
  occupancyRange: string
  totalUnits: string
  biggestIssue: string
  formNotes: string | null
  status: string
  createdAt: string
  updatedAt: string
  notes: LeadNote[]
  pmsUploaded?: boolean
  accessCode?: string
  followUpDate?: string
}

export interface Facility {
  id: string
  created_at: string
  name: string
  location: string
  contact_name: string
  contact_email: string
  contact_phone: string
  occupancy_range: string
  total_units: string
  biggest_issue: string
  notes: string | null
  status: string
  google_address: string | null
  google_rating: number | null
  review_count: number | null
  website: string | null
  google_maps_url: string | null
  google_phone: string | null
  photos: { index: number; url: string; width: number; height: number }[] | null
  reviews: { author: string; rating: number; text: string; time: string }[] | null
}

export interface AdVariation {
  id: string
  facility_id: string
  brief_id: string | null
  created_at: string
  platform: string
  format: string
  angle: string
  content_json: {
    angle: string
    angleLabel: string
    primaryText: string
    headline: string
    description: string
    cta: string
    targetingNote: string
  }
  asset_urls: Record<string, string> | null
  status: string
  feedback: string | null
  version: number
}

export interface Asset {
  id: string
  facility_id: string
  created_at: string
  type: string
  source: string
  url: string
  metadata: Record<string, unknown> | null
}

export interface PlatformInfo {
  id: string
  name: string
  description: string
  configured: boolean
  connectUrl: string | null
  icon: string
}

export interface PlatformConnection {
  id: string
  facility_id: string
  platform: string
  status: string
  account_id: string | null
  account_name: string | null
  page_id: string | null
  page_name: string | null
  created_at: string
  updated_at: string
  token_expires_at: string | null
  metadata: Record<string, unknown> | null
}

export interface PublishLogEntry {
  id: string
  facility_id: string
  variation_id: string
  connection_id: string
  platform: string
  status: string
  external_id: string | null
  external_url: string | null
  error_message: string | null
  created_at: string
  content_json: Record<string, string> | null
  angle: string | null
  ad_platform: string | null
}

export interface LPSection {
  id: string
  type: string
  config: Record<string, unknown>
}

export interface LandingPageRecord {
  id: string
  facility_id: string
  title: string
  slug: string
  status: string
  created_at: string
  updated_at: string
  sections_json: LPSection[]
  meta_title: string | null
  meta_description: string | null
  og_image: string | null
  custom_css: string | null
  template: string | null
}

export interface DripState {
  id: string
  facility_id: string
  lead_id: string
  sequence_key: string
  current_step: number
  status: string
  started_at: string
  last_sent_at: string | null
  next_send_at: string | null
  lead_name?: string
  lead_email?: string
  facility_name?: string
}

export interface SequenceDef {
  key: string
  name: string
  description: string
  steps: { delay_hours: number; subject: string; preview: string }[]
}

export interface ClientPortfolioData {
  facility_count: number
  total_spend: number
  total_leads: number
  total_revenue: number
  avg_cpl: number
  avg_roas: number
  facilities: {
    id: string
    name: string
    location: string
    status: string
    spend: number
    leads: number
    revenue: number
    cpl: number
    roas: number
    occupancy: number
    trend: number[]
  }[]
  monthly_data: { month: string; spend: number; leads: number; revenue: number }[]
}

export interface CampaignEntry {
  id: string
  name: string
  status: string
  budget: number
  spent: number
  leads: number
  cpl: number
  roas: number
  startDate: string
}

export interface AuditReport {
  id: string
  facility_id: string
  created_at: string
  score: number
  sections: { title: string; score: number; findings: string[]; recommendations: string[] }[]
}

export interface CampaignAlert {
  id: string
  type: 'warning' | 'critical' | 'info'
  message: string
  facility: string
  timestamp: string
  dismissed?: boolean
}

export interface AnalyticsData {
  funnel: { stage: string; count: number }[]
  velocity: { date: string; leads: number; conversions: number }[]
  channels: { name: string; leads: number; spend: number; cpl: number }[]
}

export interface ActivityEntry {
  id: string
  type: string
  message: string
  timestamp: string
  facility?: string
}

export interface Invoice {
  id: string
  date: string
  amount: number
  status: string
  description: string
  pdfUrl?: string
}

export type AdminTab = 'pipeline' | 'kanban' | 'portfolio' | 'insights' | 'billing' | 'settings' | 'facilities' | 'sequences' | 'whats-new'

export type FacilitySubTab = 'overview' | 'creative' | 'assets' | 'ad-preview' | 'landing-pages' | 'utm-links' | 'publish'

export type AdFormat = 'instagram_post' | 'instagram_story' | 'google_display' | 'facebook_feed'

/* ── Constants ── */

export const STATUSES = [
  { value: 'submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  { value: 'form_sent', label: 'Form Sent', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'form_completed', label: 'Form Done', color: 'bg-purple-100 text-purple-700' },
  { value: 'audit_generated', label: 'Audit Ready', color: 'bg-amber-100 text-amber-700' },
  { value: 'call_scheduled', label: 'Call Set', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'client_signed', label: 'Signed', color: 'bg-green-100 text-green-800' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
]

export const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.value, s]))

export const OCCUPANCY_LABELS: Record<string, string> = {
  'below-60': 'Below 60%',
  '60-75': '60–75%',
  '75-85': '75–85%',
  '85-95': '85–95%',
  'above-95': 'Above 95%',
}

export const UNITS_LABELS: Record<string, string> = {
  'under-100': 'Under 100',
  '100-300': '100–300',
  '300-500': '300–500',
  '500+': '500+',
}

export const ISSUE_LABELS: Record<string, string> = {
  'standard-units': 'Standard Units',
  'climate-controlled': 'Climate Controlled',
  'drive-up': 'Drive-Up',
  'vehicle-rv-boat': 'Vehicle/RV/Boat',
  'lease-up': 'Lease-Up',
  'low-occupancy': 'Low Occupancy',
  'other': 'Other',
}

export const FACILITY_STATUSES = ['intake', 'scraped', 'briefed', 'generating', 'review', 'approved', 'live', 'reporting'] as const

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

export const VARIATION_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-emerald-100 text-emerald-700',
  published: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export const ANGLE_ICONS: Record<string, string> = {
  social_proof: '⭐',
  convenience: '📍',
  urgency: '⏰',
  lifestyle: '🏡',
}

export const STOCK_CATEGORIES = ['all', 'exterior', 'interior', 'moving', 'packing', 'lifestyle', 'vehicle'] as const

export const AD_FORMATS: { id: AdFormat; label: string; width: number; height: number }[] = [
  { id: 'instagram_post', label: 'Instagram Post', width: 1080, height: 1080 },
  { id: 'instagram_story', label: 'Instagram Story', width: 1080, height: 1920 },
  { id: 'facebook_feed', label: 'Facebook Feed', width: 1200, height: 628 },
  { id: 'google_display', label: 'Google Display', width: 300, height: 250 },
]

export const STORAGE_KEY = 'stowstack_admin_key'
