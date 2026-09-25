import Link from 'next/link';
import { LocalDirectory } from '../../../_components/local-directory';
import { PublicHeader, PublicFooter } from '../../../_components/public-site';
import { notFound } from 'next/navigation';
import { Workspace } from '../../../_components/workspace';
import {
  NewsIndex,
  PublicArticlePage,
  PublicHome,
  TrustPage,
} from '../../../_components/public-site';
import { demoArticles } from '../../../_lib/data';
import Login from '../../../login/page';

export function generateStaticParams() {
  return [
    { phase: '1', screen: [] },
    { phase: '3', screen: [] },
    { phase: '7', screen: [] },
    { phase: '7', screen: ['workspace'] },
    ...[
      [],
      ['news'],
      ['trust'],
      ...demoArticles
        .filter((article) => article.status === 'PUBLISHED')
        .map((article) => ['news', article.slug]),
    ].map((screen) => ({ phase: '4', screen })),
    ...[
      [],
      ['articles'],
      ['articles', 'new'],
      ['articles', 'demo-4'],
      ['review'],
      ['media'],
      ['settings'],
    ].map((screen) => ({ phase: '2', screen })),
  ];
}
export const dynamicParams = false;
export default async function PhasePreview({
  params,
}: {
  params: Promise<{ phase: string; screen?: string[] }>;
}) {
  const { phase, screen = [] } = await params;
  if (phase === '1') return <Login />;
  if (phase === '2') return <Workspace path={screen} initialPreview />;
  if (phase === '3') return <Workspace path={['ai']} initialPreview />;
  if (phase === '7') {
    if (screen[0] === 'workspace') return <Workspace path={['businesses']} initialPreview />;
    return (
      <div className="public-shell">
        <PublicHeader />
        <main id="content" className="public-main news-index">
          <header className="section-intro">
            <p className="section-kicker">மகரம் உள்ளூர் · முன்னோட்டம்</p>
            <h1>உங்கள் ஊரின் நிறுவனங்கள்</h1>
            <p>வணிகப் பட்டியல் செய்தி ஆதரவு அல்லது சேவைத் தரத்திற்கான உத்தரவாதம் அல்ல.</p>
            <Link href="/preview/7/workspace">Staff workflow preview →</Link>
          </header>
          <LocalDirectory
            demo
            items={[
              {
                id: 'sample-bookshop',
                name: 'மாதிரி புத்தக நிலையம்',
                description:
                  'தமிழ் நூல்கள் மற்றும் பள்ளி மாணவர்களுக்கான புத்தகங்கள். இது வடிவமைப்பிற்கான மாதிரித் தகவல் மட்டுமே.',
                category: 'புத்தகங்கள்',
                location: 'மதுரை',
                phone: null,
                website: null,
                offers: [
                  {
                    id: 'sample-offer',
                    title: 'மாதிரி வாசிப்பு விழா சலுகை',
                    description: 'தேர்ந்தெடுக்கப்பட்ட தமிழ் நூல்களுக்கான மாதிரி சலுகை.',
                    terms: 'மாதிரித் தகவல். வாங்குவதற்கான உண்மையான சலுகை அல்ல.',
                    endsAt: '2026-12-31T18:29:00.000Z',
                  },
                ],
              },
            ]}
          />
        </main>
        <PublicFooter />
      </div>
    );
  }
  if (phase === '4') {
    const items = demoArticles.filter((article) => article.status === 'PUBLISHED');
    if (screen[0] === 'news' && screen[1]) {
      const article = items.find((item) => item.slug === screen[1]);
      if (!article) notFound();
      return <PublicArticlePage article={article} pathPrefix="/preview/4" />;
    }
    if (screen[0] === 'news')
      return (
        <NewsIndex
          news={{ items, total: items.length, page: 1, limit: items.length }}
          pathPrefix="/preview/4"
        />
      );
    if (screen[0] === 'trust') return <TrustPage pathPrefix="/preview/4" />;
    return (
      <PublicHome
        preview
        news={{ items, total: items.length, page: 1, limit: items.length }}
        pathPrefix="/preview/4"
      />
    );
  }
  notFound();
}
