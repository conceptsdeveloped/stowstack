import { useEffect, useRef } from 'react'
import { Search, Users, Columns3, BarChart3, TrendingUp, CreditCard, Settings, Sun, Moon, BookOpen, Download, RefreshCw, ChevronRight } from 'lucide-react'
import { Lead } from './types'

export default function CommandPalette({ query, onQueryChange, leads, darkMode, onClose, onSelectLead, onAction }: {
  query: string
  onQueryChange: (v: string) => void
  leads: Lead[]
  darkMode: boolean
  onClose: () => void
  onSelectLead: (id: string) => void
  onAction: (action: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const q = query.toLowerCase()
  const matchedLeads = q ? leads.filter(l =>
    l.name.toLowerCase().includes(q) ||
    l.facilityName.toLowerCase().includes(q) ||
    l.email.toLowerCase().includes(q) ||
    l.location.toLowerCase().includes(q)
  ).slice(0, 5) : []

  const actions = [
    { id: 'pipeline', label: 'Go to Pipeline', icon: Users },
    { id: 'kanban', label: 'Go to Kanban Board', icon: Columns3 },
    { id: 'portfolio', label: 'Go to Portfolio', icon: BarChart3 },
    { id: 'insights', label: 'Go to Insights', icon: TrendingUp },
    { id: 'billing', label: 'Go to Billing', icon: CreditCard },
    { id: 'settings', label: 'Go to Settings', icon: Settings },
    { id: 'dark', label: darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode', icon: darkMode ? Sun : Moon },
    { id: 'guide', label: 'Open Admin Guide', icon: BookOpen },
    { id: 'csv', label: 'Export Leads as CSV', icon: Download },
    { id: 'refresh', label: 'Refresh Data', icon: RefreshCw },
  ]

  const matchedActions = q ? actions.filter(a => a.label.toLowerCase().includes(q)) : actions

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
          <Search size={16} className="text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search leads, navigate, or run an action..."
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            className={`flex-1 text-sm bg-transparent focus:outline-none ${darkMode ? 'text-slate-100 placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`}
          />
          <kbd className={`text-[10px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {matchedLeads.length > 0 && (
            <div className="mb-2">
              <p className={`text-[10px] uppercase font-semibold tracking-wide px-2 py-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Leads</p>
              {matchedLeads.map(l => (
                <button
                  key={l.id}
                  onClick={() => onSelectLead(l.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                  }`}
                >
                  <Users size={14} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{l.name}</p>
                    <p className={`text-xs truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{l.facilityName} · {l.location}</p>
                  </div>
                  <ChevronRight size={12} className={darkMode ? 'text-slate-600' : 'text-slate-300'} />
                </button>
              ))}
            </div>
          )}
          <div>
            <p className={`text-[10px] uppercase font-semibold tracking-wide px-2 py-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Actions</p>
            {matchedActions.map(a => (
              <button
                key={a.id}
                onClick={() => onAction(a.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                }`}
              >
                <a.icon size={14} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
                <span className="text-sm">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
