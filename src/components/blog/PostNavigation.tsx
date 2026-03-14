import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PILLARS, type BlogPost } from '@/utils/blog';

interface Props {
  prev?: BlogPost;
  next?: BlogPost;
  onNavigate: (path: string) => void;
}

export default function PostNavigation({ prev, next, onNavigate }: Props) {
  if (!prev && !next) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-4 mt-10 pt-8 border-t border-gray-100">
      {prev ? (
        <button
          onClick={() => onNavigate(`/blog/${prev.slug}`)}
          className="flex-1 group text-left p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </div>
          <div className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">{prev.title}</div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 mt-1.5 inline-block">
            {PILLARS[prev.pillar]?.label || prev.pillar}
          </span>
        </button>
      ) : <div className="flex-1" />}
      {next ? (
        <button
          onClick={() => onNavigate(`/blog/${next.slug}`)}
          className="flex-1 group text-right p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-end gap-1.5 text-xs text-gray-400 mb-1">
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
          <div className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">{next.title}</div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 mt-1.5 inline-block">
            {PILLARS[next.pillar]?.label || next.pillar}
          </span>
        </button>
      ) : <div className="flex-1" />}
    </div>
  );
}
