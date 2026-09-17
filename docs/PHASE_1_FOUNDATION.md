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
- Both existing migrations are already applied locally and on the AWS preview. No new migration is needed for this milestone.

## Acceptance evidence

The current release suite has 32 API/unit tests and 10 isolated MySQL/Redis integration tests, covering fresh migrations, real queue execution/retries/scheduler deduplication, identity cleanup, password changes, taxonomy, media privacy, authorship, the persisted editorial workflow and AI proposal safeguards. Test schemas and queue keys are removed after each run; real users/content are not modified. Lint, type checks (including tests), and API/web/worker builds pass.

Preview: /preview/1 for sign-in, /admin/account for signed-in account security, /preview/2/settings for an inactive sample form.

## Explicitly outside the completion claim

Live reset email delivery awaits provider selection. Optional 2FA, full user/role administration UI, shared multi-instance rate limiting, production restore rehearsal and production security/load acceptance remain outstanding. The existing single-server AWS preview is not a production launch.
