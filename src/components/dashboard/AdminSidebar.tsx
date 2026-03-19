import { useState, useEffect, useRef } from 'react'
import {
  Users, Columns3, BarChart3, Target, TrendingUp, CreditCard, Settings,
  Building2, CalendarClock, Share2, Flame, Gift, CalendarRange, Wallet,
  ShieldAlert, TrendingDown, RotateCcw, Sparkles, ChevronRight,
  Terminal, Search, Zap, Activity, PanelLeftClose, PanelLeft,
  ArrowLeft, Hash, CircleDot, Phone, Bell, UserCheck, Calculator,
  ClipboardList
} from 'lucide-react'
import { AdminTab } from './types'
import SidebarTicker from './SidebarTicker'

/* ── Nav structure ── */

interface NavItem {
  id: AdminTab | string
  label: string
  icon: typeof Users
  shortcut?: string
  badge?: 'leads' | 'active' | 'signed'
  href?: string
}

interface NavGroup {
  id: string
  label: string
  icon: typeof Users
  color: string          // accent color class for the group
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'leads',
    label: 'LEADS',
    icon: Users,
    color: 'emerald',
    items: [
      { id: 'pipeline', label: 'Lead Pipeline', icon: Users, shortcut: '1', badge: 'leads' },
      { id: 'kanban', label: 'Lead Board', icon: Columns3, shortcut: '2', badge: 'active' },
      { id: 'consumer-leads', label: 'Inbound Leads', icon: UserCheck },
      { id: 'alerts', label: 'Campaign Alerts', icon: Bell },
    ],
  },
  {
    id: 'facilities',
    label: 'FACILITIES',
    icon: Building2,
    color: 'blue',
    items: [
      { id: 'portfolio', label: 'Portfolio Overview', icon: BarChart3, shortcut: '3' },
      { id: 'facilities', label: 'Facility Manager', icon: Building2, shortcut: '7' },
      { id: 'optimizer', label: 'Spend Optimizer', icon: Target },
      { id: 'tenants', label: 'Client Accounts', icon: Wallet },
    ],
  },
  {
    id: 'marketing',
    label: 'MARKETING',
    icon: Zap,
    color: 'rose',
    items: [
      { id: 'sequences', label: 'Email Sequences', icon: CalendarClock, shortcut: '8' },
      { id: 'playbooks', label: 'Campaign Playbooks', icon: CalendarRange },
      { id: 'attribution', label: 'Attribution', icon: Target },
      { id: 'remarketing', label: 'Exit Remarketing', icon: RotateCcw },
      { id: 'recovery', label: 'Lead Recovery', icon: Flame },
    ],
  },
  {
    id: 'revenue',
    label: 'REVENUE',
    icon: Wallet,
    color: 'amber',
    items: [
      { id: 'insights', label: 'Performance Insights', icon: TrendingUp, shortcut: '4' },
      { id: 'billing', label: 'Billing & Invoices', icon: CreditCard, shortcut: '5' },
      { id: 'unit-economics', label: 'Unit Economics', icon: Calculator },
      { id: 'upsell', label: 'Upsell Opportunities', icon: TrendingDown },
      { id: 'churn', label: 'Churn Prevention', icon: ShieldAlert },
    ],
  },
  {
    id: 'operations',
    label: 'OPERATIONS',
    icon: Activity,
    color: 'cyan',
    items: [
      { id: 'activity-log', label: 'Activity Log', icon: Activity },
      { id: 'call-logs', label: 'Call Tracking', icon: Phone },
      { id: 'shared-audits', label: 'Site Audits', icon: Share2 },
      { id: 'unit-audit', label: 'Unit Audit', icon: ClipboardList, href: '/audit-tool' },
      { id: 'partners', label: 'Partners', icon: Building2 },
      { id: 'referrals', label: 'Referral Program', icon: Gift },
    ],
  },
  {
    id: 'system',
    label: 'SYSTEM',
    icon: Settings,
    color: 'slate',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings, shortcut: '6' },
      { id: 'whats-new', label: 'Changelog', icon: Sparkles, shortcut: '9' },
    ],
  },
]

/* ── Color map ── */

const GROUP_COLORS: Record<string, { text: string; bg: string; border: string; dot: string; badge: string }> = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400' },
  blue:    { text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    dot: 'bg-blue-400',    badge: 'bg-blue-500/20 text-blue-400' },
  violet:  { text: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  dot: 'bg-violet-400',  badge: 'bg-violet-500/20 text-violet-400' },
  amber:   { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   dot: 'bg-amber-400',   badge: 'bg-amber-500/20 text-amber-400' },
  rose:    { text: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    dot: 'bg-rose-400',    badge: 'bg-rose-500/20 text-rose-400' },
  cyan:    { text: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    dot: 'bg-cyan-400',    badge: 'bg-cyan-500/20 text-cyan-400' },
  slate:   { text: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20',   dot: 'bg-slate-400',   badge: 'bg-slate-500/20 text-slate-400' },
}

/* ── Helpers ── */

