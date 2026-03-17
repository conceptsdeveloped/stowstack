import { useState, useEffect } from 'react'
import {
  Loader2, Radar, Building2, GraduationCap, Home, Truck, Star,
  MapPin, ExternalLink, Users, DollarSign, Calendar, Save,
  Shield, Heart, TrendingUp, ScanSearch
} from 'lucide-react'
import { Facility } from './types'

/* ── Types ── */

interface Competitor {
  name: string
  address: string
  rating: number | null
  reviewCount: number
  distance_miles: number | null
  mapsUrl: string | null
  website: string | null
  source: string
}

interface DemandDriver {
  name: string
  category: string
  address: string
  distance_miles: number | null
  source: string
}

interface Demographics {
  zip?: string
  population?: number
  median_income?: number
  median_age?: number
  owner_occupied?: number
  renter_occupied?: number
  renter_pct?: number
  median_home_value?: number
  source?: string
}

interface MarketIntel {
  id: string
  facility_id: string
  last_scanned: string
  competitors: Competitor[]
  demand_drivers: DemandDriver[]
  demographics: Demographics
  manual_notes: string | null
  operator_overrides: Record<string, unknown>
}

const CATEGORY_LABELS: Record<string, string> = {
  apartment_complex: 'Apartment Complexes',
  university: 'Universities',
  military_base: 'Military Bases',
  real_estate: 'Real Estate Offices',
  moving_company: 'Moving Companies',
  senior_living: 'Senior Living',
}

const CATEGORY_ICONS: Record<string, typeof Building2> = {
  apartment_complex: Building2,
  university: GraduationCap,
  military_base: Shield,
  real_estate: Home,
  moving_company: Truck,
  senior_living: Heart,
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-slate-400">No rating</span>
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500 text-sm font-semibold">
      {Array.from({ length: full }, (_, i) => <Star key={i} size={12} fill="currentColor" />)}
      {half && <Star size={12} fill="currentColor" className="opacity-50" />}
      <span className="ml-0.5">{rating}</span>
    </span>
  )
}

