# Production Readiness Gate

This is the final cutover checklist for Magaram Media. A production request must not be made until every required gate below is marked **Pass** and the owner gives explicit approval.

| Gate                   | Current state                                                        | Required evidence                                                                                  | Status    |
| ---------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------- |
| Phase 0 audit          | Repository and architecture documented                               | Current audit and feature matrix                                                                   | Pass      |
| Phase 1 foundation     | Identity, RBAC, MySQL/Redis jobs and configuration tested            | 38 API/unit tests, 11 integration tests, schema validation                                         | Core pass |
| Phase 2 CMS            | Editorial workflow, media rights and revision comparison implemented | Full browser/editorial, accessibility, scanning and policy acceptance                              | Pending   |
| Phase 3 AI             | Persisted proposal/review safeguards implemented                     | Live provider verification, cost controls and Tamil quality evaluation                             | Pending   |
| Phase 4 public website | Preview deployed and published-only projection verified              | Full browser, mobile and accessibility acceptance                                                  | Pending   |
| Phase 5 SEO            | Metadata, feeds, sitemaps, search and archives implemented           | Production search and accessibility acceptance                                                     | Pending   |
| Phase 6 social         | Consent ledger and provider contract foundation implemented          | Official adapters, credentials, queue/retry, webhook and delivery tests                            | Pending   |
| Phases 7–12            | Phase 7 core locally tested; Phases 8–12 pending                     | Approved scope, persisted workflows, authorization, tests and provider verification for each phase | Pending   |
| Phase 13 AWS           | HTTPS Lightsail preview live                                         | Hardening, monitoring, restore rehearsal and operational runbook                                   | Pending   |
| Phase 14 CI/CD         | CI quality and integration jobs configured                           | Release, rollback and migration compatibility rehearsal                                            | Pending   |
| Phase 15 operations    | No production sign-off yet                                           | Security, load, recovery, browser acceptance and incident readiness                                | Pending   |

## Mandatory pre-cutover checks

- All applicable phase rows are **Pass**, with linked evidence.
- Official provider credentials are configured through the approved secret path; no credentials are stored in Git, images or chat.
- Backup restoration and deployment rollback have been rehearsed on disposable infrastructure.
- Security, dependency, accessibility, browser and load checks pass for the exact release commit.
- Database migrations are reviewed for forward compatibility; no destructive rollback is attempted.
- Monitoring, alerting, incident ownership, retention, RTO and RPO are documented.
- `deploy/smoke.mjs` passes against the release candidate.
- The owner explicitly approves production cutover after reviewing the evidence.

Until those checks pass, the preview remains the highest permitted environment.
