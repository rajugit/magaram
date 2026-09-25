import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const base = {
  NODE_ENV: 'production',
  WEB_ORIGIN: 'https://magarammedia.in',
  DATABASE_URL: 'mysql://user:password@127.0.0.1:3306/app',
  REDIS_URL: 'redis://127.0.0.1:6379',
  SESSION_SECRET: 'a-production-secret-that-is-at-least-32-bytes-long',
  TRUST_PROXY: 'true',
};

describe('production configuration gates', () => {
  it('requires HTTPS and an explicitly trusted reverse proxy', () => {
    expect(() => loadConfig({ ...base, WEB_ORIGIN: 'http://magarammedia.in' })).toThrow(
      'WEB_ORIGIN',
    );
    expect(() => loadConfig({ ...base, TRUST_PROXY: 'false' })).toThrow('TRUST_PROXY');
  });

  it('accepts the preview production topology', () => {
    expect(loadConfig(base)).toMatchObject({
      NODE_ENV: 'production',
      WEB_ORIGIN: 'https://magarammedia.in',
      TRUST_PROXY: true,
    });
  });
});
