import { Lightbulb, BookOpen, StickyNote } from 'lucide-react';

const CALLOUT_TYPES: Record<string, { icon: typeof Lightbulb; bg: string; border: string; label: string }> = {
  'Operator Note:': { icon: StickyNote, bg: 'bg-amber-50', border: 'border-amber-300', label: 'Operator Note' },
  'Key Takeaway:': { icon: Lightbulb, bg: 'bg-emerald-50', border: 'border-emerald-300', label: 'Key Takeaway' },
  'Example:': { icon: BookOpen, bg: 'bg-blue-50', border: 'border-blue-300', label: 'Example' },
};

export default function CalloutBlock({ children }: { children: React.ReactNode }) {
  // Extract text content to detect callout type
  const text = extractText(children);

  for (const [prefix, config] of Object.entries(CALLOUT_TYPES)) {
    if (text.startsWith(`**${prefix}**`) || text.startsWith(prefix)) {
      const Icon = config.icon;
      // Remove the prefix from children for display
      const cleanText = text.replace(`**${prefix}**`, '').replace(prefix, '').trim();
      return (
        <div className={`${config.bg} ${config.border} border-l-4 rounded-r-lg p-4 my-6`}>
          <div className="flex items-start gap-3">
            <Icon className="w-5 h-5 mt-0.5 flex-shrink-0 opacity-70" />
            <div>
              <span className="font-semibold text-sm uppercase tracking-wide opacity-70">{config.label}</span>
              <p className="mt-1 text-[0.95rem] leading-relaxed">{cleanText}</p>
            </div>
          </div>
        </div>
      );
    }
  }

  // Fall back to normal blockquote
  return (
    <blockquote className="border-l-4 border-gray-300 pl-4 my-6 italic text-gray-600">
      {children}
    </blockquote>
  );
}

function extractText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return extractText((children as any).props.children);
  }
  return '';
}
