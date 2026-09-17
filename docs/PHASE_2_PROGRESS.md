# Phase 2 — Editorial CMS

Status: in progress; core workflow verified against isolated MySQL on 2026-09-16.

## Implemented

- Persisted articles with optimistic version checks, sources, claims, author relationships, media, revisions and correction records.
- Independent verification and approval, enforced on the server even for super administrators.
- Draft → editor review → fact checking → approval → publication or scheduling.
- Fact-check submissions reject duplicate/foreign record IDs and now create a revision for every version increment.
- Scheduled worker publishes up to 100 due stories each minute. It rechecks verified evidence and an active approving editor with review permission, then atomically records publication, revision and audit. Invalid approvals return the story to review. Concurrent changes/retries do not duplicate publication.
- Public responses exclude internal source/claim evidence, reviewer identities, revisions and unpublished/demo stories. Unpublished media requires ownership or review/fact-check access.
- UI supports multiple sources/claims, tags, independent evidence entry, local-time scheduling, correction notes and revision history. Existing media/SEO values survive draft edits. Editing a story outside the first list page loads it directly.
- Registered taxonomy is enforced on draft saves; editors can add classifications with an audit record. Initial Tamil categories/locations are seeded additively, without renaming existing classifications.
- Editors may reassign only the current draft to an active newsroom author. Reassignment clears verification and creates a revision/audit entry. Reporters cannot reassign authors or browse other reporters’ unpublished media.
- The editor includes a permitted-media selector and SEO fields. Revision snapshots can be expanded to inspect previous title/body/status.

## Evidence

Unit tests cover transitions, publication checks and public projection. The isolated integration suite exercises source-ID rejection, author self-verification rejection, stale versions, scheduling, repeat publication, public privacy, revision counts and AI preparation audit. Preview: /preview/2 (sample data, no real saves).

## Remaining before full phase acceptance

Complete media decoding/security and rights workflows, side-by-side revision comparison, broader permission-specific end-to-end UI tests, accessibility/mobile acceptance and editorial policy review. Sample forms are not evidence of live persistence. The core workflow is tested, but the whole CMS phase is not yet complete. Existing free-text classifications outside the seeded taxonomy must be registered by an editor before those drafts can be saved.
