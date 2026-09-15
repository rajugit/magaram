import bcrypt from 'bcryptjs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import type { AppConfig } from '../src/config.js';
import type { AuditEvent } from '../src/audit.js';
import type {
  IdentityRepository,
  PasswordResetDelivery,
  StoredPasswordReset,
  StoredSession,
  StoredUser,
} from '../src/identity.js';

class MemoryIdentityRepository implements IdentityRepository {
  readonly events: AuditEvent[] = [];
  readonly sessions = new Map<string, StoredSession>();
  readonly passwordResets = new Map<string, StoredPasswordReset>();

  constructor(private readonly user: StoredUser) {}

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    return this.user.email === email ? this.user : null;
  }

  async findSessionByTokenHash(tokenHash: string): Promise<StoredSession | null> {
    return this.sessions.get(tokenHash) ?? null;
  }

  async createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    this.sessions.set(input.tokenHash, {
      id: 'session-1',
      user: this.user,
      expiresAt: input.expiresAt,
      revokedAt: null,
    });
  }

  async revokeSession(tokenHash: string): Promise<void> {
    const session = this.sessions.get(tokenHash);
    if (session) {
      session.revokedAt = new Date();
    }
  }

  async markUserLoggedIn(): Promise<void> {}

  async recordFailedLogin(): Promise<void> {
    this.user.failedLoginAttempts += 1;
    if (this.user.failedLoginAttempts >= 5) {
      this.user.lockedUntil = new Date(Date.now() + 15 * 60 * 1_000);
    }
  }

  async clearFailedLoginAttempts(): Promise<void> {
    this.user.failedLoginAttempts = 0;
    this.user.lockedUntil = null;
  }

  async createPasswordReset(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    this.passwordResets.set(input.tokenHash, {
      id: 'reset-1',
      userId: input.userId,
      expiresAt: input.expiresAt,
      usedAt: null,
    });
  }

  async findPasswordResetByTokenHash(tokenHash: string): Promise<StoredPasswordReset | null> {
    return this.passwordResets.get(tokenHash) ?? null;
  }

  async consumePasswordReset(input: { resetId: string; passwordHash: string }): Promise<boolean> {
    const reset = [...this.passwordResets.values()].find((entry) => entry.id === input.resetId);
    if (!reset || reset.usedAt || reset.expiresAt <= new Date()) {
      return false;
    }
    reset.usedAt = new Date();
    this.user.passwordHash = input.passwordHash;
    this.sessions.clear();
    return true;
  }

  async record(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }
}

const config: AppConfig = {
  NODE_ENV: 'test',
  APP_VERSION: 'test-version',
  API_PORT: 4000,
  WEB_ORIGIN: 'http://localhost:3000',
  DATABASE_URL: 'mysql://test:test@localhost:3306/test',
  REDIS_URL: 'redis://localhost:6379',
  SESSION_SECRET: 'test-secret-that-is-at-least-thirty-two-characters',
  TRUST_PROXY: false,
  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_MAX: 120,
};

