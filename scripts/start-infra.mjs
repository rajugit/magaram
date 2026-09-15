import { spawnSync } from 'node:child_process';

if (!process.env.LOCAL_DB_PASSWORD) throw new Error('Run pnpm setup:local first.');
const env = {
  ...process.env,
  MYSQL_ROOT_PASSWORD: process.env.LOCAL_DB_PASSWORD,
  MYSQL_PASSWORD: process.env.LOCAL_DB_PASSWORD,
  MYSQL_USER: 'magaram',
  MYSQL_DATABASE: 'magaram_media',
};
for (const [name, image, args] of [
  [
    'magaram-preview-mysql',
    'mysql:8.0',
    [
      '-p',
      '127.0.0.1:33316:3306',
      '-v',
      'magaram-preview-mysql:/var/lib/mysql',
      '-e',
      'MYSQL_ROOT_PASSWORD',
      '-e',
      'MYSQL_PASSWORD',
      '-e',
      'MYSQL_USER',
      '-e',
      'MYSQL_DATABASE',
    ],
  ],
  [
    'magaram-preview-redis',
    'redis:7-alpine',
    ['-p', '127.0.0.1:36379:6379', '-v', 'magaram-preview-redis:/data'],
  ],
]) {
  const existing = spawnSync('docker', ['inspect', '--format', '{{.Config.Image}}', name], {
    encoding: 'utf8',
  });
  if (existing.status === 0 && existing.stdout.trim() !== image)
    throw new Error(`Unexpected container at ${name}; left unchanged.`);
  const result = spawnSync(
    'docker',
    existing.status === 0 ? ['start', name] : ['run', '-d', '--name', name, ...args, image],
    { env, stdio: 'inherit' },
  );
  if (result.status !== 0) process.exit(result.status || 1);
}