export default function MarketIntelligence({ facility, adminKey, darkMode }: {
  facility: Facility
  adminKey: string
  darkMode: boolean
}) {
  const [intel, setIntel] = useState<MarketIntel | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)

  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
  const statCard = darkMode ? 'bg-slate-700/50' : 'bg-slate-50'

  useEffect(() => {
    fetch(`/api/market-intel?facilityId=${facility.id}`, {
      headers: { 'X-Admin-Key': adminKey },
    })
      .then(r => r.json())
      .then(data => {
        if (data.intel) {
          setIntel(data.intel)
          setNotes(data.intel.manual_notes || '')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [facility.id, adminKey])

  async function runScan() {
    setScanning(true)
    try {
      const res = await fetch('/api/market-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ facilityId: facility.id }),
      })
      const data = await res.json()
      if (data.intel) {
        setIntel(data.intel)
        setNotes(data.intel.manual_notes || '')
      } else if (data.error) {
        alert(`Scan failed: ${data.error}`)
      }
    } catch (err) {
      alert(`Scan failed: ${err instanceof Error ? err.message : 'Network error'}`)
    } finally {
      setScanning(false)
    }
  }

  async function saveNotes() {
    setSavingNotes(true)
    try {
      const res = await fetch('/api/market-intel', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ facilityId: facility.id, manual_notes: notes }),
      })
      const data = await res.json()
      if (data.intel) setIntel(data.intel)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } catch {}
    setSavingNotes(false)
  }

  if (loading) {
    return (
      <div className={`border rounded-xl p-6 ${card}`}>
        <div className="flex justify-center py-4">
          <Loader2 size={20} className="animate-spin text-emerald-500" />
        </div>
      </div>
    )
  }

  const competitors = intel?.competitors || []
  const demandDrivers = intel?.demand_drivers || []
  const demographics = intel?.demographics || {}
  const hasDemographics = demographics.population || demographics.median_income

  // Competitor summary
  const avgRating = competitors.length
    ? Math.round((competitors.reduce((s, c) => s + (c.rating || 0), 0) / competitors.filter(c => c.rating).length) * 10) / 10
    : 0

  // Group demand drivers by category
  const driversByCategory: Record<string, DemandDriver[]> = {}
  demandDrivers.forEach(d => {
    if (!driversByCategory[d.category]) driversByCategory[d.category] = []
    driversByCategory[d.category].push(d)
  })

  // Demand summary
  const driverSummary = Object.entries(driversByCategory)
    .map(([cat, items]) => `${items.length} ${CATEGORY_LABELS[cat]?.toLowerCase() || cat}`)
    .join(', ')

  return (
    <div className={`border rounded-xl ${card}`}>
      <div className="px-5 py-4 flex items-center justify-between">
        <div>
          <h4 className={`text-sm font-semibold flex items-center gap-2 ${text}`}>
            <Radar size={14} className="text-emerald-500" />
            Market Intelligence
          </h4>
          {intel?.last_scanned && (
            <p className={`text-xs ${sub} mt-0.5`}>
              Last scanned {new Date(intel.last_scanned).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40"
        >
          {scanning ? <Loader2 size={12} className="animate-spin" /> : <ScanSearch size={12} />}
          {scanning ? 'Scanning...' : 'Scan Market'}
        </button>
      </div>

      {!intel && !scanning && (
        <div className={`px-5 pb-5 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
          <p className={`text-sm ${sub} py-6 text-center`}>
            No market data yet. Click "Scan Market" to analyze competitors, demand drivers, and local demographics.
          </p>
        </div>
      )}

      {scanning && (
        <div className={`px-5 pb-5 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
          <div className="flex flex-col items-center gap-2 py-8">
            <Loader2 size={24} className="animate-spin text-emerald-500" />
            <p className={`text-sm ${text}`}>Scanning market environment...</p>
            <p className={`text-xs ${sub}`}>Searching competitors, demand drivers, and census data</p>
          </div>
        </div>
      )}

      {intel && !scanning && (
        <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>

          {/* Competitors Section */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className={`text-xs font-semibold uppercase tracking-wide ${sub}`}>Competitive Landscape</h5>
              {competitors.length > 0 && (
                <span className={`text-xs ${sub}`}>
                  {competitors.length} competitor{competitors.length !== 1 ? 's' : ''} within 15 miles{avgRating > 0 ? `, avg rating ${avgRating}` : ''}
                  {avgRating > 0 && <Star size={10} className="inline ml-0.5 text-amber-500" fill="currentColor" />}
                </span>
              )}
            </div>
            {competitors.length === 0 ? (
              <p className={`text-sm ${sub}`}>No competitors found nearby.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {competitors.map((c, i) => (
                  <div key={i} className={`p-3 rounded-lg ${statCard}`}>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${text}`}>{c.name}</p>
                        <p className={`text-xs ${sub} truncate mt-0.5`}>{c.address}</p>
                      </div>
                      <div className="flex gap-1.5 ml-2 flex-shrink-0">
                        {c.mapsUrl && (
                          <a href={c.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-600">
                            <MapPin size={12} />
                          </a>
                        )}
                        {c.website && (
                          <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-600">
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <StarRating rating={c.rating} />
                      {c.reviewCount > 0 && <span className={`text-xs ${sub}`}>({c.reviewCount} reviews)</span>}
                      {c.distance_miles !== null && (
                        <span className={`text-xs ${sub} ml-auto`}>{c.distance_miles} mi</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Demand Drivers Section */}
          <div className={`px-5 py-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="flex items-center justify-between mb-3">
              <h5 className={`text-xs font-semibold uppercase tracking-wide ${sub}`}>Local Demand Drivers</h5>
              {demandDrivers.length > 0 && (
                <span className={`text-xs ${sub}`}>{driverSummary} within 5 miles</span>
              )}
            </div>
            {demandDrivers.length === 0 ? (
              <p className={`text-sm ${sub}`}>No demand drivers found nearby.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(driversByCategory).map(([cat, items]) => {
                  const Icon = CATEGORY_ICONS[cat] || Building2
                  return (
                    <div key={cat}>
                      <p className={`text-xs font-medium flex items-center gap-1.5 mb-1.5 ${text}`}>
                        <Icon size={12} className="text-emerald-500" />
                        {CATEGORY_LABELS[cat] || cat} ({items.length})
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-5">
                        {items.map((d, i) => (
                          <div key={i} className={`flex items-center justify-between px-2.5 py-1.5 rounded ${statCard}`}>
                            <span className={`text-xs truncate ${text}`}>{d.name}</span>
                            {d.distance_miles !== null && (
                              <span className={`text-xs ${sub} ml-2 flex-shrink-0`}>{d.distance_miles} mi</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Demographics Section */}
          <div className={`px-5 py-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <h5 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${sub}`}>
              Market Demographics {demographics.zip ? `(${demographics.zip})` : ''}
            </h5>
            {!hasDemographics ? (
              <p className={`text-sm ${sub}`}>No demographic data available.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className={`p-3 rounded-lg text-center ${statCard}`}>
                  <Users size={14} className={`mx-auto mb-1 ${sub}`} />
                  <p className={`text-lg font-bold ${text}`}>{demographics.population?.toLocaleString() || '—'}</p>
                  <p className={`text-[10px] uppercase tracking-wide ${sub}`}>Population</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${statCard}`}>
                  <DollarSign size={14} className={`mx-auto mb-1 ${sub}`} />
                  <p className={`text-lg font-bold ${text}`}>
                    {demographics.median_income ? `$${(demographics.median_income / 1000).toFixed(0)}k` : '—'}
                  </p>
                  <p className={`text-[10px] uppercase tracking-wide ${sub}`}>Median Income</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${statCard}`}>
                  <Calendar size={14} className={`mx-auto mb-1 ${sub}`} />
                  <p className={`text-lg font-bold ${text}`}>{demographics.median_age || '—'}</p>
                  <p className={`text-[10px] uppercase tracking-wide ${sub}`}>Median Age</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${(demographics.renter_pct || 0) > 40 ? 'bg-emerald-50 border border-emerald-200' : statCard} ${darkMode && (demographics.renter_pct || 0) > 40 ? '!bg-emerald-900/30 !border-emerald-700' : ''}`}>
                  <TrendingUp size={14} className={`mx-auto mb-1 ${(demographics.renter_pct || 0) > 40 ? 'text-emerald-600' : sub}`} />
                  <p className={`text-lg font-bold ${(demographics.renter_pct || 0) > 40 ? 'text-emerald-700' : text} ${darkMode && (demographics.renter_pct || 0) > 40 ? '!text-emerald-400' : ''}`}>
                    {demographics.renter_pct != null ? `${demographics.renter_pct}%` : '—'}
                  </p>
                  <p className={`text-[10px] uppercase tracking-wide ${(demographics.renter_pct || 0) > 40 ? 'text-emerald-600' : sub}`}>
                    Renter %{(demographics.renter_pct || 0) > 40 ? ' (Strong)' : ''}
                  </p>
                </div>
                <div className={`p-3 rounded-lg text-center ${statCard}`}>
                  <Home size={14} className={`mx-auto mb-1 ${sub}`} />
                  <p className={`text-lg font-bold ${text}`}>
                    {demographics.median_home_value ? `$${(demographics.median_home_value / 1000).toFixed(0)}k` : '—'}
                  </p>
                  <p className={`text-[10px] uppercase tracking-wide ${sub}`}>Home Value</p>
                </div>
              </div>
            )}
          </div>

          {/* Manual Notes Section */}
          <div className={`px-5 py-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <h5 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${sub}`}>Operator Market Notes</h5>
            <p className={`text-xs ${sub} mb-2`}>
              Add context the scan cannot find: new developments, competitor pricing changes, local trends, etc.
            </p>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setNotesSaved(false) }}
              rows={3}
              placeholder="e.g., New 200-unit apartment complex breaking ground on Oak St... Public Storage down the road has been raising prices aggressively..."
              className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={saveNotes}
                disabled={savingNotes}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40"
              >
                {savingNotes ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save Notes
              </button>
              {notesSaved && <span className="text-xs text-emerald-500">Saved</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
