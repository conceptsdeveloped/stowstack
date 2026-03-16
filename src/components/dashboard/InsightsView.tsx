import { useState, useEffect } from 'react'
import { Loader2, BarChart3, Clock } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import { Lead } from './types'
import { timeAgo } from './utils'

interface AnalyticsData {
  totalLeads: number
  funnel: Record<string, number>
  conversionRate: number
  avgDaysToSign: number
  avgDaysInPipeline: number
  weeklyVelocity: { week: string; leads: number }[]
  stageDistribution: Record<string, number>
  lostRate: number
}

interface ActivityEntry {
  id: string
  type: string
  leadId: string
  leadName: string
  facilityName: string
  detail: string
  meta: Record<string, unknown>
  timestamp: string
}

export default function InsightsView({ adminKey, leads, darkMode: _darkMode }: { adminKey: string; leads: Lead[]; darkMode?: boolean }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [loadingAnalytics, setLoadingAnalytics] = useState(true)
  const [loadingActivity, setLoadingActivity] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/lead-analytics', { headers: { 'X-Admin-Key': adminKey } })
        if (res.ok) setAnalytics(await res.json())
      } catch { /* silent */ }
      finally { setLoadingAnalytics(false) }
    }
    const fetchActivity = async () => {
      try {
        const res = await fetch('/api/activity-log?limit=30', { headers: { 'X-Admin-Key': adminKey } })
        if (res.ok) {
          const data = await res.json()
          setActivities(data.activities || [])
        }
      } catch { /* silent */ }
      finally { setLoadingActivity(false) }
    }
    fetchAnalytics()
    fetchActivity()
  }, [adminKey])

  const STAGE_LABELS: Record<string, string> = {
    submitted: 'Submitted', form_sent: 'Form Sent', form_completed: 'Form Done',
    audit_generated: 'Audit Ready', call_scheduled: 'Call Set', client_signed: 'Signed', lost: 'Lost',
  }

  const ACTIVITY_ICONS: Record<string, { color: string; label: string }> = {
    lead_created: { color: 'bg-blue-100 text-blue-600', label: 'New Lead' },
    status_change: { color: 'bg-indigo-100 text-indigo-600', label: 'Status' },
    note_added: { color: 'bg-amber-100 text-amber-600', label: 'Note' },
    campaign_added: { color: 'bg-green-100 text-green-600', label: 'Campaign' },
    onboarding_step: { color: 'bg-purple-100 text-purple-600', label: 'Onboarding' },
    client_signed: { color: 'bg-emerald-100 text-emerald-700', label: 'Signed!' },
    pms_uploaded: { color: 'bg-cyan-100 text-cyan-600', label: 'PMS Upload' },
  }

  return (
    <div className="space-y-6">
      {/* Analytics KPIs */}
      {loadingAnalytics ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading analytics...
        </div>
      ) : analytics ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-1">Conversion Rate</p>
              <p className="text-2xl font-bold text-emerald-600">{analytics.conversionRate}%</p>
              <p className="text-[10px] text-slate-400 mt-0.5">lead → signed</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-1">Avg Days to Sign</p>
              <p className="text-2xl font-bold">{analytics.avgDaysToSign}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">from first contact</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-1">Avg Days Active</p>
              <p className="text-2xl font-bold">{analytics.avgDaysInPipeline}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">in pipeline</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-1">Lost Rate</p>
              <p className="text-2xl font-bold text-red-500">{analytics.lostRate}%</p>
              <p className="text-[10px] text-slate-400 mt-0.5">of all leads</p>
            </div>
          </div>

          {/* Funnel + Velocity Charts */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Pipeline Funnel */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-sm mb-1">Pipeline Funnel</h3>
              <p className="text-xs text-slate-500 mb-4">Leads that reached each stage</p>
              <div className="space-y-2">
                {['submitted', 'form_sent', 'form_completed', 'audit_generated', 'call_scheduled', 'client_signed'].map(stage => {
                  const count = analytics.stageDistribution[stage] || 0
                  const maxCount = analytics.totalLeads || 1
                  const pct = (count / maxCount) * 100
                  return (
                    <div key={stage}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-slate-600">{STAGE_LABELS[stage]}</span>
                        <span className="text-xs font-semibold">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${stage === 'client_signed' ? 'bg-emerald-500' : 'bg-slate-400'}`}
                          style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Weekly Velocity */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-sm mb-1">Lead Velocity</h3>
              <p className="text-xs text-slate-500 mb-3">New leads per week (last 8 weeks)</p>
              {analytics.weeklyVelocity.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={analytics.weeklyVelocity} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                    <Bar dataKey="leads" name="Leads" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">No data yet</div>
              )}
            </div>
          </div>

          {/* Lead Score Distribution */}
          {leads.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-sm mb-1">Lead Quality Overview</h3>
              <p className="text-xs text-slate-500 mb-3">Current pipeline by stage, excluding lost</p>
              <div className="flex gap-2 flex-wrap">
                {['submitted', 'form_sent', 'form_completed', 'audit_generated', 'call_scheduled', 'client_signed'].map(stage => {
                  const count = analytics.stageDistribution[stage] || 0
                  if (count === 0) return null
                  return (
                    <div key={stage} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
                      <span className="text-xs text-slate-600">{STAGE_LABELS[stage]}</span>
                      <span className="text-xs font-bold text-slate-900">{count}</span>
                    </div>
                  )
                })}
                {analytics.stageDistribution['lost'] > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200">
                    <span className="text-xs text-red-600">Lost</span>
                    <span className="text-xs font-bold text-red-700">{analytics.stageDistribution['lost']}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-slate-400">
          <BarChart3 size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No analytics data available</p>
        </div>
      )}

      {/* Activity Feed */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-sm mb-1">Activity Feed</h3>
        <p className="text-xs text-slate-500 mb-4">Recent actions across all leads</p>

        {loadingActivity ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 size={16} className="animate-spin mr-2" /> Loading...
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Clock size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs">No activity yet. Actions will appear here as you manage leads.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {activities.map(act => {
              const info = ACTIVITY_ICONS[act.type] || { color: 'bg-slate-100 text-slate-600', label: act.type }
              const ago = timeAgo(act.timestamp)
              return (
                <div key={act.id} className="flex items-start gap-3">
                  <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${info.color}`}>
                    {info.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{act.detail}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {act.facilityName && <span>{act.facilityName} · </span>}
                      {ago}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
