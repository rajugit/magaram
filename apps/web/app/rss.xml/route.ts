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
  const news = await getPublicNews({ limit: 50 });
  const items = news.items
    .map(
      (article) => `<item>
  <title>${escapeXml(article.title)}</title>
  <link>${siteUrl}/news/${encodeURIComponent(article.slug)}</link>
  <guid isPermaLink="true">${siteUrl}/news/${encodeURIComponent(article.slug)}</guid>
  <description>${escapeXml(article.summary)}</description>
  <pubDate>${new Date(article.publishedAt || article.updatedAt).toUTCString()}</pubDate>
</item>`,
    )
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>மகரம் மீடியா</title>
  <link>${siteUrl}</link>
  <description>நம்பகமான தமிழ் செய்திகளும் உள்ளூர் பார்வைகளும்.</description>
  <language>ta-IN</language>
${items}
</channel>
</rss>`;
  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
