// Run as root on the existing preview host. Preserve other Nginx settings.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const path = '/etc/nginx/sites-available/default';
const original = readFileSync(path, 'utf8');
const anchor = 'location = /health { proxy_pass http://127.0.0.1:4000/health; }';
if (original.includes('location = /version')) {
  console.info('Version route already configured; no changes.');
} else {
  if (![2, 3].includes(original.split(anchor).length))
    throw new Error('Unexpected proxy configuration; no changes made.');
  const updated = original.replaceAll(
    anchor,
    `${anchor}\nlocation = /version { proxy_pass http://127.0.0.1:4000/version; }`,
  );
  writeFileSync(`${path}.before-version-${Date.now()}`, original, { mode: 0o600, flag: 'wx' });
  writeFileSync(path, updated);
  try {
    execFileSync('nginx', ['-t'], { stdio: 'inherit' });
    execFileSync('systemctl', ['reload', 'nginx'], { stdio: 'inherit' });
    console.info('Version route installed; Nginx configuration passed validation.');
  } catch (error) {
    writeFileSync(path, original);
    execFileSync('nginx', ['-t'], { stdio: 'inherit' });
    execFileSync('systemctl', ['reload', 'nginx'], { stdio: 'inherit' });
    throw error;
  }
}
