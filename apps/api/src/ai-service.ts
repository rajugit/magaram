import { Prisma } from '@prisma/client';
import type { PrismaClient, AiRun } from '@prisma/client';
import { z } from 'zod';
import { ApiError } from './api-response.js';
import type { AuthenticatedUser } from './identity.js';
import { can } from './editorial.js';
import { aiTasks, prepareAiPrompt, validateAiProposal } from './ai-prompts.js';

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  generate(input: {
    system: string;
    input: string;
    maxOutputTokens: number;
    signal: AbortSignal;
  }): Promise<{ value: unknown; inputTokens: number; outputTokens: number }>;
}
export const aiLimitsSchema = z
  .object({
    dailyPerUser: z.number().int().min(1).max(100),
    dailyGlobal: z.number().int().min(1).max(1000),
    maxInputChars: z.number().int().min(100).max(30000),
    maxOutputTokens: z.number().int().min(100).max(4000),
    timeoutMs: z.number().int().min(50).max(60000),
  })
  .strict();
export type AiLimits = z.infer<typeof aiLimitsSchema>;
export const generationSchema = z
  .object({
    articleId: z.string().min(1).max(191),
    version: z.number().int().positive(),
    task: z.enum(aiTasks),
    requestKey: z.uuid(),
    consentToSend: z.literal(true),
  })
  .strict();
