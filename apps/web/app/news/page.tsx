import type { Metadata } from 'next';

import { NewsIndex } from '../_components/public-site';
import { getPublicNews } from '../_lib/public-data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'செய்திகள்',
  description: 'மகரம் மீடியாவின் வெளியிடப்பட்ட தமிழ் செய்திகள் மற்றும் உள்ளூர் பார்வைகள்.',
  alternates: { canonical: '/news' },
};

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const { page: pageInput, category: categoryInput } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageInput || '1', 10) || 1);
  const category = categoryInput?.trim().slice(0, 100) || undefined;
  return (
    <NewsIndex news={await getPublicNews({ page, limit: 18, category })} category={category} />
  );
}
