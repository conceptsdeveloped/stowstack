import { useState, useEffect, useRef } from 'react'
import {
  Users, Columns3, BarChart3, Target, TrendingUp, CreditCard, Settings,
  Building2, CalendarClock, Share2, Flame, Gift, CalendarRange, Wallet,
  ShieldAlert, TrendingDown, RotateCcw, Sparkles, ChevronRight,
  Terminal, Search, Zap, Activity, PanelLeftClose, PanelLeft,
  ArrowLeft
} from 'lucide-react'
import { AdminTab } from './types'
import SidebarTicker from './SidebarTicker'

/* ── Nav structure ── */

interface NavItem {
  id: AdminTab
  label: string
  icon: typeof Users
  shortcut?: string
}

interface NavGroup {
  id: string
  label: string
  icon: typeof Users
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'leads',
    label: 'LEADS',
    icon: Users,
    items: [
      { id: 'pipeline', label: 'Pipeline', icon: Users, shortcut: '1' },
      { id: 'kanban', label: 'Kanban', icon: Columns3, shortcut: '2' },
    ],
  },
  {
    id: 'portfolio',
    label: 'PORTFOLIO',
    icon: Building2,
    items: [
      { id: 'portfolio', label: 'Overview', icon: BarChart3, shortcut: '3' },
      { id: 'optimizer', label: 'Optimizer', icon: Target },
      { id: 'facilities', label: 'Facilities', icon: Building2, shortcut: '7' },
    ],
  },
  {
    id: 'analytics',
    label: 'ANALYTICS',
    icon: TrendingUp,
    items: [
      { id: 'insights', label: 'Insights', icon: TrendingUp, shortcut: '4' },
      { id: 'attribution', label: 'Attribution', icon: Target },
    ],
  },
  {
    id: 'revenue',
    label: 'REVENUE',
    icon: Wallet,
    items: [
      { id: 'billing', label: 'Billing', icon: CreditCard, shortcut: '5' },
      { id: 'tenants', label: 'Tenants', icon: Wallet },
      { id: 'upsell', label: 'Upsell Engine', icon: TrendingDown },
      { id: 'churn', label: 'Churn Intel', icon: ShieldAlert },
    ],
  },
  {
    id: 'marketing',
    label: 'MARKETING',
    icon: Zap,
    items: [
      { id: 'sequences', label: 'Sequences', icon: CalendarClock, shortcut: '8' },
      { id: 'playbooks', label: 'Playbooks', icon: CalendarRange },
      { id: 'remarketing', label: 'Remarketing', icon: RotateCcw },
      { id: 'recovery', label: 'Recovery', icon: Flame },
    ],
  },
  {
    id: 'operations',
    label: 'OPS',
    icon: Activity,
    items: [
      { id: 'shared-audits', label: 'Audits', icon: Share2 },
      { id: 'partners', label: 'Partners', icon: Building2 },
      { id: 'referrals', label: 'Referrals', icon: Gift },
    ],
  },
  {
    id: 'system',
    label: 'SYSTEM',
    icon: Settings,
    items: [
      { id: 'settings', label: 'Settings', icon: Settings, shortcut: '6' },
      { id: 'whats-new', label: "What's New", icon: Sparkles, shortcut: '9' },
    ],
  },
]

/* ── Helpers ── */

function getGroupForTab(tab: AdminTab): string {
  for (const g of NAV_GROUPS) {
    if (g.items.some(i => i.id === tab)) return g.id
  }
  return 'leads'
}

/* ── Sidebar ── */

