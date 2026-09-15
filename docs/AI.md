# AI Newsroom Assessment and Governance Plan

## Current assessment

No AI provider, prompt registry, background worker, editorial policy implementation, content record, cost tracking, or safety evaluation exists in the workspace.

## Proposed capability boundary

AI may assist editors with Tamil headline and draft suggestions, translation, summaries, SEO metadata, social copy, alt text, entity/location/claim extraction, duplicate detection, related-content suggestions, and newsletter drafts. It must not independently publish sensitive reporting or replace source verification.

## Required implementation controls

- Central prompt registry with versioned prompt IDs and approval ownership.
- Provider abstraction so models/providers are replaceable and their capabilities/costs are configured.
- Immutable generation records: prompt ID, provider, model, sanitized input/output references, user/editor, timestamps, duration, tokens, cost, and outcome.
- Data minimization: do not send secrets, payment data, unnecessary personal data, or unpublished sensitive source details to providers.
- Sensitive-content classifier/gate for politics, crime, death, medical, legal, finance, allegations, communal/religious matters, and emergencies.
- Human review required for all sensitive output and for every transition to publish.
- Citation/source and claim review UI; model output must never be treated as evidence.
- Test fixtures for Tamil language quality, hallucination resistance, named entities, numbers, and editorial policy adherence.

## Editorial policy baseline

All AI functions must enforce the supplied principle: do not invent facts, quotations, sources, statistics, names, dates, numbers, locations, or organizations; distinguish facts, allegations, claims, opinions, and unverified information; use original natural Tamil; flag insufficient information for verification.
