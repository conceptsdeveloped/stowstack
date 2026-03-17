import type {
  BetaPadSession, BetaPadEntry, QuickNote, BugReport, FeatureRequest,
} from './types'
import { formatDuration } from './utils'

// ─── Helpers ───

function groupByRoute(entries: BetaPadEntry[]): Map<string, BetaPadEntry[]> {
  const map = new Map<string, BetaPadEntry[]>()
  for (const e of entries) {
    const route = e.route || '/'
    if (!map.has(route)) map.set(route, [])
    map.get(route)!.push(e)
  }
  return map
}

function priorityLabel(p: string): string {
  const labels: Record<string, string> = {
    P0: 'P0-Critical', P1: 'P1-High', P2: 'P2-Medium', P3: 'P3-Low',
  }
  return labels[p] || p
}

function entryTypeLabel(t: string): string {
  return t === 'note' ? 'Quick Note' : t === 'bug' ? 'Bug Report' : 'Feature Request'
}

// ─── Markdown Export ───

export function exportMarkdown(session: BetaPadSession): string {
  const lines: string[] = []
  const date = new Date(session.started).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const duration = formatDuration(session.total_time)
  const bugs = session.entries.filter(e => e.entry_type === 'bug')
  const notes = session.entries.filter(e => e.entry_type === 'note')
  const features = session.entries.filter(e => e.entry_type === 'feature')

  lines.push(`# BetaPad QA Session Report`)
  lines.push(``)
  lines.push(`**Date:** ${date}`)
  lines.push(`**Duration:** ${duration}`)
  lines.push(`**Pages Visited:** ${session.total_pages_visited}`)
  lines.push(`**Device:** ${session.device}`)
  lines.push(`**Entries:** ${session.entries.length} total (${bugs.length} bugs, ${notes.length} notes, ${features.length} feature requests)`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  // Group by route
  const grouped = groupByRoute(session.entries)
  for (const [route, entries] of grouped) {
    lines.push(`## ${route}`)
    lines.push(``)
    for (const entry of entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp))) {
      lines.push(formatEntryMarkdown(entry))
      lines.push(``)
    }
  }

  // Flow breadcrumb
  if (session.flow_breadcrumb.length > 0) {
    lines.push(`## Session Flow`)
    lines.push(``)
    for (const step of session.flow_breadcrumb) {
      const time = new Date(step.timestamp).toLocaleTimeString()
      lines.push(`- **${time}** → ${step.route} (${step.page_title}) — ${step.time_spent_seconds}s`)
    }
    lines.push(``)
  }

  return lines.join('\n')
}

function formatEntryMarkdown(entry: BetaPadEntry): string {
  const lines: string[] = []
  const time = new Date(entry.timestamp).toLocaleTimeString()
  const tags = entry.tags.map(t => `\`${t}\``).join(' ')

  if (entry.entry_type === 'bug') {
    const bug = entry as BugReport
    lines.push(`### 🐛 Bug: ${bug.title}`)
    lines.push(`**Time:** ${time} | **Priority:** ${priorityLabel(bug.priority)} | **Severity:** ${bug.severity} | **Tags:** ${tags}`)
    lines.push(``)
    if (bug.steps_to_reproduce.length > 0) {
      lines.push(`**Steps to Reproduce:**`)
      bug.steps_to_reproduce.forEach((s, i) => lines.push(`${i + 1}. ${s.text}`))
      lines.push(``)
    }
    lines.push(`**Expected:** ${bug.expected_behavior}`)
    lines.push(`**Actual:** ${bug.actual_behavior}`)
  } else if (entry.entry_type === 'feature') {
    const feat = entry as FeatureRequest
    lines.push(`### 💡 Feature: ${feat.title}`)
    lines.push(`**Time:** ${time} | **Priority:** ${priorityLabel(feat.priority)} | **Impact:** ${feat.impact_tags.join(', ')} | **Effort:** ${feat.effort_guess}`)
    lines.push(``)
    lines.push(feat.description)
    if (feat.user_story) {
      lines.push(``)
      lines.push(`> ${feat.user_story}`)
    }
    if (feat.competitive_note) {
      lines.push(``)
      lines.push(`**Competitive Note:** ${feat.competitive_note}`)
    }
  } else {
    const note = entry as QuickNote
    lines.push(`### 📝 Note`)
    lines.push(`**Time:** ${time} | **Priority:** ${priorityLabel(note.priority)} | **Tags:** ${tags}`)
    lines.push(``)
    lines.push(note.text)
  }

  // Common metadata
  if (entry.console_errors.length > 0) {
    lines.push(``)
    lines.push(`**Console Errors:** ${entry.console_errors.length}`)
    entry.console_errors.slice(0, 3).forEach(e => lines.push(`- \`${e.message}\``))
  }
  if (entry.dom_selector) {
    lines.push(`**Pinned to:** \`${entry.dom_selector}\``)
  }

  return lines.join('\n')
}

