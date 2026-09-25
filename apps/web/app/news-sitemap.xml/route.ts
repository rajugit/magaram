import { getPublicNews, siteUrl } from '../_lib/public-data';

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export async function GET() {
  const news = await getPublicNews({ limit: 100 });
  const urls = news.items
    .filter((article) => {
      const published = new Date(article.publishedAt || article.updatedAt).getTime();
      return Number.isFinite(published) && published >= Date.now() - 48 * 60 * 60 * 1_000;
    })
    .map((article) => {
      const published = new Date(article.publishedAt || article.updatedAt).toISOString();
      const link = `${siteUrl}/news/${encodeURIComponent(article.slug)}`;
      return `<url>
  <loc>${link}</loc>
  <news:news>
    <news:publication>
      <news:name>மகரம் மீடியா</news:name>
      <news:language>ta</news:language>
    </news:publication>
    <news:publication_date>${published}</news:publication_date>
    <news:title>${escapeXml(article.title)}</news:title>
  </news:news>
</url>`;
    })
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
