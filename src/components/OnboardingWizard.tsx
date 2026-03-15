import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, ChevronRight, ChevronLeft, Check, Loader2, Plus, Trash2,
  Building2, Target, LayoutGrid, Shield, Megaphone, ClipboardCheck,
  AlertCircle, Save
} from 'lucide-react'

/* ── Types ── */

interface StepData {
  facilityDetails: { brandDescription: string; brandColors: string; sellingPoints: string[] }
  targetDemographics: { ageMin: number; ageMax: number; radiusMiles: number; incomeLevel: string; targetRenters: boolean; targetOwners: boolean; notes: string }
  unitMix: { units: { type: string; size: string; monthlyRate: number; availableCount: number }[]; specials: string }
  competitorIntel: { competitors: { name: string; distance: string; pricingNotes: string }[]; differentiation: string }
  adPreferences: { toneOfVoice: string; pastAdExperience: string; monthlyBudget: string; primaryGoal: string; notes: string }
}

interface OnboardingData {
  accessCode: string
  updatedAt: string
  completedAt: string | null
  steps: {
    [K in keyof StepData]: { completed: boolean; data: StepData[K] }
  }
}

interface WizardProps {
  accessCode: string
  adminKey?: string
  clientEmail?: string
  onClose: () => void
  onCompletionChange?: (pct: number) => void
}

/* ── Constants ── */

const STEP_KEYS = ['facilityDetails', 'targetDemographics', 'unitMix', 'competitorIntel', 'adPreferences', 'review'] as const
type StepKey = typeof STEP_KEYS[number]

const STEP_META: { key: StepKey; label: string; shortLabel: string; icon: any }[] = [
  { key: 'facilityDetails', label: 'Facility Details', shortLabel: 'Facility', icon: Building2 },
  { key: 'targetDemographics', label: 'Target Demographics', shortLabel: 'Targeting', icon: Target },
  { key: 'unitMix', label: 'Unit Mix & Pricing', shortLabel: 'Units', icon: LayoutGrid },
  { key: 'competitorIntel', label: 'Competitor Intel', shortLabel: 'Competitors', icon: Shield },
  { key: 'adPreferences', label: 'Ad Preferences', shortLabel: 'Ad Prefs', icon: Megaphone },
  { key: 'review', label: 'Review & Submit', shortLabel: 'Review', icon: ClipboardCheck },
]

const INCOME_OPTIONS = [
  { value: 'any', label: 'Any income' },
  { value: 'low-mid', label: 'Low to mid' },
  { value: 'mid-high', label: 'Mid to high' },
  { value: 'high', label: 'High income' },
]

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly & Approachable' },
  { value: 'urgent', label: 'Urgency-driven' },
  { value: 'premium', label: 'Premium / Luxury' },
]

const BUDGET_OPTIONS = [
  { value: 'under-1k', label: 'Under $1,000/mo' },
  { value: '1k-2.5k', label: '$1,000 – $2,500/mo' },
  { value: '2.5k-5k', label: '$2,500 – $5,000/mo' },
  { value: '5k-10k', label: '$5,000 – $10,000/mo' },
  { value: '10k+', label: '$10,000+/mo' },
]

const GOAL_OPTIONS = [
  { value: 'fill-units', label: 'Fill empty units' },
  { value: 'lease-up', label: 'New facility lease-up' },
  { value: 'seasonal-push', label: 'Seasonal push' },
  { value: 'rebrand', label: 'Rebrand / new market presence' },
]

/* ── Helpers ── */

function emptyOnboarding(code: string): OnboardingData {
  return {
    accessCode: code,
    updatedAt: new Date().toISOString(),
    completedAt: null,
    steps: {
      facilityDetails: { completed: false, data: { brandDescription: '', brandColors: '', sellingPoints: [''] } },
      targetDemographics: { completed: false, data: { ageMin: 25, ageMax: 65, radiusMiles: 15, incomeLevel: 'any', targetRenters: true, targetOwners: true, notes: '' } },
      unitMix: { completed: false, data: { units: [{ type: '', size: '', monthlyRate: 0, availableCount: 0 }], specials: '' } },
      competitorIntel: { completed: false, data: { competitors: [], differentiation: '' } },
      adPreferences: { completed: false, data: { toneOfVoice: '', pastAdExperience: '', monthlyBudget: '', primaryGoal: '', notes: '' } },
    },
  }
}

