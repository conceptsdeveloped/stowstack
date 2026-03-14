import { useState, useEffect } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { trackEvent } from '@/utils/analytics';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORAGE_KEY = 'stowstack_email_subscribers';
const DISMISSED_KEY = 'stowstack_email_bar_dismissed';

export default function EmailCaptureBar() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY)) {
      setDismissed(true);
      return;
    }

    // Check if already subscribed
    try {
      const subs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (subs.length > 0) { setDismissed(true); return; }
    } catch { /* empty */ }

    const handleScroll = () => {
      const scrollPct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      if (scrollPct > 0.6) setVisible(true);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(DISMISSED_KEY, '1');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !EMAIL_REGEX.test(email)) return;

    setStatus('loading');
    setTimeout(() => {
      const entry = { email, timestamp: new Date().toISOString(), source: window.location.pathname };
      console.log('[EmailCapture] Subscription:', entry);
      try {
        const subs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        subs.push(entry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
      } catch { /* empty */ }
      trackEvent('blog_email_capture_submit', { source: entry.source });
      setStatus('success');
      setTimeout(dismiss, 2000);
    }, 600);
  };

  if (dismissed || !visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 animate-slide-up print:hidden">
      <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          {status === 'success' ? (
            <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm flex-1">
              <Check className="w-4 h-4" /> You're in.
            </div>
          ) : (
            <>
              <span className="text-sm font-medium text-gray-700 hidden sm:block whitespace-nowrap">
                Get operator-level insights. No fluff.
              </span>
              <form onSubmit={handleSubmit} className="flex gap-2 flex-1 min-w-0">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 min-w-0 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-60 flex items-center gap-1.5 whitespace-nowrap"
                >
                  {status === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Send it
                </button>
              </form>
            </>
          )}
          <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
