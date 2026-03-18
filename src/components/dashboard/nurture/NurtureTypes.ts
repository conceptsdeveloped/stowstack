/* ── Lead Nurture Engine Types ── */

export interface NurtureStep {
  step_number: number
  delay_minutes: number
  channel: 'sms' | 'email'
  subject: string | null
  body: string
  send_window: { start: string; end: string } | null
}

export interface NurtureSequence {
  id: string
  facility_id: string
  name: string
  trigger_type: string
  status: 'active' | 'paused' | 'archived'
  steps: NurtureStep[]
  exit_conditions: string[]
  created_at: string
  updated_at: string
}

export interface NurtureEnrollment {
  id: string
  sequence_id: string
  facility_id: string
  lead_id: string | null
  tenant_id: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  current_step: number
  status: 'active' | 'paused' | 'completed' | 'converted' | 'unsubscribed' | 'failed'
  enrolled_at: string
  next_send_at: string | null
  completed_at: string | null
  exit_reason: string | null
  metadata: Record<string, unknown>
}

export interface NurtureMessage {
  id: string
  enrollment_id: string
  step_number: number
  channel: 'sms' | 'email'
  to_address: string
  subject: string | null
  body: string
  status: string
  external_id: string | null
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  error_message: string | null
  created_at: string
}

export interface SequenceTemplate {
  key: string
  name: string
  trigger_type: string
  stepCount: number
}

export interface NurtureStats {
  totalSequences: number
  activeEnrollments: number
  converted: number
  totalMessages: number
  smsSent: number
  emailSent: number
  deliveryRate: number
}

export const TRIGGER_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  landing_page_abandon: { label: 'Landing Page Abandon', icon: '🚪', color: 'text-orange-500' },
  reservation_abandon: { label: 'Reservation Abandon', icon: '🛒', color: 'text-red-500' },
  post_move_in: { label: 'Post Move-In', icon: '🏠', color: 'text-emerald-500' },
  win_back: { label: 'Win-Back', icon: '🔄', color: 'text-blue-500' },
  post_audit: { label: 'Post Audit', icon: '📋', color: 'text-violet-500' },
  custom: { label: 'Custom', icon: '⚙️', color: 'text-slate-500' },
}

export const CHANNEL_CONFIG = {
  sms: { label: 'SMS', icon: '📱', color: 'text-green-500', bg: 'bg-green-500/10' },
  email: { label: 'Email', icon: '📧', color: 'text-blue-500', bg: 'bg-blue-500/10' },
} as const

export const STATUS_CONFIG = {
  active: { label: 'Active', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
  paused: { label: 'Paused', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
  completed: { label: 'Completed', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  converted: { label: 'Converted', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
  unsubscribed: { label: 'Unsubscribed', bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-400' },
  failed: { label: 'Failed', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
  archived: { label: 'Archived', bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-400' },
} as const

export function formatDelay(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  if (minutes < 1440) return `${Math.round(minutes / 60)}hr`
  return `${Math.round(minutes / 1440)}d`
}
