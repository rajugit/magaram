import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { ApiError, sendSuccess } from './api-response.js';
import { requireAuthentication, requirePermission } from './rbac.js';

const businessSchema = z
  .object({
    name: z.string().trim().min(2).max(180),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(191),
    description: z.string().trim().min(10).max(10_000),
    category: z.string().trim().min(2).max(100),
    location: z.string().trim().min(2).max(100),
    phone: z.string().trim().max(40).optional(),
    website: z
      .string()
      .url()
      .max(500)
      .refine((value) => /^https?:\/\//i.test(value), 'Use an HTTP or HTTPS website.')
      .optional(),
  })
  .strict();

const offerSchema = z
  .object({
    title: z.string().trim().min(2).max(180),
    description: z.string().trim().min(10).max(10_000),
    terms: z.string().trim().min(10).max(10_000),
    startsAt: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value)),
    endsAt: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value)),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.endsAt <= value.startsAt)
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'End must be after start.' });
  });

const leadSchema = z
  .object({
    businessId: z.string().min(1).max(191),
    offerId: z.string().min(1).max(191).optional(),
    name: z.string().trim().min(2).max(160),
    email: z.string().trim().email().max(320),
    phone: z.string().trim().max(40).optional(),
    message: z.string().trim().min(5).max(5_000),
    consent: z.literal(true),
  })
  .strict();

