import { PublicHome } from './_components/public-site';
import { getPublicDiscovery, getPublicNews } from './_lib/public-data';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [news, discovery] = await Promise.all([getPublicNews({ limit: 7 }), getPublicDiscovery()]);
  return <PublicHome news={news} locations={discovery?.locations || []} />;
}
