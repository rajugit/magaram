# Current handoff

Updated 2026-10-21. The user requested completing all phases, project skills/documentation, and local plus live testing. Continue authorized implementation and verification without asking again for routine decisions. System-enforced permissions still apply.

## Current milestone

Latest installed release: `537360e3de2bd3044cc3edc3e37b4c0d0378a9c4` (2026-10-21), with automatic SEO defaults, registered-tag matching and Tamil news-card images. Exact-version authenticated smoke passed. This supersedes the release version in the historical paragraph below. Existing drafts are not automatically backfilled.

Current live release is `c1f3802aaa9be12a268c96e1af3defc8151ba0cd`, deployed on 2026-10-20 at the owner’s explicit request to commit and deploy production. It contains the same application code as discovery release `7e3a600956b277c22708774e7b4707eba766971c` plus release records. Authenticated smoke and independent public `/version` both passed. On 2026-10-17, authenticated release smoke and real worker ingestion passed: the permitted PIB Chennai Tamil feed produced 20 persisted unverified discoveries and 20 topics, with a 30-minute polling interval. Admin-only publication remains enforced. No article or social post was published.

Next: provide the newsroom topic/evidence review workflow, then source-bound Tamil draft generation with measured costs and quality. Facebook Page eligibility, social OAuth, actual distribution and Tamil narration remain pending. Existing Bedrock configuration is present, but real generation quality/budget acceptance is not complete. Do not redeploy solely because a documentation commit is newer than the application release. Full production sign-off remains separate.

## Historical release notes

Phase 8 campaign review and quotes are deployed and verified on the existing live server. The user explicitly requested committing and deploying to the existing live server on 2026-09-25. This is not full product production-readiness sign-off. Do not abandon release verification when a follow-up says “proceed”.

- Historical Phase 7 tested application commit: `ab04f6ea714396a0ef007aa33ee8ad02f6874e3e`, pushed to `origin/main`.
- Historical Phase 7 deployment reported healthy at `ab04f6ea714396a0ef007aa33ee8ad02f6874e3e`; the previous release is `d144b1199fbade0c681fda0f377f8db573d6c18c`. Backup completed before the three additive migrations.
- Application evidence: 45 API tests and 12 isolated integration tests; typecheck, lint, build and dependency audit pass. All six migrations pass on an isolated database.
- Local MySQL/Redis are running. Local migrations are current and roles seeded. `pnpm dev` starts web/API/worker; URLs are in `LOCAL_AND_LIVE_TESTING.md`.
- Release archive `.deploy/ab04f6ea714396a0ef007aa33ee8ad02f6874e3e.tar.gz` was generated from that exact commit. Upload and deployment completed; do not deploy this commit again just because a turn was interrupted.
- SSH restriction was refreshed after a changed operator address; it remains a single-IP rule. Verify current connectivity rather than guessing or widening access.
- Both project skills are validated and installed in the user’s Codex skills directory. Root guidance, test helper and acceptance documents are a subsequent change; they are not contained in the application release above.
- Local smoke: 29 checks pass, including authenticated sign-in/logout. The new live testing account has verified EDITOR and SALES_MANAGER access; its password exists only in the private ignored credentials file. Never copy it into this document or Git.
- The missing Nginx `/version` route was fixed in both TLS server blocks with backup, configuration validation and reload. Final authenticated live smoke passed and matched the exact deployed commit. See `TEST_REPORT_2026-09-25.md`.

## Historical next actions (superseded by current milestone)

1. Phase 8 release verification is complete. Installed commit: `a79b5ebe66af309d059c355ada8841f29922af11`. Backup, additive migration, permission seed, API/web/worker startup and authenticated `deploy/smoke.mjs` passed. Public `/version` matched exactly. Browser inspection verified `/preview/8`, sample labels, disabled demo forms and the payment/delivery notice. Previous application release: `ab04f6ea714396a0ef007aa33ee8ad02f6874e3e`. Do not redeploy merely because a turn resumed.
2. Phase 9 core is deployed live at exact commit `df608e44f61de42ce9c7bde5b40bb16fff330d33`. The labelled preview `/preview/9` was browser-verified after release. It provides shared moderated listings for jobs, classifieds, property, education and deals, with ownership, independent review, expiry, reports and public privacy controls. API namespace is `/api/v1/market`.
3. Local evidence: typecheck, lint, production build, 45 unit tests and 15 isolated integration tests passed; all seven migrations applied. Campaign ownership, independent review, concurrent inventory conflicts, immutable quotes, cancellation and unavailable/idempotent checkout are covered. Payment processing and public ad delivery remain disabled.
4. Preserve the prior tested Phase 7 release and the owner's existing/testing accounts. Credentials and `.deploy` stay ignored; do not repeat account creation.

