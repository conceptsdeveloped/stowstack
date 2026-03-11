import { Search, ArrowRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { useAuditForm } from '../../hooks/useAuditForm'
import { OCCUPANCY_RANGES, TOTAL_UNITS, VACANCY_ISSUES } from '../../lib/formData'

const inputClass =
  'w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-400 outline-none focus:border-brand-500 transition-colors'

const selectClass =
  'w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-brand-500 transition-colors appearance-none'

function SelectField({ value, onChange, options, error }) {
  return (
    <select
      className={`${selectClass} ${!value ? 'text-slate-400' : ''} ${error ? 'border-red-500' : ''}`}
      value={value}
      onChange={onChange}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export default function AuditIntakeForm() {
  const { fields, errors, status, submitError, updateField, handleSubmit, reset } = useAuditForm()

  if (status === 'success') {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <div className="flex flex-col items-center text-center py-8 space-y-4">
          <CheckCircle className="w-12 h-12 text-brand-500" />
          <h3 className="text-white text-lg font-semibold">Audit Request Received</h3>
          <p className="text-slate-400 text-sm max-w-xs">
            I'll personally review your facility and respond within 24 hours. — Blake
          </p>
          <button
            onClick={reset}
            className="text-brand-500 text-sm hover:text-brand-400 transition-colors"
          >
            Submit Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <Search className="w-5 h-5 text-brand-500" />
        <h3 className="text-white text-lg font-semibold">Get Your Facility Audit</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Name"
          className={`${inputClass} ${errors.name ? 'border-red-500' : ''}`}
          value={fields.name}
          onChange={e => updateField('name', e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          className={`${inputClass} ${errors.email ? 'border-red-500' : ''}`}
          value={fields.email}
          onChange={e => updateField('email', e.target.value)}
        />

        <input
          type="tel"
          placeholder="Phone"
          className={`${inputClass} ${errors.phone ? 'border-red-500' : ''}`}
          value={fields.phone}
          onChange={e => updateField('phone', e.target.value)}
        />

        <input
          type="text"
          placeholder="Facility Name"
          className={`${inputClass} ${errors.facilityName ? 'border-red-500' : ''}`}
          value={fields.facilityName}
          onChange={e => updateField('facilityName', e.target.value)}
        />

        <input
          type="text"
          placeholder="Location (City, State)"
          className={`${inputClass} ${errors.location ? 'border-red-500' : ''}`}
          value={fields.location}
          onChange={e => updateField('location', e.target.value)}
        />

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
          placeholder="Anything else I should know?"
          rows={3}
          className={inputClass}
          value={fields.notes}
          onChange={e => updateField('notes', e.target.value)}
        />

        {status === 'error' && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full bg-brand-600 text-white py-3.5 rounded-lg font-semibold text-sm hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === 'submitting' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Get a Facility Audit
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-xs text-slate-500 text-center">
          I will personally review your facility and respond within 24 hours.
        </p>
      </form>
    </div>
  )
}