export const publicRunSelect = {
  id: true,
  articleId: true,
  articleVersion: true,
  actorId: true,
  task: true,
  status: true,
  promptVersion: true,
  provider: true,
  model: true,
  output: true,
  inputTokens: true,
  outputTokens: true,
  failureCode: true,
  reviewNote: true,
  reviewedBy: true,
  reviewedAt: true,
  createdAt: true,
} satisfies Prisma.AiRunSelect;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export class AiService {
  readonly limits: AiLimits | null;
  constructor(
    private readonly db: PrismaClient,
    readonly provider?: AiProvider,
    limits?: AiLimits,
  ) {
    this.limits = limits ? aiLimitsSchema.parse(limits) : null;
  }
  get enabled() {
    return Boolean(this.provider && this.limits);
  }
  async expireStale() {
    // Unknown outcomes still consume quota: retrying automatically could duplicate a paid request.
    await this.db.aiRun.updateMany({
      where: { status: 'RUNNING', expiresAt: { lt: new Date() } },
      data: { status: 'FAILED', failureCode: 'INTERRUPTED_OR_TIMED_OUT' },
    });
  }
  async generate(
    actor: AuthenticatedUser,
    input: z.infer<typeof generationSchema>,
    requestId?: string,
  ) {
    if (!this.enabled)
      throw new ApiError(
        503,
        'AI_PROVIDER_UNAVAILABLE',
        'AI generation is inactive until a provider and explicit usage limits are configured.',
      );
    const provider = this.provider!;
    const limits = this.limits!;
    await this.expireStale();
    const prior = await this.db.aiRun.findUnique({
      where: { actorId_requestKey: { actorId: actor.id, requestKey: input.requestKey } },
    });
    if (prior) return this.replay(prior, input, actor);
    const article = await this.db.article.findUnique({
      where: { id: input.articleId },
      include: { sources: true },
    });
    if (!article) throw new ApiError(404, 'NOT_FOUND', 'Article not found.');
    if (article.authorId !== actor.id && !can(actor, 'articles:review'))
      throw new ApiError(403, 'FORBIDDEN', 'Use your own reporting.');
    if (article.version !== input.version)
      throw new ApiError(409, 'VERSION_CONFLICT', 'Article changed. Reload before generation.');
    if (!article.sources.length)
      throw new ApiError(
        422,
        'SOURCES_REQUIRED',
        'Add reporting sources before requesting generation.',
      );
    const prompt = prepareAiPrompt(input.task, {
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
    if (prompt.input.length > limits.maxInputChars)
      throw new ApiError(
        422,
        'AI_INPUT_LIMIT',
        'This story exceeds the configured AI input size. Use a shorter source-bound draft.',
      );
    const day = new Date().toISOString().slice(0, 10);
    let run: AiRun;
    try {
      run = await this.db.$transaction(async (tx) => {
        const record = await tx.aiRun.create({
          data: {
            actorId: actor.id,
            articleId: article.id,
            articleVersion: article.version,
            task: input.task,
            requestKey: input.requestKey,
            promptVersion: prompt.version,
            inputHash: prompt.inputHash,
            inputSnapshot: json(prompt),
            sourceIds: article.sources.map((source) => source.id),
            provider: provider.name,
            model: provider.model,
            expiresAt: new Date(Date.now() + limits.timeoutMs + 5000),
          },
        });
        for (const [scope, limit] of [
          ['global', limits.dailyGlobal],
          [actor.id, limits.dailyPerUser],
        ] as const) {
          await tx.aiDailyUsage.upsert({
            where: { scope_day: { scope, day } },
            create: { scope, day, requests: 0 },
            update: {},
          });
          const reserved = await tx.aiDailyUsage.updateMany({
            where: { scope, day, requests: { lt: limit } },
            data: { requests: { increment: 1 } },
          });
          if (!reserved.count)
            throw new ApiError(
              429,
              'AI_DAILY_LIMIT',
              'The daily AI request limit has been reached. No provider request was sent.',
            );
        }
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: 'ai.generation.requested',
            entityType: 'AiRun',
            entityId: record.id,
            requestId,
            metadata: {
              task: input.task,
              model: provider.model,
              promptVersion: prompt.version,
              inputHash: prompt.inputHash,
              articleVersion: article.version,
            },
          },
        });
        return record;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.db.aiRun.findUniqueOrThrow({
          where: { actorId_requestKey: { actorId: actor.id, requestKey: input.requestKey } },
        });
        return this.replay(existing, input, actor);
      }
      throw error;
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let providerResult: Awaited<ReturnType<AiProvider['generate']>>;
    try {
      providerResult = await Promise.race([
        provider.generate({
          system: prompt.system,
          input: prompt.input,
          maxOutputTokens: limits.maxOutputTokens,
          signal: controller.signal,
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error('AI_TIMEOUT'));
          }, limits.timeoutMs);
        }),
      ]);
    } catch {
      if (timer) clearTimeout(timer);
      await this.finishFailure(
        run.id,
        actor.id,
        controller.signal.aborted ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE',
        requestId,
      );
      return this.db.aiRun.findUniqueOrThrow({ where: { id: run.id }, select: publicRunSelect });
    } finally {
      if (timer) clearTimeout(timer);
    }
    let output: ReturnType<typeof validateAiProposal>;
    let usage: { inputTokens: number; outputTokens: number };
    try {
      output = validateAiProposal(
        providerResult.value,
        article.sources.map((source) => source.id),
      );
      usage = z
        .object({
          inputTokens: z.number().int().nonnegative().max(1000000),
          outputTokens: z.number().int().nonnegative().max(limits.maxOutputTokens),
        })
        .parse(providerResult);
      if (input.task === 'seo' && !output.seo) throw new Error('INVALID_SEO');
      if (input.task === 'summary' && (output.text.length < 10 || output.text.length > 1000))
        throw new Error('INVALID_SUMMARY');
      if (['tamil-draft', 'translation'].includes(input.task) && output.text.length < 30)
        throw new Error('INVALID_DRAFT');
    } catch {
      await this.finishFailure(run.id, actor.id, 'INVALID_PROVIDER_OUTPUT', requestId);
      return this.db.aiRun.findUniqueOrThrow({ where: { id: run.id }, select: publicRunSelect });
    }
    await this.db.$transaction(async (tx) => {
      const changed = await tx.aiRun.updateMany({
        where: { id: run.id, status: 'RUNNING', expiresAt: { gt: new Date() } },
        data: { status: 'READY', output: json(output), ...usage },
      });
      if (changed.count)
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: 'ai.proposal.ready',
            entityType: 'AiRun',
            entityId: run.id,
            requestId,
            metadata: usage,
          },
        });
    });
    return this.db.aiRun.findUniqueOrThrow({ where: { id: run.id }, select: publicRunSelect });
  }
  private async replay(
    run: AiRun,
    input: z.infer<typeof generationSchema>,
    actor: AuthenticatedUser,
  ) {
    if (
      run.articleId !== input.articleId ||
      run.articleVersion !== input.version ||
      run.task !== input.task
    )
      throw new ApiError(
        409,
        'IDEMPOTENCY_CONFLICT',
        'This request key belongs to different input.',
      );
    const article = await this.db.article.findUniqueOrThrow({ where: { id: run.articleId } });
    if (article.authorId !== actor.id && !can(actor, 'articles:review'))
      throw new ApiError(403, 'FORBIDDEN', 'You no longer have access to this story.');
    return this.db.aiRun.findUniqueOrThrow({ where: { id: run.id }, select: publicRunSelect });
  }
  private async finishFailure(
    id: string,
    actorId: string,
    failureCode: string,
    requestId?: string,
  ) {
    await this.db.$transaction(async (tx) => {
      const changed = await tx.aiRun.updateMany({
        where: { id, status: 'RUNNING' },
        data: { status: 'FAILED', failureCode },
      });
      if (changed.count)
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'ai.generation.failed',
            entityType: 'AiRun',
            entityId: id,
            requestId,
            metadata: { failureCode },
          },
        });
    });
  }
  async review(
    actor: AuthenticatedUser,
    id: string,
    decision: 'ACCEPTED' | 'REJECTED',
    reviewNote: string,
    requestId?: string,
  ) {
    return this.db.$transaction(async (tx) => {
      const run = await tx.aiRun.findUnique({
        where: { id },
        include: { article: { include: { sources: true, claims: true } } },
      });
      if (!run) throw new ApiError(404, 'NOT_FOUND', 'Proposal not found.');
      const article = run.article;
      if (article.authorId !== actor.id && !can(actor, 'articles:review'))
        throw new ApiError(403, 'FORBIDDEN', 'Story access required.');
      if (
        decision === 'ACCEPTED' &&
        (!can(actor, 'articles:review') ||
          actor.id === run.actorId ||
          actor.id === article.authorId)
      )
        throw new ApiError(
          403,
          'INDEPENDENT_REVIEW_REQUIRED',
          'A different editor, who is neither the author nor the AI requester, must accept the proposal.',
        );
      if (run.status !== 'READY')
        throw new ApiError(409, 'PROPOSAL_REVIEWED', 'Only a ready proposal may be reviewed.');
      const changed = await tx.aiRun.updateMany({
        where: { id, status: 'READY' },
        data: { status: decision, reviewNote, reviewedBy: actor.id, reviewedAt: new Date() },
      });
      if (!changed.count)
        throw new ApiError(
          409,
          'PROPOSAL_REVIEWED',
          'Another reviewer already handled this proposal.',
        );
      if (decision === 'ACCEPTED') {
        if (article.version !== run.articleVersion)
          throw new ApiError(
            409,
            'VERSION_CONFLICT',
            'This proposal is stale. Generate a new one from current reporting.',
          );
        const output = validateAiProposal(
          run.output,
          article.sources.map((source) => source.id),
        );
        if (run.task !== 'social') {
          if (!['DRAFT', 'AI_DRAFT'].includes(article.status))
            throw new ApiError(
              409,
              'REVIEW_LOCKED',
              'Return this story to Draft before applying an AI proposal.',
            );
          const update: Prisma.ArticleUpdateManyMutationInput = {
            status: 'AI_DRAFT',
            approvedBy: null,
            approvedAt: null,
            scheduledAt: null,
            version: { increment: 1 },
          };
          if (['tamil-draft', 'translation'].includes(run.task)) update.body = output.text;
          if (run.task === 'summary') update.summary = output.text;
          if (run.task === 'seo') {
            if (!output.seo) throw new ApiError(422, 'INVALID_PROPOSAL', 'Missing SEO fields.');
            update.seoTitle = output.seo.title;
            update.seoDescription = output.seo.description;
          }
          const updated = await tx.article.updateMany({
            where: {
              id: article.id,
              version: run.articleVersion,
              status: { in: ['DRAFT', 'AI_DRAFT'] },
            },
            data: update,
          });
          if (!updated.count)
            throw new ApiError(409, 'VERSION_CONFLICT', 'The story changed during review.');
          await tx.articleSource.updateMany({
            where: { articleId: article.id },
            data: { verified: false },
          });
          await tx.articleClaim.updateMany({
            where: { articleId: article.id },
            data: { status: 'UNVERIFIED', evidence: '', checkedBy: null },
          });
          const additional = output.claims.filter(
            (claim) => !article.claims.some((existing) => existing.text === claim.text),
          );
          if (article.claims.length + additional.length > 30)
            throw new ApiError(
              422,
              'CLAIM_LIMIT',
              'Resolve the story’s claim count before applying this proposal (maximum 30).',
            );
          await tx.articleClaim.createMany({
            data: additional.map((claim) => ({
              articleId: article.id,
              text: claim.text,
              status: 'UNVERIFIED',
              evidence: '',
            })),
          });
          const snapshot = await tx.article.findUniqueOrThrow({
            where: { id: article.id },
            include: { sources: true, claims: true },
          });
          await tx.articleRevision.create({
            data: {
              articleId: article.id,
              actorId: actor.id,
              version: snapshot.version,
              snapshot: json(snapshot),
            },
          });
        }
      }
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: decision === 'ACCEPTED' ? 'ai.proposal.accepted' : 'ai.proposal.rejected',
          entityType: 'AiRun',
          entityId: id,
          requestId,
          metadata: {
            articleId: article.id,
            task: run.task,
            articleVersion: run.articleVersion,
            published: false,
          },
        },
      });
      return tx.aiRun.findUniqueOrThrow({ where: { id }, select: publicRunSelect });
    });
  }
}
