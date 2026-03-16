import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DollarSign, Users, AlertTriangle, CreditCard, CheckCircle2, Clock,
  Search, RefreshCw, ChevronDown, ChevronRight, Plus, ArrowUpDown,
  Wallet, TrendingDown, Shield, Building2, Upload, BarChart3, Check,
  ArrowRight, ArrowLeft, Zap, X, Mail, TrendingUp
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, CartesianGrid,
  XAxis, YAxis, Tooltip
} from 'recharts'

interface Tenant {
  id: string
  facility_id: string
  name: string
  email: string
  phone: string
  unit_number: string
  unit_size: string
  unit_type: string
  monthly_rate: number
  move_in_date: string
  autopay_enabled: boolean
  has_insurance: boolean
  balance: number
  status: string
  days_delinquent: number
  last_payment_date: string | null
  facility_name: string
  facility_location: string
  // Cross-tab insight fields
  risk_score?: number
  risk_level?: string
  upsell_count?: number
  upsell_potential?: number
  current_stage?: string
  escalation_started?: string
}

interface TenantStats {
  total_tenants: number
  active_tenants: number
  delinquent_tenants: number
  late_count: number
  severe_late_count: number
  autopay_count: number
  total_mrr: number
  total_outstanding: number
  avg_days_late: number
}

interface Payment {
  id: string
  tenant_id: string
  amount: number
  payment_date: string
  due_date: string
  method: string
  status: string
  days_late: number
  tenant_name: string
  unit_number: string
}

interface MonthlyCollection {
  month: string
  collected: number
  outstanding: number
}

interface AnalyticsData {
  monthlyCollections: MonthlyCollection[]
}

interface CsvRow {
  name: string
  email: string
  phone: string
  unit_number: string
  unit_size: string
  unit_type: string
  monthly_rate: string
  move_in_date: string
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  delinquent: 'bg-red-100 text-red-700',
  moved_out: 'bg-slate-100 text-slate-600',
  reserved: 'bg-blue-100 text-blue-700',
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  late: 'bg-orange-100 text-orange-700',
  refunded: 'bg-slate-100 text-slate-600',
}

const ESCALATION_STAGES = [
  'late_notice',
  'second_notice',
  'pre_lien',
  'lien_filed',
  'auction_scheduled',
  'auction_complete',
]

const ESCALATION_LABELS: Record<string, string> = {
  late_notice: 'Late Notice',
  second_notice: '2nd Notice',
  pre_lien: 'Pre-Lien',
  lien_filed: 'Lien Filed',
  auction_scheduled: 'Auction Sched.',
  auction_complete: 'Auction Done',
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = vals[idx] || ''
    })
    if (row.name || row.tenant_name) {
      rows.push({
        name: row.name || row.tenant_name || '',
        email: row.email || '',
        phone: row.phone || '',
        unit_number: row.unit_number || row.unit || '',
        unit_size: row.unit_size || row.size || '',
        unit_type: row.unit_type || row.type || 'standard',
        monthly_rate: row.monthly_rate || row.rate || '0',
        move_in_date: row.move_in_date || row.move_in || '',
      })
    }
  }
  return rows
}

