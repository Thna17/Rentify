# Omnichannel Order & Inventory Synchronization Walkthrough

## Summary of Accomplishments

We conducted an end-to-end audit and hardening of the complete ordering lifecycle and real-time inventory synchronization across all three sales channels: **Storefront**, **Marketplace**, and **POS (Point of Sale)**.

All channels now converge on a single, shared canonical MySQL inventory authority (`sharedStockService.js`) with pessimistic row-level locking (`transaction.LOCK.UPDATE`) to guarantee real-time stock deduction, prevention of negative inventory, automatic status transitions (`active` <-> `out_of_stock`), and clean restoration upon cancellation.

---

## 1. Key Fixes Across Sales Channels

### A. Point of Sale (`rentify-pos.mekhla.digital`)
1. **Modal Centering & Visibility**:
   - Fixed Tailwind path in `apps/core/pos/tailwind.config.js` and replaced non-standard arbitrary CSS transforms with `-translate-x-1/2 -translate-y-1/2` in `libs/shared/src/ui/dialog.tsx` and `alert-dialog.tsx`.
   - The Payment modal now renders dead-center with high-contrast actions and clear total amount confirmation (`Pay $XX.XX`).
2. **Catalog Pagination**:
   - Updated `fetchProducts` in `POS.jsx` to pass `?limit=100` so merchants with large catalogs see all items immediately in the register grid.
   - Added `?limit=50` to `fetchPastOrders` for order receipt reprint and returns.
3. **Delivery Status & Order Types**:
   - Updated `POSOrderStrategy.js` to set `deliveryStatus: 'delivered'` on immediate payment (cash/card) and `salesChannel: 'pos'`.

### B. Marketplace (`rentify-marketplace.mekhla.digital`)
1. **Idempotency Key Compatibility**:
   - **Root Cause**: `marketplaceCheckoutService.js` strictly required a UUID regex (`/^[0-9a-f]{8}-[0-9a-f]{4}...$/`), while `marketplace-frontend` generated custom keys like `chk-${Date.now()}...`, causing marketplace checkouts to fail with `400 Invalid idempotency key`.
   - **Fix**: Updated `marketplace-frontend/src/app/pages/checkout.component.ts` to use standard `crypto.randomUUID()`.
   - Hardened `marketplaceCheckoutService.js` to support both standard UUIDs and 8–64 character alphanumeric strings (`/^[a-zA-Z0-9_-]{8,64}$/`).
2. **Immediate Row-Locked Inventory Deduction**:
   - Marketplace checkout transactions sort items by `productId` and deduct canonical stock through `sharedStockService.changeStock`.

### C. Storefront (`<store>.mekhla.digital`) & Merchant Dashboard
1. **Store-Level Catalog Product Lookup**:
   - In `OnlineOrderStrategy.js`, updated product validation to match `{ [Op.or]: [{ websiteId }, { storeId: effectiveStoreId }], status: 'active' }`. Storefront orders can now purchase store-catalog products without `websiteId` restriction.
   - Stamped `storeId`, `salesChannel: 'storefront'`, and `deliveryStatus: 'pending'` on the created `Order`.
2. **Double Stock Deduction Prevention**:
   - Previously, COD storefront orders initialized with `stockDeducted: false` despite `nicheStrategy.updateInventory` deducting stock at creation time. This caused merchant confirmation to deduct stock a second time.
   - Set `stockDeducted: true` at creation time, preventing duplicate deductions.
3. **Unified Merchant Order History**:
   - In `OrderHistoryStrategy.js`, expanded `validStatuses` to include `'completed'`, `'fulfilled'`, and `'processing'` (previously rejected POS completed orders with 400).
   - Added store-level querying (`[Op.or]: [{ websiteId }, { storeId: effectiveStoreId }]`) so in-person POS sales and marketplace orders appear in the merchant dashboard order stream.

### D. Canonical Inventory Synchronization (`sharedStockService.js`)
1. **Auto-Status Synchronization**:
   - When stock hits `0`: `active -> out_of_stock`.
   - When stock replenished `> 0`: `out_of_stock -> active`.
   - Extended this auto-transition behavior to `ProductVariant` records when `variantId` is present.
2. **Concurrency Safety**:
   - MySQL row-level locking (`transaction.LOCK.UPDATE`) sorted deterministically by product ID across all channels prevents deadlocks and overselling.

---

## 2. Automated Test Verification

| Test Suite | Location | Result | Coverage |
| :--- | :--- | :--- | :--- |
| **Omnichannel Full Sync** | `ecommerce-server/test/integration/omnichannelFullSync.test.js` | **PASS (2/2)** | Simultaneous POS, Storefront & Marketplace deduction, out-of-stock blocking, cancel/restock auto-reactivation, variant sync |
| **Marketplace POS Sync** | `ecommerce-server/test/integration/marketplacePOS.test.js` | **PASS (6/6)** | Website-less store orders, KHQR, role permissions, zero shipping |
| **Omnichannel Sync** | `ecommerce-server/test/integration/omnichannelSync.test.js` | **PASS (2/2)** | Cash/card immediate deduction, catalog restock status transitions |
| **Marketplace Checkout Gate** | `ecommerce-server/test/security/marketplaceCheckoutGate.test.js` | **PASS (2/2)** | Checkout gates and security |
| **Core API Security & Integration** | `rentify-server/test/{security,integration}/**/*.test.js` | **PASS (52/52)** | Return URL policy, store isolation, publishing, auth lifecycle |
| **Dashboard Feature Integrity** | `rentify-frontend/e2e/dashboard-feature-integrity.test.mjs` | **PASS (6/6)** | Decoupled POS app, sales channels tabs |
| **Storefront Boundary & Tests** | `rentify-frontend/apps/storefront` | **PASS (9/9)** | Worker routes, template boundaries, shells |

---

## 3. Production Deployment & Live Verification

- **VPS Stack**: Deployed on `100.98.97.8` under `~/apps/rentify`.
- **Rebuilt & Restarted**:
  - `web` (serving marketing, auth, merchant, pos, marketplace, and admin).
  - `ecommerce-api` (commerce engine with omnichannel order & inventory strategies).
  - `core-api` (identity, stores, and return URL policy).
- **Colis Containers Untouched**: Verified exactly **32** Colis microservice containers remain up and running undisturbed (`colis-microservice-*`).
- **Live Endpoint Checks**:
  - `https://rentify-pos.mekhla.digital/` -> `HTTP 200 OK`
  - `https://rentify-marketplace.mekhla.digital/` -> `HTTP 200 OK`
  - `https://rentify-commerce.mekhla.digital/api/marketplace/products?storeId=0e0bf2b4-cd27-4425-a92f-0d19c64a2a04` -> `HTTP 200 OK` (5 active products returned for Elora store)
  - `Product: Bleu Impérial` -> `Stock: 10, Status: active` in production MySQL.
