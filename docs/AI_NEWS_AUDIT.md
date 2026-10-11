# Magaram Media AI newsroom audit

**Audit date:** 2026-10-11  
**Repository:** `magaram-media`  
**Scope:** existing code, database, workers, deployment, security controls and editorial workflow.

## Findings

Magaram Media is an existing pnpm TypeScript monorepo. `apps/web` is a Next.js App Router site; `apps/api` is an Express API with Prisma and MySQL; `apps/worker` is a BullMQ/Redis worker. The repository already contains authenticated editorial drafting, source and claim records, independent review, corrections, revisions, media rights, SEO routes, AI proposal safeguards, advertising, marketplaces and social-consent foundations.

Authentication uses hashed passwords, server sessions, CSRF tokens, secure cookies in production, RBAC and audit logs. Article writes and state transitions use Prisma transactions and version checks. Public projections are published-only. AI generation is provider-gated, source-bound, quota-limited and never publishes directly.

The existing worker currently performs session retention and scheduled article publication. Redis/BullMQ is therefore reusable for discovery, verification and later publishing jobs. MySQL/Prisma is reusable for source configuration, provenance, deduplication and audit records.

## Gaps found before the new milestone

| Area | Existing capability | Gap addressed next |
| --- | --- | --- |
| Source registry | Article-level source URLs | Configurable source records, trust, geography, license notes and polling policy |
| Feed ingestion | No persistent RSS fetch pipeline | Safe RSS/Atom ingestion with fetch history, limits and backoff |
| Discovery | Articles are manually created | Persisted discovered items with deterministic deduplication |
| Verification | Article claims and source verification exist | Discovered items remain unverified until editorial workflow handles them |
| AI | Bedrock adapter and guarded proposal workflow | Ollama adapter, topic clustering and generation queues remain later milestones |
| Social | Consent and contracts | Official provider adapters and delivery remain provider-gated |
| Images | Rights-aware media records | Licensed image selection and transformation remain later work |
| Operations | Health, logs, backups and release smoke checks | Discovery-specific metrics, dead-letter review and restore rehearsal remain |

## Safety decisions

Fetched feed content is untrusted evidence, never an instruction. Source URLs are restricted to HTTP(S), private and loopback destinations are rejected, redirects are revalidated, responses are size-limited and parsing is bounded. Discovery creates `DISCOVERED` records only; it does not create or publish articles. Copyright, robots, licensing and provider terms remain editorial and operational gates.

## Acceptance boundary

This audit and Milestone 1 implementation do not claim trend detection, fact verification, AI writing, social publishing or auto-publication. Those capabilities require their own persisted workflows, tests and human acceptance.