function getGroupForTab(tab: AdminTab): string {
  for (const g of NAV_GROUPS) {
    if (g.items.some(i => i.id === tab)) return g.id
  }
  return 'leads'
}

function getBadgeValue(badge: NavItem['badge'], leadCount: number, activeLeadCount: number, signedCount: number): number | null {
  if (badge === 'leads' && leadCount > 0) return leadCount
  if (badge === 'active' && activeLeadCount > 0) return activeLeadCount
  if (badge === 'signed' && signedCount > 0) return signedCount
  return null
}

/* ── Sidebar ── */

export default function AdminSidebar({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  onBack,
  onCommandPalette,
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
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    clearTimeout(tooltipTimeoutRef.current)
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltipItem({ id, label, y: rect.top + rect.height / 2 })
    }, 150)
  }

  const handleItemMouseLeave = () => {
    clearTimeout(tooltipTimeoutRef.current)
    setTooltipItem(null)
  }

  return (
    <aside
      className={`
        admin-sidebar relative flex flex-col h-screen sticky top-0 z-40
        transition-all duration-300 ease-in-out select-none
        ${collapsed ? 'w-[56px]' : 'w-[240px]'}
        bg-[#0a0d12] border-r border-white/[0.06]
      `}
    >
      {/* ── Subtle gradient overlay ── */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-500/[0.02] via-transparent to-emerald-500/[0.01]" />

      {/* ── Scanline overlay ── */}
      <div className="admin-scanline pointer-events-none absolute inset-0 z-50 overflow-hidden opacity-[0.02]" />

      {/* ── Header ── */}
      <div className={`flex items-center h-[52px] px-3 border-b border-white/[0.06] ${collapsed ? 'justify-center' : 'gap-2'}`}>
        {!collapsed && (
          <button
            onClick={onBack}
            className="p-1.5 -ml-0.5 text-slate-600 hover:text-emerald-400 transition-colors rounded-md hover:bg-white/[0.04]"
            title="Back to site"
          >
            <ArrowLeft size={13} />
          </button>
        )}
        <div className={`flex items-center gap-2.5 ${collapsed ? '' : 'flex-1'}`}>
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/25 flex items-center justify-center admin-logo-glow group">
            <Terminal size={14} className="text-emerald-400 group-hover:text-emerald-300 transition-colors" />
            {/* Tiny online dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-2 border-[#0a0d12] admin-dot-pulse" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <div className="leading-none flex items-baseline gap-px">
                <span className="text-[12px] font-bold tracking-[0.12em] text-emerald-400 font-mono">STOW</span>
                <span className="text-[12px] font-bold tracking-[0.12em] text-slate-500 font-mono">STACK</span>
              </div>
              <span className="text-[9px] font-mono text-slate-600 tracking-wider mt-0.5">ADMIN CONSOLE</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick search ── */}
      <div className="px-2.5 pt-3 pb-1">
        <button
          onClick={onCommandPalette}
          className={`
            w-full flex items-center gap-2 rounded-lg border border-white/[0.06]
            bg-white/[0.02] hover:border-emerald-500/25 hover:bg-emerald-500/[0.04]
            transition-all duration-200 group
            ${collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2'}
          `}
          title="Search (⌘K)"
        >
          <Search size={13} className="text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0" />
          {!collapsed && (
            <>
              <span className="text-[11px] text-slate-600 font-mono flex-1 text-left">search…</span>
              <kbd className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-600 font-mono">⌘K</kbd>
            </>
          )}
        </button>
      </div>

      {/* ── Nav groups ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-2 admin-scrollbar">
        {NAV_GROUPS.map((group, gi) => {
          const isExpanded = expandedGroups.has(group.id)
          const hasActive = group.items.some(i => i.id === activeTab)
          const colors = GROUP_COLORS[group.color]
          const GroupIcon = group.icon

          return (
            <div key={group.id} className={gi > 0 ? 'mt-1' : ''}>
              {/* Group header */}
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`
                    w-full flex items-center gap-2 px-2 py-[6px] rounded-lg text-left
                    transition-all duration-200 group/header
                    ${hasActive
                      ? `${colors.text} opacity-90`
                      : 'text-slate-600 hover:text-slate-400'
                    }
                  `}
                >
                  <ChevronRight
                    size={9}
                    className={`transition-transform duration-200 shrink-0 opacity-60 ${isExpanded ? 'rotate-90' : ''}`}
                  />
                  <Hash size={9} className="opacity-40 shrink-0" />
                  <span className="text-[10px] font-semibold tracking-[0.14em] font-mono uppercase flex-1">
                    {group.label}
                  </span>
                  {hasActive && (
                    <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} admin-dot-pulse`} />
                  )}
                </button>
              ) : (
                /* Collapsed: show group icon as divider */
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`
                    w-full flex justify-center py-2 mb-0.5 group/gicon
                    ${hasActive ? colors.text : 'text-slate-700 hover:text-slate-500'}
                    transition-colors duration-200
                  `}
                  title={group.label}
                >
                  <GroupIcon size={11} className="opacity-60 group-hover/gicon:opacity-100 transition-opacity" />
                </button>
              )}

              {/* Group items */}
              {(collapsed || isExpanded) && (
                <div className={`${!collapsed ? 'ml-0.5 pl-2 border-l border-white/[0.04]' : ''} space-y-px`}>
                  {group.items.map(item => {
                    const isActive = activeTab === item.id
                    const Icon = item.icon
                    const badgeVal = getBadgeValue(item.badge, leadCount, activeLeadCount, signedCount)

                    if (item.href) {
                      return (
                        <a
                          key={item.id}
                          href={item.href}
                          onMouseEnter={(e) => handleItemMouseEnter(item.id, item.label, e)}
                          onMouseLeave={handleItemMouseLeave}
                          className={`
                            admin-nav-item w-full flex items-center gap-2.5 rounded-lg
                            transition-all duration-200 relative group/item no-underline
                            ${collapsed ? 'px-0 py-2 justify-center' : 'px-2.5 py-[7px]'}
                            text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]
                          `}
                        >
                          <Icon size={14} className="shrink-0 opacity-70 group-hover/item:opacity-100 transition-opacity" />
                          {!collapsed && (
                            <span className="text-[12px] font-medium font-mono flex-1 text-left truncate">
                              {item.label}
                            </span>
                          )}
                        </a>
                      )
                    }

                    return (
                      <button
                        key={item.id}
                        onClick={() => onTabChange(item.id as AdminTab)}
                        onMouseEnter={(e) => handleItemMouseEnter(item.id, item.label, e)}
                        onMouseLeave={handleItemMouseLeave}
                        className={`
                          admin-nav-item w-full flex items-center gap-2.5 rounded-lg
                          transition-all duration-200 relative group/item
                          ${collapsed ? 'px-0 py-2 justify-center' : 'px-2.5 py-[7px]'}
                          ${isActive
                            ? `${colors.text} ${colors.bg} shadow-sm`
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                          }
                        `}
                      >
                        {/* Active indicator bar */}
                        {isActive && (
                          <div
                            className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-5 rounded-r-full admin-bar-glow`}
                            style={{
                              background: `linear-gradient(180deg, var(--tw-${group.color === 'emerald' ? '' : ''}color-${group.color}-400, #34d399) 0%, transparent 100%)`,
                              backgroundColor: group.color === 'emerald' ? '#34d399' : group.color === 'blue' ? '#60a5fa' : group.color === 'violet' ? '#a78bfa' : group.color === 'amber' ? '#fbbf24' : group.color === 'rose' ? '#fb7185' : group.color === 'cyan' ? '#22d3ee' : '#94a3b8',
                            }}
                          />
                        )}

                        <Icon size={14} className={`shrink-0 ${isActive ? '' : 'opacity-70 group-hover/item:opacity-100'} transition-opacity`} />

                        {!collapsed && (
                          <>
                            <span className="text-[12px] font-medium font-mono flex-1 text-left truncate">
                              {item.label}
                            </span>
                            {badgeVal !== null && (
                              <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full ${isActive ? colors.badge : 'bg-white/[0.06] text-slate-500'}`}>
                                {badgeVal}
                              </span>
                            )}
                            {item.shortcut && !badgeVal && (
                              <kbd className={`
                                text-[9px] font-mono px-1 py-0.5 rounded
                                ${isActive
                                  ? `${colors.badge.split(' ')[0]} ${colors.text} opacity-60`
                                  : 'text-slate-700 opacity-0 group-hover/item:opacity-100'
                                }
                                transition-opacity duration-200
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
          className="fixed z-[60] left-[64px] pointer-events-none animate-fade-in"
          style={{ top: tooltipItem.y - 14 }}
        >
          <div className="flex items-center">
            <div className="w-1.5 h-1.5 rotate-45 bg-[#151b24] border-l border-b border-white/[0.08] -mr-[3px] z-10" />
            <div className="bg-[#151b24] border border-white/[0.08] rounded-lg px-3 py-1.5 shadow-2xl shadow-black/60 backdrop-blur-sm">
              <span className="text-[11px] font-mono text-slate-200 whitespace-nowrap font-medium">{tooltipItem.label}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="border-t border-white/[0.06]">
        {/* Live ticker */}
        {!collapsed && (
          <SidebarTicker
            adminKey={adminKey}
            leadCount={leadCount}
            activeLeadCount={activeLeadCount}
            signedCount={signedCount}
          />
        )}

        {/* System status + collapse */}
        <div className="px-2.5 py-2 space-y-1">
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-white/[0.02]">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-mono text-slate-500 tracking-wider flex-1">SYS ONLINE</span>
              <CircleDot size={9} className="text-emerald-500/40 admin-pulse" />
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className={`
              w-full flex items-center gap-2 rounded-lg py-2
              text-slate-600 hover:text-slate-400 hover:bg-white/[0.03]
              transition-all duration-200
              ${collapsed ? 'justify-center px-0' : 'px-2.5'}
            `}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
            {!collapsed && <span className="text-[11px] font-mono text-slate-600">Collapse</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}

export { NAV_GROUPS }
export type { NavGroup, NavItem }