describe('foundation API', () => {
  it('returns a safe health response and version', async () => {
    const app = createApp({ config, identityRepository: await testRepository() });

    const health = await request(app).get('/health').expect(200);
    const version = await request(app).get('/version').expect(200);

    expect(health.body).toMatchObject({ success: true, data: { status: 'ok' } });
    expect(health.body.data).not.toHaveProperty('database');
    expect(version.body).toMatchObject({ success: true, data: { version: 'test-version' } });
  });

  it('requires CSRF protection and establishes a server-side session after login', async () => {
    const app = createApp({ config, identityRepository: await testRepository() });
    const client = request.agent(app);

    const csrf = await client.get('/api/v1/auth/csrf').expect(200);
    await client
      .post('/api/v1/auth/login')
      .send({ email: 'editor@magaram.test', password: 'correct-horse-battery-staple' })
      .expect(403);

    const login = await client
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.body.data.token)
      .send({ email: 'editor@magaram.test', password: 'correct-horse-battery-staple' })
      .expect(200);
    const me = await client.get('/api/v1/me').expect(200);

    expect(login.body).toMatchObject({
      success: true,
      data: { user: { email: 'editor@magaram.test' } },
    });
    expect(me.body.data.user.roles).toContain('EDITOR');
    expect(me.body.data.user.permissions).toContain('articles:review');

    const logoutCsrf = await client.get('/api/v1/auth/csrf').expect(200);
    await client
      .post('/api/v1/auth/logout')
      .set('x-csrf-token', logoutCsrf.body.data.token)
      .expect(200);
    await client.get('/api/v1/me').expect(401);
  });

  it('enforces permissions and uses the standard error envelope', async () => {
    const app = createApp({ config, identityRepository: await testRepository() });
    const client = request.agent(app);
    const csrf = await client.get('/api/v1/auth/csrf');

    await client
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.body.data.token)
      .send({ email: 'editor@magaram.test', password: 'correct-horse-battery-staple' })
      .expect(200);

    const forbidden = await client.get('/api/v1/settings').expect(403);
    const missing = await client.get('/api/v1/unknown').expect(404);

    expect(forbidden.body).toMatchObject({
      success: false,
      error: { code: 'FORBIDDEN' },
    });
    expect(missing.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
  });

  it('allows the explicit super-administrator wildcard only', async () => {
    const app = createApp({ config, identityRepository: await testRepository(['*']) });
    const client = request.agent(app);
    const csrf = await client.get('/api/v1/auth/csrf');

    await client
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.body.data.token)
      .send({ email: 'editor@magaram.test', password: 'correct-horse-battery-staple' })
      .expect(200);

    await client.get('/api/v1/settings').expect(503);
  });

  it('temporarily locks an account after repeated failed sign-in attempts', async () => {
    const app = createApp({ config, identityRepository: await testRepository() });
    const client = request.agent(app);
    const csrf = await client.get('/api/v1/auth/csrf');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await client
        .post('/api/v1/auth/login')
        .set('x-csrf-token', csrf.body.data.token)
        .send({ email: 'editor@magaram.test', password: 'invalid-password-value' })
        .expect(401);
    }

    await client
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.body.data.token)
      .send({ email: 'editor@magaram.test', password: 'correct-horse-battery-staple' })
      .expect(401);
  });

  it('resets a password through the injected delivery channel without exposing its token', async () => {
    const resetDelivery = new CapturingPasswordResetDelivery();
    const app = createApp({
      config,
      identityRepository: await testRepository(),
      passwordResetDelivery: resetDelivery,
    });
    const client = request.agent(app);
    const csrf = await client.get('/api/v1/auth/csrf');

    const requestReset = await client
      .post('/api/v1/auth/password-reset/request')
      .set('x-csrf-token', csrf.body.data.token)
      .send({ email: 'editor@magaram.test' })
      .expect(200);
    expect(requestReset.body.data).not.toHaveProperty('token');
    expect(resetDelivery.token).toBeDefined();

    await client
      .post('/api/v1/auth/password-reset/confirm')
      .set('x-csrf-token', csrf.body.data.token)
      .send({ token: resetDelivery.token, password: 'new-correct-horse-battery-staple' })
      .expect(200);

    await client
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.body.data.token)
      .send({ email: 'editor@magaram.test', password: 'correct-horse-battery-staple' })
      .expect(401);
    await client
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.body.data.token)
      .send({ email: 'editor@magaram.test', password: 'new-correct-horse-battery-staple' })
      .expect(200);
  });
});

class CapturingPasswordResetDelivery implements PasswordResetDelivery {
  token?: string;

  async deliver({ token }: { recipient: string; token: string; expiresAt: Date }): Promise<void> {
    this.token = token;
  }
}

async function testRepository(
  permissions = ['articles:review'],
): Promise<MemoryIdentityRepository> {
  const passwordHash = await bcrypt.hash('correct-horse-battery-staple', 12);
  return new MemoryIdentityRepository({
    id: 'user-1',
    email: 'editor@magaram.test',
    displayName: 'Test Editor',
    passwordHash,
    status: 'ACTIVE',
    failedLoginAttempts: 0,
    lockedUntil: null,
    roles: ['EDITOR'],
    permissions,
  });
}
