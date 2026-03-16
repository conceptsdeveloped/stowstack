import {
  Search, ChevronDown, ChevronUp, GitCommit, User, Calendar,
  Filter, Clock, Code, Tag, Eye, PenLine, Send,
  X as XIcon, Flag, MessageSquare, Trash2,
  Bookmark, BookmarkCheck, GitMerge, CheckCheck, CheckCircle2,
  FolderOpen,
} from 'lucide-react'
import type { Commit, Enrichment, CommitFlag, CommitComment, CommitReview } from './WhatsNewTypes'
import { CATEGORY_CONFIG, AREA_CONFIG, FLAG_CONFIG, DIFF_SIZE_CONFIG, FILE_STATUS_CONFIG, REVIEW_STATUS_CONFIG } from './WhatsNewTypes'
import { formatDate, formatTime, timeAgo, groupByDate, groupByWeek, getAuthorInitials, getAuthorColor } from './WhatsNewHelpers'
import { useMemo } from 'react'

export interface CommitTimelineProps {
  darkMode: boolean
  commits: Commit[]

  /* filters */
  search: string
  setSearch: (v: string) => void
  categoryFilter: string
  setCategoryFilter: (v: string) => void
  areaFilter: string
  setAreaFilter: (v: string) => void
  authorFilter: string
  setAuthorFilter: (v: string) => void
  showFilters: boolean
  setShowFilters: (v: boolean) => void
  visibleCount: number
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>
  viewMode: 'daily' | 'weekly'
  setViewMode: (v: 'daily' | 'weekly') => void

  /* quick filter toggles */
  flaggedOnly: boolean
  setFlaggedOnly: (v: boolean) => void
  bookmarkedOnly: boolean
  setBookmarkedOnly: (v: boolean) => void

  /* derived lists */
  categories: string[]
  areas: string[]
  authors: string[]

  /* enrichments / flags / comments / reviews */
  enrichments: Record<string, Enrichment>
  allFlags: Record<string, CommitFlag[]>
  allComments: Record<string, CommitComment[]>
  allReviews: Record<string, CommitReview[]>

  /* bookmarks */
  bookmarks: Set<string>
  toggleBookmark: (hash: string) => void

  /* file visibility */
  showFilesFor: Set<string>
  toggleFiles: (hash: string) => void

  /* expanded / selection */
  expandedHash: string | null
  setExpandedHash: (v: string | null) => void

  /* new-since-last-visit */
  lastVisit: string | null
  newSinceLastVisit: number
  notificationCounts: { comments: number; flags: number; total: number }

  /* dev identity */
  devIdentity: string | null

  /* dev note */
  showDevNoteFor: string | null
  setShowDevNoteFor: (v: string | null) => void
  devNoteText: string
  setDevNoteText: (v: string) => void
  devNoteSaving: boolean
  saveDevNote: (commit: Commit) => void

  /* flags */
  showFlagMenuFor: string | null
  setShowFlagMenuFor: (v: string | null) => void
  flagReason: string
  setFlagReason: (v: string) => void
  addFlag: (commitHash: string, flagType: string) => void
  removeFlag: (commitHash: string, flagId: string) => void

  /* comments */
  showCommentsFor: Set<string>
  toggleComments: (hash: string) => void
  commentText: Record<string, string>
  setCommentText: React.Dispatch<React.SetStateAction<Record<string, string>>>
  commentSaving: string | null
  addComment: (commitHash: string) => void
  deleteComment: (commitHash: string, commentId: string) => void

  /* reviews */
  reviewCommit: (commitHash: string, status: string) => void
}

