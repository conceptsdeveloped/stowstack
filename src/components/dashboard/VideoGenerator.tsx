import { useState, useEffect } from 'react'
import { Loader2, Download, Sparkles, Image, AlertTriangle } from 'lucide-react'
import { Facility, Asset } from './types'

interface VideoTemplate {
  id: string
  name: string
  description: string
  mode: 'text_to_video' | 'image_to_video'
}

interface GenerationJob {
  taskId: string
  templateId: string
  templateName: string
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  videoUrl: string | null
  error: string | null
  prompt: string
  startedAt: number
}

const TEMPLATE_ICONS: Record<string, string> = {
  facility_showcase: '🏢',
  customer_testimonial: '🗣️',
  seasonal_promo: '🎉',
  quick_cta: '⚡',
  educational_tip: '📦',
  before_after: '✨',
}

const TEMPLATE_PREVIEWS: Record<string, string> = {
  facility_showcase: 'Cinematic camera push through clean hallways of storage units. Professional, commercial feel.',
  customer_testimonial: 'Real-looking person speaking to camera about their positive storage experience.',
  seasonal_promo: 'Dynamic transformation from cluttered space to organized storage. Fast-paced and energetic.',
  quick_cta: 'Dramatic gate-opening reveal of a pristine storage facility. 5 seconds, high impact.',
  educational_tip: 'Satisfying overhead shot of someone expertly packing and labeling boxes. Tutorial style.',
  before_after: 'Split-screen transformation from messy garage to perfectly organized storage unit.',
}

