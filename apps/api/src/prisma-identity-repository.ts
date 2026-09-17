import { PrismaClient, type Prisma } from '@prisma/client';

import { sanitizeAuditMetadata } from './audit.js';
import type { AuditEvent } from './audit.js';
import type {
  AuthenticatedUser,
  IdentityRepository,
  StoredSession,
  StoredUser,
} from './identity.js';

const userInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  },
} as const;

type PrismaUser = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  status: 'ACTIVE' | 'LOCKED' | 'DISABLED';
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  roles: Array<{
    role: {
      code: AuthenticatedUser['roles'][number];
      permissions: Array<{ permission: { code: string } }>;
    };
  }>;
};

function mapUser(user: PrismaUser): StoredUser {
  const roles = user.roles.map(({ role }) => role.code);
  const permissions = [
    ...new Set(
      user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.code)),
    ),
  ];

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    passwordHash: user.passwordHash,
    status: user.status,
    failedLoginAttempts: user.failedLoginAttempts,
    lockedUntil: user.lockedUntil,
    roles,
    permissions,
  };
}

export class PrismaIdentityRepository implements IdentityRepository {
  constructor(private readonly prisma = new PrismaClient()) {}

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: userInclude,
    });
    return user ? mapUser(user) : null;
  }

  async findSessionByTokenHash(tokenHash: string): Promise<StoredSession | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: { include: userInclude } },
    });
    if (!session || session.user.deletedAt) {
      return null;
    }

    return {
      id: session.id,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      user: mapUser(session.user),
    };
  }

  async createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.session.create({ data: input });
  }

  async revokeSession(tokenHash: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async markUserLoggedIn(userId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  }

  async recordFailedLogin(userId: string): Promise<void> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });
    if (user.failedLoginAttempts >= 5) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { lockedUntil: new Date(Date.now() + 15 * 60 * 1_000) },
      });
    }
  }

  async clearFailedLoginAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  async createPasswordReset(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.passwordReset.create({ data: input });
  }

  async findPasswordResetByTokenHash(tokenHash: string) {
    const reset = await this.prisma.passwordReset.findUnique({ where: { tokenHash } });
    if (!reset) {
      return null;
    }
    return {
      id: reset.id,
      userId: reset.userId,
      expiresAt: reset.expiresAt,
      usedAt: reset.usedAt,
    };
  }

  async consumePasswordReset(input: { resetId: string; passwordHash: string }): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const reset = await transaction.passwordReset.findUnique({ where: { id: input.resetId } });
      if (!reset || reset.usedAt || reset.expiresAt <= new Date()) {
        return false;
      }

      const now = new Date();
      const claimed = await transaction.passwordReset.updateMany({
        where: { id: reset.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) return false;
      await transaction.user.update({
        where: { id: reset.userId },
        data: {
          passwordHash: input.passwordHash,
          passwordChangedAt: now,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      await transaction.session.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      return true;
    });
  }

  async record(event: AuditEvent): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        actorId: event.actorId,
        requestId: event.requestId,
        ipHash: event.ipHash,
        metadata: event.metadata
          ? (sanitizeAuditMetadata(event.metadata) as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  async changePassword(input: {
    userId: string;
    previousHash: string;
    passwordHash: string;
    requestId?: string;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const changed = await tx.user.updateMany({
        where: {
          id: input.userId,
          passwordHash: input.previousHash,
          status: 'ACTIVE',
          deletedAt: null,
        },
        data: {
          passwordHash: input.passwordHash,
          passwordChangedAt: now,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      if (!changed.count) return false;
      await tx.session.updateMany({
        where: { userId: input.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.passwordReset.updateMany({
        where: { userId: input.userId, usedAt: null },
        data: { usedAt: now },
      });
      await tx.auditLog.create({
        data: {
          action: 'auth.password.changed',
          actorId: input.userId,
          entityId: input.userId,
          entityType: 'User',
          requestId: input.requestId,
        },
      });
      return true;
    });
  }
}
