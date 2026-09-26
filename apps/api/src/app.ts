import { createHash, randomUUID } from 'node:crypto';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type ErrorRequestHandler, type Express, type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { editorialRouter } from './editorial.js';

import { ApiError, sendError, sendSuccess } from './api-response.js';
import type { AppConfig } from './config.js';
import {
  AuthService,
  NoopPasswordResetDelivery,
  PasswordService,
  TokenService,
} from './identity.js';
import type { IdentityRepository, PasswordResetDelivery } from './identity.js';
import { PrismaIdentityRepository } from './prisma-identity-repository.js';
import { aiRouter } from './ai.js';
import type { AiProvider, AiLimits } from './ai-service.js';
import { requireAuthentication, requirePermission } from './rbac.js';
import { socialRouter } from './social.js';
import { advertisingRouter } from './advertising.js';
import { localRouter } from './local.js';
import { marketplaceRouter } from './marketplace.js';

const SESSION_COOKIE = 'magaram_session';
const CSRF_COOKIE = 'magaram_csrf';
const sessionDurationMs = 12 * 60 * 60 * 1_000;

const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(12).max(256),
});

const passwordResetRequestSchema = z.object({
  email: z.string().trim().email().max(320),
});

const passwordResetConfirmSchema = z.object({
  token: z.string().min(32).max(128),
  password: z.string().min(12).max(256),
});

export interface AppDependencies {
  config: AppConfig;
  identityRepository?: IdentityRepository;
  passwordResetDelivery?: PasswordResetDelivery;
  aiProvider?: AiProvider;
  aiLimits?: AiLimits;
  db?: PrismaClient;
  isReady?: () => Promise<boolean>;
}

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function requestId(): RequestHandler {
  return (_request, response, next) => {
    response.locals.requestId = randomUUID();
    response.setHeader('x-request-id', response.locals.requestId);
    next();
  };
}

function csrfProtection(tokens: TokenService): RequestHandler {
  return (request, _response, next) => {
    const cookie = request.cookies[CSRF_COOKIE];
    const header = request.header('x-csrf-token');
    if (
      typeof cookie !== 'string' ||
      typeof header !== 'string' ||
      !tokens.equals(cookie, header)
    ) {
      next(new ApiError(403, 'CSRF_INVALID', 'A valid CSRF token is required.'));
      return;
    }
    next();
  };
}

function cookieOptions(config: AppConfig) {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: sessionDurationMs,
    path: '/',
  };
}

function errorHandler(): ErrorRequestHandler {
  return (error: unknown, _request, response, next) => {
    void next;
    if (error instanceof z.ZodError) {
      sendError(response, 422, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request.',
        details: error.issues.map(({ path, message }) => ({ path, message })),
      });
      return;
    }
    if (error instanceof SyntaxError) {
      sendError(response, 400, {
        code: 'INVALID_JSON',
        message: 'The request contains invalid JSON.',
      });
      return;
    }
    if (
      typeof error === 'object' &&
      error !== null &&
      ('status' in error || 'statusCode' in error) &&
      (('status' in error && error.status === 413) ||
        ('statusCode' in error && error.statusCode === 413))
    ) {
      sendError(response, 413, {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'The request payload is too large.',
      });
      return;
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      sendError(response, 409, {
        code: 'CONFLICT',
        message: 'A record with this value already exists.',
      });
      return;
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034') {
      sendError(response, 409, {
        code: 'CONCURRENT_CHANGE',
        message: 'This record changed during your request. Refresh and try again.',
      });
      return;
    }
    if (error instanceof ApiError) {
      sendError(response, error.status, {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return;
    }

    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Unhandled API error',
        requestId: response.locals.requestId,
      }),
    );
    sendError(response, 500, {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    });
  };
}

