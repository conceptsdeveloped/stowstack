import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import { getPostsByPillar, PILLARS } from '@/utils/blog';
import PostCard from './PostCard';

const POSTS_PER_PAGE = 12;

interface Props {
  pillar: string;
  onNavigate: (path: string) => void;
}

export default function PillarPage({ pillar, onNavigate }: Props) {
  const [page, setPage] = useState(1);
  const pillarInfo = PILLARS[pillar];
  const posts = getPostsByPillar(pillar);
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const paginated = posts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);

  if (!pillarInfo) {
    return null; // Will be handled as post slug instead
  }

  return (
    <>
      <Helmet>
        <title>{pillarInfo.label} | StowStack by StorageAds.com</title>
        <meta name="description" content={pillarInfo.description} />
        <link rel="canonical" href={`https://stowstack.co/blog/${pillar}`} />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <button
          onClick={() => onNavigate('/blog')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All posts
        </button>

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-3">{pillarInfo.label}</h1>
          <p className="text-gray-500 max-w-lg">{pillarInfo.description}</p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">No posts yet in this category.</p>
            <button onClick={() => onNavigate('/blog')} className="text-primary text-sm font-medium hover:opacity-80">
              Browse all posts &rarr;
            </button>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map((post) => (
                <PostCard key={post.slug} post={post} onNavigate={onNavigate} />
              ))}
            </div>

            {totalPages > 1 && (
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
