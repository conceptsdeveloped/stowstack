import { useState, useEffect, useRef } from 'react'
import { HelpCircle, BookOpen } from 'lucide-react'

export default function HelpTooltip({ text, guideSection, onOpenGuide, darkMode }: {
  text: string; guideSection: string; onOpenGuide: (section: string) => void; darkMode: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`p-0.5 rounded-full transition-colors ${
          darkMode
            ? 'text-slate-500 hover:text-amber-400 hover:bg-slate-700'
            : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'
        }`}
        title={text}
      >
        <HelpCircle size={13} />
      </button>
      {open && (
        <div className={`absolute z-50 top-full mt-1 left-0 w-56 rounded-lg border shadow-lg p-3 text-xs ${
          darkMode ? 'bg-slate-800 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
        }`}>
          <p className="mb-2">{text}</p>
          <button
            onClick={() => { setOpen(false); onOpenGuide(guideSection) }}
            className={`flex items-center gap-1 text-[11px] font-medium ${
              darkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'
            }`}
          >
            <BookOpen size={11} /> Read in Admin Guide
          </button>
        </div>
      )}
    </div>
  )
}
