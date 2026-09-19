# Delivery tracker

The user approved continuing through the full project on 2026-09-15 and requested a preview at each phase. This supersedes the earlier command-per-phase approval gate. The contact and initial administrator email is `magaram.in@gmail.com`.

## Acceptance policy

Each phase requires working persisted workflows, authorization checks, validation, tests appropriate to the risk, and a visible preview. Interfaces without configured providers must say unavailable, and demo content must be labelled. No phase is complete solely because its pages exist.

| Phase                   | State                 | Preview / acceptance                                                                    |
| ----------------------- | --------------------- | --------------------------------------------------------------------------------------- |
| 0 Audit                 | Complete              | Audit documents                                                                         |
| 1 Foundation            | Core verified locally | Identity/RBAC, audited password changes, real MySQL/Redis jobs; email inactive          |
| 2 CMS                   | In progress           | Draft → review → verified approval → publication; media and history                     |
| 3 AI                    | Core workflow tested  | Saved proposals, independent review, quotas and local duplicates; live provider pending |
| 4 Public website        | Core deployed         | Tamil-first public routes, published-only projection, trust pages and preview           |
| 5 SEO                   | Baseline built        | Canonicals, metadata, robots and static sitemap; feeds/news sitemap pending             |
| 6 Social                | Pending               | Official providers, consent, durable delivery and retries                               |
| 7 Local                 | Pending               | Business verification, offers and consented leads                                       |
| 8 Advertising           | Pending               | Owned campaigns, approvals, server-verified billing                                     |
| 9 Revenue expansion     | Pending               | Moderated jobs, classifieds, property, education, deals                                 |
| 10 Audience             | Pending               | Membership, newsletter, subscription lifecycle                                          |
| 11 Media business       | Pending               | Creators, services, events, intelligence, licensing                                     |
| 12 Revenue intelligence | Pending               | Reconciled ledger and real metrics                                                      |
| 13 AWS                  | Preview live          | Single-server HTTPS preview; production hardening still pending                         |
| 14 CI/CD                | Pending               | Repository remote, checks, release and rollback                                         |
| 15 Production readiness | Pending               | Integrated testing and provider verification                                            |

## Current constraints

### Tested release candidate — 2026-09-17

32 API/unit tests and 10 isolated MySQL/Redis integration tests pass. Lint, all type checks, API/web/worker builds and the production dependency audit pass. Integration tests create fresh randomly named schemas/queues, apply all three migrations and clean up only their own fixtures. Tests cover queue retries/deduplication, publication/review/version conflicts, taxonomy, authorship, media privacy, password changes, saved AI proposals, idempotency, independent review, quotas, timeouts and inactive-provider gating. Local sign-in, protected routes and logout also pass against the production web build.

Previews: /preview/1, /preview/2 and /preview/3. Phase 1 core is verified, not a production-readiness sign-off; email delivery remains unavailable. Phase 2 has a tested core workflow plus taxonomy, author assignment, media selection, evidence entry and revision views, but broader accessibility/media-security/editorial acceptance remains. Phase 3 has a persisted proposal/review workflow tested with a clearly isolated fixture, local duplicate checks and inactive live generation. Subsequent phases are not claimed complete. The release adds a real maintenance worker to the existing server; deployment acceptance must verify its jobs as well as API readiness.

The Git remote is `https://github.com/rajugit/magaram.git` (public), with local branch `main`. Local MySQL/Redis are running, all three migrations were applied, and roles plus a local preview administrator were seeded. Offline design previews are generated in `docs/previews/` with labelled sample data and inactive forms. Releases are deployed from an exact Git commit; the live API version and container image identify the installed release.

The low-cost AWS preview runs on a 4 GB Lightsail server in Mumbai at `https://magarammedia.in/preview/2`. Trusted TLS, API readiness, persisted administrator authentication, unauthorized-access rejection and logout passed deployment checks. A logical database backup was generated, daily backup/snapshot schedules are enabled, and certificate renewal passed a dry run. The external GoDaddy DNS zone maps the main domain to the attached static IP and redirects `www` to the main domain. The $35/month budget has 80% and 100% warning thresholds; it is not a spending cap. The unrelated existing AWS profile remains untouched. Actual email, AI, payment and social delivery cannot be claimed operational until configured and tested. This preview deployment does not complete the full product or production-readiness phase.