## Phase 9 local evidence — 2026-09-26

The additive marketplace migration `202609260001_marketplace` was applied in the release. Typecheck, lint, Prisma validation and production build completed. The live preview was browser-verified after deployment. Marketplace records do not expose contact email/phone in the public projection; review and report actions remain authenticated. Google Workspace SMTP support is implemented and deployed, but the live sender must not be switched to `admin@magarammedia.in` until the Workspace SMTP relay is IP-restricted and delivery is tested.

Remaining phases and provider integrations are not complete. Actual production sign-off, live payment/email/social delivery and broader editorial/accessibility/restore acceptance remain separate gates.

## SMTP decision — 2026-10-07

The requested reset-delivery provider is Google Workspace mailbox SMTP for `admin@magarammedia.in`. The documented host is `smtp.gmail.com:465` with implicit TLS and a server-only Google app password. Port `587` with STARTTLS remains supported; the IP-allowlisted relay alternative is `smtp-relay.gmail.com:587`. No mailbox password or app password is stored in the repository. Production activation and live delivery verification remain pending until the server can be reached and the owner supplies the credential through a secure server-side entry.

## AI newsroom Milestone 1 — 2026-10-11

The repository audit and architecture/implementation plan are recorded in `docs/AI_NEWS_AUDIT.md`, `docs/AI_NEWS_ARCHITECTURE.md` and `docs/AI_NEWS_IMPLEMENTATION_PLAN.md`. Source management and bounded RSS/Atom discovery are implemented in commit `63c295aef677ee435a34f7e0e463f14e3501ebc6`: Prisma models and migration, permission-gated registry endpoints, deterministic deduplication, fetch history, SSRF-aware URL checks and a five-minute BullMQ scheduler. Typecheck, lint, build and the complete API suite pass locally with listener permission; the focused discovery tests pass 2/2. The additive migration was applied live, roles were seeded, all three services restarted, and the exact-version authenticated smoke passed. Next operational step: register one permitted public feed, execute a worker fetch, verify the persisted discovery record, then begin Milestone 2 clustering and verification.

## Account-connection review — 2026-09-25

The user requested a secure browser/account review after deployment. See `ACCOUNT_CONNECTIONS.md`. YouTube website link was saved; Instagram now shows `www.magarammedia.in` in its Website field. AWS root MFA, firewall, snapshot status and root-only secret-file permissions were checked without secret values. SES sender verification reports `SUCCESS`, but the account remains in sandbox. Google Workspace confirms `magarammedia.in` verified and Gmail activated for `admin@magarammedia.in`; routing settings still require an administrator session. The live provider remains on the existing tested configuration until the Workspace relay is authorized and delivery tests pass. No API publishing credentials were obtained or integrations enabled.

The owner requested a separate application login for `admin@magarammedia.in`. It was created on the live server with the `SUPER_ADMIN` role, audited against `magaram.in@gmail.com`, and its generated password is stored only in root-owned `/etc/magaram/admin-workspace.credentials` (mode 0600). Retrieve it only through the owner-only command in `docs/DEPLOYMENT.md`; never copy it into chat or Git.

## AI newsroom Milestone 2 — 2026-10-13

Commit `f7a8f2c61381b3d832c43d559d645d5ceb7118b7` is installed live. The additive topic-cluster migration applied successfully, API/web/worker restarted healthy, and `/version` matches the exact commit. Deterministic Tamil/English tokenization, headline similarity, recency/source/geography trend scoring, topic listing, and permission-gated verification are implemented. The complete API suite passed 51/51, API/worker/web builds passed, and live public plus unauthenticated authorization smoke passed. No AI provider, Google Trends provider, auto-publication or social publisher was enabled. Next work is permitted-feed operational acceptance, then claim-level verification and editor-facing topic workflow.

