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

export interface MetaAdContent {
  angle: string
  angleLabel: string
  primaryText: string
  headline: string
  description: string
  cta: string
  targetingNote: string
}

export interface GoogleRSAContent {
  name: string
  headlines: { text: string; pin_position?: number | null }[]
  descriptions: { text: string }[]
  finalUrl: string
  sitelinks: { title: string; description: string }[]
  keywords?: string[]
}

export interface LandingPageContent {
  sections: { section_type: string; sort_order: number; config: Record<string, unknown> }[]
  meta_title: string
  meta_description: string
}

export interface EmailDripContent {
  sequence: {
    step: number
    delayDays: number
    subject: string
    preheader: string
    body: string
    ctaText: string
    ctaUrl: string
    label: string
  }[]
}

export interface AdVariation {
  id: string
  facility_id: string
  brief_id: string | null
  created_at: string
  platform: string
  format: string
  angle: string
  content_json: MetaAdContent | GoogleRSAContent | LandingPageContent | EmailDripContent | Record<string, unknown>
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

export type AdminTab = 'pipeline' | 'kanban' | 'portfolio' | 'optimizer' | 'insights' | 'billing' | 'settings' | 'facilities' | 'sequences' | 'shared-audits' | 'recovery' | 'attribution' | 'whats-new' | 'partners' | 'playbooks' | 'referrals' | 'tenants' | 'churn' | 'upsell' | 'remarketing' | 'activity-log' | 'call-logs' | 'alerts' | 'consumer-leads' | 'ab-tests' | 'campaigns' | 'unit-economics'

export type ConsumerLeadStatus = 'new' | 'contacted' | 'toured' | 'reserved' | 'moved_in' | 'lost'

export interface ConsumerLead {
  id: string
  email: string | null
  phone: string | null
  name: string | null
  unit_size: string | null
  lead_status: ConsumerLeadStatus
  monthly_revenue: number | null
  move_in_date: string | null
  lead_notes: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  fbclid: string | null
  gclid: string | null
  lead_score: number
  scroll_depth: number
  time_on_page: number
  facility_id: string | null
  landing_page_id: string | null
  created_at: string
  converted_at: string | null
  status_updated_at: string | null
  page_title: string | null
  page_slug: string | null
}

export const CONSUMER_LEAD_STATUSES: { value: ConsumerLeadStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-700' },
  { value: 'contacted', label: 'Contacted', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'toured', label: 'Toured', color: 'bg-purple-100 text-purple-700' },
  { value: 'reserved', label: 'Reserved', color: 'bg-amber-100 text-amber-700' },
  { value: 'moved_in', label: 'Moved In', color: 'bg-green-100 text-green-700' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
]

export interface GBPConnection {
  id: string
  facility_id: string
  google_account_id: string | null
  location_id: string | null
  location_name: string | null
  status: string
  last_sync_at: string | null
  sync_config: {
    auto_post: boolean
    auto_respond: boolean
    sync_hours: boolean
    sync_photos: boolean
  }
  created_at: string
  updated_at: string
}

export interface GBPPost {
  id: string
  facility_id: string
  gbp_connection_id: string | null
  post_type: string
  title: string | null
  body: string
  cta_type: string | null
  cta_url: string | null
  image_url: string | null
  offer_code: string | null
  start_date: string | null
  end_date: string | null
  status: string
  scheduled_at: string | null
  published_at: string | null
  external_post_id: string | null
  error_message: string | null
  ai_generated: boolean
  created_at: string
}

export interface GBPReview {
  id: string
  facility_id: string
  gbp_connection_id: string | null
  external_review_id: string | null
  author_name: string | null
  rating: number
  review_text: string | null
  review_time: string | null
  response_text: string | null
  response_status: string
  ai_draft: string | null
  responded_at: string | null
  synced_at: string | null
  created_at: string
}

export interface GBPSyncLog {
  id: string
  facility_id: string
  sync_type: string
  status: string
  changes: Record<string, unknown>
  error_message: string | null
  created_at: string
}

export interface GBPQuestion {
  id: string
  facility_id: string
  gbp_connection_id: string | null
  external_question_id: string | null
  author_name: string | null
  question_text: string
  question_time: string | null
  answer_text: string | null
  answer_status: string
  ai_draft: string | null
  answered_at: string | null
  upvote_count: number
  created_at: string
}

export interface GBPInsights {
  id: string
  facility_id: string
  period_start: string
  period_end: string
  search_views: number
  maps_views: number
  website_clicks: number
  direction_clicks: number
  phone_calls: number
  photo_views: number
  post_views: number
  post_clicks: number
  total_searches: number
  direct_searches: number
  discovery_searches: number
}

export type FacilitySubTab = 'overview' | 'creative' | 'assets' | 'ad-preview' | 'landing-pages' | 'utm-links' | 'calls' | 'gbp' | 'publish'

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
  rsa: '🔍',
  full_page: '📄',
  nurture_sequence: '📧',
}

export const PLATFORM_LABELS: Record<string, string> = {
  meta_feed: 'Meta Ads',
  google_search: 'Google RSA',
  landing_page: 'Landing Page',
  email_drip: 'Email Drip',
}

export const PLATFORM_ICONS: Record<string, string> = {
  meta_feed: '📱',
  google_search: '🔍',
  landing_page: '📄',
  email_drip: '📧',
}

export type GenerationPlatform = 'meta_feed' | 'google_search' | 'landing_page' | 'email_drip' | 'all'

export interface CallTrackingNumber {
  id: string
  facility_id: string
  landing_page_id: string | null
  utm_link_id: string | null
  label: string
  twilio_sid: string
  phone_number: string
  forward_to: string
  status: string
  call_count: number
  total_duration: number
  created_at: string
  landing_page_title?: string
  utm_label?: string
}

export interface CallLog {
  id: string
  tracking_number_id: string
  facility_id: string
  twilio_call_sid: string
  caller_number: string | null
  caller_city: string | null
  caller_state: string | null
  duration: number
  status: string
  recording_url: string | null
  started_at: string
  ended_at: string | null
  created_at: string
  tracking_label?: string
  tracking_number?: string
}

export interface CallSummary {
  total_calls: number
  completed_calls: number
  avg_duration: number
  unique_callers: number
  calls_today: number
  calls_this_week: number
}

export const STOCK_CATEGORIES = ['all', 'exterior', 'interior', 'moving', 'packing', 'lifestyle', 'vehicle'] as const

export const AD_FORMATS: { id: AdFormat; label: string; width: number; height: number }[] = [
  { id: 'instagram_post', label: 'Instagram Post', width: 1080, height: 1080 },
  { id: 'instagram_story', label: 'Instagram Story', width: 1080, height: 1920 },
  { id: 'facebook_feed', label: 'Facebook Feed', width: 1200, height: 628 },
  { id: 'google_display', label: 'Google Display', width: 300, height: 250 },
]

export const STORAGE_KEY = 'stowstack_admin_key'
