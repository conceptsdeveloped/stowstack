import {
  Sparkles, Wrench, Zap, Trash2, Settings, Package,
  Eye, AlertTriangle, Bug, MessageSquare, Shield, Star, CheckCircle2, Flag,
} from 'lucide-react'

/* ── Types ── */

export interface ChangedFile {
  status: string
  file: string
}

export interface Commit {
  hash: string
  short: string
  author: string
  email: string
  date: string
  subject: string
  body: string | null
  category: string
  area: string
  coAuthor: string | null
  filesChanged: number
  insertions: number
  deletions: number
  diffSize?: string
  isMerge?: boolean
  parents?: string
  changedFiles?: ChangedFile[]
}

export interface Idea {
  id: string
  title: string
  description: string
  category: string
  priority: string
  status: string
  createdAt: string
  updatedAt: string
  votes: number
}

export interface Enrichment {
  id: string
  commit_hash: string
  dev_note: string | null
  dev_name: string | null
  laymans_summary: string | null
  technical_summary: string | null
  created_at: string
  updated_at: string
}

export interface CommitFlag {
  id: string
  commit_hash: string
  flag_type: string
  reason: string
  flagged_by: string
  created_at: string
}

export interface CommitComment {
  id: string
  commit_hash: string
  author: string
  body: string
  created_at: string
}

export interface CommitReview {
  id: string
  commit_hash: string
  reviewed_by: string
  status: string
  created_at: string
}

export interface DevHandoff {
  id: string
  from_dev: string
  to_dev: string | null
  title: string
  body: string
  commit_hash: string | null
  status: string
  created_at: string
  updated_at: string
}

/* ── Constants ── */

export const CATEGORY_CONFIG: Record<string, { label: string; color: string; darkColor: string; icon: typeof Sparkles; chartColor: string }> = {
  feature:     { label: 'Feature',     color: 'bg-emerald-100 text-emerald-700', darkColor: 'bg-emerald-900/30 text-emerald-400', icon: Sparkles, chartColor: '#10b981' },
  fix:         { label: 'Fix',         color: 'bg-red-100 text-red-700',         darkColor: 'bg-red-900/30 text-red-400',         icon: Wrench,   chartColor: '#ef4444' },
  improvement: { label: 'Improved',    color: 'bg-blue-100 text-blue-700',       darkColor: 'bg-blue-900/30 text-blue-400',       icon: Zap,      chartColor: '#3b82f6' },
  removal:     { label: 'Removed',     color: 'bg-orange-100 text-orange-700',   darkColor: 'bg-orange-900/30 text-orange-400',   icon: Trash2,   chartColor: '#f97316' },
  config:      { label: 'Config',      color: 'bg-slate-100 text-slate-600',     darkColor: 'bg-slate-700 text-slate-300',        icon: Settings, chartColor: '#94a3b8' },
  other:       { label: 'Other',       color: 'bg-slate-100 text-slate-600',     darkColor: 'bg-slate-700 text-slate-300',        icon: Package,  chartColor: '#64748b' },
}

