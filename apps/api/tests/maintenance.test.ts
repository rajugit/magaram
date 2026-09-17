import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  cleanExpiredIdentity,
  publicationReady,
  publishScheduledArticles,
} from '../src/maintenance.js';

const now = new Date('2026-09-16T12:00:00Z');
const article = {
  id: 'story',
  version: 8,
  status: 'SCHEDULED',
  scheduledAt: new Date(now.getTime() - 60000),
  authorId: 'reporter',
  approvedBy: 'editor',
  approvedAt: now,
  sources: [{ verified: true }],
  claims: [{ status: 'VERIFIED' }],
};
function fixture(
  current = article,
  changed = 1,
  approver: { id: string } | null = { id: 'editor' },
) {
  const tx = {
    article: {
      findUnique: vi.fn().mockResolvedValue(current),
      updateMany: vi.fn().mockResolvedValue({ count: changed }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ ...current, version: 9 }),
    },
    user: { findFirst: vi.fn().mockResolvedValue(approver) },
    articleRevision: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    session: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
    passwordReset: { deleteMany: vi.fn().mockResolvedValue({ count: 3 }) },
  };
  const db = {
    article: { findMany: vi.fn().mockResolvedValue([{ id: 'story' }]) },
    $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx),
  };
  return { tx, db: db as unknown as PrismaClient };
}
describe('maintenance safeguards (repository doubles)', () => {
  it('retains seven days of invalidated credentials without touching audit records', async () => {
    const { db, tx } = fixture();
    expect(await cleanExpiredIdentity(db, now)).toEqual({ sessions: 2, resets: 3 });
    expect(tx.session.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { expiresAt: { lt: new Date('2026-09-09T12:00:00Z') } },
          { revokedAt: { lt: new Date('2026-09-09T12:00:00Z') } },
        ],
      },
    });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
  it('publishes a due verified article and records its revision and audit atomically', async () => {
    const { db, tx } = fixture();
    expect(await publishScheduledArticles(db, now)).toEqual({ published: 1, blocked: 0 });
    expect(tx.article.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'story', version: 8, status: 'SCHEDULED', scheduledAt: { lte: now } },
        data: { status: 'PUBLISHED', publishedAt: now, version: { increment: 1 } },
      }),
    );
    expect(tx.articleRevision.create).toHaveBeenCalledOnce();
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'article.published.scheduled' }),
      }),
    );
  });
  it('does not create a duplicate revision when another request wins the version check', async () => {
    const { db, tx } = fixture(article, 0);
    expect(await publishScheduledArticles(db, now)).toEqual({ published: 0, blocked: 0 });
    expect(tx.articleRevision.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
  it('returns a schedule to review when its approver no longer has access', async () => {
    const { db, tx } = fixture(article, 1, null);
    expect(await publishScheduledArticles(db, now)).toEqual({ published: 0, blocked: 1 });
    expect(tx.article.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'EDITOR_REVIEW',
          approvedBy: null,
          scheduledAt: null,
        }),
      }),
    );
  });
  it('does not publish cancelled or future schedules', async () => {
    for (const current of [
      { ...article, status: 'DRAFT' },
      { ...article, scheduledAt: new Date(now.getTime() + 60000) },
    ]) {
      const { db, tx } = fixture(current);
      await publishScheduledArticles(db, now);
      expect(tx.article.updateMany).not.toHaveBeenCalled();
    }
  });
  it('requires independent approval, sources and verification', () => {
    expect(publicationReady(article)).toBe(true);
    expect(publicationReady({ ...article, approvedBy: article.authorId })).toBe(false);
    expect(publicationReady({ ...article, sources: [] })).toBe(false);
    expect(publicationReady({ ...article, claims: [{ status: 'UNVERIFIED' }] })).toBe(false);
    expect(publicationReady({ ...article, approvedAt: null })).toBe(false);
  });
});
