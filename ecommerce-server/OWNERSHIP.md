# Ownership and parallel-work boundaries

| Area | Owner role | Primary paths |
| --- | --- | --- |
| Catalog, cart, orders, POS | Commerce owner | `modules/catalog/`, `modules/store-catalog/`, `modules/cart/`, `modules/orders/`, `modules/inventory/`, `modules/checkout/` |
| Payments and KHQR | Payments owner | `modules/payments/` (including `modules/payments/core/` and `paymentConfigEncryption.js`) |
| Tenant authorization | Security owner | `middlewares/requireWebsiteAccess.js`, `middlewares/authMiddleware.js` |
| Usage and billing | Infrastructure owner | `modules/billing/` (usage events, aggregation, billing worker) |
| Database | Data reliability owner | `models/`, `migrations/` |
| QA/security | Quality owner | `test/`, `.github/workflows/`, `scripts/quality/` |

Assign named reviewers for each role in repository settings. Payment, tenant,
and schema changes require both their owner and QA approval.
