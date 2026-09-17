// Run as root on the server. Only status codes are printed, never passwords or cookies.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const env = Object.fromEntries(
  readFileSync('/etc/magaram/bootstrap.env', 'utf8')
    .trim()
    .split('\n')
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
const runtime = readFileSync('/etc/magaram/runtime.env', 'utf8');
const origin = runtime.match(/^WEB_ORIGIN=(.+)$/m)?.[1];
const expectedAi = /^AI_PROVIDER=bedrock$/m.test(runtime);
const expectedEmail = /^EMAIL_PROVIDER=ses$/m.test(runtime);
assert(origin?.startsWith('https://'));
const check = async (path, expected, options = {}) => {
  const response = await fetch(origin + path, { ...options, signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, expected, `${path} unexpected status`);
  console.log(`${path}: ${response.status}`);
  return response;
};
await check('/ready', 200);
await check('/preview/2', 200);
await check('/preview/3', 200);
await check('/api/v1/articles', 401);
const csrf = await check('/api/v1/auth/csrf', 200);
const csrfCookie = csrf.headers.get('set-cookie');
assert(/;\s*Secure/i.test(csrfCookie));
const token = (await csrf.json()).data.token;
const headers = {
  'Content-Type': 'application/json',
  Origin: origin,
  'x-csrf-token': token,
  Cookie: csrfCookie.split(';')[0],
};
const login = await check('/api/v1/auth/login', 200, {
  method: 'POST',
  headers,
  body: JSON.stringify({ email: env.SUPER_ADMIN_EMAIL, password: env.SUPER_ADMIN_PASSWORD }),
});
const sessionCookie = login.headers.get('set-cookie');
assert(/;\s*Secure/i.test(sessionCookie));
assert(/;\s*HttpOnly/i.test(sessionCookie));
headers.Cookie += '; ' + sessionCookie.split(';')[0];
await check('/api/v1/me', 200, { headers });
await check('/api/v1/articles', 200, { headers });
const aiStatus = (await (await check('/api/v1/ai/status', 200, { headers })).json()).data;
assert.equal(aiStatus.generationEnabled, expectedAi, 'Unexpected AI generation state.');
assert.equal(aiStatus.emailEnabled, expectedEmail, 'Unexpected email delivery state.');
if (!expectedAi) await check('/api/v1/ai/generate', 503, { method: 'POST', headers, body: '{}' });
await check('/api/v1/auth/logout', 200, { method: 'POST', headers });
console.log(
  'Trusted TLS, secure session cookies, persisted authentication, authorization and logout passed.',
);
