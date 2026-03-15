import { Keyboard, X as XIcon } from 'lucide-react'

export default function ShortcutsModal({ darkMode, onClose }: { darkMode: boolean; onClose: () => void }) {
  const shortcuts = [
    { key: '⌘K', desc: 'Open command palette' },
    { key: '1', desc: 'Pipeline view' },
    { key: '2', desc: 'Kanban view' },
    { key: '3', desc: 'Portfolio view' },
    { key: '4', desc: 'Insights view' },
    { key: '5', desc: 'Billing view' },
    { key: '6', desc: 'Settings view' },
    { key: 'R', desc: 'Refresh data' },
    { key: 'N', desc: 'Toggle notifications' },
    { key: 'H', desc: 'Open admin guide' },
    { key: '?', desc: 'Show shortcuts' },
    { key: 'ESC', desc: 'Close panel/modal' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-sm rounded-xl border shadow-2xl p-5 ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Keyboard size={16} />
            Keyboard Shortcuts
          </h3>
          <button onClick={onClose} className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <XIcon size={14} />
          </button>
        </div>
        <div className="space-y-2">
          {shortcuts.map(s => (
            <div key={s.key} className="flex items-center justify-between">
              <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{s.desc}</span>
              <kbd className={`text-xs font-mono px-2 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{s.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
