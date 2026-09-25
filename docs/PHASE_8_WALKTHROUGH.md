# Phase 8: learn the advertising workflow

This milestone supports campaign preparation, independent review, placement reservations and unpaid pro forma quotes. It does not charge money or serve public ads. Phase 8 remains incomplete until a real payment provider, verified callbacks and paid-delivery gates are implemented and tested.

## Follow a campaign step by step

1. Open `/preview/8`. This is labelled sample data with inactive forms. Learn the page here before changing real records.
2. Sign in and open `/admin/campaigns`. A sales manager configures a placement and its daily rate. Newly seeded placements are disabled and unpriced; only enter a real approved price on the live server.
3. Save an advertiser profile, then create a campaign with copy, an HTTPS destination, rights evidence and future start/end times. The server stores the owner; a browser cannot choose a different owner.
4. Submit the draft. A different authorized reviewer checks the content and rights. The owner, submitter and last editor cannot approve it themselves.
5. Approve or reject with a reason. Approval reserves the placement for the requested interval and creates a fixed unpaid quote. Conflicting campaigns cannot both be approved. Rejection allows correction and resubmission.
6. Inspect the quote. Amounts use integer paise; billable days round up each started 24-hour period. The stored price and billing details survive later profile/rate changes. This document is a pro forma quote, not a tax invoice.
7. Payment remains unavailable. Approval does not mean payment or publication. Cancellation voids the unpaid quote and releases the reservation.

The existing testing account has sales-manager and editor roles. It still cannot approve its own work; use a different authorized reviewer. Do not share passwords to bypass that separation.

## Understand where each responsibility lives

| Responsibility | Source |
| --- | --- |
| Forms and user feedback | `apps/web/app/_components/advertising-workbench.tsx` |
| Authorization, validation and workflow transitions | `apps/api/src/advertising.ts` |
| Persistent records and relations | `apps/api/prisma/schema.prisma` |
| Additive database upgrade | `apps/api/prisma/migrations/202609250001_advertising/migration.sql` |
| Ownership, review, overlap and checkout checks | `apps/api/tests/advertising.integration.ts` |

A transaction saves the campaign decision, quote and audit entry together. A version number rejects edits made from an outdated screen. A serializable transaction prevents two simultaneous approvals from reserving the same placement.

## Practice safely on your computer

From the repository, run `pnpm infra:up`, `pnpm db:deploy`, `pnpm --filter @magaram/api db:seed`, then `pnpm dev`. Open `http://localhost:3000/preview/8`. Existing local sign-in setup is documented in `LOCAL_AND_LIVE_TESTING.md`.

Run `pnpm test:integration` to exercise separate advertiser/reviewer accounts automatically in a disposable local database. The runner creates and removes its own schema; never point integration tests at the live database. Read each advertising test and predict the expected status before running it: foreign ownership 404, self-review 403, stale version or overlap 409, unavailable checkout 503.

## Learn the release process

1. Check types, lint, unit tests, integration tests and the production build.
2. Commit and push the tested code. The full Git SHA identifies the release.
3. Archive that exact commit and upload it to its own release directory.
4. Back up the database, build the image, apply additive migrations and seed permissions.
5. Restart web, API and worker; check readiness and public/protected routes.
6. Compare `/version` with the intended SHA and run authenticated live smoke tests. Retain the previous image and database backup.

Local evidence for this milestone: 45 unit tests and 15 integration tests passed; typecheck, lint and production build passed. Live deployment evidence is recorded separately in the handoff after release verification.