export const AREA_CONFIG: Record<string, { label: string; color: string; chartColor: string }> = {
  admin:          { label: 'Admin',         color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', chartColor: '#a855f7' },
  integrations:   { label: 'Integrations',  color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', chartColor: '#6366f1' },
  creative:       { label: 'Creative',      color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400', chartColor: '#ec4899' },
  forms:          { label: 'Forms',         color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', chartColor: '#f59e0b' },
  email:          { label: 'Email',         color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', chartColor: '#06b6d4' },
  api:            { label: 'API',           color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400', chartColor: '#14b8a6' },
  client:         { label: 'Client',        color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400', chartColor: '#0ea5e9' },
  blog:           { label: 'Blog',          color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', chartColor: '#f43f5e' },
  tracking:       { label: 'Tracking',      color: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400', chartColor: '#84cc16' },
  website:        { label: 'Website',       color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', chartColor: '#8b5cf6' },
  'landing-pages':{ label: 'Landing Pages', color: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400', chartColor: '#d946ef' },
  general:        { label: 'General',       color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', chartColor: '#64748b' },
}

export const FLAG_CONFIG: Record<string, { label: string; color: string; darkColor: string; icon: typeof Flag }> = {
  'needs-review':      { label: 'Needs Review',      color: 'bg-amber-100 text-amber-700 border-amber-300',   darkColor: 'bg-amber-900/30 text-amber-400 border-amber-700',   icon: Eye },
  'breaking-change':   { label: 'Breaking Change',   color: 'bg-red-100 text-red-700 border-red-300',         darkColor: 'bg-red-900/30 text-red-400 border-red-700',         icon: AlertTriangle },
  'hotfix':            { label: 'Hotfix',             color: 'bg-orange-100 text-orange-700 border-orange-300', darkColor: 'bg-orange-900/30 text-orange-400 border-orange-700', icon: Bug },
  'discussion-needed': { label: 'Discussion Needed',  color: 'bg-purple-100 text-purple-700 border-purple-300', darkColor: 'bg-purple-900/30 text-purple-400 border-purple-700', icon: MessageSquare },
  'blocked':           { label: 'Blocked',            color: 'bg-red-100 text-red-700 border-red-300',         darkColor: 'bg-red-900/30 text-red-400 border-red-700',         icon: Shield },
  'good-example':      { label: 'Good Example',       color: 'bg-emerald-100 text-emerald-700 border-emerald-300', darkColor: 'bg-emerald-900/30 text-emerald-400 border-emerald-700', icon: Star },
  'needs-testing':     { label: 'Needs Testing',      color: 'bg-blue-100 text-blue-700 border-blue-300',     darkColor: 'bg-blue-900/30 text-blue-400 border-blue-700',     icon: CheckCircle2 },
}

export const IDEA_CATEGORIES = ['feature', 'improvement', 'bug', 'integration', 'design', 'content', 'general']
export const IDEA_PRIORITIES = ['low', 'medium', 'high', 'critical']
export const IDEA_STATUSES = ['new', 'considering', 'planned', 'in-progress', 'done', 'shelved']

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export const STATUS_COLORS: Record<string, string> = {
  new: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  considering: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  planned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'in-progress': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  shelved: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
}

export const DIFF_SIZE_CONFIG: Record<string, { label: string; color: string; darkColor: string }> = {
  tiny:    { label: 'Tiny',    color: 'bg-slate-100 text-slate-600',   darkColor: 'bg-slate-700 text-slate-300' },
  small:   { label: 'Small',   color: 'bg-green-100 text-green-700',   darkColor: 'bg-green-900/30 text-green-400' },
  medium:  { label: 'Medium',  color: 'bg-blue-100 text-blue-700',     darkColor: 'bg-blue-900/30 text-blue-400' },
  large:   { label: 'Large',   color: 'bg-amber-100 text-amber-700',   darkColor: 'bg-amber-900/30 text-amber-400' },
  massive: { label: 'Massive', color: 'bg-red-100 text-red-700',       darkColor: 'bg-red-900/30 text-red-400' },
}

export const FILE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  A: { label: 'Added',    color: 'text-green-500' },
  M: { label: 'Modified', color: 'text-blue-500' },
  D: { label: 'Deleted',  color: 'text-red-500' },
  R: { label: 'Renamed',  color: 'text-amber-500' },
  C: { label: 'Copied',   color: 'text-purple-500' },
}

export const REVIEW_STATUS_CONFIG: Record<string, { label: string; color: string; darkColor: string }> = {
  reviewed:       { label: 'Reviewed',       color: 'bg-blue-100 text-blue-700',    darkColor: 'bg-blue-900/30 text-blue-400' },
  approved:       { label: 'Approved',       color: 'bg-emerald-100 text-emerald-700', darkColor: 'bg-emerald-900/30 text-emerald-400' },
  'needs-changes': { label: 'Needs Changes', color: 'bg-amber-100 text-amber-700',  darkColor: 'bg-amber-900/30 text-amber-400' },
}
