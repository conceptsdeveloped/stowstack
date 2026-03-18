import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, List } from 'lucide-react'
import { type SocialPost, PLATFORM_CONFIG } from './SocialTypes'
import PostCard from './PostCard'

interface ContentCalendarProps {
  posts: SocialPost[]
  darkMode: boolean
  adminKey: string
  onRefresh: () => void
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/* ── Storage-specific seasonal markers ── */
const SEASONAL_MARKERS: Record<string, { label: string; color: string }> = {
  '1': { label: 'New Year Declutter', color: 'bg-blue-500/20 text-blue-500' },
  '3': { label: 'Spring Cleaning', color: 'bg-green-500/20 text-green-500' },
  '5': { label: 'Moving Season', color: 'bg-orange-500/20 text-orange-500' },
  '6': { label: 'Peak Moving', color: 'bg-red-500/20 text-red-500' },
  '8': { label: 'College Move-In', color: 'bg-purple-500/20 text-purple-500' },
  '10': { label: 'Fall Transition', color: 'bg-amber-500/20 text-amber-500' },
  '12': { label: 'Holiday Storage', color: 'bg-emerald-500/20 text-emerald-500' },
}

export default function ContentCalendar({ posts, darkMode, adminKey, onRefresh }: ContentCalendarProps) {
  const [viewMonth, setViewMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const card = darkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const seasonalMarker = SEASONAL_MARKERS[String(month + 1)]

  /* ── Build calendar grid ── */
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (number | null)[] = []

    // Padding for first row
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    // Padding for last row
    while (days.length % 7 !== 0) days.push(null)

    return days
  }, [year, month])

  /* ── Map posts to days ── */
  const postsByDay = useMemo(() => {
    const map: Record<string, SocialPost[]> = {}
    posts.forEach(p => {
      const date = p.scheduled_at || p.published_at || p.created_at
      const d = new Date(date)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = String(d.getDate())
        if (!map[key]) map[key] = []
        map[key].push(p)
      }
    })
    return map
  }, [posts, year, month])

  const today = new Date()
  const isToday = (day: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day

  const totalScheduled = posts.filter(p => p.status === 'scheduled').length
  const totalDraft = posts.filter(p => p.status === 'draft').length
  const totalPublished = posts.filter(p => p.status === 'published').length

  /* ── List of posts for selected day or all posts ── */
  const visiblePosts = selectedDay
    ? (postsByDay[selectedDay] || [])
    : posts.sort((a, b) => {
        const da = a.scheduled_at || a.created_at
        const db = b.scheduled_at || b.created_at
        return new Date(da).getTime() - new Date(db).getTime()
      })

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => setViewMonth(new Date(year, month - 1))} className={`p-1.5 rounded-lg border ${darkMode ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>
            <ChevronLeft size={16} className={sub} />
          </button>
          <h3 className={`text-lg font-bold ${text}`}>{MONTHS[month]} {year}</h3>
          <button onClick={() => setViewMonth(new Date(year, month + 1))} className={`p-1.5 rounded-lg border ${darkMode ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>
            <ChevronRight size={16} className={sub} />
          </button>
          <button onClick={() => setViewMonth(new Date())} className={`text-xs px-2 py-1 rounded-lg ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>Today</button>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats */}
          <span className={`text-xs ${sub}`}>{totalDraft} draft · {totalScheduled} scheduled · {totalPublished} published</span>

          {/* View toggle */}
          <div className={`flex gap-1 p-0.5 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
            <button onClick={() => { setViewMode('calendar'); setSelectedDay(null) }} className={`p-1.5 rounded ${viewMode === 'calendar' ? 'bg-emerald-500 text-white' : sub}`}>
              <CalendarDays size={14} />
            </button>
            <button onClick={() => { setViewMode('list'); setSelectedDay(null) }} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-emerald-500 text-white' : sub}`}>
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Seasonal marker */}
      {seasonalMarker && (
        <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${seasonalMarker.color}`}>
          📅 {seasonalMarker.label} — great time to post seasonal content
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className={`border rounded-xl overflow-hidden ${card}`}>
          {/* Day headers */}
          <div className="grid grid-cols-7">
            {DAYS.map(d => (
              <div key={d} className={`text-center text-xs font-medium py-2 ${sub} ${darkMode ? 'border-b border-slate-700' : 'border-b border-slate-100'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              if (day === null) {
                return <div key={i} className={`min-h-[80px] border-b border-r ${darkMode ? 'border-slate-700/50 bg-slate-900/30' : 'border-slate-50 bg-slate-25'}`} />
              }
              const dayPosts = postsByDay[String(day)] || []
              const isSelected = selectedDay === String(day)
              return (
                <div
                  key={i}
                  onClick={() => setSelectedDay(isSelected ? null : String(day))}
                  className={`min-h-[80px] border-b border-r p-1.5 cursor-pointer transition-colors ${
                    darkMode ? 'border-slate-700/50' : 'border-slate-100'
                  } ${
                    isSelected ? (darkMode ? 'bg-emerald-900/20' : 'bg-emerald-50') : ''
                  } ${
                    isToday(day) ? (darkMode ? 'bg-emerald-900/10' : 'bg-emerald-50/50') : ''
                  } ${
                    darkMode ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${isToday(day) ? 'text-emerald-500 font-bold' : sub}`}>
                      {day}
                    </span>
                    {dayPosts.length > 0 && (
                      <span className={`text-[10px] px-1 rounded ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                        {dayPosts.length}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-0.5">
                    {dayPosts.slice(0, 4).map((p, j) => (
                      <div
                        key={j}
                        className={`w-2 h-2 rounded-full ${PLATFORM_CONFIG[p.platform].dotColor} ${p.status === 'published' ? 'opacity-100' : 'opacity-50'}`}
                        title={`${PLATFORM_CONFIG[p.platform].label}: ${p.content.slice(0, 40)}...`}
                      />
                    ))}
                    {dayPosts.length > 4 && (
                      <span className={`text-[9px] ${sub}`}>+{dayPosts.length - 4}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected day posts or list view */}
      {(selectedDay || viewMode === 'list') && (
        <div className="space-y-2">
          {selectedDay && (
            <div className="flex items-center justify-between">
              <h4 className={`text-sm font-medium ${text}`}>
                {MONTHS[month]} {selectedDay}, {year} — {visiblePosts.length} {visiblePosts.length === 1 ? 'post' : 'posts'}
              </h4>
              <button onClick={() => setSelectedDay(null)} className={`text-xs ${sub} hover:underline`}>Clear selection</button>
            </div>
          )}
          {visiblePosts.length === 0 ? (
            <p className={`text-sm ${sub} text-center py-4`}>No posts {selectedDay ? 'on this day' : 'this month'}. Generate some content!</p>
          ) : (
            visiblePosts.map(p => (
              <PostCard key={p.id} post={p} darkMode={darkMode} adminKey={adminKey} onUpdate={onRefresh} />
            ))
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
          <span key={key} className={`flex items-center gap-1.5 text-xs ${sub}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
            {config.label}
          </span>
        ))}
        <span className={`flex items-center gap-1.5 text-xs ${sub}`}>
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 opacity-50" /> Draft/Scheduled
        </span>
        <span className={`flex items-center gap-1.5 text-xs ${sub}`}>
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 opacity-100" /> Published
        </span>
      </div>
    </div>
  )
}
