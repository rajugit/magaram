import type { PrismaClient, SocialConsentChannel } from '@prisma/client';
import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { ApiError, sendSuccess } from './api-response.js';
import { requirePermission } from './rbac.js';

const consentSchema = z
  .object({
    subjectHash: z.string().regex(/^[a-f0-9]{64}$/i),
    channel: z.enum(['FACEBOOK', 'INSTAGRAM', 'X', 'WHATSAPP', 'TELEGRAM', 'YOUTUBE']),
    purpose: z.string().trim().min(3).max(120),
    source: z.string().trim().min(3).max(500),
  })
  .strict();

export function socialRouter(db: PrismaClient, csrf: RequestHandler): Router {
  const router = Router();
  router.use('/social', requirePermission('social:manage'));
  router.get('/social/consents', async (req, res) => {
    const query = z
      .object({
        subjectHash: z
          .string()
          .regex(/^[a-f0-9]{64}$/i)
          .optional(),
      })
      .parse(req.query);
    sendSuccess(
      res,
      await db.socialConsent.findMany({
        where: query.subjectHash ? { subjectHash: query.subjectHash } : {},
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    );
  });
  router.post('/social/consents', csrf, async (req, res) => {
    const data = consentSchema.parse(req.body);
    const record = await db.$transaction(async (tx) => {
      const consent = await tx.socialConsent.create({
        data: data as {
          subjectHash: string;
          channel: SocialConsentChannel;
          purpose: string;
          source: string;
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.id,
          action: 'social.consent.granted',
          entityType: 'SocialConsent',
          entityId: consent.id,
          requestId: res.locals.requestId,
          metadata: { channel: data.channel, purpose: data.purpose, subjectHash: data.subjectHash },
        },
      });
      return consent;
    });
    sendSuccess(res, record, 'Consent recorded.');
  });
  router.post('/social/consents/:id/revoke', csrf, async (req, res) => {
    const consent = await db.socialConsent.findUnique({ where: { id: String(req.params.id) } });
    if (!consent) throw new ApiError(404, 'NOT_FOUND', 'Consent record not found.');
    const updated = await db.$transaction(async (tx) => {
      const record = await tx.socialConsent.update({
        where: { id: consent.id },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.id,
          action: 'social.consent.revoked',
          entityType: 'SocialConsent',
          entityId: record.id,
          requestId: res.locals.requestId,
          metadata: { channel: record.channel, subjectHash: record.subjectHash },
        },
      });
      return record;
    });
    sendSuccess(res, updated, 'Consent revoked.');
  });
  return router;
}
