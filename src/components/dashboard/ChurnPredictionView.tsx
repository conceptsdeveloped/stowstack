import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle, TrendingDown, ShieldAlert, UserX, RefreshCw,
  Phone, Mail, Gift, ChevronDown, ChevronRight, Search,
  Activity, CheckCircle2, Zap, Plus, Trash2, ToggleLeft, ToggleRight,
  Users, XCircle, Megaphone
} from 'lucide-react'

interface ChurnPrediction {
  id: string
  tenant_id: string
  facility_id: string
  risk_score: number
  risk_level: string
  predicted_vacate: string | null
  factors: { factor: string; weight: number; detail: string }[]
  recommended_actions: { action: string; priority: string; description: string }[]
  retention_status: string
  tenant_name: string
  tenant_email: string
  tenant_phone: string
  unit_number: string
  unit_size: string
  unit_type: string
  monthly_rate: number
  move_in_date: string
  days_delinquent: number
  autopay_enabled: boolean
  has_insurance: boolean
  balance: number
  facility_name: string
  facility_location: string
  campaign_name?: string | null
}

interface ChurnStats {
  total_scored: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  enrolled_count: number
  retained_count: number
  in_campaign_count: number
  churned_count: number
  avg_risk_score: number
}

interface CampaignStep {
  delay_days: number
  channel: 'email' | 'sms' | 'call'
  subject: string
  body: string
  offer: string
}

interface Campaign {
  id: string
  name: string
  trigger_level: 'medium' | 'high' | 'critical'
  steps: CampaignStep[]
  enrolled_count: number
  retained_count: number
  active: boolean
}

const RISK_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
}

const RISK_BAR_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
}

const RETENTION_COLORS: Record<string, string> = {
  none: 'bg-slate-100 text-slate-600',
  enrolled: 'bg-blue-100 text-blue-700',
  contacted: 'bg-indigo-100 text-indigo-700',
  retained: 'bg-green-100 text-green-700',
  churned: 'bg-red-100 text-red-700',
}

const ACTION_ICONS: Record<string, typeof Phone> = {
  personal_call: Phone,
  autopay_incentive: Zap,
  renewal_offer: Gift,
  payment_reminder: Mail,
}

const EMPTY_STEP: CampaignStep = { delay_days: 1, channel: 'email', subject: '', body: '', offer: '' }

