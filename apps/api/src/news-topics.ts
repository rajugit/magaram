import type { PrismaClient, NewsDiscoveryStatus, NewsGeography } from '@prisma/client';

const CLUSTER_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;
const MAX_CANDIDATES = 200;

const stopWords = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'by', 'for', 'from', 'in', 'is', 'of', 'on', 'or', 'the', 'to', 'with',
  'இது', 'அது', 'ஒரு', 'மற்றும்', 'என்று', 'என', 'இல்', 'க்கு', 'கள்', 'ன்', 'உள்ள', 'ஆகிய',
]);

export function headlineTokens(value: string): string[] {
  return [...new Set((value.toLocaleLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) || [])
    .filter((token) => token.length > 1 && !stopWords.has(token)))];
}

export function headlineSimilarity(left: string, right: string): number {
  const a = new Set(headlineTokens(left));
  const b = new Set(headlineTokens(right));
  if (!a.size || !b.size) return 0;
  const shared = [...a].filter((token) => b.has(token)).length;
  if (!shared) return 0;
  return shared / new Set([...a, ...b]).size;
}

function recencyScore(publishedAt: Date | null, discoveredAt: Date): number {
  const ageHours = Math.max(0, (Date.now() - (publishedAt ?? discoveredAt).getTime()) / 3_600_000);
  return Math.exp(-ageHours / 24);
}

function geographicRelevance(geography: NewsGeography): number {
  return { WORLD: 0.4, INDIA: 0.6, TAMIL_NADU: 0.8, CHENNAI: 0.95, DISTRICT: 1 }[geography];
}

export interface TrendSignals {
  publishedAt: Date | null;
  discoveredAt: Date;
  independentSourceCount: number;
  geography: NewsGeography;
  searchTrend?: number;
  engagement?: number;
}

export function calculateTrendScore(signals: TrendSignals): number {
  const values = [
    { weight: 30, value: recencyScore(signals.publishedAt, signals.discoveredAt) },
    { weight: 25, value: Math.min(1, signals.independentSourceCount / 5) },
    { weight: 20, value: geographicRelevance(signals.geography) },
    ...(signals.searchTrend === undefined ? [] : [{ weight: 15, value: Math.max(0, Math.min(1, signals.searchTrend)) }]),
    ...(signals.engagement === undefined ? [] : [{ weight: 10, value: Math.max(0, Math.min(1, signals.engagement)) }]),
  ];
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
  return Number(((values.reduce((sum, item) => sum + item.weight * item.value, 0) / totalWeight) * 100).toFixed(2));
}

export async function clusterDiscoveredNews(db: PrismaClient, limit = MAX_CANDIDATES) {
  const cutoff = new Date(Date.now() - CLUSTER_WINDOW_MS);
  const items = await db.discoveredNews.findMany({
    where: { clusterId: null, discoveredAt: { gte: cutoff } },
    orderBy: { discoveredAt: 'asc' },
    take: limit,
    select: { id: true, title: true, summary: true, publishedAt: true, discoveredAt: true, sourceId: true, geography: true, category: true, status: true },
  });
  let clustered = 0;
  for (const item of items) {
    const candidates = await db.newsTopicCluster.findMany({
      where: { geography: item.geography, category: item.category, latestUpdateAt: { gte: cutoff } },
      orderBy: { latestUpdateAt: 'desc' },
      take: 100,
      include: { discovered: { orderBy: { discoveredAt: 'desc' }, take: 20, select: { id: true, title: true, sourceId: true, publishedAt: true, discoveredAt: true } } },
    });
    const match = candidates.find((candidate) => candidate.discovered.some((related) => headlineSimilarity(item.title, related.title) >= 0.35));
    const selectedId = match?.id ?? (await db.newsTopicCluster.create({ data: { canonicalTopic: item.title, geography: item.geography, category: item.category } })).id;
    await db.discoveredNews.update({ where: { id: item.id }, data: { clusterId: selectedId } });
    const related = await db.discoveredNews.findMany({ where: { clusterId: selectedId }, select: { sourceId: true, publishedAt: true, discoveredAt: true } });
    const sourceCount = new Set(related.map((entry) => entry.sourceId)).size;
    const verificationStatus: NewsDiscoveryStatus = sourceCount >= 2 ? 'PENDING_VERIFICATION' : 'DISCOVERED';
    await db.$transaction([
      db.discoveredNews.updateMany({ where: { clusterId: selectedId, status: 'DISCOVERED' }, data: { status: verificationStatus } }),
      db.newsTopicCluster.update({ where: { id: selectedId }, data: {
        latestUpdateAt: new Date(),
        verificationStatus,
        trendScore: calculateTrendScore({
          publishedAt: related.reduce<Date | null>((latest, entry) => !latest || (entry.publishedAt && entry.publishedAt > latest) ? entry.publishedAt : latest, null),
          discoveredAt: related.reduce((earliest, entry) => entry.discoveredAt < earliest ? entry.discoveredAt : earliest, new Date()),
          independentSourceCount: sourceCount,
          geography: item.geography,
        }),
      } }),
    ]);
    clustered += 1;
  }
  return { clustered, inspected: items.length };
}
