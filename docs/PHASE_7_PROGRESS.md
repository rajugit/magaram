# Phase 7 — Magaram Local

Updated 2026-09-24. Core implemented and locally verified; not a production cutover or a claim that later revenue phases are complete.

## Delivered workflow

- Public Tamil directory at `/local`, server-rendered from verified records, with keyword, town/district and category filters and 24-result pagination.
- Staff workspace at `/admin/businesses` for registration, profile correction, evidence-backed verification, suspension, offer creation/activation/pause and enquiry follow-up.
- New and edited businesses require verification. Editing or suspension pauses active offers. Re-verification does not automatically reactivate offers.
- Offers require explicit terms and ordered ISO timestamps. Only active offers whose start has passed and end has not passed appear publicly or accept offer-specific enquiries. Dates displayed to readers use India time.
- Public enquiries require CSRF protection and explicit consent. The transaction checks business/offer eligibility, records consent time and a versioned purpose audit, and returns only the reference and status. Contact details are not placed in audit metadata.
- Only `local:manage` staff (seeded for SALES_MANAGER) and the existing administrator wildcard can manage records or read private enquiries. Business owners have no automatic access to other people's data.
- Staff changes are audited. Serializable transactions protect eligibility and state changes; concurrent conflicts return a retryable 409 response. Public enquiries are limited to ten submissions per minute per IP within each API process.
- `/preview/7` and `/preview/7/workspace` contain labelled sample content with disabled writes. Offline previews are exported into `docs/previews/phase-7.html` and `phase-7-workspace.html`.

## Editorial and privacy rules

Directory placement is not an editorial endorsement, paid news, or a quality guarantee. Record the business identity/contact checks and a reference in the private verification evidence. Do not put identity documents or private personal contact details in public descriptions. Review offer exclusions, stock limits and dates before activation. No fabricated customer ratings, claimed endorsements, or unverified discount claims are generated.

Consent is specific to responding to the named business enquiry; it does not subscribe the reader to marketing. The public form provides the Magaram contact address for withdrawal requests. Staff must handle withdrawal/retention requests operationally; automatic erasure and a self-service preference centre are not implemented. Do not promise automatic business delivery: email and WhatsApp remain inactive.

## Validation

- Full API/unit suite: 45 tests pass.
- Isolated MySQL/Redis integration suite: 12 tests pass, applying all six migrations to a disposable schema and cleaning it afterward.
- Local workflow integration exercises permission denial, missing CSRF, missing consent, public-field projection, consent auditing, future/expired offers, cross-business offer rejection, search, profile re-verification, suspension and private lead status updates.
- Type checks, lint and API/web/worker production builds pass.
- Chrome inspection covers the Tamil sample directory, disabled sample forms and staff preview at desktop and 390px mobile width. This is targeted visual verification, not a full accessibility audit or a signed-in browser acceptance test.

## Remaining release work

The core was deployed to the AWS preview on 2026-09-25 at `ab04f6ea714396a0ef007aa33ee8ad02f6874e3e`. The additive migrations and permission seeds succeeded; a pre-release backup completed. Local smoke checks and live testing-account authentication passed. Authenticated live smoke and exact public version verification passed; see `TEST_REPORT_2026-09-25.md`. No sample businesses are seeded into the live directory.

Before production: complete signed-in browser acceptance, retention/withdrawal operations, monitoring and backup/restore acceptance. Management screens currently show the latest 200 businesses/enquiries; searchable paginated staff queues should precede a larger rollout. The current rate limiter is per process; a multi-instance deployment needs a shared rate-limit store. Business self-service, payments and outbound delivery are later integrations, not simulated features.
