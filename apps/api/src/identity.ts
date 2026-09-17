import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import bcrypt from 'bcryptjs';
import { ApiError } from './api-response.js';

import type { AppRole, UserStatus } from './generated-types.js';
import type { AuditRecorder } from './audit.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
  roles: AppRole[];
  permissions: string[];
}

export interface StoredUser extends AuthenticatedUser {
  passwordHash: string;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

export interface StoredSession {
  id: string;
  user: AuthenticatedUser;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface StoredPasswordReset {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface PasswordResetDelivery {
  deliver(input: { recipient: string; token: string; expiresAt: Date }): Promise<void>;
}

export class NoopPasswordResetDelivery implements PasswordResetDelivery {
  async deliver(): Promise<void> {
    throw new ApiError(503, 'DELIVERY_UNAVAILABLE', 'Password reset delivery is not configured.');
  }
}

export interface IdentityRepository extends AuditRecorder {
  findUserByEmail(email: string): Promise<StoredUser | null>;
  findSessionByTokenHash(tokenHash: string): Promise<StoredSession | null>;
  createSession(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  revokeSession(tokenHash: string): Promise<void>;
  markUserLoggedIn(userId: string): Promise<void>;
  recordFailedLogin(userId: string): Promise<void>;
  clearFailedLoginAttempts(userId: string): Promise<void>;
  createPasswordReset(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  findPasswordResetByTokenHash(tokenHash: string): Promise<StoredPasswordReset | null>;
  consumePasswordReset(input: { resetId: string; passwordHash: string }): Promise<boolean>;
  changePassword(input: {
    userId: string;
    previousHash: string;
    passwordHash: string;
    requestId?: string;
  }): Promise<boolean>;
}

export class PasswordService {
  async hash(password: string): Promise<string> {
    if (Buffer.byteLength(password, 'utf8') > 72)
      throw new ApiError(422, 'VALIDATION_ERROR', 'Password must be at most 72 UTF-8 bytes.');
    return bcrypt.hash(password, 12);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    if (Buffer.byteLength(password, 'utf8') > 72) return false;
    return bcrypt.compare(password, hash);
  }
}

export class TokenService {
  constructor(private readonly secret: string) {}

  create(): string {
    return randomBytes(32).toString('base64url');
  }

  hash(token: string): string {
    return createHash('sha256').update(`${this.secret}:${token}`).digest('hex');
  }

  equals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }
}

export class AuthService {
  // A fixed bcrypt work factor for unknown accounts prevents the cheap account-enumeration path.
  private readonly dummyHash = bcrypt.hashSync('not-an-account-password', 12);
  constructor(
    private readonly repository: IdentityRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly passwordResetDelivery: PasswordResetDelivery,
  ) {}

  async login(
    email: string,
    password: string,
    requestId?: string,
  ): Promise<{ user: AuthenticatedUser; token: string }> {
    const user = await this.repository.findUserByEmail(email.toLowerCase());
    const passwordMatches = await this.passwords.verify(
      password,
      user?.passwordHash ?? this.dummyHash,
    );

    const temporarilyLocked = user?.lockedUntil && user.lockedUntil > new Date();
    if (!user || !passwordMatches || user.status !== 'ACTIVE' || temporarilyLocked) {
      if (user && !temporarilyLocked && user.status === 'ACTIVE') {
        await this.repository.recordFailedLogin(user.id);
      }
      await this.repository.record({
        action: 'auth.login.failed',
        entityType: 'User',
        requestId,
        metadata: { email },
      });
      throw new Error('INVALID_CREDENTIALS');
    }

    const token = this.tokens.create();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12);
    await this.repository.createSession({
      userId: user.id,
      tokenHash: this.tokens.hash(token),
      expiresAt,
    });
    await this.repository.clearFailedLoginAttempts(user.id);
    await this.repository.markUserLoggedIn(user.id);
    await this.repository.record({
      action: 'auth.login.succeeded',
      entityType: 'User',
      entityId: user.id,
      actorId: user.id,
      requestId,
    });

    return { user, token };
  }

  async getSession(token: string | undefined): Promise<StoredSession | null> {
    if (!token) {
      return null;
    }

    const session = await this.repository.findSessionByTokenHash(this.tokens.hash(token));
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.status !== 'ACTIVE'
    ) {
      return null;
    }

    return session;
  }

  async logout(token: string, requestId?: string): Promise<void> {
    const session = await this.getSession(token);
    if (!session) {
      return;
    }

    await this.repository.revokeSession(this.tokens.hash(token));
    await this.repository.record({
      action: 'auth.logout',
      entityType: 'Session',
      entityId: session.id,
      actorId: session.user.id,
      requestId,
    });
  }

  async requestPasswordReset(email: string, requestId?: string): Promise<void> {
    if (this.passwordResetDelivery instanceof NoopPasswordResetDelivery) {
      throw new ApiError(503, 'DELIVERY_UNAVAILABLE', 'Password reset delivery is not configured.');
    }
    const user = await this.repository.findUserByEmail(email.toLowerCase());
    if (!user || user.status !== 'ACTIVE') {
      return;
    }

    const token = this.tokens.create();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
    await this.repository.createPasswordReset({
      userId: user.id,
      tokenHash: this.tokens.hash(token),
      expiresAt,
    });
    await this.passwordResetDelivery.deliver({ recipient: user.email, token, expiresAt });
    await this.repository.record({
      action: 'auth.password-reset.requested',
      entityType: 'User',
      entityId: user.id,
      actorId: user.id,
      requestId,
    });
  }

  async changePassword(
    user: AuthenticatedUser,
    currentPassword: string,
    password: string,
    requestId?: string,
  ) {
    const stored = await this.repository.findUserByEmail(user.email);
    if (
      !stored ||
      stored.status !== 'ACTIVE' ||
      (stored.lockedUntil && stored.lockedUntil > new Date()) ||
      !(await this.passwords.verify(currentPassword, stored.passwordHash))
    ) {
      if (
        stored &&
        stored.status === 'ACTIVE' &&
        (!stored.lockedUntil || stored.lockedUntil <= new Date())
      )
        await this.repository.recordFailedLogin(stored.id);
      throw new ApiError(
        403,
        'INVALID_CREDENTIALS',
        'Current password is incorrect or the account is temporarily locked.',
      );
    }
    if (await this.passwords.verify(password, stored.passwordHash))
      throw new ApiError(422, 'PASSWORD_UNCHANGED', 'Choose a different password.');
    const changed = await this.repository.changePassword({
      userId: stored.id,
      previousHash: stored.passwordHash,
      passwordHash: await this.passwords.hash(password),
      requestId,
    });
    if (!changed) throw new ApiError(409, 'PASSWORD_CHANGED', 'Account changed. Sign in again.');
  }

  async completePasswordReset(token: string, password: string, requestId?: string): Promise<void> {
    const reset = await this.repository.findPasswordResetByTokenHash(this.tokens.hash(token));
    if (!reset || reset.usedAt || reset.expiresAt <= new Date()) {
      throw new Error('INVALID_RESET_TOKEN');
    }

    const consumed = await this.repository.consumePasswordReset({
      resetId: reset.id,
      passwordHash: await this.passwords.hash(password),
    });
    if (!consumed) {
      throw new Error('INVALID_RESET_TOKEN');
    }

    await this.repository.record({
      action: 'auth.password-reset.completed',
      entityType: 'User',
      entityId: reset.userId,
      actorId: reset.userId,
      requestId,
    });
  }
}
