import { useState, useEffect } from 'react'
import Website from './views/Website'
import Dashboard from './views/Dashboard'
import MetaAdsGuide from './views/MetaAdsGuide'
import Library from './views/Library'
import ClientLogin from './views/ClientLogin'
import ClientPortal from './views/ClientPortal'
import FacilityDiagnostic from './views/FacilityDiagnostic'
import Chatbot from './components/Chatbot'
import { LayoutDashboard, Globe, BookOpen, Library as LibraryIcon, LogIn, ClipboardCheck } from 'lucide-react'

export default function App() {
  const [view, setView] = useState('website')
  const [clientLoggedIn, setClientLoggedIn] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('stowstack_client')
    if (stored) setClientLoggedIn(true)
  }, [])

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
      {/* Floating view toggle */}
      <div className="fixed top-4 right-4 z-[100] flex glass-dark rounded-xl shadow-2xl overflow-hidden">
        {[
          { id: 'website', label: 'Site', icon: Globe },
          { id: 'library', label: 'Library', icon: BookOpen },
          { id: 'guide', label: 'Guide', icon: BookOpen },
          { id: 'login', label: 'Login', icon: LogIn },
          { id: 'diagnostic', label: 'Audit', icon: ClipboardCheck },
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all cursor-pointer ${
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
