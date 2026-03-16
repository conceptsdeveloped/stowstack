import { useState, useEffect, useMemo, useCallback, useRef } from 'react'

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
  const [sessionTime, setSessionTime] = useState(getSessionUptime())

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
        { label: '', value: busFactorScore <= 1 ? 'CRITICAL — one bad day from chaos' : busFactorScore <= 2 ? 'risky but viable' : 'healthy team', color: busFactorScore <= 1 ? 'text-red-400' : 'text-slate-500' },
        { label: 'TRUCK #', value: `${busFactorScore} (polite Canadian ver.)`, color: 'text-slate-500', icon: '🇨🇦' },
      ],
    })

    // ── Card 23: WTFs per Minute ──
    // Estimate from commit churn — high churn = high WTF potential
    const avgChurn = commits.slice(0, 20).reduce((s, c) => s + (c.insertions || 0) + (c.deletions || 0), 0) / Math.max(1, Math.min(20, commits.length))
    const wtfRate = avgChurn > 500 ? 'CRITICAL 🤬' : avgChurn > 200 ? 'ELEVATED 😤' : avgChurn > 80 ? 'MODERATE 😐' : 'ZEN 🧘'
    result.push({
      id: 'wtf-rate',
      accent: 'border-orange-500/30',
      rows: [
        { label: 'WTFs/MIN', value: '', color: 'text-slate-500', icon: '🤨' },
        { label: 'CODE REVIEW', value: wtfRate, color: avgChurn > 200 ? 'text-orange-400' : 'text-emerald-400' },
        { label: '', value: 'the only true quality metric', color: 'text-slate-600' },
      ],
    })

    // ── Card 24: Ballmer Peak ──
    const ballmerOptimal = hour >= 17 && hour <= 22
    result.push({
      id: 'ballmer-peak',
      accent: 'border-amber-500/20',
      rows: [
        { label: 'BALLMER PEAK', value: '', color: 'text-slate-500', icon: '🍺' },
        { label: 'BAC TARGET', value: '0.129%', color: 'text-amber-400' },
        { label: 'WINDOW', value: ballmerOptimal ? 'OPEN — superhuman coding zone' : 'CLOSED — try after 5pm', color: ballmerOptimal ? 'text-emerald-400' : 'text-slate-500' },
        { label: '', value: 'per XKCD #323', color: 'text-slate-600' },
      ],
    })

    // ── Card 25: LGTM Rate ──
    const suspiciouslyFastCommits = commits.filter((c, i) => {
      if (i >= commits.length - 1) return false
      const gap = (new Date(c.date).getTime() - new Date(commits[i + 1].date).getTime()) / 60000
      return gap > 0 && gap < 3 && (c.insertions || 0) > 200
    }).length
    result.push({
      id: 'lgtm-rate',
      accent: 'border-yellow-500/20',
      rows: [
        { label: 'LGTM SPEED', value: '', color: 'text-slate-500', icon: '👀' },
        { label: 'SUSPICIOUS', value: `${suspiciouslyFastCommits} speed-merges`, color: suspiciouslyFastCommits > 3 ? 'text-yellow-400' : 'text-slate-400' },
        { label: '', value: suspiciouslyFastCommits > 3 ? 'nobody read that code' : 'seems legit', color: 'text-slate-600' },
      ],
    })

    // ── Card 26: Nerd Snipe Factor ──
    // Estimate from category diversity — more categories = more distraction
    const catCount = Object.keys(cats).length
    const nerdSnipeLevel = catCount > 8 ? 'EXTREME 🎯' : catCount > 5 ? 'HIGH' : catCount > 3 ? 'MODERATE' : 'FOCUSED'
    result.push({
      id: 'nerd-snipe',
      accent: 'border-indigo-500/20',
      rows: [
        { label: 'NERD SNIPE', value: '', color: 'text-slate-500', icon: '🎯' },
        { label: 'DISTRACTION', value: nerdSnipeLevel, color: catCount > 5 ? 'text-indigo-400' : 'text-emerald-400' },
        { label: 'CATEGORIES', value: `${catCount} different areas touched`, color: 'text-slate-400' },
        { label: '', value: 'ooh shiny problem...', color: 'text-slate-600' },
      ],
    })

    // ── Card 27: Yak Shave Depth ──
    // Estimate from consecutive config/chore/refactor commits
    let maxYakDepth = 0
    let currentYakDepth = 0
    for (const c of commits.slice(0, 50)) {
      const isYak = /chore|refactor|config|fix.*ci|fix.*build|setup|deps|upgrade|bump/i.test(c.subject)
      if (isYak) { currentYakDepth++; maxYakDepth = Math.max(maxYakDepth, currentYakDepth) }
      else currentYakDepth = 0
    }
    result.push({
      id: 'yak-shave',
      accent: 'border-pink-500/20',
      rows: [
        { label: 'YAK SHAVE', value: '', color: 'text-slate-500', icon: '🐃' },
        { label: 'MAX DEPTH', value: `${maxYakDepth} levels deep`, color: maxYakDepth >= 4 ? 'text-pink-400' : 'text-slate-400' },
        { label: '', value: maxYakDepth >= 4 ? 'needed to deploy → fixed CI → updated config → refactored module → questioned life choices' : maxYakDepth >= 2 ? 'a classic two-yak situation' : 'remarkably focused', color: 'text-slate-600' },
      ],
    })

    // ── Card 28: Half-Life of Knowledge ──
    // Based on how many files get re-touched within 7 days
    const rechurnCount = weekCommits.reduce((s, c) => s + (c.filesChanged || 0), 0)
    const halfLifeDays = rechurnCount > 50 ? 2 : rechurnCount > 20 ? 5 : rechurnCount > 10 ? 14 : 30
    result.push({
      id: 'half-life',
      accent: 'border-teal-500/20',
      rows: [
        { label: 'KNOWLEDGE ½-LIFE', value: '', color: 'text-slate-500', icon: '☢️' },
        { label: 'DECAY RATE', value: `~${halfLifeDays} days`, color: halfLifeDays <= 5 ? 'text-teal-400' : 'text-slate-400' },
        { label: '', value: halfLifeDays <= 5 ? 'everything you knew is already wrong' : 'codebase somewhat stable', color: 'text-slate-600' },
        { label: '7D CHURN', value: `${rechurnCount} file touches`, color: 'text-teal-400/60' },
      ],
    })

    // ── Card 29: Lines of Code per Pizza ──
    const estPizzas = Math.max(1, Math.ceil(daysSinceFirst / 3))
    const linesPerPizza = Math.round(totalInsertions / estPizzas)
    result.push({
      id: 'pizza-metric',
      accent: 'border-orange-500/20',
      rows: [
        { label: 'LOC/PIZZA', value: '', color: 'text-slate-500', icon: '🍕' },
        { label: 'RATIO', value: `${linesPerPizza.toLocaleString()} lines/pie`, color: 'text-orange-400' },
        { label: 'EST. PIZZAS', value: `~${estPizzas} consumed`, color: 'text-amber-400' },
        { label: '', value: 'the only productivity currency', color: 'text-slate-600' },
      ],
    })

    // ── Card 30: TTMR (Time to Mass Resignation) ──
    // Based on ratio of fix/chore commits to feature commits
    const fixChoreCount = commits.filter(c => /^(fix|chore|refactor|revert)/i.test(c.subject)).length
    const featCount = commits.filter(c => /^feat/i.test(c.subject)).length
    const debtRatio = featCount > 0 ? fixChoreCount / featCount : 0
    const ttmrStatus = debtRatio > 3 ? 'LINKEDIN UPDATED 💼' : debtRatio > 1.5 ? 'RESUME POLISHING 📝' : debtRatio > 0.8 ? 'MONITORING 👁️' : 'VIBES IMMACULATE ✨'
    result.push({
      id: 'ttmr',
      accent: debtRatio > 2 ? 'border-red-500/30' : 'border-emerald-500/20',
      rows: [
        { label: 'TTMR', value: '', color: 'text-slate-500', icon: '🚪' },
        { label: 'STATUS', value: ttmrStatus, color: debtRatio > 2 ? 'text-red-400' : 'text-emerald-400' },
        { label: 'FIX:FEAT', value: `${fixChoreCount}:${featCount}`, color: 'text-slate-400' },
        { label: '', value: 'time to mass resignation index', color: 'text-slate-600' },
      ],
    })

    // ── Card 31: Gravitational Pull of Legacy Code ──
    // Older files getting more commits = legacy gravity
    const oldCommitRatio = commits.length > 20 ? commits.slice(Math.floor(commits.length * 0.7)).reduce((s, c) => s + (c.filesChanged || 0), 0) / Math.max(1, commits.slice(0, Math.floor(commits.length * 0.3)).reduce((s, c) => s + (c.filesChanged || 0), 0)) : 0
    result.push({
      id: 'legacy-gravity',
      accent: 'border-purple-500/20',
      rows: [
        { label: 'LEGACY GRAVITY', value: '', color: 'text-slate-500', icon: '🕳️' },
        { label: 'PULL', value: oldCommitRatio > 1 ? 'STRONG — old code wins' : 'WEAK — new code dominant', color: oldCommitRatio > 1 ? 'text-purple-400' : 'text-emerald-400' },
        { label: '', value: 'bad code attracts bad code', color: 'text-slate-600' },
        { label: '', value: '"just to be consistent"', color: 'text-purple-400/40' },
      ],
    })

    // ── Card 32: JIRA Velocity vs Actual ──
    const jiraVelocity = Math.round(commits.length * 1.8) // "planned" points
    const actualVelocity = commits.length
    result.push({
      id: 'jira-velocity',
      accent: 'border-blue-500/20',
      rows: [
        { label: 'JIRA vs REAL', value: '', color: 'text-slate-500', icon: '📋' },
        { label: 'BOARD SAYS', value: `${jiraVelocity} pts`, color: 'text-blue-400' },
        { label: 'ACTUALLY', value: `${actualVelocity} things shipped`, color: 'text-emerald-400' },
        { label: 'GAP', value: `${Math.round(((jiraVelocity - actualVelocity) / Math.max(1, jiraVelocity)) * 100)}% fantasy`, color: 'text-amber-400' },
      ],
    })

    // ── Card 33: Deploy Anxiety Level ──
    const fridayCommits = commits.filter(c => new Date(c.date).getDay() === 5).length
    const fridayRatio = commits.length > 0 ? fridayCommits / commits.length : 0
    result.push({
      id: 'deploy-anxiety',
      accent: 'border-red-500/20',
      rows: [
        { label: 'DEPLOY ANXIETY', value: '', color: 'text-slate-500', icon: '😰' },
        { label: 'FRIDAY DEPLOYS', value: `${fridayCommits}`, color: fridayRatio > 0.2 ? 'text-red-400' : 'text-slate-400' },
        { label: '', value: fridayRatio > 0.2 ? 'LIVES DANGEROUSLY' : fridayRatio > 0.1 ? 'occasionally brave' : 'responsible adult', color: fridayRatio > 0.2 ? 'text-red-400' : 'text-slate-600' },
        { label: '', value: 'never deploy on friday', color: 'text-slate-600' },
      ],
    })

    // ── Card 34: Rubber Duck Sessions ──
    const soloDebugs = commits.filter(c => /fix|bug|debug|hotfix|patch/i.test(c.subject) && !c.coAuthor).length
    result.push({
      id: 'rubber-duck',
      accent: 'border-yellow-500/20',
      rows: [
        { label: 'RUBBER DUCK', value: '', color: 'text-slate-500', icon: '🦆' },
        { label: 'SOLO DEBUGS', value: `${soloDebugs} sessions`, color: 'text-yellow-400' },
        { label: '', value: soloDebugs > 10 ? 'duck is exhausted' : soloDebugs > 5 ? 'duck earning overtime' : 'duck barely employed', color: 'text-slate-600' },
        { label: '', value: 'have you tried talking to the duck?', color: 'text-yellow-400/40' },
      ],
    })

    // ── Card 35: TODO Debt ──
    result.push({
      id: 'todo-debt',
      accent: 'border-rose-500/20',
      rows: [
        { label: 'TODO DEBT', value: '', color: 'text-slate-500', icon: '📌' },
        { label: 'STATUS', value: 'probably infinite', color: 'text-rose-400' },
        { label: '', value: `${Math.round(totalInsertions * 0.003)} est. TODOs written`, color: 'text-slate-400' },
        { label: '', value: '0 est. TODOs resolved', color: 'text-rose-400/60' },
      ],
    })

    // ── Card 36: Impostor Syndrome Index ──
    result.push({
      id: 'impostor',
      accent: 'border-violet-500/20',
      rows: [
        { label: 'IMPOSTOR INDEX', value: '', color: 'text-slate-500', icon: '🎭' },
        { label: 'SHIPPED', value: `${totalInsertions.toLocaleString()} lines`, color: 'text-emerald-400' },
        { label: 'FEELING', value: 'still googling how to center a div', color: 'text-violet-400' },
        { label: '', value: devScore > 5000 ? 'you literally built this' : 'we all feel this way', color: 'text-slate-600' },
      ],
    })

    // ── Card 37: Stack Overflow Dependency ──
    result.push({
      id: 'stackoverflow',
      accent: 'border-orange-500/20',
      rows: [
        { label: 'SO DEPENDENCY', value: '', color: 'text-slate-500', icon: '📚' },
        { label: 'EST. TABS OPEN', value: `~${Math.min(99, Math.round(commitsToday * 4 + 12))}`, color: 'text-orange-400' },
        { label: 'COPIED FROM', value: 'stackoverflow, probably', color: 'text-slate-500' },
        { label: '', value: commitsToday > 5 ? 'browser RAM: critical 🔴' : 'browser holding steady', color: 'text-slate-600' },
      ],
    })

    return result
  }, [commits, leadCount, activeLeadCount, signedCount, sessionTime])

  // Auto-scroll
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [autoScrollPaused, setAutoScrollPaused] = useState(false)

  // Infinite scroll: duplicate cards so we can loop seamlessly
  // When scroll passes the halfway mark (end of first set), snap back to top
  const halfHeight = useRef(0)

  // Measure the height of one full set of cards
  useEffect(() => {
    const el = scrollRef.current
    if (!el || cards.length === 0) return
    // The inner container has two copies; half is one copy
    const inner = el.firstElementChild as HTMLElement | null
    if (inner) halfHeight.current = inner.scrollHeight / 2
  }, [cards])

  // Auto-scroll the ticker tape with infinite loop
  useEffect(() => {
    if (cards.length === 0 || isHovered || autoScrollPaused) return
    const el = scrollRef.current
    if (!el) return
    const interval = setInterval(() => {
      if (!el) return
      // Seamless reset: when we pass the first copy, jump back
      if (halfHeight.current > 0 && el.scrollTop >= halfHeight.current) {
        el.scrollTop = el.scrollTop - halfHeight.current
      }
      el.scrollBy({ top: 1, behavior: 'auto' })
    }, 40)
    return () => clearInterval(interval)
  }, [cards.length, isHovered, autoScrollPaused])

  // Pause auto-scroll briefly after manual scroll
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const handleWheel = useCallback(() => {
    setAutoScrollPaused(true)
    clearTimeout(wheelTimeoutRef.current)
    wheelTimeoutRef.current = setTimeout(() => setAutoScrollPaused(false), 6000)
  }, [])

  if (cards.length === 0) return null

  /** Render a single ticker card */
  const renderCard = (card: TickerCard, keyPrefix: string) => (
    <div
      key={`${keyPrefix}-${card.id}`}
      className="relative pl-3.5 pr-2.5 py-2.5 hover:bg-white/[0.02] transition-colors duration-200"
    >
      {/* Left accent */}
      <div className={`absolute left-0 top-2 bottom-2 w-[2px] rounded-r ${card.accent.replace('border-', 'bg-')}`} />

      <div className="space-y-1">
        {card.rows.map((row, i) => {
          // First row with an icon+label = card title — render bigger
          const isTitle = i === 0 && row.icon && row.label
          return (
            <div key={i}>
              <div className={`flex items-center gap-1.5 ${isTitle ? 'mb-0.5' : ''}`}>
                {row.icon && <span className={`${isTitle ? 'text-[11px]' : 'text-[9px]'} leading-none shrink-0`}>{row.icon}</span>}
                {row.label && (
                  <span className={`font-mono tracking-[0.12em] uppercase shrink-0 ${
                    isTitle
                      ? 'text-[9px] text-slate-400 font-semibold'
                      : 'text-[8px] text-slate-600'
                  }`}>
                    {row.label}
                  </span>
                )}
                {row.value && !row.spark && (
                  <span className={`font-mono ml-auto text-right leading-tight ${
                    isTitle
                      ? `text-[11px] font-semibold ${row.color}`
                      : !row.label
                        ? `text-[9px] ${row.color} italic opacity-70`
                        : `text-[10px] ${row.color}`
                  }`} style={!row.label ? { marginLeft: '14px' } : undefined}>
                    {row.value}
                  </span>
                )}
              </div>
              {row.spark && (
                <div className="flex items-center gap-1.5 mt-1">
                  <MiniSpark data={row.spark} color={row.color} />
                  {row.value && (
                    <span className={`text-[10px] font-mono ${row.color} ml-auto`}>{row.value}</span>
                  )}
                </div>
              )}
              {row.bar !== undefined && <MiniBar value={row.bar} color={row.color.replace('text-', 'bg-')} />}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div
      className="admin-ticker relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.04]">
        <span className="text-[9px] font-mono text-slate-500 tracking-[0.18em] uppercase font-semibold">DEV TICKER</span>
        <span className="flex-1" />
        <span className="text-[8px] font-mono text-slate-700">{cards.length}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 admin-dot-pulse" />
      </div>

      {/* Scrollable ticker tape — two copies for infinite loop */}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="overflow-y-auto admin-scrollbar-hidden"
        style={{ maxHeight: 'calc(50vh - 120px)', minHeight: '180px' }}
      >
        <div className="divide-y divide-white/[0.04]">
          {/* First copy */}
          {cards.map(card => renderCard(card, 'a'))}
          {/* Second copy for seamless loop */}
          {cards.map(card => renderCard(card, 'b'))}
        </div>
      </div>

      {/* Fade overlays top/bottom */}
      <div className="pointer-events-none absolute top-[28px] left-0 right-0 h-5 bg-gradient-to-b from-[#0a0d12] to-transparent z-10" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0a0d12] to-transparent z-10" />
    </div>
  )
}
