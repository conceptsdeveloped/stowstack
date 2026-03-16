import { getReadingTime } from './reading-time';

/** Parse date string as local date (avoid timezone offset issues with YYYY-MM-DD) */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Browser-compatible frontmatter parser (no Buffer dependency) */
function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const yamlStr = match[1];
  const content = match[2];
  const data: Record<string, unknown> = {};

  for (const line of yamlStr.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let val: string | boolean | string[] = trimmed.slice(colonIdx + 1).trim();

    // Remove surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // Parse arrays like [a, b, c]
    else if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map((s: string) => {
        const t = s.trim();
        return (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))
          ? t.slice(1, -1)
          : t;
      });
    }
    // Parse booleans
    else if (val === 'true') val = true;
    else if (val === 'false') val = false;
    // Leave dates and numbers as strings (we handle date conversion later)

    data[key] = val;
  }

  return { data, content };
}

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  updated?: string;
  pillar: string;
  description: string;
  author: string;
  tags: string[];
  featured: boolean;
  draft: boolean;
  heroImage?: string;
  heroAlt?: string;
  readingTime: number;
  content: string;
}

export interface Author {
  name: string;
  role: string;
  bio: string;
  avatar: string;
  linkedin: string;
  twitter: string;
}

export const PILLARS: Record<string, { label: string; description: string }> = {
  'operator-math': {
    label: 'Operator Math',
    description: 'Unit economics, attribution models, and the numbers that actually drive self-storage profitability.',
  },
  'whats-working': {
    label: "What's Working",
    description: 'Real tests, real data, real results from campaigns and strategies in the field.',
  },
  'operators-edge': {
    label: "Operator's Edge",
    description: 'Operational insights and hard-won lessons from running self-storage facilities day to day.',
  },
  'industry-takes': {
    label: 'Industry Takes',
    description: 'Analysis of market trends, REIT earnings, and what they mean for independent operators.',
  },
};

const markdownFiles = import.meta.glob('/content/blog/*.md', { query: '?raw', import: 'default', eager: true });

const authorFiles = import.meta.glob('/content/authors/*.json', { query: '?raw', import: 'default', eager: true });

function parsePost(raw: string): BlogPost | null {
  const { data, content } = parseFrontmatter(raw);
  if (data.draft) return null;

  return {
    slug: data.slug as string,
    title: data.title as string,
    date: String(data.date),
    updated: data.updated ? String(data.updated) : undefined,
    pillar: data.pillar as string,
    description: data.description as string,
    author: data.author as string,
    tags: (data.tags as string[]) || [],
    featured: (data.featured as boolean) || false,
    draft: (data.draft as boolean) || false,
    heroImage: data.heroImage as string | undefined,
    heroAlt: data.heroAlt as string | undefined,
    readingTime: getReadingTime(content),
    content,
  };
}

let _posts: BlogPost[] | null = null;

export function getAllPosts(): BlogPost[] {
  if (_posts) return _posts;

  const posts: BlogPost[] = [];
  for (const raw of Object.values(markdownFiles)) {
    const post = parsePost(raw as string);
    if (post) posts.push(post);
  }

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  _posts = posts;
  return posts;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}

export function getPostsByPillar(pillar: string): BlogPost[] {
  return getAllPosts().filter((p) => p.pillar === pillar);
}

export function getPostsByTag(tag: string): BlogPost[] {
  return getAllPosts().filter((p) => p.tags.includes(tag));
}

export function getFeaturedPosts(): BlogPost[] {
  return getAllPosts().filter((p) => p.featured);
}

export function getAdjacentPosts(slug: string): { prev?: BlogPost; next?: BlogPost } {
  const posts = getAllPosts();
  const idx = posts.findIndex((p) => p.slug === slug);
  return {
    prev: idx < posts.length - 1 ? posts[idx + 1] : undefined,
    next: idx > 0 ? posts[idx - 1] : undefined,
  };
}

export function getRelatedPosts(slug: string, limit = 3): BlogPost[] {
  const post = getPostBySlug(slug);
  if (!post) return [];
  return getAllPosts()
    .filter((p) => p.slug !== slug && p.pillar === post.pillar)
    .slice(0, limit);
}

export function getAuthor(name: string): Author | undefined {
  for (const raw of Object.values(authorFiles)) {
    const author = JSON.parse(raw as string) as Author;
    if (author.name === name) return author;
  }
  // fallback to default
  const defaultRaw = authorFiles['/content/authors/default.json'] as string;
  if (defaultRaw) return JSON.parse(defaultRaw) as Author;
  return undefined;
}

export function getAllTags(): string[] {
  const tags = new Set<string>();
  getAllPosts().forEach((p) => p.tags.forEach((t) => tags.add(t)));
  return Array.from(tags).sort();
}
