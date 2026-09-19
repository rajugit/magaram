# SEO Assessment and Plan

## Current assessment

The Phase 4 core adds a Tamil-first public home, news index, published-article route and trust page. The live public routes read only the anonymous published-news projection; sample stories are confined to `/preview/4`. Canonical metadata, `robots.txt`, a static sitemap, Open Graph article metadata and sanitized JSON-LD are implemented. Public article routes are request-rendered so they can reflect editorial publication state without exposing newsroom records.

RSS, news sitemaps, published-article sitemap entries, related-content relevance, author/category/location discovery routes, media/image delivery, analytics and production search acceptance remain pending.

## Phase 4–5 implementation plan

- Make Tamil the primary content language and include accurate `lang` attributes, readable typography, semantic landmarks, and mobile-first layouts.
- Generate per-page title, description, canonical URL, Open Graph, X card, author, image, publication, and modified-date metadata from verified content.
- Add validated JSON-LD for `Organization`, `WebSite`, `BreadcrumbList`, and `NewsArticle`/`Article` only where appropriate.
- Generate `robots.txt`, `sitemap.xml`, `news-sitemap.xml`, and `rss.xml` from published, indexable content.
- Use stable clean slugs; preserve redirects on future slug changes; prevent duplicate route variants and query canonicalization issues.
- Implement pagination, internal links, related-content relevance, author/category/location pages, responsive images, and alt text.
- Exclude drafts, review states, private dashboards, user data, thin pages, and duplicates from indexing.
- Measure Core Web Vitals and search performance without collecting unnecessary personal data.

## Editorial safeguard

SEO must improve discovery of independently edited, useful Tamil reporting. It must not create scaled thin pages, fabricate entities, or publish AI-generated content without editorial workflow and source verification.
