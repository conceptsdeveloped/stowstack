import type { Commit } from './WhatsNewTypes'

export function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function formatShortDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function timeAgo(iso: string) {
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

export function groupByDate(items: Commit[]): Record<string, Commit[]> {
  const groups: Record<string, Commit[]> = {}
  for (const c of items) {
    const key = formatDate(c.date)
    if (!groups[key]) groups[key] = []
    groups[key].push(c)
  }
  return groups
}

export function groupByWeek(items: Commit[]): Record<string, Commit[]> {
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

export function getAuthorInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function getAuthorColor(name: string) {
  const colors = [
    'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500'
  ]
  let hash = 0
  for (const c of name) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0
  return colors[Math.abs(hash) % colors.length]
}

export function getISODateKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10)
}
