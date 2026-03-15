import { useState, useEffect, useCallback } from 'react'
import {
  Building2, RefreshCw, Search, ArrowLeft,
  Users, TrendingUp, Clock, CheckCircle2, XCircle, Loader2,
  Download, CalendarClock, CheckSquare,
  Settings, Columns3, CreditCard, Moon, Sun,
  Bell, Sparkles, BookOpen, BarChart3
} from 'lucide-react'

import { Lead, STATUSES, AdminTab, STORAGE_KEY } from './dashboard/types'
import AdminLogin from './dashboard/AdminLogin'
import { StatCard, PipelineChip } from './dashboard/StatCard'
import HelpTooltip from './dashboard/HelpTooltip'
import CommandPalette from './dashboard/CommandPalette'
import ShortcutsModal from './dashboard/ShortcutsModal'
import NotificationPanel from './dashboard/NotificationPanel'
import LeadCard from './dashboard/LeadCard'
import KanbanView from './dashboard/KanbanView'
import BillingView from './dashboard/BillingView'
import SettingsView from './dashboard/SettingsView'
import FacilitiesView from './dashboard/FacilitiesView'
import PortfolioView from './dashboard/PortfolioView'
import InsightsView from './dashboard/InsightsView'
import SequencesView from './dashboard/SequencesView'
import AdminGuide from './AdminGuide'
import WhatsNew from './WhatsNew'

/* ── Admin Auth Gate ── */

export default function AdminDashboard({ onBack }: { onBack: () => void }) {
  const [adminKey, setAdminKey] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))

  if (!adminKey) {
    return <AdminLogin onAuth={setAdminKey} />
  }

  return <AdminDashboardInner adminKey={adminKey} onBack={onBack} onLogout={() => { localStorage.removeItem(STORAGE_KEY); setAdminKey(null) }} />
}

/* ── Admin Dashboard Inner ── */

