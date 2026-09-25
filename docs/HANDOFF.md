# Current handoff

Updated 2026-09-25. The user requested completing all phases, project skills/documentation, and local plus live testing. Continue authorized implementation and verification without asking again for routine decisions. System-enforced permissions still apply.

## Current milestone

Phase 7 has been deployed to the existing AWS preview. Local and live acceptance checks passed. The next product milestone is Phase 8 advertising. Do not abandon release verification when a follow-up says “proceed”.

- Tested application commit: `ab04f6ea714396a0ef007aa33ee8ad02f6874e3e`, pushed to `origin/main`.
- Deployment reported healthy at `ab04f6ea714396a0ef007aa33ee8ad02f6874e3e`; the previous release is `d144b1199fbade0c681fda0f377f8db573d6c18c`. Backup completed before the three additive migrations.
- Application evidence: 45 API tests and 12 isolated integration tests; typecheck, lint, build and dependency audit pass. All six migrations pass on an isolated database.
- Local MySQL/Redis are running. Local migrations are current and roles seeded. `pnpm dev` starts web/API/worker; URLs are in `LOCAL_AND_LIVE_TESTING.md`.
- Release archive `.deploy/ab04f6ea714396a0ef007aa33ee8ad02f6874e3e.tar.gz` was generated from that exact commit. Upload and deployment completed; do not deploy this commit again just because a turn was interrupted.
- SSH restriction was refreshed after a changed operator address; it remains a single-IP rule. Verify current connectivity rather than guessing or widening access.
- Both project skills are validated and installed in the user’s Codex skills directory. Root guidance, test helper and acceptance documents are a subsequent change; they are not contained in the application release above.
- Local smoke: 29 checks pass, including authenticated sign-in/logout. The new live testing account has verified EDITOR and SALES_MANAGER access; its password exists only in the private ignored credentials file. Never copy it into this document or Git.
- The missing Nginx `/version` route was fixed in both TLS server blocks with backup, configuration validation and reload. Final authenticated live smoke passed and matched the exact deployed commit. See `TEST_REPORT_2026-09-25.md`.

## Next actions

1. Implement Phase 8 advertising according to `PHASE_ACCEPTANCE.md` and `ARCHITECTURE_NEXT_STEPS.md`. Keep payment processing unavailable until a real provider is configured and verified.
2. Add its persisted workflow, authorization/validation tests and visible preview, then update this handoff and the tracker.
3. Preserve the tested Phase 7 release and the owner's existing/testing accounts. Credentials and `.deploy` stay ignored; do not repeat account creation.

Remaining phases and provider integrations are not complete. Actual production sign-off, live payment/email/social delivery and broader editorial/accessibility/restore acceptance remain separate gates.
