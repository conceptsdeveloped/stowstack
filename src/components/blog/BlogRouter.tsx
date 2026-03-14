import { useState, useEffect, useCallback, useRef } from 'react';
import { PILLARS } from '@/utils/blog';
import BlogIndex from './BlogIndex';
import BlogPost from './BlogPost';
import PillarPage from './PillarPage';
import TagPage from './TagPage';

interface Props {
  onBack: () => void;
}

function parseBlogPath(pathname: string) {
  const path = pathname.replace(/^\/blog\/?/, '');
  if (!path) return { type: 'index' as const };
  if (path.startsWith('tag/')) return { type: 'tag' as const, value: path.replace('tag/', '') };
  if (PILLARS[path]) return { type: 'pillar' as const, value: path };
  return { type: 'post' as const, value: path };
}

export default function BlogRouter({ onBack }: Props) {
  const [route, setRoute] = useState(() => parseBlogPath(window.location.pathname));
  const [fadeIn, setFadeIn] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPop = () => {
      setFadeIn(false);
      setTimeout(() => {
        setRoute(parseBlogPath(window.location.pathname));
        setFadeIn(true);
      }, 150);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((path: string) => {
    if (path === '/' || !path.startsWith('/blog')) {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }
    setFadeIn(false);
    setTimeout(() => {
      window.history.pushState({}, '', path);
      setRoute(parseBlogPath(path));
      window.scrollTo(0, 0);
      setFadeIn(true);
    }, 150);
  }, []);

  const content = (() => {
    switch (route.type) {
      case 'tag':
        return <TagPage tag={route.value!} onNavigate={navigate} />;
      case 'pillar':
        return <PillarPage pillar={route.value!} onNavigate={navigate} />;
      case 'post':
        return <BlogPost slug={route.value!} onNavigate={navigate} />;
      default:
        return <BlogIndex onNavigate={navigate} />;
    }
  })();

  return (
    <div
      ref={containerRef}
      className={`min-h-screen bg-background transition-opacity duration-150 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
    >
      {content}
    </div>
  );
}
