# Security Audit and Baseline Controls

## Current assessment

Phase 1 verifies application-level identity controls: bcrypt password hashing, server-side hashed sessions, CSRF checks, temporary lockout, single-use reset records, Helmet, narrow CORS, request validation, rate limits, RBAC, redacted audit metadata, and safe health responses. No cloud/network perimeter, deployed secrets manager, upload service, production database, or penetration-test result exists yet.

## Priority risks

| Priority | Control gap                        | Required baseline                                                                                         |
| -------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| P0       | No secret-management process       | Keep secrets out of source control; use environment-specific secret storage and rotation.                 |
| P0       | No identity or authorization model | Enforce RBAC, secure credential handling, session rotation, account lockout, and audit logs.              |
| P0       | No input or output handling        | Validate inputs, parameterize queries, encode output, set browser security headers.                       |
| P1       | No file-upload controls            | Restrict MIME/type/size, generate server-side names, scan/process asynchronously, isolate object storage. |
| P1       | No webhook security                | Verify signatures, timestamps, event identity, and idempotency before processing.                         |
| P1       | No operational controls            | Centralized redacted logs, alerts, backups, least privilege, environment separation.                      |
| P2       | No privacy model                   | Data map, consent, unsubscribe, retention/deletion rules, and minimal analytics collection.               |

## Required Phase 1 controls

- TLS-only traffic and secure, `HttpOnly`, `SameSite` cookies where sessions are cookie-based.
- Argon2id or bcrypt password hashing with correctly configured work factors; reset tokens stored hashed and expired.
- CSRF protection for cookie-authenticated state changes.
- Authorization checks in domain services, not UI-only logic.
- Request validation, safe error responses, response security headers, rate limiting, and CORS allow-lists.
- Signed configuration and secret handling; `.env.example` may document names but never values.
- Structured logs with secret redaction, audit trail for privileged/editorial/payments actions, and dependency scanning.

## Later-phase controls

AI prompts and output require human workflow guards for sensitive news. Social and WhatsApp require explicit consent and official API use. Payments require server-side provider verification. Advertising and public submissions require abuse detection and moderation. Penetration testing and recovery exercises are prerequisites for a public production launch.
