# Testing Assessment and Strategy

## Current assessment

The current local suite has 38 API/unit/domain tests and 11 isolated MySQL/Redis integration tests passing. The integration runner applies all five migrations, exercises the editorial/media-rights, AI, and social-consent workflows, and removes its disposable schema and queue fixtures. Lint, type checks (including tests), all three application builds, and Prisma schema validation pass. The 11 regenerated offline previews were inspected for Tamil document language, skip navigation, a main landmark, a page heading, and explicit sample labeling where applicable; this is not full browser end-to-end or accessibility acceptance. Coverage reporting is configured but was not run as a release gate. AI workflow integration uses a no-network test fixture, not a live provider or evidence of real-model Tamil quality.

Run `pnpm test` for API/unit tests. Run `pnpm test:integration` with the dedicated local MySQL/Redis containers running. The integration runner rejects non-local/non-preview database URLs, creates a random test schema, applies migrations, runs fixtures, and removes only its own schema and grant. Redis tests use the same unique test name and remove only their own queue. Never point these tests at AWS or a shared production database. HTTP tests need local listening-port permission.

After a fresh install, run `pnpm --filter @magaram/api build` before workspace typechecking: the worker consumes the API package’s built maintenance-service declarations. `pnpm build` orders these workspace dependencies automatically.

## Quality gates by phase

| Phase            | Minimum verification                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1 Foundation     | Unit tests for auth/RBAC/validation/config; API tests for session and authorization boundaries; lint/typecheck.      |
| 2 CMS            | Workflow transition, revisions, sources/claims, correction, media authorization, and database integration tests.     |
| 3 AI             | Policy-gate, audit-record, provider-adapter, failure/retry, and Tamil regression fixtures.                           |
| 4–5 Public/SEO   | Route rendering, metadata/schema, sitemap/RSS, accessibility, responsive and performance checks.                     |
| 6 Social         | Provider contract, idempotency, webhook verification, consent, queue/retry tests.                                    |
| 7–12 Commerce    | Lead consent, campaign/billing, payment webhook, ledger invariants, reporting, and role isolation tests.             |
| 13–15 Production | Deployment smoke tests, backups/restore rehearsal, load/security tests, monitoring alerts, disaster recovery review. |

## Test pyramid

- Fast unit tests for domain rules and utilities.
- Integration tests against disposable MySQL/Redis-compatible services for persistence and queues.
- API contract tests for validation/auth/error envelopes.
- Browser E2E tests for critical editorial, advertiser, payment, and audience paths.
- Accessibility, SEO, security, and performance checks in CI where reproducible.

Critical tests must run before merge and deployment. Failures or warnings must remain visible; no phase may claim completion without recorded command results.

The repository CI workflow runs lint, type checks, production dependency audit, builds, and API unit/domain tests. A dependent integration job creates the dedicated local MySQL/Redis containers, applies migrations, runs the isolated integration suite, and removes those containers even when the job fails.