export function createApp(dependencies: AppDependencies): Express {
  const { config } = dependencies;
  const repository = dependencies.identityRepository ?? new PrismaIdentityRepository();
  const tokens = new TokenService(config.SESSION_SECRET);
  const authentication = new AuthService(
    repository,
    new PasswordService(),
    tokens,
    dependencies.passwordResetDelivery ?? new NoopPasswordResetDelivery(),
  );
  const app = express();

  app.set('trust proxy', config.TRUST_PROXY);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: config.WEB_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    }),
  );
  app.use(requestId());
  app.use(express.json({ limit: '1mb', type: 'application/json' }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      req.header('origin') &&
      req.header('origin') !== config.WEB_ORIGIN
    ) {
      next(new ApiError(403, 'ORIGIN_REJECTED', 'Untrusted request origin.'));
      return;
    }
    const started = Date.now();
    res.on('finish', () =>
      console.info(
        JSON.stringify({
          level: 'info',
          requestId: res.locals.requestId,
          method: req.method,
          status: res.statusCode,
          durationMs: Date.now() - started,
        }),
      ),
    );
    next();
  });
  app.use(
    rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      limit: config.RATE_LIMIT_MAX,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skip: (request) => ['/health', '/ready', '/version'].includes(request.path),
      handler: (_request, response) =>
        sendError(response, 429, {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        }),
    }),
  );
  app.use(
    '/api/v1',
    asyncRoute(async (request, _response, next) => {
      const session = await authentication.getSession(request.cookies[SESSION_COOKIE]);
      if (session) {
        request.auth = session.user;
      }
      next();
    }),
  );

  app.get('/health', (_request, response) => sendSuccess(response, { status: 'ok' }));
  app.get(
    '/ready',
    asyncRoute(async (_request, response) => {
      const ready = dependencies.isReady ? await dependencies.isReady() : true;
      if (!ready) {
        throw new ApiError(503, 'NOT_READY', 'Service dependencies are not ready.');
      }
      return sendSuccess(response, { status: 'ready' });
    }),
  );
  app.get('/version', (_request, response) =>
    sendSuccess(response, { version: config.APP_VERSION }),
  );

  app.get('/api/v1/auth/csrf', (_request, response) => {
    const token = tokens.create();
    response.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionDurationMs,
      path: '/',
    });
    return sendSuccess(response, { token });
  });

  app.post(
    '/api/v1/auth/login',
    csrfProtection(tokens),
    asyncRoute(async (request, response) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid request.', parsed.error.issues);
      }

      try {
        const result = await authentication.login(
          parsed.data.email,
          parsed.data.password,
          response.locals.requestId,
        );
        response.cookie(SESSION_COOKIE, result.token, cookieOptions(config));
        return sendSuccess(response, { user: presentUser(result.user) }, 'Signed in successfully.');
      } catch (error) {
        if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
          throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
        }
        throw error;
      }
    }),
  );

  app.post(
    '/api/v1/auth/password-reset/request',
    csrfProtection(tokens),
    asyncRoute(async (request, response) => {
      const parsed = passwordResetRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid request.', parsed.error.issues);
      }
      await authentication.requestPasswordReset(parsed.data.email, response.locals.requestId);
      return sendSuccess(
        response,
        {},
        'If the account exists, password reset instructions have been sent.',
      );
    }),
  );

  app.post(
    '/api/v1/auth/password-reset/confirm',
    csrfProtection(tokens),
    asyncRoute(async (request, response) => {
      const parsed = passwordResetConfirmSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid request.', parsed.error.issues);
      }
      try {
        await authentication.completePasswordReset(
          parsed.data.token,
          parsed.data.password,
          response.locals.requestId,
        );
      } catch (error) {
        if (error instanceof Error && error.message === 'INVALID_RESET_TOKEN') {
          throw new ApiError(400, 'INVALID_RESET_TOKEN', 'The reset token is invalid or expired.');
        }
        throw error;
      }
      return sendSuccess(response, {}, 'Password updated successfully.');
    }),
  );

  app.post(
    '/api/v1/auth/logout',
    requireAuthentication(),
    csrfProtection(tokens),
    asyncRoute(async (request, response) => {
      await authentication.logout(request.cookies[SESSION_COOKIE], response.locals.requestId);
      response.clearCookie(SESSION_COOKIE, cookieOptions(config));
      return sendSuccess(response, {}, 'Signed out successfully.');
    }),
  );

  if (dependencies.db)
    app.use(
      '/api/v1',
      aiRouter(
        dependencies.db,
        csrfProtection(tokens),
        dependencies.aiProvider,
        dependencies.aiLimits,
        config.EMAIL_PROVIDER === 'ses',
      ),
    );
  app.get('/api/v1/me', requireAuthentication(), (request, response) =>
    sendSuccess(response, { user: presentUser(request.auth!) }),
  );
  app.post(
    '/api/v1/auth/password-change',
    requireAuthentication(),
    csrfProtection(tokens),
    async (req, res) => {
      const data = z
        .object({
          currentPassword: z.string().min(1).max(256),
          password: z.string().min(12).max(72),
        })
        .strict()
        .parse(req.body);
      await authentication.changePassword(
        req.auth!,
        data.currentPassword,
        data.password,
        res.locals.requestId,
      );
      res.clearCookie(SESSION_COOKIE, cookieOptions(config));
      sendSuccess(res, {}, 'Password changed. All sessions have been signed out.');
    },
  );
  app.get('/api/v1/settings', requirePermission('settings:read'), async (_request, response) => {
    if (!dependencies.db)
      throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Settings storage is not configured.');
    sendSuccess(response, {
      settings: await dependencies.db.systemSetting.findMany({
        where: { isSecret: false },
        select: { key: true, value: true, description: true, updatedAt: true },
        take: 100,
      }),
    });
  });
  app.get('/api/v1/audit-logs', requirePermission('audit:read'), async (request, response) => {
    if (!dependencies.db)
      throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Audit storage is not configured.');
    const { page, limit } = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(request.query);
    const [items, total] = await Promise.all([
      dependencies.db.auditLog.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { displayName: true } } },
      }),
      dependencies.db.auditLog.count(),
    ]);
    sendSuccess(response, { items, total, page, limit });
  });
  if (dependencies.db) app.use('/api/v1', editorialRouter(dependencies.db, csrfProtection(tokens)));
  if (dependencies.db) app.use('/api/v1', socialRouter(dependencies.db, csrfProtection(tokens)));
  if (dependencies.db)
    app.use('/api/v1', advertisingRouter(dependencies.db, csrfProtection(tokens)));
  if (dependencies.db) app.use('/api/v1', localRouter(dependencies.db, csrfProtection(tokens)));
  if (dependencies.db) app.use('/api/v1', marketplaceRouter(dependencies.db, csrfProtection(tokens)));

  app.use((_request, _response, next) => {
    next(new ApiError(404, 'NOT_FOUND', 'The requested resource was not found.'));
  });
  app.use(errorHandler());

  return app;
}

function presentUser(user: {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: user.roles,
    permissions: user.permissions,
  };
}

export function hashIp(ip: string, secret: string): string {
  return createHash('sha256').update(`${secret}:${ip}`).digest('hex');
}
