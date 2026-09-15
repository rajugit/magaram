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
| 13 AWS                  | Pending     | Requires AWS account, domain and deployment authority               |
| 14 CI/CD                | Pending     | Repository remote, checks, release and rollback                     |
| 15 Production readiness | Pending     | Integrated testing and provider verification                        |

## Current constraints

The Git remote is `https://github.com/rajugit/magaram.git` (public), with local branch `main`. Production credentials have not been configured for this project. Local database and preview-server startup requests were declined. Offline design previews are available in `docs/previews/`; these contain labelled sample data and inactive forms. Actual email, AI, payment, social delivery and AWS deployment cannot be claimed operational until configured and tested.