export default function AdminSidebar({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  onBack,
  onCommandPalette,
  darkMode,
  adminKey,
  leadCount,
  activeLeadCount,
  signedCount,
}: {
  activeTab: AdminTab
  onTabChange: (tab: AdminTab) => void
  collapsed: boolean
  onToggleCollapse: () => void
  onBack: () => void
  onCommandPalette: () => void
  darkMode: boolean
  adminKey: string
  leadCount: number
  activeLeadCount: number
  signedCount: number
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    initial.add(getGroupForTab(activeTab))
    return initial
  })
  const [, setHoveredItem] = useState<string | null>(null)
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const [tooltipItem, setTooltipItem] = useState<{ id: string; label: string; y: number } | null>(null)

  // Auto-expand group when active tab changes
  useEffect(() => {
    const group = getGroupForTab(activeTab)
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.add(group)
      return next
    })
  }, [activeTab])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const handleItemMouseEnter = (id: string, label: string, e: React.MouseEvent) => {
    if (!collapsed) return
    setHoveredItem(id)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    clearTimeout(tooltipTimeoutRef.current)
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltipItem({ id, label, y: rect.top + rect.height / 2 })
    }, 200)
  }

  const handleItemMouseLeave = () => {
    setHoveredItem(null)
    clearTimeout(tooltipTimeoutRef.current)
    setTooltipItem(null)
  }

  return (
    <aside
      className={`
        admin-sidebar relative flex flex-col h-screen sticky top-0 z-40
        transition-all duration-300 ease-out select-none
        ${collapsed ? 'w-[52px]' : 'w-[220px]'}
        ${darkMode ? 'bg-[#0a0e14] border-r border-[#1a2332]' : 'bg-[#0c1018] border-r border-[#1a2332]'}
      `}
    >
      {/* ── Scanline overlay ── */}
      <div className="admin-scanline pointer-events-none absolute inset-0 z-50 overflow-hidden opacity-[0.03]" />

      {/* ── Header ── */}
      <div className={`flex items-center h-14 px-3 border-b border-[#1a2332] ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
        {!collapsed && (
          <button
            onClick={onBack}
            className="p-1 text-slate-600 hover:text-emerald-400 transition-colors"
            title="Back"
          >
            <ArrowLeft size={14} />
          </button>
        )}
        <div className={`flex items-center gap-2 ${collapsed ? '' : 'flex-1'}`}>
          <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center admin-logo-glow">
            <Terminal size={14} className="text-emerald-400" />
          </div>
          {!collapsed && (
            <div className="leading-none">
              <span className="text-[11px] font-bold tracking-widest text-emerald-400 font-mono uppercase">STOW</span>
              <span className="text-[11px] font-bold tracking-widest text-slate-500 font-mono uppercase">STACK</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick search ── */}
      <button
        onClick={onCommandPalette}
        className={`
          mx-2 mt-2.5 mb-1 flex items-center gap-2 rounded-md border border-[#1a2332]
          bg-[#0d1117] hover:border-emerald-500/30 hover:bg-emerald-500/5
          transition-all duration-200 group
          ${collapsed ? 'px-2 py-2 justify-center' : 'px-2.5 py-1.5'}
        `}
        title="Search (⌘K)"
      >
        <Search size={12} className="text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0" />
        {!collapsed && (
          <>
            <span className="text-[11px] text-slate-600 font-mono flex-1 text-left">search...</span>
            <kbd className="text-[9px] px-1 py-0.5 rounded bg-[#1a2332] text-slate-600 font-mono">⌘K</kbd>
          </>
        )}
      </button>

      {/* ── Nav groups ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 admin-scrollbar space-y-0.5">
        {NAV_GROUPS.map(group => {
          const isExpanded = expandedGroups.has(group.id)
          const hasActive = group.items.some(i => i.id === activeTab)

          return (
            <div key={group.id} className="mb-1">
              {/* Group header */}
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`
                    w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left
                    transition-all duration-150 group/header
                    ${hasActive
                      ? 'text-emerald-400/80'
                      : 'text-slate-600 hover:text-slate-400'
                    }
                  `}
                >
                  <ChevronRight
                    size={10}
                    className={`transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                  />
                  <span className="text-[10px] font-bold tracking-[0.15em] font-mono uppercase flex-1">
                    {group.label}
                  </span>
                  {hasActive && (
                    <span className="w-1 h-1 rounded-full bg-emerald-400 admin-dot-pulse" />
                  )}
                </button>
              ) : (
                <div className="flex justify-center py-1.5 mb-0.5">
                  <div className={`w-4 h-px ${hasActive ? 'bg-emerald-500/50' : 'bg-[#1a2332]'}`} />
                </div>
              )}

              {/* Group items */}
              {(collapsed || isExpanded) && (
                <div className={`${!collapsed ? 'ml-1' : ''} space-y-px`}>
                  {group.items.map(item => {
                    const isActive = activeTab === item.id
                    const Icon = item.icon

                    return (
                      <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        onMouseEnter={(e) => handleItemMouseEnter(item.id, item.label, e)}
                        onMouseLeave={handleItemMouseLeave}
                        className={`
                          admin-nav-item w-full flex items-center gap-2.5 rounded-md
                          transition-all duration-150 relative
                          ${collapsed ? 'px-0 py-2 justify-center' : 'px-2.5 py-[7px]'}
                          ${isActive
                            ? 'text-emerald-400 bg-emerald-500/10 admin-active-glow'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                          }
                        `}
                      >
                        {/* Active indicator bar */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-emerald-400 rounded-r admin-bar-glow" />
                        )}

                        <Icon size={14} className="shrink-0" />

                        {!collapsed && (
                          <>
                            <span className="text-[12px] font-medium font-mono flex-1 text-left truncate">
                              {item.label}
                            </span>
                            {item.shortcut && (
                              <kbd className={`
                                text-[9px] font-mono px-1 py-0.5 rounded
                                ${isActive
                                  ? 'bg-emerald-500/20 text-emerald-400/60'
                                  : 'bg-transparent text-slate-700'
                                }
                              `}>
                                {item.shortcut}
                              </kbd>
                            )}
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* ── Tooltip for collapsed mode ── */}
      {collapsed && tooltipItem && (
        <div
          className="fixed z-[60] left-[60px] pointer-events-none"
          style={{ top: tooltipItem.y - 12 }}
        >
          <div className="flex items-center">
            <div className="w-1.5 h-1.5 rotate-45 bg-[#1a2332] -mr-[3px] z-10" />
            <div className="bg-[#0d1117] border border-[#1a2332] rounded-md px-2.5 py-1.5 shadow-xl shadow-black/50">
              <span className="text-[11px] font-mono text-slate-300 whitespace-nowrap">{tooltipItem.label}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="border-t border-[#1a2332] space-y-0">
        {/* Live ticker */}
        {!collapsed && (
          <SidebarTicker
            adminKey={adminKey}
            leadCount={leadCount}
            activeLeadCount={activeLeadCount}
            signedCount={signedCount}
          />
        )}

        {/* System status */}
        <div className="px-2 py-1.5">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2.5 py-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-mono text-slate-600 tracking-wide">SYS ONLINE</span>
            <Activity size={10} className="text-emerald-500/40 ml-auto admin-pulse" />
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className={`
            w-full flex items-center gap-2 rounded-md py-2
            text-slate-600 hover:text-slate-400 hover:bg-white/[0.03]
            transition-all duration-150
            ${collapsed ? 'justify-center px-0' : 'px-2.5'}
          `}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
          {!collapsed && <span className="text-[11px] font-mono">Collapse</span>}
        </button>
        </div>
      </div>
    </aside>
  )
}

export { NAV_GROUPS }
export type { NavGroup, NavItem }
