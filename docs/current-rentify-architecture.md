# Current Rentify architecture

**Status:** Code-backed snapshot, 2026-09-23. This describes the current
repository, including known inconsistencies. Marketplace integration is not
implemented.

## Runtime and ownership

| Runtime | Current responsibility | Persistent state |
| --- | --- | --- |
| `rentify-server` (`:3001`) | Merchant/admin/staff identity, initial Store profiles, websites, templates, packages, subscriptions, deployment | `rentify_core` MySQL |
| `ecommerce-server` (`:4001`) | Website copy, catalog, carts, customers, checkout, orders, POS, invoices, payments, usage billing | `rentify_ecommerce` MySQL |
| `rentify-frontend` | Marketing, auth, merchant dashboard, two storefront template apps | Browser session and API state |
| Redis | Cache and deployment updates | Transient state |

The local services and URLs are declared in [`compose.yaml`](../compose.yaml).
Both APIs run explicit migrations before startup; API startup authenticates
the database without changing the schema
([Core](../rentify-server/src/config/initDB.js),
[Commerce](../ecommerce-server/config/initDb.js)).

## Request and data paths

1. The marketing onboarding hook creates a website, then requests deployment
   and polls its status
   ([hook](../rentify-frontend/apps/core/marketing/src/hooks/useDeployment.js)).
2. Core creates or reuses one Store for the owner, then creates a Website and
   trial subscription in one transaction, queues a
   Commerce projection in the same transaction, then asynchronously posts it
   with a service token. A background worker retries failed projections
   ([website service](../rentify-server/src/services/websiteService.js),
   [sync service](../rentify-server/src/services/ecommerceSyncService.js)).
3. Commerce stores that copy as `WebsiteData`. Its `websiteId` is the current
   tenant key for products, categories, carts, orders, and many permissions
   ([WebsiteData](../ecommerce-server/models/WebsiteData.js),
   [Product](../ecommerce-server/models/Product.js),
   [Cart](../ecommerce-server/models/Cart.js),
   [Order](../ecommerce-server/models/Order.js)).
4. A storefront resolves its website from the browser host and uses the
   returned website ID for catalog requests
   ([storefront website provider](../rentify-frontend/libs/storefront/src/website.tsx)).
5. Commerce validates merchant and staff cookies through Core, then checks
   ownership or staff permissions against its website copy
   ([authentication](../ecommerce-server/middlewares/authMiddleware.js),
   [website access](../ecommerce-server/middlewares/requireWebsiteAccess.js)).
   Storefront customer sessions are local to the storefront host.
6. Online, POS, and invoice orders use Commerce strategies. Payment and
   fulfillment services advance state; usage events record paid orders,
   invoices, and store views
   ([order route](../ecommerce-server/routes/orderRoutes.js),
   [usage events](../ecommerce-server/services/usageEventService.js)).

## Constraints relevant to the migration

| Current behavior | Migration consequence |
| --- | --- |
| Product, category, cart, and order records use `websiteId`; Product/Cart/Order require it | Add a Store tenant key before marketplace-only selling. Backfill existing website records through an explicit Website-to-Store mapping. |
| Core Website is owned by `userId`, has a required template, and is unique per user | Core now has one Store per owner and at most one Website per Store. Commerce and UI still need to use that Store key. |
| Commerce `WebsiteData` copies Core data | The initial copy now has an outbox retry. Add cross-service reconciliation before relying on it for marketplace onboarding. Do not infer store ownership from a domain. |
| Commerce Customer has `storeId` while storefront access and carts remain website scoped | Audit the actual semantics of `storeId`, customer uniqueness, and cookie scope before linking marketplace buyer accounts. |
| Core and Commerce use different website status enums | Core now maps deployment stages to Commerce operational states; keep the mapping explicit in future flows. |
| Storefront templates and merchant dashboard call website based APIs | Add compatible Store based APIs/adapters before changing these clients. Keep existing storefront URLs working during rollout. |
| Core owns website subscriptions; Commerce owns usage billing | Specify marketplace selling fees and storefront subscription entitlements separately. |

The trial path previously created `Subscription` without its required
`websiteId` and before inserting Website. Core also sent `customization` to a
Commerce status enum that did not include it. Both blockers were repaired on
2026-09-23. See the implementation record in [notes](notes.md). The current
service and model contracts are in the [website service](../rentify-server/src/services/websiteService.js),
[subscription service](../rentify-server/src/services/subscriptionService.js),
[sync service](../rentify-server/src/services/ecommerceSyncService.js), and
[Commerce WebsiteData](../ecommerce-server/models/WebsiteData.js).

Core Store foundation was added on 2026-09-23. `POST /api/stores` creates a
merchant-owned Store with a primary category and no Website; `GET /api/stores/mine`
and `PATCH /api/stores/mine` read and change that Store. New Stores default to
`marketplaceEnabled: true`, while approval remains `pending`. Existing Websites
were linked to new Stores by migration. Their category is deliberately null and
`needsCategoryReview` is true until classified. This is an identity and schema
foundation only: Commerce products and checkout remain website keyed, and no
seller approval or marketplace sale is enabled by these Core endpoints.

## Current marketplace project

The relocated project remains separate under `marketplace/`:
[`apps/web`](../marketplace/apps/web) is an Angular buyer/seller/admin UI;
[`apps/api`](../marketplace/apps/api) is an Express/Mongoose API with its own
User, Store, Product, Cart, Order, and Review records. It is the source for
feature and data mapping. Its MongoDB records need a repeatable migration;
they must not become a second active commerce authority.
