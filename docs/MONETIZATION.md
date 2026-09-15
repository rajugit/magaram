# Monetization Assessment and Principles

## Current assessment

No ad inventory, advertising portal, campaign system, payment integration, subscription, invoice, lead model, revenue ledger, or reporting implementation exists.

## Design principles

1. Maintain a common product, customer, campaign, payment, and revenue-transaction vocabulary across all revenue lines.
2. Treat editorial independence and paid-content disclosure as hard product rules.
3. Make prices, packages, placements, tax, and plan limits administrator-configurable.
4. Verify payments and webhooks server-side; do not rely on browser confirmation.
5. Record consent for lead capture and messaging, and retain evidence for transactions/refunds.
6. Use a payment-provider interface to avoid dependence on one provider.
7. Separate ad impression/click event collection from verified financial revenue.

## Revenue ledger proposal

`revenue_transactions` should record immutable financial facts: source, product, customer, campaign, article where applicable, gross amount, tax, fee, net amount, currency, payment status, provider reference, and transaction date. Corrections/refunds should create compensating records rather than mutate history.

## Recommended delivery sequence

Start with direct advertising, sponsored content, featured local businesses, and qualified leads only after identity, editorial, consent, and payment foundations. Add jobs, classifieds, property, education, deals, memberships, newsletters, creators, events, B2B intelligence, and licensing incrementally when shared primitives are proven.
