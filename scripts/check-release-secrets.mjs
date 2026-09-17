// Reports paths only, never matching secret values. Run before staging a public release.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, lstatSync } from 'node:fs';
import { parseEnv } from 'node:util';
const git = process.env.MAGARAM_GIT_BINARY || 'git';
const run = (args) => execFileSync(git, args, { maxBuffer: 32 * 1024 * 1024 });
const local = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
const secretValues = Object.entries(local)
  .filter(
    ([key, value]) => /PASSWORD|SECRET|TOKEN|KEY|DATABASE_URL/.test(key) && value.length >= 16,
  )
  .map(([, value]) => value);
const keyPattern = /(?:AKIA|ASIA)[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
const secretPath = /(?:^|\/)(?:\.env(?:\.(?!example$).*)?|credentials|[^/]+\.(?:pem|key))$/;
const findings = new Set();
function inspect(label, content) {
  if (content.includes(0)) return;
  const value = content.toString('utf8');
  if (keyPattern.test(value) || secretValues.some((secret) => value.includes(secret)))
    findings.add(label);
}
const files = run(['ls-files', '-z', '--cached', '--others', '--exclude-standard'])
  .toString()
  .split('\0')
  .filter(Boolean);
for (const file of new Set(files)) {
  if (secretPath.test(file)) findings.add(file);
  if (existsSync(file) && lstatSync(file).isFile()) inspect(file, readFileSync(file));
}
for (const line of run(['rev-list', '--objects', '--all']).toString().trim().split('\n')) {
  const [hash, ...parts] = line.split(' ');
  const name = parts.join(' ');
  if (!/^[a-f0-9]{40}$/.test(hash)) continue;
  if (secretPath.test(name)) findings.add(`history:${name}`);
  if (run(['cat-file', '-t', hash]).toString().trim() === 'blob')
    inspect(`history:${name || hash}`, run(['cat-file', 'blob', hash]));
}
if (findings.size) {
  console.error('Release blocked: possible secrets in these paths (values suppressed):');
  for (const file of findings) console.error(file);
  process.exitCode = 1;
} else
  console.info(
    'No known local secret values, AWS access-key patterns, private keys or credential-file paths found in release files or Git history. This is a targeted check, not a guarantee against every possible secret.',
  );
