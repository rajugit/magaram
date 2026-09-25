# Social and Messaging Assessment

## Current assessment

The provider-neutral publishing contract is implemented and tested. It requires an account reference, explicit consent ID, idempotency key, bounded copy, and sponsorship disclosure; inactive providers fail closed. No live social integration, provider credential configuration, consent ledger, queue, publication status, delivery metric, or webhook handler is operational yet.

## Target design

Implement official-API adapters behind a common interface:

```text
connect → refreshToken → validate → publish → delete → getStatus → getMetrics
```

Providers: Facebook, Instagram, X, WhatsApp Business Cloud, Telegram, and YouTube readiness. Each provider declares supported media/capabilities and validates content before enqueueing.

## Delivery requirements

- Persist account, article/campaign, provider post ID, status, response/error summary, retry count, scheduled/published time, and idempotency key.
- Use a queue with retries, exponential backoff, dead-letter handling, observability, and duplicate prevention.
- Encrypt/secure tokens and support refresh/revocation; do not hard-code credentials.
- Use WhatsApp only with provable opt-in, approved templates where required, unsubscribe handling, and consent records.
- Respect platform policies; do not use browser automation.
- Maintain sponsored-content disclosure consistently in all outbound formats.
