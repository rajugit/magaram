# Phase 3 — AI newsroom

Status: the Amazon Bedrock adapter is implemented and tested with an isolated client. The approved runtime target is the APAC Amazon Nova Micro inference profile, with explicit user consent and starter limits of 10 requests per user and 50 platform-wide per UTC day. The live state is reported by `/api/v1/ai/status` after deployment.

## Available now

- Versioned Tamil-first prompt catalog: draft, summary, translation, SEO, social and claim extraction.
- POST /api/v1/ai/prepare builds a local source packet from an authorized saved article at a specified version. It audits actor, task, prompt version, article version and SHA-256 input fingerprint. Raw reporting is not copied into the audit log or sent externally.
- The Amazon Bedrock Converse adapter sends only the specific saved article packet that a signed-in reporter explicitly consents to send. It sends the versioned system prompt separately, requests JSON output, forwards the abort signal, records returned token counts and does not automatically retry uncertain paid requests.
- The adapter is disabled by default. It requires `AI_PROVIDER=bedrock`, the narrowly scoped server runtime identity, and the APAC Nova Micro profile. The profile keeps the initial inference route within APAC; it is not a guarantee of a real-model Tamil quality evaluation.
- Source material is serialized separately from system instructions. Prompts require attribution, uncertainty, sponsorship disclosure and independent human approval; prompt text cannot guarantee factual correctness.
- Proposal schema rejects extra publication commands, invented source IDs and claims marked VERIFIED. Structural validation is not fact checking.
- Preview /preview/3 shows the safeguards with sample reporting; /admin/ai allows authorized local preparation.
- Durable proposal history, per-user/global daily request caps, explicit source-sharing consent, bounded output and request timeouts, and idempotent request keys are implemented. Failed or uncertain requests consume their reserved quota; there is no automatic paid retry.
- Independent editors can accept or reject proposals with a reason and warning acknowledgement. Acceptance checks the article version, records a revision/audit, and resets verification. It never publishes. Social copy is stored for review, not posted externally.
- Local duplicate checks use Unicode-normalized lexical similarity over accessible articles. They are not semantic plagiarism detection and send no data externally.
- Isolated MySQL integration tests exercise persistence, replay, review independence, stale versions, rejection, malformed output, private provider errors, timeout, quota and disabled generation. The injected test fixture is never a runtime provider.

## Amazon email delivery

Amazon SES is the selected password-reset delivery service. It is disabled by default and requires a verified sender, a root-only server configuration, and HTTPS reset links. The application exposes `/reset-password`; reset tokens are never included in API responses or logs. Until SES leaves its sandbox, it can deliver only to verified recipient identities. A verification email for `magaram.in@gmail.com` has been requested; the mailbox owner must complete that link before SES can be enabled.

Request/token limits are not a monetary spending cap. Remaining work includes measured monetary cost reporting, a real-model Tamil quality evaluation, SES production-access review, and domain-based sender verification after DNS is available. AI proposals must never bypass the existing independent fact-check and publishing workflow.
