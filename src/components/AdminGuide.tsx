import { useState, useEffect, useRef } from 'react'
import {
  Building2, ArrowLeft, BookOpen, BarChart3, ClipboardList,
  Users, Columns3,
  CreditCard, Settings, Keyboard, Megaphone, Image,
  Layers, Search, ChevronDown, ChevronRight,
  CheckSquare, Square, Play, ImageIcon, MapPin, X as XIcon,
  ExternalLink, Rocket, Eye, Printer, Bookmark, BookmarkCheck,
  Sparkles, Star
} from 'lucide-react'

/* ── Helper Components ── */

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        {n}
      </div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  )
}

function Section({ id, icon: Icon, title, collapsed, onToggle, children, darkMode, bookmarked, onToggleBookmark }: {
  id: string; icon: any; title: string; collapsed: boolean; onToggle: () => void; children: React.ReactNode; darkMode: boolean
  bookmarked?: boolean; onToggleBookmark?: () => void
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className={`rounded-xl border p-5 sm:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="flex-1 flex items-center gap-2 text-left group"
          >
            <Icon size={20} className="text-amber-600 shrink-0" />
            <h2 className="text-lg font-bold flex-1">{title}</h2>
            <div className={`transition-transform duration-200 ${collapsed ? '' : 'rotate-90'}`}>
              <ChevronRight size={18} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
            </div>
          </button>
          {onToggleBookmark && (
            <button
              onClick={onToggleBookmark}
              className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                bookmarked
                  ? 'text-amber-500 hover:text-amber-600'
                  : darkMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:text-slate-500'
              }`}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark this section'}
            >
              {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
          )}
        </div>
        {!collapsed && (
          <div className="space-y-4 mt-4">
            {children}
          </div>
        )}
      </div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="space-y-2 pl-1">
        {children}
      </div>
    </div>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
      {children}
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">{children}</kbd>
  )
}

