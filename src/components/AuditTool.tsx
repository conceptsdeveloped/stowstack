import { useState, useEffect, useRef, useMemo } from 'react'
import {
  ChevronDown, ChevronRight, Check, AlertTriangle, Building2, Printer,
  Download, RotateCcw, ArrowLeft, ArrowRight, ClipboardList, Upload,
  Loader2, X, Plus, Trash2, Image, ArrowRightLeft, Eye, EyeOff,
  FileWarning
} from 'lucide-react'
import midwayData from '@/data/midway.json'
import twopawsData from '@/data/twopaws.json'
import auditConfig from '@/data/audit-config.json'
import noticeConfig from '@/data/notice-config.json'

/* ═══════════════════════════════════════════════════════ */
/*  TYPES                                                  */
/* ═══════════════════════════════════════════════════════ */

interface FacilityData {
  facility: { id: string; name: string; address: string; phone: string; confidentiality: string }
  buildings: { id: string; name: string; units: { id: string; status: string }[] }[]
  mapImageUrl?: string
  occupiedCount?: number
  importedAt?: string
}

interface UnitAudit {
  issues: string[]
  notes: string
  physicalStatus: string | null
  completed: boolean
  completedAt?: string
}

interface AuditState {
  facilityId: string
  meta: { date: string; auditor: string; startedAt: string; completedAt?: string }
  units: Record<string, UnitAudit>
}

interface AnalyzeMapResult {
  facilityName: string
  totalUnitsFound: number
  buildings: {
    id: string
    name: string
    units: {
      id: string
      mapColor: 'blue' | 'red' | 'yellow' | 'gray' | 'green' | 'unknown'
      labelUncertain: boolean
      notes: string
    }[]
  }[]
  summary: Record<string, number>
  mapNotes: string
  error?: string
  rawResponse?: string
}

type Screen = 'select' | 'start' | 'walkthrough' | 'summary' | 'import' | 'review' | 'notice'

interface UnitNotice {
  id: string
  facilityId: string
  createdAt: string
  date: string
  unitNumber: string
  tenantName: string
  reasons: Record<string, boolean>
  additionalDetails: string
  responseDeadlineDays: number
  issuedBy: string
  photosTaken: boolean | null
  policeNotified: boolean | null
  lockChangedByFacility: boolean | null
  followUpDate: string
  resolved: boolean
  auditUnitId?: string
  auditIssues?: string[]
}

interface NoticePrefill {
  unitNumber?: string
  issuedBy?: string
  reasons?: Record<string, boolean>
  additionalDetails?: string
  auditUnitId?: string
  auditIssues?: string[]
}

const NOTICE_REASONS = noticeConfig.noticeReasons
const NOTICE_TRIGGER_ISSUES = noticeConfig.triggerIssues as string[]
const ISSUE_TO_REASON = noticeConfig.issueToReasonMapping as Record<string, string | null>
const NOTICE_FACILITIES = noticeConfig.facilities as Record<string, { printName: string; printAddress: string; printPhone: string }>

const HARDCODED_FACILITIES: Record<string, FacilityData> = {
  midway: midwayData as FacilityData,
  twopaws: twopawsData as FacilityData,
}

const STATUS_TYPES = auditConfig.statusTypes as Record<string, { label: string; color: string; priority: number }>
const ISSUE_TYPES = auditConfig.issueTypes
const ISSUE_CATEGORIES = auditConfig.issueCategories as Record<string, { label: string; order: number }>
const PHYSICAL_STATUS_OPTIONS = auditConfig.physicalStatusOptions

const ESCALATION_ISSUES = ['belongings_present', 'unauthorized_occupant']

const MAP_COLOR_TO_STATUS: Record<string, string> = {
  green: 'green',
  yellow: 'yellow',
  gray: 'gray',
  red: 'red',
  unknown: 'gray',
}

/* ═══════════════════════════════════════════════════════ */
/*  HELPERS                                                */
/* ═══════════════════════════════════════════════════════ */

function getStorageKey(facilityId: string) { return `audit_${facilityId}` }

