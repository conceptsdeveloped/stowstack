import { Users, CalendarClock, MessageSquare, AlertTriangle, Bell, X as XIcon } from 'lucide-react'
import { timeAgo } from './utils'

export default function NotificationPanel({ notifications, darkMode, onClose }: {
  notifications: { id: string; type: string; title: string; detail: string; timestamp: string }[]
  darkMode: boolean
  onClose: () => void
}) {
  const typeIcon = (type: string) => {
    if (type === 'new_lead') return <Users size={12} className="text-blue-500" />
    if (type === 'overdue') return <CalendarClock size={12} className="text-red-500" />
    if (type === 'new_message') return <MessageSquare size={12} className="text-purple-500" />
    return <AlertTriangle size={12} className="text-amber-500" />
  }
  const typeBg = (type: string) => {
    if (darkMode) {
      if (type === 'new_lead') return 'bg-blue-900/30 border-blue-800'
      if (type === 'overdue') return 'bg-red-900/30 border-red-800'
      if (type === 'new_message') return 'bg-purple-900/30 border-purple-800'
      return 'bg-amber-900/30 border-amber-800'
    }
    if (type === 'new_lead') return 'bg-blue-50 border-blue-100'
    if (type === 'overdue') return 'bg-red-50 border-red-100'
    if (type === 'new_message') return 'bg-purple-50 border-purple-100'
    return 'bg-amber-50 border-amber-100'
  }

  return (
    <div className={`absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border shadow-xl z-50 max-h-[480px] overflow-hidden flex flex-col ${
      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    }`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
        <h3 className="text-sm font-semibold">Notifications</h3>
        <button onClick={onClose} className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
          <XIcon size={14} />
        </button>
      </div>
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className={`text-center py-12 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            <Bell size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs">All caught up!</p>
          </div>
        ) : (
          <div className="p-2 space-y-1.5">
            {notifications.map(n => (
              <div key={n.id} className={`rounded-lg border p-3 ${typeBg(n.type)}`}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5">{typeIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{n.title}</p>
                    <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{n.detail}</p>
                    <p className={`text-[10px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{timeAgo(n.timestamp)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
