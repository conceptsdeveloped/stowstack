import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const SITE_URL = 'https://stowstack.co';
const CONTENT_DIR = path.resolve('content/blog');
const OUTPUT = path.resolve('dist/sitemap.xml');

const PILLARS = ['operator-math', 'whats-working', 'operators-edge', 'industry-takes'];

function generateSitemap() {
  const posts = [];
  const tags = new Set();

  if (fs.existsSync(CONTENT_DIR)) {
    for (const file of fs.readdirSync(CONTENT_DIR)) {
      if (!file.endsWith('.md')) continue;
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
      const { data } = matter(raw);
      if (data.draft) continue;
      posts.push(data);
      (data.tags || []).forEach((t) => tags.add(t));
    }
  }

  const urls = [
    { loc: `${SITE_URL}/blog`, priority: '0.8' },
    ...PILLARS.map((p) => ({ loc: `${SITE_URL}/blog/${p}`, priority: '0.6' })),
    ...posts.map((p) => ({
      loc: `${SITE_URL}/blog/${p.slug}`,
      lastmod: p.updated || p.date,
      priority: '0.7',
    })),
    ...Array.from(tags).map((t) => ({ loc: `${SITE_URL}/blog/tag/${t}`, priority: '0.4' })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc><priority>1.0</priority></url>
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`
  )
  .join('\n')}
</urlset>`;

  fs.writeFileSync(OUTPUT, xml);
  console.log(`Sitemap generated: ${OUTPUT} (${urls.length + 1} URLs)`);
}

generateSitemap();
