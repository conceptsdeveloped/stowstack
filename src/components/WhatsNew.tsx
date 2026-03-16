import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  GitCommit, User, Flag, MessageSquare, Lightbulb, BarChart3,
} from 'lucide-react'
import commitsData from '@/data/commits.json'

import type {
  Commit, Idea, Enrichment, CommitFlag, CommitComment, CommitReview,
} from './whatsnew/WhatsNewTypes'
import { getAuthorInitials, getAuthorColor } from './whatsnew/WhatsNewHelpers'
import CommitOverview from './whatsnew/CommitOverview'
import CommitTimeline from './whatsnew/CommitTimeline'
import IdeaBoard from './whatsnew/IdeaBoard'

const commits = commitsData as Commit[]

type Section = 'overview' | 'timeline' | 'ideas' | 'activity' | 'handoffs'

export default function WhatsNew({ darkMode, adminKey }: { darkMode: boolean; adminKey: string }) {
  const [activeSection, setActiveSection] = useState<Section>('overview')
  const [search, setSearch] = useState('')
  const [expandedHash, setExpandedHash] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [areaFilter, setAreaFilter] = useState('all')
  const [authorFilter, setAuthorFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [visibleCount, setVisibleCount] = useState(30)
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily')

  const [ideas, setIdeas] = useState<Idea[]>([])
  const [ideasLoading, setIdeasLoading] = useState(false)
  const [showIdeaForm, setShowIdeaForm] = useState(false)
  const [newIdea, setNewIdea] = useState({ title: '', description: '', category: 'general', priority: 'medium' })
  const [ideaFilter, setIdeaFilter] = useState('all')
  const [ideaSaving, setIdeaSaving] = useState(false)

  const [lastVisit, setLastVisit] = useState<string | null>(null)

  const [devIdentity, setDevIdentity] = useState<string | null>(null)
  const [showIdentityPicker, setShowIdentityPicker] = useState(false)

  const [enrichments, setEnrichments] = useState<Record<string, Enrichment>>({})
  const [allFlags, setAllFlags] = useState<Record<string, CommitFlag[]>>({})
  const [allComments, setAllComments] = useState<Record<string, CommitComment[]>>({})
  const [allReviews, setAllReviews] = useState<Record<string, CommitReview[]>>({})

  const [showDevNoteFor, setShowDevNoteFor] = useState<string | null>(null)
  const [devNoteText, setDevNoteText] = useState('')
  const [devNoteSaving, setDevNoteSaving] = useState(false)
  const [showFlagMenuFor, setShowFlagMenuFor] = useState<string | null>(null)
  const [flagReason, setFlagReason] = useState('')
  const [showCommentsFor, setShowCommentsFor] = useState<Set<string>>(new Set())
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [commentSaving, setCommentSaving] = useState<string | null>(null)

  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('stowstack_bookmarks')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch { return new Set() }
  })
  const [showFilesFor, setShowFilesFor] = useState<Set<string>>(new Set())
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('stowstack_dev_identity')
    if (stored) setDevIdentity(stored)
    else setShowIdentityPicker(true)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('stowstack_whatsnew_last_visit')
    if (stored) setLastVisit(stored)
    localStorage.setItem('stowstack_whatsnew_last_visit', new Date().toISOString())
  }, [])

  const pickIdentity = (name: string) => {
    setDevIdentity(name)
    localStorage.setItem('stowstack_dev_identity', name)
    setShowIdentityPicker(false)
  }

  const headers = useMemo(() => ({ 'Content-Type': 'application/json', 'X-Admin-Key': adminKey }), [adminKey])

  const fetchEnrichments = useCallback(async () => {
    try {
      const res = await fetch('/api/commit-notes', { headers })
      if (res.ok) {
        const data = await res.json()
        setEnrichments(data.enrichments || {})
      }
    } catch { /* ignore */ }
  }, [headers])

  const fetchFlags = useCallback(async () => {
    try {
      const res = await fetch('/api/commit-flags', { headers })
      if (res.ok) {
        const data = await res.json()
        setAllFlags(data.flags || {})
      }
    } catch { /* ignore */ }
  }, [headers])

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch('/api/commit-comments', { headers })
      if (res.ok) {
        const data = await res.json()
        setAllComments(data.comments || {})
      }
    } catch { /* ignore */ }
  }, [headers])

  useEffect(() => { fetchEnrichments() }, [fetchEnrichments])
  useEffect(() => { fetchFlags() }, [fetchFlags])
  useEffect(() => { fetchComments() }, [fetchComments])

  const notificationCounts = useMemo(() => {
    if (!lastVisit) return { comments: 0, flags: 0, total: 0 }
    const lv = new Date(lastVisit)
    let comments = 0, flags = 0
    for (const arr of Object.values(allComments)) comments += arr.filter(c => new Date(c.created_at) > lv).length
    for (const arr of Object.values(allFlags)) flags += arr.filter(f => new Date(f.created_at) > lv).length
    return { comments, flags, total: comments + flags }
  }, [lastVisit, allComments, allFlags])

  const saveDevNote = async (commit: Commit) => {
    if (!devNoteText.trim() || !devIdentity) return
    setDevNoteSaving(true)
    try {
      const res = await fetch('/api/commit-notes', {
        method: 'POST', headers,
        body: JSON.stringify({ commitHash: commit.hash, devNote: devNoteText.trim(), devName: devIdentity, subject: commit.subject, body: commit.body || '' }),
      })
      if (res.ok) {
        const data = await res.json()
        setEnrichments(prev => ({ ...prev, [commit.hash]: data.enrichment }))
        setDevNoteText('')
        setShowDevNoteFor(null)
      }
    } catch { /* ignore */ }
    setDevNoteSaving(false)
  }

  const addFlag = async (commitHash: string, flagType: string) => {
    if (!devIdentity) return
    try {
      const res = await fetch('/api/commit-flags', {
        method: 'POST', headers,
        body: JSON.stringify({ commitHash, flagType, reason: flagReason.trim(), flaggedBy: devIdentity }),
      })
      if (res.ok) {
        const data = await res.json()
        setAllFlags(prev => ({ ...prev, [commitHash]: [...(prev[commitHash] || []), data.flag] }))
        setFlagReason('')
        setShowFlagMenuFor(null)
      }
    } catch { /* ignore */ }
  }

  const removeFlag = async (commitHash: string, flagId: string) => {
    try {
      await fetch('/api/commit-flags', { method: 'DELETE', headers, body: JSON.stringify({ id: flagId }) })
      setAllFlags(prev => ({ ...prev, [commitHash]: (prev[commitHash] || []).filter(f => f.id !== flagId) }))
    } catch { /* ignore */ }
  }

  const addComment = async (commitHash: string) => {
    const text = commentText[commitHash]?.trim()
    if (!text || !devIdentity) return
    setCommentSaving(commitHash)
    try {
      const res = await fetch('/api/commit-comments', {
        method: 'POST', headers,
        body: JSON.stringify({ commitHash, author: devIdentity, body: text }),
      })
      if (res.ok) {
        const data = await res.json()
        setAllComments(prev => ({ ...prev, [commitHash]: [...(prev[commitHash] || []), data.comment] }))
        setCommentText(prev => ({ ...prev, [commitHash]: '' }))
      }
    } catch { /* ignore */ }
    setCommentSaving(null)
  }

  const deleteComment = async (commitHash: string, commentId: string) => {
    try {
      await fetch('/api/commit-comments', { method: 'DELETE', headers, body: JSON.stringify({ id: commentId }) })
      setAllComments(prev => ({ ...prev, [commitHash]: (prev[commitHash] || []).filter(c => c.id !== commentId) }))
    } catch { /* ignore */ }
  }

  const toggleComments = (hash: string) => {
    setShowCommentsFor(prev => {
      const next = new Set(prev)
      if (next.has(hash)) next.delete(hash)
      else next.add(hash)
      return next
    })
  }

  const reviewCommit = async (commitHash: string, status: string) => {
    if (!devIdentity) return
    try {
      const res = await fetch('/api/commit-reviews', {
        method: 'POST', headers,
        body: JSON.stringify({ commitHash, reviewedBy: devIdentity, status }),
      })
      if (res.ok) {
        const data = await res.json()
        setAllReviews(prev => ({ ...prev, [commitHash]: [...(prev[commitHash] || []), data.review] }))
      }
    } catch { /* ignore */ }
  }

  const toggleBookmark = (hash: string) => {
    setBookmarks(prev => {
      const next = new Set(prev)
      if (next.has(hash)) next.delete(hash)
      else next.add(hash)
      localStorage.setItem('stowstack_bookmarks', JSON.stringify([...next]))
      return next
    })
  }

  const toggleFiles = (hash: string) => {
    setShowFilesFor(prev => {
      const next = new Set(prev)
      if (next.has(hash)) next.delete(hash)
      else next.add(hash)
      return next
    })
  }

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

  const authors = useMemo(() => [...new Set(commits.map(c => c.author))].sort(), [])
  const categories = useMemo(() => [...new Set(commits.map(c => c.category))].sort(), [])
  const areas = useMemo(() => [...new Set(commits.map(c => c.area))].sort(), [])

  const newSinceLastVisit = useMemo(() => {
    if (!lastVisit) return 0
    return commits.filter(c => new Date(c.date) > new Date(lastVisit)).length
  }, [lastVisit])

  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const heading = darkMode ? 'text-white' : 'text-slate-900'

  if (showIdentityPicker) {
    return (
      <div className="space-y-6">
        <div className={`rounded-xl border p-8 text-center ${card}`}>
          <User size={40} className="mx-auto mb-4 text-emerald-500" />
          <h2 className={`text-xl font-bold mb-2 ${heading}`}>Who are you?</h2>
          <p className={`text-sm mb-6 ${sub}`}>
            Pick your name so your notes, comments, and flags are attributed to you.
          </p>
          <div className="flex justify-center gap-4">
            {['Blake', 'angelo'].map(name => (
              <button
                key={name}
                onClick={() => pickIdentity(name)}
                className={`flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition-all cursor-pointer hover:scale-105 ${
                  darkMode ? 'border-slate-600 hover:border-emerald-500 bg-slate-750' : 'border-slate-200 hover:border-emerald-500 bg-white'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${getAuthorColor(name)}`}>
                  {getAuthorInitials(name)}
                </div>
                <span className={`text-lg font-semibold ${heading}`}>{name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${getAuthorColor(devIdentity || '')}`}>
            {getAuthorInitials(devIdentity || '?')}
          </div>
          <span className={`text-xs ${sub}`}>Logged in as <strong className={heading}>{devIdentity}</strong></span>
          <button
            onClick={() => setShowIdentityPicker(true)}
            className={`text-[10px] px-2 py-0.5 rounded border cursor-pointer ${darkMode ? 'border-slate-600 text-slate-400 hover:text-slate-300' : 'border-slate-300 text-slate-400 hover:text-slate-600'}`}
          >
            Switch
          </button>
        </div>
        {notificationCounts.total > 0 && (
          <div className={`flex items-center gap-2 text-xs ${sub}`}>
            {notificationCounts.comments > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare size={12} className="text-blue-500" />
                {notificationCounts.comments} new comment{notificationCounts.comments !== 1 ? 's' : ''}
              </span>
            )}
            {notificationCounts.flags > 0 && (
              <span className="flex items-center gap-1">
                <Flag size={12} className="text-amber-500" />
                {notificationCounts.flags} new flag{notificationCounts.flags !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

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
            {id === 'timeline' && (newSinceLastVisit > 0 || notificationCounts.total > 0) && (
              <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {newSinceLastVisit > 0 ? `${newSinceLastVisit} new` : ''}
                {newSinceLastVisit > 0 && notificationCounts.total > 0 ? ' · ' : ''}
                {notificationCounts.total > 0 ? `${notificationCounts.total} activity` : ''}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeSection === 'overview' && (
        <CommitOverview
          darkMode={darkMode}
          commits={commits}
          allFlags={allFlags}
          authors={authors}
          authorFilter={authorFilter}
          setAuthorFilter={setAuthorFilter}
          setActiveSection={setActiveSection}
          setExpandedHash={setExpandedHash}
        />
      )}

      {activeSection === 'timeline' && (
        <CommitTimeline
          darkMode={darkMode}
          commits={commits}
          search={search}
          setSearch={setSearch}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          areaFilter={areaFilter}
          setAreaFilter={setAreaFilter}
          authorFilter={authorFilter}
          setAuthorFilter={setAuthorFilter}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          visibleCount={visibleCount}
          setVisibleCount={setVisibleCount}
          viewMode={viewMode}
          setViewMode={setViewMode}
          flaggedOnly={flaggedOnly}
          setFlaggedOnly={setFlaggedOnly}
          bookmarkedOnly={bookmarkedOnly}
          setBookmarkedOnly={setBookmarkedOnly}
          categories={categories}
          areas={areas}
          authors={authors}
          enrichments={enrichments}
          allFlags={allFlags}
          allComments={allComments}
          allReviews={allReviews}
          bookmarks={bookmarks}
          toggleBookmark={toggleBookmark}
          showFilesFor={showFilesFor}
          toggleFiles={toggleFiles}
          expandedHash={expandedHash}
          setExpandedHash={setExpandedHash}
          lastVisit={lastVisit}
          newSinceLastVisit={newSinceLastVisit}
          notificationCounts={notificationCounts}
          devIdentity={devIdentity}
          showDevNoteFor={showDevNoteFor}
          setShowDevNoteFor={setShowDevNoteFor}
          devNoteText={devNoteText}
          setDevNoteText={setDevNoteText}
          devNoteSaving={devNoteSaving}
          saveDevNote={saveDevNote}
          showFlagMenuFor={showFlagMenuFor}
          setShowFlagMenuFor={setShowFlagMenuFor}
          flagReason={flagReason}
          setFlagReason={setFlagReason}
          addFlag={addFlag}
          removeFlag={removeFlag}
          showCommentsFor={showCommentsFor}
          toggleComments={toggleComments}
          commentText={commentText}
          setCommentText={setCommentText}
          commentSaving={commentSaving}
          addComment={addComment}
          deleteComment={deleteComment}
          reviewCommit={reviewCommit}
        />
      )}

      {activeSection === 'ideas' && (
        <IdeaBoard
          darkMode={darkMode}
          ideas={ideas}
          ideasLoading={ideasLoading}
          showIdeaForm={showIdeaForm}
          setShowIdeaForm={setShowIdeaForm}
          newIdea={newIdea}
          setNewIdea={setNewIdea}
          ideaSaving={ideaSaving}
          saveIdea={saveIdea}
          ideaFilter={ideaFilter}
          setIdeaFilter={setIdeaFilter}
          updateIdea={updateIdea}
          deleteIdea={deleteIdea}
          voteIdea={voteIdea}
        />
      )}
    </div>
  )
}
