import { cache } from 'react';

export const siteUrl = 'https://magarammedia.in';

export type PublicArticle = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  type: string;
  category: string;
  location: string;
  tags: string[];
  sponsored: boolean;
  publishedAt: string | null;
  updatedAt: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  author: { displayName: string };
  image?: { id: string; alt: string; credit: string } | null;
  corrections: { id: string; reason: string; createdAt: string }[];
};

export type PublicNewsPage = {
  items: PublicArticle[];
  total: number;
  page: number;
  limit: number;
};

type ApiEnvelope<T> = { success: true; data: T };

const apiOrigin = process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000';

async function publicRequest<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${apiOrigin}/api/v1${path}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as ApiEnvelope<T>;
    return payload.success ? payload.data : null;
  } catch {
    return null;
  }
}

export const getPublicNews = cache(
  async (
    input: {
      page?: number;
      limit?: number;
      category?: string;
    } = {},
  ): Promise<PublicNewsPage> => {
    const query = new URLSearchParams({
      page: String(input.page || 1),
      limit: String(input.limit || 20),
    });
    if (input.category) query.set('category', input.category);
    return (
      (await publicRequest<PublicNewsPage>(`/news?${query.toString()}`)) || {
        items: [],
        total: 0,
        page: input.page || 1,
        limit: input.limit || 20,
      }
    );
  },
);

export const getPublicArticle = cache(async (slug: string): Promise<PublicArticle | null> =>
  publicRequest<PublicArticle>(`/news/${encodeURIComponent(slug)}`),
);

export function formatPublishedDate(value: string | null | undefined) {
  if (!value) return 'வெளியீட்டு தேதி விரைவில்';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'வெளியீட்டு தேதி விரைவில்';
  return new Intl.DateTimeFormat('ta-IN', { dateStyle: 'long' }).format(date);
}

export function escapeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
