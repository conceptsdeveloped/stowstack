import { useState, useEffect } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Facility, AdVariation, Asset, PlatformInfo, PlatformConnection, PublishLogEntry } from './types'

export default function PublishTab({ facility, adminKey, darkMode }: { facility: Facility; adminKey: string; darkMode: boolean }) {
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([])
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [variations, setVariations] = useState<AdVariation[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [publishLog, setPublishLog] = useState<PublishLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'

  useEffect(() => {
    Promise.all([
      fetch(`/api/platform-connections?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      fetch(`/api/facility-creatives?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      fetch(`/api/facility-assets?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      fetch(`/api/publish-ad?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
    ]).then(([connData, creativeData, assetData, logData]) => {
      if (connData.platforms) setPlatforms(connData.platforms)
      if (connData.connections) {
        setConnections(connData.connections)
        const firstConnected = connData.connections.find((c: PlatformConnection) => c.status === 'connected')
        if (firstConnected) setSelectedConnection(firstConnected.id)
      }
      if (creativeData.variations) {
        const approved = creativeData.variations.filter((v: AdVariation) => v.status === 'approved' || v.status === 'published')
        setVariations(approved)
        if (approved.length) setSelectedVariation(approved[0].id)
      }
      if (assetData.assets) {
        const photos = assetData.assets.filter((a: Asset) => a.type === 'photo')
        setAssets(photos)
        if (photos.length) setSelectedImage(photos[0].url)
      }
      if (logData.logs) setPublishLog(logData.logs)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [facility.id, adminKey])

  function getConnection(platform: string) {
    return connections.find(c => c.platform === platform && c.status === 'connected')
  }

  async function disconnect(connectionId: string) {
    setDisconnecting(connectionId)
    try {
      await fetch('/api/platform-connections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ connectionId }),
      })
      setConnections(prev => prev.map(c => c.id === connectionId ? { ...c, status: 'disconnected' } : c))
    } catch {} finally {
      setDisconnecting(null)
    }
  }

  async function publishAd() {
    if (!selectedVariation || !selectedConnection) return
    setPublishing(selectedVariation)
    setPublishError(null)
    setPublishSuccess(null)
    try {
      const res = await fetch('/api/publish-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          variationId: selectedVariation,
          connectionId: selectedConnection,
          imageUrl: selectedImage,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPublishSuccess(data.externalUrl ? `Ad published! View in Ads Manager →` : 'Ad published successfully!')
        const logRes = await fetch(`/api/publish-ad?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } })
        const logData = await logRes.json()
        if (logData.logs) setPublishLog(logData.logs)
      } else {
        setPublishError(data.details || data.error || 'Publishing failed — check Ads Manager for details.')
      }
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Network error — could not reach publish API.')
    } finally {
      setPublishing(null)
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>

  const connectedPlatforms = connections.filter(c => c.status === 'connected')

  return (
    <div className="space-y-6">
      {/* Platform Connections */}
      <div>
        <h4 className={`text-sm font-semibold ${text} mb-3`}>Platform Connections</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {platforms.map(platform => {
            const conn = getConnection(platform.id)
            return (
              <div key={platform.id} className={`border rounded-xl p-4 ${card}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
                    platform.id === 'meta' ? 'bg-blue-600' : platform.id === 'tiktok' ? 'bg-black' : 'bg-red-500'
                  }`}>
                    {platform.id === 'meta' ? 'M' : platform.id === 'tiktok' ? 'T' : 'G'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${text}`}>{platform.name}</p>
                    <p className={`text-xs ${sub} mt-0.5`}>{platform.description}</p>

                    {conn ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                          <span className={`text-xs font-medium text-emerald-500`}>Connected</span>
                        </div>
                        {conn.account_name && (
                          <p className={`text-xs ${sub}`}>Account: {conn.account_name}</p>
                        )}
                        {conn.page_name && (
                          <p className={`text-xs ${sub}`}>Page: {conn.page_name}</p>
                        )}
                        {conn.token_expires_at && (
                          <p className={`text-[10px] ${sub}`}>
                            Token expires: {new Date(conn.token_expires_at).toLocaleDateString()}
                          </p>
                        )}
                        <button
                          onClick={() => disconnect(conn.id)}
                          disabled={disconnecting === conn.id}
                          className="text-xs text-red-500 hover:underline disabled:opacity-40"
                        >
                          {disconnecting === conn.id ? 'Disconnecting...' : 'Disconnect'}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3">
                        {platform.configured ? (
                          <a
                            href={platform.connectUrl || '#'}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700"
                          >
                            Connect {platform.id === 'meta' ? 'Facebook' : platform.id === 'tiktok' ? 'TikTok' : 'Google'} Account
                          </a>
                        ) : (
                          <div className={`p-3 rounded-lg border border-dashed ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}>
                            <p className={`text-xs ${sub}`}>
                              {platform.id === 'meta'
                                ? 'Requires META_APP_ID and META_APP_SECRET environment variables.'
                                : platform.id === 'tiktok'
                                ? 'Requires TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET environment variables.'
                                : 'Requires GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, and GOOGLE_ADS_DEVELOPER_TOKEN environment variables.'}
                            </p>
                            <p className={`text-[10px] ${sub} mt-1`}>Add these in Vercel → Settings → Environment Variables</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Publish Controls */}
      {connectedPlatforms.length > 0 && variations.length > 0 && (
        <div className={`border rounded-xl p-5 ${card}`}>
          <h4 className={`text-sm font-semibold ${text} mb-4`}>Publish an Ad</h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={`text-xs font-medium ${sub} block mb-1.5`}>Ad Copy</label>
              <select
                value={selectedVariation || ''}
                onChange={e => setSelectedVariation(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
              >
                {variations.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.content_json.angleLabel || v.angle} — {v.content_json.headline?.slice(0, 30)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`text-xs font-medium ${sub} block mb-1.5`}>Platform</label>
              <select
                value={selectedConnection || ''}
                onChange={e => setSelectedConnection(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
              >
                <option value="">Select platform...</option>
                {connectedPlatforms.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.platform === 'meta' ? 'Meta' : c.platform === 'tiktok' ? 'TikTok' : 'Google Ads'} — {c.account_name || c.account_id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`text-xs font-medium ${sub} block mb-1.5`}>Image</label>
              <select
                value={selectedImage || ''}
                onChange={e => setSelectedImage(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
              >
                <option value="">No image</option>
                {assets.map((a, i) => (
                  <option key={a.id} value={a.url}>
                    {a.source === 'website_scrape' ? 'Scraped' : a.source === 'stock_library' ? 'Stock' : 'Uploaded'} image {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <button
                onClick={publishAd}
                disabled={!selectedVariation || !selectedConnection || !!publishing}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40"
              >
                {publishing ? (
                  <><Loader2 size={14} className="animate-spin" /> Publishing...</>
                ) : (
                  <><Send size={14} /> Publish Ad</>
                )}
              </button>
              {selectedImage && (
                <img src={selectedImage} alt="" className="h-10 w-16 object-cover rounded" />
              )}
            </div>
            <p className={`text-xs ${sub}`}>
              Ad will be created as <span className="font-semibold">PAUSED</span> in Ads Manager. Review targeting and budget there, then activate when ready.
            </p>
            {publishError && (
              <div className={`p-3 rounded-lg border text-sm ${darkMode ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <p className="font-medium text-xs mb-1">Publish Failed</p>
                <p className="text-xs">{publishError}</p>
              </div>
            )}
            {publishSuccess && (
              <div className={`p-3 rounded-lg border text-sm ${darkMode ? 'bg-emerald-900/20 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                <p className="text-xs">{publishSuccess}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No approved variations message */}
      {connectedPlatforms.length > 0 && variations.length === 0 && (
        <div className={`text-center py-6 border rounded-xl ${card}`}>
          <p className={`text-sm ${sub}`}>No approved ad variations yet. Go to the Creative tab to approve some ads first.</p>
        </div>
      )}

      {/* Publish History */}
      {publishLog.length > 0 && (
        <div>
          <h4 className={`text-sm font-semibold ${text} mb-3`}>Publish History</h4>
          <div className="space-y-2">
            {publishLog.map(log => (
              <div key={log.id} className={`flex items-center gap-3 p-3 border rounded-lg ${card}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                  log.platform === 'meta' ? 'bg-blue-600' : log.platform === 'tiktok' ? 'bg-black' : 'bg-red-500'
                }`}>
                  {log.platform === 'meta' ? 'M' : log.platform === 'tiktok' ? 'T' : 'G'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${text}`}>
                    {log.content_json?.headline || log.angle || 'Ad variation'}
                  </p>
                  <p className={`text-[10px] ${sub}`}>
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  log.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                  log.status === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {log.status}
                </span>
                {log.external_url && (
                  <a href={log.external_url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-500 hover:underline">
                    View ↗
                  </a>
                )}
                {log.error_message && (
                  <span className={`text-[10px] text-red-500 max-w-[200px] truncate`} title={log.error_message}>
                    {log.error_message}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
