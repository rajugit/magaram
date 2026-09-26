import type { MarketplaceCategory, PrismaClient } from '@prisma/client';
import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { ApiError, sendSuccess } from './api-response.js';
import { requireAuthentication, requirePermission } from './rbac.js';

const categories = ['JOB', 'CLASSIFIED', 'PROPERTY', 'EDUCATION', 'DEAL'] as const;
const listingInput = z
  .object({
    category: z.enum(categories),
    title: z.string().trim().min(3).max(180),
    description: z.string().trim().min(20).max(10_000),
    location: z.string().trim().min(2).max(120),
    priceOrSalary: z.string().trim().max(120).optional(),
    contactEmail: z.string().trim().email().max(320),
    contactPhone: z.string().trim().max(40).optional(),
    rightsEvidence: z.string().trim().min(10).max(2_000),
    expiresAt: z.string().datetime({ offset: true }).transform((value) => new Date(value)),
    version: z.number().int().positive().optional(),
  })
  .strict();

function staff(req: Parameters<RequestHandler>[0]) {
  return req.auth!.permissions.includes('*') || req.auth!.permissions.includes('market:manage');
}

export function marketplaceRouter(db: PrismaClient, csrf: RequestHandler): Router {
  const router = Router();
  router.get('/market/listings', async (req, res) => {
    const query = z
      .object({ category: z.enum(categories).optional(), location: z.string().max(120).optional(), page: z.coerce.number().int().min(1).default(1) })
      .parse(req.query);
    const now = new Date();
    const where = { status: 'APPROVED' as const, expiresAt: { gt: now }, ...(query.category ? { category: query.category } : {}), ...(query.location ? { location: query.location } : {}) };
    const [items, total] = await db.$transaction([
      db.marketplaceListing.findMany({ where, select: { id: true, category: true, title: true, description: true, location: true, priceOrSalary: true, expiresAt: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 24, skip: (query.page - 1) * 24 }),
      db.marketplaceListing.count({ where }),
    ]);
    sendSuccess(res, { items, total, page: query.page, limit: 24 });
  });
  router.use('/market', requireAuthentication(), (req, _res, next) => {
    if (!req.auth!.permissions.some((permission) => ['*', 'market:own', 'market:manage', 'market:review'].includes(permission))) {
      next(new ApiError(403, 'FORBIDDEN', 'Marketplace access is not permitted.'));
      return;
    }
    next();
  });
  router.get('/market/status', (req, res) => sendSuccess(res, { canCreate: req.auth!.permissions.some((p) => ['*', 'market:own', 'market:manage'].includes(p)), canManage: staff(req), canReview: req.auth!.permissions.includes('*') || req.auth!.permissions.includes('market:review'), categories }));
  router.get('/market/listings/mine', async (req, res) => sendSuccess(res, { items: await db.marketplaceListing.findMany({ where: staff(req) ? {} : { ownerId: req.auth!.id }, orderBy: { createdAt: 'desc' }, take: 100 }) }));
  router.post('/market/listings', requirePermission('market:own'), csrf, async (req, res) => {
    const input = listingInput.omit({ version: true }).parse(req.body);
    if (input.expiresAt <= new Date()) throw new ApiError(422, 'VALIDATION_ERROR', 'Expiry must be in the future.');
    const listing = await db.$transaction(async (tx) => {
      const record = await tx.marketplaceListing.create({ data: { ...input, ownerId: req.auth!.id, contactPhone: input.contactPhone ?? null, priceOrSalary: input.priceOrSalary ?? null } });
      await tx.auditLog.create({ data: { actorId: req.auth!.id, action: 'market.listing.created', entityType: 'MarketplaceListing', entityId: record.id } });
      return record;
    });
    sendSuccess(res, listing, 'Listing saved as draft.');
  });
  router.put('/market/listings/:id', requirePermission('market:own'), csrf, async (req, res) => {
    const input = listingInput.parse(req.body);
    const current = await db.marketplaceListing.findUnique({ where: { id: String(req.params.id) } });
    if (!current || (current.ownerId !== req.auth!.id && !staff(req))) throw new ApiError(404, 'NOT_FOUND', 'Listing not found.');
    if (input.version !== current.version) throw new ApiError(409, 'CONCURRENT_CHANGE', 'This listing changed. Refresh and try again.');
    if (!['DRAFT', 'REJECTED'].includes(current.status)) throw new ApiError(409, 'INVALID_STATE', 'Only drafts or rejected listings can be edited.');
    const listing = await db.marketplaceListing.update({ where: { id: current.id }, data: { ...input, version: { increment: 1 }, status: 'DRAFT', submittedBy: null, reviewedBy: null, reviewedAt: null, reviewNote: null, contactPhone: input.contactPhone ?? null, priceOrSalary: input.priceOrSalary ?? null } });
    sendSuccess(res, listing);
  });
  router.post('/market/listings/:id/submit', requirePermission('market:own'), csrf, async (req, res) => {
    const version = z.object({ version: z.number().int().positive() }).strict().parse(req.body).version;
    const current = await db.marketplaceListing.findUnique({ where: { id: String(req.params.id) } });
    if (!current || (current.ownerId !== req.auth!.id && !staff(req))) throw new ApiError(404, 'NOT_FOUND', 'Listing not found.');
    if (current.version !== version) throw new ApiError(409, 'CONCURRENT_CHANGE', 'This listing changed. Refresh and try again.');
    if (!['DRAFT', 'REJECTED'].includes(current.status)) throw new ApiError(409, 'INVALID_STATE', 'Listing cannot be submitted.');
    sendSuccess(res, await db.marketplaceListing.update({ where: { id: current.id }, data: { status: 'SUBMITTED', submittedBy: req.auth!.id, version: { increment: 1 } } }));
  });
  router.post('/market/listings/:id/review', requirePermission('market:review'), csrf, async (req, res) => {
    const input = z.object({ version: z.number().int().positive(), decision: z.enum(['APPROVED', 'REJECTED']), note: z.string().trim().min(10).max(2_000) }).strict().parse(req.body);
    const current = await db.marketplaceListing.findUnique({ where: { id: String(req.params.id) } });
    if (!current || current.status !== 'SUBMITTED') throw new ApiError(404, 'NOT_FOUND', 'Submitted listing not found.');
    if (current.ownerId === req.auth!.id || current.submittedBy === req.auth!.id) throw new ApiError(403, 'INDEPENDENT_REVIEW_REQUIRED', 'The owner or submitter cannot review this listing.');
    if (current.version !== input.version) throw new ApiError(409, 'CONCURRENT_CHANGE', 'This listing changed. Refresh and try again.');
    const listing = await db.$transaction(async (tx) => {
      const updated = await tx.marketplaceListing.update({ where: { id: current.id }, data: { status: input.decision, reviewedBy: req.auth!.id, reviewedAt: new Date(), reviewNote: input.note, version: { increment: 1 } } });
      await tx.auditLog.create({ data: { actorId: req.auth!.id, action: `market.listing.${input.decision.toLowerCase()}`, entityType: 'MarketplaceListing', entityId: current.id, metadata: { note: input.note } } });
      return updated;
    });
    sendSuccess(res, listing);
  });
  router.post('/market/listings/:id/report', csrf, async (req, res) => {
    const reason = z.object({ reason: z.string().trim().min(5).max(1_000) }).strict().parse(req.body).reason;
    const listing = await db.marketplaceListing.findFirst({ where: { id: String(req.params.id), status: 'APPROVED', expiresAt: { gt: new Date() } } });
    if (!listing) throw new ApiError(404, 'NOT_FOUND', 'Listing not found.');
    await db.marketplaceReport.create({ data: { listingId: listing.id, reporterId: req.auth!.id, reason } });
    sendSuccess(res, { reported: true });
  });
  return router;
}
