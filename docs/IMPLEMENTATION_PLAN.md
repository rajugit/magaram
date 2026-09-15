# Implementation Plan

## Phase 0 status

Completed as documentation only. The workspace is empty; no source, dependencies, databases, or deployment artifacts were modified.

## Phase 1 status

Completed on 2026-09-15. The workspace now contains a tested Next.js/Express/worker foundation, identity/RBAC API, Prisma schema and initial migration, operation scripts, configuration sample, and quality commands. See [Phase 1 Foundation](./PHASE_1_FOUNDATION.md) for the implementation and verification record.

## Approval-gated plan

| Phase | Scope                                                                                                             | Exit evidence                                                           |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1     | Identity, RBAC, API conventions, validation, logging, audit, configuration, database conventions, queue readiness | Tests, lint/typecheck, security review, docs.                           |
| 2     | Editorial CMS: articles, taxonomy, authors, sources, claims, facts, revisions, corrections, media                 | Workflow/authorization tests and migration evidence.                    |
| 3     | AI newsroom                                                                                                       | Policy gates, audit records, provider failure handling, Tamil fixtures. |
| 4     | Public website                                                                                                    | Responsive/accessibility checks and route coverage.                     |
| 5     | SEO                                                                                                               | Metadata/schema/sitemap/RSS tests.                                      |
| 6     | Social distribution                                                                                               | Official-provider, consent, webhook, and retry tests.                   |
| 7     | Magaram Local                                                                                                     | Directory/verification/lead consent tests.                              |
| 8     | Advertising                                                                                                       | Campaign, disclosure, payment, ledger, analytics tests.                 |
| 9     | Marketplace expansion                                                                                             | Moderation, entitlement, transaction and role tests.                    |
| 10    | Audience monetization                                                                                             | Subscription, newsletter, preference/unsubscribe tests.                 |
| 11    | Media business                                                                                                    | Creator, studio, events, intelligence, API governance tests.            |
| 12    | Revenue intelligence                                                                                              | Reconciled-data reporting and non-fabrication tests.                    |
| 13    | AWS production                                                                                                    | IaC, environment, backup/restore, operational runbook evidence.         |
| 14    | CI/CD                                                                                                             | Required quality gates, deployments, rollback, smoke tests.             |
| 15    | Production readiness                                                                                              | Security, load, accessibility, recovery, and launch checklist.          |

## Phase 1 implementation record

Created the root workspace configuration; `apps/web`, `apps/api`, and `apps/worker`; the initial Prisma migration; identity/audit/RBAC/queue/readiness modules; a regression suite; sample environment configuration; and local operating instructions. No real database migration was run because no MySQL environment was supplied.

## Phase 1 decisions made

- Adopted a three-app workspace: Next.js web, Express API, and BullMQ worker.
- Adopted Prisma/MySQL conventions and Redis/BullMQ abstractions; real infrastructure remains unconfigured.
- Implemented server-side sessions, RBAC, audit records, password reset protocol, and temporary lockouts; optional 2FA is deferred.
- Deferred provider choices for email, AI, payments, analytics, and social integrations.

## Next action

Await the exact command `APPROVE PHASE 2` before adding editorial CMS data or features.
