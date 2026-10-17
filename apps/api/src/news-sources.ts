import type { PrismaClient } from '@prisma/client';
import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { ApiError, sendSuccess } from './api-response.js';
import { requirePermission } from './rbac.js';
import { ingestNewsSource, validateFeedUrl } from './news-discovery.js';

const sourceInput = z
  .object({
    name: z.string().trim().min(2).max(180),
    url: z.string().url().max(700),
    sourceType: z.enum(['RSS', 'OFFICIAL', 'GOVERNMENT', 'TRENDS', 'PUBLISHER']),
    language: z.enum(['TA', 'EN', 'MIXED']).default('MIXED'),
    geography: z.enum(['WORLD', 'INDIA', 'TAMIL_NADU', 'CHENNAI', 'DISTRICT']),
    category: z.string().trim().min(2).max(100),
    trustLevel: z.number().int().min(0).max(100).default(50),
    licenseNotes: z.string().trim().max(1000).optional(),
    pollingSeconds: z.number().int().min(300).max(86_400).default(900),
    enabled: z.boolean().default(false),
  })
  .strict();

export function newsSourcesRouter(db: PrismaClient, csrf: RequestHandler): Router {
  const router = Router();
  router.get('/news-sources', requirePermission('settings:read'), async (_req, res) => {
    sendSuccess(res, {
      items: await db.newsSource.findMany({ orderBy: [{ enabled: 'desc' }, { name: 'asc' }] }),
    });
  });
  router.post('/news-sources', requirePermission('news:sources:manage'), csrf, async (req, res) => {
    const input = sourceInput.parse(req.body);
    validateFeedUrl(input.url);
    const source = await db.$transaction(async (tx) => {
      const source = await tx.newsSource.create({ data: input });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.id,
          requestId: res.locals.requestId,
          action: 'news.source.created',
          entityType: 'NewsSource',
          entityId: source.id,
          metadata: { enabled: source.enabled, url: source.url },
        },
      });
      return source;
    });
    sendSuccess(res, source, 'Source created');
  });
  router.patch(
    '/news-sources/:id',
    requirePermission('news:sources:manage'),
    csrf,
    async (req, res) => {
      const input = sourceInput.partial().parse(req.body);
      if (input.url) validateFeedUrl(input.url);
      const source = await db.$transaction(async (tx) => {
        const current = await tx.newsSource.findUnique({ where: { id: String(req.params.id) } });
        if (!current) throw new ApiError(404, 'SOURCE_NOT_FOUND', 'Source not found.');
        const source = await tx.newsSource.update({
          where: { id: current.id },
          data: {
            ...input,
            ...(input.url && input.url !== current.url
              ? { lastSuccessfulFetch: null, errorCount: 0 }
              : {}),
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: req.auth!.id,
            requestId: res.locals.requestId,
            action: 'news.source.updated',
            entityType: 'NewsSource',
            entityId: source.id,
            metadata: { fields: Object.keys(input), enabled: source.enabled },
          },
        });
        return source;
      });
      sendSuccess(res, source);
    },
  );
  router.post(
    '/news-sources/:id/fetch',
    requirePermission('news:sources:manage'),
    csrf,
    async (req, res) => {
      const source = await db.newsSource.findUniqueOrThrow({
        where: { id: String(req.params.id) },
      });
      try {
        sendSuccess(
          res,
          await ingestNewsSource(db, source, { id: req.auth!.id, requestId: res.locals.requestId }),
        );
      } catch {
        throw new ApiError(
          502,
          'SOURCE_FETCH_FAILED',
          'Source fetch failed. Review fetch history; no publication was performed.',
        );
      }
    },
  );
  router.get('/news-sources/:id/fetches', requirePermission('settings:read'), async (req, res) => {
    sendSuccess(res, {
      items: await db.newsSourceFetch.findMany({
        where: { sourceId: String(req.params.id) },
        orderBy: { startedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
          httpStatus: true,
          itemCount: true,
          errorCode: true,
        },
      }),
    });
  });
  router.get('/discovered-news', requirePermission('settings:read'), async (req, res) => {
    const { limit } = z
      .object({ limit: z.coerce.number().int().min(1).max(100).default(50) })
      .parse(req.query);
    sendSuccess(res, {
      items: await db.discoveredNews.findMany({
        take: limit,
        orderBy: [{ publishedAt: 'desc' }, { discoveredAt: 'desc' }],
        include: { source: { select: { id: true, name: true, sourceType: true } } },
      }),
    });
  });
  router.get('/news-topics', requirePermission('settings:read'), async (req, res) => {
    const limit = Math.min(Math.max(Number(String(req.query.limit || 20)), 1), 100);
    sendSuccess(res, {
      items: await db.newsTopicCluster.findMany({
        take: Number.isFinite(limit) ? limit : 20,
        orderBy: [{ trendScore: 'desc' }, { latestUpdateAt: 'desc' }],
        include: {
          discovered: {
            orderBy: { publishedAt: 'desc' },
            take: 10,
            include: { source: { select: { id: true, name: true, trustLevel: true } } },
          },
        },
      }),
    });
  });
  router.post(
    '/news-topics/:id/verification',
    requirePermission('news:verify'),
    csrf,
    async (req, res) => {
      const input = z
        .object({
          status: z.enum(['VERIFIED', 'NEEDS_REVIEW', 'REJECTED']),
          note: z.string().trim().max(1000).optional(),
        })
        .strict()
        .parse(req.body);
      const topic = await db.newsTopicCluster.findUnique({ where: { id: String(req.params.id) } });
      if (!topic) throw new ApiError(404, 'TOPIC_NOT_FOUND', 'The topic was not found.');
      const updated = await db.$transaction(async (tx) => {
        const cluster = await tx.newsTopicCluster.update({
          where: { id: topic.id },
          data: { verificationStatus: input.status },
        });
        await tx.discoveredNews.updateMany({
          where: { clusterId: topic.id },
          data: { status: input.status },
        });
        await tx.auditLog.create({
          data: {
            actorId: req.auth!.id,
            action: 'news.topic.verification',
            entityType: 'NewsTopicCluster',
            entityId: topic.id,
            requestId: res.locals.requestId,
            metadata: { status: input.status, note: input.note },
          },
        });
        return cluster;
      });
      sendSuccess(res, updated, 'Topic verification updated.');
    },
  );
  return router;
}
