import type { Metadata } from 'next';

import { NewsIndex } from '../../../_components/public-site';
import { getPublicNews } from '../../../_lib/public-data';

export const dynamic = 'force-dynamic';

function decodeSegment(value: string) {
  return decodeURIComponent(value).trim().slice(0, 100);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const category = decodeSegment((await params).category);
  return {
    title: `${category} செய்திகள்`,
    description: `${category} தொடர்பான மகரம் மீடியாவின் வெளியிடப்பட்ட தமிழ் செய்திகள்.`,
    alternates: { canonical: `/news/category/${encodeURIComponent(category)}` },
  };
}

export default async function CategoryArchive({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const category = decodeSegment((await params).category);
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page || '1', 10) || 1);
  const q = query.q?.trim().slice(0, 200) || undefined;
  return (
    <NewsIndex
      news={await getPublicNews({ page, limit: 18, category, q })}
      category={category}
      q={q}
      basePath={`/news/category/${encodeURIComponent(category)}`}
    />
  );
}
