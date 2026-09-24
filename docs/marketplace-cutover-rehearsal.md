# Rentify marketplace development rehearsal

**Status (2026-09-24):** Normal Angular development routes use the Rentify
buyer shell. Core and Commerce are the only active APIs. The KhmerCraft
Express/Mongoose API and MongoDB are not used. This local configuration is
not a production release.

## Local setup

1. Start Core, Commerce, MySQL, Redis, Auth, and merchant apps with the root
   Docker instructions. Compose sets `DEV_MARKETPLACE_AUTO_APPROVAL=true` for
   Core and `MARKETPLACE_COD_CHECKOUT_ENABLED=true` for Commerce. Both are
   development settings; Core refuses automatic seller approval outside
   `NODE_ENV=development`.
2. Start `marketplace-frontend` with `npm start` (inside `marketplace-frontend/`) and open
   `http://localhost:4201`. Its committed runtime config serves the Rentify
   shell on `/`, `/cart`, `/checkout`, `/orders`, and old deep links. Localhost
   Core, Commerce, and Auth URLs are the fallback. Replace the blank public
   URLs before using another host.
3. Run `docker compose exec -T core-api npm run db:approve-development-stores`
   to check existing Stores. It approves only pending active Stores with a
   verified account contact and a selected controlled primary category, then
   syncs Core's versioned projection to Commerce. It reports Stores blocked
   by missing category or unverified contact. Never guess a historical Store
   category. Marketplace-only merchants can select it in their Store dashboard;
   existing Website merchants see a category prompt above their dashboard.
   For the repository's two named mock Stores only, run
   `docker compose exec -T core-api npm run db:seed-marketplace-mocks`, then
   `docker compose exec -T ecommerce-api npm run db:seed-marketplace-mocks`.
   These commands classify the seeded Products and add demo delivery fees.
4. Run `node scripts/cutover-projection-audit.mjs`, then
   `docker compose exec -T ecommerce-api npm run db:audit-stores` and
   `docker compose exec -T ecommerce-api npm run db:audit-cod` at the repository
   root. Investigate every mismatch. A zero-order COD report is not a checkout
   test.

## Browser checks

Sign in as a Core buyer. Verify public category/list/detail reads, one Store
per cart/order, posted merchant delivery fee, COD checkout idempotency,
buyer order history, seller fulfillment and cash collection, and one-unit
concurrent stock behavior. Check Store and Product opt-outs, draft/archived
Products, category review, seller suspension, and tenant boundaries through
the UI and direct Rentify APIs. Confirm normal Angular routes make no requests
to the KhmerCraft API.

The hosted storefront buyer path, production HTTPS cookie scope, custom-domain
session exchange, POS/invoice HTTP flows, return/dispute policy, and production
approval process remain separate release gates in
[the migration plan](migration-plan.md).
