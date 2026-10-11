import type { PrismaClient } from '@prisma/client';
import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { sendSuccess } from './api-response.js';
import { requirePermission } from './rbac.js';
import { ingestNewsSource, validateFeedUrl } from './news-discovery.js';

const sourceInput = z.object({
  name: z.string().trim().min(2).max(180),
  url: z.string().url().max(1000),
  sourceType: z.enum(['RSS', 'OFFICIAL', 'GOVERNMENT', 'TRENDS', 'PUBLISHER']),
  language: z.enum(['TA', 'EN', 'MIXED']).default('MIXED'),
  geography: z.enum(['WORLD', 'INDIA', 'TAMIL_NADU', 'CHENNAI', 'DISTRICT']),
  category: z.string().trim().min(2).max(100),
  trustLevel: z.number().int().min(0).max(100).default(50),
  licenseNotes: z.string().trim().max(1000).optional(),
  pollingSeconds: z.number().int().min(300).max(86_400).default(900),
  enabled: z.boolean().default(false),
}).strict();

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
    const source = await db.newsSource.create({ data: input });
    sendSuccess(res, source, 'Source created');
  });
  router.patch('/news-sources/:id', requirePermission('news:sources:manage'), csrf, async (req, res) => {
    const input = sourceInput.partial().parse(req.body);
    if (input.url) validateFeedUrl(input.url);
    const source = await db.newsSource.update({ where: { id: String(req.params.id) }, data: input });
    sendSuccess(res, source);
  });
  router.post('/news-sources/:id/fetch', requirePermission('news:sources:manage'), csrf, async (req, res) => {
    const source = await db.newsSource.findUniqueOrThrow({ where: { id: String(req.params.id) } });
    sendSuccess(res, await ingestNewsSource(db, source));
  });
  router.get('/discovered-news', requirePermission('settings:read'), async (req, res) => {
    const limit = Math.min(Number(String(req.query.limit || 50)), 100);
    sendSuccess(res, {
      items: await db.discoveredNews.findMany({
        take: Number.isFinite(limit) ? limit : 50,
        orderBy: [{ publishedAt: 'desc' }, { discoveredAt: 'desc' }],
        include: { source: { select: { id: true, name: true, sourceType: true } } },
      }),
    });
  });
  return router;
}
