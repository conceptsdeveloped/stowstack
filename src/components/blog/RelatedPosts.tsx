import { getRelatedPosts } from '@/utils/blog';
import PostCard from './PostCard';
import { trackEvent } from '@/utils/analytics';

interface Props {
  slug: string;
  onNavigate: (path: string) => void;
}

export default function RelatedPosts({ slug, onNavigate }: Props) {
  const related = getRelatedPosts(slug, 3);
  if (related.length === 0) return null;

  const handleNavigate = (path: string) => {
    const toSlug = path.replace('/blog/', '');
    trackEvent('blog_related_click', { fromSlug: slug, toSlug });
    onNavigate(path);
  };

  return (
    <section className="mt-12">
      <h3 className="text-lg font-bold mb-6">Related Posts</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {related.map((post) => (
          <PostCard key={post.slug} post={post} onNavigate={handleNavigate} />
        ))}
      </div>
    </section>
  );
}
