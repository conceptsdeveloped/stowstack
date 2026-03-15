import { useState, useEffect } from 'react'
import {
  Phone, MapPin, Star, Shield, Clock, Check, MapPinIcon, ArrowRight,
  AlertCircle, Zap
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════ */
/*  TYPES                                                   */
/* ═══════════════════════════════════════════════════════ */

export interface LandingPageTemplateProps {
  facilityName: string
  headline: string
  subheadline?: string
  offer?: {
    text: string
    details?: string
    expiry?: string
  }
  phone: string
  address: string
  city: string
  neighborhood?: string
  reviewCount?: number
  avgRating?: number
  features?: string[]
  urgencyText?: string
  storedgeWidgetUrl?: string
  primaryColor?: string
  utmParams?: Record<string, string>
}

/* ═══════════════════════════════════════════════════════ */
/*  UTILITY: UTM & PIXEL TRACKING                           */
/* ═══════════════════════════════════════════════════════ */

function getUTMParams(): Record<string, string> {
  const params: Record<string, string> = {}
  const searchParams = new URLSearchParams(window.location.search)
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
  utmKeys.forEach(key => {
    const value = searchParams.get(key)
    if (value) params[key] = value
  })
  return params
}

function buildReserveUrl(_phone: string, utmParams?: Record<string, string>): string {
  const params = new URLSearchParams()
  if (utmParams) {
    Object.entries(utmParams).forEach(([k, v]) => params.append(k, v))
  }
  const queryString = params.toString()
  return queryString ? `#reserve?${queryString}` : '#reserve'
}

/* ═══════════════════════════════════════════════════════ */
/*  COUNTDOWN TIMER (for aggressive template)              */
/* ═══════════════════════════════════════════════════════ */

function CountdownTimer({ expiryTime }: { expiryTime?: string }) {
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
    if (!expiryTime) return

    const updateTimer = () => {
      const expiryDate = new Date(expiryTime).getTime()
      const now = new Date().getTime()
      const diff = expiryDate - now

      if (diff <= 0) {
        setTimeLeft('Offer expired')
        return
      }

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((diff / (1000 * 60)) % 60)
      const seconds = Math.floor((diff / 1000) % 60)

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [expiryTime])

  if (!timeLeft) return null
  return <div className="text-sm font-semibold">{timeLeft}</div>
}

/* ═══════════════════════════════════════════════════════ */
/*  1. STANDARD TEMPLATE                                   */
/* ═══════════════════════════════════════════════════════ */

export function StandardTemplate(props: LandingPageTemplateProps) {
  const pc = props.primaryColor || '#10b981'
  const utmParams = getUTMParams()

  const ratingDisplay = props.avgRating
    ? `${props.avgRating.toFixed(1)} (${props.reviewCount || 0} reviews)`
    : `${props.reviewCount || 0} reviews`

  return (
    <div className="min-h-screen bg-white">
      {/* Pixel tracking comment - replace with actual pixel code */}
      {/* <!-- Facebook Pixel Code --> */}
      {/* <!-- Event: PageView --> */}

      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 px-5 bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-4xl mx-auto">
          {/* Trust Badge */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-sm font-medium text-slate-600">{ratingDisplay}</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 text-center mb-6 leading-tight">
            {props.headline}
          </h1>

          {/* Subheadline */}
          {props.subheadline && (
            <p className="text-lg text-slate-600 text-center mb-8 max-w-2xl mx-auto leading-relaxed">
              {props.subheadline}
            </p>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={buildReserveUrl(props.phone, utmParams)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white text-lg transition-all hover:shadow-lg"
              style={{ background: pc }}
            >
              Reserve Now
              <ArrowRight size={18} />
            </a>
            <a
              href={`tel:${props.phone.replace(/[^+\d]/g, '')}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold border-2 transition-all"
              style={{ borderColor: pc, color: pc }}
            >
              <Phone size={18} />
              {props.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-6 px-5" style={{ background: pc }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-white text-sm font-medium">
            <div className="flex items-center gap-2">
              <Shield size={16} />
              Climate Controlled
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} />
              24/7 Access
            </div>
            <div className="flex items-center gap-2">
              <Check size={16} />
              Secure Locks
            </div>
          </div>
        </div>
      </section>

      {/* StorEDGE Widget Placeholder */}
      {props.storedgeWidgetUrl && (
        <section className="py-16 md:py-24 px-5 bg-slate-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8 text-center">
              Check Availability & Reserve
            </h2>
            <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
              {/* Pixel: StorEDGE widget load event */}
              {/* <!-- Event: CustomEvent storage_widget_load --> */}
              <iframe
                src={props.storedgeWidgetUrl}
                className="w-full"
                style={{ minHeight: '600px', border: 'none' }}
                title="Reserve storage unit"
              />
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      {props.features && props.features.length > 0 && (
        <section className="py-16 md:py-24 px-5 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8">
              Why Choose {props.facilityName}?
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {props.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-lg border border-slate-200">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: pc }}>
                    <Check size={14} className="text-white" />
                  </div>
                  <p className="text-slate-700 font-medium">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Address Section */}
      <section className="py-16 md:py-24 px-5 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8">Location</h2>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div>
              <div className="flex items-start gap-4 mb-6">
                <MapPin size={24} style={{ color: pc }} className="flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 text-lg">{props.address}</p>
                  <p className="text-slate-600">{props.city}</p>
                </div>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(props.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-semibold transition-all"
                style={{ color: pc }}
              >
                Get Directions →
              </a>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-200 h-64">
              {/* Pixel: Map view event */}
              {/* <!-- Event: CustomEvent map_viewed --> */}
              <iframe
                src={`https://www.google.com/maps?q=${encodeURIComponent(props.address)}&output=embed`}
                className="w-full h-full border-0"
                allowFullScreen
                loading="lazy"
                title="Facility location map"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 px-5 text-white" style={{ background: `linear-gradient(135deg, ${pc}, ${pc}dd)` }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Reserve Your Unit?</h2>
          <p className="text-lg mb-8 opacity-90">
            Don't miss out. Check availability and reserve today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={buildReserveUrl(props.phone, utmParams)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold bg-white transition-all hover:shadow-lg"
              style={{ color: pc }}
            >
              Reserve Now
              <ArrowRight size={18} />
            </a>
            <a
              href={`tel:${props.phone.replace(/[^+\d]/g, '')}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold border-2 border-white text-white transition-all hover:bg-white/10"
            >
              <Phone size={18} />
              Call Now
            </a>
          </div>
        </div>
      </section>

      {/* Pixel: Conversion tracking base */}
      {/* <!-- Event: CustomEvent page_complete --> */}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  2. AGGRESSIVE TEMPLATE                                 */
/* ═══════════════════════════════════════════════════════ */

export function AggressiveTemplate(props: LandingPageTemplateProps) {
  const pc = props.primaryColor || '#ef4444' // Red for aggressive feel
  const utmParams = getUTMParams()

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Pixel: Aggressive variant tracking */}
      {/* <!-- Event: CustomEvent aggressive_template_loaded --> */}

      {/* Hero Section - Bold & Urgent */}
      <section className="relative pt-20 pb-12 md:pt-32 md:pb-20 px-5 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0" style={{
            background: `linear-gradient(135deg, ${pc}20 0%, ${pc}10 50%, transparent 100%)`
          }} />
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Urgency Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/50 mb-6 text-sm font-bold text-red-300">
            <Zap size={14} />
            LIMITED TIME OFFER
          </div>

          {/* Main Offer Display */}
          <div className="mb-8">
            {props.offer && (
              <div className="mb-8 p-8 rounded-2xl border-3" style={{ borderColor: pc, background: `${pc}15` }}>
                <p className="text-6xl sm:text-7xl font-black leading-tight mb-4" style={{ color: pc }}>
                  {props.offer.text}
                </p>
                {props.offer.details && (
                  <p className="text-xl text-slate-300 mb-4">{props.offer.details}</p>
                )}
                {props.offer.expiry && (
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <AlertCircle size={16} className="text-yellow-400" />
                    <span className="text-yellow-400">Expires: {props.offer.expiry}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 leading-tight">
            {props.headline}
          </h1>

          {/* Subheadline */}
          {props.subheadline && (
            <p className="text-lg sm:text-xl text-slate-300 mb-8 leading-relaxed">
              {props.subheadline}
            </p>
          )}

          {/* Urgency Text */}
          {props.urgencyText && (
            <p className="text-base font-semibold mb-8 p-4 rounded-lg" style={{ background: pc + '30', color: pc }}>
              {props.urgencyText}
            </p>
          )}

          {/* Primary CTA - Big & Bold */}
          <div className="mb-6">
            <a
              href={buildReserveUrl(props.phone, utmParams)}
              className="w-full sm:w-auto block text-center px-8 py-5 rounded-xl font-black text-lg text-white transition-all hover:scale-105 shadow-2xl"
              style={{ background: pc }}
              onClick={() => {
                // Pixel: CTA click event
              }}
            >
              RESERVE NOW - {props.offer?.text || 'LIMITED UNITS'}
            </a>
          </div>

          {/* Social Proof */}
          {props.reviewCount && (
            <div className="flex items-center justify-center gap-4 text-sm mb-8">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="font-semibold">{props.reviewCount} happy customers</span>
              </div>
            </div>
          )}

          {/* Call CTA */}
          <a
            href={`tel:${props.phone.replace(/[^+\d]/g, '')}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold border-2 border-white text-white transition-all hover:bg-white hover:text-black w-full sm:w-auto"
          >
            <Phone size={18} />
            CALL: {props.phone}
          </a>
        </div>
      </section>

      {/* Trust Signals - Compact */}
      <section className="py-8 px-5 bg-slate-900/50">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="font-black text-2xl" style={{ color: pc }}>24/7</p>
              <p className="text-slate-400 text-xs">Access</p>
            </div>
            <div>
              <p className="font-black text-2xl" style={{ color: pc }}>Secure</p>
              <p className="text-slate-400 text-xs">Climate Controlled</p>
            </div>
            <div>
              <p className="font-black text-2xl" style={{ color: pc }}>Move-In</p>
              <p className="text-slate-400 text-xs">Today</p>
            </div>
          </div>
        </div>
      </section>

      {/* Countdown Timer - If offer has expiry */}
      {props.offer?.expiry && (
        <section className="py-6 px-5" style={{ background: pc + '20', borderBottom: `2px solid ${pc}` }}>
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm font-semibold text-slate-300 mb-2">OFFER EXPIRES IN:</p>
            <CountdownTimer expiryTime={props.offer.expiry} />
          </div>
        </section>
      )}

      {/* Location Info */}
      <section className="py-12 px-5 bg-slate-900">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <MapPin size={24} style={{ color: pc }} />
            <div>
              <p className="font-bold text-lg">{props.address}</p>
              <p className="text-slate-400">{props.city}</p>
            </div>
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(props.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-bold transition-all"
            style={{ color: pc }}
          >
            Get Directions →
          </a>
        </div>
      </section>

      {/* Bottom CTA - Sticky Alternative */}
      <section className="py-8 px-5" style={{ background: pc }}>
        <div className="max-w-3xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-4">
            <a
              href={buildReserveUrl(props.phone, utmParams)}
              className="w-full py-4 rounded-lg font-bold text-center transition-all bg-white hover:shadow-lg"
              style={{ color: pc }}
            >
              RESERVE ONLINE
            </a>
            <a
              href={`tel:${props.phone.replace(/[^+\d]/g, '')}`}
              className="w-full py-4 rounded-lg font-bold text-center text-white border-2 border-white transition-all hover:bg-white/20"
            >
              CALL NOW: {props.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Pixel: Aggressive template complete */}
      {/* <!-- Event: CustomEvent aggressive_template_complete --> */}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  3. LOCAL TEMPLATE                                      */
/* ═══════════════════════════════════════════════════════ */

export function LocalTemplate(props: LandingPageTemplateProps) {
  const pc = props.primaryColor || '#3b82f6' // Blue for local/community feel
  const utmParams = getUTMParams()

  const neighborhoodName = props.neighborhood || props.city

  return (
    <div className="min-h-screen bg-white">
      {/* Pixel: Local template tracking */}
      {/* <!-- Event: CustomEvent local_template_loaded --> */}

      {/* Hero - Location Focused */}
      <section className="pt-20 pb-16 md:pt-28 md:pb-20 px-5 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-4xl mx-auto">
          {/* Location Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 border border-blue-300 text-blue-700 font-semibold text-sm mb-6">
            <MapPinIcon size={14} />
            Storage in {neighborhoodName}
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Storage Near {neighborhoodName}
          </h1>

          {/* Subheadline */}
          {props.subheadline && (
            <p className="text-lg text-slate-600 mb-8 max-w-2xl leading-relaxed">
              {props.subheadline}
            </p>
          )}

          {/* Quick Stats */}
          {props.reviewCount && (
            <div className="flex flex-wrap gap-6 mb-10 p-6 bg-white/60 rounded-xl border border-blue-100 backdrop-blur">
              <div>
                <p className="text-3xl font-bold text-slate-900">{props.reviewCount}+</p>
                <p className="text-sm text-slate-600">Local Reviews</p>
              </div>
              {props.avgRating && (
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={i < Math.floor(props.avgRating!) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-slate-600">{props.avgRating.toFixed(1)} rating</p>
                </div>
              )}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={buildReserveUrl(props.phone, utmParams)}
              className="flex-1 sm:flex-none px-8 py-4 rounded-xl font-bold text-white text-center transition-all hover:shadow-lg flex items-center justify-center gap-2"
              style={{ background: pc }}
            >
              Reserve a Unit
              <ArrowRight size={18} />
            </a>
            <a
              href={`tel:${props.phone.replace(/[^+\d]/g, '')}`}
              className="flex-1 sm:flex-none px-8 py-4 rounded-xl font-bold border-2 text-center transition-all flex items-center justify-center gap-2"
              style={{ borderColor: pc, color: pc }}
            >
              <Phone size={18} />
              {props.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Neighborhood Info */}
      <section className="py-16 md:py-24 px-5 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-12 text-center">
            Why {neighborhoodName} Chooses Us
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-xl border border-slate-200">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                style={{ background: `${pc}20`, color: pc }}
              >
                <MapPin size={20} />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">Convenient Location</h3>
              <p className="text-slate-600 text-sm">
                Right in the heart of {neighborhoodName}, easy to access from your home or office.
              </p>
            </div>

            <div className="p-6 bg-white rounded-xl border border-slate-200">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                style={{ background: `${pc}20`, color: pc }}
              >
                <Shield size={20} />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">Community Trust</h3>
              <p className="text-slate-600 text-sm">
                A storage facility trusted by your neighbors and friends in the area.
              </p>
            </div>

            <div className="p-6 bg-white rounded-xl border border-slate-200">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                style={{ background: `${pc}20`, color: pc }}
              >
                <Clock size={20} />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">Always Open</h3>
              <p className="text-slate-600 text-sm">
                24/7 access means you can reach your unit whenever you need it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Facility Features */}
      {props.features && props.features.length > 0 && (
        <section className="py-16 md:py-24 px-5 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-12 text-center">
              What We Offer
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {props.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${pc}20`, color: pc }}
                  >
                    <Check size={16} />
                  </div>
                  <p className="text-slate-700 font-medium">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Local Reviews/Testimonials Placeholder */}
      <section className="py-16 md:py-24 px-5 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-12 text-center">
            What Your Neighbors Say
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Sarah M.', text: 'Best storage facility in the neighborhood!' },
              { name: 'Mike J.', text: 'Great customer service, very secure.' },
              { name: 'Lisa T.', text: 'Convenient location and reasonable prices.' }
            ].map((testimonial, i) => (
              <div key={i} className="p-6 bg-white rounded-xl border border-slate-200">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={14} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-600 mb-4 text-sm italic">"{testimonial.text}"</p>
                <p className="font-semibold text-slate-900">{testimonial.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location & Directions */}
      <section className="py-16 md:py-24 px-5 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-12 text-center">
            Visit Us Today
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Info */}
            <div>
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Address</h3>
                <div className="flex items-start gap-3">
                  <MapPin size={20} style={{ color: pc }} className="flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-slate-900">{props.address}</p>
                    <p className="text-slate-600">{props.city}</p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Hours</h3>
                <p className="text-slate-600">Open 24/7 for unit access</p>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Call Us</h3>
                <a
                  href={`tel:${props.phone.replace(/[^+\d]/g, '')}`}
                  className="text-lg font-bold transition-all"
                  style={{ color: pc }}
                >
                  {props.phone}
                </a>
              </div>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(props.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-bold transition-all"
                style={{ color: pc }}
              >
                Get Directions →
              </a>
            </div>

            {/* Map */}
            <div className="rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-200 h-64">
              {/* Pixel: Map interaction */}
              {/* <!-- Event: CustomEvent map_viewed --> */}
              <iframe
                src={`https://www.google.com/maps?q=${encodeURIComponent(props.address)}&output=embed`}
                className="w-full h-full border-0"
                allowFullScreen
                loading="lazy"
                title="Storage facility location"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 px-5 text-white" style={{ background: `linear-gradient(135deg, ${pc}, ${pc}dd)` }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Reserve Your Storage Unit in {neighborhoodName}
          </h2>
          <p className="text-lg mb-10 opacity-90">
            Join hundreds of satisfied neighbors. Available now.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={buildReserveUrl(props.phone, utmParams)}
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold bg-white transition-all hover:shadow-lg flex items-center justify-center gap-2"
              style={{ color: pc }}
            >
              Reserve Now
              <ArrowRight size={18} />
            </a>
            <a
              href={`tel:${props.phone.replace(/[^+\d]/g, '')}`}
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold border-2 border-white text-white transition-all hover:bg-white/10 flex items-center justify-center gap-2"
            >
              <Phone size={18} />
              Call {props.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Pixel: Local template complete */}
      {/* <!-- Event: CustomEvent local_template_complete --> */}
    </div>
  )
}
