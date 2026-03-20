import { useState, useEffect } from 'react'
import {
  Loader2, Download, Sparkles, AlertTriangle, Edit3, RefreshCw
} from 'lucide-react'
import { Facility } from './types'

interface ImageTemplate {
  id: string
  name: string
  description: string
  aspect: string
}

interface GenerationJob {
  id: string
  templateId: string
  templateName: string
  status: 'generating' | 'succeeded' | 'failed'
  imageUrl: string | null
  prompt: string
  error: string | null
  aspect: string
}

const TEMPLATE_ICONS: Record<string, string> = {
  ad_hero: '🖼️',
  ad_hero_wide: '🌅',
  lifestyle_moving: '📦',
  lifestyle_organized: '✨',
  lifestyle_packing: '🎁',
  social_promo: '📱',
  social_seasonal: '🌸',
  before_after: '🔄',
  text_ad: '📝',
  story_bg: '📲',
}

const ASPECT_LABELS: Record<string, string> = {
  '1:1': 'Square',
  '16:9': 'Wide',
  '4:5': 'Portrait',
  '9:16': 'Story',
}

export default function ImageGenerator({ facility, adminKey, darkMode }: {
  facility: Facility
  adminKey: string
  darkMode: boolean
}) {
  const [templates, setTemplates] = useState<ImageTemplate[]>([])
  const [configured, setConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [customNotes, setCustomNotes] = useState('')
  const [promptOverride, setPromptOverride] = useState('')
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [jobs, setJobs] = useState<GenerationJob[]>([])
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null)
  const [editedPrompt, setEditedPrompt] = useState('')

  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'

  useEffect(() => {
    fetch('/api/generate-image', { headers: { 'X-Admin-Key': adminKey } })
      .then(r => r.json())
      .then(data => {
        if (data.templates) {
          setTemplates(data.templates)
          setSelectedTemplate(data.templates[0]?.id || null)
        }
        setConfigured(data.configured || false)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [adminKey])

  async function generate(overridePrompt?: string) {
    if (!selectedTemplate || generating) return
    const template = templates.find(t => t.id === selectedTemplate)
    if (!template) return

    setGenerating(true)
    const jobId = `img-${Date.now()}`
    setJobs(prev => [{
      id: jobId,
      templateId: selectedTemplate,
      templateName: template.name,
      status: 'generating',
      imageUrl: null,
      prompt: overridePrompt || promptOverride || '',
      error: null,
      aspect: template.aspect,
    }, ...prev])

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          templateId: selectedTemplate,
          facilityId: facility.id,
          customNotes: customNotes.trim() || undefined,
          promptOverride: overridePrompt || promptOverride.trim() || undefined,
        }),
      })
      const data = await res.json()

      if (data.imageUrl) {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'succeeded', imageUrl: data.imageUrl, prompt: data.prompt || j.prompt } : j))
      } else {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'failed', error: data.error || 'Generation failed' } : j))
      }
    } catch (err) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'failed', error: err instanceof Error ? err.message : 'Network error' } : j))
    } finally {
      setGenerating(false)
    }
  }

  const activeTemplate = templates.find(t => t.id === selectedTemplate)

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h4 className={`text-sm font-semibold ${text}`}>AI Image Generator</h4>
        <p className={`text-xs ${sub} mt-0.5`}>Generate ad creatives, lifestyle imagery, and social graphics</p>
      </div>

      {!configured && (
        <div className={`p-4 rounded-xl border border-dashed ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className={`text-sm font-medium ${text}`}>Image Generation API Required</p>
              <p className={`text-xs ${sub} mt-1`}>
                Add <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">REPLICATE_API_TOKEN</code> or <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">GEMINI_API_KEY</code> (with billing) to your environment variables.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Template grid */}
      <div>
        <label className={`text-xs font-medium ${sub} block mb-2`}>Choose Image Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => { setSelectedTemplate(t.id); setShowPromptEditor(false); setPromptOverride('') }}
              className={`text-left p-3 border rounded-xl transition-all ${
                selectedTemplate === t.id
                  ? darkMode ? 'border-emerald-500 bg-emerald-900/20' : 'border-emerald-500 bg-emerald-50'
                  : `${card} hover:border-emerald-300`
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{TEMPLATE_ICONS[t.id] || '🖼️'}</span>
                <span className={`text-xs font-semibold ${text} truncate`}>{t.name}</span>
              </div>
              <p className={`text-[10px] ${sub} line-clamp-2`}>{t.description}</p>
              <span className={`inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                {ASPECT_LABELS[t.aspect] || t.aspect}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      {activeTemplate && (
        <div className={`border rounded-xl p-4 ${card}`}>
          <div className="space-y-3">
            <div>
              <label className={`text-xs font-medium ${sub} block mb-1`}>Custom Notes (optional)</label>
              <input
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                placeholder="e.g., Include a sunset, show climate-controlled units, spring theme..."
                className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
              />
            </div>

            <div>
              <button
                onClick={() => setShowPromptEditor(!showPromptEditor)}
                className={`flex items-center gap-1.5 text-xs ${sub} hover:underline`}
              >
                <Edit3 size={11} /> {showPromptEditor ? 'Hide' : 'Edit'} prompt directly
              </button>
              {showPromptEditor && (
                <div className="mt-2">
                  <textarea
                    value={promptOverride}
                    onChange={e => setPromptOverride(e.target.value)}
                    rows={3}
                    placeholder="Write your own image prompt... Leave blank to use the AI-enhanced template prompt."
                    className={`w-full px-3 py-2 border rounded-lg text-xs font-mono ${inputBg}`}
                  />
                </div>
              )}
            </div>

            <button
              onClick={() => generate()}
              disabled={generating || !configured}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40"
            >
              {generating ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><Sparkles size={14} /> Generate {activeTemplate.name}</>}
            </button>
            <p className={`text-[10px] ${sub}`}>Takes 10-30 seconds. Image auto-saves to facility assets.</p>
          </div>
        </div>
      )}

      {/* Generated images */}
      {jobs.length > 0 && (
        <div>
          <h5 className={`text-xs font-semibold ${text} mb-3`}>Generated Images</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map(job => (
              <div key={job.id} className={`border rounded-xl overflow-hidden ${card}`}>
                {/* Image */}
                {job.status === 'generating' && (
                  <div className={`aspect-square flex items-center justify-center ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <div className="text-center">
                      <Loader2 size={24} className="animate-spin text-emerald-500 mx-auto mb-2" />
                      <p className={`text-xs ${sub}`}>Generating...</p>
                    </div>
                  </div>
                )}

                {job.status === 'succeeded' && job.imageUrl && (
                  <div className="relative">
                    <img src={job.imageUrl} alt={job.templateName} className="w-full aspect-square object-cover" />
                    <span className={`absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-black/50 text-white`}>
                      {ASPECT_LABELS[job.aspect] || job.aspect}
                    </span>
                  </div>
                )}

                {job.status === 'failed' && (
                  <div className={`aspect-square flex items-center justify-center ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
                    <div className="text-center px-4">
                      <AlertTriangle size={20} className="text-red-500 mx-auto mb-2" />
                      <p className={`text-xs text-red-500`}>{job.error}</p>
                    </div>
                  </div>
                )}

                {/* Info + actions */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{TEMPLATE_ICONS[job.templateId] || '🖼️'}</span>
                    <span className={`text-xs font-medium ${text} flex-1 truncate`}>{job.templateName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      job.status === 'succeeded' ? 'bg-emerald-100 text-emerald-700' :
                      job.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>{job.status}</span>
                  </div>

                  {job.status === 'succeeded' && (
                    <div className="flex flex-wrap gap-1.5">
                      <a
                        href={job.imageUrl!}
                        download={`${job.templateId}-${Date.now()}.webp`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white text-[10px] font-medium rounded hover:bg-emerald-700"
                      >
                        <Download size={10} /> Download
                      </a>
                      <button
                        onClick={() => { setEditingPrompt(job.id); setEditedPrompt(job.prompt) }}
                        className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        <RefreshCw size={10} /> Regenerate
                      </button>
                    </div>
                  )}

                  {job.status === 'failed' && (
                    <button
                      onClick={() => { setEditingPrompt(job.id); setEditedPrompt(job.prompt) }}
                      className={`flex items-center gap-1 text-[10px] ${sub} hover:underline`}
                    >
                      <Edit3 size={10} /> Edit prompt and retry
                    </button>
                  )}

                  {/* Edit prompt for regeneration */}
                  {editingPrompt === job.id && (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={editedPrompt}
                        onChange={e => setEditedPrompt(e.target.value)}
                        rows={3}
                        className={`w-full px-2 py-1.5 border rounded text-[11px] font-mono ${inputBg}`}
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => { generate(editedPrompt); setEditingPrompt(null) }}
                          disabled={generating}
                          className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-medium rounded hover:bg-emerald-700 disabled:opacity-40"
                        >
                          <Sparkles size={10} className="inline mr-1" /> Regenerate
                        </button>
                        <button
                          onClick={() => setEditingPrompt(null)}
                          className={`px-2 py-1 text-[10px] ${sub} hover:underline`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Prompt preview */}
                  {editingPrompt !== job.id && job.prompt && (
                    <details className={`text-[10px] ${sub}`}>
                      <summary className="cursor-pointer hover:underline">View prompt</summary>
                      <p className={`mt-1 p-2 rounded whitespace-pre-wrap ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>{job.prompt}</p>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
