import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { ApiError, sendSuccess } from './api-response.js';
import { requirePermission } from './rbac.js';
import { can } from './editorial.js';
import { AI_PROMPT_VERSION, aiTasks, prepareAiPrompt } from './ai-prompts.js';
import { AiService, generationSchema, publicRunSelect } from './ai-service.js';
import type { AiProvider, AiLimits } from './ai-service.js';
import { duplicateSimilarity } from './ai-duplicates.js';
export { AI_PROMPT_VERSION, aiTasks, prepareAiPrompt, validateAiProposal } from './ai-prompts.js';

export function aiRouter(
  db: PrismaClient,
  csrf: RequestHandler,
  provider?: AiProvider,
  limits?: AiLimits,
  emailEnabled = false,
): Router {
  const router = Router();
  const service = new AiService(db, provider, limits);
  router.use('/ai', requirePermission('articles:draft'));
  router.get('/ai/status', async (req, res) => {
    const day = new Date().toISOString().slice(0, 10);
    const usage = await db.aiDailyUsage.findMany({
      where: { day, scope: { in: ['global', req.auth!.id] } },
    });
    sendSuccess(res, {
      provider: service.enabled ? provider!.name : null,
      model: service.enabled ? provider!.model : null,
      generationEnabled: service.enabled,
      promptVersion: AI_PROMPT_VERSION,
      tasks: aiTasks,
      limits: service.limits,
      day,
      usage: {
        userRequests: usage.find((row) => row.scope === req.auth!.id)?.requests || 0,
        globalRequests: usage.find((row) => row.scope === 'global')?.requests || 0,
      },
      emailEnabled,
      message: service.enabled
        ? 'Generation sends the selected reporting to the configured AI provider only after your confirmation. Independent review is required.'
        : `No AI provider is connected. Local prompt preparation and duplicate checking remain available.${emailEnabled ? ' Amazon SES password-reset delivery is enabled.' : ' Email is on hold.'}`,
    });
  });
  router.post('/ai/prepare', csrf, async (req, res) => {
    const data = z
      .object({
        articleId: z.string().max(191),
        task: z.enum(aiTasks),
        version: z.number().int().positive(),
      })
      .strict()
      .parse(req.body);
    const result = await db.$transaction(async (tx) => {
      const article = await tx.article.findUnique({
        where: { id: data.articleId },
        include: { sources: true },
      });
      if (!article) throw new ApiError(404, 'NOT_FOUND', 'Article not found.');
      if (article.authorId !== req.auth!.id && !can(req.auth!, 'articles:review'))
        throw new ApiError(403, 'FORBIDDEN', 'Use your own reporting.');
      if (article.version !== data.version)
        throw new ApiError(
          409,
          'VERSION_CONFLICT',
          'Article changed. Reload before preparing AI input.',
        );
      const prompt = prepareAiPrompt(data.task, {
        id: article.id,
        version: article.version,
        title: article.title,
        summary: article.summary,
        body: article.body,
        sensitive: article.sensitive,
        sponsored: article.sponsored,
        sources: article.sources.map(({ id, label, url, verified }) => ({
          id,
          label,
          url,
          verified,
        })),
      });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.id,
          action: 'ai.prompt.prepared',
          entityType: 'Article',
          entityId: article.id,
          requestId: res.locals.requestId,
          metadata: {
            task: data.task,
            promptVersion: prompt.version,
            articleVersion: article.version,
            inputHash: prompt.inputHash,
            sentToProvider: false,
          },
        },
      });
      return prompt;
    });
    sendSuccess(res, result);
  });

  router.post('/ai/generate', csrf, async (req, res) => {
    if (!service.enabled)
      throw new ApiError(
        503,
        'AI_PROVIDER_UNAVAILABLE',
        'AI generation is inactive until a provider and explicit usage limits are configured.',
      );
    sendSuccess(
      res,
      await service.generate(req.auth!, generationSchema.parse(req.body), res.locals.requestId),
    );
  });
  router.get('/ai/runs', async (req, res) => {
    const { articleId } = z.object({ articleId: z.string().min(1).max(191) }).parse(req.query);
    const article = await db.article.findUnique({ where: { id: articleId } });
    if (!article) throw new ApiError(404, 'NOT_FOUND', 'Article not found.');
    if (article.authorId !== req.auth!.id && !can(req.auth!, 'articles:review'))
      throw new ApiError(403, 'FORBIDDEN', 'Story access required.');
    await service.expireStale();
    sendSuccess(res, {
      items: await db.aiRun.findMany({
        where: { articleId },
        select: publicRunSelect,
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    });
  });
  router.post('/ai/runs/:id/review', csrf, async (req, res) => {
    const input = z
      .object({
        decision: z.enum(['ACCEPTED', 'REJECTED']),
        reviewNote: z.string().trim().min(10).max(3000),
        acknowledgedWarnings: z.literal(true),
      })
      .strict()
      .parse(req.body);
    sendSuccess(
      res,
      await service.review(
        req.auth!,
        String(req.params.id),
        input.decision,
        input.reviewNote,
        res.locals.requestId,
      ),
    );
  });
  router.get('/ai/duplicates', async (req, res) => {
    const { articleId } = z.object({ articleId: z.string().min(1).max(191) }).parse(req.query);
    const article = await db.article.findUnique({ where: { id: articleId } });
    if (!article) throw new ApiError(404, 'NOT_FOUND', 'Article not found.');
    const reviewer = can(req.auth!, 'articles:review');
    if (article.authorId !== req.auth!.id && !reviewer)
      throw new ApiError(403, 'FORBIDDEN', 'Story access required.');
    const candidates = await db.article.findMany({
      where: {
        id: { not: article.id },
        isDemo: false,
        ...(reviewer ? {} : { authorId: req.auth!.id }),
      },
      select: { id: true, title: true, body: true, status: true },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    const items = candidates
      .map((candidate) => ({
        id: candidate.id,
        title: candidate.title,
        status: candidate.status,
        similarity: Math.round(
          duplicateSimilarity(
            article.title + ' ' + article.body,
            candidate.title + ' ' + candidate.body,
          ) * 100,
        ),
      }))
      .filter((candidate) => candidate.similarity >= 35)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);
    sendSuccess(res, {
      items,
      scanned: candidates.length,
      candidateLimit: 200,
      method:
        'Tamil-aware lexical overlap; not a semantic or plagiarism verdict. Only stories you can access are compared.',
    });
  });
  return router;
}