function WalkthroughTip({ location, onNavigate, darkMode }: {
  location: string; onNavigate: () => void; darkMode: boolean
}) {
  return (
    <div className={`border-l-4 border-amber-500 rounded-r-lg px-4 py-3 flex items-center justify-between gap-3 ${
      darkMode ? 'bg-amber-900/10' : 'bg-amber-50/70'
    }`}>
      <div className="flex items-center gap-2 min-w-0">
        <MapPin size={14} className="text-amber-600 shrink-0" />
        <div className="min-w-0">
          <p className={`text-[10px] uppercase font-semibold tracking-wide ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>Where to find it</p>
          <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{location}</p>
        </div>
      </div>
      <button
        onClick={onNavigate}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shrink-0"
      >
        Go there <ExternalLink size={12} />
      </button>
    </div>
  )
}

function MediaSlot({ caption, type = 'screenshot', darkMode }: {
  caption: string; type?: 'screenshot' | 'video'; darkMode: boolean
}) {
  return (
    <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 ${
      darkMode ? 'border-slate-600 bg-slate-700/30' : 'border-slate-200 bg-slate-50/50'
    }`}>
      {type === 'video' ? (
        <Play size={28} className={darkMode ? 'text-slate-500' : 'text-slate-300'} />
      ) : (
        <ImageIcon size={28} className={darkMode ? 'text-slate-500' : 'text-slate-300'} />
      )}
      <p className={`text-xs text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{caption}</p>
      <span className={`text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full ${
        darkMode ? 'bg-slate-600 text-slate-400' : 'bg-slate-200 text-slate-400'
      }`}>Coming soon</span>
    </div>
  )
}

/* ── Quick-Start Checklist ── */

const CHECKLIST_ITEMS = [
  { id: 'login', title: 'Log in to admin dashboard', desc: 'Access the admin panel at /admin with your key', section: 'overview' },
  { id: 'review-lead', title: 'Review your first lead', desc: 'Open Pipeline and expand a lead card to see details', section: 'pipeline' },
  { id: 'send-form', title: 'Send onboarding form to a client', desc: 'Generate an access code and send the portal link', section: 'onboarding' },
  { id: 'setup-facility', title: 'Set up a facility', desc: 'Create a facility record in the Facilities tab', section: 'facilities' },
  { id: 'create-lp', title: 'Create your first landing page', desc: 'Build an ad-specific page with the section builder', section: 'landing-pages' },
  { id: 'enter-data', title: 'Enter first month of campaign data', desc: 'Add spend, leads, and move-in numbers for a facility', section: 'facilities' },
]

function QuickStartChecklist({ darkMode }: { darkMode: boolean }) {
  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('stowstack_admin_checklist')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  const [hidden, setHidden] = useState(() => localStorage.getItem('stowstack_admin_checklist_hidden') === 'true')

  useEffect(() => {
    localStorage.setItem('stowstack_admin_checklist', JSON.stringify([...checked]))
  }, [checked])

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const hide = () => {
    setHidden(true)
    localStorage.setItem('stowstack_admin_checklist_hidden', 'true')
  }

  const show = () => {
    setHidden(false)
    localStorage.removeItem('stowstack_admin_checklist_hidden')
  }

  if (hidden) {
    return (
      <button onClick={show} className={`text-xs flex items-center gap-1.5 mb-4 transition-colors ${
        darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
      }`}>
        <Rocket size={12} /> Show quick-start checklist ({checked.size}/{CHECKLIST_ITEMS.length} done)
      </button>
    )
  }

  const progress = CHECKLIST_ITEMS.length > 0 ? (checked.size / CHECKLIST_ITEMS.length) * 100 : 0

  return (
    <div className={`rounded-xl border p-5 mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Rocket size={16} className="text-amber-600" /> Quick Start
        </h2>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{checked.size}/{CHECKLIST_ITEMS.length}</span>
          <button onClick={hide} className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}>
            <XIcon size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className={`h-1.5 rounded-full overflow-hidden mb-4 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-1">
        {CHECKLIST_ITEMS.map(item => {
          const done = checked.has(item.id)
          return (
            <div key={item.id} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              done
                ? darkMode ? 'bg-slate-700/30' : 'bg-slate-50'
                : darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'
            }`}>
              <button onClick={() => toggle(item.id)} className="mt-0.5 shrink-0">
                {done ? (
                  <CheckSquare size={18} className="text-amber-500" />
                ) : (
                  <Square size={18} className={darkMode ? 'text-slate-500' : 'text-slate-300'} />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <a href={`#${item.section}`} className={`text-sm font-medium transition-colors ${
                  done
                    ? `line-through ${darkMode ? 'text-slate-500' : 'text-slate-400'}`
                    : darkMode ? 'text-slate-200 hover:text-amber-400' : 'text-slate-700 hover:text-amber-600'
                }`}>
                  {item.title}
                </a>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{item.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      {checked.size === CHECKLIST_ITEMS.length && (
        <div className="mt-4 text-center">
          <p className="text-sm font-medium text-amber-600">All done! You're ready to go.</p>
        </div>
      )}
    </div>
  )
}

/* ── Section Data (for search) ── */

const SECTIONS_DATA = [
  { id: 'overview', title: 'Overview', keywords: 'overview dashboard hub tabs login authentication admin key' },
  { id: 'pipeline', title: 'Pipeline Management', keywords: 'pipeline leads status workflow submitted form sent done audit ready call set signed lost bulk actions search filter follow-up overdue notes' },
  { id: 'kanban', title: 'Kanban Board', keywords: 'kanban board drag drop columns visual status' },
  { id: 'onboarding', title: 'Client Onboarding', keywords: 'onboarding client access code portal form wizard audit call close activate' },
  { id: 'facilities', title: 'Facilities Management', keywords: 'facilities facility campaign data spend leads move-ins revenue cpl roas' },
  { id: 'landing-pages', title: 'Landing Pages', keywords: 'landing pages slug hero trust bar features unit types gallery testimonials faq cta location map section builder publish variations a/b testing storedge' },
  { id: 'portfolio', title: 'Portfolio & Insights', keywords: 'portfolio insights analytics cross-client aggregate performance reporting trends' },
  { id: 'billing', title: 'Billing', keywords: 'billing invoices payment plan fees ad spend management' },
  { id: 'settings', title: 'Settings & Configuration', keywords: 'settings company name email phone signature notifications defaults follow-up dark mode' },
  { id: 'integrations', title: 'Meta & Google Integration', keywords: 'meta facebook instagram google ads integration environment variables api connect publish' },
  { id: 'shortcuts', title: 'Keyboard Shortcuts', keywords: 'keyboard shortcuts command palette cmd k escape tabs refresh notifications' },
  { id: 'assets', title: 'Assets & Creative', keywords: 'assets creative images photos upload scraper stock library drag drop gallery hero' },
]

const STATUS_FLOW = [
  { status: 'Submitted', desc: 'Lead just came in from the audit intake form' },
  { status: 'Form Sent', desc: 'You sent them the onboarding form link and access code' },
  { status: 'Form Done', desc: 'Client completed the onboarding wizard' },
  { status: 'Audit Ready', desc: 'You generated their facility audit / campaign proposal' },
  { status: 'Call Set', desc: 'Discovery or close call is scheduled' },
  { status: 'Signed', desc: 'Client signed on — active account' },
  { status: 'Lost', desc: 'Lead did not convert (record the reason in notes)' },
]

/* ── Changelog Data ── */

const CHANGELOG = [
  { version: '1.3', date: 'Mar 14, 2026', items: [
    { type: 'new' as const, text: 'Admin Guide with search, bookmarks, and quick-start checklist' },
    { type: 'new' as const, text: 'Contextual help tooltips across admin dashboard' },
    { type: 'new' as const, text: 'Print-friendly guide export' },
  ]},
  { version: '1.2', date: 'Mar 10, 2026', items: [
    { type: 'new' as const, text: 'Facebook data deletion flow and Meta platform compliance' },
    { type: 'new' as const, text: 'Publish This Ad button in Ad Preview tab' },
    { type: 'improved' as const, text: 'Publish tab with Meta and Google Ads platform integration' },
  ]},
  { version: '1.1', date: 'Mar 6, 2026', items: [
    { type: 'new' as const, text: 'Deep website scraper for facility images' },
    { type: 'new' as const, text: 'Storage-specific stock image library' },
    { type: 'new' as const, text: 'Ad preview system with multi-format support' },
    { type: 'improved' as const, text: 'Asset management with drag-and-drop upload' },
  ]},
  { version: '1.0', date: 'Feb 28, 2026', items: [
    { type: 'new' as const, text: 'Admin dashboard with pipeline, kanban, portfolio, and billing views' },
    { type: 'new' as const, text: 'Client portal with onboarding wizard' },
    { type: 'new' as const, text: 'Landing page builder with section-based architecture' },
    { type: 'new' as const, text: 'Full-funnel attribution and campaign reporting' },
  ]},
]

/* ── Bookmarks Panel ── */

function BookmarksPanel({ bookmarks, sections, darkMode, onJump, onRemove, onClose }: {
  bookmarks: Set<string>
  sections: typeof SECTIONS_DATA
  darkMode: boolean
  onJump: (id: string) => void
  onRemove: (id: string) => void
  onClose: () => void
}) {
  const bookmarkedSections = sections.filter(s => bookmarks.has(s.id))

  return (
    <div className={`rounded-xl border p-5 mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Star size={16} className="text-amber-500" /> My Bookmarks
        </h2>
        <button onClick={onClose} className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}>
          <XIcon size={14} />
        </button>
      </div>
      {bookmarkedSections.length === 0 ? (
        <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          No bookmarks yet. Click the bookmark icon on any section to save it here for quick access.
        </p>
      ) : (
        <div className="space-y-1">
          {bookmarkedSections.map(s => (
            <div key={s.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
              <a
                href={`#${s.id}`}
                onClick={(e) => { e.preventDefault(); onJump(s.id) }}
                className="flex-1 text-sm text-amber-600 hover:text-amber-700"
              >
                {s.title}
              </a>
              <button
                onClick={() => onRemove(s.id)}
                className={`p-1 rounded transition-colors ${darkMode ? 'text-slate-600 hover:text-red-400' : 'text-slate-300 hover:text-red-500'}`}
                title="Remove bookmark"
              >
                <XIcon size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main Component ── */

export default function AdminGuide({ onBack, darkMode, scrollToSection }: { onBack: (targetTab?: string) => void; darkMode: boolean; scrollToSection?: string | null }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('stowstack_admin_bookmarks')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  const [showBookmarks, setShowBookmarks] = useState(false)

  // Auto-scroll to a section when opened from a contextual help tooltip
  useEffect(() => {
    if (scrollToSection) {
      // Expand the section if collapsed
      setCollapsedSections(prev => {
        const next = new Set(prev)
        next.delete(scrollToSection)
        return next
      })
      // Scroll after a brief delay to let render complete
      setTimeout(() => {
        const el = document.getElementById(scrollToSection)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
    }
  }, [scrollToSection])

  useEffect(() => {
    localStorage.setItem('stowstack_admin_bookmarks', JSON.stringify([...bookmarks]))
  }, [bookmarks])

  const toggleBookmark = (id: string) => {
    setBookmarks(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const expandAll = () => setCollapsedSections(new Set())
  const collapseAll = () => setCollapsedSections(new Set(SECTIONS_DATA.map(s => s.id)))

  const allCollapsed = collapsedSections.size === SECTIONS_DATA.length

  // Filter sections by search query
  const q = searchQuery.toLowerCase().trim()
  const visibleSections = q
    ? SECTIONS_DATA.filter(s => s.title.toLowerCase().includes(q) || s.keywords.includes(q))
    : SECTIONS_DATA
  const visibleIds = new Set(visibleSections.map(s => s.id))

  // When searching, auto-expand matching sections
  const isCollapsed = (id: string) => {
    if (q && visibleIds.has(id)) return false
    return collapsedSections.has(id)
  }

  const tocItems = SECTIONS_DATA.map(s => ({ id: s.id, label: s.title }))

  const goToTab = (tab: string) => onBack(tab)

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`border-b sticky top-0 z-30 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center gap-3">
          <button onClick={() => onBack()} className={`p-2 -ml-2 transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
            <ArrowLeft size={20} />
          </button>
          <div className="w-7 h-7 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
            <Building2 size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight font-['Space_Grotesk']">
            Stow<span className="text-amber-600">Stack</span>
          </span>
          <span className={`text-xs ml-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>/ Admin Guide</span>

          {/* Search */}
          <div className="flex-1 flex justify-end items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
              darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
            }`}>
              <Search size={14} className={darkMode ? 'text-slate-400' : 'text-slate-400'} />
              <input
                type="text"
                placeholder="Search guide..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`bg-transparent focus:outline-none text-sm w-32 sm:w-48 ${
                  darkMode ? 'text-slate-200 placeholder:text-slate-500' : 'text-slate-700 placeholder:text-slate-400'
                }`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className={`${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                  <XIcon size={12} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowBookmarks(!showBookmarks)}
              className={`p-2 rounded-lg transition-colors relative ${
                darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title="Bookmarks"
            >
              <Star size={16} className={bookmarks.size > 0 ? 'text-amber-500' : ''} />
              {bookmarks.size > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {bookmarks.size}
                </span>
              )}
            </button>
            <button
              onClick={handlePrint}
              className={`p-2 rounded-lg transition-colors print:hidden ${
                darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title="Print guide"
            >
              <Printer size={16} />
            </button>
            <button
              onClick={allCollapsed ? expandAll : collapseAll}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                darkMode ? 'border-slate-600 text-slate-400 hover:text-slate-200' : 'border-slate-200 text-slate-500 hover:text-slate-700'
              }`}
            >
              {allCollapsed ? <Eye size={12} /> : <ChevronDown size={12} />}
              {allCollapsed ? 'Expand' : 'Collapse'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Admin Guide</h1>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Internal operations manual — pipeline workflow, client management, landing pages, integrations, and everything you need to run StowStack day-to-day.
          </p>
        </div>

        {/* Quick-Start Checklist */}
        <QuickStartChecklist darkMode={darkMode} />

        {/* Bookmarks Panel */}
        {showBookmarks && (
          <BookmarksPanel
            bookmarks={bookmarks}
            sections={SECTIONS_DATA}
            darkMode={darkMode}
            onJump={(id) => {
              setShowBookmarks(false)
              const el = document.getElementById(id)
              if (el) el.scrollIntoView({ behavior: 'smooth' })
              // Make sure it's expanded
              setCollapsedSections(prev => {
                const next = new Set(prev)
                next.delete(id)
                return next
              })
            }}
            onRemove={(id) => toggleBookmark(id)}
            onClose={() => setShowBookmarks(false)}
          />
        )}

        {/* Table of Contents */}
        {!q && (
          <nav className={`rounded-xl border p-5 mb-8 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 flex items-center gap-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <BookOpen size={14} /> Contents
            </h2>
            <div className="grid sm:grid-cols-2 gap-1">
              {tocItems.map(item => (
                <a key={item.id} href={`#${item.id}`}
                  className="text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg px-3 py-1.5 transition-colors">
                  {item.label}
                </a>
              ))}
            </div>
          </nav>
        )}

        {/* Search results indicator */}
        {q && (
          <div className={`flex items-center gap-2 mb-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <Search size={14} />
            {visibleSections.length} {visibleSections.length === 1 ? 'section' : 'sections'} matching "{searchQuery}"
            <button onClick={() => setSearchQuery('')} className="text-amber-600 hover:text-amber-700 ml-1">Clear</button>
          </div>
        )}

        <div className="space-y-6">

          {/* Overview */}
          {visibleIds.has('overview') && (
            <Section id="overview" icon={Building2} title="Overview" collapsed={isCollapsed('overview')} onToggle={() => toggleSection('overview')} darkMode={darkMode} bookmarked={bookmarks.has('overview')} onToggleBookmark={() => toggleBookmark('overview')}>
              <p className="text-sm leading-relaxed">
                The StowStack Admin Dashboard is your operations hub for managing every client and lead in the system. From here you manage the full lifecycle: lead intake, onboarding, campaign data entry, landing page creation, billing, and portfolio-level performance analytics.
              </p>
              <p className="text-sm leading-relaxed">
                The dashboard is organized into tabs — Pipeline, Kanban, Portfolio, Insights, Billing, Settings, and Facilities — each covering a specific part of daily operations.
              </p>
              <MediaSlot caption="Admin dashboard overview — Pipeline tab with lead cards and stats" darkMode={darkMode} />
              <InfoBox>
                Access the admin dashboard at <Kbd>/admin</Kbd>. Authentication uses a header key stored in your browser. If your session expires, you will be prompted to re-enter the admin key.
              </InfoBox>
            </Section>
          )}

          {/* Pipeline Management */}
          {visibleIds.has('pipeline') && (
            <Section id="pipeline" icon={Users} title="Pipeline Management" collapsed={isCollapsed('pipeline')} onToggle={() => toggleSection('pipeline')} darkMode={darkMode} bookmarked={bookmarks.has('pipeline')} onToggleBookmark={() => toggleBookmark('pipeline')}>
              <p className="text-sm leading-relaxed">
                The Pipeline tab is your primary workspace. Every lead that submits the audit intake form appears here and moves through a defined status workflow.
              </p>

              <WalkthroughTip location="Pipeline tab → click any lead card to expand" onNavigate={() => goToTab('pipeline')} darkMode={darkMode} />

              <SubSection title="Lead Status Workflow">
                <div className="space-y-2 mt-1">
                  {STATUS_FLOW.map((s, i) => (
                    <div key={s.status} className={`flex items-start gap-3 rounded-lg px-4 py-3 border ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                      <div>
                        <p className="text-sm font-semibold">{s.status}</p>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SubSection>

              <SubSection title="Working with Leads">
                <Step n={1}>Click any lead card to expand it and see full details, notes, and actions.</Step>
                <Step n={2}>Use the status dropdown to advance a lead to the next stage.</Step>
                <Step n={3}>Add internal notes with timestamps — these are only visible to admins.</Step>
                <Step n={4}>Set follow-up dates. Overdue leads automatically sort to the top and show a warning badge.</Step>
              </SubSection>

              <SubSection title="Bulk Actions">
                <Step n={1}>Use the checkbox on each lead card to select multiple leads.</Step>
                <Step n={2}>The bulk action bar appears at the top — choose a target status and apply to all selected leads at once.</Step>
              </SubSection>

              <SubSection title="Search & Filter">
                <p className="text-sm leading-relaxed">
                  Use the search bar to find leads by name, facility name, location, or email. Use the pipeline stage chips to filter by status. The "Overdue" chip shows only leads with past-due follow-up dates.
                </p>
              </SubSection>

              <MediaSlot caption="Pipeline view — expanded lead card with notes and status controls" darkMode={darkMode} />

              <InfoBox>
                Press <Kbd>⌘K</Kbd> to open the command palette for quick lead search and navigation across all tabs.
              </InfoBox>
            </Section>
          )}

          {/* Kanban Board */}
          {visibleIds.has('kanban') && (
            <Section id="kanban" icon={Columns3} title="Kanban Board" collapsed={isCollapsed('kanban')} onToggle={() => toggleSection('kanban')} darkMode={darkMode} bookmarked={bookmarks.has('kanban')} onToggleBookmark={() => toggleBookmark('kanban')}>
              <p className="text-sm leading-relaxed">
                The Kanban tab provides a visual board view of your pipeline, with columns for each lead status. This is useful for getting an at-a-glance view of where all leads stand.
              </p>

              <WalkthroughTip location="Kanban tab → drag cards between columns to update status" onNavigate={() => goToTab('kanban')} darkMode={darkMode} />

              <Step n={1}>Each column represents a pipeline status (Submitted, Form Sent, Form Done, etc.).</Step>
              <Step n={2}>Drag and drop lead cards between columns to update their status instantly.</Step>
              <Step n={3}>Click any card to expand it and view/edit details, same as in the Pipeline tab.</Step>

              <MediaSlot caption="Kanban board — drag-and-drop lead cards between status columns" darkMode={darkMode} />

              <InfoBox>
                The Kanban view is best for weekly pipeline reviews — scan left to right to see how leads are progressing through the funnel.
              </InfoBox>
            </Section>
          )}

          {/* Client Onboarding */}
          {visibleIds.has('onboarding') && (
            <Section id="onboarding" icon={ClipboardList} title="Client Onboarding" collapsed={isCollapsed('onboarding')} onToggle={() => toggleSection('onboarding')} darkMode={darkMode} bookmarked={bookmarks.has('onboarding')} onToggleBookmark={() => toggleBookmark('onboarding')}>
              <p className="text-sm leading-relaxed">
                When a new lead submits the audit intake form, follow this workflow to move them from prospect to signed client.
              </p>

              <SubSection title="Full Onboarding Workflow">
                <Step n={1}><strong>Lead arrives</strong> — Review their submission in Pipeline. Check facility name, location, occupancy, and biggest issue.</Step>
                <Step n={2}><strong>Generate access code</strong> — Create or copy the client access code from the lead card. This code lets the client log into the portal.</Step>
                <Step n={3}><strong>Send onboarding form</strong> — Email the client their portal link (<Kbd>stowstack.co/portal</Kbd>) and access code. Move status to "Form Sent".</Step>
                <Step n={4}><strong>Client completes wizard</strong> — They fill out the 5-step onboarding wizard (facility details, demographics, unit mix, competitors, ad preferences). Status auto-updates to "Form Done".</Step>
                <Step n={5}><strong>Generate audit</strong> — Use the onboarding data to build the facility audit / campaign proposal. Move status to "Audit Ready".</Step>
                <Step n={6}><strong>Schedule call</strong> — Set a follow-up date and book a discovery or close call. Move to "Call Set".</Step>
                <Step n={7}><strong>Close and activate</strong> — When the client signs on, move to "Signed". Set up their facility in the Facilities tab and begin entering campaign data.</Step>
              </SubSection>

              <InfoBox>
                Always add a note when changing status — this creates an audit trail and helps the team understand where each lead stands.
              </InfoBox>
            </Section>
          )}

          {/* Facilities Management */}
          {visibleIds.has('facilities') && (
            <Section id="facilities" icon={Building2} title="Facilities Management" collapsed={isCollapsed('facilities')} onToggle={() => toggleSection('facilities')} darkMode={darkMode} bookmarked={bookmarks.has('facilities')} onToggleBookmark={() => toggleBookmark('facilities')}>
              <p className="text-sm leading-relaxed">
                The Facilities tab is where you manage each signed client's facility data. Every facility has its own campaign performance data, landing pages, and configuration.
              </p>

              <WalkthroughTip location="Facilities tab → click a facility row to open its detail view" onNavigate={() => goToTab('facilities')} darkMode={darkMode} />

              <SubSection title="Setting Up a New Facility">
                <Step n={1}>Navigate to the Facilities tab and click "Add Facility".</Step>
                <Step n={2}>Enter the facility name, location, contact information, and any notes.</Step>
                <Step n={3}>Link the facility to the signed lead so their onboarding data carries over.</Step>
              </SubSection>

              <SubSection title="Entering Campaign Data">
                <Step n={1}>Open a facility and navigate to its campaign performance section.</Step>
                <Step n={2}>Add monthly data: ad spend, leads, move-ins, and revenue generated.</Step>
                <Step n={3}>The system automatically calculates CPL, ROAS, and conversion rates from the raw numbers.</Step>
                <Step n={4}>This data populates the client's portal dashboard, charts, and performance digest.</Step>
              </SubSection>

              <MediaSlot caption="Facility detail view — campaign data table and performance charts" darkMode={darkMode} />

              <SubSection title="Landing Pages per Facility">
                <p className="text-sm leading-relaxed">
                  Each facility can have multiple ad-specific landing pages. See the Landing Pages section below for details on creating and managing these.
                </p>
              </SubSection>
            </Section>
          )}

          {/* Landing Pages */}
          {visibleIds.has('landing-pages') && (
            <Section id="landing-pages" icon={Layers} title="Landing Pages" collapsed={isCollapsed('landing-pages')} onToggle={() => toggleSection('landing-pages')} darkMode={darkMode} bookmarked={bookmarks.has('landing-pages')} onToggleBookmark={() => toggleBookmark('landing-pages')}>
              <p className="text-sm leading-relaxed">
                Every ad campaign should have its own landing page with offer-specific messaging, tracking, and an embedded rental flow. Landing pages are managed per-facility from the Facilities tab.
              </p>

              <WalkthroughTip location="Facilities tab → open a facility → Landing Pages section → Create Page" onNavigate={() => goToTab('facilities')} darkMode={darkMode} />

              <SubSection title="Creating a Landing Page">
                <Step n={1}>Open a facility, then navigate to its Landing Pages section.</Step>
                <Step n={2}>Click "Create Page" to start a new page with a unique slug (this becomes the URL path at <Kbd>/lp/your-slug</Kbd>).</Step>
                <Step n={3}>Add sections using the section builder: Hero, Trust Bar, Features, Unit Types, Gallery, Testimonials, FAQ, CTA, and Location Map.</Step>
                <Step n={4}>Configure each section — headlines, copy, images, unit data, and styling.</Step>
                <Step n={5}>Use the preview mode to see the page on desktop and mobile before publishing.</Step>
              </SubSection>

              <SubSection title="Section Types">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                  {[
                    { label: 'Hero', desc: 'Main headline, CTA, and background' },
                    { label: 'Trust Bar', desc: 'Short proof points / badges' },
                    { label: 'Features', desc: 'Facility selling points' },
                    { label: 'Unit Types', desc: 'Available units with pricing' },
                    { label: 'Gallery', desc: 'Facility photos' },
                    { label: 'Testimonials', desc: 'Customer reviews' },
                    { label: 'FAQ', desc: 'Common questions' },
                    { label: 'CTA', desc: 'Call-to-action with phone/form' },
                    { label: 'Location Map', desc: 'Address and directions' },
                  ].map(s => (
                    <div key={s.label} className={`rounded-lg p-3 border ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-100'}`}>
                      <p className="text-xs font-semibold">{s.label}</p>
                      <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{s.desc}</p>
                    </div>
                  ))}
                </div>
              </SubSection>

              <MediaSlot caption="Landing page builder — section editor with live preview" darkMode={darkMode} />

              <SubSection title="Publishing & Variations">
                <p className="text-sm leading-relaxed">
                  Pages start in draft status. Once ready, publish the page to make it live. You can create multiple variations of a page for A/B testing — each variation gets its own slug and can have different headlines, offers, or layouts.
                </p>
              </SubSection>

              <InfoBox>
                Each landing page embeds the storEDGE rental widget so customers can reserve a unit without ever leaving the page. Configure the storEDGE widget ID in the page theme settings.
              </InfoBox>
            </Section>
          )}

          {/* Portfolio & Insights */}
          {visibleIds.has('portfolio') && (
            <Section id="portfolio" icon={BarChart3} title="Portfolio & Insights" collapsed={isCollapsed('portfolio')} onToggle={() => toggleSection('portfolio')} darkMode={darkMode} bookmarked={bookmarks.has('portfolio')} onToggleBookmark={() => toggleBookmark('portfolio')}>
              <SubSection title="Portfolio View">
                <p className="text-sm leading-relaxed">
                  The Portfolio tab shows a cross-client view of all signed facilities. Each client card shows their campaign performance — total spend, leads, move-ins, CPL, and ROAS. Use this to spot which clients need attention and which are performing well.
                </p>
              </SubSection>

              <SubSection title="Insights View">
                <p className="text-sm leading-relaxed">
                  The Insights tab provides aggregate analytics across your entire book of business: total ad spend, total leads, average CPL, average ROAS, and trend charts. Use this for business-level reporting and identifying patterns.
                </p>
              </SubSection>

              <InfoBox>
                Portfolio data is derived from the campaign data you enter per-facility. Keep monthly numbers up to date for accurate portfolio-level reporting.
              </InfoBox>
            </Section>
          )}

          {/* Billing */}
          {visibleIds.has('billing') && (
            <Section id="billing" icon={CreditCard} title="Billing" collapsed={isCollapsed('billing')} onToggle={() => toggleSection('billing')} darkMode={darkMode} bookmarked={bookmarks.has('billing')} onToggleBookmark={() => toggleBookmark('billing')}>
              <p className="text-sm leading-relaxed">
                The Billing tab tracks client billing information, invoices, and payment status. Use it to manage the financial side of each client relationship.
              </p>

              <WalkthroughTip location="Billing tab" onNavigate={() => goToTab('billing')} darkMode={darkMode} />

              <Step n={1}>Each signed client has a billing card showing their plan, monthly fee, and payment history.</Step>
              <Step n={2}>Track which invoices have been sent, paid, or are overdue.</Step>
              <Step n={3}>Ad spend is tracked separately from management fees — both roll up into total client cost.</Step>
            </Section>
          )}

          {/* Settings */}
          {visibleIds.has('settings') && (
            <Section id="settings" icon={Settings} title="Settings & Configuration" collapsed={isCollapsed('settings')} onToggle={() => toggleSection('settings')} darkMode={darkMode} bookmarked={bookmarks.has('settings')} onToggleBookmark={() => toggleBookmark('settings')}>
              <p className="text-sm leading-relaxed">
                The Settings tab controls system-wide configuration for the admin dashboard.
              </p>

              <WalkthroughTip location="Settings tab" onNavigate={() => goToTab('settings')} darkMode={darkMode} />

              <SubSection title="Company Information">
                <p className="text-sm leading-relaxed">
                  Set your company name, email, phone, and email signature. These are used in outbound communications and portal branding.
                </p>
              </SubSection>

              <SubSection title="Notification Preferences">
                <p className="text-sm leading-relaxed">
                  Toggle notifications for: new lead submissions, overdue follow-ups, client messages, and campaign alerts (CPL spikes, ROAS drops). Notifications appear via the bell icon in the header.
                </p>
              </SubSection>

              <SubSection title="Defaults">
                <Step n={1}><strong>Default follow-up days</strong> — How many days after submission to set the initial follow-up date. Default is 3 days.</Step>
                <Step n={2}><strong>Dark mode</strong> — Toggle between light and dark themes. Also available via the moon/sun icon in the header or <Kbd>⌘K</Kbd> command palette.</Step>
              </SubSection>
            </Section>
          )}

          {/* Meta & Google Integration */}
          {visibleIds.has('integrations') && (
            <Section id="integrations" icon={Megaphone} title="Meta & Google Integration" collapsed={isCollapsed('integrations')} onToggle={() => toggleSection('integrations')} darkMode={darkMode} bookmarked={bookmarks.has('integrations')} onToggleBookmark={() => toggleBookmark('integrations')}>
              <p className="text-sm leading-relaxed">
                StowStack connects to Meta (Facebook/Instagram) and Google Ads for campaign management and ad publishing.
              </p>

              <SubSection title="Environment Variables">
                <p className="text-sm leading-relaxed">
                  The following environment variables must be configured in Vercel for integrations to work:
                </p>
                <div className="space-y-1 mt-2">
                  {[
                    { key: 'META_APP_ID', desc: 'Facebook App ID from Meta for Developers' },
                    { key: 'META_APP_SECRET', desc: 'Facebook App Secret' },
                    { key: 'META_ACCESS_TOKEN', desc: 'Long-lived access token for the Meta API' },
                    { key: 'GOOGLE_ADS_CLIENT_ID', desc: 'Google Ads API client ID' },
                    { key: 'GOOGLE_ADS_CLIENT_SECRET', desc: 'Google Ads API client secret' },
                  ].map(v => (
                    <div key={v.key} className={`flex items-start gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                      <Kbd>{v.key}</Kbd>
                      <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{v.desc}</span>
                    </div>
                  ))}
                </div>
              </SubSection>

              <SubSection title="Connecting Accounts">
                <Step n={1}>Navigate to the Publish tab within a facility's ad management area.</Step>
                <Step n={2}>Click "Connect Facebook Account" or "Connect Google Account" to authorize access.</Step>
                <Step n={3}>Once connected, you can publish ad creative directly from the admin dashboard.</Step>
              </SubSection>

              <MediaSlot caption="Meta account connection flow — OAuth authorization screen" type="video" darkMode={darkMode} />

              <InfoBox>
                Environment variables are set in Vercel under your project's Settings &rarr; Environment Variables. Changes take effect on the next deployment.
              </InfoBox>
            </Section>
          )}

          {/* Keyboard Shortcuts */}
          {visibleIds.has('shortcuts') && (
            <Section id="shortcuts" icon={Keyboard} title="Keyboard Shortcuts" collapsed={isCollapsed('shortcuts')} onToggle={() => toggleSection('shortcuts')} darkMode={darkMode} bookmarked={bookmarks.has('shortcuts')} onToggleBookmark={() => toggleBookmark('shortcuts')}>
              <p className="text-sm leading-relaxed">
                The admin dashboard supports keyboard shortcuts for fast navigation. These only work when you are not focused on a text input.
              </p>
              <div className="mt-2">
                <div className={`rounded-lg border overflow-hidden ${darkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                        <th className="text-left px-4 py-2 text-xs font-semibold">Shortcut</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['⌘K', 'Open command palette'],
                        ['1', 'Pipeline tab'],
                        ['2', 'Kanban tab'],
                        ['3', 'Portfolio tab'],
                        ['4', 'Insights tab'],
                        ['5', 'Billing tab'],
                        ['6', 'Settings tab'],
                        ['H', 'Open admin guide'],
                        ['?', 'Show keyboard shortcuts'],
                        ['N', 'Toggle notifications'],
                        ['R', 'Refresh lead data'],
                        ['Escape', 'Close modals / command palette'],
                      ].map(([key, desc]) => (
                        <tr key={key} className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                          <td className="px-4 py-2"><Kbd>{key}</Kbd></td>
                          <td className={`px-4 py-2 text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>
          )}

          {/* Assets & Creative */}
          {visibleIds.has('assets') && (
            <Section id="assets" icon={Image} title="Assets & Creative" collapsed={isCollapsed('assets')} onToggle={() => toggleSection('assets')} darkMode={darkMode} bookmarked={bookmarks.has('assets')} onToggleBookmark={() => toggleBookmark('assets')}>
              <p className="text-sm leading-relaxed">
                StowStack includes tools for managing ad creative and facility imagery used across landing pages and campaigns.
              </p>

              <SubSection title="Asset Sources">
                <Step n={1}><strong>Drag-and-drop upload</strong> — Upload facility photos, logos, and ad creative directly from your computer.</Step>
                <Step n={2}><strong>Website scraper</strong> — Pull images from a facility's existing website by entering the URL. The scraper extracts all usable images automatically.</Step>
                <Step n={3}><strong>Stock library</strong> — Browse storage-specific stock photos categorized by unit type (climate controlled, drive-up, vehicle, etc.).</Step>
              </SubSection>

              <SubSection title="Using Assets">
                <p className="text-sm leading-relaxed">
                  Assets are available when building landing page sections (Gallery, Hero backgrounds) and when creating ad creative in the Ad Preview system. Uploaded assets are stored and reusable across pages and campaigns for the same facility.
                </p>
              </SubSection>

              <InfoBox>
                Use high-quality, real facility photos whenever possible. Stock images are good for filling gaps but real photos convert better.
              </InfoBox>
            </Section>
          )}

          {/* What's New / Changelog */}
          {!q && (
            <section id="changelog" className="scroll-mt-20">
              <div className={`rounded-xl border p-5 sm:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Sparkles size={20} className="text-amber-600" /> What's New
                </h2>
                <div className="space-y-5">
                  {CHANGELOG.map(release => (
                    <div key={release.version}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold">v{release.version}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                          {release.date}
                        </span>
                      </div>
                      <div className="space-y-1.5 pl-1">
                        {release.items.map((item, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${
                              item.type === 'new'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                              {item.type === 'new' ? 'New' : 'Improved'}
                            </span>
                            <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{item.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* No results */}
          {q && visibleSections.length === 0 && (
            <div className={`text-center py-12 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <Search size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">No sections match "{searchQuery}"</p>
              <button onClick={() => setSearchQuery('')} className="text-amber-600 hover:text-amber-700 text-sm mt-2">Clear search</button>
            </div>
          )}

        </div>

        <div className="mt-12 mb-8 text-center">
          <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Internal operations guide — not client-facing. Last updated March 2026.
          </p>
        </div>
      </div>
    </div>
  )
}