export default function ChurnPredictionView({ adminKey, darkMode }: { adminKey: string; darkMode: boolean }) {
  const [predictions, setPredictions] = useState<ChurnPrediction[]>([])
  const [stats, setStats] = useState<ChurnStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [scoring, setScoring] = useState(false)
  const [riskFilter, setRiskFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Campaign state
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [newCampaignName, setNewCampaignName] = useState('')
  const [newCampaignTrigger, setNewCampaignTrigger] = useState<'medium' | 'high' | 'critical'>('high')
  const [newCampaignSteps, setNewCampaignSteps] = useState<CampaignStep[]>([{ ...EMPTY_STEP }])
  const [savingCampaign, setSavingCampaign] = useState(false)

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchEnrollCampaignId, setBatchEnrollCampaignId] = useState<string>('')

  const fetchPredictions = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (riskFilter !== 'all') params.set('riskLevel', riskFilter)
      const res = await fetch(`/api/churn-predictions?${params}`, { headers: { 'X-Admin-Key': adminKey } })
      if (res.ok) {
        const data = await res.json()
        setPredictions(data.predictions || [])
        setStats(data.stats || null)
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }, [adminKey, riskFilter])

  const fetchCampaigns = useCallback(async () => {
    try {
      setCampaignsLoading(true)
      const res = await fetch('/api/churn-predictions?resource=campaigns', { headers: { 'X-Admin-Key': adminKey } })
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch { /* silent */ } finally { setCampaignsLoading(false) }
  }, [adminKey])

  useEffect(() => { fetchPredictions() }, [fetchPredictions])
  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  const runScoring = async () => {
    try {
      setScoring(true)
      await fetch('/api/churn-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({}),
      })
      await fetchPredictions()
    } catch { /* silent */ } finally { setScoring(false) }
  }

  const updateRetention = async (id: string, status: string) => {
    try {
      await fetch('/api/churn-predictions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ id, retention_status: status }),
      })
      fetchPredictions()
    } catch { /* silent */ }
  }

  // Campaign actions
  const saveCampaign = async () => {
    if (!newCampaignName.trim() || newCampaignSteps.length === 0) return
    try {
      setSavingCampaign(true)
      await fetch('/api/churn-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          action: 'create_campaign',
          name: newCampaignName,
          trigger_level: newCampaignTrigger,
          steps: newCampaignSteps,
        }),
      })
      setShowCampaignForm(false)
      setNewCampaignName('')
      setNewCampaignTrigger('high')
      setNewCampaignSteps([{ ...EMPTY_STEP }])
      await fetchCampaigns()
    } catch { /* silent */ } finally { setSavingCampaign(false) }
  }

  const enrollMatchingCampaign = async (campaignId: string) => {
    try {
      await fetch('/api/churn-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ action: 'enroll_campaign', campaign_id: campaignId }),
      })
      await Promise.all([fetchPredictions(), fetchCampaigns()])
    } catch { /* silent */ }
  }

  const toggleCampaign = async (campaignId: string) => {
    try {
      await fetch('/api/churn-predictions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ action: 'toggle_campaign', campaign_id: campaignId }),
      })
      await fetchCampaigns()
    } catch { /* silent */ }
  }

  // Batch actions
  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const batchEnroll = async () => {
    if (!batchEnrollCampaignId || selectedIds.size === 0) return
    try {
      await fetch('/api/churn-predictions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ action: 'batch_enroll', ids: Array.from(selectedIds), campaign_id: batchEnrollCampaignId }),
      })
      setSelectedIds(new Set())
      setBatchEnrollCampaignId('')
      await Promise.all([fetchPredictions(), fetchCampaigns()])
    } catch { /* silent */ }
  }

  const batchStatus = async (status: string) => {
    if (selectedIds.size === 0) return
    try {
      await fetch('/api/churn-predictions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ action: 'batch_status', ids: Array.from(selectedIds), retention_status: status }),
      })
      setSelectedIds(new Set())
      await fetchPredictions()
    } catch { /* silent */ }
  }

  // Step editor helpers
  const updateStep = (index: number, field: keyof CampaignStep, value: string | number) => {
    setNewCampaignSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  const addStep = () => {
    setNewCampaignSteps(prev => [...prev, { ...EMPTY_STEP }])
  }

  const removeStep = (index: number) => {
    setNewCampaignSteps(prev => prev.filter((_, i) => i !== index))
  }

  const filtered = predictions.filter(p => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return p.tenant_name.toLowerCase().includes(q) || p.unit_number.toLowerCase().includes(q) ||
             p.facility_name.toLowerCase().includes(q)
    }
    return true
  })

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const muted = darkMode ? 'text-slate-400' : 'text-slate-500'
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`

  const atRiskRevenue = predictions
    .filter(p => p.risk_level === 'critical' || p.risk_level === 'high')
    .reduce((sum, p) => sum + (p.monthly_rate || 0), 0)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { icon: Activity, label: 'Avg Risk Score', value: stats?.avg_risk_score || 0, color: 'text-amber-500' },
          { icon: ShieldAlert, label: 'Critical / High', value: `${stats?.critical_count || 0} / ${stats?.high_count || 0}`, color: 'text-red-500' },
          { icon: TrendingDown, label: 'At-Risk Revenue', value: `$${atRiskRevenue.toLocaleString()}/mo`, color: 'text-orange-500' },
          { icon: Megaphone, label: 'In Campaign', value: stats?.in_campaign_count || 0, color: 'text-blue-500' },
          { icon: CheckCircle2, label: 'Retained', value: stats?.retained_count || 0, color: 'text-green-500' },
          { icon: XCircle, label: 'Churned', value: stats?.churned_count || 0, color: 'text-red-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${card}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} className={color} />
              <span className={`text-xs font-medium ${muted}`}>{label}</span>
            </div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      {/* Risk distribution */}
      <div className={`rounded-xl border p-4 ${card}`}>
        <h3 className="font-semibold text-sm mb-3">Risk Distribution</h3>
        <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
          {[
            { level: 'critical', count: stats?.critical_count || 0, color: 'bg-red-500' },
            { level: 'high', count: stats?.high_count || 0, color: 'bg-orange-500' },
            { level: 'medium', count: stats?.medium_count || 0, color: 'bg-yellow-500' },
            { level: 'low', count: stats?.low_count || 0, color: 'bg-green-500' },
          ].map(({ level, count, color }) => {
            const total = stats?.total_scored || 1
            const pct = (count / total) * 100
            return pct > 0 ? (
              <div
                key={level}
                className={`${color} flex items-center justify-center text-white text-xs font-medium transition-all`}
                style={{ width: `${pct}%` }}
              >
                {pct > 10 ? `${count}` : ''}
              </div>
            ) : null
          })}
        </div>
        <div className="flex gap-4 mt-2">
          {['critical', 'high', 'medium', 'low'].map(level => (
            <div key={level} className="flex items-center gap-1.5 text-xs">
              <div className={`w-2.5 h-2.5 rounded-full ${RISK_BAR_COLORS[level]}`} />
              <span className="capitalize">{level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Retention Campaign Builder */}
      <div className={`rounded-xl border ${card}`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Megaphone size={16} className="text-blue-500" />
            Retention Campaigns ({campaigns.length})
          </h3>
          <button
            onClick={() => setShowCampaignForm(!showCampaignForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
          >
            <Plus size={12} />
            Create Campaign
          </button>
        </div>

        {/* Campaign creation form */}
        {showCampaignForm && (
          <div className={`px-4 py-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${muted}`}>Campaign Name</label>
                  <input
                    type="text"
                    value={newCampaignName}
                    onChange={e => setNewCampaignName(e.target.value)}
                    placeholder="e.g., High-Risk Retention Drip"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${muted}`}>Trigger Risk Level</label>
                  <select
                    value={newCampaignTrigger}
                    onChange={e => setNewCampaignTrigger(e.target.value as 'medium' | 'high' | 'critical')}
                    className={inputCls}
                  >
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-xs font-semibold uppercase ${muted}`}>Campaign Steps</label>
                  <button onClick={addStep} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-medium">
                    <Plus size={12} />
                    Add Step
                  </button>
                </div>
                <div className="space-y-3">
                  {newCampaignSteps.map((step, idx) => (
                    <div key={idx} className={`rounded-lg border p-3 ${darkMode ? 'border-slate-600 bg-slate-750' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium ${muted}`}>Step {idx + 1}</span>
                        {newCampaignSteps.length > 1 && (
                          <button onClick={() => removeStep(idx)} className="text-red-400 hover:text-red-500">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className={`block text-xs mb-1 ${muted}`}>Delay (days)</label>
                          <input
                            type="number"
                            min={0}
                            value={step.delay_days}
                            onChange={e => updateStep(idx, 'delay_days', parseInt(e.target.value) || 0)}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={`block text-xs mb-1 ${muted}`}>Channel</label>
                          <select
                            value={step.channel}
                            onChange={e => updateStep(idx, 'channel', e.target.value)}
                            className={inputCls}
                          >
                            <option value="email">Email</option>
                            <option value="sms">SMS</option>
                            <option value="call">Call</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className={`block text-xs mb-1 ${muted}`}>Subject</label>
                          <input
                            type="text"
                            value={step.subject}
                            onChange={e => updateStep(idx, 'subject', e.target.value)}
                            placeholder="Subject line"
                            className={inputCls}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className={`block text-xs mb-1 ${muted}`}>Body</label>
                          <textarea
                            value={step.body}
                            onChange={e => updateStep(idx, 'body', e.target.value)}
                            placeholder="Message body..."
                            rows={2}
                            className={`${inputCls} resize-none`}
                          />
                        </div>
                        <div>
                          <label className={`block text-xs mb-1 ${muted}`}>Offer (optional)</label>
                          <input
                            type="text"
                            value={step.offer}
                            onChange={e => updateStep(idx, 'offer', e.target.value)}
                            placeholder="e.g., 10% off next month"
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={saveCampaign}
                  disabled={savingCampaign || !newCampaignName.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingCampaign ? 'Saving...' : 'Save Campaign'}
                </button>
                <button
                  onClick={() => setShowCampaignForm(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Campaign list */}
        {campaignsLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw size={16} className="animate-spin text-blue-500" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className={`text-center py-8 ${muted}`}>
            <Megaphone size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No campaigns yet. Create one to start retaining tenants.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {campaigns.map(c => (
              <div key={c.id} className={`flex items-center gap-4 px-4 py-3`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{c.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RISK_COLORS[c.trigger_level]}`}>
                      {c.trigger_level}
                    </span>
                    <span className={`text-xs ${muted}`}>{c.steps.length} step{c.steps.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className={`text-xs ${muted} mt-0.5`}>
                    {c.enrolled_count} enrolled &middot; {c.retained_count} retained
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => enrollMatchingCampaign(c.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    <Users size={12} />
                    Enroll Matching
                  </button>
                  <button
                    onClick={() => toggleCampaign(c.id)}
                    className={`p-1.5 rounded-lg transition-colors ${c.active ? 'text-green-500 hover:text-green-600' : (darkMode ? 'text-slate-500 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500')}`}
                  >
                    {c.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tenants..."
            className={`${inputCls} pl-9`}
          />
        </div>
        <select
          value={riskFilter}
          onChange={e => setRiskFilter(e.target.value)}
          className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300'}`}
        >
          <option value="all">All Risk Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button
          onClick={runScoring}
          disabled={scoring}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:opacity-50"
        >
          <Activity size={14} className={scoring ? 'animate-pulse' : ''} />
          {scoring ? 'Scoring...' : 'Run Churn Scoring'}
        </button>
        <button onClick={fetchPredictions} className={`p-2 rounded-lg border ${darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}`}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Batch action bar */}
      {selectedIds.size > 0 && (
        <div className={`sticky top-0 z-10 rounded-xl border p-3 flex flex-wrap items-center gap-3 ${darkMode ? 'bg-slate-800 border-blue-600' : 'bg-blue-50 border-blue-300'}`}>
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={batchEnrollCampaignId}
              onChange={e => setBatchEnrollCampaignId(e.target.value)}
              className={`px-2 py-1.5 rounded-lg border text-xs ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300'}`}
            >
              <option value="">Select Campaign...</option>
              {campaigns.filter(c => c.active).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={batchEnroll}
              disabled={!batchEnrollCampaignId}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              Enroll in Campaign
            </button>
            <button
              onClick={() => batchStatus('retained')}
              className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700"
            >
              Mark Retained
            </button>
            <button
              onClick={() => batchStatus('churned')}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700"
            >
              Mark Churned
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-blue-100'}`}
            >
              <XCircle size={16} className={muted} />
            </button>
          </div>
        </div>
      )}

      {/* Predictions list */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div className={`px-4 py-3 border-b flex items-center gap-3 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <input
            type="checkbox"
            checked={filtered.length > 0 && selectedIds.size === filtered.length}
            onChange={handleSelectAll}
            className="rounded border-slate-300"
          />
          <h3 className="font-semibold text-sm">Churn Predictions ({filtered.length})</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={20} className="animate-spin text-amber-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className={`text-center py-12 ${muted}`}>
            <UserX size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No predictions yet. Click "Run Churn Scoring" to analyze tenants.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filtered.map(p => (
              <div key={p.id}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${darkMode ? 'hover:bg-slate-750' : 'hover:bg-slate-50'}`}
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={(e) => { e.stopPropagation(); toggleSelect(p.id) }}
                    onClick={e => e.stopPropagation()}
                    className="rounded border-slate-300"
                  />
                  {expandedId === p.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}

                  {/* Risk score circle */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 ${RISK_COLORS[p.risk_level]}`}>
                    {p.risk_score}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{p.tenant_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RISK_COLORS[p.risk_level]}`}>
                        {p.risk_level}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RETENTION_COLORS[p.retention_status]}`}>
                        {p.retention_status}
                      </span>
                      {p.campaign_name && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
                          <Megaphone size={10} />
                          {p.campaign_name}
                        </span>
                      )}
                    </div>
                    <div className={`text-xs ${muted} mt-0.5`}>
                      Unit {p.unit_number} &middot; {p.unit_size} &middot; {p.facility_name}
                      {p.predicted_vacate && ` \u00b7 Est. vacate: ${new Date(p.predicted_vacate).toLocaleDateString()}`}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold text-sm">${(p.monthly_rate || 0).toFixed(0)}/mo</div>
                    {p.days_delinquent > 0 && (
                      <div className="text-xs text-red-500">{p.days_delinquent}d overdue</div>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId === p.id && (
                  <div className={`px-4 pb-4 pt-2 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                    {/* Risk factors */}
                    <div className="mb-4">
                      <h4 className={`text-xs font-semibold ${muted} uppercase mb-2`}>Risk Factors</h4>
                      <div className="space-y-1.5">
                        {p.factors.map((f, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-sm">
                                <span>{f.factor}</span>
                                <span className={`text-xs ${muted}`}>+{f.weight}pts</span>
                              </div>
                              <div className={`text-xs ${muted}`}>{f.detail}</div>
                            </div>
                            <div className={`w-16 h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-600' : 'bg-slate-200'}`}>
                              <div
                                className={`h-full rounded-full ${f.weight > 15 ? 'bg-red-500' : f.weight > 8 ? 'bg-orange-500' : 'bg-yellow-500'}`}
                                style={{ width: `${Math.min(100, (f.weight / 30) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommended actions */}
                    {p.recommended_actions.length > 0 && (
                      <div className="mb-4">
                        <h4 className={`text-xs font-semibold ${muted} uppercase mb-2`}>Recommended Actions</h4>
                        <div className="flex flex-wrap gap-2">
                          {p.recommended_actions.map((a, i) => {
                            const Icon = ACTION_ICONS[a.action] || AlertTriangle
                            return (
                              <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${card}`}>
                                <Icon size={14} className={a.priority === 'urgent' ? 'text-red-500' : a.priority === 'high' ? 'text-orange-500' : 'text-blue-500'} />
                                <span>{a.description}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Retention status update */}
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${muted}`}>Update retention:</span>
                      {['enrolled', 'contacted', 'retained', 'churned'].map(s => (
                        <button
                          key={s}
                          onClick={(e) => { e.stopPropagation(); updateRetention(p.id, s) }}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                            p.retention_status === s
                              ? 'bg-emerald-600 text-white'
                              : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
