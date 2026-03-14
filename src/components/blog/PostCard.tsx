import { PILLARS, parseLocalDate, type BlogPost } from '@/utils/blog';

interface Props {
  post: BlogPost;
  onNavigate: (path: string) => void;
}

export default function PostCard({ post, onNavigate }: Props) {
  const pillarInfo = PILLARS[post.pillar];

  return (
    <article
      className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-200 cursor-pointer flex flex-col"
      onClick={() => onNavigate(`/blog/${post.slug}`)}
    >
      {post.heroImage && (
        <div className="aspect-[16/9] overflow-hidden bg-gray-100">
          <img
            src={post.heroImage}
            alt={post.heroAlt || post.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100 transition-colors"
            onClick={(e) => { e.stopPropagation(); onNavigate(`/blog/${post.pillar}`); }}
          >
            {pillarInfo?.label || post.pillar}
          </span>
          <span className="text-xs text-gray-400">{post.readingTime} min read</span>
        </div>
        <h3 className="text-lg font-semibold leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-1 line-clamp-3">
          {post.description}
        </p>
        <time className="text-xs text-gray-400" dateTime={post.date}>
          {parseLocalDate(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </time>
      </div>
    </article>
  );
}
