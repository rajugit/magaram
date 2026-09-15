# Testing Assessment and Strategy

## Current assessment

Phase 1 adds Vitest/Supertest API regression tests and workspace lint, typecheck, format, schema-validation, and build commands. The six passing API tests cover safe health/version output, CSRF-protected sessions/logout, RBAC/error responses, super-administrator access, lockout, and a password-reset flow using an injected delivery adapter. Coverage reporting is configured but was not run as a release gate; no CI workflow is added until the approved CI/CD phase.

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
