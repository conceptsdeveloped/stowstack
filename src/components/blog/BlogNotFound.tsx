import { getAllPosts } from '@/utils/blog';
import PostCard from './PostCard';

interface Props {
  onNavigate: (path: string) => void;
}

export default function BlogNotFound({ onNavigate }: Props) {
  const recent = getAllPosts().slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-bold mb-3">This post doesn't exist.</h1>
      <p className="text-gray-500 mb-10">Here's what we've got.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
        {recent.map((post) => (
          <PostCard key={post.slug} post={post} onNavigate={onNavigate} />
        ))}
      </div>
      <button
        onClick={() => onNavigate('/blog')}
        className="mt-8 text-sm text-primary hover:opacity-80 transition-opacity font-medium"
      >
        &larr; Browse all posts
      </button>
    </div>
  );
}
