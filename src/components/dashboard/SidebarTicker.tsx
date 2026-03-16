import { useState, useEffect, useMemo, useCallback } from 'react'

/* ── Types ── */

interface CommitData {
  short: string
  author: string
  date: string
  subject: string
  filesChanged: number
  insertions: number
  deletions: number
  coAuthor?: string | null
  category?: string
  area?: string
}

/* ── Author normalization ── */
const AUTHOR_ALIASES: Record<string, string> = {
  'Blake Burkett': 'Blake',
  'blake burkett': 'Blake',
  'blake': 'Blake',
}
function normalizeAuthor(name: string): string {
  return AUTHOR_ALIASES[name] ?? name
}

interface TickerCard {
  id: string
  rows: TickerRow[]
  accent: string // tailwind color class for the top-border accent
}

interface TickerRow {
  label: string
  value: string
  color: string
  spark?: number[] // mini sparkline data (0-1 normalized)
  bar?: number     // progress bar 0-1
  icon?: string    // emoji
}

/* ── Helpers ── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

function calcStreak(commits: CommitData[]): number {
  if (commits.length === 0) return 0
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let d = 0; d < 365; d++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - d)
    const dayStr = checkDate.toISOString().slice(0, 10)
    const hasCommit = commits.some(c => c.date.slice(0, 10) === dayStr)
    if (hasCommit) streak++
    else if (d > 0) break
  }
  return streak
}

function getSessionUptime(): string {
  const start = sessionStorage.getItem('stowstack_session_start')
  if (!start) {
    sessionStorage.setItem('stowstack_session_start', Date.now().toString())
    return '0m'
  }
  const mins = Math.floor((Date.now() - parseInt(start)) / 60000)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

/** Get commits-per-day for last N days as normalized array */
function dailyActivity(commits: CommitData[], days: number): number[] {
  const now = new Date()
  const buckets: number[] = Array(days).fill(0)
  for (const c of commits) {
    const age = Math.floor((now.getTime() - new Date(c.date).getTime()) / 86400000)
    if (age >= 0 && age < days) buckets[days - 1 - age]++
  }
  const max = Math.max(1, ...buckets)
  return buckets.map(v => v / max)
}

/** Get insertions per day for last N days */
function dailyLines(commits: CommitData[], days: number): number[] {
  const now = new Date()
  const buckets: number[] = Array(days).fill(0)
  for (const c of commits) {
    const age = Math.floor((now.getTime() - new Date(c.date).getTime()) / 86400000)
    if (age >= 0 && age < days) buckets[days - 1 - age] += (c.insertions || 0)
  }
  const max = Math.max(1, ...buckets)
  return buckets.map(v => v / max)
}

/** Pick a motivational quip based on time/stats */
function getVibeCheck(hour: number, streak: number, commitsToday: number): string {
  if (hour >= 0 && hour < 5) return streak >= 3 ? 'nocturnal demon mode 🦇' : 'sleep is for the weak'
  if (hour >= 5 && hour < 8) return 'dawn patrol grindset 🌅'
  if (hour >= 8 && hour < 12) return commitsToday >= 3 ? 'locked in 🔒' : 'warming up ☕'
  if (hour >= 12 && hour < 14) return 'lunch break? never heard of it'
  if (hour >= 14 && hour < 18) return commitsToday >= 5 ? 'absolute unit 💪' : 'afternoon push'
  if (hour >= 18 && hour < 21) return commitsToday >= 8 ? 'beast mode activated 🔥' : 'evening shift'
  return streak >= 7 ? 'building an empire 👑' : 'night owl coding 🦉'
}

function getDevRank(score: number): string {
  if (score >= 8000) return 'LEGENDARY'
  if (score >= 5000) return 'ELITE'
  if (score >= 3000) return 'VETERAN'
  if (score >= 1500) return 'GRINDER'
  if (score >= 500) return 'RISING'
  return 'ROOKIE'
}

function getDeleteRatio(commits: CommitData[]): { ratio: number; verdict: string } {
  const ins = commits.reduce((s, c) => s + (c.insertions || 0), 0)
  const del = commits.reduce((s, c) => s + (c.deletions || 0), 0)
  const ratio = ins > 0 ? del / ins : 0
  let verdict: string
  if (ratio > 0.5) verdict = 'refactor king 🧹'
  else if (ratio > 0.2) verdict = 'balanced builder'
  else if (ratio > 0.05) verdict = 'net-positive creator'
  else verdict = 'pure creation mode ✨'
  return { ratio, verdict }
}

