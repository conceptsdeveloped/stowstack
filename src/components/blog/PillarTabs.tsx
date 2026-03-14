import { PILLARS } from '@/utils/blog';

interface Props {
  active: string | null;
  onChange: (pillar: string | null) => void;
}

export default function PillarTabs({ active, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      <button
        role="tab"
        aria-selected={active === null}
        onClick={() => onChange(null)}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          active === null ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        All
      </button>
      {Object.entries(PILLARS).map(([key, { label }]) => (
        <button
          key={key}
          role="tab"
          aria-selected={active === key}
          onClick={() => onChange(key)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            active === key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
