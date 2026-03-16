import {
  Plus, X as XIcon, Lightbulb, Send, ArrowUp, ArrowDown, Trash2,
} from 'lucide-react'
import type { Idea } from './WhatsNewTypes'
import { IDEA_CATEGORIES, IDEA_PRIORITIES, IDEA_STATUSES, PRIORITY_COLORS, STATUS_COLORS } from './WhatsNewTypes'
import { timeAgo } from './WhatsNewHelpers'

export interface IdeaBoardProps {
  darkMode: boolean
  ideas: Idea[]
  ideasLoading: boolean

  showIdeaForm: boolean
  setShowIdeaForm: (v: boolean) => void
  newIdea: { title: string; description: string; category: string; priority: string }
  setNewIdea: React.Dispatch<React.SetStateAction<{ title: string; description: string; category: string; priority: string }>>
  ideaSaving: boolean
  saveIdea: () => void

  ideaFilter: string
  setIdeaFilter: (v: string) => void

  updateIdea: (id: string, updates: Partial<Idea>) => void
  deleteIdea: (id: string) => void
  voteIdea: (id: string, dir: number) => void
}

export default function IdeaBoard({
  darkMode,
  ideas,
  ideasLoading,
  showIdeaForm, setShowIdeaForm,
  newIdea, setNewIdea,
  ideaSaving, saveIdea,
  ideaFilter, setIdeaFilter,
  updateIdea, deleteIdea, voteIdea,
}: IdeaBoardProps) {
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'

  return (
    <>
      {/* Add idea button */}
      <div className="flex items-center justify-between">
        <p className={`text-sm ${sub}`}>
          {ideas.length} idea{ideas.length !== 1 ? 's' : ''} recorded
        </p>
        <button
          onClick={() => setShowIdeaForm(!showIdeaForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors cursor-pointer"
        >
          {showIdeaForm ? <XIcon size={14} /> : <Plus size={14} />}
          {showIdeaForm ? 'Cancel' : 'New Idea'}
        </button>
      </div>

      {/* New idea form */}
      {showIdeaForm && (
        <div className={`rounded-xl border p-5 ${card}`}>
          <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            <Lightbulb size={16} className="text-amber-500" /> Capture Your Idea
          </h3>
          <div className="space-y-3">
            <div>
              <label className={`text-xs font-medium ${sub} mb-1 block`}>Title *</label>
              <input
                type="text"
                placeholder="What's the idea? Keep it punchy..."
                value={newIdea.title}
                onChange={e => setNewIdea(prev => ({ ...prev, title: e.target.value }))}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputBg}`}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) saveIdea() }}
              />
            </div>
            <div>
              <label className={`text-xs font-medium ${sub} mb-1 block`}>Description (optional)</label>
              <textarea
                placeholder="Add context, reasoning, or implementation notes..."
                value={newIdea.description}
                onChange={e => setNewIdea(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className={`w-full rounded-lg border px-3 py-2 text-sm resize-none ${inputBg}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-xs font-medium ${sub} mb-1 block`}>Category</label>
                <select
                  value={newIdea.category}
                  onChange={e => setNewIdea(prev => ({ ...prev, category: e.target.value }))}
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${inputBg}`}
                >
                  {IDEA_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className={`text-xs font-medium ${sub} mb-1 block`}>Priority</label>
                <select
                  value={newIdea.priority}
                  onChange={e => setNewIdea(prev => ({ ...prev, priority: e.target.value }))}
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${inputBg}`}
                >
                  {IDEA_PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={saveIdea}
                disabled={!newIdea.title.trim() || ideaSaving}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Send size={14} />
                {ideaSaving ? 'Saving...' : 'Save Idea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Idea filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {['all', ...IDEA_STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setIdeaFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              ideaFilter === s
                ? darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                : `${sub} ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
            {s === 'all' ? ` (${ideas.length})` : ` (${ideas.filter(i => i.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Ideas list */}
      <div className="space-y-3">
        {(ideaFilter === 'all' ? ideas : ideas.filter(i => i.status === ideaFilter)).map(idea => (
          <div key={idea.id} className={`rounded-xl border p-4 ${card}`}>
            <div className="flex items-start gap-3">
              {/* Vote buttons */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <button
                  onClick={() => voteIdea(idea.id, 1)}
                  className={`p-1 rounded transition-colors cursor-pointer ${darkMode ? 'hover:bg-slate-700 text-slate-500 hover:text-emerald-400' : 'hover:bg-slate-100 text-slate-400 hover:text-emerald-600'}`}
                >
                  <ArrowUp size={14} />
                </button>
                <span className={`text-sm font-bold ${idea.votes > 0 ? 'text-emerald-500' : sub}`}>{idea.votes}</span>
                <button
                  onClick={() => voteIdea(idea.id, -1)}
                  className={`p-1 rounded transition-colors cursor-pointer ${darkMode ? 'hover:bg-slate-700 text-slate-500 hover:text-red-400' : 'hover:bg-slate-100 text-slate-400 hover:text-red-600'}`}
                >
                  <ArrowDown size={14} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                  {idea.title}
                </p>
                {idea.description && (
                  <p className={`text-xs mt-1 ${sub}`}>{idea.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${PRIORITY_COLORS[idea.priority] || PRIORITY_COLORS.medium}`}>
                    {idea.priority}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[idea.status] || STATUS_COLORS.new}`}>
                    {idea.status.replace('-', ' ')}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                    {idea.category}
                  </span>
                  <span className={`text-[10px] ${sub}`}>
                    {timeAgo(idea.createdAt)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <select
                  value={idea.status}
                  onChange={e => updateIdea(idea.id, { status: e.target.value })}
                  className={`rounded border px-2 py-1 text-[10px] ${inputBg} cursor-pointer`}
                >
                  {IDEA_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}</option>)}
                </select>
                <button
                  onClick={() => deleteIdea(idea.id)}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${darkMode ? 'text-slate-600 hover:text-red-400 hover:bg-slate-700' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                  title="Delete idea"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {ideas.length === 0 && !ideasLoading && (
        <div className={`text-center py-12 ${sub}`}>
          <Lightbulb size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No ideas yet</p>
          <p className={`text-xs mt-1 ${sub}`}>Click "New Idea" to capture your first brainstorm</p>
        </div>
      )}

      {ideasLoading && (
        <div className={`text-center py-8 ${sub}`}>
          <p className="text-sm">Loading ideas...</p>
        </div>
      )}
    </>
  )
}