## Tamil newsroom launch and admin-only publication — 2026-10-17

The owner confirmed all Tamil Nadu, at least one reviewed story daily, Facebook and YouTube, both Shorts and longer videos with AI Tamil narration, INR 1,000 monthly AI budget separate from hosting, and admin-only approval with immediate or scheduled publication. See `TAMIL_NEWS_LAUNCH.md`. Facebook Page/profile eligibility and provider OAuth remain unverified.

Public `/version` was checked directly and reports `767982fe07dde5c7e7da37e99ebaced4b2af79f7`, matching the starting local HEAD. This supersedes the older installed-version entry above; only the public version endpoint was checked today, not authenticated release acceptance.

Local implementation now restricts approval, immediate publication, scheduling and published corrections to ADMIN/SUPER_ADMIN. Independent approval and source/claim checks remain required. Immediate publication and the worker reject legacy approvals from editors; invalid schedules return to review. The ADMIN seed now grants newsroom preparation/review permissions. The workspace hides publication controls from editors and converts explicitly labelled IST input to UTC independent of browser timezone.

Evidence: 52 unit tests, 16 isolated MySQL/Redis integration tests, typecheck, lint and production build passed. All 11 migrations applied to the disposable test schema and it was removed. Mocked-response browser acceptance passed for admin controls, editor hiding and 09:00 IST converting to 03:30 UTC in a Los Angeles browser timezone. This is not authenticated end-to-end browser evidence. Initial fixture/type errors were corrected before the passing runs. No schema migration is needed for this change; role seed is required on release.

Changes remain local and are not deployed. No feed, paid AI/TTS provider or social publisher was enabled. The required `aws-secrets-manager` skill could not be found in the available local skill/plugin directories, so the credential-backed deployment helper was not used. Root AGENTS.md requires that skill first for credential tasks. Existing credentials were not displayed or copied. The unrelated untracked `output/` directory is preserved.

Next: restore the required secrets-management skill, commit/push and release the tested admin gate to the existing AWS preview with role seeding and exact-version authenticated smoke. Complete permitted-feed registration/fetch/worker operational acceptance, then implement source-bound Tamil generation and metering. Facebook Page confirmation and owner OAuth remain prerequisites for real distribution. Production cutover is still separate.

### Release continuation — 2026-10-17

The official AWS `aws-secrets-manager` skill is now installed from `aws/agent-toolkit-for-aws` and loaded. The missing-skill blocker above is resolved. The existing deployment workflow keeps credentials within runtime processes and root-only server files; no Secrets Manager values were retrieved. The already tested admin-gate change is being prepared for exact-commit release; retain the prior installed version until release verification completes.

## Admin-only publication release verified — 2026-10-17

Installed application commit: `b6ba84bbf4f18fd1a306ca01caf334dbb5d08e08`, pushed to `origin/main` and deployed from its exact archive. Previous release: `767982fe07dde5c7e7da37e99ebaced4b2af79f7`. Backup completed, the server build passed, all 11 migrations were already current, role seeding completed and API/web/worker restarted healthy. Authenticated `deploy/smoke.mjs` passed with exact `/version` matching, secure cookies, login/logout, authorization, public news/archive/feed routes and configured provider-state assertions. The initial smoke invocation lacked the documented root container user and failed without reading credentials; rerunning as root passed. A separate read-only Prisma check confirmed ADMIN review permission. No new provider was enabled; the existing Bedrock configuration satisfied the smoke's enabled-provider check, but this is not a real Tamil generation or quality evaluation.

The missing AWS skill is resolved: installed official `aws/agent-toolkit-for-aws` `aws-secrets-manager` into the user's Codex skills directory and read it. The existing AWS CLI profile and runtime secret handling were used without printing secret values. SSH was refreshed to the current operator's single IPv4 /32, with other rules preserved. No paid plugin, subscription or additional AWS resource was created. Owner additionally requested free agents/plugins/skills where possible; recorded in `TAMIL_NEWS_LAUNCH.md`.

