import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const target = resolve('.env');
if (existsSync(target)) {
  console.info('Existing .env preserved. Local setup skipped.');
} else {
  const dbPassword = randomBytes(24).toString('hex');
  const secret = randomBytes(48).toString('hex');
  const password = randomBytes(32).toString('hex');
  writeFileSync(
    target,
    [
      'NODE_ENV=development',
      'APP_VERSION=0.2.0',
      'API_PORT=4000',
      'WEB_ORIGIN=http://localhost:3000',
      'API_INTERNAL_URL=http://127.0.0.1:4000',
      'SITE_URL=http://localhost:3000',
      'PREVIEW_MODE=true',
      `LOCAL_DB_PASSWORD=${dbPassword}`,
      `DATABASE_URL=mysql://magaram:${dbPassword}@127.0.0.1:33316/magaram_media`,
      'REDIS_URL=redis://127.0.0.1:36379',
      `SESSION_SECRET=${secret}`,
      'SUPER_ADMIN_EMAIL=preview@magaram.test',
      `SUPER_ADMIN_PASSWORD=${password}`,
      'SUPER_ADMIN_NAME=Preview Editor',
      '',
    ].join('\n'),
    { mode: 0o600, flag: 'wx' },
  );
  console.info('Created private local configuration. No credentials printed.');
}
