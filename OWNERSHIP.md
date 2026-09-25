# Rentify ownership and review boundaries

`.github/CODEOWNERS` names the current GitHub approver. This table defines the
additional role review required as the team assigns named owners.

| Area | Required owner role | Primary paths |
| --- | --- | --- |
| Core identity, stores and subscriptions | Core API / identity owner | `rentify-server/src/` |
| Catalog, inventory, checkout and orders | Commerce owner | `ecommerce-server/` |
| Payments and KHQR | Payments + security owners | Both APIs' payment routes, controllers and configuration |
| Auth, Merchant and Marketing | Frontend platform owner | `rentify-frontend/apps/core/` |
| Hosted storefronts and templates | Storefront owner | `rentify-frontend/apps/storefront/`, `apps/templates/`, `libs/storefront/` |
| Shared marketplace | Marketplace owner | `marketplace-frontend/` |
| Platform operations | Admin owner | `admin-frontend/` |
| Docker, Cloudflare and environments | Infrastructure owner | `compose*.yaml`, `docker/`, `deploy/` |
| Migrations and data reconciliation | Database reliability owner | Both services' models and migrations |
| Automated quality and security | QA/security owner | tests, `tools/`, `.github/workflows/` |

Changes crossing rows require every affected role. Payment, authorization,
tenant ownership, migrations and production deployment always require a second
reviewer even when the author is the listed code owner.
