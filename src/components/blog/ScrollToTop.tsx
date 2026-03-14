import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > window.innerHeight);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-30 p-2.5 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl hover:border-gray-300 transition-all print:hidden"
      aria-label="Back to top"
    >
      <ArrowUp className="w-4.5 h-4.5 text-gray-600" />
    </button>
  );
}
