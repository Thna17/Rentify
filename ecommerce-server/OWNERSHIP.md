# Ownership and parallel-work boundaries

| Area | Owner role | Primary paths |
| --- | --- | --- |
| Catalog, cart, orders, POS | Commerce owner | `controllers/`, `routes/product*`, `routes/cart*`, `routes/order*` |
| Payments and KHQR | Payments owner | `controllers/Payment*`, `routes/payment*`, `core/payment/`, `utils/paymentConfigEncryption.js` |
| Tenant authorization | Security owner | `middlewares/requireWebsiteAccess.js`, `middlewares/authMiddleware.js` |
| Usage and billing | Infrastructure owner | `routes/usage*`, `services/*billing*`, `workers/` |
| Database | Data reliability owner | `models/`, `migrations/` |
| QA/security | Quality owner | `test/`, `.github/workflows/`, `scripts/quality/` |

Assign named reviewers for each role in repository settings. Payment, tenant,
and schema changes require both their owner and QA approval.