export default function VideoGenerator({ facility, adminKey, darkMode }: {
  facility: Facility
  adminKey: string
  darkMode: boolean
}) {
  const [templates, setTemplates] = useState<VideoTemplate[]>([])
  const [configured, setConfigured] = useState(false)
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [customNotes, setCustomNotes] = useState('')
  const [jobs, setJobs] = useState<GenerationJob[]>([])
  const [generating, setGenerating] = useState(false)

  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'

  useEffect(() => {
    Promise.all([
      fetch('/api/generate-video', { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      fetch(`/api/facility-assets?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
    ]).then(([videoData, assetData]) => {
      if (videoData.templates) {
        setTemplates(videoData.templates)
        setSelectedTemplate(videoData.templates[0]?.id || null)
      }
      setConfigured(videoData.configured || false)
      if (assetData.assets) {
        const photos = assetData.assets.filter((a: Asset) => a.type === 'photo')
        setAssets(photos)
        if (photos.length) setSelectedImage(photos[0].url)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [facility.id, adminKey])

  // Poll active jobs
  useEffect(() => {
    const activeJobs = jobs.filter(j => j.status === 'PENDING' || j.status === 'RUNNING')
    if (activeJobs.length === 0) return

    const interval = setInterval(async () => {
      for (const job of activeJobs) {
        try {
          const res = await fetch(`/api/generate-video?taskId=${job.taskId}`, { headers: { 'X-Admin-Key': adminKey } })
          const data = await res.json()
          setJobs(prev => prev.map(j =>
            j.taskId === job.taskId
              ? { ...j, status: data.status, videoUrl: data.videoUrl, error: data.error }
              : j
          ))
        } catch {}
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [jobs, adminKey])

  async function startGeneration() {
    if (!selectedTemplate || generating) return
    const template = templates.find(t => t.id === selectedTemplate)
    if (!template) return

    setGenerating(true)
    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          templateId: selectedTemplate,
          facilityId: facility.id,
          imageUrl: template.mode === 'image_to_video' ? selectedImage : undefined,
          customNotes: customNotes.trim() || undefined,
        }),
      })
      const data = await res.json()

      if (data.taskId) {
        setJobs(prev => [{
          taskId: data.taskId,
          templateId: selectedTemplate,
          templateName: template.name,
          status: 'PENDING',
          videoUrl: null,
          error: null,
          prompt: data.prompt || '',
          startedAt: Date.now(),
        }, ...prev])
      } else if (data.error) {
        setJobs(prev => [{
          taskId: `local-${Date.now()}`,
          templateId: selectedTemplate,
          templateName: template.name,
          status: 'FAILED',
          videoUrl: null,
          error: data.error,
          prompt: '',
          startedAt: Date.now(),
        }, ...prev])
      }
    } catch (err) {
      console.error('Video generation request failed:', err)
    } finally {
      setGenerating(false)
    }
  }

  const activeTemplate = templates.find(t => t.id === selectedTemplate)

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h4 className={`text-sm font-semibold ${text}`}>AI Video Generator</h4>
        <p className={`text-xs ${sub} mt-0.5`}>Generate professional marketing videos using AI</p>
      </div>

      {!configured && (
        <div className={`p-4 rounded-xl border border-dashed ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className={`text-sm font-medium ${text}`}>Runway ML API Key Required</p>
              <p className={`text-xs ${sub} mt-1`}>
                Add <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">RUNWAY_API_KEY</code> to your Vercel environment variables.
                Get one at <a href="https://dev.runwayml.com" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">dev.runwayml.com</a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Template selector */}
      <div>
        <label className={`text-xs font-medium ${sub} block mb-2`}>Choose a Video Type</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map(template => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={`text-left p-4 border rounded-xl transition-all ${
                selectedTemplate === template.id
                  ? darkMode ? 'border-emerald-500 bg-emerald-900/20' : 'border-emerald-500 bg-emerald-50'
                  : `${card} hover:border-emerald-300`
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{TEMPLATE_ICONS[template.id] || '🎬'}</span>
                <span className={`text-sm font-semibold ${text}`}>{template.name}</span>
              </div>
              <p className={`text-xs ${sub} leading-relaxed`}>{template.description}</p>
              {template.mode === 'image_to_video' && (
                <span className={`inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
                  <Image size={9} className="inline mr-0.5" /> Uses facility photo
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Generation controls */}
      {activeTemplate && (
        <div className={`border rounded-xl p-5 ${card}`}>
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-4">
              {/* Preview description */}
              <div>
                <p className={`text-xs font-medium ${sub} mb-1`}>What you'll get:</p>
                <p className={`text-sm ${text}`}>{TEMPLATE_PREVIEWS[activeTemplate.id] || activeTemplate.description}</p>
              </div>

              {/* Image selector for image_to_video templates */}
              {activeTemplate.mode === 'image_to_video' && (
                <div>
                  <label className={`text-xs font-medium ${sub} block mb-1.5`}>Source Image</label>
                  <div className="grid grid-cols-6 gap-2">
                    {assets.slice(0, 12).map(a => (
                      <button
                        key={a.id}
                        onClick={() => setSelectedImage(a.url)}
                        className={`relative h-14 rounded-lg overflow-hidden ${
                          selectedImage === a.url ? 'ring-2 ring-emerald-500' : ''
                        }`}
                      >
                        <img src={a.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                    {assets.length === 0 && (
                      <p className={`col-span-6 text-xs ${sub} py-2`}>No images. Upload or scrape in Assets tab.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Custom notes */}
              <div>
                <label className={`text-xs font-medium ${sub} block mb-1.5`}>Custom Notes (optional)</label>
                <input
                  value={customNotes}
                  onChange={e => setCustomNotes(e.target.value)}
                  placeholder="e.g., Mention first month free, emphasize 24/7 access..."
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
                />
              </div>

              {/* Generate button */}
              <button
                onClick={startGeneration}
                disabled={generating || !configured || (activeTemplate.mode === 'image_to_video' && !selectedImage)}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40"
              >
                {generating ? (
                  <><Loader2 size={14} className="animate-spin" /> Starting...</>
                ) : (
                  <><Sparkles size={14} /> Generate {activeTemplate.name} Video</>
                )}
              </button>
              <p className={`text-[10px] ${sub}`}>Takes 1-3 minutes. You can start multiple generations.</p>
            </div>
          </div>
        </div>
      )}

      {/* Active & completed jobs */}
      {jobs.length > 0 && (
        <div>
          <h4 className={`text-sm font-semibold ${text} mb-3`}>Generated Videos</h4>
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.taskId} className={`border rounded-xl p-4 ${card}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                    job.status === 'SUCCEEDED' ? 'bg-emerald-100' :
                    job.status === 'FAILED' ? 'bg-red-100' :
                    darkMode ? 'bg-slate-700' : 'bg-slate-100'
                  }`}>
                    {TEMPLATE_ICONS[job.templateId] || '🎬'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${text}`}>{job.templateName}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        job.status === 'SUCCEEDED' ? 'bg-emerald-100 text-emerald-700' :
                        job.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {job.status === 'PENDING' || job.status === 'RUNNING' ? 'Generating...' : job.status.toLowerCase()}
                      </span>
                    </div>

                    {(job.status === 'PENDING' || job.status === 'RUNNING') && (
                      <div className="flex items-center gap-2 mt-2">
                        <Loader2 size={13} className="animate-spin text-emerald-500" />
                        <p className={`text-xs ${sub}`}>
                          AI is generating your video... ({Math.round((Date.now() - job.startedAt) / 1000)}s)
                        </p>
                      </div>
                    )}

                    {job.status === 'SUCCEEDED' && job.videoUrl && (
                      <div className="mt-3 space-y-2">
                        <video
                          src={job.videoUrl}
                          controls
                          className="w-full max-w-xs rounded-lg"
                          preload="metadata"
                        />
                        <div className="flex gap-2">
                          <a
                            href={job.videoUrl}
                            download={`video-${job.templateId}-${Date.now()}.mp4`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700"
                          >
                            <Download size={12} /> Download
                          </a>
                          <button
                            onClick={() => {
                              if (navigator.clipboard) {
                                navigator.clipboard.writeText(job.videoUrl!)
                              }
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                          >
                            Copy URL
                          </button>
                        </div>
                      </div>
                    )}

                    {job.status === 'FAILED' && (
                      <div className={`mt-2 p-2 rounded text-xs ${darkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'}`}>
                        {job.error}
                      </div>
                    )}

                    {job.prompt && (
                      <details className={`mt-2 text-xs ${sub}`}>
                        <summary className="cursor-pointer hover:underline">View prompt</summary>
                        <p className={`mt-1 p-2 rounded text-xs ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>{job.prompt}</p>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
