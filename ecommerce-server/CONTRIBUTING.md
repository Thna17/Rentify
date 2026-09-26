# Contributing

## Code layout

Commerce is a modular monolith. Business code lives in one folder per domain
under `modules/`; shared infrastructure stays at the package root.

| Path | Contents |
| --- | --- |
| `modules/auth/` | Storefront customer sign-up, login, OTP and store validation |
| `modules/customers/` | Customer profile, password change, customer order cancellation |
| `modules/catalog/` | Merchant products and categories; product strategies and builders (`core/`) |
| `modules/store-catalog/` | Public Store-keyed catalog and product reviews |
| `modules/cart/` | Carts; niche cart strategies (`core/`) |
| `modules/orders/` | Orders, merchant order management, POS; order creation and retrieval strategies (`core/`) |
| `modules/inventory/` | Stock reservation and shared-stock rules |
| `modules/checkout/` | Marketplace and storefront COD checkout, merchant contact lookup |
| `modules/payments/` | Payments, payment gateway config and encryption, verification, fulfillment, recovery worker; payment strategies (`core/`) |
| `modules/invoices/` | Invoices |
| `modules/billing/` | Usage events, usage aggregation, pricing rules, billing worker |
| `modules/store-access/` | Store access projection from Core |
| `modules/websites/` | Website data projection and deployment listener |
| `modules/notifications/` | Email and Telegram notifications |
| `modules/ops/` | Ops invoice facts and ops access |
| `modules/admin/` | Platform operations for Core admins |
| `modules/stats/` | Merchant e-commerce statistics |
| `models/` | The single Sequelize model registry and cross-domain associations |
| `config/`, `middlewares/`, `utils/` | Shared configuration, auth/tenant guards, and helpers |
| `migrations/` | Ordered schema migrations |

A module keeps its routes, controllers and services side by side. `app.js`
mounts each module's router; HTTP paths are unchanged by the move.

**Module boundaries.** A module uses another module only through that
module's `index.js`, for example `require('../inventory').stockService`, never
`require('../inventory/stockService')`. Each `index.js` lists the members other
modules may use, as lazy getters. `npm run lint` fails on a cross-module
require that bypasses `index.js`; `node scripts/quality/check-module-boundaries.js modules --fix`
adds the member to the target's `index.js` and rewrites the require. App
wiring (`app.js`, `server.js`), models, migrations, scripts and tests are not
checked.

## Workflow

`main` is protected release code; create `feature/<scope>-<summary>` or
`fix/<scope>-<summary>` branches from `develop`. Keep tenant authorization,
payment, and order-state changes isolated from unrelated refactors.

Run `npm run verify` before review. For model changes also run
`npm run db:migrate:verify` against `rentify_commerce_test`. PRs must state
tenant impact, request/response changes, migration/rollback notes, and tests.
Obtain the relevant owner and QA review listed in `OWNERSHIP.md`.

Never commit `.env`, payment credentials, customer data, databases, Redis
dumps, or generated build files. Add a new migration rather than modifying an
applied migration. Never discard or merge another teammate's work without their
explicit approval.
