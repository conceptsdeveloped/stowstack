/* ── Social Command Center Types ── */

export interface SocialPost {
  id: string
  facility_id: string
  platform: 'facebook' | 'instagram' | 'gbp'
  post_type: string
  content: string
  hashtags: string[]
  media_urls: string[]
  cta_url: string | null
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
  scheduled_at: string | null
  published_at: string | null
  external_post_id: string | null
  external_url: string | null
  error_message: string | null
  engagement: {
    reach: number
    impressions: number
    likes: number
    comments: number
    shares: number
    clicks: number
  }
  ai_generated: boolean
  batch_id: string | null
  suggested_image: string | null
  created_at: string
  updated_at: string
}

export const PLATFORM_CONFIG = {
  facebook: { label: 'Facebook', color: 'bg-blue-500', textColor: 'text-blue-500', dotColor: 'bg-blue-500', icon: '📘' },
  instagram: { label: 'Instagram', color: 'bg-pink-500', textColor: 'text-pink-500', dotColor: 'bg-pink-500', icon: '📷' },
  gbp: { label: 'Google Business', color: 'bg-emerald-500', textColor: 'text-emerald-500', dotColor: 'bg-emerald-500', icon: '📍' },
} as const

export const POST_TYPES = {
  promotion: { label: 'Promotion', icon: '🏷️' },
  tip: { label: 'Storage Tip', icon: '💡' },
  testimonial: { label: 'Testimonial', icon: '⭐' },
  seasonal: { label: 'Seasonal', icon: '🌤️' },
  behind_the_scenes: { label: 'Behind the Scenes', icon: '🔧' },
  unit_spotlight: { label: 'Unit Spotlight', icon: '📦' },
  community: { label: 'Community', icon: '🏘️' },
  holiday: { label: 'Holiday', icon: '🎉' },
} as const

export const STATUS_CONFIG = {
  draft: { label: 'Draft', bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-400' },
  scheduled: { label: 'Scheduled', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  publishing: { label: 'Publishing...', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
  published: { label: 'Published', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
  failed: { label: 'Failed', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
} as const

export type Platform = keyof typeof PLATFORM_CONFIG
export type PostType = keyof typeof POST_TYPES
