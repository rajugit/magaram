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
