import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react'

const BRAND = 'StowStack'

const QUICK_REPLIES = [
  'How fast do campaigns go live?',
  'What does a facility audit include?',
  'How much does it cost?',
  'What KPIs do you report on?',
]

const BOT_RESPONSES = {
  'how fast': 'Our team gets campaigns live within 48-72 hours of the initial audit call. No onboarding decks, no 3-week ramp. We know the industry cold, so there is no learning curve.',
  'audit': 'Every facility audit is free. Blake and the team map your vacancy gaps, unit mix, market comps, competitor ad presence, website conversion rate, and call-handling metrics. You walk away with a full diagnostic whether or not you work with us.',
  'cost': 'Our Launch tier starts at $750/month, Growth is $1,500/month, and Portfolio is custom for multi-site operators. Ad spend goes directly to Meta (recommended min $1,000/month). No setup fees, no long contracts. 90-day initial, then month-to-month.',
  'kpi': 'We report on cost per lead (CPL), cost per move-in, total leads, phone calls, move-ins, ROAS, and occupancy velocity. Every metric ties to actual revenue impact. No vanity dashboards.',
  'pixel': 'Full Meta Pixel installation and server-side Conversions API (CAPI) setup is included in every engagement. We also configure custom conversion events for form submits, calls, and move-ins.',
  'retarget': 'We run multi-window retargeting: 7-day hot, 14-day warm, 30-day cool. Sequential creative matches where the prospect is in the decision process, with frequency capping to prevent ad fatigue.',
  'team': 'Blake Burkett (CEO/Founder) leads the company. Marcus Dellatore heads media buying. Rachel Kim is our Account Director. Tyler Brooks handles creative strategy. Priya Sharma leads analytics. Angelo Vitale is our senior designer.',
  'different': 'We operate our own self-storage facilities. Every campaign decision is informed by real operational data. We audit your full funnel from ad click to signed lease. Most agencies stop at the click.',
  'contract': 'No long-term contracts. 90-day initial engagement, then month-to-month. We earn your business every month. That said, campaign performance compounds over time as Pixel data matures.',
  'default': 'Great question! For the most detailed answer, I would recommend booking a free facility audit with our team. Blake or Rachel will personally walk you through everything specific to your facility. Want me to help you schedule that?',
}

function getResponse(input) {
  const lower = input.toLowerCase()
  if (lower.includes('fast') || lower.includes('quick') || lower.includes('launch') || lower.includes('48') || lower.includes('72') || lower.includes('timeline')) return BOT_RESPONSES['how fast']
  if (lower.includes('audit') || lower.includes('free')) return BOT_RESPONSES['audit']
  if (lower.includes('cost') || lower.includes('price') || lower.includes('pricing') || lower.includes('how much') || lower.includes('tier') || lower.includes('plan')) return BOT_RESPONSES['cost']
  if (lower.includes('kpi') || lower.includes('report') || lower.includes('metric') || lower.includes('track') || lower.includes('measure')) return BOT_RESPONSES['kpi']
  if (lower.includes('pixel') || lower.includes('capi') || lower.includes('conversion')) return BOT_RESPONSES['pixel']
  if (lower.includes('retarget') || lower.includes('remarketing')) return BOT_RESPONSES['retarget']
  if (lower.includes('team') || lower.includes('who') || lower.includes('blake') || lower.includes('angelo') || lower.includes('marcus')) return BOT_RESPONSES['team']
  if (lower.includes('different') || lower.includes('why') || lower.includes('unique') || lower.includes('special')) return BOT_RESPONSES['different']
  if (lower.includes('contract') || lower.includes('commitment') || lower.includes('cancel')) return BOT_RESPONSES['contract']
  return BOT_RESPONSES['default']
}

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'bot', text: `Hey there! I am the ${BRAND} assistant. Ask me anything about our Meta ads service for self-storage operators. What can I help with?` }
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const chatRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, typing])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  const send = (text) => {
    if (!text.trim()) return
    setMessages(prev => [...prev, { role: 'user', text: text.trim() }])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages(prev => [...prev, { role: 'bot', text: getResponse(text) }])
    }, 600 + Math.random() * 800)
  }

  return (
    <>
      {/* Toggle Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[90] w-14 h-14 gradient-brand rounded-full shadow-lg shadow-brand-600/30 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform animate-pulse-glow"
        >
          <MessageSquare size={22} className="text-white" />
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-6 right-6 z-[90] w-[360px] max-w-[calc(100vw-48px)] h-[520px] max-h-[calc(100vh-120px)] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-slate-200 animate-scale-in">
          {/* Header */}
          <div className="gradient-brand px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{BRAND} Assistant</p>
                <p className="text-[10px] text-white/70 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-300 rounded-full" /> Online
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white cursor-pointer">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div ref={chatRef} className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-md'
                    : 'bg-white text-slate-700 border border-slate-200 rounded-bl-md shadow-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-white text-slate-400 border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Replies */}
          {messages.length <= 2 && (
            <div className="bg-slate-50 border-t border-slate-100 px-3 py-2 flex flex-wrap gap-1.5">
              {QUICK_REPLIES.map((qr) => (
                <button
                  key={qr}
                  onClick={() => send(qr)}
                  className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:border-brand-300 hover:text-brand-600 transition-all cursor-pointer"
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="bg-white border-t border-slate-200 px-3 py-3 shrink-0">
            <form
              onSubmit={(e) => { e.preventDefault(); send(input) }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text" value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about our services..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-9 h-9 gradient-brand rounded-lg flex items-center justify-center cursor-pointer hover:opacity-90 transition-all disabled:opacity-30"
              >
                <Send size={14} className="text-white" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