Discovery database acceptance found zero registered/enabled sources, discoveries or clusters. PIB's official Chennai Tamil RSS listing and copyright policy were checked: `https://www.pib.gov.in/ViewRss.aspx?lang=11&reg=6` and `https://www.pib.gov.in/ContentPage.aspx?lang=1&menuid=794&reg=23`. The candidate `https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=11&Regid=6` returned a 169-byte HTML Object moved response, not RSS; the existing parser produced zero entries. It was NOT registered or enabled. Source operational acceptance remains incomplete. Do not treat a 200 response or an empty parser result as feed success. Also review the discovery implementation's source-write auditing and feed validation before widening the registry beyond vetted feeds.

Next: finish real permitted-feed acceptance, then the source-to-Tamil-draft workflow, free-provider evaluation and budget metering. Admin-only publication is now deployed; do not repeat this release because subsequent documentation commits are ahead of the installed application. Social identity/OAuth and actual Facebook/YouTube delivery remain pending; production cutover is not signed off.

## Discovery hardening candidate — 2026-10-17

The PIB Chennai Tamil feed works with the explicit region parameter: `https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=11&Regid=6&reg=6`. The hardened local HTTP client retrieved 20 entries, all with Tamil titles. The previously tested URL without the explicit region remains unsuitable. The feed is government press-release evidence, not independent reporting; the Chennai language edition does not establish event geography. Planned registry geography is INDIA, with Tamil Nadu relevance left to review.

Local changes: validated XML parsing rejects HTML, malformed XML, DTDs/entities and unsafe story links; a valid empty feed is distinguished from an invalid response. Streaming payload limits, public DNS validation/pinning, IPv4/IPv6 address checks, bounded redirects and per-request deadlines replace the old unbounded fetch. Source create/update and fetch start/outcome auditing are transactional. Fetch-history API is permission-gated; error codes are sanitized. Manual fetch and worker ingestion share the same protections. Tests verify permission/CSRF rejection, persisted failed fetches, deduplication, audit records and no article creation.

Dependency audit found existing Next.js/sharp/source-map-js advisories. Updated Next.js to 16.3.8 and pinned sharp 0.35.5/source-map-js 1.2.2; production audit now reports no known vulnerabilities. Free MIT XML/IP validation libraries were added. Typecheck, lint and production build passed on the patched dependency set; 57 full-suite unit tests plus 3 additional focused transport tests and 17 isolated integration tests passed. All 11 migrations applied and the disposable schema was removed. No new migration is needed. The explicit opt-in `deploy/accept-news-source.mjs` will register the permitted feed through authenticated APIs, run a real BullMQ poll and check persisted unverified Tamil discoveries; it disables a newly enabled source if acceptance fails. Live release/ingestion evidence is pending below.

## First permitted Tamil feed operational — 2026-10-17

Application revision `7e3a600956b277c22708774e7b4707eba766971c` was pushed and deployed from its exact archive. Backup, server production build, current migration check (11 migrations), permission seeding and API/web/worker startup succeeded. Authenticated smoke passed exact-version, readiness, public routes, protected API rejection, secure cookies, login/logout and configured provider-state checks. Previous application release `b6ba84bbf4f18fd1a306ca01caf334dbb5d08e08` remains available.

The explicit feed acceptance script registered and enabled `https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=11&Regid=6&reg=6` through authenticated APIs and processed a real BullMQ poll. Result: 20 fetched entries, 20 persisted Tamil discoveries and 20 topics, all unverified, polling every 1,800 seconds. Registry geography is INDIA; editors must establish Tamil Nadu relevance. Source attribution and third-party exclusions are recorded in license notes. This is government press-release evidence, not independent reporting.

After restarting the worker, acceptance passed again with the same persisted counts. The repeat verifies restart/job processing and persistence, not a forced second network fetch inside the polling interval. Repeated-ingestion deduplication is covered by isolated integration tests. No article or social post was published; no paid resource, subscription, new provider enrollment or AI/TTS generation was invoked.

These final records were recovered on 2026-10-20 after the earlier documentation command was not executed because automatic approval review reached its usage limit. The public application version was freshly verified; authenticated/feed evidence above is from 2026-10-17, not a fresh October 20 ingestion check. Remaining work: editor-facing topic/evidence queue, claim-level review, source-bound Tamil drafts and budget/quality acceptance, narration, Facebook Page confirmation and owner OAuth for Facebook/YouTube.

