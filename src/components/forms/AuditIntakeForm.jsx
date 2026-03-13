import { useState, useRef, useEffect } from 'react'
import { Search, ArrowRight, CheckCircle, Loader2, AlertCircle, Building2, MapPin, Phone as PhoneIcon, Mail, User, ChevronDown } from 'lucide-react'
import { useAuditForm } from '../../hooks/useAuditForm'
import { OCCUPANCY_RANGES, TOTAL_UNITS, VACANCY_ISSUES } from '../../lib/formData'

const STEPS = [
  { fields: ['name', 'email', 'phone'], label: 'Contact Info' },
  { fields: ['facilityName', 'location'], label: 'Facility' },
  { fields: ['occupancyRange', 'totalUnits', 'biggestIssue'], label: 'Details' },
]

const inputClass =
  'w-full bg-slate-700/80 border border-slate-600 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-400 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all'

const selectClass =
  'w-full bg-slate-700/80 border border-slate-600 rounded-xl px-4 py-3.5 text-sm text-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all appearance-none'

function SelectField({ value, onChange, options, error, icon: Icon }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      )}
      <select
        className={`${selectClass} ${Icon ? 'pl-10' : ''} ${!value ? 'text-slate-400' : ''} ${error ? 'border-red-500 focus:border-red-500' : ''}`}
        value={value}
        onChange={onChange}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  )
}

function InputField({ icon: Icon, error, ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      )}
      <input
        {...props}
        className={`${inputClass} ${Icon ? 'pl-10' : ''} ${error ? 'border-red-500 focus:border-red-500' : ''}`}
      />
    </div>
  )
}

function ProgressBar({ currentStep, totalSteps }) {
  return (
    <div className="flex gap-1.5 mb-5">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
            i <= currentStep ? 'bg-brand-500' : 'bg-slate-600/50'
          }`}
        />
      ))}
    </div>
  )
}

export default function AuditIntakeForm() {
  const { fields, errors, status, submitError, updateField, handleSubmit, reset } = useAuditForm()
  const [step, setStep] = useState(0)
  const formRef = useRef(null)
  const hasFocused = useRef(false)

  // Auto-focus first input when form scrolls into view
  useEffect(() => {
    if (!formRef.current || hasFocused.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasFocused.current) {
          hasFocused.current = true
          const firstInput = formRef.current?.querySelector('input')
          if (firstInput) setTimeout(() => firstInput.focus(), 300)
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(formRef.current)
    return () => observer.disconnect()
  }, [])

  // Determine which step fields are filled
  const isStepValid = (stepIdx) => {
    return STEPS[stepIdx].fields.every(f => {
      if (f === 'notes') return true // optional
      return fields[f]?.trim?.() || fields[f]
    })
  }

  if (status === 'success') {
    return (
      <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center py-6 space-y-4">
          <div className="w-14 h-14 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-brand-400" />
          </div>
          <h3 className="text-white text-lg font-semibold">Audit Request Received</h3>
          <p className="text-slate-400 text-sm max-w-xs">
            Check your email for next steps. I will personally review your facility and you will hear from us within 24 hours.
          </p>
          <p className="text-slate-500 text-xs">- Blake Burkett, CEO</p>
          <button
            onClick={() => { reset(); setStep(0) }}
            className="text-brand-500 text-sm hover:text-brand-400 transition-colors"
          >
            Submit Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={formRef} className="bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Search className="w-5 h-5 text-brand-500" />
        <h3 className="text-white text-lg font-semibold">Get Your Free Facility Audit</h3>
      </div>
      <p className="text-slate-500 text-xs mb-4">Takes 60 seconds. No commitment. Real operator review.</p>

      <ProgressBar currentStep={step} totalSteps={STEPS.length} />

      <form onSubmit={(e) => {
        e.preventDefault()
        if (step < STEPS.length - 1) {
          setStep(step + 1)
        } else {
          handleSubmit(e)
        }
      }} className="space-y-3">

        {/* Step 1: Contact */}
        {step === 0 && (
          <div className="space-y-3 animate-fade-up">
            <InputField
              icon={User}
              type="text"
              placeholder="Your name"
              value={fields.name}
              onChange={e => updateField('name', e.target.value)}
              error={errors.name}
            />
            <InputField
              icon={Mail}
              type="email"
              placeholder="Email address"
              value={fields.email}
              onChange={e => updateField('email', e.target.value)}
              error={errors.email}
            />
            <InputField
              icon={PhoneIcon}
              type="tel"
              placeholder="Phone number"
              value={fields.phone}
              onChange={e => updateField('phone', e.target.value)}
              error={errors.phone}
            />
          </div>
        )}

        {/* Step 2: Facility */}
        {step === 1 && (
          <div className="space-y-3 animate-fade-up">
            <InputField
              icon={Building2}
              type="text"
              placeholder="Facility name"
              value={fields.facilityName}
              onChange={e => updateField('facilityName', e.target.value)}
              error={errors.facilityName}
            />
            <InputField
              icon={MapPin}
              type="text"
              placeholder="City, State"
              value={fields.location}
              onChange={e => updateField('location', e.target.value)}
              error={errors.location}
            />
          </div>
        )}

        {/* Step 3: Details */}
        {step === 2 && (
          <div className="space-y-3 animate-fade-up">
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                value={fields.occupancyRange}
                onChange={e => updateField('occupancyRange', e.target.value)}
                options={OCCUPANCY_RANGES}
                error={errors.occupancyRange}
              />
              <SelectField
                value={fields.totalUnits}
                onChange={e => updateField('totalUnits', e.target.value)}
                options={TOTAL_UNITS}
                error={errors.totalUnits}
              />
            </div>

            <SelectField
              value={fields.biggestIssue}
              onChange={e => updateField('biggestIssue', e.target.value)}
              options={VACANCY_ISSUES}
              error={errors.biggestIssue}
            />

            <textarea
              placeholder="Anything else we should know? (optional)"
              rows={2}
              className={inputClass}
              value={fields.notes}
              onChange={e => updateField('notes', e.target.value)}
            />
          </div>
        )}

        {/* Validation errors */}
        {Object.keys(errors).length > 0 && step === 2 && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-red-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Please fill in all required fields above.</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-red-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-3 rounded-xl bg-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-600 transition-colors"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'submitting' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : step < STEPS.length - 1 ? (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Get My Free Audit
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
          Your info stays private. No spam. Blake personally reviews every audit.
        </p>
      </form>
    </div>
  )
}
