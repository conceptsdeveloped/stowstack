export function StatCard({ icon: Icon, label, value, accent, darkMode, subtitle }: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>; label: string; value: number | string; accent?: boolean; darkMode?: boolean; subtitle?: string
}) {
  return (
    <div className={`rounded-xl border p-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={accent ? 'text-emerald-600' : darkMode ? 'text-slate-500' : 'text-slate-400'} />
        <span className={`text-xs uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${accent ? 'text-emerald-600' : ''}`}>{value}</p>
      {subtitle && <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{subtitle}</p>}
    </div>
  )
}

export function PipelineChip({ label, count, active, onClick, colorClass }: {
  label: string; count: number; active: boolean; onClick: () => void; colorClass?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
        active
          ? 'bg-slate-900 text-white shadow-sm'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
        active ? 'bg-white/20 text-white' : (colorClass || 'bg-slate-200 text-slate-500')
      }`}>
        {count}
      </span>
    </button>
  )
}