// ─── JSON Export ───

export function exportJSON(session: BetaPadSession): string {
  return JSON.stringify(session, null, 2)
}

// ─── Claude Prompt Export ───

export function exportClaudePrompt(session: BetaPadSession, appName = 'StowStack'): string {
  const date = new Date(session.started).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const duration = formatDuration(session.total_time)
  const bugs = session.entries.filter(e => e.entry_type === 'bug') as BugReport[]
  const notes = session.entries.filter(e => e.entry_type === 'note') as QuickNote[]
  const features = session.entries.filter(e => e.entry_type === 'feature') as FeatureRequest[]

  const uxIssues = notes.filter(n => n.tags.includes('ux-issue'))
  const copyEdits = notes.filter(n => n.tags.includes('copy-edit'))
  const flowBreaks = notes.filter(n => n.tags.includes('flow-break'))
  const otherNotes = notes.filter(n =>
    !n.tags.includes('ux-issue') && !n.tags.includes('copy-edit') && !n.tags.includes('flow-break')
  )

  const lines: string[] = []

  lines.push(`Here are our QA testing notes from a session on ${date} testing ${appName}. We visited ${session.total_pages_visited} pages over ${duration}.`)
  lines.push(``)

  if (bugs.length > 0) {
    lines.push(`## Bugs Found (${bugs.length})`)
    lines.push(``)
    for (const bug of bugs) {
      lines.push(`### ${bug.title}`)
      lines.push(`**Page:** ${bug.route} | **Severity:** ${bug.severity} | **Priority:** ${priorityLabel(bug.priority)}`)
      if (bug.steps_to_reproduce.length > 0) {
        lines.push(`**Steps:**`)
        bug.steps_to_reproduce.forEach((s, i) => lines.push(`${i + 1}. ${s.text}`))
      }
      lines.push(`**Expected:** ${bug.expected_behavior}`)
      lines.push(`**Actual:** ${bug.actual_behavior}`)
      if (bug.console_errors.length > 0) {
        lines.push(`**Console errors:** ${bug.console_errors.map(e => e.message).join('; ')}`)
      }
      if (bug.dom_selector) lines.push(`**Element:** \`${bug.dom_selector}\``)
      lines.push(``)
    }
  }

  if (uxIssues.length > 0) {
    lines.push(`## UX Issues (${uxIssues.length})`)
    lines.push(``)
    for (const n of uxIssues) {
      lines.push(`- **${n.route}:** ${n.text}${n.dom_selector ? ` (element: \`${n.dom_selector}\`)` : ''}`)
    }
    lines.push(``)
  }

  if (features.length > 0) {
    lines.push(`## Feature Ideas (${features.length})`)
    lines.push(``)
    for (const f of features) {
      lines.push(`### ${f.title}`)
      lines.push(`**Page:** ${f.route} | **Impact:** ${f.impact_tags.join(', ')} | **Effort:** ${f.effort_guess}`)
      lines.push(f.description)
      if (f.user_story) lines.push(`> ${f.user_story}`)
      if (f.competitive_note) lines.push(`**Competitive note:** ${f.competitive_note}`)
      lines.push(``)
    }
  }

  if (copyEdits.length > 0) {
    lines.push(`## Copy/Content Edits (${copyEdits.length})`)
    lines.push(``)
    for (const n of copyEdits) {
      lines.push(`- **${n.route}:** ${n.text}${n.dom_selector ? ` (element: \`${n.dom_selector}\`)` : ''}`)
    }
    lines.push(``)
  }

  if (flowBreaks.length > 0) {
    lines.push(`## Flow Issues (${flowBreaks.length})`)
    lines.push(``)
    for (const n of flowBreaks) {
      lines.push(`### ${n.route}`)
      lines.push(n.text)
      if (n.flow_breadcrumb.length > 0) {
        lines.push(`**How we got here:**`)
        n.flow_breadcrumb.slice(-5).forEach(b => {
          lines.push(`→ ${b.route} (${b.time_spent_seconds}s)`)
        })
      }
      lines.push(``)
    }
  }

  if (otherNotes.length > 0) {
    lines.push(`## Other Notes (${otherNotes.length})`)
    lines.push(``)
    for (const n of otherNotes) {
      lines.push(`- **${n.route}** [${n.tags.join(', ')}]: ${n.text}`)
    }
    lines.push(``)
  }

  lines.push(`---`)
  lines.push(``)
  lines.push(`Based on these notes:`)
  lines.push(`1. Prioritize by severity and impact`)
  lines.push(`2. Group related issues`)
  lines.push(`3. For each bug/issue, suggest the specific code changes needed with file paths`)
  lines.push(`4. For feature ideas, outline implementation approach`)
  lines.push(`5. Identify any patterns (same page keeps having issues, same type of bug recurring, etc.)`)

  return lines.join('\n')
}

// ─── GitHub Issues Export ───

export function exportGitHubIssues(session: BetaPadSession): string {
  const bugs = session.entries.filter(e => e.entry_type === 'bug') as BugReport[]
  const issues: string[] = []

  for (const bug of bugs) {
    const lines: string[] = []
    lines.push(`# ${bug.title}`)
    lines.push(``)
    lines.push(`**Severity:** ${bug.severity} | **Priority:** ${priorityLabel(bug.priority)}`)
    lines.push(`**Page:** ${bug.route}`)
    lines.push(`**Tags:** ${bug.tags.map(t => `\`${t}\``).join(' ')}`)
    lines.push(``)
    if (bug.steps_to_reproduce.length > 0) {
      lines.push(`## Steps to Reproduce`)
      bug.steps_to_reproduce.forEach((s, i) => lines.push(`${i + 1}. ${s.text}`))
      lines.push(``)
    }
    lines.push(`## Expected Behavior`)
    lines.push(bug.expected_behavior)
    lines.push(``)
    lines.push(`## Actual Behavior`)
    lines.push(bug.actual_behavior)
    lines.push(``)
    lines.push(`## Environment`)
    lines.push(`- **Viewport:** ${bug.viewport.width}x${bug.viewport.height}`)
    lines.push(`- **Device:** ${bug.device_type}`)
    lines.push(`- **User Agent:** ${bug.user_agent}`)
    if (bug.console_errors.length > 0) {
      lines.push(``)
      lines.push(`## Console Errors`)
      bug.console_errors.forEach(e => lines.push(`- \`${e.message}\``))
    }
    lines.push(``)
    lines.push(`---`)
    lines.push(`*Reported via BetaPad QA session ${bug.session_id}*`)
    issues.push(lines.join('\n'))
  }

  return issues.join('\n\n═══════════════════════════════════════\n\n')
}

// ─── CSV Export ───

export function exportCSV(session: BetaPadSession): string {
  const headers = [
    'ID', 'Type', 'Title/Text', 'Priority', 'Severity', 'Tags', 'Status',
    'Route', 'Timestamp', 'Device', 'Viewport', 'Starred',
  ]
  const rows: string[][] = [headers]

  for (const entry of session.entries) {
    const title = entry.entry_type === 'note'
      ? (entry as QuickNote).text.slice(0, 100)
      : entry.entry_type === 'bug'
        ? (entry as BugReport).title
        : (entry as FeatureRequest).title

    const severity = entry.entry_type === 'bug' ? (entry as BugReport).severity : ''

    rows.push([
      entry.entry_id,
      entryTypeLabel(entry.entry_type),
      `"${title.replace(/"/g, '""')}"`,
      entry.priority,
      severity,
      entry.tags.join('; '),
      entry.status,
      entry.route,
      entry.timestamp,
      entry.device_type,
      `${entry.viewport.width}x${entry.viewport.height}`,
      entry.starred ? 'Yes' : 'No',
    ])
  }

  return rows.map(r => r.join(',')).join('\n')
}

// ─── Export selected entries as Claude Prompt ───

export function exportSelectedAsClaudePrompt(
  entries: BetaPadEntry[],
  appName = 'StowStack'
): string {
  // Create a pseudo-session from selected entries
  const session: BetaPadSession = {
    session_id: 'selected',
    started: entries[0]?.timestamp || new Date().toISOString(),
    ended: entries[entries.length - 1]?.timestamp || null,
    device: entries[0]?.device_type || 'desktop',
    entries,
    flow_breadcrumb: [],
    total_pages_visited: new Set(entries.map(e => e.route)).size,
    total_time: 0,
  }
  return exportClaudePrompt(session, appName)
}
