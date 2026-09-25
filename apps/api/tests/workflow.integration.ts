import { PrismaClient } from '@prisma/client';
import { Queue, QueueEvents, Worker } from 'bullmq';
import IORedis from 'ioredis';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { PasswordService } from '../src/identity.js';
import { PrismaIdentityRepository } from '../src/prisma-identity-repository.js';
import {
  cleanExpiredIdentity,
  publishScheduledArticles,
  handleMaintenanceJob,
} from '../src/maintenance.js';

const database = new URL(process.env.DATABASE_URL || '');
if (
  !/^magaram_test_[a-f0-9]{24}$/.test(process.env.MAGARAM_TEST_SCHEMA || '') ||
  database.pathname !== `/${process.env.MAGARAM_TEST_SCHEMA}` ||
  database.hostname !== '127.0.0.1' ||
  database.port !== '33316'
)
  throw new Error('Refusing to run outside a newly created local integration database.');
const db = new PrismaClient();
const app = createApp({
  db,
  identityRepository: new PrismaIdentityRepository(db),
  config: loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: database.toString(),
    REDIS_URL: 'redis://127.0.0.1:36379',
    WEB_ORIGIN: 'http://localhost:3001',
    SESSION_SECRET: 'integration-only-secret-not-for-deployment',
    RATE_LIMIT_MAX: '1000',
  }),
});
const password = 'fixture-password-for-tests-only';
let authorId: string;
beforeAll(async () => {
  await db.taxonomy.createMany({
    data: [
      { kind: 'category', slug: 'test', name: 'test' },
      { kind: 'location', slug: 'test', name: 'test' },
    ],
  });
  const hash = await new PasswordService().hash(password);
  const permission = await db.permission.create({ data: { code: '*' } });
  const role = await db.role.create({
    data: {
      code: 'SUPER_ADMIN',
      name: 'Integration admin',
      permissions: { create: { permissionId: permission.id } },
    },
  });
  for (const name of ['reporter', 'editor']) {
    const user = await db.user.create({
      data: {
        email: `${name}@example.test`,
        displayName: name,
        passwordHash: hash,
        roles: { create: { roleId: role.id } },
      },
    });
    if (name === 'reporter') authorId = user.id;
  }
  const draftPermission = await db.permission.create({ data: { code: 'articles:draft' } });
  const reporterRole = await db.role.create({
    data: {
      code: 'REPORTER',
      name: 'Limited reporter',
      permissions: { create: { permissionId: draftPermission.id } },
    },
  });
  await db.user.create({
    data: {
      email: 'limited@example.test',
      displayName: 'Limited reporter',
      passwordHash: hash,
      roles: { create: { roleId: reporterRole.id } },
    },
  });
});
afterAll(async () => {
  await db.$disconnect();
});
async function actor(name: string) {
  const client = request.agent(app);
  const csrf = (await client.get('/api/v1/auth/csrf').expect(200)).body.data.token;
  await client
    .post('/api/v1/auth/login')
    .set('x-csrf-token', csrf)
    .send({ email: `${name}@example.test`, password })
    .expect(200);
  return { client, csrf };
}
describe('persisted editorial and identity workflows', () => {
  it('executes real Redis jobs, retries failures and deduplicates recurring schedulers', async () => {
    const name = process.env.MAGARAM_TEST_SCHEMA!;
    const connection = new IORedis('redis://127.0.0.1:36379', { maxRetriesPerRequest: null });
    const queue = new Queue(name, { connection });
    const events = new QueueEvents(name, { connection });
    const worker = new Worker(name, (job) => handleMaintenanceJob(db, job.name), { connection });
    try {
      await events.waitUntilReady();
      await worker.waitUntilReady();
      const job = await queue.add('expired-session-cleanup', {});
      expect(await job.waitUntilFinished(events, 10000)).toEqual({ sessions: 0, resets: 0 });
      const invalid = await queue.add(
        'not-an-allowed-job',
        {},
        { attempts: 2, backoff: { type: 'fixed', delay: 50 } },
      );
      await expect(invalid.waitUntilFinished(events, 10000)).rejects.toThrow('Unsupported');
      expect((await queue.getJob(invalid.id!))?.attemptsMade).toBe(2);
      await queue.upsertJobScheduler(
        'retention',
        { every: 3600000 },
        { name: 'expired-session-cleanup', data: {} },
      );
      await queue.upsertJobScheduler(
        'retention',
        { every: 3600000 },
        { name: 'expired-session-cleanup', data: {} },
      );
      expect(await queue.getJobSchedulersCount()).toBe(1);
    } finally {
      await worker.close();
      await events.close();
      await queue.obliterate({ force: true });
      await queue.close();
      await connection.quit();
    }
  });
  it('enforces independent verification, revision locking, scheduling, public privacy and AI gating', async () => {
    const author = await actor('reporter');
    const editor = await actor('editor');
    const draft = (
      await author.client
        .post('/api/v1/articles')
        .set('x-csrf-token', author.csrf)
        .send({
          title: 'Integration reporting fixture',
          slug: 'integration-reporting-fixture',
          summary: 'A controlled integration test story.',
          body: 'This is an isolated database fixture, never real reporting.',
          category: 'test',
          location: 'test',
          sources: [{ label: 'Test reporting', url: 'https://example.test/source' }],
          claims: [{ text: 'A claim requiring independent verification.' }],
        })
        .expect(200)
    ).body.data;
    let version = draft.version;
    async function transition(who: typeof author, status: string, extra = {}) {
      const result = await who.client
        .post(`/api/v1/articles/${draft.id}/transition`)
        .set('x-csrf-token', who.csrf)
        .send({ status, version, ...extra })
        .expect(200);
      version = result.body.data.version;
    }
    await transition(author, 'EDITOR_REVIEW');
    await transition(editor, 'FACT_CHECK');
    const verification = {
      version,
      sources: [{ id: draft.sources[0].id, verified: true }],
      claims: [
        {
          id: draft.claims[0].id,
          status: 'VERIFIED',
          evidence: 'Private verification notes that must not be public.',
        },
      ],
    };
    await author.client
      .post(`/api/v1/articles/${draft.id}/verify`)
      .set('x-csrf-token', author.csrf)
      .send(verification)
      .expect(403);
    await editor.client
      .post(`/api/v1/articles/${draft.id}/verify`)
      .set('x-csrf-token', editor.csrf)
      .send({ ...verification, sources: [{ id: 'another-article-source', verified: true }] })
      .expect(422);
    await editor.client
      .post(`/api/v1/articles/${draft.id}/verify`)
      .set('x-csrf-token', editor.csrf)
      .send(verification)
      .expect(200);
    version++;
    await editor.client
      .post(`/api/v1/articles/${draft.id}/verify`)
      .set('x-csrf-token', editor.csrf)
      .send(verification)
      .expect(409);
    await transition(editor, 'APPROVED');
    const scheduledAt = new Date(Date.now() + 60000);
    await transition(editor, 'SCHEDULED', { scheduledAt: scheduledAt.toISOString() });
    await request(app).get(`/api/v1/news/${draft.slug}`).expect(404);
    expect(await publishScheduledArticles(db, new Date(scheduledAt.getTime() + 1))).toEqual({
      published: 1,
      blocked: 0,
    });
    expect(await publishScheduledArticles(db, new Date(scheduledAt.getTime() + 1))).toEqual({
      published: 0,
      blocked: 0,
    });
    // Make the publication visible to the wall clock without waiting; this is test-only data.
    await db.article.update({
      where: { id: draft.id },
      data: { publishedAt: new Date(Date.now() - 1000) },
    });
    const publicStory = (await request(app).get(`/api/v1/news/${draft.slug}`).expect(200)).body
      .data;
    expect(publicStory).not.toHaveProperty('claims');
    expect(publicStory).not.toHaveProperty('approvedBy');
    expect(JSON.stringify(publicStory)).not.toContain('Private verification');
    const discovery = (await request(app).get('/api/v1/news/discovery').expect(200)).body.data;
    expect(discovery.categories).toContain('test');
    expect(discovery.locations).toContain('test');
    const index = (await request(app).get('/api/v1/news/index').expect(200)).body.data;
    expect(index.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: draft.slug, category: 'test', location: 'test' }),
      ]),
    );
    expect(JSON.stringify(index)).not.toContain('Private verification');
    const filteredIndex = (
      await request(app).get(
        '/api/v1/news/index?category=test&location=test&q=' + encodeURIComponent(draft.title),
      )
    ).body.data;
    expect(filteredIndex.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ slug: draft.slug })]),
    );
    const excludedIndex = (await request(app).get('/api/v1/news/index?category=missing')).body.data;
    expect(excludedIndex.items).toHaveLength(0);
    expect(await db.articleRevision.count({ where: { articleId: draft.id } })).toBe(version + 1);
    const prepared = await author.client
      .post('/api/v1/ai/prepare')
      .set('x-csrf-token', author.csrf)
      .send({ articleId: draft.id, version: version + 1, task: 'summary' })
      .expect(200);
    expect(prepared.body.data.humanApprovalRequired).toBe(true);
    await author.client
      .post('/api/v1/ai/generate')
      .set('x-csrf-token', author.csrf)
      .send({})
      .expect(503);
    expect(
      await db.auditLog.count({ where: { action: 'ai.prompt.prepared', entityId: draft.id } }),
    ).toBe(1);
  });
  it('enforces registered taxonomy, private media ownership and draft-only author assignment', async () => {
    const limited = await actor('limited');
    const editor = await actor('editor');
    const input = {
      title: 'A classification fixture',
      slug: 'classification-fixture',
      summary: 'Classification integration test.',
      body: 'An isolated classification and authorship integration fixture.',
      category: 'test',
      location: 'test',
    };
    await limited.client
      .post('/api/v1/taxonomy')
      .set('x-csrf-token', limited.csrf)
      .send({ kind: 'tag', slug: 'fixture', name: 'fixture' })
      .expect(403);
    await editor.client
      .post('/api/v1/taxonomy')
      .set('x-csrf-token', editor.csrf)
      .send({ kind: 'tag', slug: 'fixture', name: 'fixture' })
      .expect(200);
    await limited.client
      .post('/api/v1/articles')
      .set('x-csrf-token', limited.csrf)
      .send({ ...input, category: 'not-registered' })
      .expect(422);
    const privateMedia = await db.mediaAsset.create({
      data: {
        filename: 'integration-not-a-real-file.png',
        mime: 'image/png',
        size: 1,
        alt: 'Private draft image',
        credit: 'Test fixture',
        ownerId: authorId,
      },
    });
    const library = (await limited.client.get('/api/v1/media').expect(200)).body.data;
    expect(library.some((item: { id: string }) => item.id === privateMedia.id)).toBe(false);
    await limited.client.get(`/api/v1/media/${privateMedia.id}/file`).expect(404);
    await limited.client
      .post('/api/v1/articles')
      .set('x-csrf-token', limited.csrf)
      .send({ ...input, imageId: privateMedia.id })
      .expect(422);
    const draft = (
      await limited.client
        .post('/api/v1/articles')
        .set('x-csrf-token', limited.csrf)
        .send({ ...input, tags: ['fixture'] })
        .expect(200)
    ).body.data;
    await limited.client
      .post(`/api/v1/articles/${draft.id}/author`)
      .set('x-csrf-token', limited.csrf)
      .send({ authorId, version: 1 })
      .expect(403);
    await editor.client
      .post(`/api/v1/articles/${draft.id}/author`)
      .set('x-csrf-token', editor.csrf)
      .send({ authorId, version: 1 })
      .expect(200);
    await editor.client
      .post(`/api/v1/articles/${draft.id}/author`)
      .set('x-csrf-token', editor.csrf)
      .send({ authorId, version: 1 })
      .expect(409);
    const changed = await db.article.findUniqueOrThrow({ where: { id: draft.id } });
    expect(changed.authorId).toBe(authorId);
    expect(changed.version).toBe(2);
    expect(await db.articleRevision.count({ where: { articleId: draft.id } })).toBe(2);
  });
  it('cleans old credentials, preserves live sessions and atomically changes a password', async () => {
    const { client, csrf } = await actor('reporter');
    await db.session.create({
      data: {
        userId: authorId,
        tokenHash: 'a'.repeat(64),
        expiresAt: new Date(Date.now() - 9 * 86400000),
      },
    });
    await db.passwordReset.create({
      data: {
        userId: authorId,
        tokenHash: 'b'.repeat(64),
        expiresAt: new Date(Date.now() - 9 * 86400000),
      },
    });
    expect(await cleanExpiredIdentity(db)).toEqual({ sessions: 1, resets: 1 });
    await client.get('/api/v1/me').expect(200);
    await client
      .post('/api/v1/auth/password-change')
      .set('x-csrf-token', csrf)
      .send({ currentPassword: password, password: 'replacement-fixture-password' })
      .expect(200);
    await client.get('/api/v1/me').expect(401);
    expect(await db.session.count({ where: { userId: authorId, revokedAt: null } })).toBe(0);
    expect(
      await db.auditLog.count({ where: { actorId: authorId, action: 'auth.password.changed' } }),
    ).toBe(1);
  });
  it('persists, authorizes and revokes hashed social consent', async () => {
    const admin = await actor('editor');
    const limited = await actor('limited');
    const subjectHash = 'c'.repeat(64);
    await limited.client
      .post('/api/v1/social/consents')
      .set('x-csrf-token', limited.csrf)
      .send({
        subjectHash,
        channel: 'WHATSAPP',
        purpose: 'news alerts',
        source: 'website opt-in',
      })
      .expect(403);
    await admin.client
      .post('/api/v1/social/consents')
      .send({ subjectHash, channel: 'WHATSAPP', purpose: 'news alerts', source: 'website opt-in' })
      .expect(403);
    const consent = (
      await admin.client
        .post('/api/v1/social/consents')
        .set('x-csrf-token', admin.csrf)
        .send({
          subjectHash,
          channel: 'WHATSAPP',
          purpose: 'news alerts',
          source: 'website opt-in',
        })
        .expect(200)
    ).body.data;
    const listed = (await admin.client.get('/api/v1/social/consents').expect(200)).body.data;
    expect(listed).toEqual(expect.arrayContaining([expect.objectContaining({ id: consent.id })]));
    await admin.client
      .post(`/api/v1/social/consents/${consent.id}/revoke`)
      .set('x-csrf-token', admin.csrf)
      .expect(200);
    const revoked = (await admin.client.get('/api/v1/social/consents').expect(200)).body.data.find(
      (item: { id: string }) => item.id === consent.id,
    );
    expect(revoked.revokedAt).toBeTruthy();
    expect(
      await db.auditLog.count({
        where: { entityType: 'SocialConsent', entityId: consent.id },
      }),
    ).toBe(2);
  });
});

