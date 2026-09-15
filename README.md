# Magaram Media

Magaram Media is a Tamil-first digital journalism, local commerce, and revenue platform.

## Workspace

- `apps/web` — Next.js web shell for public, administrative, and advertiser experiences.
- `apps/api` — Express API for identity, authorization, configuration, audit records, and future domains.
- `apps/worker` — BullMQ worker process for asynchronous, non-user-facing jobs.

## Local setup

1. Copy `.env.example` to `.env` and replace the placeholder session secret.
2. Run `pnpm install`.
3. Ensure local MySQL and Redis are available before starting the API or worker.
4. Validate the schema with `pnpm db:validate`.
5. Run `pnpm dev`.

The API is intentionally limited to Phase 1 foundation endpoints. Editorial, AI, public publishing, social, payment, and marketplace features require later phase approval.
