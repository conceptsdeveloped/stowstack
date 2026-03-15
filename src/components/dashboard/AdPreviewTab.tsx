import { useState, useEffect } from 'react'
import { Loader2, Send, Image, MoreHorizontal, Heart, MessageCircle, Bookmark, Globe } from 'lucide-react'
import { Facility, AdVariation, Asset, STATUS_COLORS } from './types'

type AdFormat = 'instagram_post' | 'instagram_story' | 'google_display' | 'facebook_feed'

const AD_FORMATS: { id: AdFormat; label: string; width: number; height: number }[] = [
  { id: 'instagram_post', label: 'Instagram Post', width: 1080, height: 1080 },
  { id: 'instagram_story', label: 'Instagram Story', width: 1080, height: 1920 },
  { id: 'facebook_feed', label: 'Facebook Feed', width: 1200, height: 628 },
  { id: 'google_display', label: 'Google Display', width: 300, height: 250 },
]

export default function AdPreviewTab({ facility, adminKey, darkMode, onPublish }: { facility: Facility; adminKey: string; darkMode: boolean; onPublish: () => void }) {
  const [variations, setVariations] = useState<AdVariation[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [stockImages, setStockImages] = useState<{ id: string; url: string; alt: string; category: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVariation, setSelectedVariation] = useState<AdVariation | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [activeFormat, setActiveFormat] = useState<AdFormat>('instagram_post')
  const [stockCategory, setStockCategory] = useState('all')
  const [imageSource, setImageSource] = useState<'assets' | 'stock'>('assets')

  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'

  useEffect(() => {
    Promise.all([
      fetch(`/api/facility-creatives?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      fetch(`/api/facility-assets?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      fetch(`/api/stock-images?category=all`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
    ]).then(([creativeData, assetData, stockData]) => {
      if (creativeData.variations?.length) {
        setVariations(creativeData.variations)
        setSelectedVariation(creativeData.variations[0])
      }
      if (assetData.assets) {
        const photos = assetData.assets.filter((a: Asset) => a.type === 'photo')
        setAssets(photos)
        if (photos.length > 0) setSelectedImage(photos[0].url)
      }
      if (stockData.images) setStockImages(stockData.images)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [facility.id, adminKey])

  async function loadStockCategory(cat: string) {
    setStockCategory(cat)
    try {
      const res = await fetch(`/api/stock-images?category=${cat}`, { headers: { 'X-Admin-Key': adminKey } })
      const data = await res.json()
      if (data.images) setStockImages(data.images)
    } catch {}
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>

  if (!variations.length) {
    return (
      <div className={`text-center py-12 border rounded-xl ${card}`}>
        <p className={`text-sm ${sub}`}>No ad copy generated yet. Go to the Creative tab first to generate ad variations.</p>
      </div>
    )
  }

  const copy = selectedVariation?.content_json || {}
  const availableImages = imageSource === 'assets'
    ? assets.map(a => ({ id: a.id, url: a.url, alt: '' }))
    : stockImages.filter(s => stockCategory === 'all' || s.category === stockCategory)

  return (
    <div className="space-y-6">
      {/* Format selector */}
      <div className="flex flex-wrap gap-2">
        {AD_FORMATS.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFormat(f.id)}
            className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors ${
              activeFormat === f.id
                ? 'bg-emerald-600 text-white border-emerald-600'
                : darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
            <span className={`ml-1.5 text-[10px] ${activeFormat === f.id ? 'text-emerald-100' : sub}`}>
              {f.width}x{f.height}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Ad Preview */}
        <div className="space-y-4">
          <h4 className={`text-sm font-semibold ${text}`}>Preview</h4>
          <div className="flex justify-center">
            <AdMockup
              format={activeFormat}
              image={selectedImage}
              copy={copy}
              facilityName={facility.name}
              darkMode={darkMode}
            />
          </div>
          <button
            onClick={onPublish}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
          >
            <Send size={14} /> Publish This Ad
          </button>
        </div>

        {/* Right: Controls */}
        <div className="space-y-5">
          {/* Copy variation selector */}
          <div>
            <h4 className={`text-sm font-semibold ${text} mb-2`}>Ad Copy</h4>
            <div className="space-y-2">
              {variations.filter(v => v.status !== 'rejected').map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariation(v)}
                  className={`w-full text-left p-3 border rounded-lg transition-colors ${
                    selectedVariation?.id === v.id
                      ? darkMode ? 'border-emerald-500 bg-emerald-900/20' : 'border-emerald-500 bg-emerald-50'
                      : card
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                      darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {v.content_json.angleLabel || v.angle}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[v.status] || ''}`}>{v.status}</span>
                  </div>
                  <p className={`text-xs font-medium ${text} truncate`}>{v.content_json.headline}</p>
                  <p className={`text-[11px] ${sub} line-clamp-2 mt-0.5`}>{v.content_json.primaryText}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Image selector */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h4 className={`text-sm font-semibold ${text}`}>Image</h4>
              <div className="flex gap-1 ml-auto">
                <button
                  onClick={() => setImageSource('assets')}
                  className={`px-2 py-1 text-[11px] rounded ${imageSource === 'assets' ? 'bg-emerald-600 text-white' : darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  Facility ({assets.length})
                </button>
                <button
                  onClick={() => setImageSource('stock')}
                  className={`px-2 py-1 text-[11px] rounded ${imageSource === 'stock' ? 'bg-emerald-600 text-white' : darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  Stock
                </button>
              </div>
            </div>

            {imageSource === 'stock' && (
              <div className="flex gap-1 mb-2 flex-wrap">
                {['all', 'exterior', 'interior', 'moving', 'packing', 'lifestyle', 'vehicle'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => loadStockCategory(cat)}
                    className={`px-2 py-0.5 text-[10px] rounded ${
                      stockCategory === cat ? 'bg-emerald-600 text-white' : darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
              {availableImages.map(img => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img.url)}
                  className={`relative rounded-lg overflow-hidden ${
                    selectedImage === img.url ? 'ring-2 ring-emerald-500' : ''
                  }`}
                >
                  <img src={img.url} alt={img.alt} className="h-16 w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </button>
              ))}
              {availableImages.length === 0 && (
                <p className={`col-span-4 text-center text-xs ${sub} py-4`}>
                  {imageSource === 'assets' ? 'No facility photos. Scrape the website or upload images in the Assets tab.' : 'Loading stock images...'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* Ad Mockup Renderer */

function AdMockup({ format, image, copy, facilityName, darkMode }: {
  format: AdFormat
  image: string | null
  copy: Record<string, string>
  facilityName: string
  darkMode: boolean
}) {
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const headline = copy.headline || 'Your Headline Here'
  const primaryText = copy.primaryText || 'Your ad copy will appear here.'
  const description = copy.description || ''
  const cta = copy.cta || 'Learn More'

  if (format === 'instagram_story') {
    return (
      <div className="w-[270px] h-[480px] bg-black rounded-2xl overflow-hidden relative shadow-2xl flex-shrink-0">
        {image ? (
          <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute top-2 left-3 right-3 flex gap-1">
          <div className="h-0.5 flex-1 bg-white/60 rounded-full" />
          <div className="h-0.5 flex-1 bg-white/30 rounded-full" />
          <div className="h-0.5 flex-1 bg-white/30 rounded-full" />
        </div>
        <div className="absolute top-6 left-3 flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white text-[9px] font-bold">SS</div>
          <div>
            <p className="text-white text-[10px] font-semibold">{facilityName}</p>
            <p className="text-white/60 text-[8px]">Sponsored</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          <p className="text-white text-sm font-bold leading-tight">{headline}</p>
          <p className="text-white/80 text-[11px] leading-relaxed line-clamp-3">{primaryText}</p>
          <div className="flex justify-center pt-2">
            <div className="bg-white rounded-full px-5 py-1.5 text-[10px] font-bold text-black">{cta}</div>
          </div>
        </div>
      </div>
    )
  }

  if (format === 'instagram_post') {
    return (
      <div className={`w-[320px] rounded-xl overflow-hidden shadow-2xl flex-shrink-0 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
        <div className="flex items-center gap-2 p-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">SS</div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{facilityName.toLowerCase().replace(/\s+/g, '')}</p>
            <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Sponsored</p>
          </div>
          <MoreHorizontal size={16} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />
        </div>
        <div className="w-full aspect-square bg-slate-200 relative">
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Image size={32} className={sub} />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
            <p className="text-white text-base font-bold">{headline}</p>
          </div>
        </div>
        <div className={`flex items-center gap-4 px-3 py-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          <Heart size={20} />
          <MessageCircle size={20} />
          <Send size={20} />
          <div className="flex-1" />
          <Bookmark size={20} />
        </div>
        <div className="px-3 pb-3">
          <p className={`text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <span className="font-semibold">{facilityName.toLowerCase().replace(/\s+/g, '')} </span>
            {primaryText}
          </p>
          {description && <p className={`text-[10px] ${sub} mt-1`}>{description}</p>}
          <div className="mt-2">
            <span className="inline-block bg-emerald-600 text-white text-[10px] font-semibold px-3 py-1 rounded">{cta}</span>
          </div>
        </div>
      </div>
    )
  }

  if (format === 'facebook_feed') {
    return (
      <div className={`w-[400px] rounded-xl overflow-hidden shadow-2xl flex-shrink-0 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
        <div className="flex items-center gap-2 p-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">SS</div>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{facilityName}</p>
            <p className={`text-[11px] ${sub}`}>Sponsored · <Globe size={10} className="inline" /></p>
          </div>
          <MoreHorizontal size={18} className={sub} />
        </div>
        <div className="px-3 pb-2">
          <p className={`text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{primaryText}</p>
        </div>
        <div className="w-full aspect-[1.91/1] bg-slate-200 relative">
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Image size={32} className={sub} />
            </div>
          )}
        </div>
        <div className={`px-3 py-2 border-t ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
          <p className={`text-[10px] uppercase ${sub}`}>stowstack.co</p>
          <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'} truncate`}>{headline}</p>
          <p className={`text-xs ${sub} truncate`}>{description}</p>
        </div>
        <div className={`px-3 py-2 border-t flex items-center justify-between ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
          <button className={`px-4 py-1.5 text-xs font-semibold rounded ${darkMode ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-900'}`}>{cta}</button>
          <div className={`flex gap-4 ${sub}`}>
            <span className="text-xs">👍 Like</span>
            <span className="text-xs">💬 Comment</span>
            <span className="text-xs">↗ Share</span>
          </div>
        </div>
      </div>
    )
  }

  if (format === 'google_display') {
    return (
      <div className={`w-[300px] border rounded-lg overflow-hidden shadow-2xl flex-shrink-0 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="w-full h-[150px] bg-slate-200 relative">
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Image size={24} className={sub} />
            </div>
          )}
          <div className="absolute top-1 left-1 bg-yellow-400 text-black text-[8px] font-bold px-1 rounded">Ad</div>
        </div>
        <div className="p-3 space-y-1.5">
          <p className={`text-sm font-bold leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{headline}</p>
          <p className={`text-[11px] ${sub} line-clamp-2`}>{description || primaryText}</p>
          <div className="flex items-center justify-between pt-1">
            <span className={`text-[10px] ${sub}`}>{facilityName}</span>
            <button className="bg-blue-600 text-white text-[10px] font-semibold px-3 py-1 rounded">{cta}</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
