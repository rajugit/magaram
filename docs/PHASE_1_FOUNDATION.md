# Phase 1 — Foundation

**Status:** Complete on 2026-09-15  
**Scope:** Identity, RBAC, API standards, database conventions, validation, structured logging/audit records, Redis/BullMQ foundation, configuration, and quality gates.

## Delivered architecture

```text
apps/web      Next.js App Router shell (Tamil-language baseline)
apps/api      Express API + Prisma identity/configuration boundary
apps/worker   BullMQ worker process for non-request work
MySQL         Prisma schema and initial migration (not applied: no database was supplied)
Redis         Queue connection and dependency-aware readiness check
```

## Authentication and authorization

- Opaque, server-side sessions stored only as SHA-256 hashes; session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- Bcrypt password hashes (cost 12), password-change timestamps, expiring/one-use reset records, and session revocation after a reset.
- Double-submit CSRF token requirement for every state-changing identity endpoint.
- Generic reset-request response prevents account enumeration; reset delivery is an injected interface and defaults to no delivery until an approved email provider is integrated.
- Temporary 15-minute lockout after five failed sign-ins, with a permanent `LOCKED` user state reserved for administrator control.
- All 13 requested roles are represented in the schema. Seeded permission relationships are additive and idempotent; the `*` permission is assigned only to `SUPER_ADMIN`.
- Role/permission and first-super-admin scripts are deliberate operators’ commands. Neither prints a secret.

## API surface

| Endpoint                                   | Purpose                                                         |
| ------------------------------------------ | --------------------------------------------------------------- |
| `GET /health`                              | Liveness without dependency or secret details.                  |
| `GET /ready`                               | MySQL/Redis readiness check, returning `503` when either fails. |
| `GET /version`                             | Safe application version response.                              |
| `GET /api/v1/auth/csrf`                    | CSRF-token issuance.                                            |
| `POST /api/v1/auth/login`                  | CSRF-protected session login.                                   |
| `POST /api/v1/auth/logout`                 | CSRF-protected session revocation.                              |
| `POST /api/v1/auth/password-reset/request` | Non-enumerating reset request.                                  |
| `POST /api/v1/auth/password-reset/confirm` | Expiring one-use token and password update.                     |
| `GET /api/v1/me`                           | Authenticated actor and permissions.                            |
| `GET /api/v1/settings`                     | RBAC-protected configuration placeholder.                       |
| `GET /api/v1/audit-logs`                   | RBAC-protected audit placeholder.                               |

All successful and error responses use the documented `/api/v1` envelope and include an `x-request-id` / `requestId`. The public settings and audit read endpoints intentionally return empty collections until their management flows are approved.

## Database changes

Created (but did not apply) the initial Prisma migration at `apps/api/prisma/migrations/202609150001_foundation/`. It defines identity, RBAC, sessions, reset tokens, audit logs, and non-secret system settings, with foreign keys and access-path indexes.

Before a real deployment:

1. Supply a MySQL 8 connection string through secret storage.
2. Run the approved migration through the deployment workflow.
3. Run `pnpm --filter @magaram/api db:seed`.
4. Run `pnpm --filter @magaram/api db:seed-super-admin` with one-time administrator credentials supplied only in the process environment.

## Security controls

- Boundary validation with Zod; one-megabyte JSON body limit.
- Helmet, narrow credentialed CORS origin, disabled `X-Powered-By`, request IDs, and API rate limiting.
- Role/permission enforcement in middleware and a central API-error contract.
- Redacted, bounded audit metadata; no secrets are logged by the provided seed scripts or error handler.
- Health endpoints disclose only liveness/readiness/version, not topology or credentials.

## Verification evidence

| Check               | Result                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`         | Pass — 6 API tests: health/version, CSRF sessions/logout, RBAC/error envelope, super-admin access, lockout, reset flow. |
| `pnpm lint`         | Pass — web, API, worker, Prisma operation scripts.                                                                      |
| `pnpm typecheck`    | Pass — web, API, worker, and Prisma operation scripts.                                                                  |
| `pnpm format:check` | Pass.                                                                                                                   |
| `pnpm db:validate`  | Pass — Prisma schema valid.                                                                                             |
| `pnpm build`        | Pass — API, worker, and optimized Next.js Webpack build.                                                                |

## Deliberately deferred

- Actual MySQL/Redis instances, migration execution, backups, and cloud secrets.
- Email provider implementation for reset delivery; the reset protocol is ready but a no-op adapter is the safe default.
- Optional 2FA, administrator user-management UI, password-reset email templates, and automated account-unlock workflows.
- Editorial CMS, content/media domains, AI services, public news routes, SEO, social, advertising, and all commercial features. These require their respective phase approvals.
