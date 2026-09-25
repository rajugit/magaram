import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
export { PrismaClient };

export async function handleMaintenanceJob(db: PrismaClient, name: string) {
  if (name === 'expired-session-cleanup') return cleanExpiredIdentity(db);
  if (name === 'scheduled-publication') return publishScheduledArticles(db);
  throw new Error('Unsupported maintenance job.');
}

export function publicationReady(article: {
  authorId: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  sources: { verified: boolean }[];
  claims: { status: string }[];
  image?: { rightsStatus: string } | null;
}) {
  return Boolean(
    article.approvedBy &&
    article.approvedBy !== article.authorId &&
    article.approvedAt &&
    article.sources.length &&
    article.sources.every((source) => source.verified) &&
    article.claims.every((claim) => claim.status === 'VERIFIED') &&
    (!article.image || article.image.rightsStatus === 'CLEARED'),
  );
}

// Retain invalidated credentials for seven days. Never delete live credentials or audit history.
export async function cleanExpiredIdentity(db: PrismaClient, now = new Date()) {
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return db.$transaction(async (tx) => {
    const sessions = await tx.session.deleteMany({
      where: { OR: [{ expiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }] },
    });
    const resets = await tx.passwordReset.deleteMany({
      where: { OR: [{ expiresAt: { lt: cutoff } }, { usedAt: { lt: cutoff } }] },
    });
    return { sessions: sessions.count, resets: resets.count };
  });
}

export async function publishScheduledArticles(db: PrismaClient, now = new Date()) {
  const due = await db.article.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: now }, isDemo: false },
    select: { id: true },
    orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
    take: 100,
  });
  let published = 0;
  let blocked = 0;
  for (const { id } of due) {
    const outcome = await db.$transaction(async (tx) => {
      const article = await tx.article.findUnique({
        where: { id },
        include: { sources: true, claims: true, image: true },
      });
      if (
        !article ||
        article.status !== 'SCHEDULED' ||
        !article.scheduledAt ||
        article.scheduledAt > now
      )
        return 'skipped';
      const approver = article.approvedBy
        ? await tx.user.findFirst({
            where: {
              id: article.approvedBy,
              status: 'ACTIVE',
              deletedAt: null,
              roles: {
                some: {
                  role: {
                    permissions: {
                      some: { permission: { code: { in: ['*', 'articles:review'] } } },
                    },
                  },
                },
              },
            },
            select: { id: true },
          })
        : null;
      const ready = publicationReady(article) && Boolean(approver);
      // Compare-and-swap makes retries, manual publication and cancellation safe.
      const changed = await tx.article.updateMany({
        where: { id, version: article.version, status: 'SCHEDULED', scheduledAt: { lte: now } },
        data: ready
          ? { status: 'PUBLISHED', publishedAt: now, version: { increment: 1 } }
          : {
              status: 'EDITOR_REVIEW',
              approvedAt: null,
              approvedBy: null,
              scheduledAt: null,
              version: { increment: 1 },
            },
      });
      if (!changed.count) return 'skipped';
      const updated = await tx.article.findUniqueOrThrow({
        where: { id },
        include: { sources: true, claims: true },
      });
      await tx.articleRevision.create({
        data: {
          articleId: id,
          actorId: 'system:scheduler',
          version: updated.version,
          snapshot: JSON.parse(JSON.stringify(updated)) as Prisma.InputJsonValue,
        },
      });
      await tx.auditLog.create({
        data: {
          action: ready ? 'article.published.scheduled' : 'article.schedule.blocked',
          entityType: 'Article',
          entityId: id,
          metadata: {
            reason: ready ? 'approved-schedule-due' : 'approval-or-verification-invalid',
            version: updated.version,
          },
        },
      });
      return ready ? 'published' : 'blocked';
    });
    if (outcome === 'published') published++;
    if (outcome === 'blocked') blocked++;
  }
  return { published, blocked };
}
