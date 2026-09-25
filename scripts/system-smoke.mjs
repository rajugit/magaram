// Read-only service checks plus optional local sign-in/logout. Never prints cookies or records.
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const origin = new URL(args[0] || 'http://localhost:3000');
const apiOrigin = new URL(args[1] && !args[1].startsWith('--') ? args[1] : origin);
const localAuth = args.includes('--local-auth');
const local = (url) => ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
if (
  ![origin, apiOrigin].every(
    (url) =>
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      url.pathname === '/',
  )
)
  throw new Error('Use HTTP(S) origins without credentials or paths.');
if (localAuth && (!local(origin) || !local(apiOrigin)))
  throw new Error('Local credentials may only be used with loopback origins.');
if (localAuth) loadEnvFile(resolve('.env'));
let failed = 0;
let passed = 0;
async function check(base, path, expected = 200, options = {}, verify) {
  try {
    const response = await fetch(new URL(path, base), {
      ...options,
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
    });
    if (response.status !== expected)
      throw new Error(`expected ${expected}, received ${response.status}`);
    if (verify) await verify(response.clone());
    console.info(`PASS ${path} (${response.status})`);
    passed++;
    return response;
  } catch (error) {
    console.error(`FAIL ${path}: ${error instanceof Error ? error.message : 'request failed'}`);
    failed++;
    return null;
  }
}
await check(apiOrigin, '/health');
await check(apiOrigin, '/ready');
await check(apiOrigin, '/version', 200, {}, async (response) => {
  const version = (await response.json()).data?.version;
  if (typeof version !== 'string' || version.length > 100)
    throw new Error('Invalid version response');
  console.info(`Release: ${version}`);
});
for (const path of [
  '/',
  '/news',
  '/trust',
  '/local',
  '/login',
  '/admin/businesses',
  '/preview/7',
  '/preview/7/workspace',
  '/news/category/local',
  '/news/location/chennai',
  '/robots.txt',
  '/sitemap.xml',
  '/rss.xml',
  '/news-sitemap.xml',
])
  await check(origin, path);
await check(apiOrigin, '/api/v1/local/businesses', 200, {}, async (response) => {
  const data = (await response.json()).data;
  if (
    !Array.isArray(data?.items) ||
    data.items.some((item) => 'ownerId' in item || 'leads' in item)
  )
    throw new Error('Directory projection is invalid or exposes private fields');
});
for (const path of ['/api/v1/articles', '/api/v1/local/manage', '/api/v1/local/leads'])
  await check(apiOrigin, path, 401);
await check(apiOrigin, '/api/v1/local/leads', 403, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
});
if (localAuth) {
  if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
    console.error('FAIL local sign-in: local credentials are not configured');
    failed++;
  } else {
    const csrf = await check(apiOrigin, '/api/v1/auth/csrf');
    if (csrf) {
      const token = (await csrf.json()).data.token;
      const headers = {
        'Content-Type': 'application/json',
        'x-csrf-token': token,
        Cookie: csrf.headers.get('set-cookie').split(';')[0],
      };
      const login = await check(apiOrigin, '/api/v1/auth/login', 200, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: process.env.SUPER_ADMIN_EMAIL,
          password: process.env.SUPER_ADMIN_PASSWORD,
        }),
      });
      if (login) {
        headers.Cookie += '; ' + login.headers.get('set-cookie').split(';')[0];
        try {
          await check(apiOrigin, '/api/v1/me', 200, { headers });
          await check(apiOrigin, '/api/v1/local/manage', 200, { headers });
          await check(apiOrigin, '/api/v1/local/leads', 200, { headers });
        } finally {
          await check(apiOrigin, '/api/v1/auth/logout', 200, { method: 'POST', headers });
          await check(apiOrigin, '/api/v1/me', 401, { headers });
        }
      }
    }
  }
}
console.info(
  JSON.stringify({
    checkedAt: new Date().toISOString(),
    web: origin.origin,
    api: apiOrigin.origin,
    passed,
    failed,
    localSignInRequested: localAuth,
  }),
);
process.exitCode = failed ? 1 : 0;