describe('local business workflow', () => {
  it('protects management, records verification, gates offers and saves consented leads', async () => {
    const { client, csrf } = await actor('editor');
    const limited = await actor('limited');
    await request(app).get('/api/v1/local/manage').expect(401);
    await limited.client.get('/api/v1/local/leads').expect(403);
    const post = (path: string, body: object) =>
      client
        .post('/api/v1/local' + path)
        .set('x-csrf-token', csrf)
        .send(body);
    const business = (
      await post('/businesses', {
        name: 'Test shop',
        slug: 'test-shop',
        description: 'A local fixture business',
        category: 'Retail',
        location: 'Chennai',
      }).expect(200)
    ).body.data;
    expect((await request(app).get('/api/v1/local/businesses')).body.data.items).toHaveLength(0);
    await post(`/businesses/${business.id}/verify`, {}).expect(422);
    await post(`/businesses/${business.id}/verify`, {
      evidence: 'Registration checked against fixture record.',
    }).expect(200);
    expect(
      await db.auditLog.count({
        where: { entityId: business.id, action: 'local.business.verified' },
      }),
    ).toBe(1);
    const createOffer = async (start: number, end: number) =>
      (
        await post(`/businesses/${business.id}/offers`, {
          title: 'Fixture offer',
          description: 'A clearly labelled fixture offer',
          terms: 'Fixture terms, subject to stock availability.',
          startsAt: new Date(Date.now() + start).toISOString(),
          endsAt: new Date(Date.now() + end).toISOString(),
        }).expect(200)
      ).body.data;
    const future = await createOffer(86400000, 172800000);
    const current = await createOffer(-86400000, 86400000);
    await post(`/offers/${future.id}/status`, { status: 'ACTIVE' }).expect(200);
    await post(`/offers/${current.id}/status`, { status: 'ACTIVE' }).expect(200);
    const listing = (await request(app).get('/api/v1/local/businesses')).body.data.items[0];
    expect(listing.ownerId).toBeUndefined();
    expect(listing.offers.map((offer: { id: string }) => offer.id)).toEqual([current.id]);
    const lead = {
      businessId: business.id,
      name: 'Visitor',
      email: 'visitor@example.test',
      message: 'Please contact me',
      consent: true,
    };
    await post('/leads', { ...lead, consent: false }).expect(422);
    await post('/leads', { ...lead, offerId: future.id }).expect(404);
    await request(app).post('/api/v1/local/leads').send(lead).expect(403);
    const visitor = request.agent(app);
    const visitorCsrf = (await visitor.get('/api/v1/auth/csrf')).body.data.token;
    const saved = (
      await visitor
        .post('/api/v1/local/leads')
        .set('x-csrf-token', visitorCsrf)
        .send({ ...lead, offerId: current.id })
        .expect(200)
    ).body.data;
    expect(Object.keys(saved).sort()).toEqual(['id', 'status']);
    const consentAudit = await db.auditLog.findFirstOrThrow({
      where: { entityId: saved.id, action: 'local.lead.consent' },
    });
    expect(consentAudit.metadata).toMatchObject({
      consentVersion: 'local-enquiry-v1',
      businessId: business.id,
    });
    expect(JSON.stringify(consentAudit.metadata)).not.toContain(lead.email);
    await post(`/offers/${current.id}/status`, { status: 'UNKNOWN' }).expect(422);
    const expired = await createOffer(-172800000, -86400000);
    await post(`/offers/${expired.id}/status`, { status: 'ACTIVE' }).expect(409);
    const otherBusiness = (
      await post('/businesses', {
        name: 'Other shop',
        slug: 'other-shop',
        description: 'Another fixture business',
        category: 'Retail',
        location: 'Madurai',
      }).expect(200)
    ).body.data;
    await post(`/businesses/${otherBusiness.id}/verify`, {
      evidence: 'Another registration fixture checked.',
    }).expect(200);
    await post('/leads', { ...lead, businessId: otherBusiness.id, offerId: current.id }).expect(
      404,
    );
    const filtered = await request(app)
      .get('/api/v1/local/businesses?location=Chennai&q=Test')
      .expect(200);
    expect(filtered.body.data.total).toBe(1);
    await request(app).get('/api/v1/local/businesses?page=-1').expect(422);
    await post(`/businesses/${otherBusiness.id}/suspend`, {
      reason: 'End of second business fixture.',
    }).expect(200);
    expect(
      (await db.localLead.findUniqueOrThrow({ where: { id: saved.id } })).consentAt,
    ).toBeInstanceOf(Date);
    await post(`/leads/${saved.id}/status`, { status: 'CONTACTED' }).expect(200);
    await client
      .put(`/api/v1/local/businesses/${business.id}`)
      .set('x-csrf-token', csrf)
      .send({
        name: 'Updated shop',
        slug: 'test-shop',
        description: 'Updated local fixture business',
        category: 'Retail',
        location: 'Chennai',
        website: 'javascript:alert(1)',
      })
      .expect(422);
    await client
      .put(`/api/v1/local/businesses/${business.id}`)
      .set('x-csrf-token', csrf)
      .send({
        name: 'Updated shop',
        slug: 'test-shop',
        description: 'Updated local fixture business',
        category: 'Retail',
        location: 'Chennai',
      })
      .expect(200);
    expect((await request(app).get('/api/v1/local/businesses')).body.data.items).toHaveLength(0);
    expect((await db.localOffer.findUniqueOrThrow({ where: { id: current.id } })).status).toBe(
      'PAUSED',
    );
    await post(`/offers/${current.id}/status`, { status: 'ACTIVE' }).expect(409);
    await post(`/businesses/${business.id}/verify`, {
      evidence: 'Updated business details checked again.',
    }).expect(200);
    await post(`/offers/${current.id}/status`, { status: 'ACTIVE' }).expect(200);

    await post(`/businesses/${business.id}/suspend`, {
      reason: 'Verification no longer valid.',
    }).expect(200);
    expect((await request(app).get('/api/v1/local/businesses')).body.data.items).toHaveLength(0);
    await post('/leads', lead).expect(404);
    await post(`/offers/${current.id}/status`, { status: 'ACTIVE' }).expect(409);
  });
});
