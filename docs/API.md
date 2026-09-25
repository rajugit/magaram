# API Assessment and Standards Proposal

## Current assessment

The Express `/api/v1` API includes standardized envelopes, request IDs, validation, security middleware, rate limits, opaque sessions, RBAC guards, audit records, identity, editorial, media-rights, AI, public-news, health, readiness, settings, and audit-log endpoints. A provider-neutral social publishing contract is implemented in the API package, but distribution endpoints, official provider adapters, consent storage, and durable delivery remain pending.

## Phase 1 API baseline

Use the `/api/v1` namespace and publish a versioned OpenAPI specification alongside the implementation. Responses should use the approved envelope:

```json
{
  "success": true,
  "data": {},
  "message": "Success",
  "requestId": "..."
}
```

Errors should not leak implementation details:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  },
  "requestId": "..."
}
```

## Required cross-cutting controls

- Schema validation at the boundary; reject unknown or malformed input where practical.
- Authentication and role/permission checks at every protected resource.
- Request ID propagation and structured error logging.
- Cursor or bounded offset pagination, explicit filtering and sorting allow-lists.
- Rate limits by actor/IP/route with documented exceptions for provider webhooks.
- Idempotency keys for payment, campaign, delivery, and other mutation endpoints that may retry.
- Signed, timestamped webhook verification and replay protection.
- Contract, authorization, validation, and error-shape tests for every public endpoint.

## Added in the 2026-09-17 release candidate

- `POST /api/v1/auth/password-change`: authenticated current-password check; atomically revokes all sessions/reset tokens and records audit.
- `POST /api/v1/articles/:id/author`: reviewer-only, current draft version only; resets verification and records revision/audit.
- `POST /api/v1/taxonomy`: reviewer-only audited registration; draft saves require registered category/location/tag names.
- Public `/news` projections exclude internal evidence and identities; unpublished media is owner/reviewer restricted.
- Media uploads record a SHA-256 fingerprint and remain `PENDING` for rights review until a reviewer clears them; published stories cannot use uncleared media.
- `GET /api/v1/ai/status`: honest provider state. `POST /api/v1/ai/prepare`: authorized, version-bound local source packet and audit fingerprint. `POST /api/v1/ai/generate`: explicit 503 until provider implementation/configuration exists.

Additional AI routes: GET /api/v1/ai/runs?articleId=… lists authorized proposal history; POST /api/v1/ai/runs/:id/review accepts/rejects with independent review and version guards; GET /api/v1/ai/duplicates?articleId=… performs an authorized local lexical comparison. POST /api/v1/ai/generate is deliberately unavailable until a provider is selected and integrated. All mutation endpoints retain CSRF/origin/permission checks. Deployment acceptance is separate from local test results.

## Initial endpoint priorities after approval

Phase 1 should expose only health/readiness/version, authentication/session, current-user, roles/permissions, system configuration, and audit-log endpoints. Editorial, AI, social, commerce, and billing endpoints belong to their approved later phases.

## Local directory and enquiries

All paths use `/api/v1`. Public `GET /local/businesses` accepts `q`, `location`, `category`, and `page`; returns `{ items, total, page, limit: 24 }`. Only verified businesses and currently valid active offers are projected. Private owner IDs, verification evidence and leads are excluded.

Public `POST /local/leads` requires CSRF, `{ businessId, offerId?, name, email, phone?, message, consent: true }` and is limited to ten attempts/minute/IP/process. It returns `{ id, status }`; no automatic email is sent. Business and optional offer eligibility and versioned consent auditing are transactional.

The following require `local:manage` or the administrator wildcard. All writes require CSRF:

| Method | Path                            | Behavior                                                                                              |
| ------ | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| GET    | `/local/manage`                 | Latest 200 business profiles including draft offers                                                   |
| POST   | `/local/businesses`             | Create a pending profile                                                                              |
| PUT    | `/local/businesses/:id`         | Replace profile details, return to pending verification, pause active offers                          |
| POST   | `/local/businesses/:id/verify`  | Verify with `{ evidence }`, 10–2000 characters                                                        |
| POST   | `/local/businesses/:id/suspend` | Suspend with `{ reason }`, 10–2000 characters; pause active offers                                    |
| POST   | `/local/businesses/:id/offers`  | Save draft: title, description, terms (at least 10 characters), ISO startsAt/endsAt                   |
| POST   | `/local/offers/:id/status`      | `{ status: ACTIVE or PAUSED }`; activation requires a verified business, terms and an unexpired offer |
| GET    | `/local/leads`                  | Latest 200 private enquiries with business names                                                      |
| POST   | `/local/leads/:id/status`       | `{ status: CONTACTED, QUALIFIED, CLOSED or SPAM }`                                                    |

Business bodies contain name, slug, description, category, location, optional phone and HTTP(S) website. Public lead payloads cannot set verification/status/owner fields. Validation failures return 422, missing records 404, invalid transitions and concurrent transaction conflicts 409. Business, offer and lead mutations are audited.