export default function CommitTimeline({
  darkMode,
  commits,
  search, setSearch,
  categoryFilter, setCategoryFilter,
  areaFilter, setAreaFilter,
  authorFilter, setAuthorFilter,
  showFilters, setShowFilters,
  visibleCount, setVisibleCount,
  viewMode, setViewMode,
  flaggedOnly, setFlaggedOnly,
  bookmarkedOnly, setBookmarkedOnly,
  categories, areas, authors,
  enrichments, allFlags, allComments, allReviews,
  bookmarks, toggleBookmark,
  showFilesFor, toggleFiles,
  expandedHash, setExpandedHash,
  lastVisit, newSinceLastVisit, notificationCounts,
  devIdentity,
  showDevNoteFor, setShowDevNoteFor, devNoteText, setDevNoteText, devNoteSaving, saveDevNote,
  showFlagMenuFor, setShowFlagMenuFor, flagReason, setFlagReason, addFlag, removeFlag,
  showCommentsFor, toggleComments, commentText, setCommentText, commentSaving, addComment, deleteComment,
  reviewCommit,
}: CommitTimelineProps) {
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
  const heading = darkMode ? 'text-white' : 'text-slate-900'

  const filtered = useMemo(() => {
    let result = commits
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.subject.toLowerCase().includes(q) ||
        c.body?.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q) ||
        c.short.toLowerCase().includes(q) ||
        enrichments[c.hash]?.dev_note?.toLowerCase().includes(q) ||
        enrichments[c.hash]?.laymans_summary?.toLowerCase().includes(q)
      )
    }
    if (categoryFilter !== 'all') result = result.filter(c => c.category === categoryFilter)
    if (areaFilter !== 'all') result = result.filter(c => c.area === areaFilter)
    if (authorFilter !== 'all') result = result.filter(c => c.author === authorFilter)
    if (flaggedOnly) result = result.filter(c => (allFlags[c.hash] || []).length > 0)
    if (bookmarkedOnly) result = result.filter(c => bookmarks.has(c.hash))
    return result
  }, [commits, search, categoryFilter, areaFilter, authorFilter, enrichments, flaggedOnly, bookmarkedOnly, allFlags, bookmarks])

  const grouped = useMemo(() => {
    const slice = filtered.slice(0, visibleCount)
    return viewMode === 'weekly' ? groupByWeek(slice) : groupByDate(slice)
  }, [filtered, visibleCount, viewMode])

  return (
    <>
      {/* New since last visit banner */}
      {newSinceLastVisit > 0 && (
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${
          darkMode ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'
        }`}>
          <Eye size={18} className="text-emerald-500" />
          <p className={`text-sm font-medium ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
            {newSinceLastVisit} new commit{newSinceLastVisit !== 1 ? 's' : ''} since your last visit
            {notificationCounts.total > 0 && (
              <span className={`ml-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                ({notificationCounts.comments > 0 ? `${notificationCounts.comments} comment${notificationCounts.comments !== 1 ? 's' : ''}` : ''}
                {notificationCounts.comments > 0 && notificationCounts.flags > 0 ? ', ' : ''}
                {notificationCounts.flags > 0 ? `${notificationCounts.flags} flag${notificationCounts.flags !== 1 ? 's' : ''}` : ''})
              </span>
            )}
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
              placeholder="Search commits, dev notes, summaries..."
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

            {/* Quick filter toggles */}
            <button
              onClick={() => setFlaggedOnly(!flaggedOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                flaggedOnly
                  ? 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-900/20'
                  : darkMode ? 'border-slate-600 text-slate-400 hover:border-slate-500' : 'border-slate-300 text-slate-500 hover:border-slate-400'
              }`}
            >
              <Flag size={12} />
              Flagged
            </button>
            <button
              onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                bookmarkedOnly
                  ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : darkMode ? 'border-slate-600 text-slate-400 hover:border-slate-500' : 'border-slate-300 text-slate-500 hover:border-slate-400'
              }`}
            >
              <Bookmark size={12} />
              Saved
              {bookmarks.size > 0 && <span className={`text-[10px] ${sub}`}>({bookmarks.size})</span>}
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
                const enrichment = enrichments[commit.hash]
                const commitFlags = allFlags[commit.hash] || []
                const commitComments = allComments[commit.hash] || []
                const commitReviews = allReviews[commit.hash] || []
                const commentsOpen = showCommentsFor.has(commit.hash)

                return (
                  <div
                    key={commit.hash}
                    className={`rounded-xl border transition-all ${
                      isNew ? 'ring-1 ring-emerald-500/30' : ''
                    } ${
                      commitFlags.length > 0 ? 'ring-1 ring-amber-500/30' : ''
                    } ${
                      isExpanded
                        ? darkMode ? 'bg-slate-750 border-slate-600' : 'bg-slate-50 border-slate-300'
                        : `${card} hover:border-slate-400 dark:hover:border-slate-500`
                    }`}
                  >
                    {/* ── Collapsed header ── */}
                    <button
                      onClick={() => setExpandedHash(isExpanded ? null : commit.hash)}
                      className="w-full text-left px-4 py-3 flex items-start gap-3 cursor-pointer"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5 ${getAuthorColor(commit.author)}`}>
                        {getAuthorInitials(commit.author)}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Layman's summary (shown prominently if available) */}
                        {enrichment?.laymans_summary && (
                          <p className={`text-sm font-medium leading-snug mb-1 ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                            {enrichment.laymans_summary}
                          </p>
                        )}

                        <div className="flex items-center gap-2">
                          <p className={`text-sm ${enrichment?.laymans_summary ? `${sub} text-xs` : `font-medium leading-snug ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}`}>
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

                          {/* Flag badges inline */}
                          {commitFlags.map(f => {
                            const fc = FLAG_CONFIG[f.flag_type]
                            if (!fc) return null
                            const FIcon = fc.icon
                            return (
                              <span key={f.id} className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium ${darkMode ? fc.darkColor : fc.color}`}>
                                <FIcon size={9} />
                                {fc.label}
                              </span>
                            )
                          })}

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

                          {/* Comment count indicator */}
                          {commitComments.length > 0 && (
                            <span className={`inline-flex items-center gap-1 text-[10px] ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                              <MessageSquare size={10} />
                              {commitComments.length}
                            </span>
                          )}

                          {/* Dev note indicator */}
                          {enrichment?.dev_note && (
                            <span className={`inline-flex items-center gap-1 text-[10px] ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                              <PenLine size={10} />
                              note
                            </span>
                          )}

                          {/* Diff size badge */}
                          {commit.diffSize && commit.diffSize !== 'tiny' && (
                            <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              darkMode ? DIFF_SIZE_CONFIG[commit.diffSize]?.darkColor : DIFF_SIZE_CONFIG[commit.diffSize]?.color
                            }`}>
                              {DIFF_SIZE_CONFIG[commit.diffSize]?.label}
                            </span>
                          )}

                          {/* Merge indicator */}
                          {commit.isMerge && (
                            <span className={`inline-flex items-center gap-0.5 text-[10px] ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                              <GitMerge size={10} />
                              merge
                            </span>
                          )}

                          {/* Bookmark indicator */}
                          {bookmarks.has(commit.hash) && (
                            <BookmarkCheck size={10} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
                          )}

                          {/* Review status */}
                          {commitReviews.length > 0 && (
                            <span className={`inline-flex items-center gap-0.5 text-[10px] ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              <CheckCheck size={10} />
                              {commitReviews.length}/{['Blake', 'angelo'].length}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={`shrink-0 mt-1 ${sub}`}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {/* ── Expanded details ── */}
                    {isExpanded && (
                      <div className={`px-4 pb-4 pt-0 ml-11 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                        <div className="pt-3 space-y-3">

                          {/* Dev Note (intention) */}
                          {enrichment?.dev_note && (
                            <div className={`rounded-lg border p-3 ${darkMode ? 'bg-amber-900/10 border-amber-800/50' : 'bg-amber-50 border-amber-200'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <PenLine size={12} className={darkMode ? 'text-amber-400' : 'text-amber-600'} />
                                <span className={`text-[10px] uppercase font-bold tracking-wider ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                                  Dev Note from {enrichment.dev_name || 'unknown'}
                                </span>
                              </div>
                              <p className={`text-sm ${darkMode ? 'text-amber-200' : 'text-amber-800'}`}>
                                {enrichment.dev_note}
                              </p>
                            </div>
                          )}

                          {/* Layman's summary (expanded view) */}
                          {enrichment?.laymans_summary && (
                            <div className={`rounded-lg border p-3 ${darkMode ? 'bg-emerald-900/10 border-emerald-800/50' : 'bg-emerald-50 border-emerald-200'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <Eye size={12} className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                                <span className={`text-[10px] uppercase font-bold tracking-wider ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                  In Plain English
                                </span>
                              </div>
                              <p className={`text-sm ${darkMode ? 'text-emerald-200' : 'text-emerald-800'}`}>
                                {enrichment.laymans_summary}
                              </p>
                            </div>
                          )}

                          {/* Technical summary */}
                          {enrichment?.technical_summary && (
                            <div className={`rounded-lg border p-3 ${darkMode ? 'bg-blue-900/10 border-blue-800/50' : 'bg-blue-50 border-blue-200'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <Code size={12} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
                                <span className={`text-[10px] uppercase font-bold tracking-wider ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                                  Technical Summary
                                </span>
                              </div>
                              <p className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                                {enrichment.technical_summary}
                              </p>
                            </div>
                          )}

                          {/* Original commit body */}
                          {commit.body && (
                            <div className={`text-sm leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <GitCommit size={12} className={sub} />
                                <span className={`text-[10px] uppercase font-bold tracking-wider ${sub}`}>
                                  Commit Message
                                </span>
                              </div>
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

                          {/* ── Changed files tree ── */}
                          {(commit.changedFiles || []).length > 0 && (
                            <div>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleFiles(commit.hash) }}
                                className={`flex items-center gap-2 text-xs font-medium cursor-pointer ${darkMode ? 'text-slate-300 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'}`}
                              >
                                <FolderOpen size={12} />
                                {showFilesFor.has(commit.hash) ? 'Hide' : 'Show'} {commit.changedFiles!.length} changed file{commit.changedFiles!.length !== 1 ? 's' : ''}
                                {showFilesFor.has(commit.hash) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                              {showFilesFor.has(commit.hash) && (
                                <div className={`mt-2 rounded-lg border p-2 space-y-0.5 ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                                  {commit.changedFiles!.map((f, i) => {
                                    const fConfig = FILE_STATUS_CONFIG[f.status] || FILE_STATUS_CONFIG.M
                                    return (
                                      <div key={i} className="flex items-center gap-2 py-0.5">
                                        <span className={`text-[10px] font-bold w-3 ${fConfig.color}`}>{f.status}</span>
                                        <code className={`text-[11px] font-mono truncate ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                          {f.file}
                                        </code>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
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

                          {/* ── Action bar: Add Note / Flag / Comment / Bookmark / Review ── */}
                          <div className={`flex flex-wrap gap-2 pt-2 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowDevNoteFor(showDevNoteFor === commit.hash ? null : commit.hash); setDevNoteText(enrichment?.dev_note || '') }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                darkMode ? 'bg-slate-700 text-amber-400 hover:bg-slate-600' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              }`}
                            >
                              <PenLine size={12} />
                              {enrichment?.dev_note ? 'Edit Dev Note' : 'Add Dev Note'}
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); setShowFlagMenuFor(showFlagMenuFor === commit.hash ? null : commit.hash) }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                darkMode ? 'bg-slate-700 text-red-400 hover:bg-slate-600' : 'bg-red-50 text-red-700 hover:bg-red-100'
                              }`}
                            >
                              <Flag size={12} />
                              Flag
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); toggleComments(commit.hash) }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                commentsOpen
                                  ? darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                                  : darkMode ? 'bg-slate-700 text-blue-400 hover:bg-slate-600' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                              }`}
                            >
                              <MessageSquare size={12} />
                              Comments {commitComments.length > 0 ? `(${commitComments.length})` : ''}
                            </button>

                            {/* Bookmark */}
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleBookmark(commit.hash) }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                bookmarks.has(commit.hash)
                                  ? darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                                  : darkMode ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {bookmarks.has(commit.hash) ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                              {bookmarks.has(commit.hash) ? 'Saved' : 'Save'}
                            </button>

                            {/* Review */}
                            <div className="flex items-center gap-1 ml-auto">
                              {commitReviews.find(r => r.reviewed_by === devIdentity) ? (
                                <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg ${
                                  darkMode ? REVIEW_STATUS_CONFIG[commitReviews.find(r => r.reviewed_by === devIdentity)!.status]?.darkColor : REVIEW_STATUS_CONFIG[commitReviews.find(r => r.reviewed_by === devIdentity)!.status]?.color
                                }`}>
                                  <CheckCheck size={10} />
                                  {REVIEW_STATUS_CONFIG[commitReviews.find(r => r.reviewed_by === devIdentity)!.status]?.label}
                                </span>
                              ) : (
                                <>
                                  <button onClick={(e) => { e.stopPropagation(); reviewCommit(commit.hash, 'reviewed') }} className={`px-2 py-1 rounded text-[10px] font-medium cursor-pointer ${darkMode ? 'bg-slate-700 text-blue-400 hover:bg-slate-600' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`} title="Mark reviewed">
                                    <CheckCheck size={11} />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); reviewCommit(commit.hash, 'approved') }} className={`px-2 py-1 rounded text-[10px] font-medium cursor-pointer ${darkMode ? 'bg-slate-700 text-emerald-400 hover:bg-slate-600' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`} title="Approve">
                                    <CheckCircle2 size={11} />
                                  </button>
                                </>
                              )}
                              {commitReviews.length > 0 && (
                                <span className={`text-[10px] ${sub} ml-1`}>
                                  {commitReviews.length}/{['Blake', 'angelo'].length} reviewed
                                </span>
                              )}
                            </div>
                          </div>

                          {/* ── Dev Note form ── */}
                          {showDevNoteFor === commit.hash && (
                            <div className={`rounded-lg border p-3 space-y-2 ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                              <label className={`text-xs font-medium ${sub}`}>
                                What was your intention with this change?
                              </label>
                              <textarea
                                value={devNoteText}
                                onChange={e => setDevNoteText(e.target.value)}
                                placeholder="E.g., I wanted to make it easier for operators to see their revenue at a glance..."
                                rows={3}
                                className={`w-full rounded-lg border px-3 py-2 text-sm resize-none ${inputBg}`}
                              />
                              <div className="flex items-center justify-between">
                                <p className={`text-[10px] ${sub}`}>
                                  AI will generate plain-English and technical summaries from this
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setShowDevNoteFor(null)}
                                    className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer ${darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => saveDevNote(commit)}
                                    disabled={!devNoteText.trim() || devNoteSaving}
                                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                  >
                                    <Send size={11} />
                                    {devNoteSaving ? 'Saving...' : 'Save & Generate'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ── Flag menu ── */}
                          {showFlagMenuFor === commit.hash && (
                            <div className={`rounded-lg border p-3 space-y-3 ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(FLAG_CONFIG).map(([type, config]) => {
                                  const FIcon = config.icon
                                  const alreadyFlagged = commitFlags.some(f => f.flag_type === type && f.flagged_by === devIdentity)
                                  return (
                                    <button
                                      key={type}
                                      onClick={() => !alreadyFlagged && addFlag(commit.hash, type)}
                                      disabled={alreadyFlagged}
                                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border cursor-pointer transition-colors ${
                                        alreadyFlagged
                                          ? 'opacity-40 cursor-not-allowed'
                                          : darkMode ? `${config.darkColor} hover:opacity-80` : `${config.color} hover:opacity-80`
                                      }`}
                                    >
                                      <FIcon size={11} />
                                      {config.label}
                                    </button>
                                  )
                                })}
                              </div>
                              <input
                                type="text"
                                placeholder="Optional reason for flagging..."
                                value={flagReason}
                                onChange={e => setFlagReason(e.target.value)}
                                className={`w-full rounded-lg border px-3 py-1.5 text-xs ${inputBg}`}
                              />

                              {/* Existing flags */}
                              {commitFlags.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className={`text-[10px] font-medium ${sub}`}>Active flags:</p>
                                  {commitFlags.map(f => {
                                    const fc = FLAG_CONFIG[f.flag_type]
                                    if (!fc) return null
                                    const FIcon = fc.icon
                                    return (
                                      <div key={f.id} className={`flex items-center justify-between gap-2 px-2 py-1 rounded text-[11px] ${
                                        darkMode ? 'bg-slate-600' : 'bg-slate-50'
                                      }`}>
                                        <div className="flex items-center gap-2">
                                          <FIcon size={10} />
                                          <span className="font-medium">{fc.label}</span>
                                          <span className={sub}>by {f.flagged_by}</span>
                                          {f.reason && <span className={sub}>— {f.reason}</span>}
                                        </div>
                                        {f.flagged_by === devIdentity && (
                                          <button
                                            onClick={() => removeFlag(commit.hash, f.id)}
                                            className="text-red-400 hover:text-red-500 cursor-pointer"
                                            title="Remove flag"
                                          >
                                            <XIcon size={10} />
                                          </button>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* ── Comment thread ── */}
                          {commentsOpen && (
                            <div className={`rounded-lg border ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                              <div className={`px-3 py-2 border-b flex items-center gap-2 ${darkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                                <MessageSquare size={12} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
                                <span className={`text-xs font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                                  Discussion ({commitComments.length})
                                </span>
                              </div>

                              {/* Comments list */}
                              {commitComments.length > 0 && (
                                <div className="divide-y divide-slate-200 dark:divide-slate-600">
                                  {commitComments.map(c => (
                                    <div key={c.id} className="px-3 py-2.5 flex gap-2.5">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0 ${getAuthorColor(c.author)}`}>
                                        {getAuthorInitials(c.author)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className={`text-xs font-semibold ${heading}`}>{c.author}</span>
                                          <span className={`text-[10px] ${sub}`}>{timeAgo(c.created_at)}</span>
                                          {c.author === devIdentity && (
                                            <button
                                              onClick={() => deleteComment(commit.hash, c.id)}
                                              className="text-red-400 hover:text-red-500 cursor-pointer ml-auto"
                                              title="Delete comment"
                                            >
                                              <Trash2 size={10} />
                                            </button>
                                          )}
                                        </div>
                                        <p className={`text-sm mt-0.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                          {c.body}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Add comment form */}
                              <div className={`px-3 py-2.5 border-t ${darkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                                <div className="flex gap-2">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0 ${getAuthorColor(devIdentity || '')}`}>
                                    {getAuthorInitials(devIdentity || '?')}
                                  </div>
                                  <div className="flex-1 flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Write a comment..."
                                      value={commentText[commit.hash] || ''}
                                      onChange={e => setCommentText(prev => ({ ...prev, [commit.hash]: e.target.value }))}
                                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) addComment(commit.hash) }}
                                      className={`flex-1 rounded-lg border px-3 py-1.5 text-xs ${inputBg}`}
                                    />
                                    <button
                                      onClick={() => addComment(commit.hash)}
                                      disabled={!commentText[commit.hash]?.trim() || commentSaving === commit.hash}
                                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                    >
                                      <Send size={11} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
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
  )
}
