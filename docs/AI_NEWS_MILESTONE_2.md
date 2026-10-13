# AI newsroom Milestone 2

## Delivered

- Added `NewsTopicCluster` with geography, category, source-linked discoveries, trend score, verification state and publication state.
- Added deterministic headline tokenization for English and Tamil Unicode, shared-token similarity and seven-day clustering windows.
- Added normalized trend scoring using recency, independent source coverage and geographic relevance. Search-trend and engagement signals are optional; missing signals are redistributed across available signals.
- Added a worker scheduler for clustering and kept discovery jobs idempotent through existing discovery deduplication.
- Added permission-gated topic listing and verification transitions. `VERIFIED` is an editorial state and does not publish an article.
- Added tests for bilingual tokenization, similarity and unavailable-signal score redistribution.

## Safety boundaries

Clustering does not treat syndicated copies as independent sources. A cluster with two or more distinct configured source IDs is marked `PENDING_VERIFICATION`; it is never auto-verified or auto-published. Cross-language matches require shared normalized tokens, numbers or names, so uncertain stories remain separate for editorial review.

## Remaining work

Google Trends integration, multilingual embeddings, claim-level verification, editor-facing topic dashboard actions and article generation remain later milestones. No paid AI provider or external trend provider is enabled by this change.
