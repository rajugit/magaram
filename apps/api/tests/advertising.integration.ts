import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { PasswordService } from '../src/identity.js';
import { PrismaIdentityRepository } from '../src/prisma-identity-repository.js';

const database = new URL(process.env.DATABASE_URL || '');
if (
  !/^magaram_test_[a-f0-9]{24}$/.test(process.env.MAGARAM_TEST_SCHEMA || '') ||
  database.pathname !== `/${process.env.MAGARAM_TEST_SCHEMA}` ||
  database.hostname !== '127.0.0.1' ||
  database.port !== '33316'
)
  throw new Error('Advertising tests require the guarded disposable local database.');
const db = new PrismaClient();
const app = createApp({
  db,
  identityRepository: new PrismaIdentityRepository(db),
  config: loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: database.toString(),
    REDIS_URL: 'redis://127.0.0.1:36379',
    WEB_ORIGIN: 'http://localhost:3000',
    SESSION_SECRET: 'advertising-fixture-only-session-secret',
    RATE_LIMIT_MAX: '1000',
  }),
});
const password = 'advertising-fixture-password-only';
const ids: Record<string, string> = {};
beforeAll(async () => {
  const hash = await new PasswordService().hash(password);
  for (const [name, code, permissions] of [
    ['owner', 'ADVERTISER', ['ads:own']],
    ['other', 'BUSINESS_OWNER', ['ads:own']],
    ['reviewer', 'EDITOR', ['ads:review']],
    ['manager', 'SALES_MANAGER', ['ads:manage', 'ads:review']],
    ['outsider', 'ANALYST', ['analytics:read']],
  ] as const) {
    const role = await db.role.upsert({
      where: { code },
      update: {},
      create: { code, name: `Advertising fixture ${code}` },
    });
    for (const permissionCode of permissions) {
      const permission = await db.permission.upsert({
        where: { code: permissionCode },
        update: {},
        create: { code: permissionCode },
      });
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
    ids[name] = (
      await db.user.create({
        data: {
          email: `ads-${name}@example.test`,
          displayName: name,
          passwordHash: hash,
          roles: { create: { roleId: role.id } },
        },
      })
    ).id;
  }
});
afterAll(async () => {
  await db.$disconnect();
});
async function actor(name: string) {
  const client = request.agent(app);
  const csrf = (await client.get('/api/v1/auth/csrf')).body.data.token;
  await client
    .post('/api/v1/auth/login')
    .set('x-csrf-token', csrf)
    .send({ email: `ads-${name}@example.test`, password })
    .expect(200);
  return {
    client,
    csrf,
    post: (path: string, body: object) =>
      client
        .post('/api/v1/ads' + path)
        .set('x-csrf-token', csrf)
        .send(body),
    put: (path: string, body: object) =>
      client
        .put('/api/v1/ads' + path)
        .set('x-csrf-token', csrf)
        .send(body),
  };
}
async function placement(key: string, enabled = true) {
  return db.adPlacement.create({
    data: { key, name: `Fixture ${key}`, enabled, dailyRatePaise: enabled ? 12500 : null },
  });
}
const profile = {
  name: 'Fixture bookshop',
  contactEmail: 'fixture@example.test',
  billingAddress: 'Fixture address, Madurai, Tamil Nadu',
};
const dates = (start = 2, end = 5) => {
  const now = Date.now();
  return {
    startsAt: new Date(now + start * 86400000).toISOString(),
    endsAt: new Date(now + end * 86400000).toISOString(),
  };
};
const creative = (placementId: string) => ({
  placementId,
  headline: 'Fixture Tamil book fair',
  body: 'Clearly labelled advertising fixture for test purposes.',
  destinationUrl: 'https://example.test/books',
  rightsEvidence: 'Advertiser owns the supplied text. Fixture evidence.',
  ...dates(),
});
const review = (version: number, decision = 'APPROVED') => ({
  version,
  decision,
  note: 'Creative, destination and rights reviewed in fixture.',
  rightsConfirmed: true,
});

describe('persisted advertising workflow', () => {
  it('enforces ownership, CSRF, immutable quotes, reservations and inactive payments', async () => {
    const owner = await actor('owner');
    const other = await actor('other');
    const reviewer = await actor('reviewer');
    const manager = await actor('manager');
    const outsider = await actor('outsider');
    await request(app).get('/api/v1/ads/campaigns').expect(401);
    await outsider.client.get('/api/v1/ads/campaigns').expect(403);
    await owner.client.post('/api/v1/ads/campaigns').send({}).expect(403);
    const slot = await placement('integration-news');
    const data = creative(slot.id);
    await owner.post('/campaigns', data).expect(409);
    await owner.put('/profile', profile).expect(200);
    await owner.post('/campaigns', { ...data, status: 'APPROVED' }).expect(422);
    await owner.post('/campaigns', { ...data, destinationUrl: 'javascript:alert(1)' }).expect(422);
    await owner.post('/campaigns', { ...data, ...dates(5, 2) }).expect(422);
    const campaign = (await owner.post('/campaigns', data).expect(200)).body.data;
    expect(campaign.disclosure).toBe('விளம்பரம்');
    await other.put(`/campaigns/${campaign.id}`, { ...data, version: 1 }).expect(404);
    expect((await other.client.get('/api/v1/ads/campaigns')).body.data.total).toBe(0);
    await owner
      .put(`/placements/${slot.id}`, { version: 1, enabled: false, dailyRatePaise: 100 })
      .expect(403);
    await owner.post(`/campaigns/${campaign.id}/submit`, { version: 9 }).expect(409);
    await owner.post(`/campaigns/${campaign.id}/submit`, { version: 1 }).expect(200);
    await owner.put(`/campaigns/${campaign.id}`, { ...data, version: 2 }).expect(409);
    await owner.post(`/campaigns/${campaign.id}/review`, review(2)).expect(403);
    const approved = (
      await reviewer.post(`/campaigns/${campaign.id}/review`, review(2)).expect(200)
    ).body.data;
    expect(approved.invoice.amountPaise).toBe(37500);
    expect(approved.invoice.status).toBe('UNPAID');
    expect(approved.invoice.billingSnapshot.type).toBe('PRO_FORMA_NOT_TAX_INVOICE');
    await owner.put('/profile', { ...profile, name: 'Changed profile' }).expect(200);
    expect(
      (await db.adInvoice.findUniqueOrThrow({ where: { campaignId: campaign.id } }))
        .billingSnapshot,
    ).toMatchObject({ name: profile.name });
    const attempt = { requestKey: 'same-fixture-attempt-0001' };
    await owner.post(`/campaigns/${campaign.id}/checkout`, attempt).expect(503);
    await owner.post(`/campaigns/${campaign.id}/checkout`, attempt).expect(503);
    expect(await db.adPaymentAttempt.count({ where: { invoiceId: approved.invoice.id } })).toBe(1);
    await other.post(`/campaigns/${campaign.id}/checkout`, attempt).expect(404);
    await owner.post(`/campaigns/${campaign.id}/checkout`, { ...attempt, paid: true }).expect(422);
    expect((await request(app).get('/api/v1/ads/public')).body.data).toEqual({
      items: [],
      deliveryEnabled: false,
    });
    const second = (await owner.post('/campaigns', data).expect(200)).body.data;
    await owner.post(`/campaigns/${second.id}/submit`, { version: 1 }).expect(200);
    await reviewer.post(`/campaigns/${second.id}/review`, review(2)).expect(409);
    await owner.post(`/campaigns/${campaign.id}/cancel`, { version: 3 }).expect(200);
    expect(
      (await db.adInvoice.findUniqueOrThrow({ where: { campaignId: campaign.id } })).status,
    ).toBe('VOID');
    await owner
      .post(`/campaigns/${campaign.id}/checkout`, { requestKey: 'cancelled-fixture-0001' })
      .expect(409);
    await reviewer.post(`/campaigns/${second.id}/review`, review(2)).expect(200);
    expect(
      await db.auditLog.count({
        where: { entityId: campaign.id, action: 'advertising.campaign.approved' },
      }),
    ).toBe(1);
    await manager
      .put(`/placements/${slot.id}`, { version: 1, enabled: false, dailyRatePaise: 100 })
      .expect(409);
  });
  it('prevents self-review and editing/rejection bypasses and rejects unpriced inventory', async () => {
    const manager = await actor('manager');
    const reviewer = await actor('reviewer');
    const owner = await actor('owner');
    const inactive = await placement('integration-unpriced', false);
    await manager.put('/profile', profile).expect(200);
    await manager.post('/campaigns', creative(inactive.id)).expect(409);
    const slot = await placement('integration-review');
    const data = creative(slot.id);
    const campaign = (await manager.post('/campaigns', data).expect(200)).body.data;
    await manager.post(`/campaigns/${campaign.id}/submit`, { version: 1 }).expect(200);
    await manager.post(`/campaigns/${campaign.id}/review`, review(2)).expect(403);
    await reviewer.post(`/campaigns/${campaign.id}/review`, review(2, 'REJECTED')).expect(200);
    await manager
      .put(`/campaigns/${campaign.id}`, {
        ...data,
        headline: 'Revised fixture creative',
        version: 3,
      })
      .expect(200);
    await manager.post(`/campaigns/${campaign.id}/submit`, { version: 4 }).expect(200);
    await reviewer.post(`/campaigns/${campaign.id}/review`, review(5)).expect(200);
    // A manager cannot approve their own edit of somebody else's campaign.
    const another = (await owner.post('/campaigns', { ...data, ...dates(6, 8) }).expect(200)).body
      .data;
    await manager
      .put(`/campaigns/${another.id}`, { ...data, ...dates(6, 8), version: 1 })
      .expect(200);
    await owner.post(`/campaigns/${another.id}/submit`, { version: 2 }).expect(200);
    await manager.post(`/campaigns/${another.id}/review`, review(3)).expect(403);
    await reviewer
      .post(`/campaigns/${another.id}/review`, { ...review(3), rightsConfirmed: false })
      .expect(422);
    await reviewer.post(`/campaigns/${another.id}/review`, review(3)).expect(200);
  });
  it('allows only one concurrent approval for an exclusive placement', async () => {
    const owner = await actor('owner');
    const reviewer = await actor('reviewer');
    const slot = await placement('integration-concurrent');
    const data = creative(slot.id);
    const first = (await owner.post('/campaigns', data).expect(200)).body.data;
    const second = (await owner.post('/campaigns', data).expect(200)).body.data;
    await owner.post(`/campaigns/${first.id}/submit`, { version: 1 }).expect(200);
    await owner.post(`/campaigns/${second.id}/submit`, { version: 1 }).expect(200);
    const outcomes = await Promise.all([
      reviewer.post(`/campaigns/${first.id}/review`, review(2)),
      reviewer.post(`/campaigns/${second.id}/review`, review(2)),
    ]);
    expect(outcomes.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(await db.adCampaign.count({ where: { placementId: slot.id, status: 'APPROVED' } })).toBe(
      1,
    );
    expect(await db.adInvoice.count({ where: { campaignId: { in: [first.id, second.id] } } })).toBe(
      1,
    );
  });
});
