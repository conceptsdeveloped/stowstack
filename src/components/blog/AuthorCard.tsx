import { Linkedin } from 'lucide-react';
import type { Author } from '@/utils/blog';

interface Props {
  author: Author;
}

export default function AuthorCard({ author }: Props) {
  return (
    <div className="bg-gray-50 rounded-2xl p-6 flex items-start gap-4">
      {author.avatar && (
        <img
          src={author.avatar}
          alt={author.name}
          className="w-14 h-14 rounded-full object-cover bg-gray-200 flex-shrink-0"
        />
      )}
      <div>
        <h4 className="font-semibold text-base">{author.name}</h4>
        <p className="text-sm text-gray-500 mb-2">{author.role}</p>
        <p className="text-sm text-gray-600 leading-relaxed">{author.bio}</p>
        {author.linkedin && (
          <a
            href={author.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:opacity-80 mt-2 transition-opacity"
          >
            <Linkedin className="w-4 h-4" />
            LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}
