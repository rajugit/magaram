import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { AiService } from '../src/ai-service.js';
import type { AiProvider, AiLimits } from '../src/ai-service.js';
import type { AuthenticatedUser } from '../src/identity.js';

const url = new URL(process.env.DATABASE_URL || '');
if (
  !/^magaram_test_[a-f0-9]{24}$/.test(process.env.MAGARAM_TEST_SCHEMA || '') ||
  url.pathname !== `/${process.env.MAGARAM_TEST_SCHEMA}` ||
  url.hostname !== '127.0.0.1' ||
  url.port !== '33316'
)
  throw new Error('Disposable local test schema required.');
const db = new PrismaClient();
let reporter: AuthenticatedUser;
let editor: AuthenticatedUser;
const limits: AiLimits = {
  dailyPerUser: 100,
  dailyGlobal: 1000,
  maxInputChars: 20000,
  maxOutputTokens: 2000,
  timeoutMs: 1000,
};
beforeAll(async () => {
  for (const name of ['ai-reporter', 'ai-editor']) {
    const user = await db.user.create({
      data: {
        email: `${name}@example.test`,
        displayName: name,
        passwordHash: 'non-login-test-fixture',
      },
    });
    const identity: AuthenticatedUser = {
      ...user,
      roles: ['EDITOR'],
      permissions: ['articles:draft', 'articles:review'],
    };
    if (name === 'ai-reporter') reporter = identity;
    else editor = identity;
  }
});
afterAll(async () => {
  await db.$disconnect();
});
async function story() {
  return db.article.create({
    data: {
      authorId: reporter.id,
      slug: randomUUID(),
      title: 'தமிழ் சோதனைச் செய்தி',
      summary: 'An isolated Tamil editorial test.',
      body: 'This isolated story records source-bound reporting for integration tests.',
      category: 'test',
      location: 'test',
      tags: [],
      sources: {
        create: { label: 'Fixture source', url: 'https://example.test/report', verified: true },
      },
      claims: {
        create: {
          text: 'Original claim requiring review.',
          evidence: 'Original fixture evidence',
          status: 'VERIFIED',
        },
      },
    },
    include: { sources: true },
  });
}
const input = (article: { id: string; version: number }) => ({
  articleId: article.id,
  version: article.version,
  task: 'summary' as const,
  requestKey: randomUUID(),
  consentToSend: true as const,
});
const provider = (sourceId: string): AiProvider & { generate: ReturnType<typeof vi.fn> } => ({
  name: 'TEST_FIXTURE_ONLY',
  model: 'no-network-fixture',
  generate: vi.fn(async () => ({
    value: {
      text: 'சரிபார்ப்புக்காக உருவாக்கப்பட்ட தமிழ் சுருக்கம்.',
      sourceIds: [sourceId],
      warnings: ['Independent verification required.'],
      claims: [],
    },
    inputTokens: 100,
    outputTokens: 40,
  })),
});

describe('persisted AI governance with an explicitly test-only provider', () => {
  it('saves one proposal and charges quota once when a request is repeated', async () => {
    const article = await story();
    const fake = provider(article.sources[0].id);
    const service = new AiService(db, fake, limits);
    const data = input(article);
    const first = await service.generate(reporter, data);
    const second = await service.generate(reporter, data);
    expect(first.status).toBe('READY');
    expect(second.id).toBe(first.id);
    expect(fake.generate).toHaveBeenCalledTimes(1);
    await expect(
      service.generate(reporter, { ...data, task: 'translation' }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    expect(
      await db.aiRun.count({ where: { actorId: reporter.id, requestKey: data.requestKey } }),
    ).toBe(1);
    expect(await db.auditLog.count({ where: { entityId: first.id } })).toBe(2);
    expect(first).not.toHaveProperty('inputSnapshot');
  });
  it('rejects self-acceptance and applies independently accepted text only as an unverified draft', async () => {
    const article = await story();
    const service = new AiService(db, provider(article.sources[0].id), limits);
    const run = await service.generate(reporter, input(article));
    await expect(
      service.review(reporter, run.id, 'ACCEPTED', 'I reviewed the source packet.'),
    ).rejects.toMatchObject({ code: 'INDEPENDENT_REVIEW_REQUIRED' });
    await service.review(
      editor,
      run.id,
      'ACCEPTED',
      'The wording is suitable for further fact checking.',
    );
    const changed = await db.article.findUniqueOrThrow({
      where: { id: article.id },
      include: { sources: true, claims: true },
    });
    expect(changed.status).toBe('AI_DRAFT');
    expect(changed.version).toBe(2);
    expect(changed.publishedAt).toBeNull();
    expect(changed.sources.every((source) => !source.verified)).toBe(true);
    expect(changed.claims.every((claim) => claim.status === 'UNVERIFIED')).toBe(true);
    await expect(
      service.review(editor, run.id, 'ACCEPTED', 'Repeated decision is not allowed.'),
    ).rejects.toMatchObject({ code: 'PROPOSAL_REVIEWED' });
    expect(await db.articleRevision.count({ where: { articleId: article.id } })).toBe(1);
  });
  it('rejects a stale proposal and permits a recorded rejection without changing the article', async () => {
    const article = await story();
    const service = new AiService(db, provider(article.sources[0].id), limits);
    const run = await service.generate(reporter, input(article));
    await db.article.update({ where: { id: article.id }, data: { version: { increment: 1 } } });
    await expect(
      service.review(editor, run.id, 'ACCEPTED', 'Attempt to accept stale reporting.'),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    expect((await db.aiRun.findUniqueOrThrow({ where: { id: run.id } })).status).toBe('READY');
    expect(
      (
        await service.review(
          reporter,
          run.id,
          'REJECTED',
          'Reporting has changed; regenerate later.',
        )
      ).status,
    ).toBe('REJECTED');
  });
  it('keeps provider errors private and fails invalid source references', async () => {
    const article = await story();
    const fake = provider('invented-source');
    const service = new AiService(db, fake, limits);
    const invalid = await service.generate(reporter, input(article));
    expect(invalid.failureCode).toBe('INVALID_PROVIDER_OUTPUT');
    expect(invalid.output).toBeNull();
    fake.generate.mockRejectedValue(new Error('DO_NOT_EXPOSE_PROVIDER_DIAGNOSTICS'));
    const failed = await service.generate(reporter, input(article));
    expect(failed.failureCode).toBe('PROVIDER_UNAVAILABLE');
    expect(JSON.stringify(failed)).not.toContain('DO_NOT_EXPOSE');
  });
  it('times out a stalled provider and retains quota for uncertain outcomes', async () => {
    const article = await story();
    const fake = provider(article.sources[0].id);
    fake.generate.mockImplementation(() => new Promise(() => {}));
    const service = new AiService(db, fake, { ...limits, timeoutMs: 50 });
    const data = input(article);
    expect((await service.generate(reporter, data)).failureCode).toBe('PROVIDER_TIMEOUT');
    await service.generate(reporter, data);
    expect(fake.generate).toHaveBeenCalledTimes(1);
  });
  it('enforces quota before contacting the provider and rejects disabled generation', async () => {
    const article = await story();
    const fake = provider(article.sources[0].id);
    await expect(new AiService(db).generate(reporter, input(article))).rejects.toMatchObject({
      code: 'AI_PROVIDER_UNAVAILABLE',
    });
    await expect(
      new AiService(db, fake, { ...limits, dailyPerUser: 1 }).generate(reporter, input(article)),
    ).rejects.toMatchObject({ code: 'AI_DAILY_LIMIT' });
    expect(fake.generate).not.toHaveBeenCalled();
  });
});
