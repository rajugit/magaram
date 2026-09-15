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

## Initial endpoint priorities after approval

Phase 1 should expose only health/readiness/version, authentication/session, current-user, roles/permissions, system configuration, and audit-log endpoints. Editorial, AI, social, commerce, and billing endpoints belong to their approved later phases.
