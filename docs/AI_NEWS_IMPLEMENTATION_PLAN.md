# AI newsroom implementation plan

## Milestone 1 — source management and RSS discovery

Delivered in this change:

- `NewsSource`, `NewsSourceFetch` and `DiscoveredNews` Prisma models and migration.
- RBAC-protected source registry endpoints.
- Safe bounded RSS/Atom parser and HTTP(S) source validation.
- Deterministic discovery deduplication and fetch history.
- BullMQ discovery scheduler running every five minutes while honoring source polling intervals.
- Unit tests for RSS/Atom parsing and private-destination blocking.

Remaining acceptance: isolated MySQL migration run, local source registration, a permitted public feed fetch, worker restart recovery and browser review of the registry.

## Milestone 2 — clustering, trend scoring and verification

Add multilingual deterministic similarity first, then optional embeddings behind a provider gate. Store source diversity, recency, geography and engagement signals separately. Add topic clusters, trend-score versions, contradiction records and a verification queue. Never count syndicated URLs as independent confirmation.

## Milestone 3 — low-cost AI providers and Tamil quality

Add an Ollama adapter with health checks, timeout, circuit breaker, structured JSON validation, prompt versioning and usage tracking. Evaluate a Tamil-capable model locally before enabling it. Add a Gemini adapter only when an administrator explicitly configures it. Generated text remains a draft and receives language, originality, source-grounding and sensitivity checks.

## Milestone 4 — editorial dashboard and publication

Extend the existing authenticated workspace with source, trend, verification and AI-draft queues. Reuse article revisions, claims, independent approval, scheduling and audit records. Keep high-risk categories and conflicts human-gated.

## Milestone 5 — distribution

Implement official Telegram and Facebook adapters first, followed by Instagram Professional and any approved X/YouTube capabilities. Use encrypted credentials, consent, canonical URL checks, idempotency keys, retries and external post IDs. No browser automation or simulated success.

## Milestone 6 — SEO and operations

Complete archive and accessibility acceptance, image-rights pipeline, analytics, source health dashboards, dead-letter handling, restore rehearsal, load/security testing and production launch evidence. Google News or Discover inclusion must never be promised.

## Required gates for every milestone

Run typecheck, lint, unit tests, migration validation and relevant isolated integration tests. Review changed files for credentials, verify exact-commit release archives, update the delivery tracker and handoff, and preserve the last known-good release until the new acceptance evidence is complete.