/* ── Main Component ── */

export default function OnboardingWizard({ accessCode, adminKey, clientEmail, onClose, onCompletionChange }: WizardProps) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<OnboardingData>(emptyOnboarding(accessCode))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error' | ''>('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [fetchError, setFetchError] = useState<string | null>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (adminKey) h['X-Admin-Key'] = adminKey
    return h
  }

  const authBody = () => clientEmail ? { email: clientEmail } : {}

  // Fetch onboarding data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams({ code: accessCode })
        if (clientEmail) params.set('email', clientEmail)
        const res = await fetch(`/api/client-onboarding?${params}`, { headers: authHeaders() })
        if (!res.ok) throw new Error('Failed to load onboarding data')
        const json = await res.json()
        setData(json.onboarding)
        // Jump to first incomplete step
        const firstIncomplete = (Object.keys(json.onboarding.steps) as (keyof StepData)[]).findIndex(
          k => !json.onboarding.steps[k].completed
        )
        if (firstIncomplete >= 0) setStep(firstIncomplete)
        else setStep(5) // All done, show review
      } catch (err: any) {
        setFetchError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [accessCode])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Scroll to top on step change
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  // Cleanup auto-save timer
  useEffect(() => {
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [])

  const saveStep = useCallback(async (stepKey: keyof StepData, stepData: any) => {
    setSaving(true)
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/client-onboarding', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ code: accessCode, step: stepKey, data: stepData, ...authBody() }),
      })
      if (!res.ok) throw new Error('Save failed')
      const json = await res.json()
      setData(json.onboarding)
      setSaveStatus('saved')
      onCompletionChange?.(json.completionPct)
      return true
    } catch {
      setSaveStatus('error')
      return false
    } finally {
      setSaving(false)
    }
  }, [accessCode, adminKey, clientEmail])

  const scheduleAutoSave = (stepKey: keyof StepData, stepData: any) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    setSaveStatus('unsaved')
    autoSaveTimer.current = setTimeout(() => saveStep(stepKey, stepData), 3000)
  }

  const updateStepData = <K extends keyof StepData>(stepKey: K, updater: (prev: StepData[K]) => StepData[K]) => {
    setData(prev => {
      const newStepData = updater(prev.steps[stepKey].data)
      const next = { ...prev, steps: { ...prev.steps, [stepKey]: { ...prev.steps[stepKey], data: newStepData } } }
      scheduleAutoSave(stepKey, newStepData)
      return next
    })
    setErrors({})
  }

  const validateStep = (idx: number): Record<string, string> => {
    const errs: Record<string, string> = {}
    if (idx === 0) {
      const d = data.steps.facilityDetails.data
      if (!d.brandDescription.trim()) errs.brandDescription = 'Required'
      if (!d.brandColors.trim()) errs.brandColors = 'Required'
      if (!d.sellingPoints.some(s => s.trim())) errs.sellingPoints = 'At least one selling point required'
    } else if (idx === 1) {
      const d = data.steps.targetDemographics.data
      if (!d.ageMin || d.ageMin < 18) errs.ageMin = 'Min age must be 18+'
      if (!d.ageMax || d.ageMax < d.ageMin) errs.ageMax = 'Must be >= min age'
      if (!d.radiusMiles || d.radiusMiles < 1) errs.radiusMiles = 'Required'
      if (!d.incomeLevel) errs.incomeLevel = 'Required'
    } else if (idx === 2) {
      const d = data.steps.unitMix.data
      if (d.units.length === 0) errs.units = 'At least one unit required'
      d.units.forEach((u, i) => {
        if (!u.type.trim()) errs[`unit_${i}_type`] = 'Required'
        if (!u.size.trim()) errs[`unit_${i}_size`] = 'Required'
        if (!u.monthlyRate || u.monthlyRate <= 0) errs[`unit_${i}_rate`] = 'Must be > 0'
      })
    } else if (idx === 3) {
      const d = data.steps.competitorIntel.data
      if (!d.differentiation.trim()) errs.differentiation = 'Required'
      d.competitors.forEach((c, i) => {
        if (!c.name.trim()) errs[`comp_${i}_name`] = 'Required'
        if (!c.distance.trim()) errs[`comp_${i}_distance`] = 'Required'
      })
    } else if (idx === 4) {
      const d = data.steps.adPreferences.data
      if (!d.toneOfVoice) errs.toneOfVoice = 'Required'
      if (!d.monthlyBudget) errs.monthlyBudget = 'Required'
      if (!d.primaryGoal) errs.primaryGoal = 'Required'
    }
    return errs
  }

  const handleSaveAndContinue = async () => {
    if (step >= 5) return
    const errs = validateStep(step)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    const stepKey = STEP_KEYS[step] as keyof StepData
    const ok = await saveStep(stepKey, data.steps[stepKey].data)
    if (ok) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
  }

  // Loading state
  if (loading) {
    return (
      <Modal onClose={onClose}>
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" />
          Loading onboarding data...
        </div>
      </Modal>
    )
  }

  // Fetch error
  if (fetchError) {
    return (
      <Modal onClose={onClose}>
        <div className="text-center py-12">
          <AlertCircle size={32} className="mx-auto mb-3 text-red-400" />
          <p className="text-sm text-slate-600 mb-4">{fetchError}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800">
            Retry
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose}>
      {/* Step Indicator */}
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Campaign Onboarding</h2>
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Saving...</span>}
            {saveStatus === 'saved' && <span className="text-xs text-emerald-600 flex items-center gap-1"><Save size={10} /> Saved</span>}
            {saveStatus === 'unsaved' && <span className="text-xs text-amber-500">Unsaved changes</span>}
            {saveStatus === 'error' && <span className="text-xs text-red-500">Save failed</span>}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex gap-1.5">
          {STEP_META.map((s, i) => {
            const isComplete = i < 5 && data.steps[STEP_KEYS[i] as keyof StepData]?.completed
            const isCurrent = i === step
            return (
              <button
                key={s.key}
                onClick={() => setStep(i)}
                className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                  isCurrent ? 'bg-emerald-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isComplete ? 'bg-emerald-500 text-white' :
                  isCurrent ? 'ring-2 ring-emerald-500 text-emerald-600 bg-white' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {isComplete ? <Check size={12} /> : i + 1}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block ${isCurrent ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {s.shortLabel}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div ref={contentRef} className="overflow-y-auto flex-1 p-5" style={{ maxHeight: 'calc(90vh - 180px)' }}>
        {step === 0 && <Step1FacilityDetails data={data.steps.facilityDetails.data} errors={errors} onChange={(d) => updateStepData('facilityDetails', () => d)} />}
        {step === 1 && <Step2Demographics data={data.steps.targetDemographics.data} errors={errors} onChange={(d) => updateStepData('targetDemographics', () => d)} />}
        {step === 2 && <Step3UnitMix data={data.steps.unitMix.data} errors={errors} onChange={(d) => updateStepData('unitMix', () => d)} />}
        {step === 3 && <Step4Competitors data={data.steps.competitorIntel.data} errors={errors} onChange={(d) => updateStepData('competitorIntel', () => d)} />}
        {step === 4 && <Step5AdPrefs data={data.steps.adPreferences.data} errors={errors} onChange={(d) => updateStepData('adPreferences', () => d)} />}
        {step === 5 && <Step6Review data={data} onEditStep={setStep} />}
      </div>

      {/* Footer Navigation */}
      <div className="border-t border-slate-200 px-5 py-3 flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={step === 0}
          className={`flex items-center gap-1 text-sm font-medium px-4 py-2 rounded-lg transition-all ${
            step === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ChevronLeft size={16} /> Back
        </button>
        {step < 5 ? (
          <button
            onClick={handleSaveAndContinue}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm font-semibold px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save & Continue <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={onClose} className="text-sm font-semibold px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all">
            Done
          </button>
        )}
      </div>
    </Modal>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  MODAL WRAPPER                                         */
/* ═══════════════════════════════════════════════════════ */

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  SHARED FORM COMPONENTS                                */
/* ═══════════════════════════════════════════════════════ */

function FieldLabel({ label, required, htmlFor }: { label: string; required?: boolean; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1">
      {label} {required && <span className="text-red-400">*</span>}
      {!required && <span className="text-slate-400 text-xs font-normal">(optional)</span>}
    </label>
  )
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null
  return <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {error}</p>
}

function TextInput({ value, onChange, placeholder, error, id, maxLength }: {
  value: string; onChange: (v: string) => void; placeholder?: string; error?: string; id?: string; maxLength?: number
}) {
  return (
    <>
      <input
        id={id}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full px-3 py-2 text-sm bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors ${
          error ? 'border-red-300 bg-red-50/50' : 'border-slate-200'
        }`}
      />
      <FieldError error={error} />
    </>
  )
}

function TextArea({ value, onChange, placeholder, error, id, rows, maxLength }: {
  value: string; onChange: (v: string) => void; placeholder?: string; error?: string; id?: string; rows?: number; maxLength?: number
}) {
  return (
    <>
      <textarea
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows || 3}
        maxLength={maxLength}
        className={`w-full px-3 py-2 text-sm bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors resize-none ${
          error ? 'border-red-300 bg-red-50/50' : 'border-slate-200'
        }`}
      />
      <FieldError error={error} />
    </>
  )
}

function SelectInput({ value, onChange, options, placeholder, error, id }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string; error?: string; id?: string
}) {
  return (
    <>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full px-3 py-2 text-sm bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors ${
          error ? 'border-red-300 bg-red-50/50' : 'border-slate-200'
        } ${!value ? 'text-slate-400' : ''}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <FieldError error={error} />
    </>
  )
}

function NumberInput({ value, onChange, min, max, error, id, placeholder }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; error?: string; id?: string; placeholder?: string
}) {
  return (
    <>
      <input
        id={id}
        type="number"
        value={value || ''}
        onChange={e => onChange(Number(e.target.value))}
        min={min}
        max={max}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors ${
          error ? 'border-red-300 bg-red-50/50' : 'border-slate-200'
        }`}
      />
      <FieldError error={error} />
    </>
  )
}

function SectionHeading({ text }: { text: string }) {
  return <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{text}</h3>
}

/* ═══════════════════════════════════════════════════════ */
/*  STEP 1: FACILITY DETAILS                              */
/* ═══════════════════════════════════════════════════════ */

function Step1FacilityDetails({ data, errors, onChange }: {
  data: StepData['facilityDetails']; errors: Record<string, string>; onChange: (d: StepData['facilityDetails']) => void
}) {
  const update = <K extends keyof StepData['facilityDetails']>(key: K, val: StepData['facilityDetails'][K]) => {
    onChange({ ...data, [key]: val })
  }

  const updateSP = (idx: number, val: string) => {
    const next = [...data.sellingPoints]
    next[idx] = val
    update('sellingPoints', next)
  }

  const addSP = () => {
    if (data.sellingPoints.length >= 5) return
    update('sellingPoints', [...data.sellingPoints, ''])
  }

  const removeSP = (idx: number) => {
    if (data.sellingPoints.length <= 1) return
    update('sellingPoints', data.sellingPoints.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-5">
      <div>
        <SectionHeading text="Tell us about your facility" />
        <p className="text-sm text-slate-500 mb-4">This info helps us craft ads that feel authentic to your brand and location.</p>
      </div>

      <div>
        <FieldLabel label="Describe your facility" required htmlFor="brandDesc" />
        <TextArea
          id="brandDesc"
          value={data.brandDescription}
          onChange={v => update('brandDescription', v)}
          placeholder="e.g., Family-owned climate-controlled facility in a suburban area, clean and well-lit with 24/7 access, security cameras throughout..."
          error={errors.brandDescription}
          maxLength={500}
          rows={4}
        />
      </div>

      <div>
        <FieldLabel label="Brand colors" required htmlFor="brandColors" />
        <TextInput
          id="brandColors"
          value={data.brandColors}
          onChange={v => update('brandColors', v)}
          placeholder="e.g., Blue and white, #2563EB, or 'matches our red logo'"
          error={errors.brandColors}
          maxLength={100}
        />
      </div>

      <div>
        <FieldLabel label="Unique selling points" required />
        <p className="text-xs text-slate-400 mb-2">What makes your facility stand out? (up to 5)</p>
        {errors.sellingPoints && <FieldError error={errors.sellingPoints} />}
        <div className="space-y-2">
          {data.sellingPoints.map((sp, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={sp}
                onChange={e => updateSP(i, e.target.value)}
                placeholder={`Selling point ${i + 1}`}
                maxLength={200}
                className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              />
              {data.sellingPoints.length > 1 && (
                <button onClick={() => removeSP(i)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        {data.sellingPoints.length < 5 && (
          <button onClick={addSP} className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
            <Plus size={12} /> Add selling point
          </button>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  STEP 2: TARGET DEMOGRAPHICS                           */
/* ═══════════════════════════════════════════════════════ */

function Step2Demographics({ data, errors, onChange }: {
  data: StepData['targetDemographics']; errors: Record<string, string>; onChange: (d: StepData['targetDemographics']) => void
}) {
  const update = <K extends keyof StepData['targetDemographics']>(key: K, val: StepData['targetDemographics'][K]) => {
    onChange({ ...data, [key]: val })
  }

  return (
    <div className="space-y-5">
      <div>
        <SectionHeading text="Who should we target?" />
        <p className="text-sm text-slate-500 mb-4">Define the ideal audience for your Meta ad campaigns.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel label="Min age" required htmlFor="ageMin" />
          <NumberInput id="ageMin" value={data.ageMin} onChange={v => update('ageMin', v)} min={18} max={99} error={errors.ageMin} />
        </div>
        <div>
          <FieldLabel label="Max age" required htmlFor="ageMax" />
          <NumberInput id="ageMax" value={data.ageMax} onChange={v => update('ageMax', v)} min={18} max={99} error={errors.ageMax} />
        </div>
      </div>

      <div>
        <FieldLabel label="Target radius (miles)" required htmlFor="radius" />
        <NumberInput id="radius" value={data.radiusMiles} onChange={v => update('radiusMiles', v)} min={1} max={100} error={errors.radiusMiles} />
        <p className="text-xs text-slate-400 mt-1">How far from your facility should we target?</p>
      </div>

      <div>
        <FieldLabel label="Income level" required htmlFor="income" />
        <SelectInput id="income" value={data.incomeLevel} onChange={v => update('incomeLevel', v)} options={INCOME_OPTIONS} error={errors.incomeLevel} />
      </div>

      <div>
        <FieldLabel label="Audience type" required />
        <div className="flex gap-4 mt-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={data.targetRenters} onChange={e => update('targetRenters', e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            Renters
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={data.targetOwners} onChange={e => update('targetOwners', e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            Homeowners
          </label>
        </div>
      </div>

      <div>
        <FieldLabel label="Additional targeting notes" htmlFor="tNotes" />
        <TextArea
          id="tNotes"
          value={data.notes}
          onChange={v => update('notes', v)}
          placeholder="e.g., Lots of military families in the area, college students during move-out season..."
          maxLength={1000}
        />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  STEP 3: UNIT MIX & PRICING                            */
/* ═══════════════════════════════════════════════════════ */

function Step3UnitMix({ data, errors, onChange }: {
  data: StepData['unitMix']; errors: Record<string, string>; onChange: (d: StepData['unitMix']) => void
}) {
  const updateUnit = (idx: number, field: string, val: string | number) => {
    const next = [...data.units]
    next[idx] = { ...next[idx], [field]: val }
    onChange({ ...data, units: next })
  }

  const addUnit = () => {
    if (data.units.length >= 10) return
    // Don't add if last row has empty required fields
    const last = data.units[data.units.length - 1]
    if (last && (!last.type.trim() || !last.size.trim())) return
    onChange({ ...data, units: [...data.units, { type: '', size: '', monthlyRate: 0, availableCount: 0 }] })
  }

  const removeUnit = (idx: number) => {
    if (data.units.length <= 1) return
    onChange({ ...data, units: data.units.filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-5">
      <div>
        <SectionHeading text="Your unit inventory" />
        <p className="text-sm text-slate-500 mb-4">List the unit types you want to advertise. We'll use this to create targeted ad copy.</p>
      </div>

      {errors.units && <FieldError error={errors.units} />}

      <div className="space-y-3">
        {data.units.map((u, i) => (
          <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Unit {i + 1}</span>
              {data.units.length > 1 && (
                <button onClick={() => removeUnit(i)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="text" value={u.type} onChange={e => updateUnit(i, 'type', e.target.value)}
                  placeholder="Type (e.g., Climate)"
                  maxLength={100}
                  className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 ${errors[`unit_${i}_type`] ? 'border-red-300' : 'border-slate-200'}`}
                />
                <FieldError error={errors[`unit_${i}_type`]} />
              </div>
              <div>
                <input
                  type="text" value={u.size} onChange={e => updateUnit(i, 'size', e.target.value)}
                  placeholder="Size (e.g., 10x10)"
                  maxLength={50}
                  className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 ${errors[`unit_${i}_size`] ? 'border-red-300' : 'border-slate-200'}`}
                />
                <FieldError error={errors[`unit_${i}_size`]} />
              </div>
              <div>
                <input
                  type="number" value={u.monthlyRate || ''} onChange={e => updateUnit(i, 'monthlyRate', Number(e.target.value))}
                  placeholder="$/month"
                  min={0}
                  className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 ${errors[`unit_${i}_rate`] ? 'border-red-300' : 'border-slate-200'}`}
                />
                <FieldError error={errors[`unit_${i}_rate`]} />
              </div>
              <div>
                <input
                  type="number" value={u.availableCount || ''} onChange={e => updateUnit(i, 'availableCount', Number(e.target.value))}
                  placeholder="# Available"
                  min={0}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {data.units.length < 10 && (
        <button onClick={addUnit} className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
          <Plus size={12} /> Add unit type
        </button>
      )}

      <div>
        <FieldLabel label="Current specials or promotions" htmlFor="specials" />
        <TextArea
          id="specials"
          value={data.specials}
          onChange={v => onChange({ ...data, specials: v })}
          placeholder="e.g., First month free on 10x10 units, 50% off first 3 months for new customers..."
          maxLength={500}
        />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  STEP 4: COMPETITOR INTEL                              */
