import { useState, useEffect, useCallback } from 'react'
import {
  Building2, RefreshCw, Search,
  Users, TrendingUp, Clock, CheckCircle2, XCircle, Loader2,
  Download, CheckSquare, Moon, Sun,
  Bell, BookOpen, Menu
} from 'lucide-react'

import { Lead, STATUSES, STATUS_MAP, AdminTab, STORAGE_KEY } from './dashboard/types'
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
import SharedAuditsView from './dashboard/SharedAuditsView'
import RecoveryView from './dashboard/RecoveryView'
import PartnersView from './dashboard/PartnersView'
import PortfolioOptimizerView from './dashboard/PortfolioOptimizerView'
import OnboardingChecklistView from './dashboard/OnboardingChecklistView'
import AdminGuide from './AdminGuide'
import WhatsNew from './WhatsNew'
import SeasonalPlaybookTab from './dashboard/SeasonalPlaybookTab'
import ReferralsView from './dashboard/ReferralsView'
import TenantBillingView from './dashboard/TenantBillingView'
import ChurnPredictionView from './dashboard/ChurnPredictionView'
import UpsellEngineView from './dashboard/UpsellEngineView'
import MoveOutRemarketingView from './dashboard/MoveOutRemarketingView'
import AttributionView from './dashboard/AttributionView'
import AdminSidebar from './dashboard/AdminSidebar'
import ActivityLogView from './dashboard/ActivityLogView'
import CallLogsView from './dashboard/CallLogsView'
import CampaignAlertsView from './dashboard/CampaignAlertsView'
import ABTestsView from './dashboard/ABTestsView'
import CampaignOrchestratorView from './dashboard/CampaignOrchestratorView'
import ConsumerLeadsView from './dashboard/ConsumerLeadsView'

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
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'score' | 'status'>('newest')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('stowstack_theme') === 'dark')
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<{ id: string; type: string; title: string; detail: string; timestamp: string }[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [guideScrollTarget, setGuideScrollTarget] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('stowstack_sidebar') === 'collapsed')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLeads, setTotalLeads] = useState(0)
  const LEADS_PER_PAGE = 50

  const openGuideToSection = useCallback((section: string) => {
    setGuideScrollTarget(section)
    setShowGuide(true)
  }, [])

  const fetchLeads = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch(`/api/admin-leads?page=${page}&limit=${LEADS_PER_PAGE}`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (res.status === 401) { onLogout(); return }
      if (!res.ok) throw new Error(`Failed to fetch leads (${res.status})`)
      const data = await res.json()
      setLeads(data.leads || [])
      setAuditCount(data.auditCount || 0)
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages)
        setTotalLeads(data.pagination.total)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [adminKey, onLogout, page])

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
      } catch (err) {
        console.error('[AdminDashboard] Failed to fetch lead scores:', err)
      }
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
      } catch (err) {
        console.error('[AdminDashboard] Failed to fetch notifications:', err)
      }
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

  // Sidebar collapse persistence
  useEffect(() => {
    localStorage.setItem('stowstack_sidebar', sidebarCollapsed ? 'collapsed' : 'expanded')
  }, [sidebarCollapsed])

  // Close mobile menu on tab change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [activeTab])

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
    } catch (err) {
      console.error('[AdminDashboard] Failed to mark notifications read:', err)
    }
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
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
      } catch (err) {
        console.error('[AdminDashboard] Failed to bulk update lead:', id, err)
      }
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
    } catch (err) {
      console.error('[AdminDashboard] Failed to download CSV:', err)
    }
  }

  const exportFilteredCsv = () => {
    if (filtered.length === 0) return
    const headers = ['Name', 'Email', 'Phone', 'Facility', 'Location', 'Status', 'Score', 'Created', 'Updated', 'Follow-Up']
    const rows = filtered.map(l => [
      l.name, l.email, l.phone, l.facilityName, l.location,
      STATUS_MAP[l.status]?.label || l.status,
      leadScores[l.id]?.score?.toString() || '',
      new Date(l.createdAt).toLocaleDateString(),
      new Date(l.updatedAt).toLocaleDateString(),
      l.followUpDate ? new Date(l.followUpDate).toLocaleDateString() : '',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stowstack-leads-filtered-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
      // Overdue always floats to top
      const aOverdue = isOverdue(a) ? 0 : 1
      const bOverdue = isOverdue(b) ? 0 : 1
      if (aOverdue !== bOverdue) return aOverdue - bOverdue
      // Then apply selected sort
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'score') return (leadScores[b.id]?.score || 0) - (leadScores[a.id]?.score || 0)
      if (sortBy === 'status') {
        const statusOrder = STATUSES.map(s => s.value)
        return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  /* ── Pipeline counts ── */
  const statusCounts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1
    return acc
  }, {})

  const activeLeads = leads.filter(l => !['lost', 'client_signed'].includes(l.status)).length
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7)
  const newToday = leads.filter(l => new Date(l.createdAt) >= todayStart).length
  const newThisWeek = leads.filter(l => new Date(l.createdAt) >= weekStart).length

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
    <div className={`min-h-screen flex transition-colors ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* ── Sidebar ── */}
      <div className="hidden md:block">
        <AdminSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onBack={onBack}
          onCommandPalette={() => setShowCommandPalette(true)}
          adminKey={adminKey}
          leadCount={leads.length}
          activeLeadCount={activeLeads}
          signedCount={statusCounts['client_signed'] || 0}
        />
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {mobileMenuOpen && (
        <>
          <div className="admin-sidebar-overlay md:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="md:hidden">
            <AdminSidebar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              collapsed={false}
              onToggleCollapse={() => setMobileMenuOpen(false)}
              onBack={onBack}
              onCommandPalette={() => { setMobileMenuOpen(false); setShowCommandPalette(true) }}
              adminKey={adminKey}
              leadCount={leads.length}
              activeLeadCount={activeLeads}
              signedCount={statusCounts['client_signed'] || 0}
            />
          </div>
        </>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className={`sticky top-0 z-30 border-b ${darkMode ? 'bg-slate-800/95 border-slate-700 backdrop-blur-sm' : 'bg-white/95 border-slate-200 backdrop-blur-sm'}`}>
          <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className={`md:hidden p-2 -ml-2 transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Menu size={20} />
              </button>
              <div className="hidden md:flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                  <Building2 size={14} className="text-white" />
                </div>
                <h1 className="text-sm font-bold tracking-tight">Admin Console</h1>
              </div>
              <div className="md:hidden flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                  <Building2 size={14} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-sm font-bold tracking-tight leading-tight">StowStack</h1>
                  <span className="text-[10px] font-medium text-slate-400 tracking-wide leading-none">by StorageAds.com</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowCommandPalette(true)}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
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
                  <Bell size={16} />
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
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                onClick={() => setShowGuide(true)}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                title="Admin Guide (H)"
              >
                <BookOpen size={16} />
              </button>
              <button onClick={downloadCsv} className={`flex items-center gap-1.5 text-sm transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`} title="Export leads as CSV">
                <Download size={14} />
                <span className="hidden sm:inline text-xs">CSV</span>
              </button>
              <button onClick={() => { setLoading(true); fetchLeads() }} className={`flex items-center gap-2 text-sm transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <button onClick={onLogout} className={`text-xs transition-colors ${darkMode ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}>
                Sign out
              </button>
            </div>
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
              if (action === 'optimizer') setActiveTab('optimizer')
              if (action === 'insights') setActiveTab('insights')
              if (action === 'billing') setActiveTab('billing')
              if (action === 'settings') setActiveTab('settings')
              if (action === 'sequences') setActiveTab('sequences')
              if (action === 'recovery') setActiveTab('recovery')
              if (action === 'attribution') setActiveTab('attribution')
              if (action === 'partners') setActiveTab('partners')
              if (action === 'referrals') setActiveTab('referrals')
              if (action === 'playbooks') setActiveTab('playbooks')
              if (action === 'tenants') setActiveTab('tenants')
              if (action === 'churn') setActiveTab('churn')
              if (action === 'upsell') setActiveTab('upsell')
              if (action === 'ab-tests') setActiveTab('ab-tests')
              if (action === 'campaigns') setActiveTab('campaigns')
              if (action === 'remarketing') setActiveTab('remarketing')
              if (action === 'whats-new') setActiveTab('whats-new')
              if (action === 'activity-log') setActiveTab('activity-log')
              if (action === 'call-logs') setActiveTab('call-logs')
              if (action === 'alerts') setActiveTab('alerts')
              if (action === 'consumer-leads') setActiveTab('consumer-leads')
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

        <div className="flex-1 px-4 sm:px-6 py-6 max-w-7xl w-full mx-auto">
        {activeTab === 'portfolio' && (<>
          <div className="flex items-center gap-2 mb-4">
            <HelpTooltip text="View client campaign data, monthly performance metrics, and manage your client portfolio." guideSection="portfolio" onOpenGuide={openGuideToSection} darkMode={darkMode} />
          </div>
          <PortfolioView leads={leads} adminKey={adminKey} loading={loading} darkMode={darkMode} />
        </>)}

        {activeTab === 'optimizer' && (<>
          <div className="flex items-center gap-2 mb-4">
            <HelpTooltip text="Recommends which facilities to push ad spend toward based on vacancy, margin efficiency, local demand, and campaign momentum." guideSection="portfolio" onOpenGuide={openGuideToSection} darkMode={darkMode} />
          </div>
          <PortfolioOptimizerView leads={leads} adminKey={adminKey} darkMode={darkMode} />

          <div className="flex items-center gap-2 mb-4 mt-8">
            <h2 className={`text-sm font-bold uppercase tracking-wider ${darkMode ? 'text-green-400' : 'text-slate-900'}`}>Client Onboarding</h2>
          </div>
          <OnboardingChecklistView leads={leads} adminKey={adminKey} />
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

        {activeTab === 'shared-audits' && (
          <SharedAuditsView adminKey={adminKey} darkMode={darkMode} />
        )}

        {activeTab === 'recovery' && (
          <RecoveryView adminKey={adminKey} darkMode={darkMode} />
        )}

        {activeTab === 'attribution' && (
          <AttributionView adminKey={adminKey} darkMode={darkMode} />
        )}

        {activeTab === 'ab-tests' && (
          <ABTestsView leads={leads} adminKey={adminKey} />
        )}

        {activeTab === 'campaigns' && (
          <CampaignOrchestratorView leads={leads} adminKey={adminKey} />
        )}

        {activeTab === 'partners' && (
          <PartnersView adminKey={adminKey} darkMode={darkMode} />
        )}

        {activeTab === 'referrals' && (
          <ReferralsView adminKey={adminKey} darkMode={darkMode} />
        )}

        {activeTab === 'playbooks' && (
          <SeasonalPlaybookTab adminKey={adminKey} darkMode={darkMode} />
        )}

        {activeTab === 'tenants' && (
          <TenantBillingView adminKey={adminKey} darkMode={darkMode} />
        )}

        {activeTab === 'churn' && (
          <ChurnPredictionView adminKey={adminKey} darkMode={darkMode} />
        )}

        {activeTab === 'upsell' && (
          <UpsellEngineView adminKey={adminKey} darkMode={darkMode} />
        )}

        {activeTab === 'remarketing' && (
          <MoveOutRemarketingView adminKey={adminKey} darkMode={darkMode} />
        )}

        {activeTab === 'whats-new' && (
          <WhatsNew darkMode={darkMode} adminKey={adminKey} />
        )}

        {activeTab === 'activity-log' && (
          <ActivityLogView adminKey={adminKey} darkMode={darkMode} />
        )}

        {activeTab === 'call-logs' && (
          <CallLogsView adminKey={adminKey} darkMode={darkMode} leads={leads} />
        )}

        {activeTab === 'alerts' && (
          <CampaignAlertsView adminKey={adminKey} darkMode={darkMode} />
        )}

        {activeTab === 'consumer-leads' && (
          <ConsumerLeadsView adminKey={adminKey} darkMode={darkMode} />
        )}

        {activeTab === 'pipeline' && (<>
        {/* Stats Cards */}
        <div className="flex items-center gap-2 mb-3">
          <h2 className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Pipeline Overview</h2>
          <HelpTooltip text="Track total leads, active pipeline, signed clients, and audit counts. Learn about each metric in the admin guide." guideSection="pipeline" onOpenGuide={openGuideToSection} darkMode={darkMode} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard icon={Users} label="Total Leads" value={leads.length} darkMode={darkMode} subtitle={`${newToday} today`} />
          <StatCard icon={TrendingUp} label="Active Pipeline" value={activeLeads} darkMode={darkMode} subtitle={`${newThisWeek} this week`} />
          <StatCard icon={CheckCircle2} label="Signed" value={statusCounts['client_signed'] || 0} accent darkMode={darkMode} />
          <StatCard icon={Clock} label="Audits" value={auditCount} darkMode={darkMode} />
          <StatCard icon={Users} label="Conversion" value={leads.length > 0 ? `${Math.round(((statusCounts['client_signed'] || 0) / leads.length) * 100)}%` : '0%'} darkMode={darkMode} subtitle="signed / total" />
          <StatCard icon={Clock} label="Overdue" value={overdueCount} darkMode={darkMode} subtitle={overdueCount > 0 ? 'needs attention' : 'all clear'} />
        </div>

        {/* Conversion Funnel */}
        {leads.length > 0 && (
          <div className={`rounded-xl border p-4 mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Conversion Funnel</h3>
            <div className="space-y-1.5">
              {STATUSES.filter(s => s.value !== 'lost').map((s, i, arr) => {
                const count = statusCounts[s.value] || 0
                const maxCount = Math.max(leads.length, 1)
                const widthPct = Math.max((count / maxCount) * 100, 4)
                const prevCount = i === 0 ? leads.length : (statusCounts[arr[i - 1].value] || 0)
                const convRate = prevCount > 0 && i > 0 ? Math.round((count / prevCount) * 100) : null
                return (
                  <div key={s.value} className="flex items-center gap-3">
                    <span className={`text-[10px] font-medium w-16 text-right shrink-0 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{s.label}</span>
                    <div className="flex-1 h-6 relative">
                      <div
                        className={`h-full rounded-md transition-all ${s.color.replace('text-', 'bg-').replace(/text-\w+-\d+/, '')} ${s.color.split(' ')[0].replace('bg-', 'bg-')}`}
                        style={{ width: `${widthPct}%` }}
                      />
                      <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold ${count > 0 ? s.color.split(' ')[1] : darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {count}
                      </span>
                    </div>
                    {convRate !== null && (
                      <span className={`text-[10px] w-10 shrink-0 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{convRate}%</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Pipeline Stages */}
        <div className={`rounded-xl border p-4 mb-6 overflow-x-auto ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
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

        {/* Search + Sort */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search by name, facility, location, or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900'
              }`}
            />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className={`px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shrink-0 ${
              darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A-Z</option>
            <option value="score">Score (high-low)</option>
            <option value="status">Pipeline stage</option>
          </select>
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

        {/* Lead list header with select all */}
        {!loading && filtered.length > 0 && (
          <div className={`flex items-center gap-3 px-4 py-2 mb-2 rounded-lg ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
            <input
              type="checkbox"
              checked={filtered.length > 0 && filtered.every(l => selectedIds.has(l.id))}
              onChange={() => {
                if (filtered.every(l => selectedIds.has(l.id))) {
                  setSelectedIds(new Set())
                } else {
                  setSelectedIds(new Set(filtered.map(l => l.id)))
                }
              }}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer"
            />
            <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {selectedIds.size > 0 ? `${selectedIds.size} of ${filtered.length} selected` : `${filtered.length} leads`}
            </span>
            <button
              onClick={exportFilteredCsv}
              className={`ml-auto flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded transition-colors ${
                darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title="Export current view as CSV"
            >
              <Download size={10} /> Export view
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={`flex items-center justify-between border-t pt-4 mt-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Page {page} of {totalPages} ({totalLeads} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-3 py-1.5 text-sm rounded-md border disabled:opacity-40 ${darkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-300 hover:bg-slate-50 text-slate-700'}`}
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`px-3 py-1.5 text-sm rounded-md border disabled:opacity-40 ${darkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-300 hover:bg-slate-50 text-slate-700'}`}
              >
                Next
              </button>
            </div>
          </div>
        )}
        </>)}
        </div>
      </div>
    </div>
  )
}
