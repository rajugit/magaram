# Implementation plan

Updated 2026-09-24. The user authorized continuing through successive phases with previews; another command-per-phase approval is not required. Provider selection, secret configuration, new spending and other material scope changes still require the appropriate user decision. The current milestone completes the local-business workflow and its acceptance evidence. The production domain is mapped; SES sender verification remains pending.

The repository is implemented and deployed as an AWS preview; it is not empty. Both foundation and editorial migrations have been applied. DELIVERY_TRACKER.md is the canonical status record.

## Current sequence

1. Phase 1 core foundation: locally verified; release status recorded separately. Live email remains inactive.
2. Phase 2 CMS: core database workflow verified; multi-source editor, fact-check evidence, scheduling, corrections, revision history, taxonomy enforcement, author assignment and media selection/access hardening added. Finish media-security/rights hardening and broader UI acceptance before calling the whole phase complete.
3. Phase 3 AI: source-bound prompt preparation, persisted proposal history, safe validation, independent acceptance/rejection, idempotency, daily request limits, timeouts and local lexical duplicate detection implemented and tested. Live provider integration, monetary cost reporting and real-model Tamil output evaluation remain pending. Generation is explicitly inactive.
4. Phase 4 public website: core deployed — published-only routes, responsive Tamil-first layouts, article reading and trust information. Broader accessibility/editorial acceptance remains pending.
5. Phase 5 SEO: canonical metadata, robots, dynamic published-article sitemap, RSS, Google News sitemap, filtered discovery and safe article JSON-LD are implemented; dedicated archive pages, accessibility and production search acceptance remain pending.
6. Phase 7 core is implemented and locally tested; see `PHASE_7_PROGRESS.md`. The remaining architecture and delivery sequence are in `ARCHITECTURE_NEXT_STEPS.md`. Phases 6 and 8–12: official social integrations; advertising; moderated marketplaces; audience subscriptions; media services; reconciled revenue reporting. Payment/social/email providers must be chosen and tested, not simulated as live.
7. Phase 13: continue hardening the low-cost AWS preview, backups and restoration. Lightsail, TLS and domain mapping are live; restore rehearsal and production hardening remain outstanding.
8. Phase 14: automated quality gates, reviewed releases and rollback testing.
9. Phase 15: integrated security, accessibility, load, recovery and operational launch acceptance.

Each phase requires real persisted workflows, authorization/validation tests and an honest preview. Sample pages and inactive providers are never evidence of complete production functionality.
