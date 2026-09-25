---
name: magaram-delivery
description: Implement, verify and release milestones in the Magaram Media repository, including requests to continue a phase or test local and AWS preview systems. Use only for this project.
---

# Magaram delivery

Locate the Magaram repository from the working directory; confirm its root package is `magaram-media`. This skill is also maintained at `skills/magaram-delivery/SKILL.md` in that repository. Read root `AGENTS.md`, `docs/DELIVERY_TRACKER.md` and `docs/HANDOFF.md` before continuing an interrupted milestone. Read `docs/PHASE_ACCEPTANCE.md` for the phase being implemented, not every phase's supporting documents.

## Decide what to do next

Honor the user's latest direction while preserving unfinished authorized work. “Proceed” means continue the first unfinished acceptance step in `docs/HANDOFF.md`; do not create another placeholder phase or restart completed work. Make routine implementation decisions within the existing architecture. Keep provider-dependent capabilities explicitly unavailable until their real provider succeeds. A passing preview is not a production launch.

Use the existing Next.js/Express/Prisma/MySQL/Redis modular monolith, shared auth/CSRF/error envelope and transactional audit patterns. Read `apps/web/AGENTS.md` and relevant installed Next.js guides before UI changes. Preserve existing edits. Add only the migrations, permissions, API, UI and worker behavior needed for a complete usable workflow.

## Evidence and release

- Use `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` and the relevant isolated database tests. `pnpm test:integration` creates a new guarded local schema; never aim it at the live database.
- Use `scripts/system-smoke.mjs` for public route and local sign-in checks; see `docs/LOCAL_AND_LIVE_TESTING.md`. It must never print credentials or personal record contents. Browser-test desktop/mobile behavior where relevant.
- Review migrations for old-version compatibility and scan candidate files for accidental credentials. Commit and push a specific revision before archiving for AWS. Deploy only that archive; do not sync a dirty working tree.
- `deploy/remote.mjs` uses profile `magaram`, region `ap-south-1`, instance `magaram-preview` and AWS-pinned host keys. Keep SSH restricted to the current operator's single IP. Check the current address again after a resumed session; never open SSH to the world to bypass a timeout.
- Existing preview deployment is authorized when the user asks to release or continue the release. This skill does not grant additional credentials, spending, provider enrollment or production-cutover authorization.
- A failed check does not establish a healthy release. Inspect the concrete failure, preserve backups and the last good image, and make a focused fix. Stop retrying unchanged external failures; record the blocker and continue independent work.

Update the canonical tracker and handoff with actual test evidence, installed commit, URLs and precise remaining work. Do not mark a provider, phase or production gate complete because its page renders. Refer to `docs/ARCHITECTURE_NEXT_STEPS.md` for the remaining domain sequence.
