# Magaram Media project guidance

This repository is a Tamil local-news platform with public news, a protected newsroom, local-business workflows and planned revenue products. Preserve the existing Next.js/Express/Prisma/MySQL/Redis architecture.

## Continuing work

Read `docs/HANDOFF.md` for the current task and exact release state, then `docs/DELIVERY_TRACKER.md`. These records distinguish local implementation, deployed preview and production acceptance. Do not reset existing work or mark all phases complete from previews. For “proceed”, finish the current acceptance/release step before starting the next product phase unless the user redirects it.

Project skills are maintained in `skills/magaram-delivery/SKILL.md` and `skills/magaram-editorial-qa/SKILL.md`. Use the delivery skill for milestones and testing; use the editorial skill for news/public-copy and editorial workflow changes. Keep skill instructions project-specific and preserve existing user authorization; no fresh command-per-phase approval is required.

## Implementation invariants

- Public news is published-only, source-checked and independently approved; demo content stays labelled and separate. AI never publishes autonomously.
- Every staff API operation enforces permissions. Writes use CSRF, validated inputs and the shared response envelope. State changes and audit records belong in the same database transaction.
- Business verification is not an editorial endorsement. Paid material must be labelled. Enquiry consent is not marketing consent.
- Provider absence means unavailable, not mocked success. Revenue and payment status require server-verified records.
- Keep secrets out of Git, logs, tool output and previews. Read existing deployment documentation before changing remote services. Avoid new paid resources unless they are part of the user's authorized scope.
- Follow `apps/web/AGENTS.md` and installed Next.js documentation for UI work.

## Checks and evidence

Use `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` and relevant integration tests. `pnpm test:integration` owns a disposable local schema and cleans it; production must never be its target. See `docs/LOCAL_AND_LIVE_TESTING.md` for service smoke tests and browser acceptance. Match test scope to the change; do not repeat passing checks without a new reason.

Record completed work, test results, installed revision, remaining provider blockers and next action in `docs/HANDOFF.md`. Keep `docs/DELIVERY_TRACKER.md` as the canonical phase status. Deploy exact pushed commits to the existing AWS preview; production sign-off remains a separate evidence-based decision.
