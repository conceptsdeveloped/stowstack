import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, Save, Loader2, AlertCircle, CheckCircle2,
  Upload, ChevronDown, ChevronUp, Pencil, X, Package, DollarSign, Percent, ClipboardPaste,
  FileUp, FileCheck2, FileWarning
} from 'lucide-react'
import { Facility } from './types'
import { parseStorEdgeCSV, type ParsedReport, type StorEdgeReportType } from '@/utils/storedge-parser'

/* ── Types ── */

interface PMSSnapshot {
  id?: string
  facility_id: string
  snapshot_date: string
  total_units: number | null
  occupied_units: number | null
  occupancy_pct: number | null
  total_sqft: number | null
  occupied_sqft: number | null
  gross_potential: number | null
  actual_revenue: number | null
  delinquency_pct: number | null
  move_ins_mtd: number
  move_outs_mtd: number
  notes: string | null
}

interface PMSUnit {
  id?: string
  facility_id: string
  unit_type: string
  size_label: string | null
  width_ft: number | null
  depth_ft: number | null
  sqft: number | null
  floor: string | null
  features: string[]
  total_count: number
  occupied_count: number
  vacant_count?: number
  street_rate: number | null
  actual_avg_rate: number | null
  web_rate: number | null
  push_rate: number | null
  ecri_eligible: number
  last_updated?: string
}

interface PMSSpecial {
  id?: string
  facility_id: string
  name: string
  description: string | null
  applies_to: string[]
  discount_type: string
  discount_value: number | null
  min_lease_months: number
  start_date: string | null
  end_date: string | null
  active: boolean
}

const FEATURES = ['climate', 'drive_up', 'interior', 'elevator', 'power', 'alarmed', 'heated', '1st_floor', '2nd_floor', 'outdoor']
const FEATURE_LABELS: Record<string, string> = {
  climate: 'Climate Controlled', drive_up: 'Drive-Up', interior: 'Interior',
  elevator: 'Elevator Access', power: 'Power Outlet', alarmed: 'Individually Alarmed',
  heated: 'Heated', '1st_floor': '1st Floor', '2nd_floor': '2nd Floor', outdoor: 'Outdoor/Uncovered',
}

const COMMON_UNIT_TYPES = [
  '5×5', '5×10', '5×15', '10×10', '10×15', '10×20', '10×25', '10×30',
  '15×20', '20×20', '20×30', 'Parking', 'RV/Boat',
]

function emptyUnit(facilityId: string): PMSUnit {
  return {
    facility_id: facilityId, unit_type: '', size_label: null, width_ft: null, depth_ft: null,
    sqft: null, floor: null, features: [], total_count: 0, occupied_count: 0,
    street_rate: null, actual_avg_rate: null, web_rate: null, push_rate: null, ecri_eligible: 0,
  }
}

function emptySpecial(facilityId: string): PMSSpecial {
  return {
    facility_id: facilityId, name: '', description: null, applies_to: [],
    discount_type: 'fixed', discount_value: null, min_lease_months: 1,
    start_date: null, end_date: null, active: true,
  }
}

function emptySnapshot(facilityId: string): PMSSnapshot {
  return {
    facility_id: facilityId, snapshot_date: new Date().toISOString().slice(0, 10),
    total_units: null, occupied_units: null, occupancy_pct: null,
    total_sqft: null, occupied_sqft: null, gross_potential: null, actual_revenue: null,
    delinquency_pct: null, move_ins_mtd: 0, move_outs_mtd: 0, notes: null,
  }
}

/* ── Main Component ── */

