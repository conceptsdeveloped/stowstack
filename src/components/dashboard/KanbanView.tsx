import { useState } from 'react'
import { Loader2, MapPin, GripVertical } from 'lucide-react'
import { Lead, STATUSES } from './types'
import { timeAgo } from './utils'

export default function KanbanView({ leads, onUpdateStatus, onSelectLead, darkMode, loading }: {
  leads: Lead[]
  onUpdateStatus: (id: string, status: string) => void
  onSelectLead: (id: string) => void
  darkMode: boolean
  loading: boolean
}) {
  const [dragId, setDragId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={24} className="animate-spin mr-2" /> Loading...
      </div>
    )
  }

  const columns = STATUSES.map(s => ({
    ...s,
    leads: leads.filter(l => l.status === s.value),
  }))

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    if (dragId) {
      const lead = leads.find(l => l.id === dragId)
      if (lead && lead.status !== status) {
        onUpdateStatus(dragId, status)
      }
    }
    setDragId(null)
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {columns.map(col => (
          <div
            key={col.value}
            className={`w-64 shrink-0 rounded-xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100/50 border-slate-200'}`}
            onDragOver={handleDragOver}
            onDrop={e => handleDrop(e, col.value)}
          >
            <div className={`px-3 py-2.5 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${col.color}`}>{col.label}</span>
                <span className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{col.leads.length}</span>
              </div>
            </div>
            <div className="p-2 space-y-2 min-h-[200px]">
              {col.leads.map(lead => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={e => handleDragStart(e, lead.id)}
                  onClick={() => onSelectLead(lead.id)}
                  className={`rounded-lg border p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
                    dragId === lead.id ? 'opacity-50' : ''
                  } ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <GripVertical size={12} className={`mt-0.5 shrink-0 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{lead.name}</p>
                      <p className={`text-xs truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{lead.facilityName}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    <MapPin size={9} />
                    <span className="truncate">{lead.location}</span>
                    <span className="ml-auto">{timeAgo(lead.createdAt)}</span>
                  </div>
                </div>
              ))}
              {col.leads.length === 0 && (
                <div className={`text-center py-8 text-xs ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                  Drop leads here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
