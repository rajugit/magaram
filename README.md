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

The foundation and initial editorial API/UI are implemented; the full product is still in progress. See `docs/DELIVERY_TRACKER.md` for remaining acceptance work and `docs/DEPLOYMENT.md` for the low-cost AWS preview setup. A deployed preview does not mean later product phases are complete.
