# Phase 4 — Public website

Status: core public experience verified locally on 2026-09-19. Deployment and broader launch acceptance remain pending.

## Implemented

- Tamil-first, responsive public home page, news index, individual article route and trust page.
- The server-rendered public experience reads only the existing anonymous `/api/v1/news` projection. It therefore excludes drafts, scheduled stories, demo records, reviewer identities, source evidence, claims, revisions and other newsroom-only information.
- The public home is intentionally empty until an independently approved, non-demo article is published. It never substitutes a sample story on the live route.
- `/preview/4` is a separate labelled design preview using sample articles. Its home, article, news and trust links stay within the preview route.
- Accessible landmarks, skip link, descriptive navigation, focus treatment, responsive layouts, date markup and readable color contrast are included.
- Public article pages render plain text paragraphs rather than editorial HTML, show sponsorship disclosure, and show public correction notes when present.
- Baseline discovery metadata is included: canonical metadata, Open Graph article metadata, sanitized JSON-LD, `robots.txt`, and a static public-route sitemap. Protected/admin, previews and reset routes are excluded from crawling.

## Evidence

`pnpm --filter @magaram/web typecheck`, lint, production build and targeted Prettier checks pass. The built `/preview/4`, a sample preview article and the preview trust page were checked in a fresh browser session.

## Remaining before phase acceptance

- Deploy and smoke-test the public routes against the live published-news API.
- Conduct mobile, keyboard, screen-reader and editorial acceptance testing with real independently approved stories.
- Add published-article sitemap entries, a news sitemap, RSS and image delivery only after their live data and editorial requirements are ready.
- Add related-content relevance, archive/category/location pages, public author profiles and a reviewed corrections submission process.
