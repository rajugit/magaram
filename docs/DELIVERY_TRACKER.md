# Delivery tracker

The user approved continuing through the full project on 2026-09-15 and requested a preview at each phase. This supersedes the earlier command-per-phase approval gate. The contact and initial administrator email is `magaram.in@gmail.com`.

## Acceptance policy

Each phase requires working persisted workflows, authorization checks, validation, tests appropriate to the risk, and a visible preview. Interfaces without configured providers must say unavailable, and demo content must be labelled. No phase is complete solely because its pages exist.

| Phase                   | State                    | Preview / acceptance                                                                                                                                       |
| ----------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 Audit                 | Complete                 | Audit documents                                                                                                                                            |
| 1 Foundation            | Core verified locally    | Identity/RBAC, audited password changes, real MySQL/Redis jobs; email inactive                                                                             |
| 2 CMS                   | In progress              | Draft → review → verified approval → publication; media and history                                                                                        |
| 3 AI                    | Core workflow tested     | Saved proposals, independent review, quotas and local duplicates; live provider pending                                                                    |
| 4 Public website        | Core deployed            | Tamil-first public routes, published-only projection, trust pages and preview                                                                              |
| 5 SEO                   | In progress              | Canonicals, metadata, dynamic sitemap, RSS, news sitemap, filtered search, and category/location archives; accessibility and production acceptance pending |
| 6 Social                | Contract foundation      | Provider-neutral validation and fail-closed inactive adapters; official providers, consent ledger, durable delivery and retries remain pending             |
| 7 Local                 | Core deployed to preview | Audited verification, reviewed offers, Tamil directory and consented leads; `/preview/7`; local/live smoke passed; broader production acceptance pending   |
| 8 Advertising           | Core deployed live   | Owned campaigns, independent review, exclusive placements and unpaid quotes; payments/public ad delivery disabled                                                                                                        |
| 9 Revenue expansion     | Core deployed candidate  | Shared moderated listings for jobs, classifieds, property, education and deals; expiry, ownership, reports and public privacy controls                         |
| 10 Audience             | Pending                  | Membership, newsletter, subscription lifecycle                                                                                                             |
| 11 Media business       | Pending                  | Creators, services, events, intelligence, licensing                                                                                                        |
| 12 Revenue intelligence | Pending                  | Reconciled ledger and real metrics                                                                                                                         |
| 13 AWS                  | Preview live             | Single-server HTTPS preview; production hardening still pending                                                                                            |
| 14 CI/CD                | In progress              | CI checks, dependency audit, builds, isolated integration job, and archive/feed smoke checks added; release/rollback acceptance pending                    |
| 15 Production readiness | Pending                  | Integrated testing and provider verification                                                                                                               |

## Current constraints

The production cutover checklist is maintained in `docs/PRODUCTION_READINESS.md`. The preview remains the highest permitted environment until every required gate passes and the owner gives explicit approval.

### Tested release candidate — 2026-09-17

38 API/unit tests and 11 isolated MySQL/Redis integration tests pass. Lint, all type checks, API/web/worker builds and the production dependency audit pass. Integration tests create fresh randomly named schemas/queues, apply all five migrations and clean up only their own fixtures. Tests cover queue retries/deduplication, publication/review/version conflicts, taxonomy, authorship, media privacy and rights, password changes, saved AI proposals, idempotency, independent review, quotas, timeouts and inactive-provider gating. Local sign-in, protected routes and logout also pass against the production web build.

Previews: /preview/1, /preview/2 and /preview/3. Phase 1 core is verified, not a production-readiness sign-off; email delivery remains unavailable. Phase 2 has a tested core workflow plus taxonomy, author assignment, media selection, evidence entry and revision views, but broader accessibility/media-security/editorial acceptance remains. Phase 3 has a persisted proposal/review workflow tested with a clearly isolated fixture, local duplicate checks and inactive live generation. Subsequent phases are not claimed complete. The release adds a real maintenance worker to the existing server; deployment acceptance must verify its jobs as well as API readiness.

The Git remote is `https://github.com/rajugit/magaram.git` (public), with local branch `main`. Local MySQL/Redis are running, all five migrations were applied, and roles plus a local preview administrator were seeded. Offline design previews are generated in `docs/previews/` with labelled sample data and inactive forms. Releases are deployed from an exact Git commit; the live API version and container image identify the installed release.

The low-cost AWS preview runs on a 4 GB Lightsail server in Mumbai at `https://magarammedia.in/preview/2`. Trusted TLS, API readiness, persisted administrator authentication, unauthorized-access rejection and logout passed deployment checks. A logical database backup was generated, daily backup/snapshot schedules are enabled, and certificate renewal passed a dry run. The external GoDaddy DNS zone maps the main domain to the attached static IP and redirects `www` to the main domain. The $35/month budget has 80% and 100% warning thresholds; it is not a spending cap. The unrelated existing AWS profile remains untouched. Actual email, AI, payment and social delivery cannot be claimed operational until configured and tested. This preview deployment does not complete the full product or production-readiness phase.

### Phase 7 local milestone — 2026-09-24

See `PHASE_7_PROGRESS.md` for delivered behavior, tests and remaining acceptance. Public directory: `/local`; staff workspace: `/admin/businesses`; labelled previews: `/preview/7` and `/preview/7/workspace`. The architecture and remaining phase sequence are recorded in `ARCHITECTURE_NEXT_STEPS.md`. Deployed to the AWS preview on 2026-09-25 at `ab04f6ea714396a0ef007aa33ee8ad02f6874e3e`; backup, migrations and release health checks passed. Local smoke: 29 checks passed. Live testing-account login, secure cookies, permissions and logout passed. The public version proxy was corrected and authenticated live smoke passed with the exact commit. See `TEST_REPORT_2026-09-25.md`.

### Phase 8 release — 2026-09-25

Commit `a79b5ebe66af309d059c355ada8841f29922af11` is installed on the existing server at `magarammedia.in`. Backup, seventh migration, role seed, service startup, exact-version check and authenticated live smoke passed. `/preview/8` was inspected in the browser; `/admin/campaigns` is the authenticated workspace. Typecheck, lint, production build, 45 unit tests and 15 isolated integration tests passed locally. Public ads remain empty; checkout and delivery remain disabled. Full production-readiness sign-off and payment-provider acceptance are still pending. See `PHASE_8_WALKTHROUGH.md`.
