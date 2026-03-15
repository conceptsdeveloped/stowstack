import { useState, useEffect, useRef } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { trackEvent } from '@/utils/analytics';

interface Props {
  variant?: 'inline' | 'compact';
  source?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORAGE_KEY = 'stowstack_email_subscribers';

function getSubscribers(): { email: string; timestamp: string; source: string }[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function isAlreadySubscribed(email: string): boolean {
  return getSubscribers().some((s) => s.email.toLowerCase() === email.toLowerCase());
}

export default function EmailCapture({ variant = 'inline', source }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'subscribed'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const viewTracked = useRef(false);
  const { ref: inViewRef, inView } = useInView({ threshold: 0.5, triggerOnce: true });

  useEffect(() => {
    if (inView && !viewTracked.current) {
      viewTracked.current = true;
      trackEvent('blog_email_capture_view', { source: source || window.location.pathname });
    }
  }, [inView, source]);

  useEffect(() => {
    if (getSubscribers().length > 0) {
      setStatus('subscribed');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Enter your email');
      setStatus('error');
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setErrorMsg('Enter a valid email');
      setStatus('error');
      return;
    }
    if (isAlreadySubscribed(email)) {
      setStatus('subscribed');
      return;
    }

    setStatus('loading');

    // Simulate submission delay
    setTimeout(() => {
      const entry = { email, timestamp: new Date().toISOString(), source: source || window.location.pathname };
      const subs = getSubscribers();
      subs.push(entry);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
      trackEvent('blog_email_capture_submit', { source: entry.source });
      setStatus('success');
    }, 800);
  };

  if (status === 'success' || status === 'subscribed') {
    return (
      <div className={`${variant === 'compact' ? 'py-4 px-6' : 'py-8 px-6 md:px-10'} bg-emerald-50 rounded-2xl text-center`}>
        <div className="flex items-center justify-center gap-2 text-emerald-700 font-medium">
          <Check className="w-5 h-5" />
          {status === 'subscribed' ? "You're subscribed." : "You're in."}
        </div>
      </div>
    );
  }

  const isCompact = variant === 'compact';

  return (
    <div ref={inViewRef} className={`${isCompact ? 'py-4 px-5' : 'py-8 px-6 md:px-10'} bg-gray-50 rounded-2xl border border-gray-100`}>
      <div className={isCompact ? '' : 'text-center mb-5'}>
        <h3 className={`font-bold ${isCompact ? 'text-base mb-1' : 'text-xl mb-2'}`}>
          Get operator-level insights. No fluff.
        </h3>
        {!isCompact && (
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Tactical breakdowns on acquisition, cost per move-in, and what's actually working in self-storage marketing.
          </p>
        )}
      </div>
      <form onSubmit={handleSubmit} className={`flex gap-2 ${isCompact ? '' : 'mt-4 max-w-md mx-auto'}`}>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setStatus('idle'); setErrorMsg(''); }}
          placeholder="you@example.com"
          className={`flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
            status === 'error' ? 'border-red-300 focus:ring-red-200' : ''
          }`}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2 whitespace-nowrap"
        >
          {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {status === 'loading' ? 'Sending...' : 'Subscribe'}
        </button>
      </form>
      {status === 'error' && <p className="text-red-500 text-xs mt-2 text-center">{errorMsg}</p>}
    </div>
  );
}
