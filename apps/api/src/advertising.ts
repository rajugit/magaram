import type { Prisma, PrismaClient } from '@prisma/client';
import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { ApiError, sendSuccess } from './api-response.js';
import { requireAuthentication, requirePermission } from './rbac.js';
import type { AuthenticatedUser } from './identity.js';

const profileInput = z
  .object({
    name: z.string().trim().min(2).max(180),
    contactEmail: z.string().trim().email().max(320),
    billingAddress: z.string().trim().min(10).max(1000),
  })
  .strict();
const instant = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value));
export const campaignInput = z
  .object({
    placementId: z.string().min(1).max(191),
    headline: z.string().trim().min(5).max(180),
    body: z.string().trim().min(10).max(5000),
    destinationUrl: z
      .string()
      .url()
      .max(1000)
      .refine((value) => /^https:\/\//i.test(value), 'Use an HTTPS destination.'),
    rightsEvidence: z.string().trim().min(10).max(2000),
    startsAt: instant,
    endsAt: instant,
  })
  .strict()
  .superRefine((value, context) => {
    const days = (value.endsAt.getTime() - value.startsAt.getTime()) / 86400000;
    if (days <= 0 || days > 90)
      context.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'Choose an ordered period of at most 90 days.',
      });
  });
const versionInput = z.object({ version: z.number().int().positive() }).strict();
const detail = {
  advertiser: true,
  placement: true,
  invoice: { include: { attempts: { orderBy: { createdAt: 'desc' as const }, take: 10 } } },
};
const serializable = { isolationLevel: 'Serializable' as const };
const can = (user: AuthenticatedUser, permission: string) =>
  user.permissions.includes('*') || user.permissions.includes(permission);
function permitted(user: AuthenticatedUser) {
  if (!['ads:own', 'ads:manage', 'ads:review'].some((permission) => can(user, permission)))
    throw new ApiError(403, 'FORBIDDEN', 'Advertising access is required.');
}
function conflict(message: string): never {
  throw new ApiError(409, 'INVALID_STATE', message);
}
async function audit(
  tx: Prisma.TransactionClient,
  actorId: string,
  action: string,
  entityId: string,
  metadata: Prisma.InputJsonObject = {},
) {
  await tx.auditLog.create({
    data: {
      actorId,
      action: `advertising.${action}`,
      entityType: 'Advertising',
      entityId,
      metadata,
    },
  });
}
async function ownedCampaign(
  tx: Prisma.TransactionClient,
  id: string,
  user: AuthenticatedUser,
  version?: number,
  review = false,
) {
  const campaign = await tx.adCampaign.findUnique({ where: { id }, include: detail });
  if (
    !campaign ||
    (!can(user, 'ads:manage') &&
      !(review && can(user, 'ads:review')) &&
      campaign.advertiser.ownerId !== user.id)
  )
    throw new ApiError(404, 'NOT_FOUND', 'Campaign not found.');
  if (version !== undefined && campaign.version !== version)
    conflict('Campaign changed. Refresh before retrying.');
  return campaign;
}
function eligible(
  campaign: { startsAt: Date; endsAt: Date },
  placement: { enabled: boolean; dailyRatePaise: number | null },
) {
  if (campaign.startsAt <= new Date() || campaign.endsAt <= campaign.startsAt)
    conflict('Campaign must start in the future.');
  if (!placement.enabled || !placement.dailyRatePaise)
    conflict('Placement is unavailable or has no configured rate.');
}