## Owner-requested live deployment — 2026-10-20

The owner explicitly requested “commit and deploy production”. Commit `c1f3802aaa9be12a268c96e1af3defc8151ba0cd` was already pushed; its exact archive was deployed to the existing AWS host serving https://magarammedia.in. Backup completed, API/web/worker production builds passed, all 11 migrations were current, roles were seeded and all application services restarted. The first extraction attempt lacked root directory permissions and made no release changes; extraction with sudo succeeded. The release reported healthy and authenticated smoke passed readiness, public routes, permission rejection, secure session login/logout, protected APIs and provider state. A separate public version request matched exactly. Previous image/release `7e3a600956b277c22708774e7b4707eba766971c` is retained.

Only documentation changed since the previously tested application; no redundant local application suite was run. Untracked `output/` remains untouched. No provider was enabled or article/social content published. Deployment to the live domain does not establish acceptance of unfinished narration/social integrations or outstanding restore/load/editorial checks. Subsequent evidence-only documentation commits do not require another rollout.

### Live smoke verification — 2026-10-21

Requested live smoke passed on installed revision `c1f3802aaa9be12a268c96e1af3defc8151ba0cd`. Public homepage returned HTTP 200 and independent `/version` matched. All 33 requests in `deploy/smoke.mjs` passed expected statuses, including readiness, public news/archive/feed/sitemap routes, unauthenticated API rejection, CSRF, secure/HttpOnly session cookies, authenticated protected APIs, configured provider-state assertions and logout. SSH was refreshed to the current operator’s single IPv4 /32 with HTTP/HTTPS rules preserved. No deployment, content publication or real AI/email/social delivery was performed; provider status checks do not establish delivery acceptance.

### Story metadata and image correction — 2026-10-21 (local, not deployed)

The manually created live farmers-story draft omitted SEO fields, tags and a photo. Code inspection also found public stories ignoring their selected image in favour of placeholder artwork. Local changes now fill blank SEO title/description from existing title/summary on create/update, preserving Tamil graphemes and editorial overrides. Empty tags match complete words against registered taxonomy only; no matching registered tags means no tags are invented. Existing saved records are not backfilled automatically, and locked review records still require return to draft before edits.

Public story, lead and list cards now render selected media or a free locally generated 1200x630 Tamil PNG news card, labelled as not an event photograph. A licensed bundled Noto Tamil font avoids external runtime font calls. The image route uses only the published article API and returns 404 for inaccessible/draft stories. Open Graph, Twitter and NewsArticle metadata include the image; keywords use story tags. Newsroom copy explains automatic defaults. No photorealistic image provider or paid service was added.

Validation: typecheck, lint, full production build, 63 unit tests and 17 guarded disposable integration tests passed; integration asserts persisted SEO defaults. Initial sandbox listener failures were resolved by rerunning with local listener permission. Generated PNG visually inspected with a synthetic Tamil story; public metadata assertions and private-story image 404 passed. Final web lint/build passed after updating homepage/list cards. Synthetic desktop (1280px) and mobile (390px) browser acceptance confirmed the image loads without horizontal overflow. Live installed revision remains `c1f3802aaa9be12a268c96e1af3defc8151ba0cd`; these changes require commit/release before appearing live. The farmers draft remains in EDITOR_REVIEW with unverified evidence and is not published. Preserve unrelated `output/` and earlier smoke-test documentation.

### Metadata and Tamil image release verified — 2026-10-21

Exact pushed revision `537360e3de2bd3044cc3edc3e37b4c0d0378a9c4` is now installed at https://magarammedia.in after the owner's production deployment request. Backup, AWS production build, current 11-migration check, role seed and API/web/worker startup passed. All 33 authenticated smoke requests passed; independent public version matched. Bundled Tamil font is readable in the running web container. The unpublished farmers-story image returns 404, preserving draft privacy. Previous release `c1f3802aaa9be12a268c96e1af3defc8151ba0cd` retained. No story was published or existing draft backfilled. PNG rendering and desktop/mobile evidence above used isolated local fixtures; live privacy and smoke checks are distinct. Subsequent evidence-only documentation does not need redeployment.
