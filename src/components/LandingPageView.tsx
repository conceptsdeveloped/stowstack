import { useState, useEffect, useCallback } from 'react'
import {
  Phone, Mail, MapPin, Check, Star, ChevronDown, ChevronUp,
  Shield, Clock, Truck, ArrowRight, Building2, ExternalLink, X
} from 'lucide-react'
import { usePartialCapture } from '../hooks/usePartialCapture'
import { initPageTracker, destroyPageTracker } from '../utils/page-tracker'
import ConsentBanner from './ConsentBanner'

/* ═══════════════════════════════════════════════════════ */
/*  TYPES                                                   */
/* ═══════════════════════════════════════════════════════ */

interface SectionConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

interface Section {
  id: string
  section_type: string
  sort_order: number
  config: SectionConfig
}

interface LandingPage {
  id: string
  facility_id: string
  slug: string
  title: string
  status: string
  meta_title?: string
  meta_description?: string
  og_image_url?: string
  theme?: { primaryColor?: string; accentColor?: string; darkHero?: boolean }
  storedge_widget_url?: string
  sections: Section[]
}

/* ═══════════════════════════════════════════════════════ */
/*  SECTION RENDERERS                                       */
/* ═══════════════════════════════════════════════════════ */

export function HeroSection({ config, theme }: { config: SectionConfig; theme?: ThemeConfig }) {
  const isDark = config.style !== 'light'
  const pc = theme?.primaryColor
  return (
    <section
      className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(to bottom, #020617, #0f172a, #022c22)'
          : 'linear-gradient(to bottom, #f8fafc, #ffffff)',
      }}
    >
      {isDark && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-pulse" style={{ background: 'rgba(16,185,129,0.1)' }} />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(99,102,241,0.05)' }} />
        </div>
      )}

      {config.backgroundImage && (
        <div className="absolute inset-0">
          <img src={config.backgroundImage} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 to-slate-950/95" />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-5 relative">
        <div className="max-w-3xl mx-auto text-center">
          {config.badgeText && (
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6 ${
              isDark
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            }`}>
              {config.badgeText}
            </div>
          )}

          <h1 className={`text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.08] mb-6 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            {config.headline || 'Your Storage Solution'}
          </h1>

          {config.subheadline && (
            <p className={`text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-8 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {config.subheadline}
            </p>
          )}

          {config.ctaText && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={config.ctaUrl || '#cta'}
                className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-semibold text-white shadow-lg transition-all ${pc ? '' : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-emerald-600/25'}`}
                style={pc ? { background: pc, boxShadow: `0 10px 15px -3px ${pc}40` } : undefined}
              >
                {config.ctaText}
                <ArrowRight size={16} />
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export function TrustBarSection({ config, theme }: { config: SectionConfig; theme?: ThemeConfig }) {
  const items = config.items || []
  if (items.length === 0) return null

  return (
    <section className={`py-6 ${theme?.primaryColor ? '' : 'bg-emerald-600'}`} style={theme?.primaryColor ? { background: theme.primaryColor } : undefined}>
      <div className="max-w-5xl mx-auto px-5">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {items.map((item: { icon?: string; text: string }, i: number) => (
            <div key={i} className="flex items-center gap-2 text-white/90 text-sm font-medium">
              {item.icon === 'star' && <Star size={14} className="text-yellow-300" />}
              {item.icon === 'shield' && <Shield size={14} />}
              {item.icon === 'clock' && <Clock size={14} />}
              {item.icon === 'check' && <Check size={14} />}
              {item.icon === 'truck' && <Truck size={14} />}
              {item.icon === 'building' && <Building2 size={14} />}
              {(!item.icon || !['star', 'shield', 'clock', 'check', 'truck', 'building'].includes(item.icon)) && <Check size={14} />}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FeaturesSection({ config, theme }: { config: SectionConfig; theme?: ThemeConfig }) {
  const items = config.items || []
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-5xl mx-auto px-5">
        {config.headline && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">{config.headline}</h2>
            {config.subheadline && <p className="text-lg text-slate-500 mt-3 max-w-2xl mx-auto">{config.subheadline}</p>}
          </div>
        )}
        <div className={`grid gap-6 ${items.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
          {items.map((item: { icon?: string; title: string; desc: string }, i: number) => (
            <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${theme?.primaryColor ? '' : 'bg-emerald-100 text-emerald-600'}`} style={theme?.primaryColor ? { background: `${theme.primaryColor}20`, color: theme.primaryColor } : undefined}>
                {item.icon === 'shield' ? <Shield size={20} /> :
                 item.icon === 'clock' ? <Clock size={20} /> :
                 item.icon === 'truck' ? <Truck size={20} /> :
                 item.icon === 'star' ? <Star size={20} /> :
                 item.icon === 'building' ? <Building2 size={20} /> :
                 <Check size={20} />}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function UnitTypesSection({ config, theme }: { config: SectionConfig; theme?: ThemeConfig }) {
  const units = config.units || []
  return (
    <section className="py-16 md:py-24 bg-slate-50">
      <div className="max-w-5xl mx-auto px-5">
        {config.headline && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">{config.headline}</h2>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((unit: { name: string; size?: string; price?: string; features?: string[] }, i: number) => (
            <div key={i} className="p-6 rounded-2xl bg-white border border-slate-200 hover:shadow-md transition-all" style={theme?.primaryColor ? { ['--hover-border' as string]: theme.primaryColor } : undefined}>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">{unit.name}</h3>
              {unit.size && <p className="text-sm text-slate-500 mb-3">{unit.size}</p>}
              {unit.price && (
                <p className={`text-2xl font-bold mb-4 ${theme?.primaryColor ? '' : 'text-emerald-600'}`} style={theme?.primaryColor ? { color: theme.primaryColor } : undefined}>
                  {unit.price}<span className="text-sm font-normal text-slate-400">/mo</span>
                </p>
              )}
              {unit.features && unit.features.length > 0 && (
                <ul className="space-y-2">
                  {unit.features.map((f: string, j: number) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-600">
                      <Check size={14} className={`shrink-0 ${theme?.primaryColor ? '' : 'text-emerald-500'}`} style={theme?.primaryColor ? { color: theme.primaryColor } : undefined} /> {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function GallerySection({ config }: { config: SectionConfig }) {
  const images = config.images || []
  if (images.length === 0) return null

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-5xl mx-auto px-5">
        {config.headline && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">{config.headline}</h2>
          </div>
        )}
        <div className={`grid gap-3 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
          {images.map((img: { url: string; alt?: string }, i: number) => (
            <div key={i} className={`rounded-xl overflow-hidden ${i === 0 && images.length > 2 ? 'col-span-2 row-span-2' : ''}`}>
              <img src={img.url} alt={img.alt || 'Facility photo'} className="w-full h-full object-cover" style={{ minHeight: 200 }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function TestimonialsSection({ config, theme }: { config: SectionConfig; theme?: ThemeConfig }) {
  const items = config.items || []
  return (
    <section className="py-16 md:py-24 bg-slate-50">
      <div className="max-w-5xl mx-auto px-5">
        {config.headline && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">{config.headline}</h2>
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item: { name: string; role?: string; text: string; metric?: string }, i: number) => (
            <div key={i} className="p-6 rounded-2xl bg-white border border-slate-200">
              <div className="flex items-center gap-1 mb-3">
                {[1,2,3,4,5].map(s => <Star key={s} size={14} className="text-yellow-400 fill-yellow-400" />)}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">"{item.text}"</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                  {item.role && <p className="text-xs text-slate-400">{item.role}</p>}
                </div>
                {item.metric && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${theme?.primaryColor ? '' : 'text-emerald-600 bg-emerald-50'}`} style={theme?.primaryColor ? { color: theme.primaryColor, background: `${theme.primaryColor}15` } : undefined}>
                    {item.metric}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FAQSection({ config }: { config: SectionConfig }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const items = config.items || []

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-3xl mx-auto px-5">
        {config.headline && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">{config.headline}</h2>
          </div>
        )}
        <div className="space-y-3">
          {items.map((item: { q: string; a: string }, i: number) => (
            <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-semibold text-slate-900 pr-4">{item.q}</span>
                {openIdx === i ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
              </button>
              {openIdx === i && (
                <div className="px-5 pb-5">
                  <p className="text-sm text-slate-500 leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function CTASection({ config, theme, widgetUrl }: { config: SectionConfig; theme?: ThemeConfig; widgetUrl?: string }) {
  const isGradient = config.style !== 'simple'
  return (
    <section
      id="cta"
      className={`py-16 md:py-24 ${isGradient ? 'text-white' : ''}`}
      style={isGradient ? { background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #022c22 100%)' } : {}}
    >
      <div className="max-w-4xl mx-auto px-5 text-center">
        <h2 className={`text-3xl md:text-4xl font-bold tracking-tight mb-5 ${isGradient ? 'text-white' : 'text-slate-900'}`}>
          {config.headline || 'Ready to Get Started?'}
        </h2>
        {config.subheadline && (
          <p className={`text-lg leading-relaxed max-w-2xl mx-auto mb-8 ${isGradient ? 'text-white/60' : 'text-slate-500'}`}>
            {config.subheadline}
          </p>
        )}

        {/* storEDGE reservation widget */}
        {widgetUrl && (
          <div className="max-w-2xl mx-auto mb-8 rounded-2xl overflow-hidden shadow-xl">
            <iframe
              src={widgetUrl}
              title="Reserve your unit"
              className="w-full border-0"
              style={{ minHeight: 520 }}
              allow="payment"
              loading="lazy"
            />
          </div>
        )}

        {!widgetUrl && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            {config.ctaText && (
              <a
                href={config.ctaUrl || '#'}
                className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-semibold text-white shadow-lg transition-all ${theme?.primaryColor ? '' : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-emerald-600/25'}`}
                style={theme?.primaryColor ? { background: theme.primaryColor, boxShadow: `0 10px 15px -3px ${theme.primaryColor}40` } : undefined}
              >
                {config.ctaText}
                <ArrowRight size={16} />
              </a>
            )}
            {config.phone && (
              <a
                href={`tel:${config.phone.replace(/[^+\d]/g, '')}`}
                className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-base font-medium border transition-colors ${
                  isGradient
                    ? 'border-white/20 text-white hover:bg-white/10'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Phone size={16} /> {config.phone}
              </a>
            )}
          </div>
        )}

        {config.email && (
          <a href={`mailto:${config.email}`} className={`inline-flex items-center gap-2 text-sm ${isGradient ? 'text-white/40 hover:text-white/70' : 'text-slate-400 hover:text-slate-600'} transition-colors`}>
            <Mail size={14} /> {config.email}
          </a>
        )}
      </div>
    </section>
  )
}

export function LocationMapSection({ config, theme }: { config: SectionConfig; theme?: ThemeConfig }) {
  return (
    <section className="py-16 md:py-24 bg-slate-50">
      <div className="max-w-5xl mx-auto px-5">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            {config.headline && (
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">{config.headline}</h2>
            )}
            {config.address && (
              <div className="flex items-start gap-3 mb-4">
                <MapPin size={18} className={`shrink-0 mt-0.5 ${theme?.primaryColor ? '' : 'text-emerald-600'}`} style={theme?.primaryColor ? { color: theme.primaryColor } : undefined} />
                <p className="text-slate-600">{config.address}</p>
              </div>
            )}
            {config.directions && (
              <p className="text-sm text-slate-500 leading-relaxed mb-4">{config.directions}</p>
            )}
            {config.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 text-sm font-medium ${theme?.primaryColor ? '' : 'text-emerald-600 hover:text-emerald-700'}`}
                style={theme?.primaryColor ? { color: theme.primaryColor } : undefined}
              >
                Get Directions <ExternalLink size={14} />
              </a>
            )}
          </div>
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-200 min-h-[300px]">
            {config.googleMapsEmbed ? (
              <iframe
                src={config.googleMapsEmbed}
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Facility location"
              />
            ) : config.address ? (
              <iframe
                src={`https://www.google.com/maps?q=${encodeURIComponent(config.address)}&output=embed`}
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                title="Facility location"
              />
            ) : (
              <div className="w-full h-[300px] flex items-center justify-center text-slate-400 text-sm">
                <MapPin size={32} className="text-slate-300" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  STOREDGE EMBED SECTION                                   */
/* ═══════════════════════════════════════════════════════ */

export function StorEdgeEmbedSection({ config, theme, widgetUrl }: { config: SectionConfig; theme?: ThemeConfig; widgetUrl?: string }) {
  const [iframeLoaded, setIframeLoaded] = useState(false)

  // Build storEDGE URL with UTM passthrough
  const buildWidgetUrl = () => {
    const base = widgetUrl || config.widgetUrl
    if (!base) return null
    try {
      const url = new URL(base)
      const params = new URLSearchParams(window.location.search)
      const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
      utmKeys.forEach(key => {
        const val = params.get(key)
        if (val) url.searchParams.set(key, val)
      })
      return url.toString()
    } catch {
      return base
    }
  }

  const finalUrl = buildWidgetUrl()

  return (
    <section id="reserve" className="py-16 md:py-24 bg-white">
      <div className="max-w-4xl mx-auto px-5">
        {config.headline && (
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">{config.headline}</h2>
            {config.subheadline && <p className="text-lg text-slate-500 mt-3 max-w-2xl mx-auto">{config.subheadline}</p>}
          </div>
        )}

        {finalUrl ? (
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
            {!iframeLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Loading available units...</p>
                </div>
              </div>
            )}
            <iframe
              src={finalUrl}
              title="Reserve your unit"
              className="w-full border-0"
              style={{ minHeight: 800 }}
              allow="payment"
              loading="lazy"
              onLoad={() => setIframeLoaded(true)}
            />
          </div>
        ) : (
          <div className="text-center p-12 rounded-2xl bg-slate-50 border border-slate-200">
            <Phone size={32} className={`mx-auto mb-4 ${theme?.primaryColor ? '' : 'text-emerald-600'}`} style={theme?.primaryColor ? { color: theme.primaryColor } : undefined} />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Call to Reserve Your Unit</h3>
            <p className="text-slate-500 mb-4">Speak with our team to find the right unit for you.</p>
            {config.phone && (
              <a
                href={`tel:${config.phone.replace(/[^+\d]/g, '')}`}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg font-semibold text-white ${theme?.primaryColor ? '' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                style={theme?.primaryColor ? { background: theme.primaryColor } : undefined}
              >
                <Phone size={18} /> {config.phone}
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  LEAD CAPTURE FORM SECTION                               */
/* ═══════════════════════════════════════════════════════ */

export function LeadCaptureFormSection({ config, theme, facilityId, landingPageId }: { config: SectionConfig; theme?: ThemeConfig; facilityId?: string; landingPageId?: string }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', unitSize: '', timeline: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const pc = theme?.primaryColor || '#16a34a'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Please fill in name, email, and phone.')
      return
    }
    setSubmitting(true)
    setError('')

    try {
      // Save to partial_leads with full UTM data
      const sessionId = sessionStorage.getItem('stowstack_session_id') || `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
      const params = new URLSearchParams(window.location.search)

      const res = await fetch('/api/lead-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          unitSize: form.unitSize,
          timeline: form.timeline,
          facilityId,
          landingPageId,
          sessionId,
          utmSource: params.get('utm_source') || undefined,
          utmMedium: params.get('utm_medium') || undefined,
          utmCampaign: params.get('utm_campaign') || undefined,
          utmContent: params.get('utm_content') || undefined,
          referrer: document.referrer || undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to submit')

      // Fire Lead event to pixels
      if (typeof window !== 'undefined') {
        if ((window as any).fbq) (window as any).fbq('track', 'Lead', { content_name: 'lead_capture_form', content_category: 'storage' })
        if ((window as any).gtag) (window as any).gtag('event', 'generate_lead', { event_category: 'engagement', event_label: 'lead_capture_form' })
      }

      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again or call us.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <section id="lead-form" className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-lg mx-auto px-5 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: `${pc}20` }}>
            <Check size={32} style={{ color: pc }} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Got it — we'll be in touch.</h3>
          <p className="text-slate-500">Check your email for next steps. If you need a unit today, scroll down to reserve online or call us directly.</p>
        </div>
      </section>
    )
  }

  return (
    <section id="lead-form" className="py-16 md:py-24 bg-slate-50">
      <div className="max-w-lg mx-auto px-5">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{config.headline || 'Check Availability'}</h2>
          {config.subheadline && <p className="text-slate-500 mt-2">{config.subheadline}</p>}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ ['--tw-ring-color' as string]: `${pc}40` }}
              placeholder="Your full name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ ['--tw-ring-color' as string]: `${pc}40` }}
              placeholder="your@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ ['--tw-ring-color' as string]: `${pc}40` }}
              placeholder="(555) 123-4567"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Unit size needed</label>
            <select
              value={form.unitSize}
              onChange={e => setForm({ ...form, unitSize: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-white"
              style={{ ['--tw-ring-color' as string]: `${pc}40` }}
            >
              <option value="">Select a size...</option>
              <option value="5x5">5x5 (Closet)</option>
              <option value="5x10">5x10 (Half Garage)</option>
              <option value="10x10">10x10 (Full Garage)</option>
              <option value="10x15">10x15 (Large)</option>
              <option value="10x20">10x20 (Extra Large)</option>
              <option value="10x30">10x30 (Oversized)</option>
              <option value="other">Other / Not Sure</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Move-in timeline</label>
            <select
              value={form.timeline}
              onChange={e => setForm({ ...form, timeline: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-white"
              style={{ ['--tw-ring-color' as string]: `${pc}40` }}
            >
              <option value="">When do you need it?</option>
              <option value="this-week">This week</option>
              <option value="within-2-weeks">Within 2 weeks</option>
              <option value="within-a-month">Within a month</option>
              <option value="just-exploring">Just exploring</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: pc }}
          >
            {submitting ? 'Sending...' : config.ctaText || 'Check Availability'}
          </button>

          <p className="text-xs text-slate-400 text-center">No spam. Your info is only used to help you find the right unit.</p>
        </form>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  SECTION ROUTER                                          */
/* ═══════════════════════════════════════════════════════ */

interface ThemeConfig {
  primaryColor?: string
  accentColor?: string
}

export function RenderSection({ section, theme, widgetUrl, trackingPhone, facilityId, landingPageId }: { section: Section; theme?: ThemeConfig; widgetUrl?: string; trackingPhone?: string | null; facilityId?: string; landingPageId?: string }) {
  const { section_type, config } = section
  // If a tracking phone is provisioned for this landing page, swap it into phone fields
  const effectiveConfig = trackingPhone && config.phone ? { ...config, phone: trackingPhone } : config
  switch (section_type) {
    case 'hero': return <HeroSection config={effectiveConfig} theme={theme} />
    case 'trust_bar': return <TrustBarSection config={config} theme={theme} />
    case 'features': return <FeaturesSection config={config} theme={theme} />
    case 'unit_types': return <UnitTypesSection config={config} theme={theme} />
    case 'gallery': return <GallerySection config={config} />
    case 'testimonials': return <TestimonialsSection config={config} theme={theme} />
    case 'faq': return <FAQSection config={config} />
    case 'cta': return <CTASection config={effectiveConfig} theme={theme} widgetUrl={widgetUrl} />
    case 'location_map': return <LocationMapSection config={config} theme={theme} />
    case 'storedge_embed': return <StorEdgeEmbedSection config={config} theme={theme} widgetUrl={widgetUrl} />
    case 'lead_capture': return <LeadCaptureFormSection config={config} theme={theme} facilityId={facilityId} landingPageId={landingPageId} />
    default: return null
  }
}

/* ═══════════════════════════════════════════════════════ */
/*  LANDING PAGE SHELL                                      */
/* ═══════════════════════════════════════════════════════ */

interface OrgBranding {
  orgName?: string
  logoUrl?: string | null
  primaryColor?: string
  accentColor?: string
  whiteLabel?: boolean
}

function LandingPageNav({ facilityName, theme, orgBranding }: { facilityName?: string; theme?: ThemeConfig; orgBranding?: OrgBranding | null }) {
  const pc = theme?.primaryColor || orgBranding?.primaryColor
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {orgBranding?.logoUrl && (
            <img src={orgBranding.logoUrl} alt={orgBranding.orgName || ''} className="h-6 object-contain" />
          )}
          <span className="text-sm font-bold text-slate-900">{facilityName || 'Self Storage'}</span>
        </div>
        <a
          href="#cta"
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white transition-colors ${pc ? '' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          style={pc ? { background: pc } : undefined}
        >
          Reserve Now
        </a>
      </div>
    </nav>
  )
}

function LandingPageFooter({ orgBranding }: { orgBranding?: OrgBranding | null }) {
  const hideStowStack = orgBranding?.whiteLabel
  return (
    <footer className="py-8 bg-slate-950 text-center">
      {hideStowStack ? (
        orgBranding?.orgName && (
          <p className="text-xs text-slate-500">{orgBranding.orgName}</p>
        )
      ) : (
        <p className="text-xs text-slate-500">
          Powered by <a href="https://stowstack.co" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400">StowStack</a> <span className="text-slate-600">by StorageAds.com</span>
        </p>
      )}
    </footer>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  EXIT INTENT POPUP                                        */
/* ═══════════════════════════════════════════════════════ */

function ExitIntentPopup({
  show,
  onDismiss,
  onSubmit,
  theme,
  facilityName,
}: {
  show: boolean
  onDismiss: () => void
  onSubmit: (email: string) => void
  theme?: ThemeConfig
  facilityName?: string
}) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (!show) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      onSubmit(email)
      setSubmitted(true)
    }
  }

  const pc = theme?.primaryColor || '#16a34a'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-up">
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="p-6 pt-8 text-center" style={{ background: `linear-gradient(135deg, ${pc}10, ${pc}05)` }}>
          {submitted ? (
            <>
              <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: `${pc}20` }}>
                <Check size={24} style={{ color: pc }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">You're all set!</h3>
              <p className="text-sm text-slate-500">We'll send you availability updates{facilityName ? ` for ${facilityName}` : ''}. Check your inbox.</p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Wait — don't lose your spot!</h3>
              <p className="text-sm text-slate-500 mb-5">
                Enter your email and we'll save your progress. Plus, we'll let you know if availability changes{facilityName ? ` at ${facilityName}` : ''}.
              </p>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ ['--tw-ring-color' as string]: `${pc}40` }}
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: pc }}
                >
                  Save My Spot
                </button>
              </form>
              <p className="text-xs text-slate-400 mt-3">No spam. Unsubscribe anytime.</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  MAIN VIEW COMPONENT                                     */
/* ═══════════════════════════════════════════════════════ */

export default function LandingPageView({ slug }: { slug: string }) {
  const [page, setPage] = useState<LandingPage | null>(null)
  const [trackingPhone, setTrackingPhone] = useState<string | null>(null)
  const [orgBranding, setOrgBranding] = useState<OrgBranding | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showExitPopup, setShowExitPopup] = useState(false)

  // Partial capture hook — tracks scroll, time, exit intent
  const { onFieldBlur } = usePartialCapture({
    landingPageId: page?.id,
    facilityId: page?.facility_id,
    enabled: !!page,
  })

  // Exit intent handler
  useEffect(() => {
    if (!page || sessionStorage.getItem('stowstack_exit_dismissed')) return

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !showExitPopup) {
        setShowExitPopup(true)
      }
    }
    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [page, showExitPopup])

  const handleExitDismiss = useCallback(() => {
    setShowExitPopup(false)
    sessionStorage.setItem('stowstack_exit_dismissed', '1')
  }, [])

  const handleExitSubmit = useCallback((email: string) => {
    onFieldBlur('email', email)

    // Convert partial lead to full consumer lead for attribution
    const sessionId = sessionStorage.getItem('stowstack_session_id')
    if (sessionId && page) {
      fetch('/api/consumer-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          email,
          facilityId: page.facility_id,
          landingPageId: page.id,
          fbclid: sessionStorage.getItem('stowstack_fbclid') || undefined,
          gclid: sessionStorage.getItem('stowstack_gclid') || undefined,
        }),
        keepalive: true,
      }).catch(() => {})
    }

    // Auto-dismiss after 2 seconds
    setTimeout(() => {
      setShowExitPopup(false)
      sessionStorage.setItem('stowstack_exit_dismissed', '1')
    }, 2000)
  }, [onFieldBlur, page])

  useEffect(() => {
    async function fetchPage() {
      try {
        // Check if admin is logged in for preview access
        const adminKey = localStorage.getItem('stowstack_admin_key')
        const headers: Record<string, string> = {}
        if (adminKey) headers['X-Admin-Key'] = adminKey

        const res = await fetch(`/api/landing-pages?slug=${encodeURIComponent(slug)}`, { headers })
        if (res.status === 404) {
          setError('Page not found')
          return
        }
        if (!res.ok) throw new Error('Failed to load page')
        const data = await res.json()
        setPage(data.data)
        if (data.data?.orgBranding) setOrgBranding(data.data.orgBranding)

        // Fetch tracking number for this landing page (if one is provisioned)
        if (data.data?.id) {
          try {
            const tnRes = await fetch(`/api/call-tracking?landingPageId=${data.data.id}`)
            if (tnRes.ok) {
              const tnData = await tnRes.json()
              if (tnData.trackingPhone) setTrackingPhone(tnData.trackingPhone)
            }
          } catch { /* silent — fall back to default phone */ }
        }

        // Set SEO meta
        if (data.data.meta_title) document.title = data.data.meta_title
        else if (data.data.title) document.title = data.data.title

        const metaDesc = document.querySelector('meta[name="description"]')
        if (data.data.meta_description && metaDesc) {
          metaDesc.setAttribute('content', data.data.meta_description)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchPage()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-5">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Page Not Found</h1>
        <p className="text-slate-500 mb-6">This landing page doesn't exist or hasn't been published yet.</p>
        <a href="/" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Go to homepage</a>
      </div>
    )
  }

  // Extract facility name from hero section if available
  const heroSection = page.sections.find(s => s.section_type === 'hero')
  const facilityName = heroSection?.config?.facilityName

  // Fire page_view tracking on load
  useEffect(() => {
    if (!page) return
    if ((window as any).fbq) (window as any).fbq('track', 'PageView')
    if ((window as any).gtag) (window as any).gtag('event', 'page_view', { page_title: page.title, page_location: window.location.href })

    // Fire server-side CAPI
    const params = new URLSearchParams(window.location.search)
    fetch('/api/meta-capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'PageView',
        sourceUrl: window.location.href,
        fbclid: params.get('fbclid') || undefined,
        userAgent: navigator.userAgent,
      }),
      keepalive: true,
    }).catch(() => {})

    // Init page interaction tracker
    initPageTracker(page.id, page.facility_id)
    return () => { destroyPageTracker() }
  }, [page])

  // Get the phone number for mobile sticky bar
  const ctaSection = page?.sections.find(s => s.section_type === 'cta')
  const heroPhone = page?.sections.find(s => s.section_type === 'hero')?.config?.phone
  const displayPhone = trackingPhone || ctaSection?.config?.phone || heroPhone

  return (
    <div className="min-h-screen bg-white">
      <LandingPageNav facilityName={facilityName} theme={page.theme} orgBranding={orgBranding} />
      <main>
        {page.sections
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(section => (
            <RenderSection key={section.id} section={section} theme={page.theme} widgetUrl={page.storedge_widget_url} trackingPhone={trackingPhone} facilityId={page.facility_id} landingPageId={page.id} />
          ))
        }
      </main>
      <LandingPageFooter orgBranding={orgBranding} />

      {/* Mobile sticky phone bar */}
      {displayPhone && (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-slate-200 shadow-lg safe-area-bottom">
          <div className="flex items-center gap-3 px-4 py-3">
            <a
              href={`tel:${displayPhone.replace(/[^+\d]/g, '')}`}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: page.theme?.primaryColor || '#16a34a' }}
            >
              <Phone size={16} /> Call Now
            </a>
            <a
              href="#reserve"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700"
            >
              Reserve Online
            </a>
          </div>
        </div>
      )}

      {/* Exit Intent Popup — captures email before bounce */}
      <ExitIntentPopup
        show={showExitPopup}
        onDismiss={handleExitDismiss}
        onSubmit={handleExitSubmit}
        theme={page.theme}
        facilityName={facilityName}
      />
      <ConsentBanner />
    </div>
  )
}
