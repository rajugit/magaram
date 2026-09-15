# Delivery tracker

The user approved continuing through the full project on 2026-09-15 and requested a preview at each phase. This supersedes the earlier command-per-phase approval gate. The contact and initial administrator email is `magaram.in@gmail.com`.

## Acceptance policy

Each phase requires working persisted workflows, authorization checks, validation, tests appropriate to the risk, and a visible preview. Interfaces without configured providers must say unavailable, and demo content must be labelled. No phase is complete solely because its pages exist.

| Phase                   | State       | Preview / acceptance                                                |
| ----------------------- | ----------- | ------------------------------------------------------------------- |
| 0 Audit                 | Complete    | Audit documents                                                     |
| 1 Foundation            | Hardening   | Authentication, real settings/audit, MySQL/Redis, login preview     |
| 2 CMS                   | In progress | Draft → review → verified approval → publication; media and history |
| 3 AI                    | Pending     | Versioned prompts, provider integration, human approval, audit      |
| 4 Public website        | Pending     | Tamil-first article, discovery, local and trust pages               |
| 5 SEO                   | Pending     | Published-only feeds, metadata and canonical URLs                   |
| 6 Social                | Pending     | Official providers, consent, durable delivery and retries           |
| 7 Local                 | Pending     | Business verification, offers and consented leads                   |
| 8 Advertising           | Pending     | Owned campaigns, approvals, server-verified billing                 |
| 9 Revenue expansion     | Pending     | Moderated jobs, classifieds, property, education, deals             |
| 10 Audience             | Pending     | Membership, newsletter, subscription lifecycle                      |
| 11 Media business       | Pending     | Creators, services, events, intelligence, licensing                 |
| 12 Revenue intelligence | Pending     | Reconciled ledger and real metrics                                  |
| 13 AWS                  | Preview live | Single-server HTTPS preview; production hardening still pending    |
| 14 CI/CD                | Pending     | Repository remote, checks, release and rollback                     |
| 15 Production readiness | Pending     | Integrated testing and provider verification                        |

## Current constraints

The Git remote is `https://github.com/rajugit/magaram.git` (public), with local branch `main`. Local MySQL/Redis are running, both migrations were applied, and roles plus a local preview administrator were seeded. The API readiness check passes and the interactive preview at `http://localhost:3001/preview/2` returns HTTP 200. All 11 current API tests pass; full database-backed CMS workflow acceptance remains outstanding. Offline design previews remain available in `docs/previews/` with labelled sample data and inactive forms.

The low-cost AWS preview runs on a 4 GB Lightsail server in Mumbai at `https://65.2.18.204/preview/2`. Trusted TLS, API readiness, persisted administrator authentication, unauthorized-access rejection and logout passed deployment checks. A logical database backup was generated, daily backup/snapshot schedules are enabled, and certificate renewal passed a dry run. The $35/month budget has 80% and 100% warning thresholds; it is not a spending cap. Domain mapping is deferred. The unrelated existing AWS profile remains untouched. Actual email, AI, payment and social delivery cannot be claimed operational until configured and tested. This preview deployment does not complete the full product or production-readiness phase.
