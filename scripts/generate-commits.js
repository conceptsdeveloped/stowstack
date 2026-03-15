#!/usr/bin/env node
/**
 * Generates a JSON file of git commit history for the What's New admin tab.
 * Primary: GitHub API (works on Vercel's shallow clones).
 * Fallback: local git log (works in dev without a token).
 */
import { execSync } from 'child_process'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'

const OUTPUT = 'src/data/commits.json'
const GITHUB_REPO = 'conceptsdeveloped/stowstack'
const MAX_COMMITS = 200

/* ── Categorisation helpers (shared by both paths) ── */

function categorise(subject) {
  const s = subject.toLowerCase()
  if (s.startsWith('fix')) return 'fix'
  if (s.startsWith('add') || s.startsWith('build') || s.startsWith('create')) return 'feature'
  if (s.startsWith('update') || s.startsWith('improve') || s.startsWith('rewrite') || s.startsWith('overhaul')) return 'improvement'
  if (s.startsWith('remove') || s.startsWith('delete')) return 'removal'
  if (s.startsWith('trigger') || s.startsWith('use') || s.startsWith('move')) return 'config'
  return 'other'
}

function detectArea(subject) {
  if (/dashboard|admin|pipeline|kanban|billing|settings/i.test(subject)) return 'admin'
  if (/landing.page|lp\b/i.test(subject)) return 'landing-pages'
  if (/publish|meta|facebook|google.ads|oauth|campaign/i.test(subject)) return 'integrations'
  if (/form|audit|diagnostic/i.test(subject)) return 'forms'
  if (/email|resend|drip/i.test(subject)) return 'email'
  if (/api|endpoint|places|cron/i.test(subject)) return 'api'
  if (/asset|image|scrape|stock|creative|ad.preview/i.test(subject)) return 'creative'
  if (/client|portal|onboarding|guide/i.test(subject)) return 'client'
  if (/blog/i.test(subject)) return 'blog'
  if (/utm|link|tracking|a\/b|test/i.test(subject)) return 'tracking'
  if (/site|website|copy|hero/i.test(subject)) return 'website'
  return 'general'
}

function extractCoAuthor(body) {
  if (!body) return null
  const m = body.match(/Co-Authored-By:\s*(.+?)(?:\s*<[^>]+>)?$/m)
  return m ? m[1].trim() : null
}

function cleanBody(body) {
  if (!body) return null
  const cleaned = body.replace(/Co-Authored-By:.*$/gm, '').trim()
  return cleaned || null
}

/* ── GitHub API path ── */

async function fetchFromGitHub() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  if (!token) return null

  console.log('Fetching commits from GitHub API…')

  const perPage = 100
  const pages = Math.ceil(MAX_COMMITS / perPage)
  let allCommits = []

  for (let page = 1; page <= pages; page++) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=${perPage}&page=${page}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    })
    if (!res.ok) {
      console.warn(`GitHub API error (page ${page}): ${res.status} ${res.statusText}`)
      return null
    }
    const data = await res.json()
    if (data.length === 0) break
    allCommits = allCommits.concat(data)
    if (data.length < perPage) break
  }

  return allCommits.map(c => {
    const subject = c.commit.message.split('\n')[0]
    const body = c.commit.message.split('\n').slice(1).join('\n').trim()

    return {
      hash: c.sha,
      short: c.sha.slice(0, 7),
      author: c.commit.author.name,
      email: c.commit.author.email,
      date: c.commit.author.date,
      subject,
      body: cleanBody(body),
      category: categorise(subject),
      area: detectArea(subject),
      coAuthor: extractCoAuthor(body),
      filesChanged: c.stats?.total ? Math.round(c.stats.total / 2) : 0,
      insertions: c.stats?.additions ?? 0,
      deletions: c.stats?.deletions ?? 0,
    }
  })
}

/* ── Local git path (fallback for dev) ── */

function fetchFromGit() {
  console.log('Fetching commits from local git…')
  const RECORD_SEP = '---COMMIT---'
  const FIELD_SEP = '---FIELD---'

  const format = ['%H', '%h', '%an', '%ae', '%aI', '%s', '%b'].join(FIELD_SEP)
  const raw = execSync(`git log --format="${format}${RECORD_SEP}" --all -${MAX_COMMITS}`, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  })

  const commits = raw
    .split(RECORD_SEP)
    .map(s => s.trim())
    .filter(Boolean)
    .map(record => {
      const [hash, short, author, email, date, subject, ...bodyParts] = record.split(FIELD_SEP)
      const body = bodyParts.join(FIELD_SEP).trim()

      return {
        hash,
        short,
        author,
        email,
        date,
        subject,
        body: cleanBody(body),
        category: categorise(subject),
        area: detectArea(subject),
        coAuthor: extractCoAuthor(body),
        filesChanged: 0,
        insertions: 0,
        deletions: 0,
      }
    })

  // Enrich with file stats
  try {
    const statRaw = execSync(
      `git log --all -${MAX_COMMITS} --format="---STAT---%H" --shortstat`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    )
    const statMap = new Map()
    const statBlocks = statRaw.split('---STAT---').filter(Boolean)
    for (const block of statBlocks) {
      const lines = block.trim().split('\n')
      const blockHash = lines[0].trim()
      const statLine = lines.find(l => l.includes('file'))
      if (statLine && blockHash) {
        const files = statLine.match(/(\d+)\s+files?\s+changed/)
        const ins = statLine.match(/(\d+)\s+insertions?/)
        const del = statLine.match(/(\d+)\s+deletions?/)
        statMap.set(blockHash, {
          filesChanged: files ? parseInt(files[1]) : 0,
          insertions: ins ? parseInt(ins[1]) : 0,
          deletions: del ? parseInt(del[1]) : 0,
        })
      }
    }
    for (const c of commits) {
      const s = statMap.get(c.hash)
      if (s) Object.assign(c, s)
    }
  } catch (e) {
    console.warn('Could not enrich with file stats:', e.message)
  }

  return commits
}

/* ── Main ── */

async function main() {
  let commits

  // Try GitHub API first (works on Vercel's shallow clones)
  try {
    commits = await fetchFromGitHub()
  } catch (e) {
    console.warn('GitHub API fetch failed:', e.message)
  }

  // Fall back to local git
  if (!commits) {
    try {
      commits = fetchFromGit()
    } catch (e) {
      console.error('Local git fetch also failed:', e.message)
      commits = []
    }
  }

  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, JSON.stringify(commits, null, 2))
  console.log(`Generated ${commits.length} commits → ${OUTPUT}`)
}

main()
