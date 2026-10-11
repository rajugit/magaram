# AI newsroom architecture

The AI newsroom extends the current modular monolith rather than replacing it:

```text
Next.js public site and newsroom UI
              |
       Express API / RBAC / CSRF
              |
   Prisma + MySQL       Redis + BullMQ worker
   articles, sources,   discovery, verification,
   claims, revisions    generation and delivery jobs
              |
       provider adapters (RSS, Ollama, Gemini, social APIs)
```

## Domain boundaries

- **Editorial:** articles, sources, claims, revisions, corrections and publication states.
- **Discovery:** authorized source registry, fetch history, discovered items and later topic clusters.
- **Verification:** source provenance, claims, contradictions and escalation decisions.
- **AI:** provider abstraction, prompt versions, structured output, quotas, usage and review records.
- **Distribution:** approved article social jobs, provider credentials, consent and idempotent delivery logs.
- **Media:** owned or licensed assets, rights, variants, attribution and alt text.
- **Platform:** configuration, audit, health, rate limits, retention and deployment controls.

## Data flow

1. An administrator registers an authorized feed with geography, category, language, trust and license metadata.
2. The worker polls enabled sources according to each source's interval, records a fetch attempt and parses bounded RSS/Atom entries.
3. A deterministic hash of source, canonical URL and normalized title prevents duplicate discovery records.
4. Discovered items remain evidence records. Later verification workers attach independent sources and claims; only approved editorial services can create articles.
5. AI receives only an explicit, source-bound packet after authorization and consent. Provider failure, malformed output, uncertainty or high-risk content routes to human review.
6. Website publication remains the existing article state machine. Social jobs are created only after the canonical article is live and publishing is authorized.

## Reliability and security

The worker uses BullMQ retries and exponential backoff. Each fetch has a bounded timeout, payload limit, redirect limit and source-level history. Database uniqueness protects discovery idempotency. Credentials remain server-only environment values, never source content or API responses. Ollama must remain private to the server network; external providers are opt-in and never selected automatically when paid.

The current single-server deployment remains supported. Scaling can split discovery and generation workers later without changing the API contract or database provenance model.
