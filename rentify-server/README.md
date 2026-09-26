# Rentify Core API

## Code layout

Core is a modular monolith. Business code lives in one folder per domain under
`src/modules/`; shared infrastructure stays at the `src/` root.

| Path | Contents |
| --- | --- |
| `src/modules/auth/` | Merchant sign-up, login, OTP, OAuth (`passport.js`), token refresh, return-URL policy |
| `src/modules/users/` | Merchant profile |
| `src/modules/staff/` | Staff invitations, staff login and staff-token middleware |
| `src/modules/stores/` | Store profiles, store categories, marketplace seller review |
| `src/modules/websites/` | Websites, storefront content, image uploads |
| `src/modules/deployments/` | Publishing and hosted subdomains |
| `src/modules/commerce-sync/` | Website and Store projections to Commerce (outboxes and retry job) |
| `src/modules/templates/` | Public website template catalog |
| `src/modules/admin/` | Template administration and platform operations |
| `src/modules/billing/` | Packages, subscriptions, platform payments |
| `src/modules/notifications/` | Email, Telegram and merchant notifications |
| `src/modules/ops/` | Invoice facts, RaaS reminders, ops access |
| `src/modules/dashboard/` | Merchant dashboard summary |
| `src/modules/internal/` | Service-to-service endpoints for Commerce |
| `src/models/` | The single Sequelize model registry and cross-domain associations |
| `src/config/`, `src/middlewares/`, `src/utils/` | Shared configuration, auth/authorization guards, and helpers |
| `src/migrations/` | Ordered schema migrations |

A module keeps its routes, controllers and services side by side
(`storeRoutes.js`, `storeController.js`, `storeService.js`). `src/app.js`
mounts each module's router; HTTP paths are unchanged by the move.

**Module boundaries.** A module uses another module only through that
module's `index.js`, for example `require('../stores').storeService`, never
`require('../stores/storeService')`. Each `index.js` lists the members other
modules may use, as lazy getters. `npm run lint` fails on a cross-module
require that bypasses `index.js`; `node scripts/quality/check-module-boundaries.js src/modules --fix`
adds the member to the target's `index.js` and rewrites the require. App
wiring (`app.js`, `server.js`), models, migrations, scripts and tests are not
checked.

**Model ownership.** `src/modules/model-ownership.json` names the module(s)
that may create, update or delete each model. Any module may read any model;
to change another domain's rows, call the owning module's service.
`npm run lint` fails on a static write from a non-owner, a model with no
owner, an import of a name `models/index.js` does not export, or a query on a
name the file never declares. Add an entry under `exceptions` (with a
reason) only when moving the write is not yet practical.

## Usage-based billing
Rentify uses usage-based billing. Usage events are captured in the ecommerce service
and billed monthly (ORDER_PAID, INVOICE_PAID, STORE_VIEW). No ops guarantees or
outcome contracts are required.
