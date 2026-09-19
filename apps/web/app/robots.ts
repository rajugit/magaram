import type { MetadataRoute } from 'next';

import { siteUrl } from './_lib/public-data';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/login', '/preview/', '/reset-password'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
