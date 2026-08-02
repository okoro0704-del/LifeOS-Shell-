# LifeOS V1 — Definition of Done checklist

Run TrustID (`:5173`, `:8787`) and LifeOS (`:5174`, `:8790`, `:5180`).

1. Open http://localhost:5174
2. Click **Continue with TrustID**
3. Authenticate / consent on TrustID
4. Return to LifeOS with local profile created
5. Home shows greeting + TrustID Connected + wallet summary
6. Wallet shows mock TOK balance and transactions
7. Discover lists Sunrise Hotel / Grand Restaurant
8. Open Sunrise Hotel → mock HospitalityOS loads
9. Interact with rooms / booking mock → Return to LifeOS
10. Activity shows aggregated mock events
11. Profile shows TrustID + Open TrustID shortcut
12. Revoke LifeOS in TrustID → next session bootstrap with old token fails (re-auth required)

## Independence checks

- LifeOS DB has no `hotel_reservations` table
- HospitalityOS is a separate Vite process on `:5180`
- Token balances come from `MockTokenNetworkProvider`, not LifeOS UI
- Experience URLs must match registry `approved_origin`