export default function PMSDataTab({ facility, adminKey, darkMode }: {
  facility: Facility; adminKey: string; darkMode: boolean
}) {
  const [snapshot, setSnapshot] = useState<PMSSnapshot>(emptySnapshot(facility.id))
  const [units, setUnits] = useState<PMSUnit[]>([])
  const [specials, setSpecials] = useState<PMSSpecial[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [editingUnit, setEditingUnit] = useState<PMSUnit | null>(null)
  const [editingSpecial, setEditingSpecial] = useState<PMSSpecial | null>(null)
  const [showPaste, setShowPaste] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [expandedSection, setExpandedSection] = useState<'snapshot' | 'units' | 'specials' | null>('units')
  const [showStorEdgeUpload, setShowStorEdgeUpload] = useState(false)
  const [parsedReports, setParsedReports] = useState<ParsedReport[]>([])
  const [importingReport, setImportingReport] = useState<string | null>(null)
  const [importResults, setImportResults] = useState<Record<string, { success: boolean; msg: string }>>({})

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'} focus:outline-none focus:ring-2 focus:ring-emerald-500/40`
  const btnPrimary = 'bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50'
  const btnSecondary = `px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`

  const flash = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const api = useCallback(async (method: string, body?: Record<string, unknown>) => {
    const opts: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
    }
    if (body) opts.body = JSON.stringify(body)
    const url = method === 'GET'
      ? `/api/facility-pms?facilityId=${facility.id}`
      : '/api/facility-pms'
    const res = await fetch(url, opts)
    if (!res.ok) throw new Error((await res.json()).error || 'Request failed')
    return res.json()
  }, [adminKey, facility.id])

  // Load data
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await api('GET')
        if (cancelled) return
        if (data.snapshot) setSnapshot(data.snapshot)
        if (data.units) setUnits(data.units)
        if (data.specials) setSpecials(data.specials)
      } catch { /* empty */ }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [api])

  // ── Save snapshot ──
  async function saveSnapshot() {
    setSaving('snapshot')
    try {
      const data = await api('POST', { action: 'save_snapshot', ...snapshot })
      setSnapshot(data.snapshot)
      flash('success', 'Facility snapshot saved')
    } catch (err: unknown) { flash('error', err instanceof Error ? err.message : 'Unknown error') }
    setSaving(null)
  }

  // ── Save unit ──
  async function saveUnit(unit: PMSUnit) {
    setSaving('unit')
    try {
      const data = await api('POST', { action: 'save_unit', ...unit })
      setUnits(prev => {
        const idx = prev.findIndex(u => u.unit_type === data.unit.unit_type)
        if (idx >= 0) return [...prev.slice(0, idx), data.unit, ...prev.slice(idx + 1)]
        return [...prev, data.unit]
      })
      setEditingUnit(null)
      flash('success', `Unit type "${data.unit.unit_type}" saved`)
    } catch (err: unknown) { flash('error', err instanceof Error ? err.message : 'Unknown error') }
    setSaving(null)
  }

  // ── Delete unit ──
  async function deleteUnit(unit: PMSUnit) {
    if (!unit.id) return
    setSaving('delete')
    try {
      await api('DELETE', { type: 'unit', id: unit.id })
      setUnits(prev => prev.filter(u => u.id !== unit.id))
      flash('success', `"${unit.unit_type}" removed`)
    } catch (err: unknown) { flash('error', err instanceof Error ? err.message : 'Unknown error') }
    setSaving(null)
  }

  // ── Save special ──
  async function saveSpecial(special: PMSSpecial) {
    setSaving('special')
    try {
      const data = await api('POST', { action: 'save_special', ...special })
      setSpecials(prev => {
        if (special.id) {
          const idx = prev.findIndex(s => s.id === special.id)
          if (idx >= 0) return [...prev.slice(0, idx), data.special, ...prev.slice(idx + 1)]
        }
        return [...prev, data.special]
      })
      setEditingSpecial(null)
      flash('success', `Special "${data.special.name}" saved`)
    } catch (err: unknown) { flash('error', err instanceof Error ? err.message : 'Unknown error') }
    setSaving(null)
  }

  // ── Delete special ──
  async function deleteSpecial(special: PMSSpecial) {
    if (!special.id) return
    setSaving('delete')
    try {
      await api('DELETE', { type: 'special', id: special.id })
      setSpecials(prev => prev.filter(s => s.id !== special.id))
      flash('success', `"${special.name}" removed`)
    } catch (err: unknown) { flash('error', err instanceof Error ? err.message : 'Unknown error') }
    setSaving(null)
  }

  // ── Paste from spreadsheet ──
  function parsePastedUnits() {
    if (!pasteText.trim()) return
    const lines = pasteText.trim().split('\n')
    const parsed: PMSUnit[] = []
    for (const line of lines) {
      const cols = line.split('\t').map(c => c.trim())
      if (cols.length < 3) continue
      const [unitType, totalStr, occupiedStr, rateStr, webRateStr] = cols
      if (!unitType) continue
      parsed.push({
        ...emptyUnit(facility.id),
        unit_type: unitType,
        total_count: parseInt(totalStr) || 0,
        occupied_count: parseInt(occupiedStr) || 0,
        street_rate: parseFloat(rateStr) || null,
        web_rate: parseFloat(webRateStr) || null,
      })
    }
    if (parsed.length === 0) {
      flash('error', 'Could not parse any rows. Expected: Unit Type [tab] Total [tab] Occupied [tab] Rate [tab] Web Rate')
      return
    }
    // Bulk save
    ;(async () => {
      setSaving('bulk')
      try {
        const data = await api('POST', { action: 'bulk_save_units', facility_id: facility.id, units: parsed })
        setUnits(data.units)
        setShowPaste(false)
        setPasteText('')
        flash('success', `${data.units.length} unit types imported`)
      } catch (err: unknown) { flash('error', err instanceof Error ? err.message : 'Unknown error') }
      setSaving(null)
    })()
  }

  // ── storEDGE CSV Upload ──
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    const results: ParsedReport[] = []
    let processed = 0

    for (let i = 0; i < files.length; i++) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        if (text) results.push(parseStorEdgeCSV(text))
        processed++
        if (processed === files.length) {
          setParsedReports(results)
          setImportResults({})
        }
      }
      reader.readAsText(files[i])
    }
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  async function importReport(report: ParsedReport) {
    if (report.type === 'unknown' || !report.data) return
    setImportingReport(report.type)
    try {
      const res = await fetch('/api/storedge-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          report_type: report.type,
          facility_id: facility.id,
          data: report.data,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Import failed')
      const result = await res.json()
      setImportResults(prev => ({ ...prev, [report.type]: { success: true, msg: JSON.stringify(result).slice(0, 100) } }))

      // Refresh units/snapshot if we imported occupancy data
      if (report.type === 'consolidated_occupancy' || report.type === 'rent_rates_by_tenant') {
        const data = await api('GET')
        if (data.snapshot) setSnapshot(data.snapshot)
        if (data.units) setUnits(data.units)
      }

      flash('success', `${report.label} imported successfully`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setImportResults(prev => ({ ...prev, [report.type]: { success: false, msg } }))
      flash('error', `${report.label} import failed: ${msg}`)
    }
    setImportingReport(null)
  }

  async function importAllReports() {
    const importable = parsedReports.filter(r => r.type !== 'unknown' && !importResults[r.type]?.success)
    // Import in order: consolidated_occupancy first, then rent_rates, then rest
    const order: StorEdgeReportType[] = ['consolidated_occupancy', 'rent_rates_by_tenant', 'aging', 'annual_revenue', 'rent_roll', 'length_of_stay', 'move_in_kpi']
    const sorted = importable.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))
    for (const report of sorted) {
      await importReport(report)
    }
  }

  // ── Computed summary from units ──
  const totalUnits = units.reduce((s, u) => s + u.total_count, 0)
  const occupiedUnits = units.reduce((s, u) => s + u.occupied_count, 0)
  const vacantUnits = totalUnits - occupiedUnits
  const occupancyPct = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : '—'
  const grossPotential = units.reduce((s, u) => s + (u.total_count * (u.street_rate || 0)), 0)
  const actualRevenue = units.reduce((s, u) => s + (u.occupied_count * (u.actual_avg_rate || u.street_rate || 0)), 0)

  if (loading) {
    return (
      <div className={`border rounded-xl p-12 text-center ${card}`}>
        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
        <p className={sub}>Loading PMS data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ═══ storEDGE UPLOAD ═══ */}
      <div className={`border rounded-xl ${card}`}>
        <button
          onClick={() => setShowStorEdgeUpload(!showStorEdgeUpload)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <FileUp size={18} className="text-blue-500" />
            <div>
              <h3 className={`font-semibold ${text}`}>storEDGE Import</h3>
              <p className={`text-xs ${sub}`}>Upload CSV exports from storEDGE — auto-detects report type</p>
            </div>
          </div>
          {showStorEdgeUpload ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
        </button>

        {showStorEdgeUpload && (
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4 space-y-4`}>
            {/* File input */}
            <div className={`border-2 border-dashed rounded-xl p-6 text-center ${darkMode ? 'border-slate-600 hover:border-blue-500/50' : 'border-slate-300 hover:border-blue-500/50'} transition-colors cursor-pointer relative`}>
              <input
                type="file"
                accept=".csv"
                multiple
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload size={32} className={`mx-auto mb-2 ${sub}`} />
              <p className={`text-sm font-medium ${text}`}>Drop storEDGE CSV files here or click to browse</p>
              <p className={`text-xs mt-1 ${sub}`}>
                Supports: Consolidated Occupancy, Rent Roll, Rent Rates, Aging, Annual Revenue, Length of Stay, Move-In KPI
              </p>
            </div>

            {/* Parsed reports preview */}
            {parsedReports.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-semibold ${text}`}>{parsedReports.length} report{parsedReports.length > 1 ? 's' : ''} detected</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={importAllReports}
                      disabled={!!importingReport || parsedReports.every(r => r.type === 'unknown' || importResults[r.type]?.success)}
                      className={btnPrimary}
                    >
                      {importingReport ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      Import All
                    </button>
                    <button onClick={() => { setParsedReports([]); setImportResults({}) }} className={btnSecondary}>
                      <X size={16} /> Clear
                    </button>
                  </div>
                </div>

                {parsedReports.map((report, i) => {
                  const result = importResults[report.type]
                  return (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex items-center gap-3">
                        {result?.success ? (
                          <FileCheck2 size={18} className="text-emerald-500" />
                        ) : report.type === 'unknown' ? (
                          <FileWarning size={18} className="text-amber-500" />
                        ) : (
                          <FileUp size={18} className="text-blue-500" />
                        )}
                        <div>
                          <p className={`text-sm font-medium ${text}`}>
                            {report.label}
                            {report.type === 'unknown' && <span className="text-amber-500 text-xs ml-2">(unrecognized format)</span>}
                          </p>
                          <p className={`text-xs ${sub}`}>{report.summary}</p>
                          {result && !result.success && (
                            <p className="text-xs text-red-500 mt-0.5">{result.msg}</p>
                          )}
                        </div>
                      </div>
                      {report.type !== 'unknown' && !result?.success && (
                        <button
                          onClick={() => importReport(report)}
                          disabled={!!importingReport}
                          className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                        >
                          {importingReport === report.type ? <Loader2 size={14} className="animate-spin" /> : 'Import'}
                        </button>
                      )}
                      {result?.success && (
                        <span className="text-xs text-emerald-600 font-medium">Imported</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary bar (computed from units data) */}
      {units.length > 0 && (
        <div className={`border rounded-xl ${card} p-4`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>Total Units</p>
              <p className={`text-2xl font-bold ${text}`}>{totalUnits}</p>
            </div>
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>Occupied</p>
              <p className={`text-2xl font-bold text-emerald-600`}>{occupiedUnits}</p>
            </div>
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>Vacant</p>
              <p className={`text-2xl font-bold text-red-500`}>{vacantUnits}</p>
            </div>
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>Occupancy</p>
              <p className={`text-2xl font-bold ${text}`}>{occupancyPct}%</p>
            </div>
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>Gross Potential</p>
              <p className={`text-2xl font-bold ${text}`}>${grossPotential.toLocaleString()}</p>
            </div>
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>Actual MRR</p>
              <p className={`text-2xl font-bold text-emerald-600`}>${actualRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ UNIT MIX SECTION ═══ */}
      <div className={`border rounded-xl ${card}`}>
        <button
          onClick={() => setExpandedSection(expandedSection === 'units' ? null : 'units')}
          className={`w-full flex items-center justify-between p-4 text-left`}
        >
          <div className="flex items-center gap-3">
            <Package size={18} className="text-emerald-600" />
            <div>
              <h3 className={`font-semibold ${text}`}>Unit Mix & Inventory</h3>
              <p className={`text-xs ${sub}`}>{units.length} unit type{units.length !== 1 ? 's' : ''} configured</p>
            </div>
          </div>
          {expandedSection === 'units' ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
        </button>

        {expandedSection === 'units' && (
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4 space-y-4`}>
            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setEditingUnit(emptyUnit(facility.id))} className={btnPrimary}>
                <Plus size={16} /> Add Unit Type
              </button>
              <button onClick={() => setShowPaste(!showPaste)} className={btnSecondary}>
                <ClipboardPaste size={16} /> Paste from Spreadsheet
              </button>
            </div>

            {/* Paste box */}
            {showPaste && (
              <div className={`border rounded-lg p-4 space-y-3 ${darkMode ? 'border-slate-600 bg-slate-750' : 'border-slate-200 bg-slate-50'}`}>
                <p className={`text-sm ${sub}`}>
                  Paste tab-separated data from your PMS export. Columns: <strong>Unit Type</strong>, <strong>Total</strong>, <strong>Occupied</strong>, <strong>Street Rate</strong>, <strong>Web Rate</strong> (optional)
                </p>
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder={'10×10 Climate\t52\t38\t120\t99\n10×15 Drive-Up\t36\t27\t165\t139'}
                  rows={6}
                  className={`${inputCls} font-mono text-xs`}
                />
                <div className="flex gap-2">
                  <button onClick={parsePastedUnits} disabled={saving === 'bulk'} className={btnPrimary}>
                    {saving === 'bulk' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    Import Units
                  </button>
                  <button onClick={() => { setShowPaste(false); setPasteText('') }} className={btnSecondary}>Cancel</button>
                </div>
              </div>
            )}

            {/* Unit editing modal (inline) */}
            {editingUnit && (
              <UnitEditor
                unit={editingUnit}
                existingTypes={units.map(u => u.unit_type)}
                darkMode={darkMode}
                saving={saving === 'unit'}
                onSave={saveUnit}
                onCancel={() => setEditingUnit(null)}
                inputCls={inputCls}
                btnPrimary={btnPrimary}
                btnSecondary={btnSecondary}
                text={text}
                sub={sub}
              />
            )}

            {/* Units table */}
            {units.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                      <th className={`px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide ${sub}`}>Unit Type</th>
                      <th className={`px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wide ${sub}`}>Total</th>
                      <th className={`px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wide ${sub}`}>Occupied</th>
                      <th className={`px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wide ${sub}`}>Vacant</th>
                      <th className={`px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wide ${sub}`}>Street Rate</th>
                      <th className={`px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wide ${sub}`}>Avg Actual</th>
                      <th className={`px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wide ${sub}`}>Web Rate</th>
                      <th className={`px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wide ${sub}`}>Features</th>
                      <th className={`px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wide ${sub}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map(u => {
                      const vacant = u.total_count - u.occupied_count
                      const occPct = u.total_count > 0 ? ((u.occupied_count / u.total_count) * 100).toFixed(0) : '—'
                      return (
                        <tr key={u.id || u.unit_type} className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'} hover:${darkMode ? 'bg-slate-700/30' : 'bg-slate-50/50'}`}>
                          <td className={`px-3 py-2.5 font-medium ${text}`}>{u.unit_type}</td>
                          <td className={`px-3 py-2.5 text-right ${sub}`}>{u.total_count}</td>
                          <td className={`px-3 py-2.5 text-right text-emerald-600 font-medium`}>{u.occupied_count} <span className={`text-xs ${sub}`}>({occPct}%)</span></td>
                          <td className={`px-3 py-2.5 text-right ${vacant > 0 ? 'text-red-500 font-medium' : 'text-emerald-600'}`}>{vacant}</td>
                          <td className={`px-3 py-2.5 text-right ${text}`}>{u.street_rate ? `$${u.street_rate}` : '—'}</td>
                          <td className={`px-3 py-2.5 text-right ${sub}`}>{u.actual_avg_rate ? `$${u.actual_avg_rate}` : '—'}</td>
                          <td className={`px-3 py-2.5 text-right ${u.web_rate && u.street_rate && u.web_rate < u.street_rate ? 'text-amber-500' : sub}`}>
                            {u.web_rate ? `$${u.web_rate}` : '—'}
                          </td>
                          <td className={`px-3 py-2.5 text-right`}>
                            <div className="flex flex-wrap gap-1 justify-end">
                              {(u.features || []).map(f => (
                                <span key={f} className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                  {FEATURE_LABELS[f] || f}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => setEditingUnit({ ...u })} className={`p-1.5 rounded-lg hover:${darkMode ? 'bg-slate-600' : 'bg-slate-100'}`}>
                                <Pencil size={14} className={sub} />
                              </button>
                              <button onClick={() => deleteUnit(u)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className={`border-t-2 ${darkMode ? 'border-slate-600 bg-slate-700/30' : 'border-slate-200 bg-slate-50'} font-semibold`}>
                      <td className={`px-3 py-2.5 ${text}`}>Total</td>
                      <td className={`px-3 py-2.5 text-right ${text}`}>{totalUnits}</td>
                      <td className={`px-3 py-2.5 text-right text-emerald-600`}>{occupiedUnits}</td>
                      <td className={`px-3 py-2.5 text-right text-red-500`}>{vacantUnits}</td>
                      <td className={`px-3 py-2.5 text-right ${text}`}>—</td>
                      <td className={`px-3 py-2.5 text-right ${sub}`}>—</td>
                      <td className={`px-3 py-2.5 text-right ${sub}`}>—</td>
                      <td className={`px-3 py-2.5 text-right`} />
                      <td className={`px-3 py-2.5 text-right`} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className={`text-center py-8 ${sub}`}>
                <Package size={32} className="mx-auto mb-2 opacity-40" />
                <p className="font-medium">No unit data yet</p>
                <p className="text-xs mt-1">Add unit types manually or paste from your PMS export</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ FACILITY SNAPSHOT SECTION ═══ */}
      <div className={`border rounded-xl ${card}`}>
        <button
          onClick={() => setExpandedSection(expandedSection === 'snapshot' ? null : 'snapshot')}
          className={`w-full flex items-center justify-between p-4 text-left`}
        >
          <div className="flex items-center gap-3">
            <DollarSign size={18} className="text-emerald-600" />
            <div>
              <h3 className={`font-semibold ${text}`}>Facility Snapshot</h3>
              <p className={`text-xs ${sub}`}>Overall facility metrics — revenue, delinquency, move-ins/outs</p>
            </div>
          </div>
          {expandedSection === 'snapshot' ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
        </button>

        {expandedSection === 'snapshot' && (
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4 space-y-4`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className={`text-xs font-medium ${sub}`}>Snapshot Date</label>
                <input type="date" value={snapshot.snapshot_date || ''} onChange={e => setSnapshot(s => ({ ...s, snapshot_date: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={`text-xs font-medium ${sub}`}>Total Units</label>
                <input type="number" value={snapshot.total_units ?? ''} onChange={e => setSnapshot(s => ({ ...s, total_units: e.target.value ? parseInt(e.target.value) : null }))} className={inputCls} placeholder="214" />
              </div>
              <div>
                <label className={`text-xs font-medium ${sub}`}>Occupied Units</label>
                <input type="number" value={snapshot.occupied_units ?? ''} onChange={e => setSnapshot(s => ({ ...s, occupied_units: e.target.value ? parseInt(e.target.value) : null }))} className={inputCls} placeholder="162" />
              </div>
              <div>
                <label className={`text-xs font-medium ${sub}`}>Occupancy %</label>
                <input type="number" step="0.1" value={snapshot.occupancy_pct ?? ''} onChange={e => setSnapshot(s => ({ ...s, occupancy_pct: e.target.value ? parseFloat(e.target.value) : null }))} className={inputCls} placeholder="75.7" />
              </div>
              <div>
                <label className={`text-xs font-medium ${sub}`}>Total Sq Ft</label>
                <input type="number" value={snapshot.total_sqft ?? ''} onChange={e => setSnapshot(s => ({ ...s, total_sqft: e.target.value ? parseInt(e.target.value) : null }))} className={inputCls} placeholder="32000" />
              </div>
              <div>
                <label className={`text-xs font-medium ${sub}`}>Gross Potential Revenue</label>
                <input type="number" step="0.01" value={snapshot.gross_potential ?? ''} onChange={e => setSnapshot(s => ({ ...s, gross_potential: e.target.value ? parseFloat(e.target.value) : null }))} className={inputCls} placeholder="28500.00" />
              </div>
              <div>
                <label className={`text-xs font-medium ${sub}`}>Actual Revenue</label>
                <input type="number" step="0.01" value={snapshot.actual_revenue ?? ''} onChange={e => setSnapshot(s => ({ ...s, actual_revenue: e.target.value ? parseFloat(e.target.value) : null }))} className={inputCls} placeholder="21375.00" />
              </div>
              <div>
                <label className={`text-xs font-medium ${sub}`}>Delinquency %</label>
                <input type="number" step="0.1" value={snapshot.delinquency_pct ?? ''} onChange={e => setSnapshot(s => ({ ...s, delinquency_pct: e.target.value ? parseFloat(e.target.value) : null }))} className={inputCls} placeholder="4.2" />
              </div>
              <div>
                <label className={`text-xs font-medium ${sub}`}>Move-Ins MTD</label>
                <input type="number" value={snapshot.move_ins_mtd} onChange={e => setSnapshot(s => ({ ...s, move_ins_mtd: parseInt(e.target.value) || 0 }))} className={inputCls} placeholder="8" />
              </div>
              <div>
                <label className={`text-xs font-medium ${sub}`}>Move-Outs MTD</label>
                <input type="number" value={snapshot.move_outs_mtd} onChange={e => setSnapshot(s => ({ ...s, move_outs_mtd: parseInt(e.target.value) || 0 }))} className={inputCls} placeholder="3" />
              </div>
            </div>
            <div>
              <label className={`text-xs font-medium ${sub}`}>Notes</label>
              <textarea value={snapshot.notes || ''} onChange={e => setSnapshot(s => ({ ...s, notes: e.target.value || null }))} rows={2} className={inputCls} placeholder="Any notes about this snapshot..." />
            </div>
            <button onClick={saveSnapshot} disabled={saving === 'snapshot'} className={btnPrimary}>
              {saving === 'snapshot' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Snapshot
            </button>
          </div>
        )}
      </div>

      {/* ═══ SPECIALS & PROMOTIONS SECTION ═══ */}
      <div className={`border rounded-xl ${card}`}>
        <button
          onClick={() => setExpandedSection(expandedSection === 'specials' ? null : 'specials')}
          className={`w-full flex items-center justify-between p-4 text-left`}
        >
          <div className="flex items-center gap-3">
            <Percent size={18} className="text-emerald-600" />
            <div>
              <h3 className={`font-semibold ${text}`}>Specials & Promotions</h3>
              <p className={`text-xs ${sub}`}>{specials.filter(s => s.active).length} active special{specials.filter(s => s.active).length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {expandedSection === 'specials' ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
        </button>

        {expandedSection === 'specials' && (
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4 space-y-4`}>
            <button onClick={() => setEditingSpecial(emptySpecial(facility.id))} className={btnPrimary}>
              <Plus size={16} /> Add Special
            </button>

            {editingSpecial && (
              <SpecialEditor
                special={editingSpecial}
                unitTypes={units.map(u => u.unit_type)}
                darkMode={darkMode}
                saving={saving === 'special'}
                onSave={saveSpecial}
                onCancel={() => setEditingSpecial(null)}
                inputCls={inputCls}
                btnPrimary={btnPrimary}
                btnSecondary={btnSecondary}
                text={text}
                sub={sub}
              />
            )}

            {specials.length > 0 ? (
              <div className="space-y-2">
                {specials.map(s => (
                  <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                    s.active
                      ? darkMode ? 'border-emerald-700 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50'
                      : darkMode ? 'border-slate-700 bg-slate-800 opacity-60' : 'border-slate-200 bg-slate-50 opacity-60'
                  }`}>
                    <div>
                      <p className={`font-medium text-sm ${text}`}>
                        {s.name}
                        {!s.active && <span className="ml-2 text-xs text-red-400">(Inactive)</span>}
                      </p>
                      <p className={`text-xs ${sub}`}>
                        {s.discount_type === 'percent' ? `${s.discount_value}% off` : s.discount_type === 'months_free' ? `${s.discount_value} month(s) free` : `$${s.discount_value} off`}
                        {s.applies_to && s.applies_to.length > 0 && ` — ${s.applies_to.join(', ')}`}
                        {s.end_date && ` — Expires ${s.end_date}`}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setEditingSpecial({ ...s })} className={`p-1.5 rounded-lg hover:${darkMode ? 'bg-slate-600' : 'bg-slate-100'}`}>
                        <Pencil size={14} className={sub} />
                      </button>
                      <button onClick={() => deleteSpecial(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-6 ${sub}`}>
                <Percent size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No specials configured</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Unit Editor ── */

function UnitEditor({ unit, existingTypes, darkMode, saving, onSave, onCancel, inputCls, btnPrimary, btnSecondary, text, sub }: {
  unit: PMSUnit; existingTypes: string[]; darkMode: boolean; saving: boolean
  onSave: (u: PMSUnit) => void; onCancel: () => void
  inputCls: string; btnPrimary: string; btnSecondary: string; text: string; sub: string
}) {
  const [u, setU] = useState(unit)
  const isNew = !unit.id

  return (
    <div className={`border rounded-lg p-4 space-y-4 ${darkMode ? 'border-emerald-700 bg-emerald-900/10' : 'border-emerald-200 bg-emerald-50/50'}`}>
      <div className="flex items-center justify-between">
        <h4 className={`font-semibold text-sm ${text}`}>{isNew ? 'Add Unit Type' : `Edit: ${unit.unit_type}`}</h4>
        <button onClick={onCancel} className={`p-1 rounded ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><X size={16} className={sub} /></button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className={`text-xs font-medium ${sub}`}>Unit Type *</label>
          {isNew ? (
            <div className="space-y-1">
              <input value={u.unit_type} onChange={e => setU(prev => ({ ...prev, unit_type: e.target.value }))} className={inputCls} placeholder="10×10 Climate" />
              <div className="flex flex-wrap gap-1">
                {COMMON_UNIT_TYPES.filter(t => !existingTypes.includes(t)).slice(0, 6).map(t => (
                  <button key={t} onClick={() => setU(prev => ({ ...prev, unit_type: t }))} className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <input value={u.unit_type} disabled className={`${inputCls} opacity-50`} />
          )}
        </div>
        <div>
          <label className={`text-xs font-medium ${sub}`}>Total Count</label>
          <input type="number" value={u.total_count || ''} onChange={e => setU(prev => ({ ...prev, total_count: parseInt(e.target.value) || 0 }))} className={inputCls} placeholder="52" />
        </div>
        <div>
          <label className={`text-xs font-medium ${sub}`}>Occupied</label>
          <input type="number" value={u.occupied_count || ''} onChange={e => setU(prev => ({ ...prev, occupied_count: parseInt(e.target.value) || 0 }))} className={inputCls} placeholder="38" />
        </div>
        <div>
          <label className={`text-xs font-medium ${sub}`}>Street Rate</label>
          <input type="number" step="0.01" value={u.street_rate ?? ''} onChange={e => setU(prev => ({ ...prev, street_rate: e.target.value ? parseFloat(e.target.value) : null }))} className={inputCls} placeholder="120.00" />
        </div>
        <div>
          <label className={`text-xs font-medium ${sub}`}>Avg Actual Rate</label>
          <input type="number" step="0.01" value={u.actual_avg_rate ?? ''} onChange={e => setU(prev => ({ ...prev, actual_avg_rate: e.target.value ? parseFloat(e.target.value) : null }))} className={inputCls} placeholder="115.00" />
        </div>
        <div>
          <label className={`text-xs font-medium ${sub}`}>Web Rate</label>
          <input type="number" step="0.01" value={u.web_rate ?? ''} onChange={e => setU(prev => ({ ...prev, web_rate: e.target.value ? parseFloat(e.target.value) : null }))} className={inputCls} placeholder="99.00" />
        </div>
        <div>
          <label className={`text-xs font-medium ${sub}`}>Push Rate</label>
          <input type="number" step="0.01" value={u.push_rate ?? ''} onChange={e => setU(prev => ({ ...prev, push_rate: e.target.value ? parseFloat(e.target.value) : null }))} className={inputCls} placeholder="125.00" />
        </div>
        <div>
          <label className={`text-xs font-medium ${sub}`}>Sq Ft</label>
          <input type="number" value={u.sqft ?? ''} onChange={e => setU(prev => ({ ...prev, sqft: e.target.value ? parseFloat(e.target.value) : null }))} className={inputCls} placeholder="100" />
        </div>
        <div>
          <label className={`text-xs font-medium ${sub}`}>Floor</label>
          <select value={u.floor || ''} onChange={e => setU(prev => ({ ...prev, floor: e.target.value || null }))} className={inputCls}>
            <option value="">—</option>
            <option value="1st">1st Floor</option>
            <option value="2nd">2nd Floor</option>
            <option value="3rd">3rd Floor</option>
            <option value="outdoor">Outdoor</option>
          </select>
        </div>
        <div>
          <label className={`text-xs font-medium ${sub}`}>ECRI Eligible</label>
          <input type="number" value={u.ecri_eligible || ''} onChange={e => setU(prev => ({ ...prev, ecri_eligible: parseInt(e.target.value) || 0 }))} className={inputCls} placeholder="0" />
        </div>
      </div>

      {/* Features checkboxes */}
      <div>
        <label className={`text-xs font-medium ${sub}`}>Features</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {FEATURES.map(f => (
            <label key={f} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg cursor-pointer border ${
              u.features.includes(f)
                ? 'bg-emerald-600 text-white border-emerald-600'
                : darkMode ? 'border-slate-600 text-slate-300 hover:border-slate-500' : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}>
              <input
                type="checkbox"
                checked={u.features.includes(f)}
                onChange={e => setU(prev => ({
                  ...prev,
                  features: e.target.checked ? [...prev.features, f] : prev.features.filter(x => x !== f),
                }))}
                className="sr-only"
              />
              {FEATURE_LABELS[f]}
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { if (u.unit_type.trim()) onSave(u) }}
          disabled={saving || !u.unit_type.trim()}
          className={btnPrimary}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isNew ? 'Add Unit Type' : 'Save Changes'}
        </button>
        <button onClick={onCancel} className={btnSecondary}>Cancel</button>
      </div>
    </div>
  )
}

/* ── Special Editor ── */

function SpecialEditor({ special, unitTypes, darkMode, saving, onSave, onCancel, inputCls, btnPrimary, btnSecondary, text, sub }: {
  special: PMSSpecial; unitTypes: string[]; darkMode: boolean; saving: boolean
  onSave: (s: PMSSpecial) => void; onCancel: () => void
  inputCls: string; btnPrimary: string; btnSecondary: string; text: string; sub: string
}) {
  const [s, setS] = useState(special)

  return (
    <div className={`border rounded-lg p-4 space-y-4 ${darkMode ? 'border-emerald-700 bg-emerald-900/10' : 'border-emerald-200 bg-emerald-50/50'}`}>
      <div className="flex items-center justify-between">
        <h4 className={`font-semibold text-sm ${text}`}>{special.id ? 'Edit Special' : 'Add Special'}</h4>
        <button onClick={onCancel} className={`p-1 rounded ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><X size={16} className={sub} /></button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className={`text-xs font-medium ${sub}`}>Name *</label>
          <input value={s.name} onChange={e => setS(prev => ({ ...prev, name: e.target.value }))} className={inputCls} placeholder="1st Month Free" />
        </div>
        <div>
          <label className={`text-xs font-medium ${sub}`}>Discount Type</label>
          <select value={s.discount_type} onChange={e => setS(prev => ({ ...prev, discount_type: e.target.value }))} className={inputCls}>
            <option value="fixed">Fixed $ Off</option>
            <option value="percent">Percent Off</option>
            <option value="months_free">Months Free</option>
          </select>
        </div>
        <div>
          <label className={`text-xs font-medium ${sub}`}>
            {s.discount_type === 'percent' ? 'Percent' : s.discount_type === 'months_free' ? '# Months' : 'Amount ($)'}
          </label>
          <input type="number" step="0.01" value={s.discount_value ?? ''} onChange={e => setS(prev => ({ ...prev, discount_value: e.target.value ? parseFloat(e.target.value) : null }))} className={inputCls} placeholder={s.discount_type === 'percent' ? '50' : s.discount_type === 'months_free' ? '1' : '50.00'} />
        </div>
        <div>
          <label className={`text-xs font-medium ${sub}`}>Min Lease (months)</label>
          <input type="number" value={s.min_lease_months} onChange={e => setS(prev => ({ ...prev, min_lease_months: parseInt(e.target.value) || 1 }))} className={inputCls} />
        </div>
        <div>
          <label className={`text-xs font-medium ${sub}`}>Start Date</label>
          <input type="date" value={s.start_date || ''} onChange={e => setS(prev => ({ ...prev, start_date: e.target.value || null }))} className={inputCls} />
        </div>
        <div>
          <label className={`text-xs font-medium ${sub}`}>End Date</label>
          <input type="date" value={s.end_date || ''} onChange={e => setS(prev => ({ ...prev, end_date: e.target.value || null }))} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={`text-xs font-medium ${sub}`}>Description</label>
        <input value={s.description || ''} onChange={e => setS(prev => ({ ...prev, description: e.target.value || null }))} className={inputCls} placeholder="First month free with 3-month minimum" />
      </div>

      {unitTypes.length > 0 && (
        <div>
          <label className={`text-xs font-medium ${sub}`}>Applies To (leave empty for all unit types)</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {unitTypes.map(t => (
              <label key={t} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg cursor-pointer border ${
                s.applies_to.includes(t)
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : darkMode ? 'border-slate-600 text-slate-300 hover:border-slate-500' : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}>
                <input
                  type="checkbox"
                  checked={s.applies_to.includes(t)}
                  onChange={e => setS(prev => ({
                    ...prev,
                    applies_to: e.target.checked ? [...prev.applies_to, t] : prev.applies_to.filter(x => x !== t),
                  }))}
                  className="sr-only"
                />
                {t}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <label className={`flex items-center gap-2 text-sm ${text} cursor-pointer`}>
          <input type="checkbox" checked={s.active} onChange={e => setS(prev => ({ ...prev, active: e.target.checked }))} className="rounded" />
          Active
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { if (s.name.trim()) onSave(s) }}
          disabled={saving || !s.name.trim()}
          className={btnPrimary}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {special.id ? 'Save Changes' : 'Add Special'}
        </button>
        <button onClick={onCancel} className={btnSecondary}>Cancel</button>
      </div>
    </div>
  )
}
