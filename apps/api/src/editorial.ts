import type { Prisma, PrismaClient } from '@prisma/client';
import { Router, raw } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ApiError, sendSuccess } from './api-response.js';
import { requireAuthentication, requirePermission } from './rbac.js';
import type { AuthenticatedUser } from './identity.js';
import { publicationReady } from './maintenance.js';
import { inspectImage } from './media-validation.js';

export const states = [
  'DRAFT',
  'AI_DRAFT',
  'EDITOR_REVIEW',
  'FACT_CHECK',
  'APPROVED',
  'SCHEDULED',
  'PUBLISHED',
  'UPDATED',
  'ARCHIVED',
] as const;
export const articleSchema = z
  .object({
    title: z.string().trim().min(5).max(250),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(191),
    summary: z.string().trim().min(10).max(1000),
    body: z.string().trim().min(30).max(150000),
    category: z.string().trim().min(1).max(100),
    location: z.string().trim().min(1).max(100),
    type: z
      .enum([
        'NEWS',
        'BREAKING',
        'OPINION',
        'ANALYSIS',
        'INTERVIEW',
        'PRESS_RELEASE',
        'PHOTO_STORY',
        'VIDEO',
        'LIVE',
      ])
      .default('NEWS'),
    tags: z.array(z.string().trim().min(1).max(60)).max(15).default([]),
    sensitive: z.boolean().default(false),
    sponsored: z.boolean().default(false),
    imageId: z.string().max(191).nullable().default(null),
    seoTitle: z.string().max(250).optional(),
    seoDescription: z.string().max(320).optional(),
    sources: z
      .array(
        z.object({
          label: z.string().min(2).max(250),
          url: z
            .url()
            .refine((v) => /^https?:\/\//.test(v))
            .max(1000),
        }),
      )
      .max(30)
      .default([]),
    claims: z
      .array(z.object({ text: z.string().min(5).max(2000) }))
      .max(30)
      .default([]),
  })
  .strict();
const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().max(200).optional(),
  status: z.enum(states).optional(),
  category: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
});
export const can = (user: AuthenticatedUser, permission: string) =>
  user.permissions.includes('*') || user.permissions.includes(permission);