function loadAudit(facilityId: string): AuditState | null {
  try {
    const raw = localStorage.getItem(getStorageKey(facilityId))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveAudit(state: AuditState) {
  localStorage.setItem(getStorageKey(state.facilityId), JSON.stringify(state))
}

function clearAudit(facilityId: string) {
  localStorage.removeItem(getStorageKey(facilityId))
}

function loadImportedFacilities(): Record<string, FacilityData> {
  try {
    const raw = localStorage.getItem('audit_imported_facilities')
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveImportedFacility(id: string, data: FacilityData) {
  const all = loadImportedFacilities()
  all[id] = data
  localStorage.setItem('audit_imported_facilities', JSON.stringify(all))
}

function deleteImportedFacility(id: string) {
  const all = loadImportedFacilities()
  delete all[id]
  localStorage.setItem('audit_imported_facilities', JSON.stringify(all))
  clearAudit(id)
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'facility'
}

function getTotalUnits(facility: FacilityData) {
  return facility.buildings.reduce((sum, b) => sum + b.units.length, 0)
}

function getStatusCounts(facility: FacilityData) {
  const counts: Record<string, number> = {}
  facility.buildings.forEach(b => b.units.forEach(u => { counts[u.status] = (counts[u.status] || 0) + 1 }))
  return counts
}

function getCompletedCount(audit: AuditState | null) {
  if (!audit) return 0
  return Object.values(audit.units).filter(u => u.completed).length
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function isDiscrepancy(systemStatus: string, physicalStatus: string | null): boolean {
  if (!physicalStatus) return false
  const matches: Record<string, string[]> = {
    green: ['no_issues', 'rent_ready'],
    yellow: ['no_issues', 'rent_ready', 'needs_work'],
    gray: ['company_use', 'needs_work'],
    red: ['escalate', 'needs_work'],
  }
  const valid = matches[systemStatus]
  if (!valid) return false
  return !valid.includes(physicalStatus)
}

function getDiscrepancyLabel(systemStatus: string, physicalStatus: string): string {
  const sysLabel = STATUS_TYPES[systemStatus]?.label.split(' / ')[0] || systemStatus
  const fieldLabel = PHYSICAL_STATUS_OPTIONS.find(o => o.id === physicalStatus)?.label || physicalStatus
  return `System: ${sysLabel} → Field: ${fieldLabel}`
}

async function resizeImage(file: File, maxDim: number): Promise<{ base64: string; dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round(h * maxDim / w); w = maxDim }
          else { w = Math.round(w * maxDim / h); h = maxDim }
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        const base64 = dataUrl.split(',')[1]
        resolve({ base64, dataUrl, mimeType: 'image/jpeg' })
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function resizeForThumbnail(dataUrl: string, maxDim: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let w = img.width, h = img.height
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim }
        else { w = Math.round(w * maxDim / h); h = maxDim }
      }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.src = dataUrl
  })
}

function loadNotices(facilityId: string): UnitNotice[] {
  try {
    const raw = localStorage.getItem(`notices_${facilityId}`)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveNotice(facilityId: string, notice: UnitNotice) {
  const all = loadNotices(facilityId)
  const idx = all.findIndex(n => n.id === notice.id)
  if (idx >= 0) all[idx] = notice
  else all.unshift(notice)
  localStorage.setItem(`notices_${facilityId}`, JSON.stringify(all))
}

function prefillNoticeFromAudit(unitId: string, auditData: UnitAudit, auditorName: string): NoticePrefill {
  const reasons: Record<string, boolean> = {}
  NOTICE_REASONS.forEach(r => { reasons[r.id] = false })
  for (const issue of auditData.issues) {
    const mapped = ISSUE_TO_REASON[issue]
    if (mapped && mapped in reasons) reasons[mapped] = true
  }
  return {
    unitNumber: unitId,
    issuedBy: auditorName,
    reasons,
    additionalDetails: auditData.notes || '',
    auditUnitId: unitId,
    auditIssues: auditData.issues,
  }
}

function shouldShowNoticeButton(unitAudit: UnitAudit): boolean {
  return unitAudit.physicalStatus === 'escalate' ||
    unitAudit.issues.some(i => NOTICE_TRIGGER_ISSUES.includes(i))
}

/* ═══════════════════════════════════════════════════════ */
/*  STATUS BADGE                                           */
/* ═══════════════════════════════════════════════════════ */

function StatusBadge({ status }: { status: string }) {
  const info = STATUS_TYPES[status]
  if (!info) return null
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide"
      style={{ backgroundColor: info.color + '18', color: info.color }}
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: info.color }} />
      {info.label.split(' / ')[0]}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  CONFIRM DIALOG                                        */
/* ═══════════════════════════════════════════════════════ */

function ConfirmDialog({ open, title, message, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-3 rounded-lg bg-red-600 text-white font-medium">
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  FACILITY SELECT                                        */
/* ═══════════════════════════════════════════════════════ */

function FacilitySelect({ allFacilities, onSelect, onImport, onDeleteImported }: {
  allFacilities: Record<string, FacilityData>
  onSelect: (id: string) => void
  onImport: () => void
  onDeleteImported: (id: string) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const hardcoded = Object.entries(HARDCODED_FACILITIES)
  const imported = Object.entries(allFacilities).filter(([id]) => !HARDCODED_FACILITIES[id])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <ClipboardList className="w-12 h-12 text-gray-800 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Unit Audit Tool</h1>
          <p className="text-gray-500 mt-1">Select a facility to begin</p>
        </div>
        <div className="space-y-4">
          {hardcoded.map(([id, data]) => {
            const saved = loadAudit(id)
            const total = getTotalUnits(data)
            const completed = getCompletedCount(saved)
            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                className="w-full text-left bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all active:scale-[0.98]"
              >
                <h2 className="text-lg font-bold text-gray-900">{data.facility.name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{data.facility.address}</p>
                <p className="text-sm text-gray-400 mt-1">{total} units to audit</p>
                {saved && completed > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(completed / total) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium text-green-600">Resume: {completed}/{total}</span>
                  </div>
                )}
              </button>
            )
          })}

          {/* Imported facilities */}
          {imported.map(([id, data]) => {
            const saved = loadAudit(id)
            const total = getTotalUnits(data)
            const completed = getCompletedCount(saved)
            return (
              <div key={id} className="relative">
                <button
                  onClick={() => onSelect(id)}
                  className="w-full text-left bg-white rounded-xl border border-indigo-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900">{data.facility.name}</h2>
                        <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold">IMPORTED</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{data.facility.address || 'Imported from site map'}</p>
                      <p className="text-sm text-gray-400 mt-1">{total} units to audit{data.occupiedCount ? ` (${data.occupiedCount} occupied excluded)` : ''}</p>
                    </div>
                  </div>
                  {saved && completed > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(completed / total) * 100}%` }} />
                      </div>
                      <span className="text-xs font-medium text-green-600">Resume: {completed}/{total}</span>
                    </div>
                  )}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(id) }}
                  className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}

          {/* Import from site map */}
          <button
            onClick={onImport}
            className="w-full text-left bg-white rounded-xl border-2 border-dashed border-gray-300 p-5 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all active:scale-[0.98] group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                <Upload className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Import from Site Map</h2>
                <p className="text-sm text-gray-500">Upload a storEDGE map screenshot to auto-detect units</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Imported Facility?"
        message="This will remove the imported facility and any in-progress audit data. This cannot be undone."
        onConfirm={() => { if (confirmDelete) onDeleteImported(confirmDelete); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  MAP IMPORT SCREEN                                      */
/* ═══════════════════════════════════════════════════════ */

function MapImportScreen({ onAnalyzed, onBack }: {
  onAnalyzed: (result: AnalyzeMapResult, imageDataUrl: string) => void
  onBack: () => void
}) {
  const [facilityName, setFacilityName] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a PNG or JPEG image')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Image is too large. Please use an image under 20MB.')
      return
    }
    setImageFile(file)
    setError(null)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleAnalyze() {
    if (!imageFile) return
    setAnalyzing(true)
    setError(null)

    try {
      // Resize for API (max 2048px to stay under Vercel body limit)
      const { base64, dataUrl, mimeType } = await resizeImage(imageFile, 2048)

      const res = await fetch('/api/analyze-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          mimeType,
          facilityName: facilityName.trim(),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Server error' }))
        throw new Error(err.error || err.details || `Server error (${res.status})`)
      }

      const result: AnalyzeMapResult = await res.json()

      if (result.error) {
        throw new Error(result.error)
      }

      if (!result.buildings || result.buildings.length === 0) {
        throw new Error('No units detected in the image. Make sure you uploaded a storEDGE site map screenshot.')
      }

      // Use the full-res preview for the review screen, will be thumbnailed for storage
      onAnalyzed(result, imagePreview || dataUrl)
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Upload className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Import Site Map</h1>
            <p className="text-sm text-gray-500">Upload a storEDGE map screenshot</p>
          </div>
        </div>

        {/* Facility name */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Facility Name</label>
          <input
            type="text"
            value={facilityName}
            onChange={e => setFacilityName(e.target.value)}
            placeholder="e.g., Midway Self Storage"
            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
          />
        </div>

        {/* Color legend */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">storEDGE Color Key</p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {[
              { color: '#1e88e5', label: 'Blue = Occupied (skip)' },
              { color: '#e53935', label: 'Red = Past Due' },
              { color: '#ff9800', label: 'Yellow = Reserved' },
              { color: '#9e9e9e', label: 'Gray = Unrentable' },
              { color: '#4caf50', label: 'Green = Vacant' },
            ].map(c => (
              <div key={c.color} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-gray-600">{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* File upload zone */}
        <div
          className={`bg-white rounded-xl border-2 border-dashed p-6 mb-4 text-center transition-colors cursor-pointer ${
            dragActive ? 'border-indigo-400 bg-indigo-50' :
            imagePreview ? 'border-green-300 bg-green-50/30' : 'border-gray-300 hover:border-indigo-400'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          {imagePreview ? (
            <div>
              <img src={imagePreview} alt="Map preview" className="max-h-48 mx-auto rounded-lg shadow-sm mb-3" />
              <p className="text-sm text-green-600 font-medium">{imageFile?.name}</p>
              <p className="text-xs text-gray-400 mt-1">Tap to change image</p>
            </div>
          ) : (
            <div>
              <Image className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600 font-medium">Drop site map image here</p>
              <p className="text-xs text-gray-400 mt-1">or tap to browse (PNG, JPEG)</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Analyze button */}
        <button
          onClick={handleAnalyze}
          disabled={!imageFile || !facilityName.trim() || analyzing}
          className="w-full bg-indigo-600 text-white rounded-xl py-4 font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing map... (15-30 sec)
            </>
          ) : (
            <>
              <Eye className="w-5 h-5" />
              Analyze Map
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  MAP REVIEW SCREEN                                      */
/* ═══════════════════════════════════════════════════════ */

function MapReviewScreen({ result, imageDataUrl, onConfirm, onBack }: {
  result: AnalyzeMapResult
  imageDataUrl: string
  onConfirm: (facilityName: string, buildings: AnalyzeMapResult['buildings'], imageDataUrl: string, occupiedCount: number) => void
  onBack: () => void
}) {
  const [facilityName, setFacilityName] = useState(result.facilityName || '')
  const [buildings, setBuildings] = useState(result.buildings)
  const [showMap, setShowMap] = useState(false)

  const nonBlueUnits = buildings.flatMap(b => b.units).filter(u => u.mapColor !== 'blue')
  const blueCount = buildings.flatMap(b => b.units).filter(u => u.mapColor === 'blue').length
  const totalUnits = buildings.flatMap(b => b.units).length

  function removeUnit(buildingId: string, unitId: string) {
    setBuildings(prev => prev.map(b =>
      b.id === buildingId ? { ...b, units: b.units.filter(u => u.id !== unitId) } : b
    ).filter(b => b.units.length > 0))
  }

  function updateUnitColor(buildingId: string, unitId: string, color: string) {
    setBuildings(prev => prev.map(b =>
      b.id === buildingId ? {
        ...b,
        units: b.units.map(u => u.id === unitId ? { ...u, mapColor: color as any } : u)
      } : b
    ))
  }

  function updateUnitId(buildingId: string, oldId: string, newId: string) {
    setBuildings(prev => prev.map(b =>
      b.id === buildingId ? {
        ...b,
        units: b.units.map(u => u.id === oldId ? { ...u, id: newId } : u)
      } : b
    ))
  }

  function addUnit(buildingId: string) {
    const building = buildings.find(b => b.id === buildingId)
    if (!building) return
    const newId = `${buildingId}-NEW`
    setBuildings(prev => prev.map(b =>
      b.id === buildingId ? { ...b, units: [...b.units, { id: newId, mapColor: 'green' as const, labelUncertain: false, notes: '' }] } : b
    ))
  }

  function addBuilding() {
    const id = String.fromCharCode(65 + buildings.length) // A, B, C, ...
    setBuildings(prev => [...prev, { id, name: `Building ${id}`, units: [] }])
  }

  const colorOptions = ['blue', 'green', 'yellow', 'gray', 'red']

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-32">
      <div className="max-w-lg mx-auto">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Review Extracted Units</h1>
        <p className="text-sm text-gray-500 mb-4">Verify and correct before starting audit</p>

        {/* Map image toggle */}
        <button
          onClick={() => setShowMap(!showMap)}
          className="w-full bg-white rounded-xl border border-gray-200 p-3 mb-4 flex items-center justify-between text-sm"
        >
          <span className="flex items-center gap-2 text-gray-700 font-medium">
            <Image className="w-4 h-4" /> Reference Map
          </span>
          {showMap ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
        </button>
        {showMap && (
          <div className="mb-4">
            <img src={imageDataUrl} alt="Facility map" className="w-full rounded-xl border border-gray-200 shadow-sm" />
          </div>
        )}

        {/* Facility name */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Facility Name</label>
          <input
            type="text"
            value={facilityName}
            onChange={e => setFacilityName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base font-semibold"
          />
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="text-2xl font-bold text-gray-900">{totalUnits}</div>
            <div className="text-[10px] text-gray-500 font-medium">TOTAL FOUND</div>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-3">
            <div className="text-2xl font-bold text-blue-700">{blueCount}</div>
            <div className="text-[10px] text-blue-600 font-medium">OCCUPIED (SKIP)</div>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-3">
            <div className="text-2xl font-bold text-green-700">{nonBlueUnits.length}</div>
            <div className="text-[10px] text-green-600 font-medium">TO AUDIT</div>
          </div>
        </div>

        {/* Color counts */}
        <div className="flex flex-wrap gap-2 mb-4">
          {colorOptions.map(color => {
            const count = buildings.flatMap(b => b.units).filter(u => u.mapColor === color).length
            if (count === 0) return null
            return (
              <span key={color} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: (STATUS_TYPES[color]?.color || '#666') + '18', color: STATUS_TYPES[color]?.color || '#666' }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_TYPES[color]?.color || '#666' }} />
                {count} {STATUS_TYPES[color]?.label.split(' / ')[0] || color}
              </span>
            )
          })}
        </div>

        {/* Map notes from Claude */}
        {result.mapNotes && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800">
            <strong>AI Notes:</strong> {result.mapNotes}
          </div>
        )}

        {/* Building-by-building units */}
        {buildings.map(building => (
          <div key={building.id} className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">{building.name}</h3>
            <div className="space-y-2">
              {building.units.map(unit => (
                <div key={unit.id} className={`flex items-center gap-2 py-1.5 px-2 rounded-lg ${unit.labelUncertain ? 'bg-amber-50 border border-amber-200' : ''}`}>
                  {/* Color dot — tappable to cycle */}
                  <button
                    onClick={() => {
                      const idx = colorOptions.indexOf(unit.mapColor)
                      const next = colorOptions[(idx + 1) % colorOptions.length]
                      updateUnitColor(building.id, unit.id, next)
                    }}
                    className="w-5 h-5 rounded-full flex-shrink-0 border-2 border-white shadow-sm"
                    style={{ backgroundColor: STATUS_TYPES[unit.mapColor]?.color || '#666' }}
                    title="Tap to change color"
                  />
                  {/* Unit ID — editable */}
                  <input
                    type="text"
                    value={unit.id}
                    onChange={e => updateUnitId(building.id, unit.id, e.target.value)}
                    className="flex-1 text-sm font-mono font-semibold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-1 py-0.5"
                  />
                  {unit.labelUncertain && (
                    <span className="text-[10px] text-amber-600 font-medium">UNCERTAIN</span>
                  )}
                  {unit.mapColor === 'blue' && (
                    <span className="text-[10px] text-blue-500 font-medium">SKIP</span>
                  )}
                  {/* Remove */}
                  <button onClick={() => removeUnit(building.id, unit.id)} className="p-1 text-gray-300 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => addUnit(building.id)}
              className="mt-2 flex items-center gap-1 text-xs text-indigo-600 font-medium hover:text-indigo-700"
            >
              <Plus className="w-3 h-3" /> Add Unit
            </button>
          </div>
        ))}

        <button
          onClick={addBuilding}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 font-medium hover:border-indigo-400 hover:text-indigo-600 transition-colors mb-4"
        >
          <Plus className="w-4 h-4 inline mr-1" /> Add Building
        </button>
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => onConfirm(facilityName, buildings, imageDataUrl, blueCount)}
            disabled={nonBlueUnits.length === 0 || !facilityName.trim()}
            className="w-full bg-indigo-600 text-white rounded-xl py-4 font-semibold text-base disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            Start Audit with {nonBlueUnits.length} Units <ArrowRight className="w-4 h-4 inline ml-1" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  START SCREEN                                           */
/* ═══════════════════════════════════════════════════════ */

function StartScreen({ facility, onStart, onResume, onBack }: {
  facility: FacilityData
  onStart: (date: string, auditor: string) => void
  onResume: () => void
  onBack: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [auditor, setAuditor] = useState('')
  const saved = loadAudit(facility.facility.id)
  const total = getTotalUnits(facility)
  const statusCounts = getStatusCounts(facility)
  const completed = getCompletedCount(saved)

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">{facility.facility.name}</h1>
        <p className="text-sm text-gray-500 mb-6">{facility.facility.address}</p>

        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Audit Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Auditor Name</label>
          <input type="text" value={auditor} onChange={e => setAuditor(e.target.value)} placeholder="Your name"
            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">{total} Units to Audit</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(statusCounts).filter(([, c]) => c > 0).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_TYPES[status]?.color }} />
                <span className="text-gray-600">{count} {STATUS_TYPES[status]?.label.split(' / ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => onStart(date, auditor)} disabled={!auditor.trim()}
          className="w-full bg-gray-900 text-white rounded-xl py-4 font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform">
          Start Audit <ArrowRight className="w-4 h-4 inline ml-1" />
        </button>

        {saved && completed > 0 && (
          <button onClick={onResume}
            className="w-full mt-3 border-2 border-green-600 text-green-700 rounded-xl py-4 font-semibold text-base active:scale-[0.98] transition-transform">
            Resume Audit ({completed}/{total} done)
          </button>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  UNIT CARD                                              */
/* ═══════════════════════════════════════════════════════ */

function UnitCard({ unit, unitAudit, expanded, onToggle, onUpdate, onComplete, isImported, onGenerateNotice }: {
  unit: { id: string; status: string }
  unitAudit: UnitAudit
  expanded: boolean
  onToggle: () => void
  onUpdate: (updates: Partial<UnitAudit>) => void
  onComplete: () => void
  isImported?: boolean
  onGenerateNotice?: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const issuesByCategory = useMemo(() => {
    const grouped: Record<string, typeof ISSUE_TYPES> = {}
    Object.entries(ISSUE_CATEGORIES).sort((a, b) => a[1].order - b[1].order).forEach(([cat]) => {
      const issues = ISSUE_TYPES.filter(i => i.category === cat)
      if (issues.length > 0) grouped[cat] = issues
    })
    return grouped
  }, [])

  useEffect(() => {
    if (expanded && cardRef.current) {
      setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }, [expanded])

  const hasEscalation = unitAudit.issues.some(i => ESCALATION_ISSUES.includes(i))
  const issueCount = unitAudit.issues.length
  const discrepancy = unitAudit.completed && unitAudit.physicalStatus && isImported
    ? isDiscrepancy(unit.status, unitAudit.physicalStatus) : false

  let borderColor = 'border-l-transparent'
  if (unitAudit.completed) {
    if (discrepancy) borderColor = 'border-l-amber-500'
    else if (unitAudit.physicalStatus === 'company_use') borderColor = 'border-l-blue-500'
    else if (unitAudit.physicalStatus === 'escalate' || hasEscalation) borderColor = 'border-l-red-500'
    else if (issueCount > 0 || unitAudit.physicalStatus === 'needs_work') borderColor = 'border-l-orange-400'
    else borderColor = 'border-l-green-500'
  } else if (issueCount > 0 || unitAudit.notes) {
    borderColor = 'border-l-yellow-400'
  }

  function toggleIssue(issueId: string) {
    const current = [...unitAudit.issues]
    const idx = current.indexOf(issueId)
    if (idx >= 0) current.splice(idx, 1)
    else current.push(issueId)
    onUpdate({ issues: current })
  }

  function setPhysicalStatus(statusId: string) {
    let newIssues = [...unitAudit.issues]
    if (statusId === 'no_issues' || statusId === 'rent_ready') newIssues = []
    else if (statusId === 'company_use') newIssues = ['company_owned']
    onUpdate({ physicalStatus: statusId, issues: newIssues })
  }

  useEffect(() => {
    if (unitAudit.issues.some(i => ESCALATION_ISSUES.includes(i)) && unitAudit.physicalStatus !== 'escalate') {
      onUpdate({ physicalStatus: 'escalate' })
    }
  }, [unitAudit.issues])

  const summaryText = unitAudit.completed
    ? discrepancy
      ? 'MISMATCH'
      : unitAudit.physicalStatus === 'company_use' ? 'Company Owned'
      : unitAudit.physicalStatus === 'escalate' ? 'Follow-Up Required'
      : issueCount > 0 ? `${issueCount} issue${issueCount > 1 ? 's' : ''}`
      : unitAudit.physicalStatus === 'rent_ready' ? 'Rent-Ready'
      : 'No issues'
    : issueCount > 0 ? `${issueCount} issue${issueCount > 1 ? 's' : ''} checked`
    : 'Not started'

  return (
    <div ref={cardRef} className={`bg-white rounded-lg border border-gray-200 border-l-4 ${borderColor} shadow-sm overflow-hidden`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-gray-50">
        <div className="flex items-center gap-3">
          {unitAudit.completed ? (
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${
              discrepancy ? 'bg-amber-500' :
              unitAudit.physicalStatus === 'company_use' ? 'bg-blue-500' :
              unitAudit.physicalStatus === 'escalate' ? 'bg-red-500' :
              issueCount > 0 ? 'bg-orange-400' : 'bg-green-500'
            }`}>
              {discrepancy ? <ArrowRightLeft className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
            </span>
          ) : (
            <span className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_TYPES[unit.status]?.color }} />
            </span>
          )}
          <div>
            <span className="font-bold text-gray-900 text-base">{unit.id}</span>
            <span className={`text-xs ml-2 ${discrepancy ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>{summaryText}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={unit.status} />
          {expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="py-3 text-sm text-gray-500">
            System status: <StatusBadge status={unit.status} />
          </div>

          {/* Discrepancy alert (shows after physical status selected) */}
          {isImported && unitAudit.physicalStatus && isDiscrepancy(unit.status, unitAudit.physicalStatus) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-sm">
              <div className="flex items-center gap-2 text-amber-800 font-semibold mb-1">
                <ArrowRightLeft className="w-4 h-4" /> Discrepancy Detected
              </div>
              <p className="text-amber-700 text-xs">{getDiscrepancyLabel(unit.status, unitAudit.physicalStatus)}</p>
            </div>
          )}

          {Object.entries(issuesByCategory).map(([cat, issues]) => (
            <div key={cat} className="mb-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 border-b border-gray-100 pb-1">
                {ISSUE_CATEGORIES[cat].label}
              </div>
              {issues.map(issue => (
                <label key={issue.id} className="flex items-center gap-3 py-2.5 px-1 active:bg-gray-50 rounded cursor-pointer">
                  <input type="checkbox" checked={unitAudit.issues.includes(issue.id)} onChange={() => toggleIssue(issue.id)}
                    className="w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer" />
                  <span className={`text-sm ${issue.category === 'escalation' ? 'font-semibold text-red-700' : 'text-gray-700'}`}>
                    {issue.label}
                  </span>
                </label>
              ))}
            </div>
          ))}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={unitAudit.notes} onChange={e => onUpdate({ notes: e.target.value })}
              placeholder="Add any notes about this unit..." rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900" />
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">What did you find?</p>
            <div className="space-y-1">
              {PHYSICAL_STATUS_OPTIONS.map(opt => (
                <label key={opt.id} className={`flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer border transition-all ${
                  unitAudit.physicalStatus === opt.id ? 'border-gray-900 bg-gray-50 shadow-sm' : 'border-transparent hover:bg-gray-50'
                }`}>
                  <input type="radio" name={`status-${unit.id}`} checked={unitAudit.physicalStatus === opt.id}
                    onChange={() => setPhysicalStatus(opt.id)} className="w-4 h-4 text-gray-900 focus:ring-gray-900" />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button onClick={onComplete} disabled={!unitAudit.physicalStatus}
            className="w-full bg-gray-900 text-white rounded-lg py-3.5 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Mark Complete
          </button>

          {/* Generate Notice button — shows for escalation-level issues */}
          {onGenerateNotice && shouldShowNoticeButton(unitAudit) && (
            <button onClick={onGenerateNotice}
              className="w-full mt-2 bg-red-600 text-white rounded-lg py-3 font-semibold text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
              <FileWarning className="w-4 h-4" /> Generate Notice
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  AUDIT WALKTHROUGH                                      */
/* ═══════════════════════════════════════════════════════ */

function AuditWalkthrough({ facility, audit, onUpdateUnit, onViewSummary, onBack, isImported, onGenerateNotice }: {
  facility: FacilityData
  audit: AuditState
  onUpdateUnit: (unitId: string, updates: Partial<UnitAudit>) => void
  onViewSummary: () => void
  onBack: () => void
  isImported?: boolean
  onGenerateNotice?: (unitId: string) => void
}) {
  const [activeBuilding, setActiveBuilding] = useState(facility.buildings[0].id)
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null)

  const totalUnits = getTotalUnits(facility)
  const completedCount = getCompletedCount(audit)
  const currentBuilding = facility.buildings.find(b => b.id === activeBuilding)!

  function handleComplete(unitId: string) {
    onUpdateUnit(unitId, { completed: true, completedAt: new Date().toISOString() })
    const allUnits = facility.buildings.flatMap(b => b.units)
    const currentIdx = allUnits.findIndex(u => u.id === unitId)
    for (let i = currentIdx + 1; i < allUnits.length; i++) {
      if (!audit.units[allUnits[i].id]?.completed) {
        setExpandedUnit(allUnits[i].id)
        const nextBuilding = facility.buildings.find(b => b.units.some(u => u.id === allUnits[i].id))
        if (nextBuilding && nextBuilding.id !== activeBuilding) setActiveBuilding(nextBuilding.id)
        return
      }
    }
    setExpandedUnit(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm print:hidden">
        <div className="max-w-lg mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <button onClick={onBack} className="text-gray-500 p-1"><ArrowLeft className="w-5 h-5" /></button>
            <div className="text-center">
              <p className="text-xs text-gray-500 font-medium">{facility.facility.name}</p>
              <p className="text-sm font-bold text-gray-900">{completedCount}/{totalUnits} completed</p>
            </div>
            <button onClick={onViewSummary} className="text-sm font-medium text-gray-900 bg-gray-100 rounded-lg px-3 py-1.5">Summary</button>
          </div>
          <div className="mt-2 bg-gray-100 rounded-full h-1.5">
            <div className="bg-green-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${(completedCount / totalUnits) * 100}%` }} />
          </div>
        </div>
        <div className="max-w-lg mx-auto px-2 pb-2 pt-1">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {facility.buildings.map(b => {
              const bCompleted = b.units.filter(u => audit.units[u.id]?.completed).length
              const bTotal = b.units.length
              const allDone = bCompleted === bTotal
              return (
                <button key={b.id} onClick={() => setActiveBuilding(b.id)}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    b.id === activeBuilding ? 'bg-gray-900 text-white' :
                    allDone ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600'
                  }`}>
                  {b.name.replace('Building ', '')}
                  <span className="ml-1 text-xs opacity-70">{bCompleted}/{bTotal}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {currentBuilding.units.map(unit => {
          const unitAudit = audit.units[unit.id] || { issues: [], notes: '', physicalStatus: null, completed: false }
          return (
            <UnitCard key={unit.id} unit={unit} unitAudit={unitAudit} expanded={expandedUnit === unit.id}
              onToggle={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)}
              onUpdate={updates => onUpdateUnit(unit.id, updates)}
              onComplete={() => handleComplete(unit.id)}
              isImported={isImported}
              onGenerateNotice={onGenerateNotice ? () => onGenerateNotice(unit.id) : undefined} />
          )
        })}
      </div>

      {completedCount === totalUnits && (
        <div className="fixed bottom-0 left-0 right-0 bg-green-600 text-white p-4 text-center shadow-lg print:hidden">
          <p className="font-bold mb-1">All {totalUnits} units audited!</p>
          <button onClick={onViewSummary} className="bg-white text-green-700 rounded-lg px-6 py-2 font-semibold text-sm">View Summary</button>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  AUDIT SUMMARY                                          */
/* ═══════════════════════════════════════════════════════ */

function AuditSummary({ facility, audit, onBack, onNewAudit, onSwitchFacility, isImported, onGenerateNotice }: {
  facility: FacilityData
  audit: AuditState
  onBack: () => void
  onNewAudit: () => void
  onSwitchFacility: () => void
  isImported?: boolean
  onGenerateNotice?: (unitId: string) => void
}) {
  const [confirmClear, setConfirmClear] = useState(false)
  const [showMap, setShowMap] = useState(false)

  const totalUnits = getTotalUnits(facility)
  const completedCount = getCompletedCount(audit)

  const stats = useMemo(() => {
    let rentReady = 0, needsWork = 0, escalation = 0, companyOwned = 0
    Object.values(audit.units).forEach(u => {
      if (!u.completed) return
      if (u.physicalStatus === 'rent_ready' || u.physicalStatus === 'no_issues') rentReady++
      if (u.physicalStatus === 'needs_work') needsWork++
      if (u.physicalStatus === 'escalate') escalation++
      if (u.physicalStatus === 'company_use') companyOwned++
    })
    return { rentReady, needsWork, escalation, companyOwned }
  }, [audit])

  // Discrepancies
  const discrepancies = useMemo(() => {
    if (!isImported) return []
    const result: { unitId: string; systemStatus: string; fieldStatus: string }[] = []
    facility.buildings.forEach(b => {
      b.units.forEach(unit => {
        const ua = audit.units[unit.id]
        if (ua?.completed && ua.physicalStatus && isDiscrepancy(unit.status, ua.physicalStatus)) {
          result.push({ unitId: unit.id, systemStatus: unit.status, fieldStatus: ua.physicalStatus })
        }
      })
    })
    return result
  }, [facility, audit, isImported])

  const issueTotals = useMemo(() => {
    const totals: Record<string, { count: number; units: string[] }> = {}
    Object.entries(audit.units).forEach(([unitId, u]) => {
      u.issues.forEach(issue => {
        if (!totals[issue]) totals[issue] = { count: 0, units: [] }
        totals[issue].count++
        totals[issue].units.push(unitId)
      })
    })
    return totals
  }, [audit])

  const statusBreakdown = useMemo(() => {
    const breakdown: Record<string, { total: number; rentReady: number; needsWork: number; escalation: number; companyOwned: number }> = {}
    facility.buildings.forEach(b => {
      b.units.forEach(unit => {
        if (!breakdown[unit.status]) breakdown[unit.status] = { total: 0, rentReady: 0, needsWork: 0, escalation: 0, companyOwned: 0 }
        breakdown[unit.status].total++
        const ua = audit.units[unit.id]
        if (ua?.completed) {
          if (ua.physicalStatus === 'rent_ready' || ua.physicalStatus === 'no_issues') breakdown[unit.status].rentReady++
          if (ua.physicalStatus === 'needs_work') breakdown[unit.status].needsWork++
          if (ua.physicalStatus === 'escalate') breakdown[unit.status].escalation++
          if (ua.physicalStatus === 'company_use') breakdown[unit.status].companyOwned++
        }
      })
    })
    return breakdown
  }, [facility, audit])

  const escalationUnits = useMemo(() => {
    return Object.entries(audit.units)
      .filter(([, u]) => u.physicalStatus === 'escalate' || u.issues.some(i => ['belongings_present', 'unauthorized_occupant', 'needs_auctioned'].includes(i)))
      .map(([id, u]) => ({ id, ...u }))
  }, [audit])

  function exportJSON() {
    const blob = new Blob([JSON.stringify({
      facility: facility.facility, audit, discrepancies,
      exportedAt: new Date().toISOString()
    }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_${facility.facility.id}_${audit.meta.date}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleNewAudit() {
    clearAudit(facility.facility.id)
    onNewAudit()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 print:hidden">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1 text-gray-500 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
          <span className="text-sm font-medium text-gray-900">Audit Summary</span>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 audit-summary-content">
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">UNIT AUDIT REPORT</h1>
          <p className="text-sm text-gray-600">{facility.facility.confidentiality}</p>
        </div>

        {/* Facility info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 print:border-0 print:p-0 print:mb-4">
          <h2 className="text-xl font-bold text-gray-900">{facility.facility.name}</h2>
          <p className="text-sm text-gray-500">{facility.facility.address}</p>
          {facility.facility.phone && <p className="text-sm text-gray-500">{facility.facility.phone}</p>}
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
            <span>Date: <strong>{formatDate(audit.meta.date)}</strong></span>
            <span>Auditor: <strong>{audit.meta.auditor}</strong></span>
            <span>Units: <strong>{completedCount}/{totalUnits}</strong></span>
          </div>
        </div>

        {/* Map image (imported only) */}
        {isImported && facility.mapImageUrl && (
          <div className="mb-4">
            <button onClick={() => setShowMap(!showMap)}
              className="w-full bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between text-sm print:hidden">
              <span className="flex items-center gap-2 text-gray-700 font-medium"><Image className="w-4 h-4" /> Site Map Reference</span>
              {showMap ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
            </button>
            {showMap && <img src={facility.mapImageUrl} alt="Facility map" className="w-full rounded-xl border border-gray-200 shadow-sm mt-2 print:hidden" />}
            <img src={facility.mapImageUrl} alt="Facility map" className="hidden print:block w-full max-h-64 object-contain mb-4" />
          </div>
        )}

        {/* Quick stats */}
        <div className={`grid gap-3 mb-4 ${isImported && discrepancies.length > 0 ? 'grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {[
            { label: 'Rent-Ready', value: stats.rentReady, color: 'bg-green-50 text-green-700 border-green-200' },
            { label: 'Needs Work', value: stats.needsWork, color: 'bg-orange-50 text-orange-700 border-orange-200' },
            { label: 'Escalation', value: stats.escalation, color: 'bg-red-50 text-red-700 border-red-200' },
            { label: 'Company', value: stats.companyOwned, color: 'bg-blue-50 text-blue-700 border-blue-200' },
            ...(isImported && discrepancies.length > 0 ? [{ label: 'Mismatch', value: discrepancies.length, color: 'bg-amber-50 text-amber-700 border-amber-200' }] : []),
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-[10px] font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Discrepancy table (imported only) */}
        {isImported && discrepancies.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4 print:bg-white print:border-amber-300">
            <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" /> System vs. Field Discrepancies ({discrepancies.length})
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-200 text-left">
                  <th className="pb-2 font-semibold text-amber-900">Unit</th>
                  <th className="pb-2 font-semibold text-amber-900">System Says</th>
                  <th className="pb-2 font-semibold text-amber-900">Field Found</th>
                </tr>
              </thead>
              <tbody>
                {discrepancies.map(d => (
                  <tr key={d.unitId} className="border-b border-amber-100">
                    <td className="py-2 font-bold text-amber-900">{d.unitId}</td>
                    <td className="py-2"><StatusBadge status={d.systemStatus} /></td>
                    <td className="py-2 text-amber-700">{PHYSICAL_STATUS_OPTIONS.find(o => o.id === d.fieldStatus)?.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Issue totals */}
        {Object.keys(issueTotals).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 print:border-0 print:p-0">
            <h3 className="font-bold text-gray-900 mb-3">Issue Totals</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-2 font-semibold text-gray-700">Issue</th>
                  <th className="pb-2 font-semibold text-gray-700 text-center w-16">Count</th>
                  <th className="pb-2 font-semibold text-gray-700">Units</th>
                </tr>
              </thead>
              <tbody>
                {ISSUE_TYPES.filter(i => issueTotals[i.id]).map(issue => (
                  <tr key={issue.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">{issue.label}</td>
                    <td className="py-2 text-center font-semibold">{issueTotals[issue.id].count}</td>
                    <td className="py-2 text-gray-500 text-xs">{issueTotals[issue.id].units.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Status breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 print:border-0 print:p-0">
          <h3 className="font-bold text-gray-900 mb-3">By Status</h3>
          {Object.entries(statusBreakdown).map(([status, data]) => (
            <div key={status} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_TYPES[status]?.color }} />
              <span className="text-sm font-medium text-gray-700 w-28">{STATUS_TYPES[status]?.label.split(' / ')[0]}</span>
              <span className="text-sm text-gray-500">{data.total} total</span>
              <span className="text-xs text-gray-400 ml-auto">
                {data.rentReady > 0 && `${data.rentReady} ready `}
                {data.needsWork > 0 && `${data.needsWork} work `}
                {data.escalation > 0 && `${data.escalation} escalate `}
                {data.companyOwned > 0 && `${data.companyOwned} co. owned`}
              </span>
            </div>
          ))}
        </div>

        {/* Escalation list */}
        {escalationUnits.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-4 print:bg-white print:border-red-300">
            <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Escalation — Follow-Up Required
            </h3>
            {escalationUnits.map(u => (
              <div key={u.id} className="py-2 border-b border-red-200 last:border-0 flex items-start justify-between gap-2">
                <div>
                  <span className="font-bold text-red-900">{u.id}</span>
                  <span className="text-sm text-red-700 ml-2">
                    {u.issues.filter(i => ['belongings_present', 'unauthorized_occupant', 'needs_auctioned'].includes(i))
                      .map(i => ISSUE_TYPES.find(it => it.id === i)?.shortLabel).join(', ')}
                  </span>
                  {u.notes && <p className="text-sm text-red-600 mt-0.5">{u.notes}</p>}
                </div>
                {onGenerateNotice && (
                  <button onClick={() => onGenerateNotice(u.id)}
                    className="flex-shrink-0 text-xs bg-red-700 text-white px-2 py-1 rounded font-semibold print:hidden">
                    Notice
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Full unit detail */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 print:border-0 print:p-0">
          <h3 className="font-bold text-gray-900 mb-3">Full Unit Detail</h3>
          {facility.buildings.map(building => {
            const buildingUnits = building.units.filter(u => audit.units[u.id]?.completed)
            if (buildingUnits.length === 0) return null
            return (
              <div key={building.id} className="mb-4 print:break-inside-avoid">
                <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2 border-b border-gray-200 pb-1">{building.name}</h4>
                {buildingUnits.map(unit => {
                  const ua = audit.units[unit.id]
                  const physLabel = PHYSICAL_STATUS_OPTIONS.find(o => o.id === ua.physicalStatus)?.label || '—'
                  const disc = isImported && ua.physicalStatus && isDiscrepancy(unit.status, ua.physicalStatus)
                  return (
                    <div key={unit.id} className={`py-2 border-b border-gray-100 last:border-0 text-sm ${disc ? 'bg-amber-50 -mx-2 px-2 rounded' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">{unit.id}</span>
                        <div className="flex items-center gap-2">
                          {disc && <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-semibold">MISMATCH</span>}
                          <span className="text-gray-500">{physLabel}</span>
                        </div>
                      </div>
                      {ua.issues.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ua.issues.map(i => (
                            <span key={i} className="inline-block bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 text-xs">
                              {ISSUE_TYPES.find(it => it.id === i)?.shortLabel || i}
                            </span>
                          ))}
                        </div>
                      )}
                      {ua.notes && <p className="text-gray-500 text-xs mt-1">{ua.notes}</p>}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Action buttons */}
        <div className="space-y-3 print:hidden">
          <button onClick={() => window.print()} className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl py-3.5 font-semibold text-sm">
            <Printer className="w-4 h-4" /> Print Report
          </button>
          <button onClick={exportJSON} className="w-full flex items-center justify-center gap-2 border-2 border-gray-300 text-gray-700 rounded-xl py-3.5 font-semibold text-sm">
            <Download className="w-4 h-4" /> Export JSON
          </button>
          <button onClick={() => setConfirmClear(true)} className="w-full flex items-center justify-center gap-2 border-2 border-red-200 text-red-600 rounded-xl py-3.5 font-semibold text-sm">
            <RotateCcw className="w-4 h-4" /> New Audit
          </button>
          <button onClick={onSwitchFacility} className="w-full flex items-center justify-center gap-2 text-gray-500 py-3 text-sm">
            <Building2 className="w-4 h-4" /> Switch Facility
          </button>
        </div>

        <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          {facility.facility.confidentiality || 'INTERNAL USE ONLY — CONFIDENTIAL FACILITY AUDIT'}
        </div>
      </div>

      <ConfirmDialog open={confirmClear} title="Start New Audit?"
        message="This will clear the current in-progress audit for this facility. This cannot be undone."
        onConfirm={handleNewAudit} onCancel={() => setConfirmClear(false)} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  NOTICE PRINT VIEW                                      */
/* ═══════════════════════════════════════════════════════ */

function NoticePrintView({ notice, facilityPrint }: {
  notice: UnitNotice
  facilityPrint: { printName: string; printAddress: string; printPhone: string }
}) {
  // @ts-ignore used in template below
  const checkedReasons = NOTICE_REASONS.filter(r => notice.reasons[r.id])

  return (
    <div className="notice-print-view hidden" style={{ fontFamily: 'Helvetica, Arial, sans-serif', color: '#000', background: '#fff', width: '8.5in', minHeight: '11in' }}>
      {/* Red accent bar */}
      <div className="notice-accent-bar" style={{ height: '6px', background: '#b71c1c' }} />

      {/* Dark header */}
      <div className="notice-header" style={{ background: '#111', padding: '18px 28px', color: '#fff' }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.5px' }}>{facilityPrint.printName}</div>
        <div style={{ fontSize: '9px', color: '#ccc', marginTop: '3px' }}>{facilityPrint.printAddress}</div>
        <div style={{ fontSize: '9px', color: '#ccc' }}>{facilityPrint.printPhone}</div>
      </div>

      {/* Red title bar */}
      <div className="notice-title-bar" style={{ background: '#b71c1c', padding: '10px 28px', color: '#fff' }}>
        <div style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '1px' }}>OFFICIAL NOTICE</div>
        <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '2px', letterSpacing: '0.5px' }}>
          ACCOUNT DISCREPANCY | UNAUTHORIZED USE | POLICY VIOLATION
        </div>
      </div>

      {/* Date / Unit / Tenant */}
      <div style={{ padding: '14px 28px', borderBottom: '1px solid #aaa', display: 'flex', gap: '32px', fontSize: '10px' }}>
        <div><strong>Date:</strong> {notice.date}</div>
        <div><strong>Unit #:</strong> {notice.unitNumber}</div>
        <div><strong>Tenant Name:</strong> {notice.tenantName || '________________________________'}</div>
      </div>

      {/* Legal notice box */}
      <div className="notice-legal-box" style={{ margin: '14px 28px', padding: '12px 16px', background: '#fdf0f0', borderLeft: '4px solid #b71c1c', fontSize: '8.5px', lineHeight: '1.5' }}>
        <div style={{ color: '#b71c1c', fontWeight: 'bold', fontSize: '10px', marginBottom: '6px' }}>NOTICE TO OCCUPANT</div>
        <p style={{ margin: 0 }}>{noticeConfig.legalNoticeText}</p>
      </div>

      {/* Reasons */}
      <div style={{ padding: '0 28px', marginTop: '10px' }}>
        <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#b71c1c', borderBottom: '2px solid #b71c1c', paddingBottom: '4px', marginBottom: '8px', letterSpacing: '0.5px' }}>
          REASON(S) FOR THIS NOTICE
        </div>
        {NOTICE_REASONS.map(reason => {
          const checked = notice.reasons[reason.id]
          return (
            <div key={reason.id} style={{ fontSize: '9px', marginBottom: '4px', display: 'flex', gap: '6px', fontWeight: checked ? 'bold' : 'normal' }}>
              <span>{checked ? '\u2611' : '\u2610'}</span>
              <span>{reason.printText}</span>
            </div>
          )
        })}
      </div>

      {/* Additional details */}
      {notice.additionalDetails && (
        <div style={{ padding: '0 28px', marginTop: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>DETAILS / DESCRIPTION OF VIOLATION</div>
          <div style={{ fontSize: '9px', lineHeight: '1.5', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '3px', minHeight: '30px' }}>
            {notice.additionalDetails}
          </div>
        </div>
      )}

      {/* Required action bar */}
      <div className="notice-action-bar" style={{ margin: '14px 28px 0', background: '#b71c1c', color: '#fff', padding: '10px 16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px', marginBottom: '6px' }}>REQUIRED ACTION — RESPOND IMMEDIATELY</div>
        <div style={{ fontSize: '8.5px', lineHeight: '1.5' }}>
          {noticeConfig.requiredActionText.replace('{days}', String(notice.responseDeadlineDays))}
        </div>
        <ul style={{ margin: '8px 0 0 0', padding: 0, listStyle: 'none', fontSize: '8.5px', lineHeight: '1.6' }}>
          {noticeConfig.consequences.map((c, i) => (
            <li key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
              <span style={{ color: '#fff', flexShrink: 0 }}>{'\u25A0'}</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Divider */}
      <div style={{ margin: '14px 28px', borderTop: '1px solid #aaa' }} />

      {/* Office use */}
      <div style={{ padding: '0 28px', fontSize: '9px' }}>
        <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>FOR FACILITY USE ONLY</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
          <div><strong>Issued by:</strong> {notice.issuedBy}</div>
          <div><strong>Date/Time:</strong> {notice.date} {new Date(notice.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
          <div><strong>Photos taken:</strong> {notice.photosTaken === true ? 'Y' : notice.photosTaken === false ? 'N' : '___'}</div>
          <div><strong>Police notified:</strong> {notice.policeNotified === true ? 'Y' : notice.policeNotified === false ? 'N' : '___'}</div>
          <div><strong>Lock changed by facility:</strong> {notice.lockChangedByFacility === true ? 'Y' : notice.lockChangedByFacility === false ? 'N' : '___'}</div>
          <div><strong>Follow-up date:</strong> {notice.followUpDate || '________________'}</div>
          <div><strong>Resolved:</strong> {notice.resolved ? 'Y' : 'N'}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="notice-footer" style={{ margin: '14px 0 0', background: '#b71c1c', color: '#fff', padding: '8px 28px', fontSize: '7px', lineHeight: '1.5' }}>
        {noticeConfig.footerLines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  NOTICE BUILDER                                         */
/* ═══════════════════════════════════════════════════════ */

function NoticeBuilder({ facilityId, facilityName, prefill, onBack, onSaved }: {
  facilityId: string
  facilityName: string
  prefill?: NoticePrefill
  onBack: () => void
  onSaved: (notice: UnitNotice) => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [notice, setNotice] = useState<UnitNotice>(() => {
    const defaultReasons: Record<string, boolean> = {}
    NOTICE_REASONS.forEach(r => { defaultReasons[r.id] = false })
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      facilityId,
      createdAt: new Date().toISOString(),
      date: today,
      unitNumber: prefill?.unitNumber || '',
      tenantName: '',
      reasons: { ...defaultReasons, ...(prefill?.reasons || {}) },
      additionalDetails: prefill?.additionalDetails || '',
      responseDeadlineDays: noticeConfig.defaultResponseDeadlineDays,
      issuedBy: prefill?.issuedBy || '',
      photosTaken: null,
      policeNotified: null,
      lockChangedByFacility: null,
      followUpDate: '',
      resolved: false,
      auditUnitId: prefill?.auditUnitId,
      auditIssues: prefill?.auditIssues,
    }
  })
  const [showPrint, setShowPrint] = useState(false)

  const facilityPrint = NOTICE_FACILITIES[facilityId] || {
    printName: facilityName.toUpperCase(),
    printAddress: '',
    printPhone: '',
  }

  function update(updates: Partial<UnitNotice>) {
    setNotice(prev => ({ ...prev, ...updates }))
  }

  function toggleReason(reasonId: string) {
    setNotice(prev => ({
      ...prev,
      reasons: { ...prev.reasons, [reasonId]: !prev.reasons[reasonId] },
    }))
  }

  function handlePrint() {
    setShowPrint(true)
    setTimeout(() => window.print(), 200)
  }

  function handleSave() {
    saveNotice(facilityId, notice)
    onSaved(notice)
  }

  const hasCheckedReason = Object.values(notice.reasons).some(Boolean)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Screen header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 print:hidden">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1 text-gray-500 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Audit
          </button>
          <span className="text-sm font-medium text-gray-900">Generate Notice</span>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 print:hidden">
        <div className="flex items-center gap-2 mb-4">
          <FileWarning className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-bold text-gray-900">Unit Notice</h2>
          <span className="text-sm text-gray-500">{facilityName}</span>
        </div>

        {/* Unit info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">Unit Info</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <input type="date" value={notice.date} onChange={e => update({ date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Unit #</label>
              <input type="text" value={notice.unitNumber} onChange={e => update({ unitNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-semibold" />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">Tenant Name</label>
            <input type="text" value={notice.tenantName} onChange={e => update({ tenantName: e.target.value })}
              placeholder="Enter tenant name" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
          </div>
        </div>

        {/* Reasons */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">Reason(s) for Notice</div>
          {NOTICE_REASONS.map(reason => (
            <label key={reason.id} className="flex items-center gap-3 py-2 px-1 cursor-pointer active:bg-gray-50 rounded">
              <input type="checkbox" checked={notice.reasons[reason.id]} onChange={() => toggleReason(reason.id)}
                className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer" />
              <span className={`text-sm ${notice.reasons[reason.id] ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{reason.label}</span>
            </label>
          ))}
        </div>

        {/* Additional details */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Additional Details</div>
          <textarea value={notice.additionalDetails} onChange={e => update({ additionalDetails: e.target.value })}
            placeholder="Describe the violation or situation..." rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none" />
        </div>

        {/* Response deadline */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Required Response</div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Response deadline:</label>
            <input type="number" min={1} max={30} value={notice.responseDeadlineDays}
              onChange={e => update({ responseDeadlineDays: parseInt(e.target.value) || 3 })}
              className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-sm text-center font-semibold" />
            <span className="text-sm text-gray-500">business days</span>
          </div>
        </div>

        {/* Office use */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">Office Use</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Issued by</label>
              <input type="text" value={notice.issuedBy} onChange={e => update({ issuedBy: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
            </div>
            {noticeConfig.officeUseFields.map(field => (
              <div key={field.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{field.label}</span>
                <div className="flex gap-2">
                  {[true, false].map(val => (
                    <button key={String(val)} onClick={() => update({ [field.id]: val } as any)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        notice[field.id as keyof UnitNotice] === val
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-500 border-gray-300'
                      }`}>
                      {val ? 'Y' : 'N'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Follow-up date</label>
              <input type="date" value={notice.followUpDate} onChange={e => update({ followUpDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3 mt-4 pb-6">
          <button onClick={handlePrint} disabled={!notice.unitNumber || !hasCheckedReason}
            className="w-full bg-red-700 text-white rounded-xl py-4 font-semibold text-base disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
            <Printer className="w-5 h-5" /> Preview & Print Notice
          </button>
          <button onClick={handleSave} disabled={!notice.unitNumber || !hasCheckedReason}
            className="w-full border-2 border-gray-300 text-gray-700 rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Save Notice
          </button>
        </div>
      </div>

      {/* Print view — hidden until print */}
      <NoticePrintView notice={notice} facilityPrint={facilityPrint} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  MAIN AUDIT TOOL                                        */
/* ═══════════════════════════════════════════════════════ */

export default function AuditTool() {
  const [screen, setScreen] = useState<Screen>('select')
  const [facilityId, setFacilityId] = useState<string | null>(null)
  const [audit, setAudit] = useState<AuditState | null>(null)
  const [importedFacilities, setImportedFacilities] = useState<Record<string, FacilityData>>(() => loadImportedFacilities())
  const [importResult, setImportResult] = useState<{ result: AnalyzeMapResult; imageDataUrl: string } | null>(null)
  const [noticePrefill, setNoticePrefill] = useState<NoticePrefill | undefined>(undefined)
  const [previousScreen, setPreviousScreen] = useState<Screen>('walkthrough')

  const allFacilities = useMemo(() => ({
    ...HARDCODED_FACILITIES,
    ...importedFacilities,
  }), [importedFacilities])

  const facility = facilityId ? allFacilities[facilityId] : null
  const isImported = facilityId ? !HARDCODED_FACILITIES[facilityId] : false

  function selectFacility(id: string) {
    setFacilityId(id)
    setScreen('start')
  }

  function startAudit(date: string, auditor: string) {
    const newAudit: AuditState = {
      facilityId: facilityId!,
      meta: { date, auditor, startedAt: new Date().toISOString() },
      units: {},
    }
    setAudit(newAudit)
    saveAudit(newAudit)
    setScreen('walkthrough')
  }

  function resumeAudit() {
    const saved = loadAudit(facilityId!)
    if (saved) {
      setAudit(saved)
      setScreen('walkthrough')
    }
  }

  function updateUnit(unitId: string, updates: Partial<UnitAudit>) {
    setAudit(prev => {
      if (!prev) return prev
      const current = prev.units[unitId] || { issues: [], notes: '', physicalStatus: null, completed: false }
      const next: AuditState = {
        ...prev,
        units: { ...prev.units, [unitId]: { ...current, ...updates } },
      }
      saveAudit(next)
      return next
    })
  }

  function handleNewAudit() {
    setAudit(null)
    setScreen('start')
  }

  function handleSwitchFacility() {
    setAudit(null)
    setFacilityId(null)
    setScreen('select')
  }

  function handleDeleteImported(id: string) {
    deleteImportedFacility(id)
    setImportedFacilities(loadImportedFacilities())
  }

  function handleGenerateNotice(unitId: string) {
    if (!audit) return
    const unitAudit = audit.units[unitId]
    if (unitAudit) {
      setNoticePrefill(prefillNoticeFromAudit(unitId, unitAudit, audit.meta.auditor))
    } else {
      setNoticePrefill({ unitNumber: unitId, issuedBy: audit.meta.auditor })
    }
    setPreviousScreen(screen)
    setScreen('notice')
  }

  function handleMapAnalyzed(result: AnalyzeMapResult, imageDataUrl: string) {
    setImportResult({ result, imageDataUrl })
    setScreen('review')
  }

  async function handleConfirmImport(
    facilityName: string,
    buildings: AnalyzeMapResult['buildings'],
    imageDataUrl: string,
    occupiedCount: number
  ) {
    const id = slugify(facilityName) + '-' + Date.now().toString(36)

    // Create thumbnail for localStorage storage
    const thumbnailUrl = await resizeForThumbnail(imageDataUrl, 1024)

    // Build facility data — filter out blue (occupied) units
    const facilityData: FacilityData = {
      facility: {
        id,
        name: facilityName,
        address: 'Imported from site map',
        phone: '',
        confidentiality: 'INTERNAL USE ONLY — CONFIDENTIAL FACILITY AUDIT',
      },
      buildings: buildings
        .map(b => ({
          id: b.id,
          name: b.name,
          units: b.units
            .filter(u => u.mapColor !== 'blue')
            .map(u => ({
              id: u.id,
              status: MAP_COLOR_TO_STATUS[u.mapColor] || 'gray',
            })),
        }))
        .filter(b => b.units.length > 0),
      mapImageUrl: thumbnailUrl,
      occupiedCount,
      importedAt: new Date().toISOString(),
    }

    saveImportedFacility(id, facilityData)
    setImportedFacilities(loadImportedFacilities())
    setFacilityId(id)
    setImportResult(null)
    setScreen('start')
  }

  // Screen routing
  if (screen === 'select') {
    return (
      <FacilitySelect
        allFacilities={allFacilities}
        onSelect={selectFacility}
        onImport={() => setScreen('import')}
        onDeleteImported={handleDeleteImported}
      />
    )
  }

  if (screen === 'import') {
    return <MapImportScreen onAnalyzed={handleMapAnalyzed} onBack={() => setScreen('select')} />
  }

  if (screen === 'review' && importResult) {
    return (
      <MapReviewScreen
        result={importResult.result}
        imageDataUrl={importResult.imageDataUrl}
        onConfirm={handleConfirmImport}
        onBack={() => setScreen('import')}
      />
    )
  }

  if (screen === 'start' && facility) {
    return <StartScreen facility={facility} onStart={startAudit} onResume={resumeAudit} onBack={handleSwitchFacility} />
  }

  if (screen === 'walkthrough' && facility && audit) {
    return (
      <AuditWalkthrough facility={facility} audit={audit} onUpdateUnit={updateUnit}
        onViewSummary={() => setScreen('summary')} onBack={() => setScreen('start')} isImported={isImported}
        onGenerateNotice={handleGenerateNotice} />
    )
  }

  if (screen === 'summary' && facility && audit) {
    return (
      <AuditSummary facility={facility} audit={audit} onBack={() => setScreen('walkthrough')}
        onNewAudit={handleNewAudit} onSwitchFacility={handleSwitchFacility} isImported={isImported}
        onGenerateNotice={handleGenerateNotice} />
    )
  }

  if (screen === 'notice' && facility) {
    return (
      <NoticeBuilder
        facilityId={facility.facility.id}
        facilityName={facility.facility.name}
        prefill={noticePrefill}
        onBack={() => setScreen(previousScreen)}
        onSaved={() => setScreen(previousScreen)}
      />
    )
  }

  return null
}
