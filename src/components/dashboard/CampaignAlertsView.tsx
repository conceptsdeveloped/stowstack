import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle, AlertCircle, Info, RefreshCw, Loader2,
  DollarSign, TrendingDown, Users, Zap, Clock, Trophy,
  ChevronDown, ChevronRight, X as XIcon, Bell, Filter
} from 'lucide-react'

/* ── Types ── */

interface CampaignAlert {
  type: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  detail: string
  metric: number
  threshold?: number
  accessCode: string
  facilityName: string
}

interface AlertSummary {
  total: number
  critical: number
  warning: number
  info: number
}

interface ClientAlertGroup {
  facilityName: string
  email: string
  alerts: Omit<CampaignAlert, 'accessCode' | 'facilityName'>[]
}

/* ── Helpers ── */

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    bg: 'bg-red-50 border-red-200',
    darkBg: 'bg-red-900/20 border-red-800/40',
    text: 'text-red-700',
    darkText: 'text-red-400',
    badge: 'bg-red-100 text-red-700',
    darkBadge: 'bg-red-900/40 text-red-400',
    dot: 'bg-red-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 border-amber-200',
    darkBg: 'bg-amber-900/20 border-amber-800/40',
    text: 'text-amber-700',
    darkText: 'text-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    darkBadge: 'bg-amber-900/40 text-amber-400',
    dot: 'bg-amber-500',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 border-blue-200',
    darkBg: 'bg-blue-900/20 border-blue-800/40',
    text: 'text-blue-700',
    darkText: 'text-blue-400',
    badge: 'bg-blue-100 text-blue-700',
    darkBadge: 'bg-blue-900/40 text-blue-400',
    dot: 'bg-blue-500',
  },
}

const ALERT_TYPE_ICONS: Record<string, typeof DollarSign> = {
  cpl_spike: DollarSign,
  roas_low: TrendingDown,
  roas_drop: TrendingDown,
  lead_drought: Users,
  low_leads: Users,
  no_moveins: Zap,
  no_campaigns: Clock,
  spend_spike: DollarSign,
  spend_drop: DollarSign,
  roas_excellent: Trophy,
  movein_milestone: Trophy,
  cpl_improved: Trophy,
}

/* ── Component ── */

