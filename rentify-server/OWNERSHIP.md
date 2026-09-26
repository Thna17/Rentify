# Ownership and parallel-work boundaries

| Area | Owner role | Primary paths |
| --- | --- | --- |
| Core API and identity | Core API owner | `src/modules/auth/`, `src/modules/users/`, `src/modules/staff/`, `src/middlewares/` |
| Stores, websites, templates, deployment | Platform owner | `src/modules/stores/`, `src/modules/websites/`, `src/modules/templates/`, `src/modules/deployments/`, `src/modules/commerce-sync/` |
| Payments and subscriptions | Payments owner | `src/modules/billing/`, `src/models/Payment.js`, `src/models/Subscription.js` |
| Operations | Infrastructure owner | `src/modules/ops/`, `src/modules/admin/`, `src/modules/dashboard/`, `src/modules/internal/`, `src/modules/notifications/` |
| Database | Data reliability owner | `src/models/`, `src/migrations/` |
| QA/security | Quality owner | `test/`, `.github/workflows/`, `scripts/quality/` |

Assign named reviewers for each role in repository settings. Any schema,
authentication, payment, or deployment change needs the matching owner and QA
approval.
