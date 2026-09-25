# Database Assessment and Target Model

## Current assessment

The workspace now contains Prisma MySQL migrations for identity, editorial, AI newsroom, media-rights metadata, and social-consent records. The schema covers users, roles, permissions, sessions, password-reset records, audit logs, non-secret system settings, articles, verification records, revisions, corrections, taxonomy, media fingerprints/rights state, AI runs, daily AI usage, and hashed social consent records. Local and preview deployment scripts apply migrations; backup restoration, replication, retention policy, and production migration rehearsal remain outstanding.

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

| Domain        | Core entities                                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Identity      | users, roles, permissions, sessions, password_resets, audit_logs                                                                  |
| Editorial     | articles, article_revisions, authors, categories, tags, locations, sources, claims, fact_checks, corrections                      |
| Media         | media_assets with SHA-256 fingerprints, rights status/source/reviewer metadata; media variants and upload sessions remain pending |
| AI            | ai_prompts, ai_generations, ai_usage_records                                                                                      |
| Distribution  | social_accounts, social_publications, delivery_attempts, hashed social consent records                                            |
| Local / leads | businesses, business_plans, offers, business_leads                                                                                |
| Advertising   | advertisers, placements, campaigns, creatives, ad_events                                                                          |
| Marketplace   | employers, job_posts, applications, listings, properties, institutions, deals, creator_profiles, events                           |
| Audience      | subscribers, newsletter_campaigns, memberships, subscriptions, preferences                                                        |
| Revenue       | products, prices, invoices, payments, refunds, revenue_transactions                                                               |
| Analytics     | analytics_events, daily aggregates, report snapshots                                                                              |

## Editorial integrity requirements

Articles require explicit authorship, editor review, publication/update times, status transitions, revision records, sources, claims, verification state, correction history, and an immutable record of AI-assisted output. Sensitive categories must not transition to publication without human approval.

## Remaining database work

The identity, editorial, AI, media-rights, and social-consent migrations are implemented. Before production, rehearse forward migration and rollback compatibility on a disposable restore, document retention and restore objectives, and add domain tables only when their corresponding phases are approved. Do not create unimplemented commerce or marketplace domains speculatively.
