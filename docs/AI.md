# Phase 3 — AI newsroom

Status: persisted proposal workflow verified with an isolated test provider; no live AI provider is connected.

## Available now

- Versioned Tamil-first prompt catalog: draft, summary, translation, SEO, social and claim extraction.
- POST /api/v1/ai/prepare builds a local source packet from an authorized saved article at a specified version. It audits actor, task, prompt version, article version and SHA-256 input fingerprint. Raw reporting is not copied into the audit log or sent externally.
- GET /api/v1/ai/status reports generationEnabled=false. POST /api/v1/ai/generate returns explicit 503 AI_PROVIDER_UNAVAILABLE; it never returns invented demonstration results.
- Source material is serialized separately from system instructions. Prompts require attribution, uncertainty, sponsorship disclosure and independent human approval; prompt text cannot guarantee factual correctness.
- Proposal schema rejects extra publication commands, invented source IDs and claims marked VERIFIED. Structural validation is not fact checking.
- Preview /preview/3 shows the safeguards with sample reporting; /admin/ai allows authorized local preparation.
- Durable proposal history, per-user/global daily request caps, explicit source-sharing consent, bounded output and request timeouts, and idempotent request keys are implemented. Failed or uncertain requests consume their reserved quota; there is no automatic paid retry.
- Independent editors can accept or reject proposals with a reason and warning acknowledgement. Acceptance checks the article version, records a revision/audit, and resets verification. It never publishes. Social copy is stored for review, not posted externally.
- Local duplicate checks use Unicode-normalized lexical similarity over accessible articles. They are not semantic plagiarism detection and send no data externally.
- Isolated MySQL integration tests exercise persistence, replay, review independence, stale versions, rejection, malformed output, private provider errors, timeout, quota and disabled generation. The injected test fixture is never a runtime provider.

## Pending provider decision and implementation

User has not yet chosen an AI or email service. AWS SES/Bedrock were offered as an option but are not assumed approved. No AI credential is requested in chat, no service is activated and no inference charges are incurred by this milestone.

Remaining: an approved live provider adapter and model, provider-specific secret configuration, measured monetary cost reporting, and Tamil newsroom quality evaluation against real model output. Request/token limits are not a monetary spending cap. AI proposals must never bypass the existing independent fact-check and publishing workflow. Email stays on hold at the user's request.
