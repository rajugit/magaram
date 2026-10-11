import { createHash } from 'node:crypto';
import type { PrismaClient, NewsSource, NewsSourceLanguage } from '@prisma/client';
import { ApiError } from './api-response.js';

const MAX_FEED_BYTES = 2_000_000;
const MAX_ITEMS = 100;

export interface ParsedFeedItem {
  externalId?: string;
  canonicalUrl: string;
  title: string;
  summary?: string;
  publishedAt?: Date;
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function tagValue(block: string, tag: string): string | undefined {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
  return match?.[1] ? decodeXml(match[1]) : undefined;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed;
}

export function parseRssOrAtom(xml: string, baseUrl: string): ParsedFeedItem[] {
  const blocks = [
    ...Array.from(xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)).map((m) => m[1]),
    ...Array.from(xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)).map((m) => m[1]),
  ];
  const items: ParsedFeedItem[] = [];
  for (const block of blocks.slice(0, MAX_ITEMS)) {
    const title = tagValue(block, 'title');
    const linkValue = tagValue(block, 'link') || block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1];
    if (!title || !linkValue) continue;
    let canonicalUrl: string;
    try {
      canonicalUrl = new URL(decodeXml(linkValue), baseUrl).toString();
    } catch {
      continue;
    }
    const externalId = tagValue(block, 'guid') || tagValue(block, 'id');
    items.push({
      externalId,
      canonicalUrl,
      title: title.slice(0, 500),
      summary: (tagValue(block, 'description') || tagValue(block, 'summary'))?.slice(0, 20_000),
      publishedAt: parseDate(tagValue(block, 'pubDate') || tagValue(block, 'published') || tagValue(block, 'updated')),
    });
  }
  return items;
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return (
    host === 'localhost' ||
    host === 'localhost.localdomain' ||
    host === '::1' ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('169.254.') ||
    host.startsWith('172.16.') ||
    host.startsWith('172.17.') ||
    host.startsWith('172.18.') ||
    host.startsWith('172.19.') ||
    host.startsWith('172.2') ||
    host.startsWith('172.30.') ||
    host.startsWith('172.31.') ||
    host === '0.0.0.0'
  );
}

export function validateFeedUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError(422, 'INVALID_SOURCE_URL', 'Source URL must be a valid HTTP(S) URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || isBlockedHostname(url.hostname))
    throw new ApiError(422, 'INVALID_SOURCE_URL', 'Source URL is not allowed.');
  return url;
}

async function fetchFeed(url: URL): Promise<{ xml: string; finalUrl: string; httpStatus: number }> {
  let current = url;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(current, {
      headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('REDIRECT_WITHOUT_LOCATION');
      current = validateFeedUrl(new URL(location, current).toString());
      continue;
    }
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const length = Number(response.headers.get('content-length') || 0);
    if (length > MAX_FEED_BYTES) throw new Error('FEED_TOO_LARGE');
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_FEED_BYTES) throw new Error('FEED_TOO_LARGE');
    return { xml: buffer.toString('utf8'), finalUrl: current.toString(), httpStatus: response.status };
  }
  throw new Error('TOO_MANY_REDIRECTS');
}

function hashItem(sourceId: string, item: ParsedFeedItem): string {
  return createHash('sha256')
    .update(`${sourceId}\n${item.canonicalUrl}\n${item.title.trim().toLocaleLowerCase()}`)
    .digest('hex');
}

export async function ingestNewsSource(db: PrismaClient, source: NewsSource) {
  const fetchRecord = await db.newsSourceFetch.create({ data: { sourceId: source.id, status: 'RUNNING' } });
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
      db.newsSourceFetch.update({ where: { id: fetchRecord.id }, data: { status: 'SUCCEEDED', completedAt: new Date(), httpStatus: result.httpStatus, itemCount: items.length } }),
      db.newsSource.update({ where: { id: source.id }, data: { lastSuccessfulFetch: new Date(), errorCount: 0 } }),
    ]);
    return { itemCount: items.length, processed };
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 80) : 'FETCH_FAILED';
    await db.$transaction([
      db.newsSourceFetch.update({ where: { id: fetchRecord.id }, data: { status: 'FAILED', completedAt: new Date(), errorCode: code } }),
      db.newsSource.update({ where: { id: source.id }, data: { errorCount: { increment: 1 } } }),
    ]);
    throw error;
  }
}
