import { useState, useEffect, useMemo } from 'react';
import { List, ChevronDown } from 'lucide-react';
import { trackEvent } from '@/utils/analytics';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface Props {
  content: string;
  slug: string;
}

function extractHeadings(markdown: string): TocItem[] {
  const headings: TocItem[] = [];
  const lines = markdown.split('\n');
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{2,3})\s+(.+)/);
    if (match) {
      const text = match[2].replace(/[*_`]/g, '');
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      headings.push({ id, text, level: match[1].length });
    }
  }
  return headings;
}

export default function TableOfContents({ content, slug }: Props) {
  const headings = useMemo(() => extractHeadings(content), [content]);
  const [activeId, setActiveId] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      trackEvent('blog_toc_click', { slug, heading: id });
    }
    setMobileOpen(false);
  };

  const tocList = (
    <nav aria-label="Table of contents">
      <ul className="space-y-1">
        {headings.map(({ id, text, level }) => (
          <li key={id}>
            <button
              onClick={() => handleClick(id)}
              className={`text-left w-full text-sm py-1 transition-colors rounded px-2 ${
                level === 3 ? 'pl-5' : ''
              } ${
                activeId === id
                  ? 'text-primary font-medium bg-emerald-50'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <div className="hidden xl:block w-64 flex-shrink-0">
        <div className="sticky top-24">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-2">On this page</h4>
          {tocList}
        </div>
      </div>

      {/* Mobile: toggleable dropdown */}
      <div className="xl:hidden mb-6">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-gray-50 px-4 py-2.5 rounded-lg w-full hover:bg-gray-100 transition-colors"
        >
          <List className="w-4 h-4" />
          Table of Contents
          <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
        </button>
        {mobileOpen && (
          <div className="mt-2 bg-gray-50 rounded-lg p-3">
            {tocList}
          </div>
        )}
      </div>
    </>
  );
}
