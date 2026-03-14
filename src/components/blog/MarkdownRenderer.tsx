import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import CalloutBlock from './CalloutBlock';
import CodeBlock from './CodeBlock';

interface Props {
  content: string;
}

export default function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSlug, rehypeHighlight]}
      components={{
        blockquote: ({ children }) => <CalloutBlock>{children}</CalloutBlock>,
        pre: ({ children }) => <>{children}</>,
        code: ({ className, children, ...props }) => {
          const isInline = !className && typeof children === 'string' && !children.includes('\n');
          if (isInline) {
            return (
              <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-[0.875em] font-mono" {...props}>
                {children}
              </code>
            );
          }
          return <CodeBlock className={className}>{String(children).replace(/\n$/, '')}</CodeBlock>;
        },
        a: ({ href, children, ...props }) => {
          const isExternal = href?.startsWith('http');
          return (
            <a
              href={href}
              className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
              {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              {...props}
            >
              {children}
            </a>
          );
        },
        h2: ({ children, id, ...props }) => (
          <h2 id={id} className="text-2xl font-bold mt-10 mb-4 scroll-mt-24" {...props}>{children}</h2>
        ),
        h3: ({ children, id, ...props }) => (
          <h3 id={id} className="text-xl font-semibold mt-8 mb-3 scroll-mt-24" {...props}>{children}</h3>
        ),
        h4: ({ children, ...props }) => (
          <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>{children}</h4>
        ),
        p: ({ children, ...props }) => (
          <p className="mb-5 leading-[1.75]" {...props}>{children}</p>
        ),
        ul: ({ children, ...props }) => (
          <ul className="list-disc pl-6 mb-5 space-y-2" {...props}>{children}</ul>
        ),
        ol: ({ children, ...props }) => (
          <ol className="list-decimal pl-6 mb-5 space-y-2" {...props}>{children}</ol>
        ),
        li: ({ children, ...props }) => (
          <li className="leading-[1.7]" {...props}>{children}</li>
        ),
        hr: () => <hr className="my-8 border-gray-200" />,
        table: ({ children, ...props }) => (
          <div className="overflow-x-auto my-6">
            <table className="min-w-full border border-gray-200 text-sm" {...props}>{children}</table>
          </div>
        ),
        th: ({ children, ...props }) => (
          <th className="bg-gray-50 border border-gray-200 px-4 py-2 text-left font-semibold" {...props}>{children}</th>
        ),
        td: ({ children, ...props }) => (
          <td className="border border-gray-200 px-4 py-2" {...props}>{children}</td>
        ),
        img: ({ src, alt, ...props }) => (
          <figure className="my-6">
            <img
              src={src}
              alt={alt || ''}
              loading="lazy"
              className="rounded-lg w-full"
              {...props}
            />
            {alt && <figcaption className="text-sm text-gray-500 mt-2 text-center">{alt}</figcaption>}
          </figure>
        ),
        strong: ({ children, ...props }) => (
          <strong className="font-semibold" {...props}>{children}</strong>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