export function localRouter(db: PrismaClient, csrf: RequestHandler): Router {
  const router = Router();
  const transactionOptions = { isolationLevel: 'Serializable' as const };
  const leadLimit = rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new ApiError(429, 'RATE_LIMITED', 'Too many enquiries. Try again shortly.')),
  });
  router.get('/local/businesses', async (req, res) => {
    const query = z
      .object({
        location: z.string().trim().max(100).optional(),
        category: z.string().trim().max(100).optional(),
        q: z.string().trim().max(180).optional(),
        page: z.coerce.number().int().min(1).max(10000).default(1),
      })
      .parse(req.query);
    const where = {
      status: 'VERIFIED' as const,
      ...(query.q
        ? { OR: [{ name: { contains: query.q } }, { description: { contains: query.q } }] }
        : {}),
      ...(query.location ? { location: query.location } : {}),
      ...(query.category ? { category: query.category } : {}),
    };
    const [items, total] = await db.$transaction([
      db.localBusiness.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          category: true,
          location: true,
          phone: true,
          website: true,
          verifiedAt: true,
          offers: {
            where: { status: 'ACTIVE', startsAt: { lte: new Date() }, endsAt: { gt: new Date() } },
            orderBy: { endsAt: 'asc' },
          },
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: 24,
        skip: (query.page - 1) * 24,
      }),
      db.localBusiness.count({ where }),
    ]);
    sendSuccess(res, { items, total, page: query.page, limit: 24 });
  });
  router.post('/local/leads', csrf, leadLimit, async (req, res) => {
    const data = leadSchema.parse(req.body);
    const lead = await db.$transaction(async (tx) => {
      const business = await tx.localBusiness.findFirst({
        where: { id: data.businessId, status: 'VERIFIED' },
      });
      if (!business) throw new ApiError(404, 'NOT_FOUND', 'Business not found.');
      if (data.offerId) {
        const now = new Date();
        const offer = await tx.localOffer.findFirst({
          where: {
            id: data.offerId,
            businessId: business.id,
            status: 'ACTIVE',
            startsAt: { lte: now },
            endsAt: { gt: now },
          },
        });
        if (!offer) throw new ApiError(404, 'NOT_FOUND', 'Offer not found.');
      }
      const record = await tx.localLead.create({
        data: {
          businessId: business.id,
          offerId: data.offerId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          message: data.message,
          consentAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'local.lead.consent',
          entityType: 'LocalLead',
          entityId: record.id,
          requestId: res.locals.requestId,
          metadata: {
            consentVersion: 'local-enquiry-v1',
            businessId: business.id,
            businessName: business.name,
            purpose:
              'Store enquiry and share contact details with the named business to respond to this enquiry. No marketing subscription.',
          },
        },
      });
      return record;
    }, transactionOptions);
    sendSuccess(res, { id: lead.id, status: lead.status }, 'Lead received.');
  });
  router.use('/local', requireAuthentication(), requirePermission('local:manage'));
  router.post('/local/businesses', csrf, async (req, res) => {
    const data = businessSchema.parse(req.body);
    const business = await db.$transaction(async (tx) => {
      const record = await tx.localBusiness.create({ data: { ...data, ownerId: req.auth!.id } });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.id,
          action: 'local.business.created',
          entityType: 'LocalBusiness',
          entityId: record.id,
        },
      });
      return record;
    }, transactionOptions);
    sendSuccess(res, business, 'Business submitted for verification.');
  });
  router.put('/local/businesses/:id', csrf, async (req, res) => {
    const data = businessSchema.parse(req.body);
    const business = await db.$transaction(async (tx) => {
      const current = await tx.localBusiness.findUnique({ where: { id: String(req.params.id) } });
      if (!current) throw new ApiError(404, 'NOT_FOUND', 'Business not found.');
      const updated = await tx.localBusiness.update({
        where: { id: current.id },
        data: {
          ...data,
          phone: data.phone ?? null,
          website: data.website ?? null,
          status: 'PENDING',
          verifiedAt: null,
        },
      });
      await tx.localOffer.updateMany({
        where: { businessId: current.id, status: 'ACTIVE' },
        data: { status: 'PAUSED' },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.id,
          action: 'local.business.updated',
          entityType: 'LocalBusiness',
          entityId: current.id,
          metadata: { requiresVerification: true },
        },
      });
      return updated;
    }, transactionOptions);
    sendSuccess(res, business, 'Changes saved. Verification is required again.');
  });
  router.get('/local/manage', async (_req, res) => {
    sendSuccess(
      res,
      await db.localBusiness.findMany({
        include: { offers: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    );
  });
  router.post('/local/businesses/:id/verify', csrf, async (req, res) => {
    const { evidence } = z
      .object({ evidence: z.string().trim().min(10).max(2000) })
      .strict()
      .parse(req.body);
    const business = await db.$transaction(async (tx) => {
      const current = await tx.localBusiness.findUnique({ where: { id: String(req.params.id) } });
      if (!current) throw new ApiError(404, 'NOT_FOUND', 'Business not found.');
      const updated = await tx.localBusiness.update({
        where: { id: current.id },
        data: { status: 'VERIFIED', verifiedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.id,
          action: 'local.business.verified',
          entityType: 'LocalBusiness',
          entityId: current.id,
          metadata: { evidence },
        },
      });
      return updated;
    }, transactionOptions);
    sendSuccess(res, business, 'Business verified.');
  });
  router.post('/local/businesses/:id/suspend', csrf, async (req, res) => {
    const { reason } = z
      .object({ reason: z.string().trim().min(10).max(2000) })
      .strict()
      .parse(req.body);
    const business = await db.$transaction(async (tx) => {
      const current = await tx.localBusiness.findUnique({ where: { id: String(req.params.id) } });
      if (!current) throw new ApiError(404, 'NOT_FOUND', 'Business not found.');
      const updated = await tx.localBusiness.update({
        where: { id: current.id },
        data: { status: 'SUSPENDED', verifiedAt: null },
      });
      await tx.localOffer.updateMany({
        where: { businessId: current.id, status: 'ACTIVE' },
        data: { status: 'PAUSED' },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.id,
          action: 'local.business.suspended',
          entityType: 'LocalBusiness',
          entityId: current.id,
          metadata: { reason },
        },
      });
      return updated;
    }, transactionOptions);
    sendSuccess(res, business);
  });
  router.post('/local/offers/:id/status', csrf, async (req, res) => {
    const { status } = z
      .object({ status: z.enum(['ACTIVE', 'PAUSED']) })
      .strict()
      .parse(req.body);
    const offer = await db.$transaction(async (tx) => {
      const current = await tx.localOffer.findUnique({
        where: { id: String(req.params.id) },
        include: { business: true },
      });
      if (!current) throw new ApiError(404, 'NOT_FOUND', 'Offer not found.');
      if (
        status === 'ACTIVE' &&
        (current.business.status !== 'VERIFIED' ||
          current.endsAt <= new Date() ||
          !current.terms ||
          current.terms.trim().length < 10)
      )
        throw new ApiError(
          409,
          'INVALID_STATE',
          'Only unexpired offers with terms from verified businesses can be activated.',
        );
      const updated = await tx.localOffer.update({ where: { id: current.id }, data: { status } });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.id,
          action: 'local.offer.status',
          entityType: 'LocalOffer',
          entityId: current.id,
          metadata: { status },
        },
      });
      return updated;
    }, transactionOptions);
    sendSuccess(res, offer);
  });
  router.post('/local/leads/:id/status', csrf, async (req, res) => {
    const { status } = z
      .object({ status: z.enum(['CONTACTED', 'QUALIFIED', 'CLOSED', 'SPAM']) })
      .strict()
      .parse(req.body);
    const lead = await db.$transaction(async (tx) => {
      const current = await tx.localLead.findUnique({ where: { id: String(req.params.id) } });
      if (!current) throw new ApiError(404, 'NOT_FOUND', 'Lead not found.');
      const updated = await tx.localLead.update({ where: { id: current.id }, data: { status } });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.id,
          action: 'local.lead.status',
          entityType: 'LocalLead',
          entityId: current.id,
          metadata: { status },
        },
      });
      return updated;
    }, transactionOptions);
    sendSuccess(res, lead);
  });
  router.post('/local/businesses/:id/offers', csrf, async (req, res) => {
    const data = offerSchema.parse(req.body);
    const business = await db.localBusiness.findUnique({ where: { id: String(req.params.id) } });
    if (!business) throw new ApiError(404, 'NOT_FOUND', 'Business not found.');
    const offer = await db.$transaction(async (tx) => {
      const record = await tx.localOffer.create({ data: { ...data, businessId: business.id } });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.id,
          action: 'local.offer.created',
          entityType: 'LocalOffer',
          entityId: record.id,
        },
      });
      return record;
    }, transactionOptions);
    sendSuccess(res, offer, 'Offer saved.');
  });
  router.get('/local/leads', async (_req, res) =>
    sendSuccess(
      res,
      await db.localLead.findMany({
        include: { business: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ),
  );
  return router;
}
