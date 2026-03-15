import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, Users, AlertTriangle, CreditCard, CheckCircle2, Clock,
  Search, RefreshCw, ChevronDown, ChevronRight, Plus, ArrowUpDown,
  Wallet, TrendingDown, Shield, Building2
} from 'lucide-react'

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
          setFacilities((data.facilities || []).map((f: any) => ({ id: f.id, name: f.name })))
        }
      } catch { /* silent */ }
    }
    fetchFacilities()
  }, [adminKey])

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

  const dc = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'
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
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: CreditCard, label: 'Autopay Enrolled', value: `${stats?.autopay_count || 0} / ${stats?.total_tenants || 0}`, sub: `${stats?.total_tenants ? Math.round(((stats?.autopay_count || 0) / stats.total_tenants) * 100) : 0}%` },
          { icon: Shield, label: 'Insured', value: tenants.filter(t => t.has_insurance).length, sub: 'with protection' },
          { icon: Clock, label: 'Avg Days Late', value: Math.round(stats?.avg_days_late || 0), sub: 'among late payers' },
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
          <Plus size={14} /> Add Tenant
        </button>
        <button onClick={fetchTenants} className={`p-2 rounded-lg border ${darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}`}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Add tenant form */}
      {showAddForm && (
        <div className={`rounded-xl border p-4 ${card}`}>
          <h3 className="font-semibold mb-3">Add Tenant</h3>
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

      {/* Tenant list */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div className={`px-4 py-3 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <h3 className="font-semibold text-sm">Tenants ({filtered.length})</h3>
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
                  {expandedId === t.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{t.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] || 'bg-slate-100 text-slate-600'}`}>
                        {t.status}
                      </span>
                      {t.days_delinquent > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          {t.days_delinquent}d late
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
                    {t.autopay_enabled && <CreditCard size={14} className="text-emerald-500" title="Autopay enabled" />}
                    {t.has_insurance && <Shield size={14} className="text-blue-500" title="Insured" />}
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
