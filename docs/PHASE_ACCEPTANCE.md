# Phase acceptance contracts

`DELIVERY_TRACKER.md` records status. These contracts define what evidence remains necessary; creating an interface alone does not satisfy a phase.

| Phase                   | Deliverable                                                                | Acceptance evidence                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 Audit                 | Current architecture and dependency map                                    | Matches repository and running release                                                                                                         |
| 1 Foundation            | Identity, roles, reset/change password, worker readiness                   | Auth/CSRF/RBAC tests, session revocation, real email when enabled                                                                              |
| 2 CMS                   | Persisted drafting, review, sources, facts, scheduling, corrections, media | Independent approval, revision conflicts, public privacy, rights/security and editor browser acceptance                                        |
| 3 AI                    | Saved source-bound proposals with quotas and review                        | Inactive-provider tests plus actual provider, cost and Tamil-output evaluation before enabling                                                 |
| 4 Public site           | Tamil public news and trust pages                                          | Published-only data, desktop/mobile, keyboard and article-reader checks                                                                        |
| 5 SEO                   | Canonicals, structured data, archives, feeds and sitemaps                  | Valid output from published records, pagination and escaping, crawl/index configuration                                                        |
| 6 Distribution          | Official adapters, durable outbox and consent-aware delivery               | Verified credentials, signed callbacks, idempotency, retries, cancellation and revocation                                                      |
| 7 Local                 | Verified directory, offers and consented enquiries                         | Staff/public workflow, ownership/permissions, date gates, consent audit, suspension and local/live checks                                      |
| 8 Advertising           | Advertisers, reviewed campaigns, placements and invoices                   | Ownership, independent review, rights/disclosure, inventory/date checks, verified payment deduplication; checkout unavailable until configured |
| 9 Marketplaces          | Moderated jobs, classifieds, property, education and deals                 | Shared listing ownership/moderation, expiry, reporting and privacy checks for each enabled type                                                |
| 10 Audience             | Consent/preferences, subscription and entitlement lifecycle                | Unsubscribe/bounce handling, renewal/cancel/refund behavior, verified payment events                                                           |
| 11 Media services       | Creator/service/event orders and rights/licensing                          | Reviewed terms, order lifecycle, access checks and provider-backed fulfillment where required                                                  |
| 12 Revenue intelligence | Reconciled financial ledger and metrics                                    | Auditable invoices/payments/refunds, reconciliation and repeatable metric calculations                                                         |
| 13 AWS                  | Operable preview/production infrastructure                                 | TLS, least privilege, monitoring, backup restoration and resource/cost controls                                                                |
| 14 CI/CD                | Reproducible quality gates and exact-commit release                        | CI success, migrations, version match, deployment smoke and rollback rehearsal                                                                 |
| 15 Launch               | Integrated operational acceptance                                          | Security, accessibility, load, restore, incident ownership and explicit cutover decision                                                       |

## Execution order

Finish the current release evidence first. Then implement Phase 8's provider-independent campaign/review/invoice workflow. Advance independent work on marketplaces and consent while external provider setup is pending. Keep provider-dependent acceptance open; do not substitute fake payment, email or delivery success.

Each new domain should reuse the shared validation, RBAC, audit, transaction and worker infrastructure. Add only the domain-specific persistence and UI needed to run and inspect a real workflow. Maintain a preview and tests alongside the implementation rather than accumulating untested phase stubs.