const detail = {
  author: { select: { id: true, displayName: true } },
  image: true,
  sources: true,
  claims: true,
  corrections: { orderBy: { createdAt: 'desc' as const } },
};
const published = ['PUBLISHED', 'UPDATED'] as const;
const publicArticleWhere = (): Prisma.ArticleWhereInput => ({
  status: { in: [...published] },
  isDemo: false,
  publishedAt: { lte: new Date() },
});
export const publicArticleIndexSelect = {
  slug: true,
  title: true,
  category: true,
  location: true,
  publishedAt: true,
  updatedAt: true,
} satisfies Prisma.ArticleSelect;
async function validateArticleReferences(
  tx: Prisma.TransactionClient,
  input: z.infer<typeof articleSchema>,
  actor: AuthenticatedUser,
) {
  const taxonomy = await tx.taxonomy.findMany({
    where: {
      OR: [
        { kind: 'category', name: input.category },
        { kind: 'location', name: input.location },
        { kind: 'tag', name: { in: input.tags } },
      ],
    },
  });
  if (
    !taxonomy.some((item) => item.kind === 'category' && item.name === input.category) ||
    !taxonomy.some((item) => item.kind === 'location' && item.name === input.location) ||
    input.tags.some((tag) => !taxonomy.some((item) => item.kind === 'tag' && item.name === tag))
  )
    throw new ApiError(
      422,
      'UNKNOWN_TAXONOMY',
      'Choose registered categories, locations and tags. An editor can add them in Taxonomy.',
    );
  if (input.imageId) {
    const image = await tx.mediaAsset.findUnique({
      where: { id: input.imageId },
      include: {
        articles: {
          where: {
            status: { in: [...published] },
            publishedAt: { lte: new Date() },
            isDemo: false,
          },
          take: 1,
        },
      },
    });
    if (
      !image ||
      (image.ownerId !== actor.id && !can(actor, 'articles:review') && !image.articles.length)
    )
      throw new ApiError(
        422,
        'INVALID_MEDIA',
        'Choose an image you own or may use from the published library.',
      );
  }
}
// Public responses must never expose internal verification notes, actor IDs or revisions.
export const publicArticleSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  body: true,
  type: true,
  category: true,
  location: true,
  tags: true,
  sponsored: true,
  publishedAt: true,
  updatedAt: true,
  seoTitle: true,
  seoDescription: true,
  author: { select: { displayName: true } },
  image: { select: { id: true, alt: true, credit: true } },
  corrections: {
    select: { id: true, reason: true, createdAt: true },
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.ArticleSelect;
export function guardTransition(
  article: {
    status: string;
    authorId: string;
    sources: { verified: boolean }[];
    claims: { status: string }[];
    image?: { rightsStatus: string } | null;
    approvedBy?: string | null;
    approvedAt?: Date | null;
  },
  target: string,
  actor: AuthenticatedUser,
) {
  const allowed: Record<string, string[]> = {
    DRAFT: ['EDITOR_REVIEW', 'ARCHIVED'],
    AI_DRAFT: ['EDITOR_REVIEW', 'ARCHIVED'],
    EDITOR_REVIEW: ['DRAFT', 'FACT_CHECK'],
    FACT_CHECK: ['DRAFT', 'APPROVED'],
    APPROVED: ['DRAFT', 'SCHEDULED', 'PUBLISHED'],
    SCHEDULED: ['DRAFT', 'PUBLISHED'],
    PUBLISHED: ['ARCHIVED'],
    UPDATED: ['ARCHIVED'],
    ARCHIVED: ['DRAFT'],
  };
  if (!allowed[article.status]?.includes(target))
    throw new ApiError(409, 'INVALID_TRANSITION', 'This editorial transition is not allowed.');
  if (
    ['FACT_CHECK', 'APPROVED', 'PUBLISHED', 'SCHEDULED'].includes(target) &&
    !can(actor, 'articles:review')
  )
    throw new ApiError(403, 'FORBIDDEN', 'Editor permission is required.');
  if (target === 'APPROVED') {
    if (actor.id === article.authorId)
      throw new ApiError(
        403,
        'INDEPENDENT_REVIEW_REQUIRED',
        'A different editor must approve the article.',
      );
    if (
      !article.sources.length ||
      article.sources.some((s) => !s.verified) ||
      article.claims.some((c) => c.status !== 'VERIFIED')
    )
      throw new ApiError(
        422,
        'VERIFICATION_REQUIRED',
        'Verify every source and claim before approval.',
      );
  }
  if (
    ['PUBLISHED', 'SCHEDULED'].includes(target) &&
    !publicationReady({
      ...article,
      approvedBy: article.approvedBy ?? null,
      approvedAt: article.approvedAt ?? null,
    })
  )
    throw new ApiError(
      422,
      'VERIFICATION_REQUIRED',
      'Independent approval and verified sources and claims are required.',
    );
}
export function editorialRouter(db: PrismaClient, csrf: RequestHandler): Router {
  const router = Router();
  router.get('/news', async (req, res) => {
    const query = pagination.parse(req.query);
    const where: Prisma.ArticleWhereInput = {
      ...publicArticleWhere(),
      ...(query.category ? { category: query.category } : {}),
      ...(query.location ? { location: query.location } : {}),
      ...(query.q
        ? { OR: [{ title: { contains: query.q } }, { summary: { contains: query.q } }] }
        : {}),
    };
    const [items, total] = await Promise.all([
      db.article.findMany({
        where,
        select: publicArticleSelect,
        orderBy: { publishedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.article.count({ where }),
    ]);
    sendSuccess(res, { items, total, page: query.page, limit: query.limit });
  });
  router.get('/news/discovery', async (_req, res) => {
    const where = publicArticleWhere();
    const [categories, locations] = await Promise.all([
      db.article.findMany({
        where,
        distinct: ['category'],
        select: { category: true },
        orderBy: { category: 'asc' },
      }),
      db.article.findMany({
        where,
        distinct: ['location'],
        select: { location: true },
        orderBy: { location: 'asc' },
      }),
    ]);
    sendSuccess(res, {
      categories: categories.map((item) => item.category),
      locations: locations.map((item) => item.location),
    });
  });
  router.get('/news/index', async (req, res) => {
    const query = pagination.parse(req.query);
    const where: Prisma.ArticleWhereInput = {
      ...publicArticleWhere(),
      ...(query.category ? { category: query.category } : {}),
      ...(query.location ? { location: query.location } : {}),
      ...(query.q
        ? { OR: [{ title: { contains: query.q } }, { category: { contains: query.q } }] }
        : {}),
    };
    const [items, total] = await Promise.all([
      db.article.findMany({
        where,
        select: publicArticleIndexSelect,
        orderBy: { publishedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.article.count({ where }),
    ]);
    sendSuccess(res, { items, total, page: query.page, limit: query.limit });
  });
  router.get('/news/:slug', async (req, res) => {
    const item = await db.article.findFirst({
      where: {
        slug: String(req.params.slug),
        ...publicArticleWhere(),
      },
      select: publicArticleSelect,
    });
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Article not found.');
    sendSuccess(res, item);
  });
  router.get('/taxonomy', async (_req, res) =>
    sendSuccess(res, await db.taxonomy.findMany({ orderBy: { name: 'asc' }, take: 500 })),
  );
  router.post('/taxonomy', requirePermission('articles:review'), csrf, async (req, res) => {
    const data = z
      .object({
        kind: z.enum(['category', 'tag', 'location']),
        slug: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .max(100),
        name: z.string().min(1).max(160),
      })
      .strict()
      .parse(req.body);
    const item = await db.$transaction(async (tx) => {
      const item = await tx.taxonomy.create({ data });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.id,
          action: 'taxonomy.created',
          entityType: 'Taxonomy',
          entityId: item.id,
          requestId: res.locals.requestId,
          metadata: { kind: data.kind, slug: data.slug },
        },
      });
      return item;
    });
    sendSuccess(res, item);
  });
  router.get('/authors', requireAuthentication(), async (_req, res) =>
    sendSuccess(
      res,
      await db.user.findMany({
        where: {
          deletedAt: null,
          status: 'ACTIVE',
          roles: {
            some: {
              role: {
                permissions: { some: { permission: { code: { in: ['*', 'articles:draft'] } } } },
              },
            },
          },
        },
        select: { id: true, displayName: true },
        take: 100,
      }),
    ),
  );
  router.get('/articles', requireAuthentication(), async (req, res) => {
    if (
      !can(req.auth!, 'articles:draft') &&
      !can(req.auth!, 'articles:review') &&
      !can(req.auth!, 'articles:fact-check')
    )
      throw new ApiError(403, 'FORBIDDEN', 'Newsroom access required.');
    const q = pagination.parse(req.query);
    const where: Prisma.ArticleWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.q ? { title: { contains: q.q } } : {}),
      ...(!can(req.auth!, 'articles:review') && !can(req.auth!, 'articles:fact-check')
        ? { authorId: req.auth!.id }
        : {}),
    };
    const [items, total] = await Promise.all([
      db.article.findMany({
        where,
        include: detail,
        orderBy: { updatedAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      db.article.count({ where }),
    ]);
    sendSuccess(res, { items, total, page: q.page, limit: q.limit });
  });
  router.get('/articles/:id', requireAuthentication(), async (req, res) => {
    const item = await db.article.findUnique({
      where: { id: String(req.params.id) },
      include: { ...detail, revisions: { orderBy: { version: 'desc' }, take: 50 } },
    });
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Article not found.');
    if (
      item.authorId !== req.auth!.id &&
      !can(req.auth!, 'articles:review') &&
      !can(req.auth!, 'articles:fact-check')
    )
      throw new ApiError(403, 'FORBIDDEN', 'Newsroom access required.');
    sendSuccess(res, item);
  });
  router.post('/articles', requirePermission('articles:draft'), csrf, async (req, res) => {
    const { sources, claims, ...input } = articleSchema.parse(req.body);
    const item = await db.$transaction(async (tx) => {
      await validateArticleReferences(tx, { ...input, sources, claims }, req.auth!);
      const item = await tx.article.create({
        data: {
          ...input,
          authorId: req.auth!.id,
          sources: { create: sources },
          claims: { create: claims.map((c) => ({ ...c, evidence: '' })) },
        },
        include: detail,
      });
      await tx.articleRevision.create({
        data: {
          articleId: item.id,
          actorId: req.auth!.id,
          version: 1,
          snapshot: JSON.parse(JSON.stringify(item)),
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.id,
          action: 'article.created',
          entityType: 'Article',
          entityId: item.id,
          requestId: res.locals.requestId,
        },
      });
      return item;
    });
    sendSuccess(res, item);
  });
  router.put('/articles/:id', requirePermission('articles:draft'), csrf, async (req, res) => {
    const { version, ...input } = articleSchema
      .extend({ version: z.number().int().min(1) })
      .parse(req.body);
    const { sources, claims, ...data } = input;
    const item = await db.$transaction(async (tx) => {
      const current = await tx.article.findUnique({ where: { id: String(req.params.id) } });
      if (!current) throw new ApiError(404, 'NOT_FOUND', 'Article not found.');
      if (current.authorId !== req.auth!.id && !can(req.auth!, 'articles:review'))
        throw new ApiError(403, 'FORBIDDEN', 'You cannot edit this article.');
      if (!['DRAFT', 'AI_DRAFT'].includes(current.status))
        throw new ApiError(409, 'REVIEW_LOCKED', 'Return the article to draft before editing.');
      await validateArticleReferences(tx, { ...data, sources, claims }, req.auth!);
      const result = await tx.article.updateMany({
        where: { id: current.id, version },
        data: { ...data, version: { increment: 1 }, approvedBy: null, approvedAt: null },
      });
      if (result.count !== 1)
        throw new ApiError(409, 'VERSION_CONFLICT', 'The article changed. Reload before saving.');
      await tx.articleSource.deleteMany({ where: { articleId: current.id } });
      await tx.articleClaim.deleteMany({ where: { articleId: current.id } });
      await tx.articleSource.createMany({
        data: sources.map((s) => ({ ...s, articleId: current.id })),
      });
      await tx.articleClaim.createMany({
        data: claims.map((c) => ({ ...c, evidence: '', articleId: current.id })),
      });
      const updated = await tx.article.findUniqueOrThrow({
        where: { id: current.id },
        include: detail,
      });
      await tx.articleRevision.create({
        data: {
          articleId: current.id,
          actorId: req.auth!.id,
          version: version + 1,
          snapshot: JSON.parse(JSON.stringify(updated)),
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.id,
          action: 'article.updated',
          entityType: 'Article',
          entityId: current.id,
          requestId: res.locals.requestId,
        },
      });
      return updated;
    });
    sendSuccess(res, item);
  });
  router.post(
    '/articles/:id/author',
    requirePermission('articles:review'),
    csrf,
    async (req, res) => {
      const data = z
        .object({ authorId: z.string().max(191), version: z.number().int().positive() })
        .strict()
        .parse(req.body);
      await db.$transaction(async (tx) => {
        const author = await tx.user.findFirst({
          where: {
            id: data.authorId,
            status: 'ACTIVE',
            deletedAt: null,
            roles: {
              some: {
                role: {
                  permissions: { some: { permission: { code: { in: ['*', 'articles:draft'] } } } },
                },
              },
            },
          },
        });
        if (!author) throw new ApiError(422, 'INVALID_AUTHOR', 'Choose an active newsroom author.');
        const id = String(req.params.id);
        const changed = await tx.article.updateMany({
          where: { id, version: data.version, status: { in: ['DRAFT', 'AI_DRAFT'] } },
          data: {
            authorId: author.id,
            approvedBy: null,
            approvedAt: null,
            scheduledAt: null,
            version: { increment: 1 },
          },
        });
        if (!changed.count)
          throw new ApiError(409, 'VERSION_CONFLICT', 'Only the current draft may be reassigned.');
        await tx.articleSource.updateMany({ where: { articleId: id }, data: { verified: false } });
        await tx.articleClaim.updateMany({
          where: { articleId: id },
          data: { status: 'UNVERIFIED', evidence: '', checkedBy: null },
        });
        const updated = await tx.article.findUniqueOrThrow({ where: { id }, include: detail });
        await tx.articleRevision.create({
          data: {
            articleId: id,
            actorId: req.auth!.id,
            version: updated.version,
            snapshot: JSON.parse(JSON.stringify(updated)),
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: req.auth!.id,
            action: 'article.author.assigned',
            entityType: 'Article',
            entityId: id,
            requestId: res.locals.requestId,
            metadata: { authorId: author.id },
          },
        });
      });
      sendSuccess(res, { saved: true });
    },
  );
  router.post('/articles/:id/transition', requireAuthentication(), csrf, async (req, res) => {
    const data = z
      .object({
        status: z.enum(states),
        version: z.number().int().min(1),
        scheduledAt: z.iso.datetime().optional(),
      })
      .strict()
      .parse(req.body);
    const result = await db.$transaction(async (tx) => {
      const article = await tx.article.findUnique({
        where: { id: String(req.params.id) },
        include: detail,
      });
      if (!article) throw new ApiError(404, 'NOT_FOUND', 'Article not found.');
      if (article.authorId !== req.auth!.id && !can(req.auth!, 'articles:review'))
        throw new ApiError(403, 'FORBIDDEN', 'Editor permission required.');
      guardTransition(article, data.status, req.auth!);
      if (['PUBLISHED', 'SCHEDULED'].includes(data.status)) {
        const approver = await tx.user.findFirst({
          where: {
            id: article.approvedBy!,
            status: 'ACTIVE',
            deletedAt: null,
            roles: {
              some: {
                role: {
                  permissions: { some: { permission: { code: { in: ['*', 'articles:review'] } } } },
                },
              },
            },
          },
          select: { id: true },
        });
        if (!approver)
          throw new ApiError(
            422,
            'APPROVAL_EXPIRED',
            'The approving editor no longer has review access. Return to Draft for a new review.',
          );
      }
      if (
        data.status === 'SCHEDULED' &&
        (!data.scheduledAt || new Date(data.scheduledAt) <= new Date())
      )
        throw new ApiError(422, 'INVALID_SCHEDULE', 'Choose a future publication time.');
      const changed = await tx.article.updateMany({
        where: { id: article.id, version: data.version },
        data: {
          status: data.status,
          version: { increment: 1 },
          ...(data.status === 'APPROVED'
            ? { approvedBy: req.auth!.id, approvedAt: new Date() }
            : {}),
          ...(data.status === 'DRAFT'
            ? { approvedBy: null, approvedAt: null, scheduledAt: null }
            : {}),
          ...(data.status === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
          ...(data.status === 'SCHEDULED' ? { scheduledAt: new Date(data.scheduledAt!) } : {}),
        },
      });
      if (changed.count !== 1)
        throw new ApiError(409, 'VERSION_CONFLICT', 'Article changed. Reload.');
      const updated = await tx.article.findUniqueOrThrow({
        where: { id: article.id },
        include: detail,
      });
      await tx.articleRevision.create({
        data: {
          articleId: article.id,
          actorId: req.auth!.id,
          version: updated.version,
          snapshot: JSON.parse(JSON.stringify(updated)),
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.id,
          action: `article.${data.status.toLowerCase()}`,
          entityType: 'Article',
          entityId: article.id,
          requestId: res.locals.requestId,
        },
      });
      return updated;
    });
    sendSuccess(res, result);
  });
  router.post(
    '/articles/:id/verify',
    requirePermission('articles:fact-check'),
    csrf,
    async (req, res) => {
      const data = z
        .object({
          version: z.number().int().min(1),
          sources: z.array(z.object({ id: z.string(), verified: z.boolean() })),
          claims: z.array(
            z.object({
              id: z.string(),
              status: z.enum([
                'UNVERIFIED',
                'VERIFIED',
                'PARTIALLY_VERIFIED',
                'FALSE',
                'NEEDS_EDITOR_REVIEW',
              ]),
              evidence: z.string().min(10).max(3000),
            }),
          ),
        })
        .strict()
        .parse(req.body);
      await db.$transaction(async (tx) => {
        const article = await tx.article.findUnique({
          where: { id: String(req.params.id) },
          include: { sources: true, claims: true },
        });
        if (!article || article.status !== 'FACT_CHECK')
          throw new ApiError(409, 'INVALID_TRANSITION', 'Article must be in fact checking.');
        if (article.authorId === req.auth!.id)
          throw new ApiError(
            403,
            'INDEPENDENT_REVIEW_REQUIRED',
            'Another person must verify your reporting.',
          );
        if (
          new Set(data.sources.map((s) => s.id)).size !== data.sources.length ||
          new Set(data.claims.map((c) => c.id)).size !== data.claims.length ||
          data.sources.some((s) => !article.sources.some((existing) => existing.id === s.id)) ||
          data.claims.some((c) => !article.claims.some((existing) => existing.id === c.id))
        )
          throw new ApiError(
            422,
            'INVALID_VERIFICATION',
            'Use unique source and claim IDs belonging to this article.',
          );
        const changed = await tx.article.updateMany({
          where: { id: article.id, version: data.version },
          data: { version: { increment: 1 } },
        });
        if (changed.count !== 1)
          throw new ApiError(409, 'VERSION_CONFLICT', 'Article changed. Reload.');
        for (const source of data.sources)
          await tx.articleSource.updateMany({
            where: { id: source.id, articleId: article.id },
            data: { verified: source.verified },
          });
        for (const claim of data.claims)
          await tx.articleClaim.updateMany({
            where: { id: claim.id, articleId: article.id },
            data: { status: claim.status, evidence: claim.evidence, checkedBy: req.auth!.id },
          });
        const verified = await tx.article.findUniqueOrThrow({
          where: { id: article.id },
          include: detail,
        });
        await tx.articleRevision.create({
          data: {
            articleId: article.id,
            actorId: req.auth!.id,
            version: verified.version,
            snapshot: JSON.parse(JSON.stringify(verified)),
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: req.auth!.id,
            action: 'article.verified',
            entityType: 'Article',
            entityId: article.id,
            requestId: res.locals.requestId,
          },
        });
      });
      sendSuccess(res, { saved: true });
    },
  );
  router.post(
    '/articles/:id/corrections',
    requirePermission('articles:review'),
    csrf,
    async (req, res) => {
      const data = z
        .object({
          reason: z.string().min(10).max(2000),
          body: z.string().min(30).max(150000),
          version: z.number().int().min(1),
        })
        .strict()
        .parse(req.body);
      await db.$transaction(async (tx) => {
        const id = String(req.params.id);
        const changed = await tx.article.updateMany({
          where: { id, status: { in: [...published] }, version: data.version },
          data: { body: data.body, status: 'UPDATED', version: { increment: 1 } },
        });
        if (changed.count !== 1)
          throw new ApiError(
            409,
            'VERSION_CONFLICT',
            'Only the current published version can be corrected.',
          );
        await tx.correction.create({
          data: { articleId: id, actorId: req.auth!.id, reason: data.reason },
        });
        const item = await tx.article.findUniqueOrThrow({ where: { id }, include: detail });
        await tx.articleRevision.create({
          data: {
            articleId: id,
            actorId: req.auth!.id,
            version: item.version,
            snapshot: JSON.parse(JSON.stringify(item)),
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: req.auth!.id,
            action: 'article.corrected',
            entityType: 'Article',
            entityId: id,
            requestId: res.locals.requestId,
          },
        });
      });
      sendSuccess(res, { saved: true });
    },
  );
  router.get('/media', requirePermission('articles:draft'), async (req, res) =>
    sendSuccess(
      res,
      await db.mediaAsset.findMany({
        where: can(req.auth!, 'articles:review')
          ? {}
          : {
              OR: [
                { ownerId: req.auth!.id },
                {
                  articles: {
                    some: {
                      status: { in: [...published] },
                      publishedAt: { lte: new Date() },
                      isDemo: false,
                    },
                  },
                },
              ],
            },
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
    ),
  );
  router.post(
    '/media',
    requirePermission('articles:draft'),
    csrf,
    raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '8mb' }),
    async (req, res) => {
      if (!Buffer.isBuffer(req.body))
        throw new ApiError(422, 'INVALID_MEDIA', 'Upload a PNG, JPEG or WebP file.');
      const bytes: Buffer = req.body;
      const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const webp =
        bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
      if (!png && !jpeg && !webp)
        throw new ApiError(
          422,
          'INVALID_MEDIA',
          'File signature does not match a supported image.',
        );
      const kind = png ? 'png' : jpeg ? 'jpeg' : 'webp';
      const inspection = inspectImage(bytes, kind);
      const alt = z
        .string()
        .min(3)
        .max(300)
        .parse(req.header('x-media-alt') ? decodeURIComponent(req.header('x-media-alt')!) : '');
      const credit = z
        .string()
        .min(3)
        .max(300)
        .parse(
          req.header('x-media-credit') ? decodeURIComponent(req.header('x-media-credit')!) : '',
        );
      const filename = `${randomUUID()}.${png ? 'png' : jpeg ? 'jpg' : 'webp'}`;
      await mkdir(resolve('uploads'), { recursive: true });
      await writeFile(resolve('uploads', filename), bytes, { flag: 'wx' });
      sendSuccess(
        res,
        await db.mediaAsset.create({
          data: {
            filename,
            mime: png ? 'image/png' : jpeg ? 'image/jpeg' : 'image/webp',
            size: bytes.length,
            width: inspection.width,
            height: inspection.height,
            sha256: createHash('sha256').update(bytes).digest('hex'),
            alt,
            credit,
            ownerId: req.auth!.id,
            rightsSource: req.header('x-media-rights-source') || null,
          },
        }),
      );
    },
  );
  router.post('/media/:id/rights', requirePermission('articles:review'), csrf, async (req, res) => {
    const data = z
      .object({
        status: z.enum(['CLEARED', 'REJECTED']),
        source: z.string().trim().max(1000).nullable().default(null),
      })
      .superRefine((value, context) => {
        if (value.status === 'CLEARED' && (!value.source || value.source.length < 3))
          context.addIssue({
            code: 'custom',
            path: ['source'],
            message: 'A rights source is required before clearing an image.',
          });
      })
      .strict()
      .parse(req.body);
    const item = await db.$transaction(async (tx) => {
      const asset = await tx.mediaAsset.findUnique({
        where: { id: String(req.params.id) },
        include: {
          articles: {
            where: {
              status: { in: [...published] },
              publishedAt: { lte: new Date() },
              isDemo: false,
            },
            select: { id: true },
            take: 1,
          },
        },
      });
      if (!asset) throw new ApiError(404, 'NOT_FOUND', 'Image not found.');
      if (asset.articles.length && data.status !== 'CLEARED')
        throw new ApiError(
          409,
          'MEDIA_IN_USE',
          'A published article uses this image. Keep its rights cleared or replace the image first.',
        );
      const updated = await tx.mediaAsset.update({
        where: { id: asset.id },
        data: {
          rightsStatus: data.status,
          rightsSource: data.source,
          rightsReviewedBy: req.auth!.id,
          rightsReviewedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.id,
          action: `media.rights.${data.status.toLowerCase()}`,
          entityType: 'MediaAsset',
          entityId: asset.id,
          requestId: res.locals.requestId,
          metadata: { status: data.status },
        },
      });
      return updated;
    });
    sendSuccess(res, item);
  });
  router.get('/media/:id/file', async (req, res) => {
    const asset = await db.mediaAsset.findUnique({
      where: { id: String(req.params.id) },
      include: {
        articles: {
          where: {
            status: { in: [...published] },
            publishedAt: { lte: new Date() },
            isDemo: false,
          },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (
      !asset ||
      (asset.articles.length && asset.rightsStatus !== 'CLEARED') ||
      (!asset.articles.length &&
        (!req.auth ||
          (asset.ownerId !== req.auth.id &&
            !can(req.auth, 'articles:review') &&
            !can(req.auth, 'articles:fact-check'))))
    )
      throw new ApiError(404, 'NOT_FOUND', 'Image not found.');
    res.setHeader('Content-Type', asset.mime);
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.sendFile(resolve('uploads', asset.filename));
  });
  return router;
}
