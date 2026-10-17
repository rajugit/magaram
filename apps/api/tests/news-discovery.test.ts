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

  it('rejects HTML, malformed XML, DTDs and unsafe story links while allowing a valid empty feed', () => {
    for (const xml of [
      '<html><body>Object moved</body></html>',
      '<rss><channel></rss>',
      '<!DOCTYPE rss [<!ENTITY x "unsafe">]><rss><channel/></rss>',
      '<rss><channel><item><title>Story</title><link>javascript:alert(1)</link></item></channel></rss>',
      '<rss><channel><item><title>Story without link</title></item></channel></rss>',
    ])
      expect(() => parseRssOrAtom(xml, 'https://example.com')).toThrow();
    expect(parseRssOrAtom('<rss><channel/></rss>', 'https://example.com')).toEqual([]);
  });
  it('parses namespaced Atom alternate links and preserves numeric headlines', () => {
    const items = parseRssOrAtom(
      '<atom:feed xmlns:atom="http://www.w3.org/2005/Atom"><atom:entry><atom:title>123</atom:title><atom:link rel="self" href="/api/1"/><atom:link rel="alternate" href="/news/1"/><atom:summary>தமிழ் &amp; news</atom:summary></atom:entry></atom:feed>',
      'https://example.com',
    );
    expect(items[0]).toMatchObject({
      title: '123',
      canonicalUrl: 'https://example.com/news/1',
      summary: 'தமிழ் & news',
    });
  });
  it('accepts public HTTP(S) URLs and blocks private destinations', () => {
    expect(validateFeedUrl('https://example.com/feed').hostname).toBe('example.com');
    expect(() => validateFeedUrl('http://127.0.0.1/feed')).toThrow('not allowed');
    expect(() => validateFeedUrl('file:///tmp/feed.xml')).toThrow('not allowed');
    for (const url of [
      'http://[::1]/',
      'http://[::ffff:127.0.0.1]/',
      'http://[fc00::1]/',
      'http://169.254.169.254/',
      'http://2130706433/',
      'https://user:pass@example.com/',
      'http://example.com:3306/',
      'http://100.64.0.1/',
    ])
      expect(() => validateFeedUrl(url)).toThrow('not allowed');
  });
});
