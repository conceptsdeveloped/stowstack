import { useState, useEffect } from 'react'
import { ArrowLeft, Mail, Phone, Loader2, ChevronRight } from 'lucide-react'
import { Facility, FACILITY_STATUSES, STATUS_COLORS } from './types'
import CreativeTab from './CreativeTab'
import AssetsTab from './AssetsTab'
import AdPreviewTab from './AdPreviewTab'
import LandingPagesTab from './LandingPagesTab'
import UTMLinksTab from './UTMLinksTab'
import PublishTab from './PublishTab'
import TikTokCreator from './TikTokCreator'
import VideoGenerator from './VideoGenerator'

type FacilitySubTab = 'overview' | 'creative' | 'assets' | 'ad-preview' | 'tiktok' | 'video' | 'landing-pages' | 'utm-links' | 'publish'

function FacilityDetail({ facility, adminKey, darkMode, onBack, onStatusChange }: {
  facility: Facility
  adminKey: string
  darkMode: boolean
  onBack: () => void
  onStatusChange: (id: string, status: string) => void
}) {
  const [subTab, setSubTab] = useState<FacilitySubTab>('overview')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'

  async function updateStatus(status: string) {
    setUpdatingStatus(true)
    try {
      await fetch('/api/admin-facilities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ id: facility.id, status }),
      })
      onStatusChange(facility.id, status)
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Back + facility header */}
      <div className="flex items-start gap-4">
        <button onClick={onBack} className={`mt-1 p-1 rounded-lg hover:bg-slate-100 ${darkMode ? 'hover:bg-slate-800' : ''}`}>
          <ArrowLeft size={18} className={sub} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className={`text-xl font-bold ${text}`}>{facility.name}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${STATUS_COLORS[facility.status] || 'bg-slate-100 text-slate-600'}`}>
              {facility.status}
            </span>
            {facility.google_rating && (
              <span className="text-sm font-semibold text-amber-500">★ {facility.google_rating} ({facility.review_count})</span>
            )}
          </div>
          <p className={`text-sm ${sub} mt-0.5`}>{facility.location}</p>
        </div>
        {/* Status dropdown */}
        <select
          value={facility.status}
          onChange={e => updateStatus(e.target.value)}
          disabled={updatingStatus}
          className={`text-xs px-3 py-1.5 border rounded-lg ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} disabled:opacity-40`}
        >
          {FACILITY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Sub-tab bar */}
      <div className={`flex gap-1 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        {([
          ['overview', 'Overview'],
          ['creative', 'Creative'],
          ['assets', 'Assets'],
          ['ad-preview', 'Ad Preview'],
          ['tiktok', 'TikTok'],
          ['video', 'Video AI'],
          ['landing-pages', 'Landing Pages'],
          ['utm-links', 'UTM Links'],
          ['publish', 'Publish'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              subTab === id
                ? `border-emerald-600 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`
                : `border-transparent ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === 'overview' && (
        <div className={`border rounded-xl ${card}`}>
          <div className="p-5 space-y-5">
            {/* Contact + facility info + Google */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-sm">
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-2`}>Contact</p>
                <div className="space-y-1">
                  <p className={text}>{facility.contact_name}</p>
                  <p className={`flex items-center gap-1.5 ${sub}`}><Mail size={13} />{facility.contact_email}</p>
                  <p className={`flex items-center gap-1.5 ${sub}`}><Phone size={13} />{facility.contact_phone}</p>
                </div>
              </div>
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-2`}>Facility Info</p>
                <div className="space-y-1">
                  <p className={text}>Occupancy: {facility.occupancy_range}</p>
                  <p className={text}>Units: {facility.total_units}</p>
                  <p className={text}>Issue: {facility.biggest_issue}</p>
                </div>
              </div>
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-2`}>Google Data</p>
                {facility.google_address ? (
                  <div className="space-y-1">
                    <p className={sub}>{facility.google_address}</p>
                    <div className="flex gap-2">
                      {facility.website && <a href={facility.website} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline text-xs">Website ↗</a>}
                      {facility.google_maps_url && <a href={facility.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline text-xs">Maps ↗</a>}
                    </div>
                  </div>
                ) : <p className={sub}>Not scraped yet</p>}
              </div>
            </div>

            {/* Notes */}
            {facility.notes && (
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-1`}>Notes</p>
                <p className={`text-sm ${text}`}>{facility.notes}</p>
              </div>
            )}

            {/* Photos */}
            {facility.photos && facility.photos.length > 0 && (
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-2`}>Photos</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {facility.photos.map(photo => (
                    <img key={photo.index} src={photo.url} alt="" className="h-24 w-36 object-cover rounded-lg shrink-0" />
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {facility.reviews && facility.reviews.length > 0 && (
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-2`}>Top Reviews</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {facility.reviews.map((r, i) => (
                    <div key={i} className={`text-sm p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-amber-500">{'★'.repeat(r.rating)}</span>
                        <span className={`font-medium ${text}`}>{r.author}</span>
                        <span className={`text-xs ${sub}`}>{r.time}</span>
                      </div>
                      <p className={sub}>{r.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className={`text-xs ${sub}`}>Added {new Date(facility.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      {subTab === 'creative' && (
        <CreativeTab facility={facility} adminKey={adminKey} darkMode={darkMode} />
      )}

      {subTab === 'assets' && (
        <AssetsTab facility={facility} adminKey={adminKey} darkMode={darkMode} />
      )}

      {subTab === 'ad-preview' && (
        <AdPreviewTab facility={facility} adminKey={adminKey} darkMode={darkMode} onPublish={() => setSubTab('publish')} />
      )}

      {subTab === 'landing-pages' && (
        <LandingPagesTab facility={facility} adminKey={adminKey} darkMode={darkMode} />
      )}

      {subTab === 'utm-links' && (
        <UTMLinksTab facility={facility} adminKey={adminKey} darkMode={darkMode} />
      )}

      {subTab === 'tiktok' && (
        <TikTokCreator facility={facility} adminKey={adminKey} darkMode={darkMode} />
      )}

      {subTab === 'video' && (
        <VideoGenerator facility={facility} adminKey={adminKey} darkMode={darkMode} onPublish={() => setSubTab('publish')} />
      )}

      {subTab === 'publish' && (
        <PublishTab facility={facility} adminKey={adminKey} darkMode={darkMode} />
      )}
    </div>
  )
}

export default function FacilitiesView({ adminKey, darkMode }: { adminKey: string; darkMode: boolean }) {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'

  useEffect(() => {
    fetch('/api/admin-facilities', { headers: { 'X-Admin-Key': adminKey } })
      .then(r => r.json())
      .then(data => {
        if (data.facilities) setFacilities(data.facilities)
        else setError(data.error || 'Failed to load facilities')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [adminKey])

  function handleStatusChange(id: string, status: string) {
    setFacilities(prev => prev.map(f => f.id === id ? { ...f, status } : f))
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-emerald-500" /></div>
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>
  if (facilities.length === 0) return <div className="text-center py-20 text-slate-400">No facilities yet. Submit an audit request to get started.</div>

  // Detail view
  const selected = facilities.find(f => f.id === selectedId)
  if (selected) {
    return (
      <FacilityDetail
        facility={selected}
        adminKey={adminKey}
        darkMode={darkMode}
        onBack={() => setSelectedId(null)}
        onStatusChange={handleStatusChange}
      />
    )
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className={`text-lg font-semibold ${text}`}>Facilities <span className={`text-sm font-normal ${sub}`}>({facilities.length})</span></h2>
      </div>

      {/* Summary table */}
      <div className={`border rounded-xl overflow-hidden ${card}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className={darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
              <th className={`text-left px-4 py-3 font-medium ${sub}`}>Facility</th>
              <th className={`text-left px-4 py-3 font-medium ${sub} hidden sm:table-cell`}>Location</th>
              <th className={`text-left px-4 py-3 font-medium ${sub}`}>Status</th>
              <th className={`text-left px-4 py-3 font-medium ${sub} hidden md:table-cell`}>Rating</th>
              <th className={`text-left px-4 py-3 font-medium ${sub} hidden lg:table-cell`}>Occupancy</th>
              <th className={`text-left px-4 py-3 font-medium ${sub} hidden lg:table-cell`}>Units</th>
              <th className={`text-right px-4 py-3 font-medium ${sub}`}></th>
            </tr>
          </thead>
          <tbody>
            {facilities.map(f => (
              <tr
                key={f.id}
                onClick={() => setSelectedId(f.id)}
                className={`border-t cursor-pointer transition-colors ${
                  darkMode ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-100 hover:bg-slate-50'
                }`}
              >
                <td className={`px-4 py-3 font-medium ${text}`}>{f.name}</td>
                <td className={`px-4 py-3 ${sub} hidden sm:table-cell`}>{f.location}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${STATUS_COLORS[f.status] || 'bg-slate-100 text-slate-600'}`}>
                    {f.status}
                  </span>
                </td>
                <td className={`px-4 py-3 hidden md:table-cell ${f.google_rating ? 'text-amber-500 font-semibold' : sub}`}>
                  {f.google_rating ? `★ ${f.google_rating}` : '—'}
                </td>
                <td className={`px-4 py-3 ${sub} hidden lg:table-cell`}>{f.occupancy_range || '—'}</td>
                <td className={`px-4 py-3 ${sub} hidden lg:table-cell`}>{f.total_units || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <ChevronRight size={16} className={sub} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
