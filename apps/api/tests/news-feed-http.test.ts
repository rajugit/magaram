import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LookupAddress } from 'node:dns';
import { lookup } from 'node:dns/promises';
import { isPublicAddress, resolveFeedAddress } from '../src/news-feed-http.js';
vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));
const lookupAll = vi.mocked(
  lookup as (host: string, options: { all: true }) => Promise<LookupAddress[]>,
);
afterEach(() => vi.resetAllMocks());
describe('feed DNS destination checks', () => {
  it('rejects private answers even when a public answer is also present', async () => {
    lookupAll.mockResolvedValue([
      { address: '8.8.8.8', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);
    await expect(resolveFeedAddress('example.com')).rejects.toThrow('PRIVATE_SOURCE_DESTINATION');
  });
  it('returns the validated public address for connection pinning', async () => {
    lookupAll.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    await expect(resolveFeedAddress('example.com')).resolves.toEqual({
      address: '8.8.8.8',
      family: 4,
    });
  });
  it('rejects mapped loopback, link-local, reserved and multicast ranges', () => {
    for (const address of [
      '::ffff:127.0.0.1',
      '169.254.169.254',
      'fc00::1',
      'fe80::1',
      '224.0.0.1',
      '0.0.0.0',
      '2001:db8::1',
    ])
      expect(isPublicAddress(address)).toBe(false);
    expect(isPublicAddress('8.8.8.8')).toBe(true);
  });
});
