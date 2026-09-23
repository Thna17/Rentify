# Ownership and parallel-work boundaries

| Area | Owner role | Primary paths |
| --- | --- | --- |
| Core API and identity | Core API owner | `src/routes/authRoutes.js`, `src/services/authService.js`, `src/middlewares/` |
| Websites, templates, deployment | Platform owner | `src/routes/website*`, `src/routes/deployment*`, `src/services/deployment*` |
| Payments and subscriptions | Payments owner | `src/controllers/payment*`, `src/models/Payment.js`, `src/models/Subscription.js` |
| Operations | Infrastructure owner | `src/jobs/`, `src/routes/ops*`, `src/services/*ops*` |
| Database | Data reliability owner | `src/models/`, `src/migrations/` |
| QA/security | Quality owner | `test/`, `.github/workflows/`, `scripts/quality/` |

Assign named reviewers for each role in repository settings. Any schema,
authentication, payment, or deployment change needs the matching owner and QA
approval.
