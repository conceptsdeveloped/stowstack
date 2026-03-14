import { useState } from 'react';
import { Link2, Linkedin, Twitter, Mail, Check } from 'lucide-react';
import { trackEvent } from '@/utils/analytics';

interface Props {
  title: string;
  slug: string;
}

export default function ShareToolbar({ title, slug }: Props) {
  const [copied, setCopied] = useState(false);
  const url = `https://stowstack.co/blog/${slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    trackEvent('blog_share', { slug, platform: 'copy' });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinkedIn = () => {
    trackEvent('blog_share', { slug, platform: 'linkedin' });
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareTwitter = () => {
    trackEvent('blog_share', { slug, platform: 'twitter' });
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareEmail = () => {
    trackEvent('blog_share', { slug, platform: 'email' });
    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check this out: ${url}`)}`;
  };

  const btnClass = 'p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors';

  return (
    <div className="flex items-center gap-1">
      <button onClick={handleCopy} className={btnClass} title="Copy link">
        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Link2 className="w-4 h-4" />}
      </button>
      <button onClick={shareLinkedIn} className={btnClass} title="Share on LinkedIn">
        <Linkedin className="w-4 h-4" />
      </button>
      <button onClick={shareTwitter} className={btnClass} title="Share on X">
        <Twitter className="w-4 h-4" />
      </button>
      <button onClick={shareEmail} className={btnClass} title="Share via email">
        <Mail className="w-4 h-4" />
      </button>
    </div>
  );
}