export default function CampaignAlertsView({ adminKey, darkMode }: { adminKey: string; darkMode: boolean }) {
  const [alerts, setAlerts] = useState<CampaignAlert[]>([])
  const [clientAlerts, setClientAlerts] = useState<Record<string, ClientAlertGroup>>({})
  const [summary, setSummary] = useState<AlertSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all')
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('stowstack_dismissed_alerts')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch { return new Set() }
  })
  const [viewMode, setViewMode] = useState<'all' | 'by-client'>('all')

  const bg = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500'

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/campaign-alerts', {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (!res.ok) throw new Error(`Failed to fetch alerts (${res.status})`)
      const data = await res.json()
      setAlerts(data.alerts || [])
      setClientAlerts(data.clientAlerts || {})
      setSummary(data.summary || null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }, [adminKey])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  const dismissAlert = (alertKey: string) => {
    setDismissedAlerts(prev => {
      const next = new Set(prev)
      next.add(alertKey)
      localStorage.setItem('stowstack_dismissed_alerts', JSON.stringify([...next]))
      return next
    })
  }

  const getAlertKey = (a: CampaignAlert) => `${a.accessCode}:${a.type}`

  const toggleClient = (code: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const filteredAlerts = alerts.filter(a => {
    if (dismissedAlerts.has(getAlertKey(a))) return false
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false
    return true
  })

  const activeCount = alerts.filter(a => !dismissedAlerts.has(getAlertKey(a))).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-400 mr-2" />
        <span className={textMuted}>Loading campaign alerts...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Campaign Alerts</h2>
          <p className={`text-sm mt-0.5 ${textMuted}`}>
            Real-time health monitoring across all client campaigns
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
            darkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
          }`}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Active', value: activeCount, color: darkMode ? 'text-slate-200' : 'text-slate-900' },
            { label: 'Critical', value: summary.critical, color: 'text-red-500' },
            { label: 'Warnings', value: summary.warning, color: 'text-amber-500' },
            { label: 'Info', value: summary.info, color: 'text-blue-500' },
          ].map(card => (
            <div key={card.label} className={`rounded-xl border p-4 ${bg}`}>
              <p className={`text-xs font-medium ${textMuted}`}>{card.label}</p>
              <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className={`flex items-center gap-3 flex-wrap rounded-xl border p-3 ${bg}`}>
        <Filter size={14} className={textMuted} />
        <div className="flex gap-1.5">
          {(['all', 'critical', 'warning', 'info'] as const).map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                severityFilter === sev
                  ? 'bg-emerald-600 text-white'
                  : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'all'
                ? 'bg-emerald-600 text-white'
                : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            All Alerts
          </button>
          <button
            onClick={() => setViewMode('by-client')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'by-client'
                ? 'bg-emerald-600 text-white'
                : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            By Client
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredAlerts.length === 0 && !loading && (
        <div className={`text-center py-16 rounded-xl border ${bg}`}>
          <Bell size={32} className={`mx-auto mb-3 ${textMuted} opacity-40`} />
          <p className="font-medium">No active alerts</p>
          <p className={`text-sm mt-1 ${textMuted}`}>
            {alerts.length > 0
              ? 'All alerts have been filtered or dismissed'
              : 'All campaigns are running smoothly'}
          </p>
        </div>
      )}

      {/* All Alerts View */}
      {viewMode === 'all' && filteredAlerts.length > 0 && (
        <div className="space-y-2">
          {filteredAlerts.map((alert, i) => {
            const config = SEVERITY_CONFIG[alert.severity]
            const TypeIcon = ALERT_TYPE_ICONS[alert.type] || AlertTriangle
            const key = getAlertKey(alert)

            return (
              <div
                key={`${key}-${i}`}
                className={`rounded-xl border p-4 transition-colors ${darkMode ? config.darkBg : config.bg}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-1.5 rounded-lg ${darkMode ? 'bg-white/5' : 'bg-white/60'}`}>
                    <TypeIcon size={16} className={darkMode ? config.darkText : config.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${darkMode ? config.darkBadge : config.badge}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className={`text-xs ${textMuted}`}>{alert.facilityName}</span>
                    </div>
                    <p className={`text-sm font-semibold ${darkMode ? config.darkText : config.text}`}>{alert.title}</p>
                    <p className={`text-xs mt-1 ${textMuted}`}>{alert.detail}</p>
                  </div>
                  <button
                    onClick={() => dismissAlert(key)}
                    className={`p-1 rounded transition-colors shrink-0 ${darkMode ? 'hover:bg-white/10 text-slate-500' : 'hover:bg-black/5 text-slate-400'}`}
                    title="Dismiss"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* By Client View */}
      {viewMode === 'by-client' && Object.keys(clientAlerts).length > 0 && (
        <div className="space-y-2">
          {Object.entries(clientAlerts).map(([code, group]) => {
            const isExpanded = expandedClients.has(code)
            const critCount = group.alerts.filter(a => a.severity === 'critical').length
            const warnCount = group.alerts.filter(a => a.severity === 'warning').length

            return (
              <div key={code} className={`rounded-xl border overflow-hidden ${bg}`}>
                <button
                  onClick={() => toggleClient(code)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    darkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'
                  }`}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className="font-medium text-sm flex-1">{group.facilityName}</span>
                  <div className="flex items-center gap-2">
                    {critCount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        {critCount} critical
                      </span>
                    )}
                    {warnCount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        {warnCount} warning
                      </span>
                    )}
                    <span className={`text-xs ${textMuted}`}>{group.alerts.length} total</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className={`border-t px-4 py-3 space-y-2 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                    {group.alerts.map((alert, i) => {
                      const config = SEVERITY_CONFIG[alert.severity]
                      const TypeIcon = ALERT_TYPE_ICONS[alert.type] || AlertTriangle
                      return (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${darkMode ? config.darkBg : config.bg}`}>
                          <TypeIcon size={14} className={`mt-0.5 ${darkMode ? config.darkText : config.text}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${darkMode ? config.darkText : config.text}`}>{alert.title}</p>
                            <p className={`text-xs mt-0.5 ${textMuted}`}>{alert.detail}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Dismissed count */}
      {dismissedAlerts.size > 0 && (
        <div className={`text-center ${textMuted}`}>
          <button
            onClick={() => {
              setDismissedAlerts(new Set())
              localStorage.removeItem('stowstack_dismissed_alerts')
            }}
            className="text-xs hover:underline"
          >
            {dismissedAlerts.size} dismissed alert{dismissedAlerts.size !== 1 ? 's' : ''} — click to restore
          </button>
        </div>
      )}
    </div>
  )
}
