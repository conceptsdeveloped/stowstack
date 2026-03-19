import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ChevronDown, ChevronRight, Check, AlertTriangle, Building2, Printer, Download, RotateCcw, ArrowLeft, ArrowRight, ClipboardList } from 'lucide-react'
import midwayData from '@/data/midway.json'
import twopawsData from '@/data/twopaws.json'
import auditConfig from '@/data/audit-config.json'

/* ═══════════════════════════════════════════════════════ */
/*  TYPES                                                  */
/* ═══════════════════════════════════════════════════════ */

interface FacilityData {
  facility: { id: string; name: string; address: string; phone: string; confidentiality: string }
  buildings: { id: string; name: string; units: { id: string; status: string }[] }[]
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

type Screen = 'select' | 'start' | 'walkthrough' | 'summary'

const FACILITIES: Record<string, FacilityData> = {
  midway: midwayData as FacilityData,
  twopaws: twopawsData as FacilityData,
}

const STATUS_TYPES = auditConfig.statusTypes as Record<string, { label: string; color: string; priority: number }>
const ISSUE_TYPES = auditConfig.issueTypes
const ISSUE_CATEGORIES = auditConfig.issueCategories as Record<string, { label: string; order: number }>
const PHYSICAL_STATUS_OPTIONS = auditConfig.physicalStatusOptions

const ESCALATION_ISSUES = ['belongings_present', 'unauthorized_occupant']

function getStorageKey(facilityId: string) {
  return `audit_${facilityId}`
}

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

function getTotalUnits(facility: FacilityData) {
  return facility.buildings.reduce((sum, b) => sum + b.units.length, 0)
}

function getStatusCounts(facility: FacilityData) {
  const counts: Record<string, number> = { green: 0, yellow: 0, gray: 0, red: 0 }
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

function FacilitySelect({ onSelect }: { onSelect: (id: string) => void }) {
  const facilities = Object.entries(FACILITIES)
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <ClipboardList className="w-12 h-12 text-gray-800 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Unit Audit Tool</h1>
          <p className="text-gray-500 mt-1">Select a facility to begin</p>
        </div>
        <div className="space-y-4">
          {facilities.map(([id, data]) => {
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
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${(completed / total) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-green-600">
                      Resume: {completed}/{total}
                    </span>
                  </div>
                )}
              </button>
            )
          })}
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
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Auditor Name</label>
          <input
            type="text"
            value={auditor}
            onChange={e => setAuditor(e.target.value)}
            placeholder="Your name"
            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">{total} Units to Audit</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_TYPES[status]?.color }} />
                <span className="text-gray-600">{count} {STATUS_TYPES[status]?.label.split(' / ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => onStart(date, auditor)}
          disabled={!auditor.trim()}
          className="w-full bg-gray-900 text-white rounded-xl py-4 font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
        >
          Start Audit <ArrowRight className="w-4 h-4 inline ml-1" />
        </button>

        {saved && completed > 0 && (
          <button
            onClick={onResume}
            className="w-full mt-3 border-2 border-green-600 text-green-700 rounded-xl py-4 font-semibold text-base active:scale-[0.98] transition-transform"
          >
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

function UnitCard({ unit, unitAudit, expanded, onToggle, onUpdate, onComplete }: {
  unit: { id: string; status: string }
  unitAudit: UnitAudit
  expanded: boolean
  onToggle: () => void
  onUpdate: (updates: Partial<UnitAudit>) => void
  onComplete: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const issuesByCategory = useMemo(() => {
    const grouped: Record<string, typeof ISSUE_TYPES> = {}
    const categoryOrder = Object.entries(ISSUE_CATEGORIES).sort((a, b) => a[1].order - b[1].order)
    categoryOrder.forEach(([cat]) => {
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

  // Card border color
  let borderColor = 'border-l-transparent'
  if (unitAudit.completed) {
    if (unitAudit.physicalStatus === 'company_use') borderColor = 'border-l-blue-500'
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

    if (statusId === 'no_issues' || statusId === 'rent_ready') {
      newIssues = []
    } else if (statusId === 'company_use') {
      newIssues = ['company_owned']
    }

    onUpdate({ physicalStatus: statusId, issues: newIssues })
  }

  // Auto-select escalate if escalation issue is checked
  useEffect(() => {
    if (unitAudit.issues.some(i => ESCALATION_ISSUES.includes(i)) && unitAudit.physicalStatus !== 'escalate') {
      onUpdate({ physicalStatus: 'escalate' })
    }
  }, [unitAudit.issues])

  const summaryText = unitAudit.completed
    ? unitAudit.physicalStatus === 'company_use'
      ? 'Company Owned'
      : unitAudit.physicalStatus === 'escalate'
        ? 'Follow-Up Required'
        : issueCount > 0
          ? `${issueCount} issue${issueCount > 1 ? 's' : ''}`
          : unitAudit.physicalStatus === 'rent_ready'
            ? 'Rent-Ready'
            : 'No issues'
    : issueCount > 0
      ? `${issueCount} issue${issueCount > 1 ? 's' : ''} checked`
      : 'Not started'

  return (
    <div ref={cardRef} className={`bg-white rounded-lg border border-gray-200 border-l-4 ${borderColor} shadow-sm overflow-hidden`}>
      {/* Collapsed header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          {unitAudit.completed ? (
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${
              unitAudit.physicalStatus === 'company_use' ? 'bg-blue-500' :
              unitAudit.physicalStatus === 'escalate' ? 'bg-red-500' :
              issueCount > 0 ? 'bg-orange-400' : 'bg-green-500'
            }`}>
              <Check className="w-3.5 h-3.5" />
            </span>
          ) : (
            <span className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_TYPES[unit.status]?.color }} />
            </span>
          )}
          <div>
            <span className="font-bold text-gray-900 text-base">{unit.id}</span>
            <span className="text-xs text-gray-400 ml-2">{summaryText}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={unit.status} />
          {expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="py-3 text-sm text-gray-500">
            System status: <StatusBadge status={unit.status} />
          </div>

          {/* Issue checkboxes by category */}
          {Object.entries(issuesByCategory).map(([cat, issues]) => (
            <div key={cat} className="mb-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 border-b border-gray-100 pb-1">
                {ISSUE_CATEGORIES[cat].label}
              </div>
              {issues.map(issue => (
                <label
                  key={issue.id}
                  className="flex items-center gap-3 py-2.5 px-1 active:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={unitAudit.issues.includes(issue.id)}
                    onChange={() => toggleIssue(issue.id)}
                    className="w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                  />
                  <span className={`text-sm ${
                    issue.category === 'escalation' ? 'font-semibold text-red-700' : 'text-gray-700'
                  }`}>
                    {issue.label}
                  </span>
                </label>
              ))}
            </div>
          ))}

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={unitAudit.notes}
              onChange={e => onUpdate({ notes: e.target.value })}
              placeholder="Add any notes about this unit..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>

          {/* Physical status radio */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">What did you find?</p>
            <div className="space-y-1">
              {PHYSICAL_STATUS_OPTIONS.map(opt => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer border transition-all ${
                    unitAudit.physicalStatus === opt.id
                      ? 'border-gray-900 bg-gray-50 shadow-sm'
                      : 'border-transparent hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`status-${unit.id}`}
                    checked={unitAudit.physicalStatus === opt.id}
                    onChange={() => setPhysicalStatus(opt.id)}
                    className="w-4 h-4 text-gray-900 focus:ring-gray-900"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Mark complete */}
          <button
            onClick={onComplete}
            disabled={!unitAudit.physicalStatus}
            className="w-full bg-gray-900 text-white rounded-lg py-3.5 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" /> Mark Complete
          </button>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  AUDIT WALKTHROUGH                                      */
/* ═══════════════════════════════════════════════════════ */

function AuditWalkthrough({ facility, audit, onUpdateUnit, onViewSummary, onBack }: {
  facility: FacilityData
  audit: AuditState
  onUpdateUnit: (unitId: string, updates: Partial<UnitAudit>) => void
  onViewSummary: () => void
  onBack: () => void
}) {
  const [activeBuilding, setActiveBuilding] = useState(facility.buildings[0].id)
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null)

  const totalUnits = getTotalUnits(facility)
  const completedCount = getCompletedCount(audit)
  const currentBuilding = facility.buildings.find(b => b.id === activeBuilding)!

  function handleComplete(unitId: string) {
    onUpdateUnit(unitId, { completed: true, completedAt: new Date().toISOString() })

    // Find next incomplete unit
    const allUnits = facility.buildings.flatMap(b => b.units)
    const currentIdx = allUnits.findIndex(u => u.id === unitId)
    for (let i = currentIdx + 1; i < allUnits.length; i++) {
      if (!audit.units[allUnits[i].id]?.completed) {
        setExpandedUnit(allUnits[i].id)
        // Switch building if needed
        const nextBuilding = facility.buildings.find(b => b.units.some(u => u.id === allUnits[i].id))
        if (nextBuilding && nextBuilding.id !== activeBuilding) {
          setActiveBuilding(nextBuilding.id)
        }
        return
      }
    }
    // All done — collapse
    setExpandedUnit(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm print:hidden">
        <div className="max-w-lg mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <button onClick={onBack} className="text-gray-500 p-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="text-xs text-gray-500 font-medium">{facility.facility.name}</p>
              <p className="text-sm font-bold text-gray-900">{completedCount}/{totalUnits} completed</p>
            </div>
            <button
              onClick={onViewSummary}
              className="text-sm font-medium text-gray-900 bg-gray-100 rounded-lg px-3 py-1.5"
            >
              Summary
            </button>
          </div>
          {/* Progress bar */}
          <div className="mt-2 bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / totalUnits) * 100}%` }}
            />
          </div>
        </div>

        {/* Building tabs */}
        <div className="max-w-lg mx-auto px-2 pb-2 pt-1">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {facility.buildings.map(b => {
              const bCompleted = b.units.filter(u => audit.units[u.id]?.completed).length
              const bTotal = b.units.length
              const allDone = bCompleted === bTotal
              return (
                <button
                  key={b.id}
                  onClick={() => setActiveBuilding(b.id)}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    b.id === activeBuilding
                      ? 'bg-gray-900 text-white'
                      : allDone
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {b.name.replace('Building ', '')}
                  <span className="ml-1 text-xs opacity-70">{bCompleted}/{bTotal}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Unit cards */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {currentBuilding.units.map(unit => {
          const unitAudit = audit.units[unit.id] || { issues: [], notes: '', physicalStatus: null, completed: false }
          return (
            <UnitCard
              key={unit.id}
              unit={unit}
              unitAudit={unitAudit}
              expanded={expandedUnit === unit.id}
              onToggle={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)}
              onUpdate={updates => onUpdateUnit(unit.id, updates)}
              onComplete={() => handleComplete(unit.id)}
            />
          )
        })}
      </div>

      {/* All complete banner */}
      {completedCount === totalUnits && (
        <div className="fixed bottom-0 left-0 right-0 bg-green-600 text-white p-4 text-center shadow-lg print:hidden">
          <p className="font-bold mb-1">All {totalUnits} units audited!</p>
          <button
            onClick={onViewSummary}
            className="bg-white text-green-700 rounded-lg px-6 py-2 font-semibold text-sm"
          >
            View Summary
          </button>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  AUDIT SUMMARY                                          */
/* ═══════════════════════════════════════════════════════ */

function AuditSummary({ facility, audit, onBack, onNewAudit, onSwitchFacility }: {
  facility: FacilityData
  audit: AuditState
  onBack: () => void
  onNewAudit: () => void
  onSwitchFacility: () => void
}) {
  const [confirmClear, setConfirmClear] = useState(false)

  const totalUnits = getTotalUnits(facility)
  const completedCount = getCompletedCount(audit)

  // Summary stats
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

  // Issue totals
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

  // Status breakdown
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

  // Escalation units
  const escalationUnits = useMemo(() => {
    return Object.entries(audit.units)
      .filter(([, u]) => u.physicalStatus === 'escalate' || u.issues.some(i => ['belongings_present', 'unauthorized_occupant', 'needs_auctioned'].includes(i)))
      .map(([id, u]) => ({ id, ...u }))
  }, [audit])

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ facility: facility.facility, audit, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' })
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
      {/* Header - screen only */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 print:hidden">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1 text-gray-500 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-sm font-medium text-gray-900">Audit Summary</span>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 audit-summary-content">
        {/* Print header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">UNIT AUDIT REPORT</h1>
          <p className="text-sm text-gray-600">{facility.facility.confidentiality}</p>
        </div>

        {/* Facility info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 print:border-0 print:p-0 print:mb-4">
          <h2 className="text-xl font-bold text-gray-900">{facility.facility.name}</h2>
          <p className="text-sm text-gray-500">{facility.facility.address}</p>
          <p className="text-sm text-gray-500">{facility.facility.phone}</p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
            <span>Date: <strong>{formatDate(audit.meta.date)}</strong></span>
            <span>Auditor: <strong>{audit.meta.auditor}</strong></span>
            <span>Units: <strong>{completedCount}/{totalUnits}</strong></span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
          {[
            { label: 'Rent-Ready', value: stats.rentReady, color: 'bg-green-50 text-green-700 border-green-200' },
            { label: 'Needs Work', value: stats.needsWork, color: 'bg-orange-50 text-orange-700 border-orange-200' },
            { label: 'Escalation', value: stats.escalation, color: 'bg-red-50 text-red-700 border-red-200' },
            { label: 'Company', value: stats.companyOwned, color: 'bg-blue-50 text-blue-700 border-blue-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 text-center ${s.color}`}>
              <div className="text-3xl font-bold">{s.value}</div>
              <div className="text-xs font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

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
              <div key={u.id} className="py-2 border-b border-red-200 last:border-0">
                <span className="font-bold text-red-900">{u.id}</span>
                <span className="text-sm text-red-700 ml-2">
                  {u.issues.filter(i => ['belongings_present', 'unauthorized_occupant', 'needs_auctioned'].includes(i))
                    .map(i => ISSUE_TYPES.find(it => it.id === i)?.shortLabel).join(', ')}
                </span>
                {u.notes && <p className="text-sm text-red-600 mt-0.5">{u.notes}</p>}
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
                <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2 border-b border-gray-200 pb-1">
                  {building.name}
                </h4>
                {buildingUnits.map(unit => {
                  const ua = audit.units[unit.id]
                  const physLabel = PHYSICAL_STATUS_OPTIONS.find(o => o.id === ua.physicalStatus)?.label || '—'
                  return (
                    <div key={unit.id} className="py-2 border-b border-gray-100 last:border-0 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">{unit.id}</span>
                        <span className="text-gray-500">{physLabel}</span>
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

        {/* Action buttons - screen only */}
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

        {/* Print footer */}
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          {facility.facility.confidentiality}
        </div>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Start New Audit?"
        message="This will clear the current in-progress audit for this facility. This cannot be undone."
        onConfirm={handleNewAudit}
        onCancel={() => setConfirmClear(false)}
      />
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

  const facility = facilityId ? FACILITIES[facilityId] : null

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

  if (screen === 'select') {
    return <FacilitySelect onSelect={selectFacility} />
  }

  if (screen === 'start' && facility) {
    return (
      <StartScreen
        facility={facility}
        onStart={startAudit}
        onResume={resumeAudit}
        onBack={handleSwitchFacility}
      />
    )
  }

  if (screen === 'walkthrough' && facility && audit) {
    return (
      <AuditWalkthrough
        facility={facility}
        audit={audit}
        onUpdateUnit={updateUnit}
        onViewSummary={() => setScreen('summary')}
        onBack={() => setScreen('start')}
      />
    )
  }

  if (screen === 'summary' && facility && audit) {
    return (
      <AuditSummary
        facility={facility}
        audit={audit}
        onBack={() => setScreen('walkthrough')}
        onNewAudit={handleNewAudit}
        onSwitchFacility={handleSwitchFacility}
      />
    )
  }

  return null
}
