import { useState, useEffect, useCallback } from 'react'
import Website from './views/Website'
import Dashboard from './views/Dashboard'
import MetaAdsGuide from './views/MetaAdsGuide'
import Library from './views/Library'
import ClientLogin from './views/ClientLogin'
import ClientPortal from './views/ClientPortal'
import FacilityDiagnostic from './views/FacilityDiagnostic'
import SharedAudit from './views/SharedAudit'
import AdminDashboard from './views/AdminDashboard'
import PMSUpload from './views/PMSUpload'
import CreativeStudio from './views/CreativeStudio'
import Chatbot from './components/Chatbot'
import { LayoutDashboard, Globe, BookOpen, Library as LibraryIcon, LogIn, ClipboardCheck, Shield, Upload, Paintbrush } from 'lucide-react'

const SECRET_CODE = 'stack'

// Check if the URL is a shared audit link: /audit/:slug
// or PMS upload portal: /upload
function getInitialRoute() {
  const path = window.location.pathname
  const auditMatch = path.match(/^\/audit\/([a-z0-9-]+)$/i)
  if (auditMatch) return { type: 'audit', slug: auditMatch[1] }
  if (path === '/upload') return { type: 'pms-upload' }
  return null
}

export default function App() {
  const [initialRoute] = useState(getInitialRoute)
  const [view, setView] = useState('website')
  const [clientLoggedIn, setClientLoggedIn] = useState(false)
  const [devMode, setDevMode] = useState(() => localStorage.getItem('stowstack_dev') === '1')

  useEffect(() => {
    const stored = localStorage.getItem('stowstack_client')
    if (stored) setClientLoggedIn(true)
  }, [])

  // Secret keyboard sequence: type "stack" anywhere to toggle dev nav
  useEffect(() => {
    let buffer = ''
    let timer = null
    function handleKey(e) {
      buffer += e.key.toLowerCase()
      clearTimeout(timer)
      timer = setTimeout(() => { buffer = '' }, 1500)
      if (buffer.includes(SECRET_CODE)) {
        buffer = ''
        setDevMode(prev => {
          const next = !prev
          if (next) {
            localStorage.setItem('stowstack_dev', '1')
          } else {
            localStorage.removeItem('stowstack_dev')
          }
          return next
        })
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      clearTimeout(timer)
    }
  }, [])

  /* Shared audit link — takes over the entire page */
  if (initialRoute?.type === 'audit') {
    return <SharedAudit slug={initialRoute.slug} />
  }

  /* Direct PMS upload link */
  if (initialRoute?.type === 'pms-upload') {
    return <PMSUpload onBack={() => { window.location.href = '/' }} />
  }

  /* Full-screen views that manage their own navigation */
  if (view === 'guide') {
    return (
      <>
        <MetaAdsGuide onBack={() => setView('website')} />
        <Chatbot />
      </>
    )
  }

  if (view === 'library') {
    return (
      <>
        <Library onBack={() => setView('website')} />
        <Chatbot />
      </>
    )
  }

  if (view === 'diagnostic') {
    return (
      <>
        <FacilityDiagnostic onBack={() => setView('website')} />
        <Chatbot />
      </>
    )
  }

  if (view === 'studio') {
    return (
      <>
        <CreativeStudio onBack={() => setView('website')} />
        <Chatbot />
      </>
    )
  }

  if (view === 'admin') {
    return <AdminDashboard onBack={() => setView('website')} />
  }

  if (view === 'pms-upload') {
    return <PMSUpload onBack={() => setView('website')} />
  }

  if (view === 'login') {
    if (clientLoggedIn) {
      return (
        <>
          <ClientPortal onLogout={() => {
            localStorage.removeItem('stowstack_client')
            setClientLoggedIn(false)
            setView('website')
          }} />
          <Chatbot />
        </>
      )
    }
    return (
      <>
        <ClientLogin
          onLogin={() => { setClientLoggedIn(true) }}
          onBack={() => setView('website')}
        />
        <Chatbot />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Floating view toggle — internal tools only visible in dev mode (type "stack" to toggle) */}
      <div className="fixed top-4 right-4 z-[100] flex flex-wrap justify-end gap-0 glass-dark rounded-xl shadow-2xl overflow-hidden max-w-[calc(100vw-2rem)]">
        {[
          { id: 'website', label: 'Site', icon: Globe },
          { id: 'library', label: 'Library', icon: BookOpen },
          { id: 'guide', label: 'Guide', icon: BookOpen },
          { id: 'login', label: 'Login', icon: LogIn },
          ...(devMode ? [
            { id: 'studio', label: 'Studio', icon: Paintbrush },
            { id: 'diagnostic', label: 'Audit', icon: ClipboardCheck },
            { id: 'pms-upload', label: 'PMS', icon: Upload },
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'admin', label: 'Admin', icon: Shield },
          ] : []),
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`flex items-center gap-1 px-2.5 sm:px-4 py-2 text-[11px] sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              view === v.id
                ? 'bg-brand-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <v.icon size={14} />
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        ))}
      </div>

      {view === 'website' ? <Website onNavigate={setView} /> : <Dashboard />}
      <Chatbot />
    </div>
  )
}
