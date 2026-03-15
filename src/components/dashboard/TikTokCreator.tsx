import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Plus, Trash2, Play, Pause, ChevronLeft, ChevronRight, Image, Send, Clock, Sparkles } from 'lucide-react'
import { Facility, Asset, AdVariation } from './types'

interface Slide {
  id: string
  imageUrl: string
  textOverlay: string
  subText: string
  duration: number // seconds
  kenBurns: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'none'
  textPosition: 'top' | 'center' | 'bottom'
}

const KB_EFFECTS: Slide['kenBurns'][] = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'none']

const STORAGE_HOOKS = [
  "Running out of space? We've got you covered.",
  "Declutter your life. Store with confidence.",
  "Your stuff deserves a safe home too.",
  "Moving? We'll hold onto your things.",
  "Storage made simple. Reserve your unit today.",
  "Garage looking like a disaster? We can help.",
  "First month free — limited units available.",
  "Climate-controlled units starting at $49/mo.",
  "Don't throw it away. Store it away.",
  "5-star rated storage in your neighborhood.",
]

const HASHTAG_SETS = [
  '#selfstorage #storageunit #moving #declutter #organization #movingtips',
  '#storagelife #packingtips #movingday #storagesolutions #organize #rental',
  '#ministorage #storagefacility #movingout #storageunits #cleanout #spacesaver',
]

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export default function TikTokCreator({ facility, adminKey, darkMode }: {
  facility: Facility
  adminKey: string
  darkMode: boolean
}) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [variations, setVariations] = useState<AdVariation[]>([])
  const [loading, setLoading] = useState(true)
  const [slides, setSlides] = useState<Slide[]>([])
  const [activeSlideIdx, setActiveSlideIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [caption, setCaption] = useState('')
  const [generating, setGenerating] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'

  useEffect(() => {
    Promise.all([
      fetch(`/api/facility-assets?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      fetch(`/api/facility-creatives?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
    ]).then(([assetData, creativeData]) => {
      const photos = (assetData.assets || []).filter((a: Asset) => a.type === 'photo')
      setAssets(photos)
      if (creativeData.variations) setVariations(creativeData.variations)

      // Auto-generate initial slideshow if we have images
      if (photos.length > 0) {
        const initial = photos.slice(0, 5).map((a: Asset, i: number) => ({
          id: generateId(),
          imageUrl: a.url,
          textOverlay: i === 0 ? facility.name : '',
          subText: '',
          duration: 2,
          kenBurns: KB_EFFECTS[i % KB_EFFECTS.length],
          textPosition: 'bottom' as const,
        }))
        setSlides(initial)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [facility.id, adminKey])

  // Playback
  const advanceSlide = useCallback(() => {
    setActiveSlideIdx(prev => {
      const next = prev + 1
      if (next >= slides.length) {
        setPlaying(false)
        return 0
      }
      return next
    })
  }, [slides.length])

  useEffect(() => {
    if (playing && slides.length > 0) {
      const currentSlide = slides[activeSlideIdx]
      timerRef.current = setTimeout(advanceSlide, currentSlide.duration * 1000)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [playing, activeSlideIdx, slides, advanceSlide])

  function togglePlay() {
    if (playing) {
      setPlaying(false)
    } else {
      if (activeSlideIdx >= slides.length - 1) setActiveSlideIdx(0)
      setPlaying(true)
    }
  }

  function addSlide(imageUrl: string) {
    setSlides(prev => [...prev, {
      id: generateId(),
      imageUrl,
      textOverlay: '',
      subText: '',
      duration: 2,
      kenBurns: KB_EFFECTS[prev.length % KB_EFFECTS.length],
      textPosition: 'bottom',
    }])
  }

  function removeSlide(idx: number) {
    setSlides(prev => prev.filter((_, i) => i !== idx))
    if (activeSlideIdx >= slides.length - 1) setActiveSlideIdx(Math.max(0, slides.length - 2))
  }

  function updateSlide(idx: number, updates: Partial<Slide>) {
    setSlides(prev => prev.map((s, i) => i === idx ? { ...s, ...updates } : s))
  }

  function moveSlide(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= slides.length) return
    setSlides(prev => {
      const copy = [...prev]
      const temp = copy[idx]
      copy[idx] = copy[newIdx]
      copy[newIdx] = temp
      return copy
    })
    setActiveSlideIdx(newIdx)
  }

  async function autoGenerate() {
    setGenerating(true)
    try {
      // Pick best images
      const images = assets.slice(0, 6)
      if (images.length === 0) return

      // Pick a random hook or use ad copy if available
      const approvedVariation = variations.find(v => v.status === 'approved' || v.status === 'published')
      const hookText = approvedVariation?.content_json.primaryText || STORAGE_HOOKS[Math.floor(Math.random() * STORAGE_HOOKS.length)]
      const headline = approvedVariation?.content_json.headline || facility.name
      const cta = approvedVariation?.content_json.cta || 'Reserve Your Unit Today'

      const newSlides: Slide[] = [
        // Slide 1: Hook
        {
          id: generateId(),
          imageUrl: images[0].url,
          textOverlay: headline,
          subText: facility.location,
          duration: 2.5,
          kenBurns: 'zoom-in',
          textPosition: 'center',
        },
        // Middle slides: features/images
        ...images.slice(1, -1).map((img, i) => ({
          id: generateId(),
          imageUrl: img.url,
          textOverlay: [
            'Clean, Secure Units',
            '24/7 Access Available',
            'Climate Controlled',
            'Month-to-Month Leases',
            'Drive-Up Access',
          ][i % 5],
          subText: '',
          duration: 2,
          kenBurns: KB_EFFECTS[(i + 1) % KB_EFFECTS.length] as Slide['kenBurns'],
          textPosition: 'bottom' as const,
        })),
        // Last slide: CTA
        {
          id: generateId(),
          imageUrl: images[images.length - 1].url,
          textOverlay: cta,
          subText: hookText.slice(0, 80),
          duration: 3,
          kenBurns: 'zoom-out',
          textPosition: 'center',
        },
      ]

      setSlides(newSlides)
      setActiveSlideIdx(0)
      setCaption(`${hookText}\n\n${HASHTAG_SETS[Math.floor(Math.random() * HASHTAG_SETS.length)]}`)
    } finally {
      setGenerating(false)
    }
  }

  const totalDuration = slides.reduce((sum, s) => sum + s.duration, 0)
  const activeSlide = slides[activeSlideIdx]

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className={`text-sm font-semibold ${text}`}>TikTok Content Creator</h4>
          <p className={`text-xs ${sub} mt-0.5`}>Build slideshows for organic TikTok posting</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={autoGenerate}
            disabled={generating || assets.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40"
          >
            {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Auto-Generate
          </button>
          <span className={`flex items-center gap-1 text-xs ${sub}`}>
            <Clock size={12} /> {totalDuration.toFixed(1)}s
          </span>
        </div>
      </div>

      {slides.length === 0 ? (
        <div className={`text-center py-12 border rounded-xl ${card}`}>
          <Image size={32} className={`mx-auto mb-3 ${sub}`} />
          <p className={`text-sm ${sub}`}>
            {assets.length === 0
              ? 'No images available. Upload or scrape images in the Assets tab first.'
              : 'Click "Auto-Generate" to create a slideshow, or add slides manually below.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Preview */}
          <div className="space-y-3">
            <div className="flex justify-center">
              {/* 9:16 TikTok preview */}
              <div className="w-[270px] h-[480px] bg-black rounded-2xl overflow-hidden relative shadow-2xl flex-shrink-0">
                {/* Slide image with Ken Burns */}
                {activeSlide && (
                  <div className="absolute inset-0" key={activeSlide.id + '-' + activeSlideIdx}>
                    <img
                      src={activeSlide.imageUrl}
                      alt=""
                      className={`w-full h-full object-cover ${
                        playing ? getKenBurnsClass(activeSlide.kenBurns, activeSlide.duration) : ''
                      }`}
                      style={playing ? { animationDuration: `${activeSlide.duration}s` } : {}}
                    />
                  </div>
                )}

                {/* Gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

                {/* TikTok UI chrome */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="text-white text-[10px] font-semibold">Following | For You</span>
                  <span className="text-white text-[10px]">🔍</span>
                </div>

                {/* Text overlay */}
                {activeSlide && (activeSlide.textOverlay || activeSlide.subText) && (
                  <div className={`absolute left-0 right-0 px-5 ${
                    activeSlide.textPosition === 'top' ? 'top-16' :
                    activeSlide.textPosition === 'center' ? 'top-1/2 -translate-y-1/2' :
                    'bottom-24'
                  }`}>
                    {activeSlide.textOverlay && (
                      <p className={`text-white font-bold leading-tight ${
                        activeSlide.textOverlay.length > 30 ? 'text-base' : 'text-lg'
                      } ${playing ? 'animate-fadeInUp' : ''}`}
                        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}
                      >
                        {activeSlide.textOverlay}
                      </p>
                    )}
                    {activeSlide.subText && (
                      <p className={`text-white/80 text-xs mt-1 ${playing ? 'animate-fadeInUp' : ''}`}
                        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)', animationDelay: '0.2s' }}
                      >
                        {activeSlide.subText}
                      </p>
                    )}
                  </div>
                )}

                {/* Bottom TikTok chrome */}
                <div className="absolute bottom-3 left-3 right-12">
                  <p className="text-white text-[10px] font-semibold">@{facility.name.toLowerCase().replace(/\s+/g, '')}</p>
                  <p className="text-white/70 text-[9px] mt-0.5 line-clamp-2">{caption.split('\n')[0] || 'Your caption here...'}</p>
                </div>

                {/* Right side icons */}
                <div className="absolute right-2 bottom-16 flex flex-col gap-4 items-center">
                  {['❤️', '💬', '↗️', '🔖'].map((emoji, i) => (
                    <div key={i} className="text-center">
                      <span className="text-lg">{emoji}</span>
                      <p className="text-white text-[8px]">{Math.floor(Math.random() * 500)}</p>
                    </div>
                  ))}
                </div>

                {/* Slide counter */}
                <div className="absolute top-10 right-3 bg-black/50 rounded-full px-2 py-0.5">
                  <span className="text-white text-[9px] font-medium">{activeSlideIdx + 1}/{slides.length}</span>
                </div>

                {/* Progress bar */}
                <div className="absolute top-7 left-3 right-3 flex gap-0.5">
                  {slides.map((_, i) => (
                    <div key={i} className={`h-0.5 flex-1 rounded-full ${i <= activeSlideIdx ? 'bg-white' : 'bg-white/30'}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* Playback controls */}
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setActiveSlideIdx(Math.max(0, activeSlideIdx - 1))}
                disabled={playing}
                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} disabled:opacity-30`}
              >
                <ChevronLeft size={16} className={sub} />
              </button>
              <button
                onClick={togglePlay}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700"
              >
                {playing ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Preview</>}
              </button>
              <button
                onClick={() => setActiveSlideIdx(Math.min(slides.length - 1, activeSlideIdx + 1))}
                disabled={playing}
                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} disabled:opacity-30`}
              >
                <ChevronRight size={16} className={sub} />
              </button>
            </div>
          </div>

          {/* Right: Slide editor */}
          <div className="space-y-4">
            {/* Caption */}
            <div>
              <label className={`text-xs font-medium ${sub} block mb-1.5`}>Caption & Hashtags</label>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                rows={3}
                placeholder="Write your TikTok caption... #selfstorage #moving"
                className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
              />
            </div>

            {/* Slide list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs font-medium ${sub}`}>Slides ({slides.length})</label>
              </div>
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {slides.map((slide, idx) => (
                  <div
                    key={slide.id}
                    onClick={() => { setPlaying(false); setActiveSlideIdx(idx) }}
                    className={`flex gap-3 p-2 border rounded-lg cursor-pointer transition-colors ${
                      idx === activeSlideIdx
                        ? darkMode ? 'border-emerald-500 bg-emerald-900/20' : 'border-emerald-500 bg-emerald-50'
                        : card
                    }`}
                  >
                    <img src={slide.imageUrl} alt="" className="w-14 h-14 object-cover rounded flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <input
                        value={slide.textOverlay}
                        onChange={e => updateSlide(idx, { textOverlay: e.target.value })}
                        placeholder="Text overlay..."
                        className={`w-full text-xs px-1.5 py-0.5 rounded ${inputBg} border-0 bg-transparent ${text}`}
                        onClick={e => e.stopPropagation()}
                      />
                      <div className="flex gap-1.5 items-center">
                        <select
                          value={slide.duration}
                          onChange={e => updateSlide(idx, { duration: parseFloat(e.target.value) })}
                          onClick={e => e.stopPropagation()}
                          className={`text-[10px] px-1 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                        >
                          {[1, 1.5, 2, 2.5, 3, 4, 5].map(d => (
                            <option key={d} value={d}>{d}s</option>
                          ))}
                        </select>
                        <select
                          value={slide.kenBurns}
                          onChange={e => updateSlide(idx, { kenBurns: e.target.value as Slide['kenBurns'] })}
                          onClick={e => e.stopPropagation()}
                          className={`text-[10px] px-1 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                        >
                          <option value="zoom-in">Zoom In</option>
                          <option value="zoom-out">Zoom Out</option>
                          <option value="pan-left">Pan Left</option>
                          <option value="pan-right">Pan Right</option>
                          <option value="none">Static</option>
                        </select>
                        <div className="flex-1" />
                        <button onClick={e => { e.stopPropagation(); moveSlide(idx, -1) }} disabled={idx === 0} className={`p-0.5 ${sub} disabled:opacity-20`}><ChevronLeft size={11} /></button>
                        <button onClick={e => { e.stopPropagation(); moveSlide(idx, 1) }} disabled={idx === slides.length - 1} className={`p-0.5 ${sub} disabled:opacity-20`}><ChevronRight size={11} /></button>
                        <button onClick={e => { e.stopPropagation(); removeSlide(idx) }} className="p-0.5 text-red-500 hover:text-red-600"><Trash2 size={11} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add slide from assets */}
            <div>
              <label className={`text-xs font-medium ${sub} block mb-1.5`}>Add Image</label>
              <div className="grid grid-cols-6 gap-1.5 max-h-24 overflow-y-auto">
                {assets.filter(a => !slides.some(s => s.imageUrl === a.url)).map(a => (
                  <button
                    key={a.id}
                    onClick={() => addSlide(a.url)}
                    className="relative h-10 rounded overflow-hidden hover:ring-2 hover:ring-emerald-500"
                  >
                    <img src={a.url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Plus size={12} className="text-white" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Publish button */}
            <button
              onClick={() => {
                // Navigate to publish tab — we pass the slideshow data via the caption
                alert(`Slideshow ready! ${slides.length} slides, ${totalDuration}s total.\n\nGo to the Publish tab and select TikTok to post this content.`)
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-slate-800"
            >
              <Send size={14} /> Ready to Publish ({slides.length} slides, {totalDuration.toFixed(0)}s)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function getKenBurnsClass(effect: Slide['kenBurns'], _duration: number): string {
  switch (effect) {
    case 'zoom-in': return 'animate-kenBurnsZoomIn'
    case 'zoom-out': return 'animate-kenBurnsZoomOut'
    case 'pan-left': return 'animate-kenBurnsPanLeft'
    case 'pan-right': return 'animate-kenBurnsPanRight'
    default: return ''
  }
}
