import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PublicArticlePage } from '../../_components/public-site';
import { getPublicArticle, siteUrl, storyImageUrl } from '../../_lib/public-data';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublicArticle(slug);
  if (!article) return { title: 'கட்டுரை கிடைக்கவில்லை', robots: { index: false, follow: false } };
  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.summary;
  const url = `${siteUrl}/news/${article.slug}`;
  return {
    title,
    description,
    keywords: article.tags,
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${siteUrl}${storyImageUrl(article)}`],
    },
    alternates: { canonical: `/news/${article.slug}` },
    openGraph: {
      type: 'article',
      images: [
        {
          url: `${siteUrl}${storyImageUrl(article)}`,
          alt: article.image?.alt || 'செய்தி அட்டை · நிகழ்வுப் புகைப்படம் அல்ல',
        },
      ],
      title,
      description,
      url,
      publishedTime: article.publishedAt || article.updatedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author.displayName],
      locale: 'ta_IN',
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublicArticle(slug);
  if (!article) notFound();
  return <PublicArticlePage article={article} />;
}
