# Architecture Baseline and Target

## Current state

Phase 1 implements the modular baseline: `apps/web` contains the Next.js App Router shell, `apps/api` contains the Express API and Prisma boundary, and `apps/worker` contains the BullMQ worker process. MySQL and Redis remain external runtime dependencies and are not provisioned in this repository. The broader target below remains a proposal for later approved phases.

## Recommended initial architecture

Begin with a modular TypeScript application rather than independent microservices:

```text
Browser
  │
  ├── Next.js web application (public site, admin, advertiser portal)
  │       │
  │       └── authenticated API boundary
  │
  └── Node.js API / domain services
          ├── MySQL 8 (transactional data)
          ├── Redis (cache, rate limits, queues)
          ├── BullMQ worker (async jobs)
          ├── S3-compatible object storage (media)
          └── Provider adapters (AI, social, email, payments, analytics)
```

Use Next.js App Router, TypeScript, Tailwind CSS, MySQL 8, Prisma, Redis, and BullMQ **only after explicit Phase 1 approval and compatibility validation**. A single deployable API and one worker process offer a simpler operational start while retaining clean module boundaries for future extraction.

## Proposed module boundaries

| Module       | Responsibility                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------- |
| identity     | Accounts, roles, sessions, audit logs, 2FA readiness.                                           |
| editorial    | Articles, authors, taxonomy, sources, claims, revisions, corrections, publication workflow.     |
| media        | Secure uploads, asset metadata, transformations, storage URLs.                                  |
| ai           | Prompt registry, generation requests, policy checks, provider abstraction, usage/audit records. |
| distribution | Social, WhatsApp, Telegram, email, scheduling, delivery logs.                                   |
| local        | Businesses, plans, offers, verification, lead capture.                                          |
| advertising  | Inventory, creatives, campaigns, approvals, delivery events, advertiser portal.                 |
| marketplace  | Jobs, classifieds, property, education, deals, creators, events.                                |
| audience     | Newsletter, membership, subscriptions, consent and preferences.                                 |
| revenue      | Products, prices, invoices, payments, transactions, revenue intelligence.                       |
| analytics    | Privacy-conscious event ingestion, aggregation, reporting.                                      |
| platform     | Config, validation, observability, health, feature flags, integrations.                         |

## Target production topology

```text
Route 53 → CloudFront → WAF → ALB → Nginx
                                     ├── Next.js application
                                     ├── Node API
                                     └── Worker
                                           ├── RDS MySQL
                                           ├── ElastiCache Redis
                                           ├── S3 media origin
                                           ├── external providers
                                           └── CloudWatch / error monitoring
```

Start with separate application, worker, database, cache, and storage concerns. Docker/ECS, multiple workers, and service decomposition should follow observed load or team ownership needs, not precede them.

## Architectural decisions required before Phase 1

1. Hosting account, regions, domains, and environment separation.
2. Authentication strategy (managed provider versus secure in-house credentials/session implementation).
3. Prisma versus an existing ORM, if an existing codebase is later supplied.
4. Payment, email, analytics, AI, and social providers.
5. Editorial governance owners and sensitive-content escalation process.
