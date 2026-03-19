import { useState, useEffect, useRef } from 'react'
import { Loader2, Upload, Globe, Image, Film, FileText, Trash2, ImageOff, Eye } from 'lucide-react'
import { Facility, Asset, STOCK_CATEGORIES } from './types'

function ImageWithFallback({ src, alt, className, onLoad: externalOnLoad }: { src: string; alt: string; className: string; onLoad?: () => void }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  return (
    <div className={`relative ${className}`}>
      {status === 'loading' && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse rounded-lg flex items-center justify-center">
          <Image size={16} className="text-slate-600" />
        </div>
      )}
      {status === 'error' ? (
        <div className="absolute inset-0 bg-slate-800 rounded-lg flex flex-col items-center justify-center gap-1">
          <ImageOff size={16} className="text-slate-600" />
          <span className="text-[10px] text-slate-600">Failed to load</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover rounded-lg transition-opacity duration-200 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => { setStatus('loaded'); externalOnLoad?.() }}
          onError={() => setStatus('error')}
        />
      )}
    </div>
  )
}

export default function AssetsTab({ facility, adminKey, darkMode }: { facility: Facility; adminKey: string; darkMode: boolean }) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [scrapeUrl, setScrapeUrl] = useState(facility.website || '')
  const [scraping, setScraping] = useState(false)
  const [scrapeResult, setScrapeResult] = useState<{ images?: { url: string; alt: string }[]; videos?: { url: string; type: string }[]; contact?: { phones: string[]; emails: string[] }; headings?: string[]; pagesScraped?: number; pagesCrawled?: string[]; pageCopy?: string[]; services?: { heading?: string; description?: string }[]; promotions?: { text: string }[] } | null>(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const [libraryFilter, setLibraryFilter] = useState<string>('all')
  const [stockImages, setStockImages] = useState<{ id: string; url: string; alt: string; category: string }[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'

  useEffect(() => {
    fetch(`/api/facility-assets?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } })
      .then(r => r.json())
      .then(data => { if (data.assets) setAssets(data.assets) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [facility.id, adminKey])

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const res = await fetch(`/api/facility-assets?facilityId=${facility.id}&filename=${encodeURIComponent(file.name)}`, {
          method: 'POST',
          headers: {
            'X-Admin-Key': adminKey,
            'X-Facility-Id': facility.id,
            'X-Filename': file.name,
            'X-File-Type': file.type,
          },
          body: file,
        })
        const data = await res.json()
        if (data.asset) setAssets(prev => [data.asset, ...prev])
      }
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  async function addStockImage(stockItem: { url: string; alt: string }) {
    try {
      const res = await fetch('/api/facility-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          facilityId: facility.id,
          url: stockItem.url,
          type: 'photo',
          source: 'stock_library',
          metadata: { alt: stockItem.alt },
        }),
      })
      const data = await res.json()
      if (data.asset) setAssets(prev => [data.asset, ...prev])
    } catch (err) {
      console.error('Add stock image failed:', err)
    }
  }

  async function deleteAsset(assetId: string) {
    try {
      await fetch('/api/facility-assets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ assetId }),
      })
      setAssets(prev => prev.filter(a => a.id !== assetId))
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  async function loadStockImages(cat: string) {
    setLibraryFilter(cat)
    setStockLoading(true)
    try {
      const res = await fetch(`/api/stock-images?category=${cat}`, { headers: { 'X-Admin-Key': adminKey } })
      const data = await res.json()
      if (data.images) setStockImages(data.images)
    } catch (err) {
      console.error('Stock image load failed:', err)
    } finally {
      setStockLoading(false)
    }
  }

  async function scrapeWebsite() {
    if (!scrapeUrl.trim()) return
    setScraping(true)
    setScrapeResult(null)
    try {
      const res = await fetch('/api/scrape-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ url: scrapeUrl.trim(), facilityId: facility.id }),
      })
      const data = await res.json()
      if (data.scraped) {
        setScrapeResult(data)
        const assetsRes = await fetch(`/api/facility-assets?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } })
        const assetsData = await assetsRes.json()
        if (assetsData.assets) setAssets(assetsData.assets)
      } else {
        setScrapeResult({ images: [], headings: [data.error || 'Scrape returned no data'] })
      }
    } catch (err) {
      console.error('Scrape failed:', err)
    } finally {
      setScraping(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>

  const photos = assets.filter(a => a.type === 'photo')
  const videoAssets = assets.filter(a => a.type === 'video')
  const documents = assets.filter(a => a.type === 'document')

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-emerald-500 bg-emerald-50/50'
            : darkMode ? 'border-slate-600 hover:border-slate-500' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf"
          className="hidden"
          onChange={e => { if (e.target.files?.length) uploadFiles(e.target.files) }}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin text-emerald-500" />
            <span className={text}>Uploading...</span>
          </div>
        ) : (
          <>
            <Upload size={32} className={`mx-auto mb-3 ${dragOver ? 'text-emerald-500' : sub}`} />
            <p className={`font-medium ${text}`}>Drop files here or click to upload</p>
            <p className={`text-sm ${sub} mt-1`}>Photos, videos, PDFs — any format</p>
          </>
        )}
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-3">
        {/* Website scraper */}
        <div className="flex-1 min-w-[280px]">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Globe size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
              <input
                value={scrapeUrl}
                onChange={e => setScrapeUrl(e.target.value)}
                placeholder="Enter facility website URL to scrape..."
                className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm ${inputBg}`}
              />
            </div>
            <button
              onClick={scrapeWebsite}
              disabled={scraping || !scrapeUrl.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 whitespace-nowrap"
            >
              {scraping ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
              {scraping ? 'Scraping...' : 'Scrape Website'}
            </button>
          </div>
        </div>

        {/* Stock library toggle */}
        <button
          onClick={() => { const next = !showLibrary; setShowLibrary(next); if (next && !stockImages.length) loadStockImages('all') }}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border ${
            showLibrary
              ? 'bg-emerald-600 text-white border-emerald-600'
              : darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Image size={14} />
          Stock Library
        </button>
      </div>

      {/* Scrape results */}
      {scrapeResult && (
        <div className={`border rounded-xl overflow-hidden ${card}`}>
          <div className="px-4 py-3 flex items-center justify-between">
            <h4 className={`text-sm font-semibold ${text}`}>
              Scraped from Website
              {scrapeResult.pagesScraped && <span className={`ml-2 text-xs font-normal ${sub}`}>({scrapeResult.pagesScraped} pages crawled)</span>}
            </h4>
            <button onClick={() => setScrapeResult(null)} className={`text-xs ${sub} hover:underline`}>Dismiss</button>
          </div>
          <div className={`border-t px-4 py-4 space-y-4 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            {scrapeResult.images && scrapeResult.images.length > 0 ? (
              <>
                <p className={`text-xs ${sub} mb-2`}>{scrapeResult.images.length} images found — already saved to assets</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {scrapeResult.images.slice(0, 24).map((img, i) => (
                    <div key={i} className="relative group">
                      <ImageWithFallback src={img.url} alt={img.alt || ''} className="h-20 w-full" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className={`text-sm ${sub}`}>No usable images found. The site may use JavaScript-rendered images that require a browser to load.</p>
            )}

            {scrapeResult.services && scrapeResult.services.length > 0 && (
              <div>
                <p className={`text-xs font-medium ${sub} mb-1`}>Services / Features Found:</p>
                <div className="flex flex-wrap gap-2">
                  {scrapeResult.services.slice(0, 12).map((s, i) => (
                    <span key={i} className={`text-xs px-2 py-1 rounded-lg ${darkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                      {s.heading || s.description?.slice(0, 60)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {scrapeResult.promotions && scrapeResult.promotions.length > 0 && (
              <div>
                <p className={`text-xs font-medium ${sub} mb-1`}>Promotions / Specials:</p>
                {scrapeResult.promotions.slice(0, 5).map((p, i) => (
                  <p key={i} className={`text-xs ${text} p-2 rounded-lg mb-1 ${darkMode ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>{p.text}</p>
                ))}
              </div>
            )}

            {scrapeResult.pageCopy && scrapeResult.pageCopy.length > 0 && (
              <details className={`text-xs ${sub}`}>
                <summary className="font-medium cursor-pointer hover:underline">Site Copy ({scrapeResult.pageCopy.length} paragraphs extracted)</summary>
                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                  {scrapeResult.pageCopy.slice(0, 20).map((t, i) => (
                    <p key={i} className={`text-xs ${text} p-2 rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>{t}</p>
                  ))}
                </div>
              </details>
            )}

            {scrapeResult.videos && scrapeResult.videos.length > 0 && (
              <div>
                <p className={`text-xs font-medium ${sub} mb-1`}>Videos found:</p>
                {scrapeResult.videos.map((v, i) => (
                  <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-emerald-500 hover:underline">
                    <Film size={12} /> {v.url.slice(0, 80)}...
                  </a>
                ))}
              </div>
            )}

            {scrapeResult.contact && (scrapeResult.contact.phones.length > 0 || scrapeResult.contact.emails.length > 0) && (
              <div className="flex gap-4">
                {scrapeResult.contact.phones.length > 0 && (
                  <div>
                    <p className={`text-xs font-medium ${sub} mb-1`}>Phones:</p>
                    {scrapeResult.contact.phones.map((p, i) => <p key={i} className={`text-xs ${text}`}>{p}</p>)}
                  </div>
                )}
                {scrapeResult.contact.emails.length > 0 && (
                  <div>
                    <p className={`text-xs font-medium ${sub} mb-1`}>Emails:</p>
                    {scrapeResult.contact.emails.map((e, i) => <p key={i} className={`text-xs ${text}`}>{e}</p>)}
                  </div>
                )}
              </div>
            )}

            {scrapeResult.pagesCrawled && scrapeResult.pagesCrawled.length > 1 && (
              <details className={`text-xs ${sub}`}>
                <summary className="font-medium cursor-pointer hover:underline">Pages crawled ({scrapeResult.pagesCrawled.length})</summary>
                <div className="mt-1 space-y-0.5">
                  {scrapeResult.pagesCrawled.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-emerald-500 hover:underline truncate">{url}</a>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      )}

      {/* Stock library */}
      {showLibrary && (
        <div className={`border rounded-xl overflow-hidden ${card}`}>
          <div className="px-4 py-3 flex items-center justify-between">
            <h4 className={`text-sm font-semibold ${text}`}>Stock Library — Self-Storage Images</h4>
            <div className="flex gap-1 flex-wrap">
              {STOCK_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => loadStockImages(cat)}
                  className={`px-2 py-1 text-xs rounded-md ${
                    libraryFilter === cat
                      ? 'bg-emerald-600 text-white'
                      : darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className={`border-t px-4 py-4 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            {stockLoading ? (
              <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-emerald-500" /></div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {stockImages.map(stock => {
                  const alreadyAdded = assets.some(a => a.url === stock.url)
                  return (
                    <div key={stock.id} className="relative group">
                      <ImageWithFallback src={stock.url} alt={stock.alt} className="h-24 w-full" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        {alreadyAdded ? (
                          <span className="text-xs text-white font-medium">✓ Added</span>
                        ) : (
                          <button
                            onClick={() => addStockImage(stock)}
                            className="px-2 py-1 bg-emerald-600 text-white text-xs font-medium rounded hover:bg-emerald-700"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                      <p className={`text-xs ${sub} mt-1 truncate`}>{stock.alt}</p>
                    </div>
                  )
                })}
                {stockImages.length === 0 && (
                  <p className={`col-span-6 text-center text-xs ${sub} py-4`}>No images found for this category.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Asset grid */}
      {assets.length > 0 && (
        <div className="space-y-4">
          {photos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Image size={15} className={sub} />
                <h4 className={`text-sm font-semibold ${text}`}>Photos</h4>
                <span className={`text-xs ${sub}`}>({photos.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {photos.map(asset => (
                  <div key={asset.id} className="relative group">
                    <ImageWithFallback src={asset.url} alt="" className="h-32 w-full" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end p-2">
                      <div className="flex gap-1 w-full">
                        <span className={`flex-1 text-xs text-white/80 truncate`}>
                          {asset.source === 'uploaded' ? 'Uploaded' : asset.source === 'website_scrape' ? 'Scraped' : asset.source === 'stock_library' ? 'Stock' : asset.source}
                        </span>
                        <a href={asset.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-1 bg-white/20 rounded hover:bg-white/30 text-white">
                          <Eye size={12} />
                        </a>
                        <button
                          onClick={e => { e.stopPropagation(); deleteAsset(asset.id) }}
                          className="p-1 bg-red-600/80 rounded hover:bg-red-600 text-white"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {videoAssets.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Film size={15} className={sub} />
                <h4 className={`text-sm font-semibold ${text}`}>Videos</h4>
                <span className={`text-xs ${sub}`}>({videoAssets.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {videoAssets.map(asset => (
                  <div key={asset.id} className={`relative border rounded-lg overflow-hidden ${card}`}>
                    <video src={asset.url} className="h-32 w-full object-cover" preload="metadata" />
                    <div className="p-2 flex items-center justify-between">
                      <span className={`text-xs ${sub} truncate`}>{(asset.metadata as { filename?: string })?.filename || 'Video'}</span>
                      <button onClick={() => deleteAsset(asset.id)} className="p-1 text-red-500 hover:text-red-600"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {documents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText size={15} className={sub} />
                <h4 className={`text-sm font-semibold ${text}`}>Documents</h4>
                <span className={`text-xs ${sub}`}>({documents.length})</span>
              </div>
              <div className="space-y-2">
                {documents.map(asset => (
                  <div key={asset.id} className={`flex items-center gap-3 p-3 border rounded-lg ${card}`}>
                    <FileText size={18} className={sub} />
                    <a href={asset.url} target="_blank" rel="noopener noreferrer" className={`flex-1 text-sm ${text} hover:underline truncate`}>
                      {(asset.metadata as { filename?: string })?.filename || 'Document'}
                    </a>
                    <span className={`text-xs ${sub}`}>{asset.source}</span>
                    <button onClick={() => deleteAsset(asset.id)} className="p-1 text-red-500 hover:text-red-600"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {assets.length === 0 && !scrapeResult && !showLibrary && (
        <div className={`text-center py-8 ${sub}`}>
          <p className="text-sm">No assets yet. Upload files, scrape a website, or browse the stock library to get started.</p>
        </div>
      )}
    </div>
  )
}
