import { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import {
  getPostBySlug,
  getAdjacentPosts,
  getAuthor,
  parseLocalDate,
  PILLARS,
} from '@/utils/blog';
import { trackEvent } from '@/utils/analytics';
import MarkdownRenderer from './MarkdownRenderer';
import TableOfContents from './TableOfContents';
import ReadingProgress from './ReadingProgress';
import ShareToolbar from './ShareToolbar';
import AuthorCard from './AuthorCard';
import PostNavigation from './PostNavigation';
import RelatedPosts from './RelatedPosts';
import EmailCapture from './EmailCapture';
import EmailCaptureBar from './EmailCaptureBar';
import ScrollToTop from './ScrollToTop';
import BlogNotFound from './BlogNotFound';

interface Props {
  slug: string;
  onNavigate: (path: string) => void;
}

export default function BlogPost({ slug, onNavigate }: Props) {
  const post = getPostBySlug(slug);
  const depthTracked = useRef<Set<number>>(new Set());

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // Track blog view
  useEffect(() => {
    if (post) {
      trackEvent('blog_view', { slug: post.slug, pillar: post.pillar, title: post.title });
    }
  }, [post]);

  // Track scroll depth
  useEffect(() => {
    if (!post) return;
    depthTracked.current = new Set();

    const handleScroll = () => {
      const scrollPct = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      for (const milestone of [25, 50, 75, 100]) {
        if (scrollPct >= milestone && !depthTracked.current.has(milestone)) {
          depthTracked.current.add(milestone);
          trackEvent('blog_scroll_depth', { slug: post.slug, depth: milestone });
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [post]);

  if (!post) return <BlogNotFound onNavigate={onNavigate} />;

  const author = getAuthor(post.author);
  const { prev, next } = getAdjacentPosts(slug);
  const pillarInfo = PILLARS[post.pillar];
  const canonicalUrl = `https://stowstack.co/blog/${post.slug}`;
  const ogImage = post.heroImage || '/og-image.svg';

  return (
    <>
      <Helmet>
        <title>{post.title} | StowStack</title>
        <meta name="description" content={post.description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="StowStack" />
        <meta property="og:article:published_time" content={post.date} />
        {post.updated && <meta property="og:article:modified_time" content={post.updated} />}
        {author && <meta property="og:article:author" content={author.name} />}
        {post.tags.map((tag) => (
          <meta key={tag} property="og:article:tag" content={tag} />
        ))}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.description} />
        <meta name="twitter:image" content={ogImage} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            dateModified: post.updated || post.date,
            author: author
              ? { '@type': 'Person', name: author.name, url: author.linkedin || undefined }
              : undefined,
            publisher: { '@type': 'Organization', name: 'StowStack', url: 'https://stowstack.co' },
            mainEntityOfPage: canonicalUrl,
            image: ogImage,
          })}
        </script>
      </Helmet>

      <ReadingProgress />

      <article className="max-w-6xl mx-auto px-4 py-12">
        {/* Back link */}
        <button
          onClick={() => onNavigate('/blog')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All posts
        </button>

        {/* Header */}
        <header className="max-w-3xl mb-8">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => onNavigate(`/blog/${post.pillar}`)}
              className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              {pillarInfo?.label || post.pillar}
            </button>
            <span className="text-sm text-gray-400">{post.readingTime} min read</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">{post.title}</h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
            {author && (
              <div className="flex items-center gap-2">
                {author.avatar && (
                  <img src={author.avatar} alt={author.name} className="w-7 h-7 rounded-full object-cover bg-gray-200" />
                )}
                <span className="font-medium text-gray-700">{author.name}</span>
              </div>
            )}
            <time dateTime={post.date}>
              {parseLocalDate(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </time>
            {post.updated && (
              <span className="text-gray-400">
                Updated {parseLocalDate(post.updated).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            <ShareToolbar title={post.title} slug={post.slug} />
          </div>
        </header>

        {/* Hero image */}
        {post.heroImage && (
          <div className="max-w-3xl mb-10">
            <img
              src={post.heroImage}
              alt={post.heroAlt || post.title}
              loading="lazy"
              className="w-full rounded-xl"
            />
          </div>
        )}

        {/* Content + TOC */}
        <div className="flex gap-12">
          <div className="min-w-0 max-w-3xl flex-1">
            {/* Mobile TOC */}
            <div className="xl:hidden">
              <TableOfContents content={post.content} slug={post.slug} />
            </div>

            {/* Post body */}
            <div className="prose-custom text-gray-800 text-[1.05rem] leading-[1.75]">
              <MarkdownRenderer content={post.content} />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-gray-100">
              {post.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    trackEvent('blog_tag_click', { tag, fromSlug: slug });
                    onNavigate(`/blog/tag/${tag}`);
                  }}
                  className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Author bio */}
            {author && (
              <div className="mt-10">
                <AuthorCard author={author} />
              </div>
            )}

            {/* Email capture */}
            <div className="mt-10">
              <EmailCapture source={`/blog/${post.slug}`} />
            </div>

            {/* Post navigation */}
            <PostNavigation prev={prev} next={next} onNavigate={onNavigate} />

            {/* Related posts */}
            <RelatedPosts slug={slug} onNavigate={onNavigate} />
          </div>

          {/* Desktop TOC sidebar */}
          <div className="hidden xl:block">
            <TableOfContents content={post.content} slug={post.slug} />
          </div>
        </div>
      </article>

      <EmailCaptureBar />
      <ScrollToTop />
    </>
  );
}
