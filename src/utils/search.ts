import Fuse from 'fuse.js';
import { getAllPosts, type BlogPost } from './blog';

let _fuse: Fuse<BlogPost> | null = null;

function getFuse(): Fuse<BlogPost> {
  if (_fuse) return _fuse;
  _fuse = new Fuse(getAllPosts(), {
    keys: [
      { name: 'title', weight: 3 },
      { name: 'description', weight: 2 },
      { name: 'tags', weight: 1.5 },
      { name: 'content', weight: 1 },
    ],
    threshold: 0.4,
    includeMatches: true,
    minMatchCharLength: 2,
  });
  return _fuse;
}

export function searchPosts(query: string): BlogPost[] {
  if (!query.trim()) return [];
  return getFuse()
    .search(query)
    .map((r) => r.item);
}
