import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Search, ChevronDown, ChevronUp, GitCommit, User, Calendar,
  Sparkles, Wrench, Zap, Trash2, Settings, Package, Filter,
  Clock, Code, Tag, TrendingUp, TrendingDown, Minus, FileText,
  Plus, Eye, Lightbulb, ArrowUp, ArrowDown,
  Send, X as XIcon, BarChart3
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart as RPieChart, Pie
} from 'recharts'
import commitsData from '@/data/commits.json'

/* ── Types ── */

interface Commit {
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
}

interface Idea {
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

const commits = commitsData as Commit[]

/* ── Constants ── */

const CATEGORY_CONFIG: Record<string, { label: string; color: string; darkColor: string; icon: typeof Sparkles; chartColor: string }> = {
  feature:     { label: 'Feature',     color: 'bg-emerald-100 text-emerald-700', darkColor: 'bg-emerald-900/30 text-emerald-400', icon: Sparkles, chartColor: '#10b981' },
  fix:         { label: 'Fix',         color: 'bg-red-100 text-red-700',         darkColor: 'bg-red-900/30 text-red-400',         icon: Wrench,   chartColor: '#ef4444' },
  improvement: { label: 'Improved',    color: 'bg-blue-100 text-blue-700',       darkColor: 'bg-blue-900/30 text-blue-400',       icon: Zap,      chartColor: '#3b82f6' },
  removal:     { label: 'Removed',     color: 'bg-orange-100 text-orange-700',   darkColor: 'bg-orange-900/30 text-orange-400',   icon: Trash2,   chartColor: '#f97316' },
  config:      { label: 'Config',      color: 'bg-slate-100 text-slate-600',     darkColor: 'bg-slate-700 text-slate-300',        icon: Settings, chartColor: '#94a3b8' },
  other:       { label: 'Other',       color: 'bg-slate-100 text-slate-600',     darkColor: 'bg-slate-700 text-slate-300',        icon: Package,  chartColor: '#64748b' },
}

const AREA_CONFIG: Record<string, { label: string; color: string; chartColor: string }> = {
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

const IDEA_CATEGORIES = ['feature', 'improvement', 'bug', 'integration', 'design', 'content', 'general']
const IDEA_PRIORITIES = ['low', 'medium', 'high', 'critical']
const IDEA_STATUSES = ['new', 'considering', 'planned', 'in-progress', 'done', 'shelved']

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  considering: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  planned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'in-progress': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  shelved: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
}

/* ── Helpers ── */

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatShortDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return formatDate(iso)
}

function groupByDate(items: Commit[]): Record<string, Commit[]> {
  const groups: Record<string, Commit[]> = {}
  for (const c of items) {
    const key = formatDate(c.date)
    if (!groups[key]) groups[key] = []
    groups[key].push(c)
  }
  return groups
}

function groupByWeek(items: Commit[]): Record<string, Commit[]> {
  const groups: Record<string, Commit[]> = {}
  for (const c of items) {
    const d = new Date(c.date)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = `Week of ${formatShortDate(weekStart.toISOString())}`
    if (!groups[key]) groups[key] = []
    groups[key].push(c)
  }
  return groups
}

function getAuthorInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function getAuthorColor(name: string) {
  const colors = [
    'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500'
  ]
  let hash = 0
  for (const c of name) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0
  return colors[Math.abs(hash) % colors.length]
}

function getISODateKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10)
}

/* ── Sub-sections ── */

type Section = 'overview' | 'timeline' | 'ideas'

/* ── Component ── */

