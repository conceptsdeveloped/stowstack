import { useState, useEffect, useCallback } from 'react'
import { Loader2, Users, DollarSign, Target, CheckCircle2, TrendingUp, Award, BarChart3, MapPin, ArrowDownRight, ArrowUpRight, Minus, Bell, AlertTriangle, XCircle, Sparkles, ChevronDown } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import { Lead } from './types'

interface CampaignEntry {
  month: string
  spend: number
  leads: number
  cpl: number
  moveIns: number
  costPerMoveIn: number
  roas: number
  occupancyDelta: number
}

interface ClientPortfolioData {
  lead: Lead
  campaigns: CampaignEntry[]
  totals: { spend: number; leads: number; moveIns: number }
  avgCpl: number
  latestRoas: number
}

interface CampaignAlert {
  type: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  detail: string
  accessCode: string
  facilityName: string
}

export default function PortfolioView({ leads, adminKey, loading, darkMode: _darkMode }: { leads: Lead[]; adminKey: string; loading: boolean; darkMode?: boolean }) {
  const [clientData, setClientData] = useState<ClientPortfolioData[]>([])
  const [fetching, setFetching] = useState(false)
  const [fetched, setFetched] = useState(false)

  const signedClients = leads.filter(l => l.status === 'client_signed' && l.accessCode)

  const fetchAllCampaigns = useCallback(async () => {
    if (signedClients.length === 0) return
    setFetching(true)
    const results: ClientPortfolioData[] = []

    for (const lead of signedClients) {
      try {
        const res = await fetch(`/api/client-campaigns?code=${lead.accessCode}`, {
          headers: { 'X-Admin-Key': adminKey },
        })
        if (res.ok) {
          const data = await res.json()
          const campaigns: CampaignEntry[] = data.campaigns || []
          const totals = campaigns.reduce((acc, c) => ({
            spend: acc.spend + c.spend,
            leads: acc.leads + c.leads,
            moveIns: acc.moveIns + c.moveIns,
          }), { spend: 0, leads: 0, moveIns: 0 })
          results.push({
            lead,
            campaigns,
            totals,
            avgCpl: totals.leads > 0 ? totals.spend / totals.leads : 0,
            latestRoas: campaigns.length > 0 ? campaigns[campaigns.length - 1].roas : 0,
          })
        }
      } catch { /* skip */ }
    }

    setClientData(results)
    setFetching(false)
    setFetched(true)
  }, [signedClients.length, adminKey])

  useEffect(() => {
    if (!fetched && !fetching && signedClients.length > 0 && !loading) {
      fetchAllCampaigns()
    }
  }, [signedClients.length, loading])

  const withCampaigns = clientData.filter(c => c.campaigns.length > 0)
  const totalSpend = withCampaigns.reduce((s, c) => s + c.totals.spend, 0)
  const totalLeads = withCampaigns.reduce((s, c) => s + c.totals.leads, 0)
  const totalMoveIns = withCampaigns.reduce((s, c) => s + c.totals.moveIns, 0)
  const portfolioCpl = totalLeads > 0 ? totalSpend / totalLeads : 0
  const portfolioCostPerMoveIn = totalMoveIns > 0 ? totalSpend / totalMoveIns : 0

  const monthlyMap: Record<string, { spend: number; leads: number; moveIns: number }> = {}
  withCampaigns.forEach(c => {
    c.campaigns.forEach(camp => {
      if (!monthlyMap[camp.month]) monthlyMap[camp.month] = { spend: 0, leads: 0, moveIns: 0 }
      monthlyMap[camp.month].spend += camp.spend
      monthlyMap[camp.month].leads += camp.leads
      monthlyMap[camp.month].moveIns += camp.moveIns
    })
  })
  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      ...data,
      cpl: data.leads > 0 ? data.spend / data.leads : 0,
    }))

  const byMoveIns = [...withCampaigns].sort((a, b) => b.totals.moveIns - a.totals.moveIns)
  const byCpl = [...withCampaigns].sort((a, b) => a.avgCpl - b.avgCpl)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={24} className="animate-spin mr-2" /> Loading...
      </div>
    )
  }

  if (signedClients.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <BarChart3 size={40} className="mx-auto mb-3 opacity-40" />
        <p className="text-lg font-medium">No signed clients yet</p>
        <p className="text-sm mt-1">Campaign analytics will appear here once clients are signed and campaigns are running</p>
      </div>
    )
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={24} className="animate-spin mr-2" />
        Loading campaign data for {signedClients.length} client{signedClients.length !== 1 ? 's' : ''}...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <PortfolioKpi label="Active Clients" value={withCampaigns.length.toString()} sub={`of ${signedClients.length} signed`} icon={Users} />
        <PortfolioKpi label="Total Ad Spend" value={`$${totalSpend.toLocaleString()}`} sub="all time" icon={DollarSign} />
        <PortfolioKpi label="Total Leads" value={totalLeads.toLocaleString()} sub="across portfolio" icon={Target} />
        <PortfolioKpi label="Total Move-Ins" value={totalMoveIns.toLocaleString()} sub="across portfolio" icon={CheckCircle2} accent />
        <PortfolioKpi label="Avg CPL" value={`$${portfolioCpl.toFixed(2)}`} sub="portfolio wide" icon={TrendingUp} />
        <PortfolioKpi label="Cost/Move-In" value={`$${portfolioCostPerMoveIn.toFixed(0)}`} sub="portfolio wide" icon={Award} />
      </div>

      <AlertsBanner adminKey={adminKey} />

      {monthlyData.length >= 2 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-sm mb-1">Portfolio Leads & Move-Ins</h3>
            <p className="text-xs text-slate-500 mb-3">Aggregate across all clients by month</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                <Bar dataKey="leads" name="Leads" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="moveIns" name="Move-Ins" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-sm mb-1">Portfolio CPL Trend</h3>
            <p className="text-xs text-slate-500 mb-3">Blended cost per lead over time</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="portCplGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip
                  formatter={(v) => [`$${Number(v).toFixed(2)}`, 'CPL']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="cpl" stroke="#10b981" strokeWidth={2} fill="url(#portCplGrad)" dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {withCampaigns.length >= 2 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-sm mb-1">Budget Allocation by Client</h3>
          <p className="text-xs text-slate-500 mb-4">Total ad spend distribution across portfolio</p>
          <div className="space-y-3">
            {byMoveIns.map(c => {
              const pct = totalSpend > 0 ? (c.totals.spend / totalSpend) * 100 : 0
              return (
                <div key={c.lead.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{c.lead.facilityName}</span>
                      <span className="text-xs text-slate-400">{c.lead.location}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs">
                      <span className="text-slate-500">${c.totals.spend.toLocaleString()}</span>
                      <span className="font-semibold w-10 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-3">Client Performance</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientData.map(c => (
            <ClientPerformanceCard key={c.lead.id} data={c} />
          ))}
        </div>
      </div>

      {withCampaigns.length >= 2 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Award size={15} className="text-emerald-600" /> Top by Move-Ins
            </h3>
            <div className="space-y-2">
              {byMoveIns.slice(0, 5).map((c, i) => (
                <div key={c.lead.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                  }`}>{i + 1}</span>
                  <span className="text-sm font-medium flex-1 truncate">{c.lead.facilityName}</span>
                  <span className="text-sm font-bold text-emerald-600">{c.totals.moveIns}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp size={15} className="text-emerald-600" /> Best CPL
            </h3>
            <div className="space-y-2">
              {byCpl.filter(c => c.avgCpl > 0).slice(0, 5).map((c, i) => (
                <div key={c.lead.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                  }`}>{i + 1}</span>
                  <span className="text-sm font-medium flex-1 truncate">{c.lead.facilityName}</span>
                  <span className="text-sm font-bold text-emerald-600">${c.avgCpl.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PortfolioKpi({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub: string; icon: React.ComponentType<{ size?: number | string; className?: string }>; accent?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={accent ? 'text-emerald-600' : 'text-slate-400'} />
        <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">{label}</span>
      </div>
      <p className={`text-xl font-bold ${accent ? 'text-emerald-700' : ''}`}>{value}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  )
}

function ClientPerformanceCard({ data }: { data: ClientPortfolioData }) {
  const { lead, campaigns, totals, avgCpl, latestRoas } = data
  const hasCampaigns = campaigns.length > 0

  let cplTrend: 'up' | 'down' | 'flat' = 'flat'
  if (campaigns.length >= 2) {
    const first = campaigns[0].cpl
    const last = campaigns[campaigns.length - 1].cpl
    cplTrend = last < first ? 'down' : last > first ? 'up' : 'flat'
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h4 className="font-semibold text-sm truncate">{lead.facilityName}</h4>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin size={10} /> {lead.location}
          </p>
        </div>
        {hasCampaigns && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
            latestRoas >= 3 ? 'bg-emerald-50 text-emerald-700' :
            latestRoas >= 2 ? 'bg-amber-50 text-amber-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            {latestRoas}x ROAS
          </span>
        )}
      </div>

      {hasCampaigns ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <p className="text-lg font-bold">{totals.leads}</p>
              <p className="text-[10px] text-slate-500 uppercase">Leads</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-600">{totals.moveIns}</p>
              <p className="text-[10px] text-slate-500 uppercase">Move-Ins</p>
            </div>
            <div>
              <p className="text-lg font-bold flex items-center gap-1">
                ${avgCpl.toFixed(0)}
                {cplTrend === 'down' && <ArrowDownRight size={12} className="text-emerald-500" />}
                {cplTrend === 'up' && <ArrowUpRight size={12} className="text-red-500" />}
                {cplTrend === 'flat' && <Minus size={12} className="text-slate-400" />}
              </p>
              <p className="text-[10px] text-slate-500 uppercase">Avg CPL</p>
            </div>
          </div>

          {campaigns.length >= 2 && (
            <div className="h-12 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={campaigns} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                  <defs>
                    <linearGradient id={`spark-${lead.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="moveIns" stroke="#10b981" strokeWidth={1.5} fill={`url(#spark-${lead.id})`} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] text-slate-400">{campaigns.length} month{campaigns.length !== 1 ? 's' : ''} of data</span>
            <span className="text-[10px] text-slate-400">${totals.spend.toLocaleString()} total spend</span>
          </div>
        </>
      ) : (
        <div className="text-center py-4 text-slate-400">
          <BarChart3 size={20} className="mx-auto mb-1 opacity-40" />
          <p className="text-xs">No campaign data yet</p>
        </div>
      )}
    </div>
  )
}

function AlertsBanner({ adminKey }: { adminKey: string }) {
  const [alerts, setAlerts] = useState<CampaignAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/campaign-alerts', { headers: { 'X-Admin-Key': adminKey } })
        if (res.ok) {
          const data = await res.json()
          setAlerts(data.alerts || [])
        }
      } catch { /* silent */ }
      setLoading(false)
    }
    fetchAlerts()
  }, [adminKey])

  if (loading) return null

  const critical = alerts.filter(a => a.severity === 'critical')
  const warnings = alerts.filter(a => a.severity === 'warning')
  const infos = alerts.filter(a => a.severity === 'info')

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
        <CheckCircle2 size={14} />
        <span className="font-medium">All campaigns healthy — no alerts</span>
      </div>
    )
  }

  const severityIcon = (s: string) => {
    if (s === 'critical') return <XCircle size={12} className="text-red-500 shrink-0" />
    if (s === 'warning') return <AlertTriangle size={12} className="text-amber-500 shrink-0" />
    return <Sparkles size={12} className="text-blue-500 shrink-0" />
  }
  const severityBg = (s: string) => {
    if (s === 'critical') return 'bg-red-50 border-red-200'
    if (s === 'warning') return 'bg-amber-50 border-amber-200'
    return 'bg-blue-50 border-blue-200'
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
          critical.length > 0 ? 'bg-red-50 border-red-200' : warnings.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <Bell size={14} className={critical.length > 0 ? 'text-red-500' : warnings.length > 0 ? 'text-amber-500' : 'text-blue-500'} />
          <span className="text-xs font-semibold">
            {alerts.length} Alert{alerts.length !== 1 ? 's' : ''}
            {critical.length > 0 && <span className="text-red-600 ml-1">({critical.length} critical)</span>}
            {warnings.length > 0 && <span className="text-amber-600 ml-1">({warnings.length} warning{warnings.length !== 1 ? 's' : ''})</span>}
            {infos.length > 0 && <span className="text-blue-600 ml-1">({infos.length} info)</span>}
          </span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-1.5">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${severityBg(alert.severity)}`}>
              {severityIcon(alert.severity)}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{alert.title}</span>
                  <span className="text-[10px] text-slate-400">{alert.facilityName}</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{alert.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
