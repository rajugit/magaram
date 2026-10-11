import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { ApiError, sendSuccess } from './api-response.js';
import { requirePermission } from './rbac.js';

const roleCodes = [
  'ADMIN',
  'EDITOR',
  'REPORTER',
  'FACT_CHECKER',
  'SOCIAL_MANAGER',
  'SALES_MANAGER',
  'ADVERTISER',
  'BUSINESS_OWNER',
  'RECRUITER',
  'FINANCE',
  'ANALYST',
  'CONTRIBUTOR',
] as const;

const createUserSchema = z
  .object({
    username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/),
    email: z.string().trim().email().max(320),
    displayName: z.string().trim().min(2).max(160),
    password: z.string().min(12).max(72),
    roles: z.array(z.enum(roleCodes)).min(1).max(4),
  })
  .strict();

const updateSchema = z
  .object({
    status: z.enum(['ACTIVE', 'LOCKED', 'DISABLED']).optional(),
    roles: z.array(z.enum(roleCodes)).min(1).max(4).optional(),
  })
  .strict();

export function adminAccountsRouter(db: PrismaClient, csrf: RequestHandler): Router {
  const router = Router();
  router.use('/admin/users', requirePermission('users:manage'));
  router.get('/admin/users', async (_req, res) => {
    const users = await db.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        status: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        roles: { select: { role: { select: { code: true, name: true } } } },
      },
    });
    sendSuccess(res, { items: users });
  });
  router.post('/admin/users', csrf, async (req, res) => {
    const input = createUserSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await db.$transaction(async (tx) => {
      const roles = await tx.role.findMany({ where: { code: { in: input.roles } } });
      if (roles.length !== input.roles.length) throw new ApiError(422, 'ROLE_NOT_FOUND', 'One or more roles are unavailable.');
      const created = await tx.user.create({
        data: {
          username: input.username.toLowerCase(),
          email: input.email.toLowerCase(),
          displayName: input.displayName,
          passwordHash,
          mustChangePassword: true,
          roles: { create: roles.map((role) => ({ roleId: role.id })) },
        },
        select: { id: true, username: true, email: true, displayName: true, mustChangePassword: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.id,
          action: 'admin.user.created',
          entityType: 'User',
          entityId: created.id,
          requestId: res.locals.requestId,
          metadata: { roles: input.roles, temporaryPassword: true },
        },
      });
      return created;
    });
    sendSuccess(res, user, 'User created with a temporary password.');
  });
  router.patch('/admin/users/:id', csrf, async (req, res) => {
    const input = updateSchema.parse(req.body);
    const id = String(req.params.id);
    if (id === req.auth!.id && input.status && input.status !== 'ACTIVE')
      throw new ApiError(409, 'CANNOT_DISABLE_SELF', 'You cannot disable or lock your own account.');
    const updated = await db.$transaction(async (tx) => {
      const current = await tx.user.findUniqueOrThrow({ where: { id } });
      if (input.roles) {
        const roles = await tx.role.findMany({ where: { code: { in: input.roles } } });
        if (roles.length !== input.roles.length) throw new ApiError(422, 'ROLE_NOT_FOUND', 'One or more roles are unavailable.');
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({ data: roles.map((role) => ({ userId: id, roleId: role.id })) });
      }
      const value = await tx.user.update({
        where: { id },
        data: { status: input.status },
        select: { id: true, username: true, email: true, displayName: true, status: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.id,
          action: 'admin.user.updated',
          entityType: 'User',
          entityId: id,
          requestId: res.locals.requestId,
          metadata: { status: input.status, roles: input.roles, previousStatus: current.status },
        },
      });
      return value;
    });
    sendSuccess(res, updated);
  });
  router.post('/admin/users/:id/password', csrf, async (req, res) => {
    const input = z.object({ password: z.string().min(12).max(72) }).strict().parse(req.body);
    const id = String(req.params.id);
    const passwordHash = await bcrypt.hash(input.password, 12);
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash, passwordChangedAt: new Date(), mustChangePassword: true, failedLoginAttempts: 0, lockedUntil: null } });
      await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.id,
          action: 'admin.user.password.set',
          entityType: 'User',
          entityId: id,
          requestId: res.locals.requestId,
          metadata: { temporaryPassword: true },
        },
      });
    });
    sendSuccess(res, {}, 'Temporary password set.');
  });
  return router;
}
