# Phase 2 progress — not yet complete

## Implemented

- Responsive newsroom overview, article search/filter, draft editor, review queue, media form, settings and audit views.
- Prisma editorial schema and additive migration: articles, sources, claims, revisions, corrections, taxonomy and media. Both migrations have been applied to the dedicated local MySQL database.
- API draft creation and updates, optimistic version checks, independent review/approval, verified-source/claim gates, published-only reads, correction history and authenticated image uploads.
- All 11 current API tests pass (six foundation tests and five editorial rule tests). Earlier workspace lint, type checks and Next.js production build passed.
- Local MySQL and Redis are running; roles and a local preview administrator are seeded. API readiness confirms database/cache connectivity. The interactive preview at `http://localhost:3001/preview/2` returns HTTP 200.
- Self-contained offline previews of Phase 1 and Phase 2 are exported from the actual application build into `docs/previews/`.

## Remaining acceptance work

- Database-backed editorial persistence and full browser workflow integration tests remain outstanding; successful migrations and readiness checks do not establish complete workflow coverage.
- AWS deployment is blocked by missing dedicated `magaram` AWS authentication. No cloud deployment has occurred; domain mapping is explicitly deferred.
- The worker still needs real session cleanup and scheduled publication handling. Its earlier acknowledgement stub is not a completed queue workflow.
- CMS verification, scheduling, revision and correction APIs need complete editor controls and integration tests.
- Real taxonomy/author selection and multiple-source editing need to replace the limited initial editor inputs.
- Media persistence requires storage/cleanup integration and further image-processing validation before production.
- Password-reset delivery now returns an explicit unavailable response without a configured provider. No email has been sent.

## Preview files

- `docs/previews/phase-1.html`: sign-in design.
- `docs/previews/phase-2.html`: newsroom overview.
- `docs/previews/articles.html`: article list.
- `docs/previews/editor.html`: new article editor.
- `docs/previews/review-story.html`: sample article details.
- `docs/previews/review.html`: review queue.
- `docs/previews/media.html`: media upload form.
- `docs/previews/settings.html`: publication identity.

All previews use explicitly labelled sample content. They do not authenticate, save articles, publish content, upload media, send messages, or process payments. Future phases are still pending; this project must not be described as production complete.
