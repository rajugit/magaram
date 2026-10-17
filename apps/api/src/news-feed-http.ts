import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';
import { ApiError } from './api-response.js';

export const MAX_FEED_BYTES = 2_000_000;
export function isPublicAddress(address: string): boolean {
  try {
    const parsed = ipaddr.process(address);
    return parsed.range() === 'unicast';
  } catch {
    return false;
  }
}
export function validateFeedUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError(422, 'INVALID_SOURCE_URL', 'Source URL must be a valid HTTP(S) URL.');
  }
  const host = url.hostname
    .replace(/^\[|\]$/g, '')
    .toLowerCase()
    .replace(/\.$/, '');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !['80', '443'].includes(url.port)) ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    (isIP(host) && !isPublicAddress(host))
  )
    throw new ApiError(422, 'INVALID_SOURCE_URL', 'Source URL is not allowed.');
  return url;
}

// Validate every answer and pin the connection to one checked IP; a second DNS
// lookup at connect time would permit DNS rebinding. TLS still verifies the hostname.
export async function resolveFeedAddress(host: string) {
  const addresses = await lookup(host.replace(/^\[|\]$/g, ''), { all: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address)))
    throw new Error('PRIVATE_SOURCE_DESTINATION');
  return addresses.find(({ family }) => family === 4) ?? addresses[0];
}

export async function fetchFeed(
  url: URL,
): Promise<{ xml: string; finalUrl: string; httpStatus: number }> {
  let current = validateFeedUrl(url.toString());
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await new Promise<{ status: number; location?: string; body: string }>(
      (resolve, reject) => {
        const signal = AbortSignal.timeout(15_000);
        const req = (current.protocol === 'https:' ? httpsRequest : httpRequest)(
          current,
          {
            agent: false,
            signal,
            headers: {
              accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
              'accept-encoding': 'identity',
            },
            lookup: (_hostname, _options, callback) => {
              resolveFeedAddress(current.hostname).then(
                ({ address, family }) => {
                  // Node's networking layer requests all addresses when autoSelectFamily is on.
                  if (_options.all) callback(null, [{ address, family }]);
                  else callback(null, address, family);
                },
                () => callback(new Error('PRIVATE_SOURCE_DESTINATION'), '', 4),
              );
            },
          },
          (res) => {
            const status = res.statusCode ?? 0;
            if ([301, 302, 303, 307, 308].includes(status)) {
              resolve({ status, location: res.headers.location, body: '' });
              res.destroy();
              return;
            }
            if (status < 200 || status >= 300) {
              reject(new Error(`HTTP_${status}`));
              res.destroy();
              return;
            }
            if (Number(res.headers['content-length'] || 0) > MAX_FEED_BYTES) {
              reject(new Error('FEED_TOO_LARGE'));
              res.destroy();
              return;
            }
            const chunks: Buffer[] = [];
            let bytes = 0;
            res.on('data', (chunk: Buffer) => {
              bytes += chunk.length;
              if (bytes > MAX_FEED_BYTES) {
                reject(new Error('FEED_TOO_LARGE'));
                res.destroy();
              } else chunks.push(chunk);
            });
            res.on('error', reject);
            res.on('end', () => resolve({ status, body: Buffer.concat(chunks).toString('utf8') }));
          },
        );
        req.on('error', reject);
        req.end();
      },
    );
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.location) throw new Error('REDIRECT_WITHOUT_LOCATION');
      current = validateFeedUrl(new URL(response.location, current).toString());
      continue;
    }
    return { xml: response.body, finalUrl: current.toString(), httpStatus: response.status };
  }
  throw new Error('TOO_MANY_REDIRECTS');
}
