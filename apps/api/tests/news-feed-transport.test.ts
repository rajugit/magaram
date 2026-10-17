import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchFeed, MAX_FEED_BYTES } from '../src/news-feed-http.js';
const transport = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('node:http', () => ({ request: transport.request }));
vi.mock('node:https', () => ({ request: transport.request }));
afterEach(() => vi.resetAllMocks());
function respond(status: number, headers: Record<string, string>, chunks: Buffer[] = []) {
  const res = Object.assign(new EventEmitter(), { statusCode: status, headers, destroy: vi.fn() });
  transport.request.mockImplementation(
    (_url: unknown, _options: unknown, receive: (response: typeof res) => void) =>
      Object.assign(new EventEmitter(), {
        end() {
          receive(res);
          queueMicrotask(() => {
            for (const chunk of chunks) {
              if (!res.destroy.mock.calls.length) res.emit('data', chunk);
            }
            if (!res.destroy.mock.calls.length) res.emit('end');
          });
        },
      }),
  );
  return res;
}
describe('bounded feed transport', () => {
  it('rejects a redirect into the private network before a second request', async () => {
    respond(302, { location: 'http://169.254.169.254/latest/meta-data/' });
    await expect(fetchFeed(new URL('https://example.com/rss'))).rejects.toThrow('not allowed');
    expect(transport.request).toHaveBeenCalledTimes(1);
  });
  it('stops a streamed oversized response even without content-length', async () => {
    const res = respond(200, {}, [Buffer.alloc(MAX_FEED_BYTES), Buffer.from('x')]);
    await expect(fetchFeed(new URL('https://example.com/rss'))).rejects.toThrow('FEED_TOO_LARGE');
    expect(res.destroy).toHaveBeenCalled();
  });
  it('rejects declared oversized bodies and bounds redirect chains', async () => {
    respond(200, { 'content-length': String(MAX_FEED_BYTES + 1) });
    await expect(fetchFeed(new URL('https://example.com/rss'))).rejects.toThrow('FEED_TOO_LARGE');
    transport.request.mockClear();
    respond(302, { location: '/loop' });
    await expect(fetchFeed(new URL('https://example.com/rss'))).rejects.toThrow(
      'TOO_MANY_REDIRECTS',
    );
    expect(transport.request).toHaveBeenCalledTimes(4);
  });
});
