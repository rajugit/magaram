# Database Assessment and Target Model

## Current assessment

Phase 1 adds a Prisma MySQL schema, an initial unapplied migration, and idempotent role/permission seed scripts. The schema covers users, roles, permissions, sessions, password-reset records, audit logs, and non-secret system settings. No MySQL instance, credentials, applied migration history, backup, replication, or retention setting has been supplied, so those operational properties remain unassessed.

## Recommended conventions

- Use MySQL 8 with UTF-8 (`utf8mb4`) for Tamil and multilingual content.
- Use migrations exclusively; never change production schema manually.
- Prefer stable primary keys, explicit foreign keys, `created_at` and `updated_at`, and actor fields for governance records.
- Apply soft deletion only to entities that require restoration/audit; enforce unique constraints with active-record considerations.
- Index foreign keys and documented access patterns. Review query plans before adding broad indexes.
- Store money in integer minor units plus ISO currency; never use floating point.
- Store timestamps in UTC and render in the audience’s locale.
- Encrypt or minimize sensitive personal data; record consent and retention requirements.

## Domain inventory

| Domain        | Core entities                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| Identity      | users, roles, permissions, sessions, password_resets, audit_logs                                             |
| Editorial     | articles, article_revisions, authors, categories, tags, locations, sources, claims, fact_checks, corrections |
| Media         | media_assets, media_variants, upload_sessions                                                                |
| AI            | ai_prompts, ai_generations, ai_usage_records                                                                 |
| Distribution  | social_accounts, social_publications, delivery_attempts, consent_records                                     |
| Local / leads | businesses, business_plans, offers, business_leads                                                           |
| Advertising   | advertisers, placements, campaigns, creatives, ad_events                                                     |
| Marketplace   | employers, job_posts, applications, listings, properties, institutions, deals, creator_profiles, events      |
| Audience      | subscribers, newsletter_campaigns, memberships, subscriptions, preferences                                   |
| Revenue       | products, prices, invoices, payments, refunds, revenue_transactions                                          |
| Analytics     | analytics_events, daily aggregates, report snapshots                                                         |

## Editorial integrity requirements

Articles require explicit authorship, editor review, publication/update times, status transitions, revision records, sources, claims, verification state, correction history, and an immutable record of AI-assisted output. Sensitive categories must not transition to publication without human approval.

## Before implementation

Choose a migration tool and document local, test, staging, and production migration/rollback practice. Once schema work is approved, design the Phase 1 identity/configuration schema before the Phase 2 editorial schema; do not create all domains upfront.
