import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { searchPosts } from '@/utils/search';
import { PILLARS, type BlogPost } from '@/utils/blog';
import { trackEvent } from '@/utils/analytics';

interface Props {
  onNavigate: (path: string) => void;
  onSearchActive: (active: boolean) => void;
  onResults: (posts: BlogPost[]) => void;
}

export default function BlogSearch({ onNavigate, onSearchActive, onResults }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BlogPost[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setResults([]);
      setShowDropdown(false);
      onSearchActive(false);
      onResults([]);
      return;
    }
    const found = searchPosts(q);
    setResults(found);
    setShowDropdown(true);
    setActiveIdx(-1);
    onSearchActive(true);
    onResults(found);
    trackEvent('blog_search', { query: q, resultCount: found.length });
  }, [onSearchActive, onResults]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0 && results[activeIdx]) {
      onNavigate(`/blog/${results[activeIdx].slug}`);
      clear();
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    onSearchActive(false);
    onResults([]);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search posts..."
          className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        {query && (
          <button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No posts found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.slice(0, 8).map((post, i) => {
              const pillar = PILLARS[post.pillar];
              return (
                <button
                  key={post.slug}
                  onClick={() => { onNavigate(`/blog/${post.slug}`); clear(); }}
                  className={`w-full text-left px-4 py-3 flex flex-col gap-1 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${
                    i === activeIdx ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      {pillar?.label || post.pillar}
                    </span>
                  </div>
                  <span className="text-sm font-medium line-clamp-1">{post.title}</span>
                  <span className="text-xs text-gray-500 line-clamp-1">{post.description}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
