import { describe, expect, it } from 'vitest';
import { parseRssOrAtom, validateFeedUrl } from '../src/news-discovery.js';

describe('news discovery feed safety', () => {
  it('parses RSS and Atom entries without treating feed text as instructions', () => {
    const items = parseRssOrAtom(
      `<rss><channel><item><guid>one</guid><title><![CDATA[தமிழ்நாடு செய்தி]]></title><link>/story/1</link><description>Summary</description><pubDate>Wed, 08 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>`,
      'https://example.com/feed.xml',
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      externalId: 'one',
      canonicalUrl: 'https://example.com/story/1',
      title: 'தமிழ்நாடு செய்தி',
      summary: 'Summary',
    });
  });

  it('accepts public HTTP(S) URLs and blocks private destinations', () => {
    expect(validateFeedUrl('https://example.com/feed').hostname).toBe('example.com');
    expect(() => validateFeedUrl('http://127.0.0.1/feed')).toThrow('not allowed');
    expect(() => validateFeedUrl('file:///tmp/feed.xml')).toThrow('not allowed');
  });
});
