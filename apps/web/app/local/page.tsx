import Link from 'next/link';
import { PublicHeader, PublicFooter } from '../_components/public-site';
import { LocalDirectory } from '../_components/local-directory';
import { getPublicBusinesses } from '../_lib/public-data';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'உள்ளூர் நிறுவனங்கள்',
  description: 'உங்கள் ஊரின் சரிபார்க்கப்பட்ட நிறுவனங்கள் மற்றும் சலுகைகள்.',
  alternates: { canonical: '/local' },
};
export default async function LocalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const input = await searchParams;
  const query = new URLSearchParams();
  for (const key of ['q', 'location', 'category']) {
    const value = input[key];
    if (typeof value === 'string' && value.trim())
      query.set(key, value.trim().slice(0, key === 'q' ? 180 : 100));
  }
  const page = Math.min(
    10000,
    Math.max(1, Number.parseInt(typeof input.page === 'string' ? input.page : '1', 10) || 1),
  );
  query.set('page', String(page));
  const data = await getPublicBusinesses(query);
  const pageLink = (value: number) => {
    const next = new URLSearchParams(query);
    next.set('page', String(value));
    return `/local?${next}`;
  };
  return (
    <div className="public-shell">
      <PublicHeader />
      <main id="content" className="public-main news-index">
        <header className="section-intro">
          <p className="section-kicker">உள்ளூர்</p>
          <h1>உள்ளூர் நிறுவனங்கள்</h1>
          <p>
            சரிபார்க்கப்பட்ட நிறுவனங்கள் மற்றும் தற்போது கிடைக்கும் சலுகைகள். பட்டியலில் இடம்பெறுவது
            சேவைத் தரத்திற்கான உத்தரவாதம் அல்ல.
          </p>
          <form
            method="get"
            className="local-search"
            role="search"
            aria-label="நிறுவனங்களைத் தேடுங்கள்"
          >
            <label>
              நிறுவனப் பெயர்
              <input name="q" defaultValue={query.get('q') || ''} maxLength={180} />
            </label>
            <label>
              ஊர் / மாவட்டம்
              <input name="location" defaultValue={query.get('location') || ''} maxLength={100} />
            </label>
            <label>
              வகை
              <input name="category" defaultValue={query.get('category') || ''} maxLength={100} />
            </label>
            <button type="submit">தேடுங்கள்</button>
            <Link href="/local">அனைத்தும்</Link>
          </form>
        </header>
        <LocalDirectory items={data?.items || []} unavailable={!data} />
        <nav className="pagination" aria-label="நிறுவனப் பக்கங்கள்">
          {data && page > 1 && <Link href={pageLink(page - 1)}>← முந்தையது</Link>}
          {data && page * data.limit < data.total && (
            <Link href={pageLink(page + 1)}>அடுத்தது →</Link>
          )}
        </nav>
      </main>
      <PublicFooter />
    </div>
  );
}
