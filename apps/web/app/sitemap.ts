import type { MetadataRoute } from 'next';

import { getPublicNews, siteUrl } from './_lib/public-data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const news = await getPublicNews({ limit: 100 });
  return [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/news`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/local`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${siteUrl}/trust`, changeFrequency: 'monthly', priority: 0.6 },
    ...news.items.map((article) => ({
      url: `${siteUrl}/news/${encodeURIComponent(article.slug)}`,
      lastModified: article.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ];
}
