// Run as root in the exact release image, with /etc/magaram mounted read-only
// and runtime.env passed to Docker. Only status/count evidence is printed.
// Explicit opt-in registers one reviewed public feed; never publishes articles.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Queue, QueueEvents } = require('bullmq');
const Redis = require('ioredis');
assert.equal(process.argv[2], '--enable-pib-tamil');
const expectedVersion = process.argv[3];
assert(/^[a-f0-9]{40}$/.test(expectedVersion || ''));
const env = Object.fromEntries(
  readFileSync('/etc/magaram/bootstrap.env', 'utf8')
    .trim()
    .split('\n')
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
const origin = process.env.WEB_ORIGIN;
assert(origin === 'https://magarammedia.in');
const headers = { 'Content-Type': 'application/json', Origin: origin };
let authenticated = false,
  sourceId,
  newlyEnabled = false,
  queue,
  events,
  connection;
async function call(path, options = {}) {
  const response = await fetch(origin + '/api/v1' + path, {
    headers,
    ...options,
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, 200, `Source acceptance request failed: ${path}`);
  return response;
}
try {
  const version = await fetch(origin + '/version').then((r) => r.json());
  assert.equal(version.data.version, expectedVersion);
  const csrf = await call('/auth/csrf');
  headers.Cookie = csrf.headers.get('set-cookie').split(';')[0];
  headers['x-csrf-token'] = (await csrf.json()).data.token;
  const login = await call('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: env.SUPER_ADMIN_EMAIL, password: env.SUPER_ADMIN_PASSWORD }),
  });
  headers.Cookie += '; ' + login.headers.get('set-cookie').split(';')[0];
  authenticated = true;
  const url = 'https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=11&Regid=6&reg=6';
  const sources = (await (await call('/news-sources')).json()).data.items;
  let source = sources.find((s) => s.url === url);
  if (!source) {
    source = (
      await (
        await call('/news-sources', {
          method: 'POST',
          body: JSON.stringify({
            name: 'PIB Chennai — Tamil press releases',
            url,
            sourceType: 'GOVERNMENT',
            language: 'TA',
            geography: 'INDIA',
            category: 'அரசு அறிவிப்புகள்',
            trustLevel: 70,
            pollingSeconds: 1800,
            enabled: false,
            licenseNotes:
              'PIB official RSS; primary government statements, not independent corroboration. Copyright policy permits accurate reuse with prominent attribution, excluding third-party content. Policy checked 2026-10-17: https://www.pib.gov.in/ContentPage.aspx?lang=1&menuid=794&reg=23 . Chennai edition is not event geography; editor must assess Tamil Nadu relevance.',
          }),
        })
      ).json()
    ).data;
  }
  sourceId = source.id;
  if (!source.enabled) {
    await call(`/news-sources/${sourceId}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: true }),
    });
    newlyEnabled = true;
  }
  connection = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  queue = new Queue('news-discovery', { connection });
  events = new QueueEvents('news-discovery', { connection });
  await events.waitUntilReady();
  const job = await queue.add(
    'news-source-poll',
    {},
    { attempts: 1, removeOnComplete: { count: 100 }, removeOnFail: { count: 100 } },
  );
  await job.waitUntilFinished(events, 60000);
  const history = (await (await call(`/news-sources/${sourceId}/fetches`)).json()).data.items;
  assert(
    history[0]?.status === 'SUCCEEDED' && history[0]?.itemCount > 0,
    'Worker must persist a nonempty feed fetch.',
  );
  const discoveries = (await (await call('/discovered-news?limit=100')).json()).data.items.filter(
    (item) => item.sourceId === sourceId,
  );
  assert(
    discoveries.length > 0 && discoveries.some((item) => /[\u0B80-\u0BFF]/.test(item.title)),
    'Tamil discoveries are required.',
  );
  assert(
    discoveries.every((item) => ['DISCOVERED', 'PENDING_VERIFICATION'].includes(item.status)),
    'Discoveries must remain unverified.',
  );
  const topics = (await (await call('/news-topics?limit=100')).json()).data.items;
  console.log(
    JSON.stringify({
      feed: 'PIB Chennai Tamil',
      fetchedItems: history[0].itemCount,
      persistedDiscoveries: discoveries.length,
      topics: topics.length,
      unverified: true,
      publicationRequested: false,
      pollingSeconds: 1800,
    }),
  );
  newlyEnabled = false;
} catch {
  if (newlyEnabled && sourceId) {
    try {
      await call(`/news-sources/${sourceId}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: false }),
      });
    } catch {
      console.error('Could not disable the new source; operator inspection required.');
    }
  }
  console.error('Source operational acceptance failed; no credentials or source contents printed.');
  process.exitCode = 1;
} finally {
  if (events) await events.close();
  if (queue) await queue.close();
  if (connection) await connection.quit();
  if (authenticated) await call('/auth/logout', { method: 'POST' });
}