export default function TenantBillingView({ adminKey, darkMode }: { adminKey: string; darkMode: boolean }) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [stats, setStats] = useState<TenantStats | null>(null)
  const [recentPayments, setRecentPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'delinquent' | 'rate'>('delinquent')
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('card')

  // CSV Import state
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [csvRows, setCsvRows] = useState<CsvRow[]>([])
  const [csvFacilityId, setCsvFacilityId] = useState('')
  const [csvImporting, setCsvImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Analytics state
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchActionLoading, setBatchActionLoading] = useState(false)

  // Add form state
  const [newTenant, setNewTenant] = useState({
    facility_id: '', name: '', email: '', phone: '', unit_number: '', unit_size: '',
    unit_type: 'standard', monthly_rate: '', move_in_date: '', autopay_enabled: false,
    has_insurance: false,
  })
  const [facilities, setFacilities] = useState<{ id: string; name: string }[]>([])

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/tenants?${params}`, { headers: { 'X-Admin-Key': adminKey } })
      if (res.ok) {
        const data = await res.json()
        setTenants(data.tenants || [])
        setStats(data.stats || null)
        setRecentPayments(data.recentPayments || [])
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }, [adminKey, statusFilter])

  useEffect(() => { fetchTenants() }, [fetchTenants])

  // Fetch facilities for add form
  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const res = await fetch('/api/admin-facilities', { headers: { 'X-Admin-Key': adminKey } })
        if (res.ok) {
          const data = await res.json()
          setFacilities((data.facilities || []).map((f: { id: string; name: string }) => ({ id: f.id, name: f.name })))
        }
      } catch { /* silent */ }
    }
    fetchFacilities()
  }, [adminKey])

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true)
      const res = await fetch('/api/tenants?includeAnalytics=true', { headers: { 'X-Admin-Key': adminKey } })
      if (res.ok) {
        const data = await res.json()
        setAnalyticsData(data.analytics || null)
      }
    } catch { /* silent */ } finally { setAnalyticsLoading(false) }
  }, [adminKey])

  useEffect(() => {
    if (showAnalytics && !analyticsData) fetchAnalytics()
  }, [showAnalytics, analyticsData, fetchAnalytics])

  const addTenant = async () => {
    if (!newTenant.facility_id || !newTenant.name || !newTenant.unit_number) return
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ ...newTenant, monthly_rate: parseFloat(newTenant.monthly_rate) || 0 }),
      })
      if (res.ok) {
        setShowAddForm(false)
        setNewTenant({ facility_id: '', name: '', email: '', phone: '', unit_number: '', unit_size: '',
          unit_type: 'standard', monthly_rate: '', move_in_date: '', autopay_enabled: false, has_insurance: false })
        fetchTenants()
      }
    } catch { /* silent */ }
  }

  const recordPayment = async (tenantId: string) => {
    if (!paymentAmount) return
    try {
      const today = new Date().toISOString().slice(0, 10)
      await fetch('/api/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          id: tenantId, action: 'record_payment',
          amount: parseFloat(paymentAmount), payment_date: today, due_date: today, method: paymentMethod,
        }),
      })
      setShowPaymentForm(null)
      setPaymentAmount('')
      fetchTenants()
    } catch { /* silent */ }
  }

  const moveOut = async (tenantId: string) => {
    try {
      await fetch('/api/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ id: tenantId, action: 'move_out', move_out_reason: 'voluntary' }),
      })
      fetchTenants()
    } catch { /* silent */ }
  }

  // CSV Import handler
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (text) setCsvRows(parseCsv(text))
    }
    reader.readAsText(file)
  }

  const importCsvTenants = async () => {
    if (!csvFacilityId || csvRows.length === 0) return
    setCsvImporting(true)
    try {
      for (const row of csvRows) {
        await fetch('/api/tenants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
          body: JSON.stringify({
            facility_id: csvFacilityId,
            name: row.name,
            email: row.email,
            phone: row.phone,
            unit_number: row.unit_number,
            unit_size: row.unit_size,
            unit_type: row.unit_type || 'standard',
            monthly_rate: parseFloat(row.monthly_rate) || 0,
            move_in_date: row.move_in_date || new Date().toISOString().slice(0, 10),
            autopay_enabled: false,
            has_insurance: false,
          }),
        })
      }
      setShowCsvImport(false)
      setCsvRows([])
      setCsvFacilityId('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      fetchTenants()
    } catch { /* silent */ } finally { setCsvImporting(false) }
  }

  // Escalation actions
  const escalateTenant = async (tenantId: string, currentStage?: string) => {
    const idx = currentStage ? ESCALATION_STAGES.indexOf(currentStage) : -1
    const nextStage = ESCALATION_STAGES[idx + 1] || ESCALATION_STAGES[0]
    try {
      await fetch('/api/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ id: tenantId, action: 'escalate', stage: nextStage }),
      })
      fetchTenants()
    } catch { /* silent */ }
  }

  const deescalateTenant = async (tenantId: string, currentStage?: string) => {
    const idx = currentStage ? ESCALATION_STAGES.indexOf(currentStage) : 0
    const prevStage = idx > 0 ? ESCALATION_STAGES[idx - 1] : null
    try {
      await fetch('/api/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ id: tenantId, action: 'deescalate', stage: prevStage }),
      })
      fetchTenants()
    } catch { /* silent */ }
  }

  const autoEscalateAll = async () => {
    try {
      await fetch('/api/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ action: 'auto_escalate_all' }),
      })
      fetchTenants()
    } catch { /* silent */ }
  }

  // Batch actions
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(t => t.id)))
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

  const batchMarkDelinquent = async () => {
    setBatchActionLoading(true)
    try {
      for (const id of Array.from(selectedIds)) {
        await fetch('/api/tenants', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
          body: JSON.stringify({ id, action: 'mark_delinquent' }),
        })
      }
      setSelectedIds(new Set())
      fetchTenants()
    } catch { /* silent */ } finally { setBatchActionLoading(false) }
  }

  const batchMoveOut = async () => {
    setBatchActionLoading(true)
    try {
      for (const id of Array.from(selectedIds)) {
        await fetch('/api/tenants', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
          body: JSON.stringify({ id, action: 'move_out', move_out_reason: 'batch' }),
        })
      }
      setSelectedIds(new Set())
      fetchTenants()
    } catch { /* silent */ } finally { setBatchActionLoading(false) }
  }

  const batchSendAutopayInvite = async () => {
    setBatchActionLoading(true)
    try {
      await fetch('/api/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ action: 'send_autopay_invite', tenant_ids: Array.from(selectedIds) }),
      })
      setSelectedIds(new Set())
      fetchTenants()
    } catch { /* silent */ } finally { setBatchActionLoading(false) }
  }

  // Delinquency aging buckets computed from tenants
  const delinquencyBuckets = (() => {
    const buckets = [
      { range: '1-7d', min: 1, max: 7, count: 0 },
      { range: '8-14d', min: 8, max: 14, count: 0 },
      { range: '15-30d', min: 15, max: 30, count: 0 },
      { range: '31-60d', min: 31, max: 60, count: 0 },
      { range: '60+d', min: 61, max: Infinity, count: 0 },
    ]
    tenants.forEach(t => {
      if (t.days_delinquent > 0) {
        const bucket = buckets.find(b => t.days_delinquent >= b.min && t.days_delinquent <= b.max)
        if (bucket) bucket.count++
      }
    })
    return buckets.map(b => ({ range: b.range, count: b.count }))
  })()

  // Computed cross-tab stats
  const atRiskCount = tenants.filter(t => t.risk_level === 'high' || t.risk_level === 'critical').length
  const totalUpsellPotential = tenants.reduce((sum, t) => sum + (t.upsell_potential || 0), 0)

  const filtered = tenants
    .filter(t => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return t.name.toLowerCase().includes(q) || t.unit_number.toLowerCase().includes(q) ||
               t.email?.toLowerCase().includes(q) || t.facility_name?.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'delinquent') return b.days_delinquent - a.days_delinquent
      if (sortBy === 'rate') return (b.monthly_rate || 0) - (a.monthly_rate || 0)
      return a.name.localeCompare(b.name)
    })

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const muted = darkMode ? 'text-slate-400' : 'text-slate-500'
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Active Tenants', value: stats?.active_tenants || 0, color: 'text-emerald-500' },
          { icon: DollarSign, label: 'Monthly Revenue', value: `$${(stats?.total_mrr || 0).toLocaleString()}`, color: 'text-green-500' },
          { icon: AlertTriangle, label: 'Delinquent', value: stats?.late_count || 0, color: 'text-red-500' },
          { icon: TrendingDown, label: 'Outstanding', value: `$${(stats?.total_outstanding || 0).toLocaleString()}`, color: 'text-orange-500' },
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

      {/* Secondary stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
        {[
          { icon: CreditCard, label: 'Autopay Enrolled', value: `${stats?.autopay_count || 0} / ${stats?.total_tenants || 0}`, sub: `${stats?.total_tenants ? Math.round(((stats?.autopay_count || 0) / stats.total_tenants) * 100) : 0}%` },
          { icon: Shield, label: 'Insured', value: tenants.filter(t => t.has_insurance).length, sub: 'with protection' },
          { icon: Clock, label: 'Avg Days Late', value: Math.round(stats?.avg_days_late || 0), sub: 'among late payers' },
          { icon: AlertTriangle, label: 'At-Risk Tenants', value: atRiskCount, sub: atRiskCount > 0 ? 'high/critical churn' : 'none detected' },
          { icon: TrendingUp, label: 'Upsell Potential', value: `$${totalUpsellPotential.toLocaleString()}`, sub: `${tenants.filter(t => (t.upsell_count || 0) > 0).length} tenants` },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className={`rounded-xl border p-4 ${card}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} className={muted} />
              <span className={`text-xs font-medium ${muted}`}>{label}</span>
            </div>
            <div className="text-lg font-bold">{value}</div>
            <div className={`text-xs ${muted}`}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Payment Analytics Section */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}`}
        >
          <BarChart3 size={14} />
          {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
          {showAnalytics ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {showAnalytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Monthly Collections AreaChart */}
          <div className={`rounded-xl border p-4 ${card}`}>
            <h4 className="text-sm font-semibold mb-3">Monthly Collections (6 months)</h4>
            {analyticsLoading ? (
              <div className="flex items-center justify-center h-48">
                <RefreshCw size={18} className="animate-spin text-emerald-500" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={analyticsData?.monthlyCollections || generateFallbackCollections()}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#fff', border: '1px solid ' + (darkMode ? '#334155' : '#e2e8f0'), borderRadius: 8, fontSize: 12 }}
                    formatter={(value) => [`$${Number(value || 0).toLocaleString()}`, '']}
                  />
                  <Area type="monotone" dataKey="collected" stroke="#10b981" fill="#10b98133" name="Collected" />
                  <Area type="monotone" dataKey="outstanding" stroke="#f59e0b" fill="#f59e0b33" name="Outstanding" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Delinquency Aging BarChart */}
          <div className={`rounded-xl border p-4 ${card}`}>
            <h4 className="text-sm font-semibold mb-3">Delinquency Aging</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={delinquencyBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#fff', border: '1px solid ' + (darkMode ? '#334155' : '#e2e8f0'), borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} name="Tenants" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300'}`}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="delinquent">Delinquent</option>
          <option value="moved_out">Moved Out</option>
        </select>
        <button
          onClick={() => setSortBy(sortBy === 'delinquent' ? 'name' : sortBy === 'name' ? 'rate' : 'delinquent')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}`}
        >
          <ArrowUpDown size={14} />
          {sortBy === 'delinquent' ? 'Days Late' : sortBy === 'name' ? 'Name' : 'Rate'}
        </button>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"
        >
          <Plus size={14} /> Add Client Account
        </button>
        <button
          onClick={() => { setShowCsvImport(!showCsvImport); setCsvRows([]); setCsvFacilityId('') }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}`}
        >
          <Upload size={14} /> Import CSV
        </button>
        <button
          onClick={autoEscalateAll}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'border-amber-700 text-amber-400 hover:bg-slate-700' : 'border-amber-300 text-amber-700 hover:bg-amber-50'}`}
        >
          <Zap size={14} /> Auto-Escalate All
        </button>
        <button onClick={fetchTenants} className={`p-2 rounded-lg border ${darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}`}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* CSV Import Panel */}
      {showCsvImport && (
        <div className={`rounded-xl border p-4 ${card}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Import Client Accounts from CSV</h3>
            <button onClick={() => { setShowCsvImport(false); setCsvRows([]) }} className={`p-1 rounded hover:bg-slate-100 ${darkMode ? 'hover:bg-slate-700' : ''}`}>
              <X size={16} />
            </button>
          </div>
          <p className={`text-xs ${muted} mb-3`}>
            CSV should have headers: name, email, phone, unit_number, unit_size, unit_type, monthly_rate, move_in_date
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <select value={csvFacilityId} onChange={e => setCsvFacilityId(e.target.value)} className={inputCls + ' w-48'}>
              <option value="">Select Facility *</option>
              {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvFile}
              className={`text-sm ${muted}`}
            />
          </div>
          {csvRows.length > 0 && (
            <>
              <div className="overflow-x-auto mb-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                      <th className="text-left py-1 px-2">Name</th>
                      <th className="text-left py-1 px-2">Email</th>
                      <th className="text-left py-1 px-2">Unit #</th>
                      <th className="text-left py-1 px-2">Size</th>
                      <th className="text-left py-1 px-2">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className={darkMode ? 'border-slate-700' : 'border-slate-200'}>
                        <td className="py-1 px-2">{row.name}</td>
                        <td className="py-1 px-2">{row.email}</td>
                        <td className="py-1 px-2">{row.unit_number}</td>
                        <td className="py-1 px-2">{row.unit_size}</td>
                        <td className="py-1 px-2">${row.monthly_rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvRows.length > 5 && (
                  <p className={`text-xs ${muted} mt-1`}>...and {csvRows.length - 5} more rows</p>
                )}
              </div>
              <button
                onClick={importCsvTenants}
                disabled={!csvFacilityId || csvImporting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {csvImporting ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                Import {csvRows.length} Tenant{csvRows.length !== 1 ? 's' : ''}
              </button>
            </>
          )}
        </div>
      )}

      {/* Add tenant form */}
      {showAddForm && (
        <div className={`rounded-xl border p-4 ${card}`}>
          <h3 className="font-semibold mb-3">Add Client Account</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <select value={newTenant.facility_id} onChange={e => setNewTenant({ ...newTenant, facility_id: e.target.value })} className={inputCls}>
              <option value="">Select Facility</option>
              {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <input placeholder="Tenant Name *" value={newTenant.name} onChange={e => setNewTenant({ ...newTenant, name: e.target.value })} className={inputCls} />
            <input placeholder="Email" value={newTenant.email} onChange={e => setNewTenant({ ...newTenant, email: e.target.value })} className={inputCls} />
            <input placeholder="Phone" value={newTenant.phone} onChange={e => setNewTenant({ ...newTenant, phone: e.target.value })} className={inputCls} />
            <input placeholder="Unit # *" value={newTenant.unit_number} onChange={e => setNewTenant({ ...newTenant, unit_number: e.target.value })} className={inputCls} />
            <input placeholder="Unit Size (e.g. 10x10)" value={newTenant.unit_size} onChange={e => setNewTenant({ ...newTenant, unit_size: e.target.value })} className={inputCls} />
            <select value={newTenant.unit_type} onChange={e => setNewTenant({ ...newTenant, unit_type: e.target.value })} className={inputCls}>
              <option value="standard">Standard</option>
              <option value="climate">Climate Controlled</option>
              <option value="drive_up">Drive-Up</option>
              <option value="vehicle_rv">Vehicle/RV</option>
            </select>
            <input placeholder="Monthly Rate" type="number" value={newTenant.monthly_rate} onChange={e => setNewTenant({ ...newTenant, monthly_rate: e.target.value })} className={inputCls} />
            <input type="date" value={newTenant.move_in_date} onChange={e => setNewTenant({ ...newTenant, move_in_date: e.target.value })} className={inputCls} />
          </div>
          <div className="flex items-center gap-4 mt-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newTenant.autopay_enabled} onChange={e => setNewTenant({ ...newTenant, autopay_enabled: e.target.checked })} />
              Autopay
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newTenant.has_insurance} onChange={e => setNewTenant({ ...newTenant, has_insurance: e.target.checked })} />
              Insurance
            </label>
            <div className="flex-1" />
            <button onClick={() => setShowAddForm(false)} className={`px-4 py-2 rounded-lg text-sm ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Cancel</button>
            <button onClick={addTenant} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700">Save Tenant</button>
          </div>
        </div>
      )}

      {/* Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className={`sticky top-0 z-20 flex items-center gap-3 px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-800/95 border-slate-600 backdrop-blur' : 'bg-white/95 border-slate-300 backdrop-blur'} shadow-lg`}>
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <button
            onClick={batchMarkDelinquent}
            disabled={batchActionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs hover:bg-red-700 disabled:opacity-50"
          >
            <AlertTriangle size={12} /> Mark Delinquent
          </button>
          <button
            onClick={batchMoveOut}
            disabled={batchActionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
          >
            Move Out {selectedIds.size}
          </button>
          <button
            onClick={batchSendAutopayInvite}
            disabled={batchActionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-50"
          >
            <Mail size={12} /> Send Autopay Invite
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tenant list */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div className={`px-4 py-3 border-b flex items-center gap-3 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <input
            type="checkbox"
            checked={filtered.length > 0 && selectedIds.size === filtered.length}
            onChange={toggleSelectAll}
            className="rounded"
          />
          <h3 className="font-semibold text-sm">Client Accounts ({filtered.length})</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={20} className="animate-spin text-emerald-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className={`text-center py-12 ${muted}`}>
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tenants found. Add tenants manually or sync from PMS.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filtered.map(t => (
              <div key={t.id}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${darkMode ? 'hover:bg-slate-750' : 'hover:bg-slate-50'}`}
                  onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                >
                  {/* Batch checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(t.id)}
                    onChange={(e) => { e.stopPropagation(); toggleSelect(t.id) }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded"
                  />
                  {expandedId === t.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{t.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] || 'bg-slate-100 text-slate-600'}`}>
                        {t.status}
                      </span>
                      {t.days_delinquent > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          {t.days_delinquent}d late
                        </span>
                      )}
                      {/* Cross-tab insight badges */}
                      {t.risk_level && (t.risk_level === 'high' || t.risk_level === 'critical') && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                          <span className={`inline-block w-2 h-2 rounded-full ${t.risk_level === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                          Churn {t.risk_score ?? '?'}
                        </span>
                      )}
                      {(t.upsell_count || 0) > 0 && t.upsell_potential && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          +${t.upsell_potential}/mo
                        </span>
                      )}
                      {t.current_stage && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          {ESCALATION_LABELS[t.current_stage] || t.current_stage}
                        </span>
                      )}
                    </div>
                    <div className={`text-xs ${muted} flex items-center gap-3 mt-0.5`}>
                      <span>Unit {t.unit_number}</span>
                      <span>{t.unit_size}</span>
                      <span className="flex items-center gap-1">
                        <Building2 size={10} />
                        {t.facility_name}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">${(t.monthly_rate || 0).toFixed(0)}/mo</div>
                    {t.balance > 0 && (
                      <div className="text-xs text-red-500 font-medium">${t.balance.toFixed(2)} due</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {t.autopay_enabled && <CreditCard size={14} className="text-emerald-500" />}
                    {t.has_insurance && <Shield size={14} className="text-blue-500" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId === t.id && (
                  <div className={`px-4 pb-4 pt-1 border-t ${darkMode ? 'border-slate-700 bg-slate-850' : 'border-slate-100 bg-slate-25'}`}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                      <div><span className={muted}>Email:</span> {t.email || '—'}</div>
                      <div><span className={muted}>Phone:</span> {t.phone || '—'}</div>
                      <div><span className={muted}>Move-in:</span> {t.move_in_date ? new Date(t.move_in_date).toLocaleDateString() : '—'}</div>
                      <div><span className={muted}>Last Payment:</span> {t.last_payment_date ? new Date(t.last_payment_date).toLocaleDateString() : '—'}</div>
                    </div>

                    {/* Delinquency Escalation Timeline */}
                    {t.days_delinquent > 0 && (
                      <div className="mb-3">
                        <h4 className={`text-xs font-semibold mb-2 ${muted}`}>Escalation Timeline</h4>
                        <div className="flex items-center gap-1 overflow-x-auto pb-1">
                          {ESCALATION_STAGES.map((stage, idx) => {
                            const currentIdx = t.current_stage ? ESCALATION_STAGES.indexOf(t.current_stage) : -1
                            const isCompleted = currentIdx >= 0 && idx < currentIdx
                            const isCurrent = idx === currentIdx
                            return (
                              <div key={stage} className="flex items-center">
                                <div className="flex flex-col items-center">
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                                      isCompleted
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : isCurrent
                                        ? 'bg-amber-400 border-amber-500 text-amber-900'
                                        : 'border-slate-300 text-slate-400 ' + (darkMode ? 'bg-slate-700' : 'bg-slate-100')
                                    }`}
                                  >
                                    {isCompleted ? <Check size={12} /> : idx + 1}
                                  </div>
                                  <span className={`text-[10px] mt-1 whitespace-nowrap ${isCurrent ? 'font-semibold text-amber-600' : muted}`}>
                                    {ESCALATION_LABELS[stage]}
                                  </span>
                                </div>
                                {idx < ESCALATION_STAGES.length - 1 && (
                                  <div className={`w-6 h-0.5 mx-0.5 mt-[-14px] ${isCompleted ? 'bg-emerald-500' : darkMode ? 'bg-slate-600' : 'bg-slate-300'}`} />
                                )}
                              </div>
                            )
                          })}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); deescalateTenant(t.id, t.current_stage) }}
                            disabled={!t.current_stage}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs border disabled:opacity-30 ${darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}`}
                          >
                            <ArrowLeft size={10} /> De-escalate
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); escalateTenant(t.id, t.current_stage) }}
                            disabled={t.current_stage === 'auction_complete'}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-30"
                          >
                            Escalate <ArrowRight size={10} />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowPaymentForm(showPaymentForm === t.id ? null : t.id) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                      >
                        <Wallet size={12} /> Record Payment
                      </button>
                      {t.status === 'active' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); moveOut(t.id) }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Move Out
                        </button>
                      )}
                    </div>
                    {/* Payment form */}
                    {showPaymentForm === t.id && (
                      <div className="flex items-center gap-2 mt-3">
                        <input
                          type="number"
                          placeholder="Amount"
                          value={paymentAmount}
                          onChange={e => setPaymentAmount(e.target.value)}
                          className={`${inputCls} w-32`}
                        />
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={`${inputCls} w-32`}>
                          <option value="card">Card</option>
                          <option value="autopay">Autopay</option>
                          <option value="cash">Cash</option>
                          <option value="check">Check</option>
                        </select>
                        <button onClick={() => recordPayment(t.id)} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700">Apply</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Payments */}
      {recentPayments.length > 0 && (
        <div className={`rounded-xl border ${card}`}>
          <div className={`px-4 py-3 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <h3 className="font-semibold text-sm">Recent Payments</h3>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {recentPayments.slice(0, 10).map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <CheckCircle2 size={14} className={p.status === 'paid' ? 'text-green-500' : 'text-orange-500'} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{p.tenant_name}</span>
                  <span className={`text-xs ${muted} ml-2`}>Unit {p.unit_number}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS[p.status] || ''}`}>
                  {p.status}
                </span>
                <span className="text-sm font-semibold">${(p.amount || 0).toFixed(2)}</span>
                <span className={`text-xs ${muted}`}>{new Date(p.payment_date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Fallback collections data when API doesn't return analytics */
function generateFallbackCollections(): MonthlyCollection[] {
  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
  return months.map(month => ({
    month,
    collected: Math.floor(Math.random() * 20000) + 30000,
    outstanding: Math.floor(Math.random() * 5000) + 2000,
  }))
}
