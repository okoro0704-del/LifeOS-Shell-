# Payment Integration

LifeOS payment adapter (`LifeOsPaymentAdapter`):

- getBalance / getPaymentMethods
- createPaymentIntent / authorizePayment
- getPaymentStatus / getReceipt
- buildPaymentPreview

Token Network remains the ledger. LifeOS never modifies balances as source of truth.

Intended flow: Payment Intent → Authorization → User confirm → Settlement (Token Network) → Receipt → LifeOS Activity.
