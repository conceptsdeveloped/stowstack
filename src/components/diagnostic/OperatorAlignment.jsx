import { UserCheck, Brain, ArrowRight } from 'lucide-react'

export default function OperatorAlignment({ alignment, darkMode }) {
  if (!alignment) return null

  const accuracyColors = {
    accurate: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', label: 'Accurate' },
    partially_accurate: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', label: 'Partially Accurate' },
    misdiagnosed: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', label: 'Misdiagnosed' },
  }
  const acc = accuracyColors[alignment.operator_diagnosis_accuracy] || accuracyColors.partially_accurate

  return (
    <div className={`rounded-2xl border p-6 ${
      darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Operator Alignment
        </h2>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${acc.bg} ${acc.border} ${acc.text}`}>
          {acc.label}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* What operator said */}
        <div className={`p-4 rounded-xl ${
          darkMode ? 'bg-slate-700/50' : 'bg-slate-50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            <h4 className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              What You Told Us
            </h4>
          </div>
          <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {alignment.operator_said}
          </p>
        </div>

        {/* What audit found */}
        <div className={`p-4 rounded-xl ${
          darkMode ? 'bg-slate-700/50' : 'bg-slate-50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Brain className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
            <h4 className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              What the Audit Found
            </h4>
          </div>
          <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {alignment.audit_found}
          </p>
        </div>
      </div>

      {/* Alignment note */}
      {alignment.alignment_note && (
        <div className={`flex items-start gap-3 p-3 rounded-lg ${acc.bg} border ${acc.border}`}>
          <ArrowRight className={`w-4 h-4 shrink-0 mt-0.5 ${acc.text}`} />
          <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {alignment.alignment_note}
          </p>
        </div>
      )}
    </div>
  )
}