/* ═══════════════════════════════════════════════════════ */

function Step4Competitors({ data, errors, onChange }: {
  data: StepData['competitorIntel']; errors: Record<string, string>; onChange: (d: StepData['competitorIntel']) => void
}) {
  const addComp = () => {
    if (data.competitors.length >= 5) return
    const last = data.competitors[data.competitors.length - 1]
    if (last && !last.name.trim()) return
    onChange({ ...data, competitors: [...data.competitors, { name: '', distance: '', pricingNotes: '' }] })
  }

  const updateComp = (idx: number, field: string, val: string) => {
    const next = [...data.competitors]
    next[idx] = { ...next[idx], [field]: val }
    onChange({ ...data, competitors: next })
  }

  const removeComp = (idx: number) => {
    onChange({ ...data, competitors: data.competitors.filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-5">
      <div>
        <SectionHeading text="Know your competition" />
        <p className="text-sm text-slate-500 mb-4">Knowing nearby competitors helps us position your facility and set competitive pricing in ads.</p>
      </div>

      {data.competitors.length > 0 && (
        <div className="space-y-3">
          {data.competitors.map((c, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Competitor {i + 1}</span>
                <button onClick={() => removeComp(i)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <input
                    type="text" value={c.name} onChange={e => updateComp(i, 'name', e.target.value)}
                    placeholder="Name"
                    maxLength={100}
                    className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 ${errors[`comp_${i}_name`] ? 'border-red-300' : 'border-slate-200'}`}
                  />
                  <FieldError error={errors[`comp_${i}_name`]} />
                </div>
                <div>
                  <input
                    type="text" value={c.distance} onChange={e => updateComp(i, 'distance', e.target.value)}
                    placeholder="Distance (e.g., 2 miles)"
                    maxLength={50}
                    className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 ${errors[`comp_${i}_distance`] ? 'border-red-300' : 'border-slate-200'}`}
                  />
                  <FieldError error={errors[`comp_${i}_distance`]} />
                </div>
              </div>
              <input
                type="text" value={c.pricingNotes} onChange={e => updateComp(i, 'pricingNotes', e.target.value)}
                placeholder="Pricing notes (optional)"
                maxLength={200}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              />
            </div>
          ))}
        </div>
      )}

      {data.competitors.length < 5 && (
        <button onClick={addComp} className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
          <Plus size={12} /> Add competitor
        </button>
      )}

      {data.competitors.length === 0 && (
        <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Shield size={24} className="mx-auto mb-2 text-slate-300" />
          <p className="text-xs text-slate-400">No competitors added yet. This is optional but helps us craft better ads.</p>
        </div>
      )}

      <div>
        <FieldLabel label="What makes you different?" required htmlFor="diff" />
        <TextArea
          id="diff"
          value={data.differentiation}
          onChange={v => onChange({ ...data, differentiation: v })}
          placeholder="e.g., Only facility in the area with 24/7 access, best prices within 10 miles, brand new construction..."
          error={errors.differentiation}
          maxLength={500}
          rows={3}
        />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  STEP 5: AD PREFERENCES                                */
/* ═══════════════════════════════════════════════════════ */

function Step5AdPrefs({ data, errors, onChange }: {
  data: StepData['adPreferences']; errors: Record<string, string>; onChange: (d: StepData['adPreferences']) => void
}) {
  const update = <K extends keyof StepData['adPreferences']>(key: K, val: StepData['adPreferences'][K]) => {
    onChange({ ...data, [key]: val })
  }

  return (
    <div className="space-y-5">
      <div>
        <SectionHeading text="Ad campaign preferences" />
        <p className="text-sm text-slate-500 mb-4">Help us understand your goals and preferences so we can build the right campaign.</p>
      </div>

      <div>
        <FieldLabel label="Tone of voice" required htmlFor="tone" />
        <SelectInput id="tone" value={data.toneOfVoice} onChange={v => update('toneOfVoice', v)} options={TONE_OPTIONS} placeholder="Select a tone..." error={errors.toneOfVoice} />
      </div>

      <div>
        <FieldLabel label="Monthly ad budget" required htmlFor="budget" />
        <SelectInput id="budget" value={data.monthlyBudget} onChange={v => update('monthlyBudget', v)} options={BUDGET_OPTIONS} placeholder="Select a range..." error={errors.monthlyBudget} />
      </div>

      <div>
        <FieldLabel label="Primary goal" required htmlFor="goal" />
        <SelectInput id="goal" value={data.primaryGoal} onChange={v => update('primaryGoal', v)} options={GOAL_OPTIONS} placeholder="What are we trying to achieve?" error={errors.primaryGoal} />
      </div>

      <div>
        <FieldLabel label="Past ad experience" htmlFor="pastAds" />
        <TextArea
          id="pastAds"
          value={data.pastAdExperience}
          onChange={v => update('pastAdExperience', v)}
          placeholder="e.g., We tried Google Ads for 3 months, got some leads but CPL was too high. Never done Facebook/Instagram ads."
          maxLength={1000}
        />
      </div>

      <div>
        <FieldLabel label="Anything else we should know?" htmlFor="adNotes" />
        <TextArea
          id="adNotes"
          value={data.notes}
          onChange={v => update('notes', v)}
          placeholder="e.g., We have a grand opening next month, prefer not to run ads on weekends..."
          maxLength={1000}
        />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  STEP 6: REVIEW                                         */
/* ═══════════════════════════════════════════════════════ */

function Step6Review({ data, onEditStep }: { data: OnboardingData; onEditStep: (step: number) => void }) {
  const allComplete = Object.values(data.steps).every(s => s.completed)
  const completedCount = Object.values(data.steps).filter(s => s.completed).length

  return (
    <div className="space-y-5">
      <div>
        <SectionHeading text="Review your onboarding info" />
        {allComplete ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
            <Check size={16} className="text-emerald-600" />
            <p className="text-sm text-emerald-700 font-medium">All steps complete! Your campaign setup info is ready.</p>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-sm text-amber-700">{completedCount} of 5 steps completed. Complete all steps to finalize onboarding.</p>
          </div>
        )}
      </div>

      {/* Facility Details */}
      <ReviewSection
        title="Facility Details"
        completed={data.steps.facilityDetails.completed}
        onEdit={() => onEditStep(0)}
      >
        <ReviewItem label="Description" value={data.steps.facilityDetails.data.brandDescription} />
        <ReviewItem label="Brand Colors" value={data.steps.facilityDetails.data.brandColors} />
        <ReviewItem label="Selling Points" value={data.steps.facilityDetails.data.sellingPoints.filter(s => s.trim()).join(', ')} />
      </ReviewSection>

      {/* Demographics */}
      <ReviewSection
        title="Target Demographics"
        completed={data.steps.targetDemographics.completed}
        onEdit={() => onEditStep(1)}
      >
        <ReviewItem label="Age Range" value={`${data.steps.targetDemographics.data.ageMin} – ${data.steps.targetDemographics.data.ageMax}`} />
        <ReviewItem label="Radius" value={`${data.steps.targetDemographics.data.radiusMiles} miles`} />
        <ReviewItem label="Income" value={INCOME_OPTIONS.find(o => o.value === data.steps.targetDemographics.data.incomeLevel)?.label || '—'} />
        <ReviewItem label="Audience" value={[
          data.steps.targetDemographics.data.targetRenters && 'Renters',
          data.steps.targetDemographics.data.targetOwners && 'Homeowners'
        ].filter(Boolean).join(', ') || '—'} />
        {data.steps.targetDemographics.data.notes && <ReviewItem label="Notes" value={data.steps.targetDemographics.data.notes} />}
      </ReviewSection>

      {/* Unit Mix */}
      <ReviewSection
        title="Unit Mix & Pricing"
        completed={data.steps.unitMix.completed}
        onEdit={() => onEditStep(2)}
      >
        {data.steps.unitMix.data.units.map((u, i) => (
          <ReviewItem key={i} label={`${u.type} ${u.size}`} value={`$${u.monthlyRate}/mo · ${u.availableCount} available`} />
        ))}
        {data.steps.unitMix.data.specials && <ReviewItem label="Specials" value={data.steps.unitMix.data.specials} />}
      </ReviewSection>

      {/* Competitor Intel */}
      <ReviewSection
        title="Competitor Intel"
        completed={data.steps.competitorIntel.completed}
        onEdit={() => onEditStep(3)}
      >
        {data.steps.competitorIntel.data.competitors.map((c, i) => (
          <ReviewItem key={i} label={c.name} value={`${c.distance}${c.pricingNotes ? ` · ${c.pricingNotes}` : ''}`} />
        ))}
        {data.steps.competitorIntel.data.competitors.length === 0 && <ReviewItem label="Competitors" value="None listed" />}
        <ReviewItem label="Differentiation" value={data.steps.competitorIntel.data.differentiation} />
      </ReviewSection>

      {/* Ad Preferences */}
      <ReviewSection
        title="Ad Preferences"
        completed={data.steps.adPreferences.completed}
        onEdit={() => onEditStep(4)}
      >
        <ReviewItem label="Tone" value={TONE_OPTIONS.find(o => o.value === data.steps.adPreferences.data.toneOfVoice)?.label || '—'} />
        <ReviewItem label="Budget" value={BUDGET_OPTIONS.find(o => o.value === data.steps.adPreferences.data.monthlyBudget)?.label || '—'} />
        <ReviewItem label="Goal" value={GOAL_OPTIONS.find(o => o.value === data.steps.adPreferences.data.primaryGoal)?.label || '—'} />
        {data.steps.adPreferences.data.pastAdExperience && <ReviewItem label="Past Experience" value={data.steps.adPreferences.data.pastAdExperience} />}
        {data.steps.adPreferences.data.notes && <ReviewItem label="Notes" value={data.steps.adPreferences.data.notes} />}
      </ReviewSection>
    </div>
  )
}

function ReviewSection({ title, completed, onEdit, children }: {
  title: string; completed: boolean; onEdit: () => void; children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border p-4 ${completed ? 'bg-white border-slate-200' : 'bg-amber-50/50 border-amber-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${completed ? 'bg-emerald-500 text-white' : 'bg-amber-200 text-amber-600'}`}>
            {completed ? <Check size={10} /> : <AlertCircle size={10} />}
          </div>
          <h4 className="font-semibold text-sm">{title}</h4>
        </div>
        <button onClick={onEdit} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">Edit</button>
      </div>
      <div className="space-y-1 ml-7">{children}</div>
    </div>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-slate-400 shrink-0 w-24">{label}</span>
      <span className="text-slate-700">{value || '—'}</span>
    </div>
  )
}
