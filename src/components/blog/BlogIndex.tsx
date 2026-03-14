import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { getAllPosts, getFeaturedPosts, type BlogPost } from '@/utils/blog';
import { trackEvent } from '@/utils/analytics';
import PostCard from './PostCard';
import FeaturedPostCard from './FeaturedPostCard';
import PillarTabs from './PillarTabs';
import BlogSearch from './BlogSearch';
import EmailCapture from './EmailCapture';

const POSTS_PER_PAGE = 12;

interface Props {
  onNavigate: (path: string) => void;
}

export default function BlogIndex({ onNavigate }: Props) {
  const [pillar, setPillar] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchActive, setSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<BlogPost[]>([]);

  const allPosts = getAllPosts();
  const featured = getFeaturedPosts();

  const filtered = useMemo(() => {
    if (searchActive) return searchResults;
    return pillar ? allPosts.filter((p) => p.pillar === pillar) : allPosts;
  }, [allPosts, pillar, searchActive, searchResults]);

  const totalPages = Math.ceil(filtered.length / POSTS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);

  const handlePillarChange = (p: string | null) => {
    setPillar(p);
    setPage(1);
    if (p) trackEvent('blog_pillar_filter', { pillar: p });
  };

  // Insert email capture after 3rd post
  const renderPostGrid = () => {
    const cards: React.ReactNode[] = [];
    paginated.forEach((post, i) => {
      cards.push(<PostCard key={post.slug} post={post} onNavigate={onNavigate} />);
      if (i === 2 && page === 1) {
        cards.push(
          <div key="email-capture" className="sm:col-span-2 lg:col-span-3">
            <EmailCapture source="/blog" />
          </div>
        );
      }
    });
    // If fewer than 4 posts and page 1, add capture at end
    if (paginated.length > 0 && paginated.length <= 3 && page === 1) {
      cards.push(
        <div key="email-capture" className="sm:col-span-2 lg:col-span-3">
          <EmailCapture source="/blog" />
        </div>
      );
    }
    return cards;
  };

  return (
    <>
      <Helmet>
        <title>StowStack Blog — Self-Storage Acquisition Insights</title>
        <meta name="description" content="Operator-level insights on self-storage acquisition, attribution, and what's actually working in storage marketing." />
        <link rel="canonical" href="https://stowstack.co/blog" />
        <meta property="og:title" content="StowStack Blog — Self-Storage Acquisition Insights" />
        <meta property="og:description" content="Operator-level insights on self-storage acquisition, attribution, and what's actually working in storage marketing." />
        <meta property="og:url" content="https://stowstack.co/blog" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="StowStack" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'StowStack Blog',
            description: 'Operator-level insights on self-storage acquisition, attribution, and what\'s actually working in storage marketing.',
            url: 'https://stowstack.co/blog',
            publisher: { '@type': 'Organization', name: 'StowStack', url: 'https://stowstack.co' },
          })}
        </script>
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">The StowStack Blog</h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            Operator-level insights on acquisition, unit economics, and what's actually working in self-storage marketing.
          </p>
        </div>

        {/* Featured */}
        {!searchActive && featured.length > 0 && page === 1 && !pillar && (
          <div className="mb-10">
            {featured.map((post) => (
              <FeaturedPostCard key={post.slug} post={post} onNavigate={onNavigate} />
            ))}
          </div>
        )}

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
          <BlogSearch onNavigate={onNavigate} onSearchActive={setSearchActive} onResults={setSearchResults} />
        </div>
        {!searchActive && (
          <div className="mb-8">
            <PillarTabs active={pillar} onChange={handlePillarChange} />
          </div>
        )}

        {/* Posts Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">No posts yet in this category.</p>
            <button onClick={() => { setPillar(null); setPage(1); }} className="text-primary text-sm font-medium hover:opacity-80">
              Browse all posts &rarr;
            </button>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderPostGrid()}
            </div>

            {/* Pagination */}
            {totalPages > 1 && !searchActive && (
              <div className="flex items-center justify-center gap-2 mt-12">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      p === page ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