export function advertisingRouter(db: PrismaClient, csrf: RequestHandler): Router {
  const router = Router();
  // Delivery cannot be activated by browser state or a forged payment request.
  router.get('/ads/public', (_req, res) => sendSuccess(res, { items: [], deliveryEnabled: false }));
  router.use('/ads', requireAuthentication(), (req, _res, next) => {
    permitted(req.auth!);
    next();
  });
  router.get('/ads/status', (req, res) =>
    sendSuccess(res, {
      paymentEnabled: false,
      deliveryEnabled: false,
      currency: 'INR',
      canManage: can(req.auth!, 'ads:manage'),
      canReview: can(req.auth!, 'ads:review'),
      canCreate: can(req.auth!, 'ads:own') || can(req.auth!, 'ads:manage'),
    }),
  );
  router.get('/ads/placements', async (_req, res) =>
    sendSuccess(res, { items: await db.adPlacement.findMany({ orderBy: { key: 'asc' } }) }),
  );
  router.put('/ads/placements/:id', requirePermission('ads:manage'), csrf, async (req, res) => {
    const input = z
      .object({
        version: z.number().int().positive(),
        enabled: z.boolean(),
        dailyRatePaise: z.number().int().min(100).max(10_000_000),
      })
      .strict()
      .parse(req.body);
    const record = await db.$transaction(async (tx) => {
      const placement = await tx.adPlacement.findUnique({ where: { id: String(req.params.id) } });
      if (!placement) throw new ApiError(404, 'NOT_FOUND', 'Placement not found.');
      const result = await tx.adPlacement.updateMany({
        where: { id: placement.id, version: input.version },
        data: {
          enabled: input.enabled,
          dailyRatePaise: input.dailyRatePaise,
          version: { increment: 1 },
        },
      });
      if (!result.count) conflict('Placement changed. Refresh before retrying.');
      await audit(tx, req.auth!.id, 'placement.updated', placement.id, {
        enabled: input.enabled,
        dailyRatePaise: input.dailyRatePaise,
      });
      return tx.adPlacement.findUniqueOrThrow({ where: { id: placement.id } });
    }, serializable);
    sendSuccess(res, record);
  });
  router.get('/ads/profile', async (req, res) =>
    sendSuccess(res, await db.advertiser.findUnique({ where: { ownerId: req.auth!.id } })),
  );
  router.put('/ads/profile', csrf, async (req, res) => {
    if (!can(req.auth!, 'ads:own') && !can(req.auth!, 'ads:manage'))
      throw new ApiError(403, 'FORBIDDEN', 'Campaign creation access is required.');
    const data = profileInput.parse(req.body);
    const record = await db.$transaction(async (tx) => {
      const profile = await tx.advertiser.upsert({
        where: { ownerId: req.auth!.id },
        create: { ...data, ownerId: req.auth!.id },
        update: data,
      });
      await audit(tx, req.auth!.id, 'profile.saved', profile.id);
      return profile;
    }, serializable);
    sendSuccess(res, record);
  });
  router.get('/ads/campaigns', async (req, res) => {
    const { page } = z
      .object({ page: z.coerce.number().int().min(1).max(10000).default(1) })
      .parse(req.query);
    const user = req.auth!;
    const where: Prisma.AdCampaignWhereInput = can(user, 'ads:manage')
      ? {}
      : can(user, 'ads:review')
        ? {
            OR: [
              { advertiser: { ownerId: user.id } },
              { status: { in: ['SUBMITTED', 'APPROVED', 'REJECTED'] } },
            ],
          }
        : { advertiser: { ownerId: user.id } };
    const [items, total] = await db.$transaction([
      db.adCampaign.findMany({
        where,
        include: detail,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * 25,
        take: 25,
      }),
      db.adCampaign.count({ where }),
    ]);
    sendSuccess(res, { items, total, page, limit: 25 });
  });
  router.post('/ads/campaigns', csrf, async (req, res) => {
    if (!can(req.auth!, 'ads:own') && !can(req.auth!, 'ads:manage'))
      throw new ApiError(403, 'FORBIDDEN', 'Campaign creation access is required.');
    const data = campaignInput.parse(req.body);
    const record = await db.$transaction(async (tx) => {
      const advertiser = await tx.advertiser.findUnique({ where: { ownerId: req.auth!.id } });
      if (!advertiser) conflict('Save your advertiser profile first.');
      const placement = await tx.adPlacement.findUnique({ where: { id: data.placementId } });
      if (!placement) throw new ApiError(404, 'NOT_FOUND', 'Placement not found.');
      eligible(data, placement);
      const campaign = await tx.adCampaign.create({
        data: { ...data, advertiserId: advertiser.id, lastEditedBy: req.auth!.id },
      });
      await audit(tx, req.auth!.id, 'campaign.created', campaign.id);
      return campaign;
    }, serializable);
    sendSuccess(res, record);
  });
  router.put('/ads/campaigns/:id', csrf, async (req, res) => {
    const { version, ...data } = campaignInput
      .safeExtend({ version: z.number().int().positive() })
      .parse(req.body);
    const record = await db.$transaction(async (tx) => {
      const campaign = await ownedCampaign(tx, String(req.params.id), req.auth!, version);
      if (!['DRAFT', 'REJECTED'].includes(campaign.status))
        conflict('Only draft or rejected campaigns can be edited.');
      const placement = await tx.adPlacement.findUnique({ where: { id: data.placementId } });
      if (!placement) throw new ApiError(404, 'NOT_FOUND', 'Placement not found.');
      eligible(data, placement);
      const updated = await tx.adCampaign.update({
        where: { id: campaign.id },
        data: {
          ...data,
          status: 'DRAFT',
          lastEditedBy: req.auth!.id,
          version: { increment: 1 },
          submittedBy: null,
          reviewedBy: null,
          reviewedAt: null,
          reviewNote: null,
        },
      });
      await audit(tx, req.auth!.id, 'campaign.edited', campaign.id);
      return updated;
    }, serializable);
    sendSuccess(res, record);
  });
  router.post('/ads/campaigns/:id/submit', csrf, async (req, res) => {
    const { version } = versionInput.parse(req.body);
    const record = await db.$transaction(async (tx) => {
      const campaign = await ownedCampaign(tx, String(req.params.id), req.auth!, version);
      if (!['DRAFT', 'REJECTED'].includes(campaign.status))
        conflict('Only draft or rejected campaigns can be submitted.');
      eligible(campaign, campaign.placement);
      const updated = await tx.adCampaign.update({
        where: { id: campaign.id },
        data: {
          status: 'SUBMITTED',
          submittedBy: req.auth!.id,
          reviewedBy: null,
          reviewedAt: null,
          reviewNote: null,
          version: { increment: 1 },
        },
      });
      await audit(tx, req.auth!.id, 'campaign.submitted', campaign.id);
      return updated;
    }, serializable);
    sendSuccess(res, record);
  });
  router.post(
    '/ads/campaigns/:id/review',
    requirePermission('ads:review'),
    csrf,
    async (req, res) => {
      const input = z
        .object({
          version: z.number().int().positive(),
          decision: z.enum(['APPROVED', 'REJECTED']),
          note: z.string().trim().min(10).max(2000),
          rightsConfirmed: z.literal(true),
        })
        .strict()
        .parse(req.body);
      const record = await db.$transaction(async (tx) => {
        const campaign = await ownedCampaign(
          tx,
          String(req.params.id),
          req.auth!,
          input.version,
          true,
        );
        if (campaign.status !== 'SUBMITTED') conflict('Only submitted campaigns can be reviewed.');
        if (
          [campaign.advertiser.ownerId, campaign.submittedBy, campaign.lastEditedBy].includes(
            req.auth!.id,
          )
        )
          throw new ApiError(
            403,
            'INDEPENDENT_REVIEW_REQUIRED',
            'Another reviewer must review this campaign.',
          );
        if (input.decision === 'APPROVED') {
          // Serialize approvals and rate changes for one exclusive placement.
          const placement = await tx.adPlacement.update({
            where: { id: campaign.placementId },
            data: { version: { increment: 1 } },
          });
          eligible(campaign, placement);
          const overlapping = await tx.adCampaign.count({
            where: {
              placementId: placement.id,
              status: 'APPROVED',
              startsAt: { lt: campaign.endsAt },
              endsAt: { gt: campaign.startsAt },
            },
          });
          if (overlapping)
            conflict('This placement is already reserved for part of the selected period.');
          const days = Math.ceil(
            (campaign.endsAt.getTime() - campaign.startsAt.getTime()) / 86400000,
          );
          await tx.adInvoice.create({
            data: {
              campaignId: campaign.id,
              amountPaise: days * placement.dailyRatePaise!,
              dailyRatePaise: placement.dailyRatePaise!,
              days,
              billingSnapshot: {
                name: campaign.advertiser.name,
                contactEmail: campaign.advertiser.contactEmail,
                billingAddress: campaign.advertiser.billingAddress,
                headline: campaign.headline,
                placement: placement.name,
                startsAt: campaign.startsAt.toISOString(),
                endsAt: campaign.endsAt.toISOString(),
                type: 'PRO_FORMA_NOT_TAX_INVOICE',
              },
            },
          });
        }
        const updated = await tx.adCampaign.update({
          where: { id: campaign.id },
          data: {
            status: input.decision,
            reviewedBy: req.auth!.id,
            reviewedAt: new Date(),
            reviewNote: input.note,
            version: { increment: 1 },
          },
          include: detail,
        });
        await audit(tx, req.auth!.id, `campaign.${input.decision.toLowerCase()}`, campaign.id, {
          note: input.note,
          rightsConfirmed: true,
        });
        return updated;
      }, serializable);
      sendSuccess(res, record);
    },
  );
  router.post('/ads/campaigns/:id/cancel', csrf, async (req, res) => {
    const { version } = versionInput.parse(req.body);
    const record = await db.$transaction(async (tx) => {
      const campaign = await ownedCampaign(tx, String(req.params.id), req.auth!, version);
      if (campaign.status === 'CANCELLED') conflict('Campaign is already cancelled.');
      const updated = await tx.adCampaign.update({
        where: { id: campaign.id },
        data: { status: 'CANCELLED', version: { increment: 1 } },
      });
      await tx.adInvoice.updateMany({
        where: { campaignId: campaign.id, status: 'UNPAID' },
        data: { status: 'VOID', voidedAt: new Date() },
      });
      await audit(tx, req.auth!.id, 'campaign.cancelled', campaign.id);
      return updated;
    }, serializable);
    sendSuccess(res, record);
  });
  router.post('/ads/campaigns/:id/checkout', csrf, async (req) => {
    const { requestKey } = z
      .object({
        requestKey: z
          .string()
          .min(16)
          .max(100)
          .regex(/^[a-zA-Z0-9_-]+$/),
      })
      .strict()
      .parse(req.body);
    await db.$transaction(async (tx) => {
      const campaign = await ownedCampaign(tx, String(req.params.id), req.auth!);
      if (
        campaign.status !== 'APPROVED' ||
        !campaign.invoice ||
        campaign.invoice.status !== 'UNPAID'
      )
        conflict('An approved campaign with an unpaid quote is required.');
      const invoiceId = campaign.invoice.id;
      const existing = await tx.adPaymentAttempt.findUnique({
        where: { invoiceId_requestKey: { invoiceId, requestKey } },
      });
      if (!existing) {
        const attempt = await tx.adPaymentAttempt.create({ data: { invoiceId, requestKey } });
        await audit(tx, req.auth!.id, 'checkout.unavailable', attempt.id);
      }
    }, serializable);
    throw new ApiError(
      503,
      'PAYMENT_UNAVAILABLE',
      'Payment processing is not configured. No charge was made and no ad was activated.',
    );
  });
  return router;
}
