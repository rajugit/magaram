// Loads credentials from the local private environment. Never prints them or response bodies.
import assert from 'node:assert/strict';
const origin = 'http://localhost:3001';
const check = async (path, expected, options = {}) => {
  const response = await fetch(origin + path, { ...options, signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, expected, `${path}: unexpected status`);
  console.info(`${path}: ${response.status}`);
  return response;
};
await check('/login', 200);
await check('/preview/3', 200);
await check('/api/v1/articles', 401);
const csrf = await check('/api/v1/auth/csrf', 200);
const headers = {
  'Content-Type': 'application/json',
  Origin: origin,
  'x-csrf-token': (await csrf.json()).data.token,
  Cookie: csrf.headers.get('set-cookie').split(';')[0],
};
const login = await check('/api/v1/auth/login', 200, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
  }),
});
headers.Cookie += '; ' + login.headers.get('set-cookie').split(';')[0];
try {
  await check('/api/v1/me', 200, { headers });
  await check('/api/v1/articles', 200, { headers });
  const status = await check('/api/v1/ai/status', 200, { headers });
  const data = (await status.json()).data;
  assert.equal(data.generationEnabled, false, 'AI must remain inactive for this release.');
  assert.equal(data.emailEnabled, false, 'Email must remain inactive.');
  await check('/api/v1/ai/generate', 503, { method: 'POST', headers, body: '{}' });
} finally {
  await check('/api/v1/auth/logout', 200, { method: 'POST', headers });
}
await check('/api/v1/me', 401, { headers });
console.info(
  'Local application, authentication, session revocation and inactive provider checks passed.',
);
