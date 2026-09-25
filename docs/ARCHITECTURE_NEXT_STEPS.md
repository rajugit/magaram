# Magaram Media — delivery architecture

Updated 2026-09-24. Preserve the existing Next.js public/staff interfaces, Express domain APIs, Prisma/MySQL persistence and Redis worker. Prefer a modular monolith with explicit permissions and transactional audit records; the current scale does not justify independent microservices.

## Product boundaries

| Domain                | Authoritative data and controls                                                                 | Public promise                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Newsroom              | Articles, revisions, named sources, fact checks, independent approval and correction history    | Only approved published journalism; Tamil-first presentation                           |
| AI assistance         | Saved proposals, quotas, source-bound validation and human acceptance                           | Assistance never publishes itself; live generation unavailable until verified          |
| Discovery             | Published-only API, category/location archives, metadata, feeds and sitemaps                    | No draft leakage; useful regional navigation                                           |
| Local commerce        | Verified businesses, reviewed time-bound offers, purpose-specific consented enquiries           | Listings are not editorial endorsements; no automatic delivery claim                   |
| Distribution          | Consent ledger, official provider adapters and durable delivery jobs                            | No unofficial account automation or success before provider acknowledgement            |
| Advertising           | Campaign ownership, reviewed creative, labelled inventory, invoices and verified payment events | No paid editorial disguise or browser-asserted payment success                         |
| Audience/marketplaces | Moderation, consent/preferences, subscription state and entitlements                            | Clear availability, eligibility and renewal terms                                      |
| Finance               | Append-only ledger entries reconciled to provider events, refunds and invoices                  | Revenue metrics from stored accounting evidence, never estimates presented as earnings |

## Next implementation sequence

1. Finish Phase 7 release acceptance: signed-in browser workflow and deploy the exact tested commit to the existing preview. Keep production cutover separate from preview deployment.
2. Phase 8: build a provider-independent advertiser/campaign workflow: draft → submitted → approved/rejected → scheduled/active → ended. Enforce ownership and reviewer permissions, placement availability, creative rights, sponsorship labels, date windows and audited transitions. Persist invoices and payment attempts. Keep checkout unavailable until a provider is configured; activate paid delivery only after a signed server-side payment event is verified and deduplicated.
3. Phase 6 completion can proceed when official provider access is available. Add a durable outbox, per-channel delivery keys, bounded retries, cancellation, webhook verification and a visible failed-delivery queue. Consent revocation must stop future deliveries.
4. Phase 9: extend moderation/ownership primitives for jobs, classifieds, property and education; avoid separate bespoke systems for each listing type. Phase 10 adds audience consent, unsubscribe/bounce handling and entitlement lifecycle before premium access.
5. Phases 11–12: implement media-service orders and rights contracts, then reconcile money movements before exposing revenue dashboards. Do not pre-populate earnings or invent conversions.
6. Continue operational work alongside product work: CI checks, dependency review, restore/rollback rehearsal, accessibility, Tamil editorial acceptance and load testing. See `PRODUCTION_READINESS.md` for cutover gates.

## Tamil Nadu editorial defaults

Use Tamil display names for towns/districts and categories with stable identifiers for routes. Treat official location taxonomy changes as reviewed data changes. Show readers India time. Keep source evidence private where appropriate, corrections visible, sponsored content labelled and business sales separate from editorial approval. Publish only material that has passed the established review workflow; sample content belongs only in labelled previews.

## Delivery evidence

Every milestone must include a persisted workflow, API validation and authorization checks, meaningful database tests, a usable preview and a current delivery record. Provider integration and production deployment are separate acceptance claims. Current feature status is in `DELIVERY_TRACKER.md`; this plan does not label unimplemented phases complete.