/** Mini ASCII-style sparkline rendered as SVG */
function MiniSpark({ data, color }: { data: number[]; color: string }) {
  const w = 80
  const h = 16
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - v * (h - 2) - 1}`).join(' ')
  const fillPoints = `0,${h} ${points} ${w},${h}`
  return (
    <svg width={w} height={h} className="shrink-0">
      <polygon points={fillPoints} className={`${color} opacity-10`} fill="currentColor" />
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" className={`${color} opacity-60`} />
      {/* latest dot */}
      {data.length > 0 && (
        <circle
          cx={w}
          cy={h - data[data.length - 1] * (h - 2) - 1}
          r="2"
          fill="currentColor"
          className={`${color} admin-spark-dot`}
        />
      )}
    </svg>
  )
}

/** Tiny progress bar */
function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-[3px] bg-[#1a2332] rounded-full overflow-hidden mt-0.5">
      <div
        className={`h-full rounded-full ${color} transition-all duration-1000`}
        style={{ width: `${Math.min(100, value * 100)}%` }}
      />
    </div>
  )
}

/* ── Main Component ── */

export default function SidebarTicker({
  adminKey: _adminKey,
  leadCount,
  activeLeadCount,
  signedCount,
}: {
  adminKey: string
  leadCount: number
  activeLeadCount: number
  signedCount: number
}) {
  const [commits, setCommits] = useState<CommitData[]>([])
  const [visibleIndex, setVisibleIndex] = useState(0)
  const [sessionTime, setSessionTime] = useState(getSessionUptime())
  const [transitioning, setTransitioning] = useState(false)

  // Load commits
  useEffect(() => {
    import('../../data/commits.json').then(m => setCommits(m.default)).catch(() => {})
  }, [])

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => setSessionTime(getSessionUptime()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Build all ticker cards
  const cards: TickerCard[] = useMemo(() => {
    if (commits.length === 0) return []

    const now = new Date()
    const hour = now.getHours()
    const todayStr = now.toISOString().slice(0, 10)
    const latest = commits[0]
    const streak = calcStreak(commits)
    const commitsToday = commits.filter(c => c.date.slice(0, 10) === todayStr).length

    // Per-author stats
    const authorMap: Record<string, { commits: number; lines: number; lastAt: string }> = {}
    for (const c of commits) {
      const a = normalizeAuthor(c.author)
      if (!authorMap[a]) authorMap[a] = { commits: 0, lines: 0, lastAt: c.date }
      authorMap[a].commits++
      authorMap[a].lines += (c.insertions || 0) + (c.deletions || 0)
    }
    const authors = Object.entries(authorMap).sort((a, b) => b[1].commits - a[1].commits)

    // Week stats
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
    const weekCommits = commits.filter(c => new Date(c.date) >= weekAgo)
    const weekLines = weekCommits.reduce((s, c) => s + (c.insertions || 0) + (c.deletions || 0), 0)
    const weekFiles = weekCommits.reduce((s, c) => s + (c.filesChanged || 0), 0)

    // Category breakdown
    const cats: Record<string, number> = {}
    for (const c of commits) { cats[c.category || 'other'] = (cats[c.category || 'other'] || 0) + 1 }

    // Co-author / AI stats
    const claudeCommits = commits.filter(c => c.coAuthor).length
    const aiRatio = commits.length > 0 ? claudeCommits / commits.length : 0

    // Biggest commit ever
    const biggestCommit = commits.reduce((best, c) =>
      (c.insertions || 0) > (best.insertions || 0) ? c : best, commits[0])

    // Late night commits (10pm-5am)
    const lateNightCount = commits.filter(c => {
      const h = new Date(c.date).getHours()
      return h >= 22 || h < 5
    }).length

    // Weekend warrior
    const weekendCount = commits.filter(c => {
      const d = new Date(c.date).getDay()
      return d === 0 || d === 6
    }).length

    // Lines ever
    const totalInsertions = commits.reduce((s, c) => s + (c.insertions || 0), 0)
    const totalDeletions = commits.reduce((s, c) => s + (c.deletions || 0), 0)

    // Dev score
    const recent30 = commits.slice(0, 30)
    const r30lines = recent30.reduce((s, c) => s + (c.insertions || 0) + (c.deletions || 0), 0)
    const r30files = recent30.reduce((s, c) => s + (c.filesChanged || 0), 0)
    const devScore = Math.min(9999, Math.floor(r30lines * 0.1 + r30files * 5 + streak * 50))

    // Delete ratio
    const { verdict: delVerdict } = getDeleteRatio(commits.slice(0, 30))

    // Days since first commit
    const firstCommit = commits[commits.length - 1]
    const daysSinceFirst = firstCommit ? Math.floor((now.getTime() - new Date(firstCommit.date).getTime()) / 86400000) : 0

    // Average commits per day (active days)
    const activeDays = new Set(commits.map(c => c.date.slice(0, 10))).size
    const avgPerDay = activeDays > 0 ? (commits.length / activeDays).toFixed(1) : '0'

    // Sparkline data
    const activitySpark = dailyActivity(commits, 14)
    const linesSpark = dailyLines(commits, 14)

    const result: TickerCard[] = []

    // ── Card 1: Last Push ──
    result.push({
      id: 'last-push',
      accent: 'border-cyan-500/40',
      rows: [
        { label: 'LAST PUSH', value: `${normalizeAuthor(latest.author)}`, color: 'text-cyan-400', icon: '⚡' },
        { label: '', value: timeAgo(latest.date), color: 'text-cyan-400/60' },
        { label: 'MSG', value: latest.subject.length > 30 ? latest.subject.slice(0, 30) + '…' : latest.subject, color: 'text-slate-500' },
      ],
    })

    // ── Card 2: Dev Streak + Vibe ──
    result.push({
      id: 'streak',
      accent: streak >= 7 ? 'border-orange-500/60' : 'border-amber-500/30',
      rows: [
        { label: 'STREAK', value: `${streak} day${streak !== 1 ? 's' : ''} ${streak >= 14 ? '🔥🔥' : streak >= 7 ? '🔥' : streak >= 3 ? '⚡' : '💤'}`, color: streak >= 7 ? 'text-orange-400' : 'text-amber-400' },
        { label: 'VIBE', value: getVibeCheck(hour, streak, commitsToday), color: 'text-slate-500' },
        { label: 'TODAY', value: `${commitsToday} commit${commitsToday !== 1 ? 's' : ''}`, color: commitsToday >= 5 ? 'text-emerald-400' : 'text-slate-500', icon: commitsToday >= 10 ? '🤯' : commitsToday >= 5 ? '💪' : '' },
      ],
    })

    // ── Card 3: Dev Score + Rank ──
    result.push({
      id: 'score',
      accent: devScore >= 5000 ? 'border-amber-500/50' : 'border-emerald-500/30',
      rows: [
        { label: 'DEV SCORE', value: devScore.toLocaleString(), color: devScore >= 5000 ? 'text-amber-400' : 'text-emerald-400', icon: devScore >= 5000 ? '🏆' : '📊' },
        { label: 'RANK', value: getDevRank(devScore), color: 'text-slate-400' },
        { label: 'XP/30D', value: `${r30lines.toLocaleString()} lines`, color: 'text-purple-400', bar: Math.min(1, r30lines / 50000) },
      ],
    })

    // ── Card 4: 14-Day Activity Sparkline ──
    result.push({
      id: 'activity',
      accent: 'border-emerald-500/30',
      rows: [
        { label: '14D COMMITS', value: `${commits.filter(c => { const age = (now.getTime() - new Date(c.date).getTime()) / 86400000; return age < 14 }).length}`, color: 'text-emerald-400', spark: activitySpark },
        { label: '14D LINES', value: '', color: 'text-purple-400', spark: linesSpark },
      ],
    })

    // ── Card 5: 7-Day Stats ──
    result.push({
      id: 'week',
      accent: 'border-purple-500/30',
      rows: [
        { label: '7D CHURN', value: `${weekLines.toLocaleString()} lines`, color: 'text-purple-400', icon: '📝' },
        { label: '7D FILES', value: `${weekFiles} touched`, color: 'text-indigo-400' },
        { label: '7D COMMITS', value: `${weekCommits.length}`, color: 'text-cyan-400' },
      ],
    })

    // ── Card 6: Pipeline Live ──
    result.push({
      id: 'pipeline',
      accent: 'border-emerald-500/30',
      rows: [
        { label: 'PIPELINE', value: `${activeLeadCount} active`, color: 'text-emerald-400', icon: '🎯' },
        { label: 'SIGNED', value: `${signedCount}`, color: signedCount > 0 ? 'text-emerald-400' : 'text-slate-500' },
        { label: 'TOTAL LEADS', value: `${leadCount}`, color: 'text-cyan-400' },
      ],
    })

    // ── Card 7: Author Leaderboard ──
    if (authors.length > 0) {
      const rows: TickerRow[] = [
        { label: 'LEADERBOARD', value: '', color: 'text-slate-500', icon: '👑' },
      ]
      for (const [name, stats] of authors.slice(0, 2)) {
        const pct = Math.round((stats.commits / commits.length) * 100)
        rows.push({
          label: name.toUpperCase(),
          value: `${stats.commits} commits (${pct}%)`,
          color: name === authors[0][0] ? 'text-amber-400' : 'text-slate-400',
          bar: stats.commits / authors[0][1].commits,
        })
      }
      result.push({ id: 'leaderboard', accent: 'border-amber-500/30', rows })
    }

    // ── Card 8: AI Collab ──
    result.push({
      id: 'ai-collab',
      accent: 'border-indigo-500/30',
      rows: [
        { label: 'AI PAIRED', value: `${Math.round(aiRatio * 100)}%`, color: 'text-indigo-400', icon: '🤖', bar: aiRatio },
        { label: 'HUMAN SOLO', value: `${commits.length - claudeCommits}`, color: 'text-slate-500' },
        { label: 'AI ASSISTED', value: `${claudeCommits}`, color: 'text-indigo-400' },
      ],
    })

    // ── Card 9: Delete Ratio ──
    result.push({
      id: 'delete-ratio',
      accent: 'border-rose-500/20',
      rows: [
        { label: '+LINES', value: totalInsertions.toLocaleString(), color: 'text-emerald-400', icon: '📈' },
        { label: '-LINES', value: totalDeletions.toLocaleString(), color: 'text-rose-400' },
        { label: 'STYLE', value: delVerdict, color: 'text-slate-500' },
      ],
    })

    // ── Card 10: Biggest Commit ──
    result.push({
      id: 'biggest',
      accent: 'border-amber-500/30',
      rows: [
        { label: 'BIGGEST PUSH', value: `+${(biggestCommit.insertions || 0).toLocaleString()}`, color: 'text-amber-400', icon: '🏋️' },
        { label: 'BY', value: normalizeAuthor(biggestCommit.author), color: 'text-slate-500' },
        { label: '', value: biggestCommit.subject.length > 28 ? biggestCommit.subject.slice(0, 28) + '…' : biggestCommit.subject, color: 'text-slate-600' },
      ],
    })

    // ── Card 11: Night Owl / Weekend Warrior ──
    result.push({
      id: 'grind-stats',
      accent: 'border-violet-500/30',
      rows: [
        { label: 'NIGHT OWL', value: `${lateNightCount} commits`, color: 'text-violet-400', icon: '🦉' },
        { label: 'WEEKEND', value: `${weekendCount} commits`, color: 'text-pink-400', icon: '⚔️' },
        { label: 'GRIND INDEX', value: `${Math.round(((lateNightCount + weekendCount) / Math.max(1, commits.length)) * 100)}%`, color: 'text-amber-400', bar: (lateNightCount + weekendCount) / Math.max(1, commits.length) },
      ],
    })

    // ── Card 12: Session + Lifetime ──
    result.push({
      id: 'session',
      accent: 'border-slate-500/20',
      rows: [
        { label: 'SESSION', value: sessionTime, color: 'text-slate-400', icon: '⏱️' },
        { label: 'PROJECT AGE', value: `${daysSinceFirst}d`, color: 'text-slate-500' },
        { label: 'AVG/DAY', value: `${avgPerDay} commits`, color: 'text-cyan-400' },
      ],
    })

    // ── Card 13: Total All-Time ──
    result.push({
      id: 'all-time',
      accent: 'border-emerald-500/30',
      rows: [
        { label: 'ALL TIME', value: `${commits.length} commits`, color: 'text-emerald-400', icon: '📦' },
        { label: 'ACTIVE DAYS', value: `${activeDays}`, color: 'text-cyan-400' },
        { label: 'LINES SHIPPED', value: totalInsertions.toLocaleString(), color: 'text-purple-400' },
      ],
    })

    // ── Card 14: Per-Author Last Seen ──
    if (authors.length > 1) {
      const rows: TickerRow[] = [{ label: 'LAST SEEN', value: '', color: 'text-slate-500', icon: '👀' }]
      for (const [name, stats] of authors.slice(0, 3)) {
        rows.push({
          label: name.toUpperCase(),
          value: timeAgo(stats.lastAt),
          color: 'text-slate-400',
        })
      }
      result.push({ id: 'last-seen', accent: 'border-cyan-500/20', rows })
    }

    // ── Card 15: Caffeine Tracker (estimated) ──
    const coffeeEstimate = Math.ceil(commits.length * 0.3)
    const todayCoffee = Math.ceil(commitsToday * 0.4)
    result.push({
      id: 'caffeine',
      accent: 'border-amber-600/30',
      rows: [
        { label: 'EST. COFFEES', value: `${coffeeEstimate} lifetime`, color: 'text-amber-600', icon: '☕' },
        { label: 'TODAY', value: `~${todayCoffee} cups`, color: 'text-amber-500' },
        { label: 'FUEL LEVEL', value: todayCoffee >= 3 ? 'CAFFEINATED' : todayCoffee >= 1 ? 'warming up' : 'need beans', color: todayCoffee >= 3 ? 'text-amber-400' : 'text-slate-500', bar: Math.min(1, todayCoffee / 5) },
      ],
    })

    // ── Card 16: Commit Message Vibes ──
    const shortMsgs = commits.filter(c => c.subject.length < 20).length
    const longMsgs = commits.filter(c => c.subject.length > 60).length
    const hasFeat = commits.filter(c => c.subject.startsWith('feat')).length
    const hasFix = commits.filter(c => c.subject.startsWith('fix')).length
    result.push({
      id: 'msg-vibes',
      accent: 'border-teal-500/30',
      rows: [
        { label: 'MSG STYLE', value: '', color: 'text-slate-500', icon: '💬' },
        { label: 'FEATS', value: `${hasFeat}`, color: 'text-emerald-400' },
        { label: 'FIXES', value: `${hasFix}`, color: 'text-rose-400' },
        { label: 'YOLO MSGS', value: `${shortMsgs} short`, color: shortMsgs > longMsgs ? 'text-amber-400' : 'text-slate-500' },
      ],
    })

    // ── Card 17: Speed Records ──
    // Find fastest back-to-back commits
    let fastestGapMins = Infinity
    let fastestPair = ''
    for (let i = 0; i < Math.min(commits.length - 1, 50); i++) {
      const gap = (new Date(commits[i].date).getTime() - new Date(commits[i + 1].date).getTime()) / 60000
      if (gap > 0 && gap < fastestGapMins) {
        fastestGapMins = gap
        fastestPair = normalizeAuthor(commits[i].author)
      }
    }
    result.push({
      id: 'speed',
      accent: 'border-red-500/30',
      rows: [
        { label: 'SPEED RECORD', value: '', color: 'text-slate-500', icon: '🏎️' },
        { label: 'FASTEST GAP', value: fastestGapMins < 60 ? `${Math.round(fastestGapMins)}m` : `${Math.round(fastestGapMins / 60)}h`, color: 'text-red-400' },
        { label: 'BY', value: fastestPair, color: 'text-slate-500' },
        { label: '', value: fastestGapMins < 5 ? 'speed demon 👹' : fastestGapMins < 15 ? 'rapid fire 🔫' : 'methodical', color: 'text-slate-600' },
      ],
    })

    // ── Card 18: Hour Distribution ──
    const hourBuckets = Array(24).fill(0)
    for (const c of commits) hourBuckets[new Date(c.date).getHours()]++
    const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets))
    const peakCommits = hourBuckets[peakHour]
    const amPm = peakHour >= 12 ? 'PM' : 'AM'
    const displayHour = peakHour === 0 ? 12 : peakHour > 12 ? peakHour - 12 : peakHour
    result.push({
      id: 'peak-hours',
      accent: 'border-sky-500/30',
      rows: [
        { label: 'PEAK HOUR', value: `${displayHour}${amPm}`, color: 'text-sky-400', icon: '🕐' },
        { label: '', value: `${peakCommits} commits at this hour`, color: 'text-slate-500' },
        { label: 'ZONE', value: peakHour < 6 ? 'degenerate hours 🌙' : peakHour < 12 ? 'morning person ☀️' : peakHour < 18 ? 'afternoon warrior' : 'night coder 🌃', color: 'text-slate-600' },
      ],
    })

    // ── Card 19: Codebase Size Estimation ──
    const netLines = totalInsertions - totalDeletions
    const estFiles = Math.round(netLines / 120)
    result.push({
      id: 'codebase',
      accent: 'border-violet-500/20',
      rows: [
        { label: 'EST. CODEBASE', value: '', color: 'text-slate-500', icon: '🗂️' },
        { label: 'NET LINES', value: `~${netLines.toLocaleString()}`, color: 'text-violet-400' },
        { label: 'EST. FILES', value: `~${estFiles}`, color: 'text-slate-400' },
        { label: '', value: netLines > 50000 ? 'absolute unit of a repo' : netLines > 20000 ? 'thicc codebase' : 'lean and mean', color: 'text-slate-600' },
      ],
    })

    // ── Card 20: Motivation / Random Fun Facts ──
    const funFacts: TickerRow[][] = [
      [
        { label: 'FUN FACT', value: '', color: 'text-slate-500', icon: '🎲' },
        { label: '', value: `${Math.round(totalInsertions / Math.max(1, commits.length))} avg lines/commit`, color: 'text-slate-400' },
        { label: '', value: totalInsertions > 100000 ? 'thats a whole novel 📖' : 'keep shipping', color: 'text-slate-600' },
      ],
      [
        { label: 'DID YOU KNOW', value: '', color: 'text-slate-500', icon: '💡' },
        { label: '', value: `${commits.filter(c => (c.insertions || 0) > 1000).length} mega commits (1k+)`, color: 'text-amber-400' },
        { label: '', value: 'absolute menace behavior', color: 'text-slate-600' },
      ],
      [
        { label: 'STAT CHECK', value: '', color: 'text-slate-500', icon: '📊' },
        { label: '', value: `~${Math.round(totalInsertions * 0.06)} est. CSS lines`, color: 'text-pink-400' },
        { label: '', value: 'tailwind goes brr', color: 'text-slate-600' },
      ],
      [
        { label: 'IF CODE = $', value: '', color: 'text-slate-500', icon: '💸' },
        { label: '', value: `$${(totalInsertions * 0.15).toLocaleString(undefined, { maximumFractionDigits: 0 })} @ $0.15/line`, color: 'text-emerald-400' },
        { label: '', value: 'freelancer math checks out', color: 'text-slate-600' },
      ],
      [
        { label: 'WORDS TYPED', value: '', color: 'text-slate-500', icon: '⌨️' },
        { label: '', value: `~${Math.round(totalInsertions * 8).toLocaleString()} words`, color: 'text-cyan-400' },
        { label: '', value: totalInsertions * 8 > 500000 ? 'wrote a whole textbook' : 'getting there', color: 'text-slate-600' },
      ],
      [
        { label: 'KEYBOARDS', value: '', color: 'text-slate-500', icon: '🔥' },
        { label: '', value: `~${Math.round(totalInsertions * 8 / 10000)} est. destroyed`, color: 'text-red-400' },
        { label: '', value: 'rip mechanical switches', color: 'text-slate-600' },
      ],
      [
        { label: 'POWER LEVEL', value: '', color: 'text-slate-500', icon: '🐉' },
        { label: '', value: devScore > 8000 ? 'ITS OVER 9000!!!' : devScore > 5000 ? 'saiyan level rising' : `${devScore} / 9000`, color: devScore > 8000 ? 'text-amber-400' : 'text-slate-400' },
        { label: '', value: devScore > 8000 ? 'WHAT?! IMPOSSIBLE!' : 'keep training...', color: 'text-slate-600' },
      ],
    ]
    const factIndex = Math.floor(now.getTime() / 300000) % funFacts.length // rotates every 5 min
    result.push({ id: 'fun-fact', accent: 'border-pink-500/20', rows: funFacts[factIndex] })

    // ── Card 21: Commit Hash Art ──
    result.push({
      id: 'hash-art',
      accent: 'border-slate-500/10',
      rows: [
        { label: 'LATEST HASH', value: '', color: 'text-slate-500', icon: '#️⃣' },
        { label: '', value: latest.short, color: 'text-emerald-400' },
        { label: 'FIRST HASH', value: firstCommit ? firstCommit.short : '???', color: 'text-slate-600' },
        { label: '', value: `${commits.length} hashes deep`, color: 'text-slate-500' },
      ],
    })

    // ── Card 22: Bus Factor ──
    const busFactorScore = authors.length
    result.push({
      id: 'bus-factor',
      accent: 'border-red-500/20',
      rows: [
        { label: 'BUS FACTOR', value: `${busFactorScore}`, color: busFactorScore <= 1 ? 'text-red-400' : 'text-emerald-400', icon: '🚌' },
        { label: '', value: busFactorScore <= 1 ? 'CRITICAL — solo dev mode' : busFactorScore <= 2 ? 'risky but viable' : 'healthy team', color: busFactorScore <= 1 ? 'text-red-400' : 'text-slate-500' },
        { label: 'CONTRIBUTORS', value: authors.map(([n]) => n).join(', '), color: 'text-slate-400' },
      ],
    })

    return result
  }, [commits, leadCount, activeLeadCount, signedCount, sessionTime])

  // Rotate cards
  const advance = useCallback(() => {
    if (cards.length === 0) return
    setTransitioning(true)
    setTimeout(() => {
      setVisibleIndex(prev => (prev + 1) % cards.length)
      setTransitioning(false)
    }, 300)
  }, [cards.length])

  useEffect(() => {
    if (cards.length === 0) return
    const interval = setInterval(advance, 5000)
    return () => clearInterval(interval)
  }, [advance, cards.length])

  if (cards.length === 0) return null
  const current = cards[visibleIndex % cards.length]

  return (
    <div
      className="admin-ticker relative overflow-hidden cursor-pointer group"
      onClick={advance}
      title="Click to cycle stats"
    >
      {/* Top accent border */}
      <div className={`absolute top-0 left-2 right-2 h-px ${current.accent.replace('border-', 'bg-')} transition-colors duration-500`} />

      {/* Sweep progress bar */}
      <div className="absolute top-0 left-0 right-0 h-px">
        <div className="h-full bg-emerald-400/20 admin-ticker-progress" style={{ animationDuration: '5s' }} />
      </div>

      {/* Card content */}
      <div className={`px-2.5 pt-2.5 pb-1 space-y-[3px] transition-all duration-300 ${transitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
        {current.rows.map((row, i) => (
          <div key={i}>
            <div className="flex items-center gap-1">
              {row.icon && <span className="text-[9px] leading-none">{row.icon}</span>}
              {row.label && (
                <span className="text-[8px] font-mono text-slate-600 tracking-[0.15em] uppercase shrink-0">
                  {row.label}
                </span>
              )}
              {row.value && !row.spark && (
                <span className={`text-[10px] font-mono ${row.color} ml-auto text-right truncate leading-tight`}>
                  {row.value}
                </span>
              )}
            </div>
            {row.spark && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <MiniSpark data={row.spark} color={row.color} />
                {row.value && (
                  <span className={`text-[10px] font-mono ${row.color} ml-auto`}>{row.value}</span>
                )}
              </div>
            )}
            {row.bar !== undefined && <MiniBar value={row.bar} color={row.color.replace('text-', 'bg-')} />}
          </div>
        ))}
      </div>

      {/* Dot nav */}
      <div className="flex items-center justify-center gap-[3px] py-1.5 opacity-40 group-hover:opacity-80 transition-opacity">
        {cards.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === visibleIndex % cards.length
                ? 'bg-emerald-400 w-2 h-[3px]'
                : 'bg-slate-700 w-[3px] h-[3px]'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
