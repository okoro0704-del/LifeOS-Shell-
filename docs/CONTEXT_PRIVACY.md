# Context Privacy

## Scoping

Personal context is strictly **user-scoped** (`userId` on every query).

Never allow:

- User A → User B data
- Business → another business’s customer context
- Experience → unrelated LifeOS personal records
- AI → unrestricted personal tables

## Minimization

Store **references**, not copies of external systems of record:

- `bookingSource` / `source`
- `bookingId` / `sourceId`
- `experienceId` / `offeringId`
- `externalReference`

Cache only presentation fields (title, time, status, deep link).

## Redaction

Continue / metadata paths strip:

- card numbers, CVV, tokens, authorization tokens
- Never expose TrustID biometric/security material

## Wallet

Balances and payment attention appear through the Token Network **adapter**.

LifeOS does not duplicate the ledger. Receipts link out; credentials never stored.

## Partial failure

If HospitalityOS (or any provider) is unavailable, LifeOS still shows Saved, Activity, Wallet (if available), local plans, and Notifications — with `providerErrors` surfaced calmly.
