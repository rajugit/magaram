import type { MetadataRoute } from 'next';

import { siteUrl } from './_lib/public-data';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/news`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/trust`, changeFrequency: 'monthly', priority: 0.6 },
  ];
}
