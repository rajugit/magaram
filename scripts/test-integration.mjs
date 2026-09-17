import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

// Never accept a production URL. A new schema is created on the dedicated local container only.
const url = new URL(process.env.DATABASE_URL || '');
if (
  url.protocol !== 'mysql:' ||
  url.hostname !== '127.0.0.1' ||
  url.port !== '33316' ||
  url.username !== 'magaram' ||
  url.pathname !== '/magaram_media'
)
  throw new Error('Integration tests require the dedicated local preview database configuration.');
const image = execFileSync(
  'docker',
  ['inspect', '--format', '{{.Config.Image}}', 'magaram-preview-mysql'],
  { encoding: 'utf8' },
).trim();
if (image !== 'mysql:8.0') throw new Error('Unexpected local database container. Nothing changed.');
const schema = `magaram_test_${randomBytes(12).toString('hex')}`;
if (!/^magaram_test_[a-f0-9]{24}$/.test(schema)) throw new Error('Invalid isolated schema.');
function sql(statement) {
  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      'magaram-preview-mysql',
      'sh',
      '-c',
      'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot',
    ],
    { input: statement, stdio: ['pipe', 'ignore', 'pipe'] },
  );
}
let created = false;
let granted = false;
try {
  sql(`CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  created = true;
  sql(`GRANT ALL ON \`${schema}\`.* TO 'magaram'@'%';`);
  granted = true;
  url.pathname = `/${schema}`;
  const env = {
    ...process.env,
    DATABASE_URL: url.toString(),
    NODE_ENV: 'test',
    MAGARAM_TEST_SCHEMA: schema,
  };
  const cwd = resolve('apps/api');
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    cwd,
    env,
    stdio: 'inherit',
  });
  execFileSync('pnpm', ['exec', 'vitest', 'run', '--config', 'vitest.integration.config.ts'], {
    cwd,
    env,
    stdio: 'inherit',
  });
} catch {
  console.error('Isolated integration checks failed. No production database was used.');
  process.exitCode = 1;
} finally {
  if (created) {
    try {
      if (granted) sql(`REVOKE ALL ON \`${schema}\`.* FROM 'magaram'@'%';`);
      sql(`DROP DATABASE \`${schema}\`;`);
      console.info('Removed the test-only schema and grant created by this run.');
    } catch {
      console.error(`Test schema cleanup needs attention: ${schema}`);
      process.exitCode = 1;
    }
  }
}
