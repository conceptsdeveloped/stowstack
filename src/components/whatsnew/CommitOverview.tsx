import {
  GitCommit, FileText, Plus, Minus, TrendingUp, TrendingDown, Flag,
  Flame, FileIcon,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart as RPieChart, Pie,
} from 'recharts'
import type { Commit, CommitFlag } from './WhatsNewTypes'
import { CATEGORY_CONFIG, AREA_CONFIG, FLAG_CONFIG, DIFF_SIZE_CONFIG } from './WhatsNewTypes'
import { formatDate, formatShortDate, getAuthorInitials, getAuthorColor, getISODateKey } from './WhatsNewHelpers'
import { useMemo } from 'react'

export interface CommitOverviewProps {
  darkMode: boolean
  commits: Commit[]
  allFlags: Record<string, CommitFlag[]>
  authors: string[]
  authorFilter: string
  setAuthorFilter: (v: string) => void
  setActiveSection: (v: 'overview' | 'timeline' | 'ideas' | 'activity' | 'handoffs') => void
  setExpandedHash: (v: string | null) => void
}

export default function CommitOverview({
  darkMode,
  commits,
  allFlags,
  authors,
  authorFilter,
  setAuthorFilter,
  setActiveSection,
  setExpandedHash,
}: CommitOverviewProps) {
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const heading = darkMode ? 'text-white' : 'text-slate-900'

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
  }, [commits])

  /* Activity chart data */
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
  }, [commits])

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
  }, [commits])

  /* Heatmap data */
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
  }, [commits])

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

  /* Total flags */
  const totalFlags = useMemo(() => {
    let count = 0
    for (const arr of Object.values(allFlags)) count += arr.length
    return count
  }, [allFlags])

  /* File hotspots */
  const fileHotspots = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of commits) {
      for (const f of (c.changedFiles || [])) {
        counts[f.file] = (counts[f.file] || 0) + 1
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }))
  }, [commits])

  /* Diff size breakdown */
  const diffSizeData = useMemo(() => {
    const counts: Record<string, number> = { tiny: 0, small: 0, medium: 0, large: 0, massive: 0 }
    for (const c of commits) counts[c.diffSize || 'tiny']++
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name: (DIFF_SIZE_CONFIG[name]?.label || name),
        value,
        fill: name === 'tiny' ? '#94a3b8' : name === 'small' ? '#3b82f6' : name === 'medium' ? '#f59e0b' : name === 'large' ? '#f97316' : '#ef4444',
      }))
  }, [commits])

  /* Author velocity */
  const authorVelocity = useMemo(() => {
    const data: Record<string, { commits: number; insertions: number; deletions: number; files: number }> = {}
    for (const c of commits) {
      if (!data[c.author]) data[c.author] = { commits: 0, insertions: 0, deletions: 0, files: 0 }
      data[c.author].commits++
      data[c.author].insertions += c.insertions
      data[c.author].deletions += c.deletions
      data[c.author].files += c.filesChanged
    }
    return Object.entries(data).map(([name, d]) => ({ name, ...d }))
  }, [commits])

  return (
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

      {/* Flagged commits summary */}
      {totalFlags > 0 && (
        <div className={`rounded-xl border p-4 ${darkMode ? 'bg-amber-900/10 border-amber-800' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flag size={16} className="text-amber-500" />
              <span className={`text-sm font-medium ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                {totalFlags} flagged commit{totalFlags !== 1 ? 's' : ''} need attention
              </span>
            </div>
            <button
              onClick={() => setActiveSection('timeline')}
              className={`text-xs font-medium cursor-pointer ${darkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'}`}
            >
              View in Timeline
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(allFlags).slice(0, 5).map(([hash, flags]) => {
              const commit = commits.find(c => c.hash === hash)
              if (!commit) return null
              return (
                <button
                  key={hash}
                  onClick={() => { setActiveSection('timeline'); setExpandedHash(hash) }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] cursor-pointer border ${
                    darkMode ? 'border-slate-600 bg-slate-750 hover:border-amber-600' : 'border-slate-200 bg-white hover:border-amber-400'
                  }`}
                >
                  {flags.map(f => {
                    const fc = FLAG_CONFIG[f.flag_type]
                    if (!fc) return null
                    const FlagIcon = fc.icon
                    return <FlagIcon key={f.id} size={10} className={darkMode ? 'text-amber-400' : 'text-amber-600'} />
                  })}
                  <span className={`truncate max-w-[200px] ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {commit.subject.slice(0, 50)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

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

      {/* Diff Size Breakdown + Author Velocity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`rounded-xl border p-5 ${card}`}>
          <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            Commit Size Breakdown
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diffSizeData} layout="vertical">
                <XAxis type="number" stroke={darkMode ? '#64748b' : '#94a3b8'} fontSize={11} />
                <YAxis type="category" dataKey="name" stroke={darkMode ? '#64748b' : '#94a3b8'} fontSize={11} width={60} />
                <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#fff', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {diffSizeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-xl border p-5 ${card}`}>
          <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            Author Velocity
          </h3>
          <div className="space-y-3">
            {authorVelocity.map(a => (
              <div key={a.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold ${getAuthorColor(a.name)}`}>
                      {getAuthorInitials(a.name)}
                    </div>
                    <span className={`text-xs font-medium ${heading}`}>{a.name}</span>
                  </div>
                  <div className={`text-[10px] ${sub} flex items-center gap-3`}>
                    <span>{a.commits} commits</span>
                    <span>{a.files.toLocaleString()} files</span>
                    <span className="text-emerald-500">+{a.insertions.toLocaleString()}</span>
                    <span className="text-red-500">-{a.deletions.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                  <div className="bg-emerald-500 h-full" style={{ width: `${(a.insertions / (a.insertions + a.deletions + 1)) * 100}%` }} />
                  <div className="bg-red-500 h-full" style={{ width: `${(a.deletions / (a.insertions + a.deletions + 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* File Hotspots */}
      {fileHotspots.length > 0 && (
        <div className={`rounded-xl border p-5 ${card}`}>
          <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            <Flame size={16} className="text-orange-500" /> File Hotspots
            <span className={`text-[10px] font-normal ${sub}`}>Most frequently changed files</span>
          </h3>
          <div className="space-y-1.5">
            {fileHotspots.map((f, i) => (
              <div key={f.path} className="flex items-center gap-3">
                <span className={`text-[10px] font-mono w-5 text-right ${sub}`}>{i + 1}</span>
                <div className="flex-1 flex items-center gap-2">
                  <FileIcon size={12} className={sub} />
                  <code className={`text-xs font-mono truncate ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {f.path}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div className="bg-orange-500 h-full rounded-full" style={{ width: `${(f.count / fileHotspots[0].count) * 100}%` }} />
                  </div>
                  <span className={`text-[10px] font-medium w-8 text-right ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{f.count}x</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
