# Phase 1 — Foundation

Status: core implementation verified locally on 2026-09-16. Release verification is tracked separately in DELIVERY_TRACKER.md. This is not a production-readiness sign-off.

## Delivered

- Next.js web, Express API, Prisma/MySQL and Redis/BullMQ workspace.
- Opaque hashed server-side sessions, secure production cookies, CSRF and origin checks, bcrypt cost 12, temporary login lockouts, and 13 seeded roles with least-privilege permissions.
- Password reset protocol with expiring, one-use tokens; real email delivery remains explicitly unavailable until a provider is configured.
- Authenticated password changes verify the current password and atomically revoke all sessions and outstanding reset tokens; the change is audited without secrets.
- Consistent API envelopes, bounded validation, request IDs, structured safe errors, rate limiting and redacted audit metadata.
- Real non-secret settings and audit reads. Administrator settings no longer depend on newsroom permissions. Account security is available to signed-in users at /admin/account.
- Hourly retention job removes sessions/reset records invalidated more than seven days ago; it never removes active credentials or audit history.
- Recurring BullMQ jobs are idempotently registered, retry failures with backoff and retain bounded job history. The worker now performs database operations instead of acknowledging a no-op.
- Identity, editorial, AI, and media-rights migrations are tracked in Prisma. Local/preview application of the newest migration and production restore rehearsal remain deployment gates.

## Acceptance evidence

The current local suite has 38 API/unit/domain tests and 11 isolated MySQL/Redis integration tests passing. The integration suite applies all five migrations and covers fresh migrations, queue execution/retries/scheduler deduplication, identity cleanup, password changes, taxonomy, media privacy, authorship, the persisted editorial workflow, media-rights fields, and AI proposal safeguards, and social-consent authorization/revocation. Test schemas and queue keys are removed after each run; real users/content are not modified. Lint, type checks (including tests), Prisma validation, and API/web/worker builds pass.

Preview: /preview/1 for sign-in, /admin/account for signed-in account security, /preview/2/settings for an inactive sample form.

## Explicitly outside the completion claim

Live reset email delivery awaits provider selection. Optional 2FA, full user/role administration UI, shared multi-instance rate limiting, production restore rehearsal and production security/load acceptance remain outstanding. The existing single-server AWS preview is not a production launch.
