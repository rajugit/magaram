import { createHash } from 'node:crypto';
import type { PrismaClient, NewsSource, NewsSourceLanguage } from '@prisma/client';

export { validateFeedUrl } from './news-feed-http.js';
import { fetchFeed, validateFeedUrl, MAX_FEED_BYTES } from './news-feed-http.js';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
const MAX_ITEMS = 100;

export interface ParsedFeedItem {
  externalId?: string;
  canonicalUrl: string;
  title: string;
  summary?: string;
  publishedAt?: Date;
}
const asList = (value: unknown): unknown[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown): string =>
  typeof value === 'string'
    ? value.trim()
    : typeof record(value)['#text'] === 'string'
      ? String(record(value)['#text']).trim()
      : '';

export function parseRssOrAtom(xml: string, baseUrl: string): ParsedFeedItem[] {
  if (Buffer.byteLength(xml) > MAX_FEED_BYTES) throw new Error('FEED_TOO_LARGE');
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true)
    throw new Error('INVALID_FEED');
  const document = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    parseTagValue: false,
    parseAttributeValue: false,
  }).parse(xml);
  const roots = Object.keys(document).filter((key) => !key.startsWith('?'));
  if (roots.length !== 1 || !['rss', 'feed'].includes(roots[0])) throw new Error('INVALID_FEED');
  const atom = roots[0] === 'feed';
  if (!atom && !Object.hasOwn(record(document.rss), 'channel')) throw new Error('INVALID_FEED');
  const entries = asList(
    atom ? record(document.feed).entry : record(record(document.rss).channel).item,
  );
  const items: ParsedFeedItem[] = [];
  for (const value of entries.slice(0, MAX_ITEMS)) {
    const entry = record(value);
    const title = text(entry.title);
    const link = atom
      ? asList(entry.link)
          .map(record)
          .find((link) => !link['@_rel'] || link['@_rel'] === 'alternate')?.['@_href']
      : text(entry.link);
    if (!title || typeof link !== 'string' || !link) throw new Error('INVALID_FEED_ITEM');
    let canonicalUrl: string;
    try {
      canonicalUrl = validateFeedUrl(new URL(link, baseUrl).toString()).toString();
    } catch {
      throw new Error('INVALID_FEED_ITEM');
    }
    if (canonicalUrl.length > 1000) throw new Error('INVALID_FEED_ITEM');
    const dateText = text(entry.pubDate || entry.published || entry.updated);
    const date = dateText ? new Date(dateText) : undefined;
    items.push({
      title: title.slice(0, 500),
      canonicalUrl,
      externalId: text(entry.guid || entry.id).slice(0, 500) || undefined,
      summary: text(entry.description || entry.summary).slice(0, 20_000) || undefined,
      publishedAt: date && !Number.isNaN(date.valueOf()) ? date : undefined,
    });
  }
  return items;
}

function hashItem(sourceId: string, item: ParsedFeedItem): string {
  return createHash('sha256')
    .update(`${sourceId}\n${item.canonicalUrl}\n${item.title.trim().toLocaleLowerCase()}`)
    .digest('hex');
}

export async function ingestNewsSource(
  db: PrismaClient,
  source: NewsSource,
  actor?: { id: string; requestId: string },
) {
  const fetchRecord = await db.$transaction(async (tx) => {
    const attempt = await tx.newsSourceFetch.create({
      data: { sourceId: source.id, status: 'RUNNING' },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor?.id,
        requestId: actor?.requestId,
        action: 'news.source.fetch.started',
        entityType: 'NewsSource',
        entityId: source.id,
        metadata: { fetchId: attempt.id, trigger: actor ? 'manual' : 'worker' },
      },
    });
    return attempt;
  });
  try {
    const result = await fetchFeed(validateFeedUrl(source.url));
    const items = parseRssOrAtom(result.xml, result.finalUrl);
    let processed = 0;
    for (const item of items) {
      const dedupeKey = hashItem(source.id, item);
      const created = await db.discoveredNews.upsert({
        where: { dedupeKey },
        create: {
          sourceId: source.id,
          dedupeKey,
          externalId: item.externalId,
          canonicalUrl: item.canonicalUrl,
          title: item.title,
          summary: item.summary,
          publishedAt: item.publishedAt,
          language: source.language as NewsSourceLanguage,
          geography: source.geography,
          category: source.category,
          rawPayload: JSON.parse(JSON.stringify(item)),
        },
        update: {
          summary: item.summary,
          publishedAt: item.publishedAt,
          rawPayload: JSON.parse(JSON.stringify(item)),
        },
      });
      void created;
      processed += 1;
    }
    await db.$transaction([
      db.newsSourceFetch.update({
        where: { id: fetchRecord.id },
        data: {
          status: 'SUCCEEDED',
          completedAt: new Date(),
          httpStatus: result.httpStatus,
          itemCount: items.length,
        },
      }),
      db.newsSource.update({
        where: { id: source.id },
        data: { lastSuccessfulFetch: new Date(), errorCount: 0 },
      }),
      db.auditLog.create({
        data: {
          actorId: actor?.id,
          requestId: actor?.requestId,
          action: 'news.source.fetch.succeeded',
          entityType: 'NewsSource',
          entityId: source.id,
          metadata: { fetchId: fetchRecord.id, itemCount: items.length },
        },
      }),
    ]);
    return { itemCount: items.length, processed };
  } catch (error) {
    const allowed =
      /^(INVALID_FEED|INVALID_FEED_ITEM|FEED_TOO_LARGE|PRIVATE_SOURCE_DESTINATION|REDIRECT_WITHOUT_LOCATION|TOO_MANY_REDIRECTS|HTTP_\d{3})$/;
    const code =
      error instanceof Error && allowed.test(error.message) ? error.message : 'FETCH_FAILED';
    await db.$transaction([
      db.newsSourceFetch.update({
        where: { id: fetchRecord.id },
        data: { status: 'FAILED', completedAt: new Date(), errorCode: code },
      }),
      db.newsSource.update({ where: { id: source.id }, data: { errorCount: { increment: 1 } } }),
      db.auditLog.create({
        data: {
          actorId: actor?.id,
          requestId: actor?.requestId,
          action: 'news.source.fetch.failed',
          entityType: 'NewsSource',
          entityId: source.id,
          metadata: { fetchId: fetchRecord.id, errorCode: code },
        },
      }),
    ]);
    throw error;
  }
}