function AdminDashboardInner({ adminKey, onBack, onLogout }: { adminKey: string; onBack: () => void; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('pipeline')
  const [leads, setLeads] = useState<Lead[]>([])
  const [auditCount, setAuditCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [newNote, setNewNote] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [leadScores, setLeadScores] = useState<Record<string, { score: number; grade: string; breakdown: Record<string, number> }>>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [bulkStatus, setBulkStatus] = useState('')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('stowstack_theme') === 'dark')
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<{ id: string; type: string; title: string; detail: string; timestamp: string }[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [guideScrollTarget, setGuideScrollTarget] = useState<string | null>(null)

  const openGuideToSection = useCallback((section: string) => {
    setGuideScrollTarget(section)
    setShowGuide(true)
  }, [])

  const fetchLeads = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/admin-leads', {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (res.status === 401) { onLogout(); return }
      if (!res.ok) throw new Error(`Failed to fetch leads (${res.status})`)
      const data = await res.json()
      setLeads(data.leads || [])
      setAuditCount(data.auditCount || 0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [adminKey, onLogout])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  // Fetch lead scores
  useEffect(() => {
    if (leads.length === 0) return
    const fetchScores = async () => {
      try {
        const res = await fetch('/api/lead-score', { headers: { 'X-Admin-Key': adminKey } })
        if (res.ok) {
          const data = await res.json()
          setLeadScores(data.scores || {})
        }
      } catch { /* silent */ }
    }
    fetchScores()
  }, [leads, adminKey])

  // Fetch notifications
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch('/api/notifications', { headers: { 'X-Admin-Key': adminKey } })
        if (res.ok) {
          const data = await res.json()
          setNotifications(data.notifications || [])
          setUnreadCount(data.unreadCount || 0)
        }
      } catch { /* silent */ }
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 60000)
    return () => clearInterval(interval)
  }, [adminKey])

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('stowstack_theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(prev => !prev)
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false)
        setShowNotifications(false)
        setShowShortcuts(false)
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
      if (e.key === '1') setActiveTab('pipeline')
      if (e.key === '2') setActiveTab('kanban')
      if (e.key === '3') setActiveTab('portfolio')
      if (e.key === '4') setActiveTab('insights')
      if (e.key === '5') setActiveTab('billing')
      if (e.key === '6') setActiveTab('settings')
      if (e.key === '7') setActiveTab('facilities')
      if (e.key === '8') setActiveTab('sequences')
      if (e.key === '9') setActiveTab('whats-new')
      if (e.key === 'r') { setLoading(true); fetchLeads() }
      if (e.key === 'n') setShowNotifications(prev => !prev)
      if (e.key === '?') setShowShortcuts(prev => !prev)
      if (e.key === 'h') setShowGuide(prev => !prev)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fetchLeads])

  const markNotificationsRead = async () => {
    try {
      await fetch('/api/notifications?markSeen=true', { headers: { 'X-Admin-Key': adminKey } })
      setUnreadCount(0)
    } catch { /* silent */ }
  }

  const updateLead = async (id: string, updates: { status?: string; note?: string; followUpDate?: string }) => {
    setUpdating(id)
    try {
      const res = await fetch('/api/admin-leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey,
        },
        body: JSON.stringify({ id, ...updates }),
      })
      if (!res.ok) throw new Error('Update failed')
      await fetchLeads()
      if (updates.note) setNewNote('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUpdating(null)
    }
  }

  const bulkApply = async () => {
    if (!bulkStatus || selectedIds.size === 0) return
    setBulkUpdating(true)
    for (const id of selectedIds) {
      try {
        await fetch('/api/admin-leads', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
          body: JSON.stringify({ id, status: bulkStatus }),
        })
      } catch { /* continue */ }
    }
    setSelectedIds(new Set())
    setBulkStatus('')
    setBulkUpdating(false)
    fetchLeads()
  }

  const downloadCsv = async () => {
    try {
      const res = await fetch('/api/export-leads', { headers: { 'X-Admin-Key': adminKey } })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stowstack-leads-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* silent */ }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  /* ── Filtered leads ── */
  const now = new Date()
  const isOverdue = (l: Lead) => l.followUpDate && new Date(l.followUpDate) < now && !['lost', 'client_signed'].includes(l.status)
  const overdueCount = leads.filter(isOverdue).length

  const filtered = leads
    .filter(l => {
      if (filterStatus === 'overdue') return isOverdue(l)
      if (filterStatus !== 'all' && l.status !== filterStatus) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          l.name.toLowerCase().includes(q) ||
          l.facilityName.toLowerCase().includes(q) ||
          l.location.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) => {
      const aOverdue = isOverdue(a) ? 0 : 1
      const bOverdue = isOverdue(b) ? 0 : 1
      if (aOverdue !== bOverdue) return aOverdue - bOverdue
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  /* ── Pipeline counts ── */
  const statusCounts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1
    return acc
  }, {})

  const activeLeads = leads.filter(l => !['lost', 'client_signed'].includes(l.status)).length

  if (showGuide) {
    return <AdminGuide onBack={(targetTab?: string) => {
      setShowGuide(false)
      setGuideScrollTarget(null)
      if (targetTab && ['pipeline','kanban','portfolio','insights','billing','settings','facilities'].includes(targetTab)) {
        setActiveTab(targetTab as AdminTab)
      }
    }} darkMode={darkMode} scrollToSection={guideScrollTarget} />
  }

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-30 border-b ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className={`p-2 -ml-2 transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
              <ArrowLeft size={20} />
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">StowStack Admin</h1>
              <p className={`text-xs -mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Manage leads & campaign performance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCommandPalette(true)}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                darkMode ? 'border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500' : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300'
              }`}
              title="Search (Cmd+K)"
            >
              <Search size={12} />
              <span>Search...</span>
              <kbd className={`text-[10px] px-1 rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>⌘K</kbd>
            </button>
            <div className="relative">
              <button
                onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markNotificationsRead() }}
                className={`p-2 rounded-lg transition-colors relative ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                title="Notifications (N)"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <NotificationPanel
                  notifications={notifications}
                  darkMode={darkMode}
                  onClose={() => setShowNotifications(false)}
                />
              )}
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-amber-400 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setShowGuide(true)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
              title="Admin Guide (H)"
            >
              <BookOpen size={18} />
            </button>
            <button onClick={downloadCsv} className={`flex items-center gap-1.5 text-sm transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`} title="Export leads as CSV">
              <Download size={14} />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button onClick={() => { setLoading(true); fetchLeads() }} className={`flex items-center gap-2 text-sm transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={onLogout} className={`text-sm transition-colors ${darkMode ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}>
              Sign out
            </button>
          </div>
        </div>
        {/* Tab bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 -mb-px overflow-x-auto">
          {([
            ['pipeline', 'Pipeline', Users],
            ['kanban', 'Kanban', Columns3],
            ['portfolio', 'Portfolio', BarChart3],
            ['insights', 'Insights', TrendingUp],
            ['billing', 'Billing', CreditCard],
            ['settings', 'Settings', Settings],
            ['facilities', 'Facilities', Building2],
            ['sequences', 'Sequences', CalendarClock],
            ['whats-new', "What's New", Sparkles],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === id
                  ? `border-emerald-600 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`
                  : `border-transparent ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:border-slate-600' : 'text-slate-500 hover:text-slate-700 hover:border-slate-300'}`
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Command Palette */}
      {showCommandPalette && (
        <CommandPalette
          query={commandQuery}
          onQueryChange={setCommandQuery}
          leads={leads}
          darkMode={darkMode}
          onClose={() => { setShowCommandPalette(false); setCommandQuery('') }}
          onSelectLead={(id) => { setExpandedId(id); setActiveTab('pipeline'); setShowCommandPalette(false); setCommandQuery('') }}
          onAction={(action) => {
            if (action === 'pipeline') setActiveTab('pipeline')
            if (action === 'kanban') setActiveTab('kanban')
            if (action === 'portfolio') setActiveTab('portfolio')
            if (action === 'insights') setActiveTab('insights')
            if (action === 'billing') setActiveTab('billing')
            if (action === 'settings') setActiveTab('settings')
            if (action === 'sequences') setActiveTab('sequences')
            if (action === 'dark') setDarkMode(!darkMode)
            if (action === 'guide') setShowGuide(true)
            if (action === 'csv') downloadCsv()
            if (action === 'refresh') { setLoading(true); fetchLeads() }
            setShowCommandPalette(false)
            setCommandQuery('')
          }}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <ShortcutsModal darkMode={darkMode} onClose={() => setShowShortcuts(false)} />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'portfolio' && (<>
          <div className="flex items-center gap-2 mb-4">
            <HelpTooltip text="View client campaign data, monthly performance metrics, and manage your client portfolio." guideSection="portfolio" onOpenGuide={openGuideToSection} darkMode={darkMode} />
          </div>
          <PortfolioView leads={leads} adminKey={adminKey} loading={loading} darkMode={darkMode} />
        </>)}

        {activeTab === 'insights' && (<>
          <div className="flex items-center gap-2 mb-4">
            <HelpTooltip text="Analytics and reporting on campaign performance across all clients. Spot trends and optimize." guideSection="overview" onOpenGuide={openGuideToSection} darkMode={darkMode} />
          </div>
          <InsightsView adminKey={adminKey} leads={leads} darkMode={darkMode} />
        </>)}

        {activeTab === 'kanban' && (<>
          <div className="flex items-center gap-2 mb-4">
            <HelpTooltip text="Drag-and-drop leads between status columns. Each column represents a pipeline stage." guideSection="kanban" onOpenGuide={openGuideToSection} darkMode={darkMode} />
          </div>
          <KanbanView leads={leads} onUpdateStatus={(id, status) => updateLead(id, { status })} onSelectLead={setExpandedId} darkMode={darkMode} loading={loading} />
        </>)}

        {activeTab === 'billing' && (<>
          <div className="flex items-center gap-2 mb-4">
            <HelpTooltip text="Manage client billing, invoices, and payment tracking. Set up recurring charges." guideSection="billing" onOpenGuide={openGuideToSection} darkMode={darkMode} />
          </div>
          <BillingView adminKey={adminKey} leads={leads} darkMode={darkMode} />
        </>)}

        {activeTab === 'settings' && (<>
          <div className="flex items-center gap-2 mb-4">
            <HelpTooltip text="Configure admin credentials, notification preferences, and platform integrations." guideSection="settings" onOpenGuide={openGuideToSection} darkMode={darkMode} />
          </div>
          <SettingsView adminKey={adminKey} darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} />
        </>)}

        {activeTab === 'facilities' && (<>
          <div className="flex items-center gap-2 mb-4">
            <HelpTooltip text="Manage client facilities, unit mix, landing pages, and facility-specific campaign data." guideSection="facilities" onOpenGuide={openGuideToSection} darkMode={darkMode} />
          </div>
          <FacilitiesView adminKey={adminKey} darkMode={darkMode} />
        </>)}

        {activeTab === 'sequences' && (
          <SequencesView adminKey={adminKey} darkMode={darkMode} />
        )}

        {activeTab === 'whats-new' && (
          <WhatsNew darkMode={darkMode} adminKey={adminKey} />
        )}

        {activeTab === 'pipeline' && (<>
        {/* Stats Cards */}
        <div className="flex items-center gap-2 mb-3">
          <h2 className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Pipeline Overview</h2>
          <HelpTooltip text="Track total leads, active pipeline, signed clients, and audit counts. Learn about each metric in the admin guide." guideSection="pipeline" onOpenGuide={openGuideToSection} darkMode={darkMode} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Users} label="Total Leads" value={leads.length} />
          <StatCard icon={TrendingUp} label="Active Pipeline" value={activeLeads} />
          <StatCard icon={CheckCircle2} label="Signed Clients" value={statusCounts['client_signed'] || 0} accent />
          <StatCard icon={Clock} label="Audits Generated" value={auditCount} />
        </div>

        {/* Pipeline Stages */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <PipelineChip
              label="All"
              count={leads.length}
              active={filterStatus === 'all'}
              onClick={() => setFilterStatus('all')}
            />
            {STATUSES.map(s => (
              <PipelineChip
                key={s.value}
                label={s.label}
                count={statusCounts[s.value] || 0}
                active={filterStatus === s.value}
                onClick={() => setFilterStatus(s.value)}
                colorClass={s.color}
              />
            ))}
            {overdueCount > 0 && (
              <PipelineChip
                label="Overdue"
                count={overdueCount}
                active={filterStatus === 'overdue'}
                onClick={() => setFilterStatus('overdue')}
                colorClass="bg-red-100 text-red-700"
              />
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, facility, location, or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-4 flex items-center gap-2">
            <XCircle size={16} />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <XCircle size={14} />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            Loading leads...
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <Users size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No leads yet</p>
            <p className="text-sm mt-1">Leads from the audit form will appear here</p>
          </div>
        )}

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-slate-900 text-white rounded-xl px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
            <CheckSquare size={16} />
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
            >
              <option value="">Move to...</option>
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <button
              onClick={bulkApply}
              disabled={!bulkStatus || bulkUpdating}
              className="text-xs px-3 py-1.5 bg-emerald-600 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {bulkUpdating ? 'Applying...' : 'Apply'}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-400 hover:text-white ml-auto"
            >
              Clear
            </button>
          </div>
        )}

        {/* Lead Cards */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                expanded={expandedId === lead.id}
                onToggle={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                onUpdateStatus={(status) => updateLead(lead.id, { status })}
                onAddNote={(note) => updateLead(lead.id, { note })}
                onSetFollowUp={(date) => updateLead(lead.id, { followUpDate: date })}
                newNote={expandedId === lead.id ? newNote : ''}
                onNewNoteChange={setNewNote}
                updating={updating === lead.id}
                adminKey={adminKey}
                score={leadScores[lead.id]}
                selected={selectedIds.has(lead.id)}
                onSelect={() => toggleSelect(lead.id)}
                isOverdue={!!isOverdue(lead)}
              />
            ))}
          </div>
        )}
        </>)}
      </div>
    </div>
  )
}
