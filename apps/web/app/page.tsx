import { PublicHome } from './_components/public-site';
import { getPublicNews } from './_lib/public-data';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  return <PublicHome news={await getPublicNews({ limit: 7 })} />;
}
