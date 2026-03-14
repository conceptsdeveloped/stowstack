#!/usr/bin/env node
/**
 * Generates a JSON file of git commit history for the What's New admin tab.
 * Runs at build time so the data is available in the frontend bundle.
 */
import { execSync } from 'child_process'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'

const OUTPUT = 'src/data/commits.json'

const RECORD_SEP = '---COMMIT---'
const FIELD_SEP = '---FIELD---'

try {
  const format = ['%H', '%h', '%an', '%ae', '%aI', '%s', '%b'].join(FIELD_SEP)
  const raw = execSync(`git log --format="${format}${RECORD_SEP}" --all -200`, {
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

      // Categorize the commit
      let category = 'other'
      const subjectLower = subject.toLowerCase()
      if (subjectLower.startsWith('fix')) category = 'fix'
      else if (subjectLower.startsWith('add') || subjectLower.startsWith('build') || subjectLower.startsWith('create')) category = 'feature'
      else if (subjectLower.startsWith('update') || subjectLower.startsWith('improve') || subjectLower.startsWith('rewrite') || subjectLower.startsWith('overhaul')) category = 'improvement'
      else if (subjectLower.startsWith('remove') || subjectLower.startsWith('delete')) category = 'removal'
      else if (subjectLower.startsWith('trigger') || subjectLower.startsWith('use') || subjectLower.startsWith('move')) category = 'config'

      // Extract co-author
      const coAuthorMatch = body.match(/Co-Authored-By:\s*(.+?)(?:\s*<[^>]+>)?$/m)
      const coAuthor = coAuthorMatch ? coAuthorMatch[1].trim() : null

      // Clean body: remove co-authored-by lines
      const cleanBody = body
        .replace(/Co-Authored-By:.*$/gm, '')
        .trim()

      // Detect files changed area from subject
      let area = 'general'
      if (/dashboard|admin|pipeline|kanban|billing|settings/i.test(subject)) area = 'admin'
      else if (/landing.page|lp\b/i.test(subject)) area = 'landing-pages'
      else if (/publish|meta|facebook|google.ads|oauth|campaign/i.test(subject)) area = 'integrations'
      else if (/form|audit|diagnostic/i.test(subject)) area = 'forms'
      else if (/email|resend/i.test(subject)) area = 'email'
      else if (/api|endpoint|places/i.test(subject)) area = 'api'
      else if (/asset|image|scrape|stock|creative|ad.preview/i.test(subject)) area = 'creative'
      else if (/client|portal|onboarding|guide/i.test(subject)) area = 'client'
      else if (/blog/i.test(subject)) area = 'blog'
      else if (/utm|link|tracking/i.test(subject)) area = 'tracking'
      else if (/site|website|copy|hero/i.test(subject)) area = 'website'

      return {
        hash,
        short,
        author,
        email,
        date,
        subject,
        body: cleanBody || null,
        category,
        area,
        coAuthor,
        filesChanged: 0,
        insertions: 0,
        deletions: 0,
      }
    })

  // Enrich with file stats
  try {
    const statRaw = execSync(
      `git log --all -200 --format="---STAT---%H" --shortstat`,
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
      if (s) {
        c.filesChanged = s.filesChanged
        c.insertions = s.insertions
        c.deletions = s.deletions
      }
    }
  } catch (e) {
    console.warn('Could not enrich with file stats:', e.message)
  }

  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, JSON.stringify(commits, null, 2))
  console.log(`Generated ${commits.length} commits → ${OUTPUT}`)
} catch (err) {
  console.error('Failed to generate commits:', err.message)
  // Write empty array so build doesn't break
  writeFileSync(OUTPUT, '[]')
}
