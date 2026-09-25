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
  params: Promise<{ location: string }>;
}): Promise<Metadata> {
  const location = decodeSegment((await params).location);
  return {
    title: `${location} செய்திகள்`,
    description: `${location} தொடர்பான மகரம் மீடியாவின் வெளியிடப்பட்ட தமிழ் செய்திகள்.`,
    alternates: { canonical: `/news/location/${encodeURIComponent(location)}` },
  };
}

export default async function LocationArchive({
  params,
  searchParams,
}: {
  params: Promise<{ location: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const location = decodeSegment((await params).location);
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page || '1', 10) || 1);
  const q = query.q?.trim().slice(0, 200) || undefined;
  return (
    <NewsIndex
      news={await getPublicNews({ page, limit: 18, location, q })}
      location={location}
      q={q}
      basePath={`/news/location/${encodeURIComponent(location)}`}
    />
  );
}
