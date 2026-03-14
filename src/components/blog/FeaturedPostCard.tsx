import { PILLARS, parseLocalDate, type BlogPost } from '@/utils/blog';

interface Props {
  post: BlogPost;
  onNavigate: (path: string) => void;
}

export default function FeaturedPostCard({ post, onNavigate }: Props) {
  const pillarInfo = PILLARS[post.pillar];

  return (
    <article
      className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-200 cursor-pointer"
      onClick={() => onNavigate(`/blog/${post.slug}`)}
    >
      <div className="md:flex">
        {post.heroImage && (
          <div className="md:w-1/2 aspect-[16/9] md:aspect-auto overflow-hidden bg-gray-100">
            <img
              src={post.heroImage}
              alt={post.heroAlt || post.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        <div className={`p-6 md:p-8 flex flex-col justify-center ${post.heroImage ? 'md:w-1/2' : 'w-full'}`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary text-white uppercase tracking-wider">
              Featured
            </span>
            <span
              className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100"
              onClick={(e) => { e.stopPropagation(); onNavigate(`/blog/${post.pillar}`); }}
            >
              {pillarInfo?.label || post.pillar}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-3 group-hover:text-primary transition-colors">
            {post.title}
          </h2>
          <p className="text-gray-500 leading-relaxed mb-4 line-clamp-3">
            {post.description}
          </p>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <time dateTime={post.date}>
              {parseLocalDate(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </time>
            <span>&middot;</span>
            <span>{post.readingTime} min read</span>
          </div>
        </div>
      </div>
    </article>
  );
}