export default function WhatsNew({ darkMode, adminKey }: { darkMode: boolean; adminKey: string }) {
  const [activeSection, setActiveSection] = useState<Section>('overview')
  const [search, setSearch] = useState('')
  const [expandedHash, setExpandedHash] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [authorFilter, setAuthorFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [visibleCount, setVisibleCount] = useState(30)
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily')

  // Ideas state
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [ideasLoading, setIdeasLoading] = useState(false)
  const [showIdeaForm, setShowIdeaForm] = useState(false)
  const [newIdea, setNewIdea] = useState({ title: '', description: '', category: 'general', priority: 'medium' })
  const [ideaFilter, setIdeaFilter] = useState<string>('all')
  const [ideaSaving, setIdeaSaving] = useState(false)

  // New since last visit
  const [lastVisit, setLastVisit] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('stowstack_whatsnew_last_visit')
    if (stored) setLastVisit(stored)
    localStorage.setItem('stowstack_whatsnew_last_visit', new Date().toISOString())
  }, [])

  // Fetch ideas
  const fetchIdeas = useCallback(async () => {
    setIdeasLoading(true)
    try {
      const res = await fetch('/api/ideas', { headers: { 'X-Admin-Key': adminKey } })
      if (res.ok) {
        const data = await res.json()
        setIdeas(data.ideas || [])
      }
    } catch { /* ignore */ }
    setIdeasLoading(false)
  }, [adminKey])

  useEffect(() => { fetchIdeas() }, [fetchIdeas])

  const saveIdea = async () => {
    if (!newIdea.title.trim()) return
    setIdeaSaving(true)
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify(newIdea),
      })
      if (res.ok) {
        const data = await res.json()
        setIdeas(prev => [data.idea, ...prev])
        setNewIdea({ title: '', description: '', category: 'general', priority: 'medium' })
        setShowIdeaForm(false)
      }
    } catch { /* ignore */ }
    setIdeaSaving(false)
  }

  const updateIdea = async (id: string, updates: Partial<Idea>) => {
    try {
      const res = await fetch('/api/ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ id, ...updates }),
      })
      if (res.ok) {
        const data = await res.json()
        setIdeas(prev => prev.map(i => i.id === id ? data.idea : i))
      }
    } catch { /* ignore */ }
  }

  const deleteIdea = async (id: string) => {
    try {
      await fetch('/api/ideas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ id }),
      })
      setIdeas(prev => prev.filter(i => i.id !== id))
    } catch { /* ignore */ }
  }

  const voteIdea = (id: string, dir: number) => {
    const idea = ideas.find(i => i.id === id)
    if (idea) updateIdea(id, { votes: Math.max(0, idea.votes + dir) })
  }

  /* Derived data */
  const authors = useMemo(() => [...new Set(commits.map(c => c.author))].sort(), [])
  const categories = useMemo(() => [...new Set(commits.map(c => c.category))].sort(), [])
  const areas = useMemo(() => [...new Set(commits.map(c => c.area))].sort(), [])

  const filtered = useMemo(() => {
    let result = commits
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.subject.toLowerCase().includes(q) ||
        c.body?.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q) ||
        c.short.toLowerCase().includes(q)
      )
    }
    if (categoryFilter !== 'all') result = result.filter(c => c.category === categoryFilter)
    if (areaFilter !== 'all') result = result.filter(c => c.area === areaFilter)
    if (authorFilter !== 'all') result = result.filter(c => c.author === authorFilter)
    return result
  }, [search, categoryFilter, areaFilter, authorFilter])

  const grouped = useMemo(() => {
    const slice = filtered.slice(0, visibleCount)
    return viewMode === 'weekly' ? groupByWeek(slice) : groupByDate(slice)
  }, [filtered, visibleCount, viewMode])

  const newSinceLastVisit = useMemo(() => {
    if (!lastVisit) return 0
    return commits.filter(c => new Date(c.date) > new Date(lastVisit)).length
  }, [lastVisit])

  /* Stats */
  const stats = useMemo(() => {
    const byAuthor: Record<string, number> = {}
    const byCat: Record<string, number> = {}
    const byArea: Record<string, number> = {}
    let totalFiles = 0, totalIns = 0, totalDel = 0
    for (const c of commits) {
      byAuthor[c.author] = (byAuthor[c.author] || 0) + 1
      byCat[c.category] = (byCat[c.category] || 0) + 1
      byArea[c.area] = (byArea[c.area] || 0) + 1
      totalFiles += c.filesChanged
      totalIns += c.insertions
      totalDel += c.deletions
    }
    return { byAuthor, byCat, byArea, total: commits.length, totalFiles, totalIns, totalDel }
  }, [])

  /* Activity chart data — commits per day */
  const activityData = useMemo(() => {
    const byDay: Record<string, { date: string; commits: number; insertions: number; deletions: number }> = {}
    for (const c of commits) {
      const key = getISODateKey(c.date)
      if (!byDay[key]) byDay[key] = { date: key, commits: 0, insertions: 0, deletions: 0 }
      byDay[key].commits++
      byDay[key].insertions += c.insertions
      byDay[key].deletions += c.deletions
    }
    return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date))
  }, [])

  /* Velocity */
  const velocity = useMemo(() => {
    const now = Date.now()
    const oneWeek = 7 * 24 * 60 * 60 * 1000
    const thisWeek = commits.filter(c => now - new Date(c.date).getTime() < oneWeek).length
    const lastWeek = commits.filter(c => {
      const age = now - new Date(c.date).getTime()
      return age >= oneWeek && age < 2 * oneWeek
    }).length
    const change = lastWeek === 0 ? (thisWeek > 0 ? 100 : 0) : Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
    return { thisWeek, lastWeek, change }
  }, [])

  /* Heatmap data — last 12 weeks */
  const heatmapData = useMemo(() => {
    const now = new Date()
    const days: { date: string; count: number; dayOfWeek: number; weekIdx: number }[] = []
    const countMap: Record<string, number> = {}
    for (const c of commits) countMap[getISODateKey(c.date)] = (countMap[getISODateKey(c.date)] || 0) + 1

    for (let w = 11; w >= 0; w--) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(now)
        date.setDate(now.getDate() - (w * 7 + (now.getDay() - d)))
        const key = getISODateKey(date.toISOString())
        days.push({ date: key, count: countMap[key] || 0, dayOfWeek: d, weekIdx: 11 - w })
      }
    }
    return days
  }, [])

  /* Area pie data */
  const areaPieData = useMemo(() => {
    return Object.entries(stats.byArea)
      .map(([name, value]) => ({
        name: AREA_CONFIG[name]?.label || name,
        value,
        fill: AREA_CONFIG[name]?.chartColor || '#64748b',
      }))
      .sort((a, b) => b.value - a.value)
  }, [stats])

  /* Category bar data */
  const categoryBarData = useMemo(() => {
    return Object.entries(stats.byCat)
      .map(([name, value]) => ({
        name: CATEGORY_CONFIG[name]?.label || name,
        value,
        fill: CATEGORY_CONFIG[name]?.chartColor || '#64748b',
      }))
      .sort((a, b) => b.value - a.value)
  }, [stats])

  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
  const heading = darkMode ? 'text-white' : 'text-slate-900'

  return (
    <div className="space-y-6">
      {/* Section tabs */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {([
          ['overview', 'Overview', BarChart3],
          ['timeline', 'Timeline', GitCommit],
          ['ideas', 'Idea Dump', Lightbulb],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeSection === id
                ? `${darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'} border border-emerald-500/30`
                : `${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`
            }`}
          >
            <Icon size={15} />
            {label}
            {id === 'ideas' && ideas.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                {ideas.length}
              </span>
            )}
            {id === 'timeline' && newSinceLastVisit > 0 && (
              <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {newSinceLastVisit} new
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════ OVERVIEW SECTION ═══════════════ */}
      {activeSection === 'overview' && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className={`rounded-xl border p-4 ${card}`}>
              <div className="flex items-center gap-2 mb-1">
                <GitCommit size={16} className="text-emerald-500" />
                <span className={`text-xs font-medium ${sub}`}>Total Commits</span>
              </div>
              <p className={`text-2xl font-bold ${heading}`}>{stats.total}</p>
            </div>
            <div className={`rounded-xl border p-4 ${card}`}>
              <div className="flex items-center gap-2 mb-1">
                <FileText size={16} className="text-blue-500" />
                <span className={`text-xs font-medium ${sub}`}>Files Changed</span>
              </div>
              <p className={`text-2xl font-bold ${heading}`}>{stats.totalFiles.toLocaleString()}</p>
            </div>
            <div className={`rounded-xl border p-4 ${card}`}>
              <div className="flex items-center gap-2 mb-1">
                <Plus size={16} className="text-emerald-500" />
                <span className={`text-xs font-medium ${sub}`}>Lines Added</span>
              </div>
              <p className={`text-2xl font-bold text-emerald-600`}>+{stats.totalIns.toLocaleString()}</p>
            </div>
            <div className={`rounded-xl border p-4 ${card}`}>
              <div className="flex items-center gap-2 mb-1">
                <Minus size={16} className="text-red-500" />
                <span className={`text-xs font-medium ${sub}`}>Lines Removed</span>
              </div>
              <p className={`text-2xl font-bold text-red-500`}>-{stats.totalDel.toLocaleString()}</p>
            </div>
          </div>

          {/* Velocity card */}
          <div className={`rounded-xl border p-5 ${card}`}>
            <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              <TrendingUp size={16} className="text-emerald-500" /> Velocity
            </h3>
            <div className="flex items-center gap-6">
              <div>
                <p className={`text-3xl font-bold ${heading}`}>{velocity.thisWeek}</p>
                <p className={`text-xs ${sub}`}>commits this week</p>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${
                velocity.change > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : velocity.change < 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
              }`}>
                {velocity.change > 0 ? <TrendingUp size={14} /> : velocity.change < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                {velocity.change > 0 ? '+' : ''}{velocity.change}%
              </div>
              <div className={`text-xs ${sub}`}>
                vs {velocity.lastWeek} last week
              </div>
            </div>
          </div>

          {/* Activity chart */}
          <div className={`rounded-xl border p-5 ${card}`}>
            <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              Commit Activity
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={v => formatShortDate(v)}
                    stroke={darkMode ? '#64748b' : '#94a3b8'}
                    fontSize={11}
                  />
                  <YAxis stroke={darkMode ? '#64748b' : '#94a3b8'} fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? '#1e293b' : '#fff',
                      border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelFormatter={v => formatDate(v as string)}
                  />
                  <Area type="monotone" dataKey="commits" stroke="#10b981" fill="#10b98133" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Heatmap */}
          <div className={`rounded-xl border p-5 ${card}`}>
            <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              Contribution Heatmap (12 weeks)
            </h3>
            <div className="flex gap-4">
              <div className="flex flex-col gap-0.5 text-[10px] pr-1 pt-0.5">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                  <div key={d} className={`h-[14px] flex items-center ${sub} ${i % 2 === 0 ? '' : 'opacity-0'}`}>{d}</div>
                ))}
              </div>
              <div className="flex gap-0.5 flex-1 overflow-x-auto">
                {Array.from({ length: 12 }, (_, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-0.5">
                    {Array.from({ length: 7 }, (_, dayIdx) => {
                      const cell = heatmapData.find(d => d.weekIdx === weekIdx && d.dayOfWeek === dayIdx)
                      const count = cell?.count || 0
                      const bg = count === 0
                        ? darkMode ? 'bg-slate-700' : 'bg-slate-100'
                        : count <= 2
                          ? 'bg-emerald-200 dark:bg-emerald-900/50'
                          : count <= 5
                            ? 'bg-emerald-400 dark:bg-emerald-700'
                            : 'bg-emerald-600 dark:bg-emerald-500'
                      return (
                        <div
                          key={dayIdx}
                          className={`w-[14px] h-[14px] rounded-sm ${bg}`}
                          title={cell ? `${cell.date}: ${count} commit${count !== 1 ? 's' : ''}` : ''}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
              <div className="flex items-end gap-1 ml-2">
                <span className={`text-[10px] ${sub}`}>Less</span>
                <div className={`w-3 h-3 rounded-sm ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`} />
                <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900/50" />
                <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
                <div className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
                <span className={`text-[10px] ${sub}`}>More</span>
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category breakdown */}
            <div className={`rounded-xl border p-5 ${card}`}>
              <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                By Category
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryBarData} layout="vertical">
                    <XAxis type="number" stroke={darkMode ? '#64748b' : '#94a3b8'} fontSize={11} />
                    <YAxis type="category" dataKey="name" stroke={darkMode ? '#64748b' : '#94a3b8'} fontSize={11} width={70} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: darkMode ? '#1e293b' : '#fff',
                        border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {categoryBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Area breakdown */}
            <div className={`rounded-xl border p-5 ${card}`}>
              <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                By Area
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie
                      data={areaPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {areaPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: darkMode ? '#1e293b' : '#fff',
                        border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {areaPieData.slice(0, 6).map(a => (
                  <div key={a.name} className="flex items-center gap-1.5 text-[10px]">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.fill }} />
                    <span className={sub}>{a.name} ({a.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contributors */}
          <div className={`rounded-xl border p-5 ${card}`}>
            <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Contributors</h3>
            <div className="flex flex-wrap gap-3">
              {authors.map(name => {
                const count = stats.byAuthor[name]
                const pct = Math.round((count / stats.total) * 100)
                return (
                  <button
                    key={name}
                    onClick={() => { setAuthorFilter(authorFilter === name ? 'all' : name); setActiveSection('timeline') }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                      authorFilter === name
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : darkMode ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${getAuthorColor(name)}`}>
                      {getAuthorInitials(name)}
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{name}</p>
                      <p className={`text-xs ${sub}`}>{count} commits ({pct}%)</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ═══════════════ TIMELINE SECTION ═══════════════ */}
      {activeSection === 'timeline' && (
        <>
          {/* New since last visit banner */}
          {newSinceLastVisit > 0 && (
            <div className={`rounded-xl border p-4 flex items-center gap-3 ${
              darkMode ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'
            }`}>
              <Eye size={18} className="text-emerald-500" />
              <p className={`text-sm font-medium ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                {newSinceLastVisit} new commit{newSinceLastVisit !== 1 ? 's' : ''} since your last visit
              </p>
            </div>
          )}

          {/* Search + Filters + View toggle */}
          <div className={`rounded-xl border p-4 ${card}`}>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                <input
                  type="text"
                  placeholder="Search commits by message, author, or hash..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm ${inputBg}`}
                />
              </div>
              <div className="flex gap-2">
                <div className={`flex rounded-lg border overflow-hidden ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}>
                  <button
                    onClick={() => setViewMode('daily')}
                    className={`px-3 py-2 text-xs font-medium cursor-pointer ${
                      viewMode === 'daily'
                        ? darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                        : darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setViewMode('weekly')}
                    className={`px-3 py-2 text-xs font-medium cursor-pointer ${
                      viewMode === 'weekly'
                        ? darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                        : darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Weekly
                  </button>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                    showFilters || categoryFilter !== 'all' || areaFilter !== 'all'
                      ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                      : darkMode ? 'border-slate-600 text-slate-300 hover:border-slate-500' : 'border-slate-300 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <Filter size={14} />
                  Filters
                  {(categoryFilter !== 'all' || areaFilter !== 'all') && (
                    <span className="bg-emerald-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                      {(categoryFilter !== 'all' ? 1 : 0) + (areaFilter !== 'all' ? 1 : 0)}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 grid sm:grid-cols-3 gap-3">
                <div>
                  <label className={`text-xs font-medium ${sub} mb-1 block`}>Category</label>
                  <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm ${inputBg}`}>
                    <option value="all">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{CATEGORY_CONFIG[c]?.label || c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`text-xs font-medium ${sub} mb-1 block`}>Area</label>
                  <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm ${inputBg}`}>
                    <option value="all">All Areas</option>
                    {areas.map(a => <option key={a} value={a}>{AREA_CONFIG[a]?.label || a}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`text-xs font-medium ${sub} mb-1 block`}>Author</label>
                  <select value={authorFilter} onChange={e => setAuthorFilter(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm ${inputBg}`}>
                    <option value="all">All Authors</option>
                    {authors.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className={`text-xs ${sub}`}>
              Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} commits
              {(categoryFilter !== 'all' || areaFilter !== 'all' || authorFilter !== 'all' || search) && (
                <button
                  onClick={() => { setCategoryFilter('all'); setAreaFilter('all'); setAuthorFilter('all'); setSearch('') }}
                  className="ml-2 text-emerald-600 hover:text-emerald-700"
                >
                  Clear filters
                </button>
              )}
            </p>
          </div>

          {/* Timeline */}
          <div className="space-y-8">
            {Object.entries(grouped).map(([date, dateCommits]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Calendar size={12} />
                    {date}
                  </div>
                  <div className={`flex-1 h-px ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <span className={`text-xs ${sub}`}>{dateCommits.length} commit{dateCommits.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="space-y-2 ml-2">
                  {dateCommits.map(commit => {
                    const catConfig = CATEGORY_CONFIG[commit.category] || CATEGORY_CONFIG.other
                    const CatIcon = catConfig.icon
                    const isExpanded = expandedHash === commit.hash
                    const isNew = lastVisit && new Date(commit.date) > new Date(lastVisit)

                    return (
                      <div
                        key={commit.hash}
                        className={`rounded-xl border transition-all ${
                          isNew ? 'ring-1 ring-emerald-500/30' : ''
                        } ${
                          isExpanded
                            ? darkMode ? 'bg-slate-750 border-slate-600' : 'bg-slate-50 border-slate-300'
                            : `${card} hover:border-slate-400 dark:hover:border-slate-500`
                        }`}
                      >
                        <button
                          onClick={() => setExpandedHash(isExpanded ? null : commit.hash)}
                          className="w-full text-left px-4 py-3 flex items-start gap-3 cursor-pointer"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5 ${getAuthorColor(commit.author)}`}>
                            {getAuthorInitials(commit.author)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium leading-snug ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                                {commit.subject}
                              </p>
                              {isNew && (
                                <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0">NEW</span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                                darkMode ? catConfig.darkColor : catConfig.color
                              }`}>
                                <CatIcon size={10} />
                                {catConfig.label}
                              </span>

                              {commit.area !== 'general' && (
                                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  AREA_CONFIG[commit.area]?.color || AREA_CONFIG.general.color
                                }`}>
                                  <Tag size={9} />
                                  {AREA_CONFIG[commit.area]?.label || commit.area}
                                </span>
                              )}

                              <span className={`text-xs ${sub}`}>{commit.author}</span>
                              <span className={`text-xs ${sub}`}>
                                <Clock size={10} className="inline mr-0.5 -mt-px" />
                                {timeAgo(commit.date)}
                              </span>
                              <code className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {commit.short}
                              </code>

                              {/* File stats inline */}
                              {commit.filesChanged > 0 && (
                                <span className={`text-[10px] ${sub}`}>
                                  {commit.filesChanged} file{commit.filesChanged !== 1 ? 's' : ''}
                                  {commit.insertions > 0 && <span className="text-emerald-500 ml-1">+{commit.insertions}</span>}
                                  {commit.deletions > 0 && <span className="text-red-500 ml-1">-{commit.deletions}</span>}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className={`shrink-0 mt-1 ${sub}`}>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className={`px-4 pb-4 pt-0 ml-11 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                            <div className="pt-3 space-y-3">
                              {commit.body && (
                                <div className={`text-sm leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                  {commit.body}
                                </div>
                              )}

                              {/* File change bar */}
                              {(commit.insertions > 0 || commit.deletions > 0) && (
                                <div className="flex items-center gap-3">
                                  <span className={`text-xs ${sub}`}>{commit.filesChanged} files changed</span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-emerald-500 font-medium">+{commit.insertions}</span>
                                    <span className="text-xs text-red-500 font-medium">-{commit.deletions}</span>
                                  </div>
                                  <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                                    <div
                                      className="bg-emerald-500 h-full"
                                      style={{ width: `${(commit.insertions / (commit.insertions + commit.deletions)) * 100}%` }}
                                    />
                                    <div
                                      className="bg-red-500 h-full"
                                      style={{ width: `${(commit.deletions / (commit.insertions + commit.deletions)) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs ${sub}`}>
                                <div className="flex items-center gap-2">
                                  <User size={12} />
                                  <span className="font-medium">Author:</span>
                                  <span>{commit.author} &lt;{commit.email}&gt;</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar size={12} />
                                  <span className="font-medium">Date:</span>
                                  <span>{formatDate(commit.date)} at {formatTime(commit.date)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Code size={12} />
                                  <span className="font-medium">Full Hash:</span>
                                  <code className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                                    darkMode ? 'bg-slate-700' : 'bg-slate-100'
                                  }`}>{commit.hash.slice(0, 12)}</code>
                                </div>
                                {commit.coAuthor && (
                                  <div className="flex items-center gap-2">
                                    <User size={12} />
                                    <span className="font-medium">Co-Author:</span>
                                    <span>{commit.coAuthor}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {visibleCount < filtered.length && (
            <div className="text-center">
              <button
                onClick={() => setVisibleCount(v => v + 30)}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                  darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ChevronDown size={14} />
                Load more ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          )}

          {filtered.length === 0 && (
            <div className={`text-center py-12 ${sub}`}>
              <Search size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">No commits match your search</p>
              <button
                onClick={() => { setSearch(''); setCategoryFilter('all'); setAreaFilter('all'); setAuthorFilter('all') }}
                className="text-emerald-600 hover:text-emerald-700 text-sm mt-2"
              >
                Clear all filters
              </button>
            </div>
          )}
        </>
      )}

      {/* ═══════════════ IDEA DUMP SECTION ═══════════════ */}
      {activeSection === 'ideas' && (
        <>
          {/* Add idea button */}
          <div className="flex items-center justify-between">
            <p className={`text-sm ${sub}`}>
              {ideas.length} idea{ideas.length !== 1 ? 's' : ''} recorded
            </p>
            <button
              onClick={() => setShowIdeaForm(!showIdeaForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              {showIdeaForm ? <XIcon size={14} /> : <Plus size={14} />}
              {showIdeaForm ? 'Cancel' : 'New Idea'}
            </button>
          </div>

          {/* New idea form */}
          {showIdeaForm && (
            <div className={`rounded-xl border p-5 ${card}`}>
              <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                <Lightbulb size={16} className="text-amber-500" /> Capture Your Idea
              </h3>
              <div className="space-y-3">
                <div>
                  <label className={`text-xs font-medium ${sub} mb-1 block`}>Title *</label>
                  <input
                    type="text"
                    placeholder="What's the idea? Keep it punchy..."
                    value={newIdea.title}
                    onChange={e => setNewIdea(prev => ({ ...prev, title: e.target.value }))}
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${inputBg}`}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) saveIdea() }}
                  />
                </div>
                <div>
                  <label className={`text-xs font-medium ${sub} mb-1 block`}>Description (optional)</label>
                  <textarea
                    placeholder="Add context, reasoning, or implementation notes..."
                    value={newIdea.description}
                    onChange={e => setNewIdea(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className={`w-full rounded-lg border px-3 py-2 text-sm resize-none ${inputBg}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-medium ${sub} mb-1 block`}>Category</label>
                    <select
                      value={newIdea.category}
                      onChange={e => setNewIdea(prev => ({ ...prev, category: e.target.value }))}
                      className={`w-full rounded-lg border px-3 py-2 text-sm ${inputBg}`}
                    >
                      {IDEA_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${sub} mb-1 block`}>Priority</label>
                    <select
                      value={newIdea.priority}
                      onChange={e => setNewIdea(prev => ({ ...prev, priority: e.target.value }))}
                      className={`w-full rounded-lg border px-3 py-2 text-sm ${inputBg}`}
                    >
                      {IDEA_PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={saveIdea}
                    disabled={!newIdea.title.trim() || ideaSaving}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <Send size={14} />
                    {ideaSaving ? 'Saving...' : 'Save Idea'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Idea filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {['all', ...IDEA_STATUSES].map(s => (
              <button
                key={s}
                onClick={() => setIdeaFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  ideaFilter === s
                    ? darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                    : `${sub} ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`
                }`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
                {s === 'all' ? ` (${ideas.length})` : ` (${ideas.filter(i => i.status === s).length})`}
              </button>
            ))}
          </div>

          {/* Ideas list */}
          <div className="space-y-3">
            {(ideaFilter === 'all' ? ideas : ideas.filter(i => i.status === ideaFilter)).map(idea => (
              <div key={idea.id} className={`rounded-xl border p-4 ${card}`}>
                <div className="flex items-start gap-3">
                  {/* Vote buttons */}
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => voteIdea(idea.id, 1)}
                      className={`p-1 rounded transition-colors cursor-pointer ${darkMode ? 'hover:bg-slate-700 text-slate-500 hover:text-emerald-400' : 'hover:bg-slate-100 text-slate-400 hover:text-emerald-600'}`}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <span className={`text-sm font-bold ${idea.votes > 0 ? 'text-emerald-500' : sub}`}>{idea.votes}</span>
                    <button
                      onClick={() => voteIdea(idea.id, -1)}
                      className={`p-1 rounded transition-colors cursor-pointer ${darkMode ? 'hover:bg-slate-700 text-slate-500 hover:text-red-400' : 'hover:bg-slate-100 text-slate-400 hover:text-red-600'}`}
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                      {idea.title}
                    </p>
                    {idea.description && (
                      <p className={`text-xs mt-1 ${sub}`}>{idea.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${PRIORITY_COLORS[idea.priority] || PRIORITY_COLORS.medium}`}>
                        {idea.priority}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[idea.status] || STATUS_COLORS.new}`}>
                        {idea.status.replace('-', ' ')}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                        {idea.category}
                      </span>
                      <span className={`text-[10px] ${sub}`}>
                        {timeAgo(idea.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <select
                      value={idea.status}
                      onChange={e => updateIdea(idea.id, { status: e.target.value })}
                      className={`rounded border px-2 py-1 text-[10px] ${inputBg} cursor-pointer`}
                    >
                      {IDEA_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}</option>)}
                    </select>
                    <button
                      onClick={() => deleteIdea(idea.id)}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${darkMode ? 'text-slate-600 hover:text-red-400 hover:bg-slate-700' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                      title="Delete idea"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {ideas.length === 0 && !ideasLoading && (
            <div className={`text-center py-12 ${sub}`}>
              <Lightbulb size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">No ideas yet</p>
              <p className={`text-xs mt-1 ${sub}`}>Click "New Idea" to capture your first brainstorm</p>
            </div>
          )}

          {ideasLoading && (
            <div className={`text-center py-8 ${sub}`}>
              <p className="text-sm">Loading ideas...</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
