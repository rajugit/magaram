# API Assessment and Standards Proposal

## Current assessment

Phase 1 implements an Express `/api/v1` API with a standardized response envelope, request IDs, validation, security middleware, rate limits, opaque sessions, RBAC guards, audit-record interface, and identity/health endpoints. OpenAPI publication and later domain endpoints remain pending.

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
- `GET /api/v1/ai/status`: honest provider state. `POST /api/v1/ai/prepare`: authorized, version-bound local source packet and audit fingerprint. `POST /api/v1/ai/generate`: explicit 503 until provider implementation/configuration exists.

Additional AI routes: GET /api/v1/ai/runs?articleId=… lists authorized proposal history; POST /api/v1/ai/runs/:id/review accepts/rejects with independent review and version guards; GET /api/v1/ai/duplicates?articleId=… performs an authorized local lexical comparison. POST /api/v1/ai/generate is deliberately unavailable until a provider is selected and integrated. All mutation endpoints retain CSRF/origin/permission checks. Deployment acceptance is separate from local test results.

## Initial endpoint priorities after approval

Phase 1 should expose only health/readiness/version, authentication/session, current-user, roles/permissions, system configuration, and audit-log endpoints. Editorial, AI, social, commerce, and billing endpoints belong to their approved later phases.
