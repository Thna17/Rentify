# Rentify OpenAPI Specifications

This directory maintains the authoritative, machine-readable OpenAPI 3.0.3 contracts for active Release 1 routes in the Rentify platform:

- **Core API**: [`docs/openapi/core.openapi.yaml`](core.openapi.yaml) — Identity, stores, websites, templates, packages, staff, and deployments (`rentify-server`).
- **Commerce API**: [`docs/openapi/commerce.openapi.yaml`](commerce.openapi.yaml) — Catalog, inventory, shopping carts, checkout, orders, invoices, POS, payments, and usage billing (`ecommerce-server`).

Contracts reflect the actual code implementation in controllers, routes, models, and middleware. They strictly avoid describing planned, unverified, or future capabilities as implemented.

---

## Specification Files

| API Service | Specification File | Format | Code Authority |
| :--- | :--- | :--- | :--- |
| **Rentify Core API** | [`docs/openapi/core.openapi.yaml`](core.openapi.yaml) | OpenAPI 3.0.3 (YAML) | `rentify-server` |
| **Rentify Commerce API** | [`docs/openapi/commerce.openapi.yaml`](commerce.openapi.yaml) | OpenAPI 3.0.3 (YAML) | `ecommerce-server` |

Redocly multi-API project configuration is defined in [`redocly.yaml`](../../redocly.yaml) at the repository root.

---

## Developer Commands

### 1. Specification Validation
To lint and validate specifications against Redocly standards, verify 100% Express route coverage, and ensure zero leaked secrets:

```bash
# Validate both Core and Commerce specifications from repository root
npm run verify:openapi

# Validate Core API specification only
npm --prefix rentify-server run openapi:verify

# Validate Commerce API specification only
npm --prefix ecommerce-server run openapi:verify
```

### 2. Breaking Change & Compatibility Detection
To verify whether working copy modifications introduce breaking contract changes compared to `develop` or another baseline:

```bash
# Compare both specifications against git develop
node tools/openapi-diff.mjs develop

# Compare Commerce specification against develop
node tools/openapi-diff.mjs develop docs/openapi/commerce.openapi.yaml

# Compare Core specification against develop
node tools/openapi-diff.mjs develop docs/openapi/core.openapi.yaml

# Compare two arbitrary specification files
node tools/openapi-diff.mjs path/to/baseline.yaml path/to/current.yaml

# Run from service directories
npm --prefix rentify-server run openapi:diff
npm --prefix ecommerce-server run openapi:diff
```

The breaking change detector identifies:
- Removed endpoint paths
- Removed HTTP methods
- Removed HTTP response status codes
- Newly required request parameters (query, header, path, cookie)
- Request bodies converted from optional to required

### 3. Automated Test Suites
OpenAPI contract validation, security scheme validation, and Express route parity checks run automatically as unit/security tests:

```bash
# Core API security tests (includes openApiContract.test.js)
npm --prefix rentify-server run test:security

# Commerce API security tests (includes openApiContract.test.js)
npm --prefix ecommerce-server run test:security
```

### 4. Full Quality Verification
Contract validation and diff detection are integrated into service and repository verification workflows:

```bash
# Repository-wide policy, migration, and contract verification
npm run verify:repository

# Core API full verification (lint, typecheck, tests, build, secret scan, openapi)
npm run verify:core

# Commerce API full verification (lint, typecheck, tests, build, secret scan, openapi)
npm run verify:commerce
```

---

## Commerce API: Documented Domains and Routes

The Commerce OpenAPI contract covers all 137 active mounted Express operations across 109 paths:

| Domain | Base Path | Description |
| :--- | :--- | :--- |
| **Marketplace Catalog** | `/api/marketplace/products`, `/api/marketplace/search`, `/api/marketplace/stores/:storeId/products` | Public marketplace product listing, filtering by category and store, keyword search, detailed product inspection with stock availability. |
| **Marketplace Categories** | `/api/marketplace/categories` | Public marketplace product categories with active product counts. |
| **Store Catalog Management** | `/api/stores/:storeId/products*` | Merchant omnichannel product catalog management, barcode scanning lookup, variant management, stock updates, marketplace visibility toggle. |
| **Storefront Catalog** | `/api/product/*` | Website-scoped compatibility product discovery, product details with variants, legacy CSV bulk import, and inventory adjustments. |
| **Merchant Product Jobs** | `/api/stores/{storeId}/product-imports/*` | Store-scoped versioned CSV preview, asynchronous draft import, progress/history, correction reports, safe retry, and authorized Product/SKU export. |
| **Storefront Categories** | `/api/categories/*` | Website-scoped category CRUD and tree listing. |
| **Marketplace Shopping Carts** | `/api/marketplace/cart*`, `/api/cart*` | Guest session and authenticated buyer carts, item addition, quantity updates, item removal, cart clearing, and guest-to-buyer cart merge upon sign-in. |
| **Storefront Shopping Carts** | `/api/storefront/:websiteId/cart*`, `/api/cart/:websiteId*` | Website-scoped shopping cart operations and quick-add support. |
| **Cash on Delivery (COD) Checkout** | `/api/marketplace/checkout`, `/api/storefront/:websiteId/checkout` | Idempotent Cash on Delivery checkout for marketplace and storefronts, delivery fee calculation, and stock reservation. |
| **Buyer Orders & Tracking** | `/api/marketplace/my-orders*`, `/api/storefront/:websiteId/my-orders*`, `/api/order/websites/*` | Buyer order history, public tracking by tracking number, order detail retrieval, cancellation, issue/dispute reporting. |
| **Merchant Order Management** | `/api/merchant/orders/*`, `/api/stores/:storeId/marketplace-orders/*` | Merchant order listing, order status transitions (confirm, process, ship, deliver, cancel), delivery updates. |
| **Store Delivery Policies** | `/api/stores/:storeId/marketplace-delivery` | Store-level flat delivery fee configuration for marketplace orders. |
| **Point of Sale (POS)** | `/api/stores/:storeId/orders/pos`, `/api/order/websites/:websiteId/orders/pos` | Omnichannel in-store POS checkout, immediate stock deduction, cash and digital payment receipt generation. |
| **Invoices** | `/api/invoice/*` | Invoice generation, order invoice queries, invoice status transitions, PDF document rendering. |
| **Payments & Gateway Config** | `/api/payment/*`, `/api/payment-config/*` | Payment transaction records, Bakong KHQR QR code generation, transaction status polling, encrypted merchant payment provider configuration. |
| **Customer Auth & Accounts** | `/api/auth/*`, `/api/customer/*` | Storefront customer registration, password/OTP login, phone verification, profile inspection, address management. |
| **Tenancy & Store Access** | `/api/store-access/*`, `/api/website-data/*` | Multi-tenant store access authorization, website configuration projection, and staff permission checks. |
| **Platform Operations Moderation** | `/api/admin/operations/*` | Platform operator oversight, product moderation (approve/reject/archive), store catalog inspection, dispute resolution. |
| **Operations Invoices & Reminders** | `/api/ops/invoices/*` | Operational invoice facts, overdue reminders, telemetry for cutover reconciliation. |
| **Usage Tracking & Billing** | `/api/usage/*` | API usage metering, feature usage records, monthly billing aggregation for platform fees. |
| **Commerce Analytics** | `/ecommerce/stats/*` | Revenue summaries, order volume metrics, top-selling products for merchant dashboards. |
| **Notifications & Webhook** | `/api/telegram/webhook` | Telegram bot order alerts and event notifications. |
| **Health Check** | `/health` | Container and load-balancer health probe returning minimal `{ "status": "ok" }`. |

---

## Core API: Documented Domains and Routes

The Core OpenAPI contract covers all 95 active mounted Express operations across 84 paths:

| Domain | Base Path | Description |
| :--- | :--- | :--- |
| **Authentication & Sessions** | `/api/auth/*` | Registration, credential login, Google OAuth, session retrieval (`/session` & `/me`), token refresh with grace period, logout, password resets. |
| **Users & Identity** | `/api/user/*` | Merchant profile inspection, profile updates, avatar uploads, and password change. |
| **Stores & Merchant Ownership** | `/api/stores/*` | Store lookup, profile mutations, logo uploads, seller approval application submission, and marketplace participation toggle. |
| **Websites & Live Storefronts** | `/api/websites/*` | Website creation, configuration, color palette customization, public domain resolution (`getWebsiteByDomain`), and live storefront page/navigation/theme rendering. |
| **Templates** | `/templates/*` | Public storefront template catalog and template inspection by ID. |
| **Deployments & Subdomains** | `/api/deployments/*` | Storefront hosted subdomain publishing (`/publish`), custom domain configuration (`/custom-domain`), and deployment status queries. |
| **Dashboard** | `/dashboard/*` | Merchant dashboard overview, website context, and active subscription status. |
| **Staff & Permissions** | `/api/staff/*` | Staff account creation, invitation generation, invitation acceptance, store staff listing, and permission updates. |
| **Billing & Payments** | `/api/packages/*` | Public package tier listing, merchant package assignment, Bakong KHQR payment link generation, payment status polling, and webhook verification. |
| **Admin Operations** | `/admin/*` | Platform administration, template CRUD, store listing with application status filters, seller application adjudication (approve/reject/suspend), and audit log exports. |
| **Operations Telemetry** | `/ops/*` | Internal operator contracts, reminder telemetry, and cutover milestone status. |
| **Internal Service Comms** | `/api/internal/*` | Service-to-service communication between Core and Commerce APIs (merchant store lookups, website status synchronization, and notification handoffs). |
| **Order Notifications** | `/api/notifications/*` | Telegram order alerts, buyer notification relays, and webhook endpoints. |
| **Health Probe** | `/health` | Container and load-balancer health probe returning minimal `{ "status": "ok" }`. |

---

## Commerce Standards & Data Invariants

### 1. Money and Currency Representation
- All monetary amounts in requests and responses are represented as **two-decimal numeric strings** (e.g., `"25.00"`, `"150.50"`).
- Internal arithmetic and database storage use integer cents (e.g., `2500` cents = `$25.00`).
- The base operational currency is strictly `"USD"`.

### 2. Tenancy and Entity Separation
- **Merchant / Tenant (`merchantId`)**: Identifies the business owner.
- **Store (`storeId`)**: Canonical commerce entity owning products, inventory, and fulfillment settings. A merchant can sell directly in the marketplace without creating a website.
- **Website (`websiteId`)**: Optional digital storefront channel linked to a store.
- Products belong canonically to the `Store`. Both merchant storefronts and the shared marketplace show the same canonical product, price, and inventory state.

### 3. Idempotency Mechanisms
- **Marketplace & Storefront Checkout**: Enforces idempotency via the `Idempotency-Key` HTTP header (or `idempotencyKey` body property), stored in database column `checkoutKey` (up to 64 characters).
  - Replays with identical parameters return the existing order.
  - Replays with mismatched request parameters return HTTP 409 Conflict.
- **Buyer Issue Reports**: Buyer disputes require an `eventKey` for duplicate suppression.

### 4. Security Schemes & Authentication Model
- `bearerAuth` — Standard `Authorization: Bearer <jwt>` accepted on API routes.
- `customerAccessTokenCookie` — HTTP-only cookie (`customerAccessToken`) for storefront customers.
- `customerRefreshTokenCookie` — HTTP-only cookie (`customerRefreshToken`) for storefront customer session renewal.
- `userAccessTokenCookie` — HTTP-only cookie (`userAccessToken`) for Core merchant and admin identities.
- `userRefreshTokenCookie` — HTTP-only cookie (`userRefreshToken`) for Core token refresh.
- `staffAccessTokenCookie` — HTTP-only cookie (`staffAccessToken`) for merchant store staff.
- `staffRefreshTokenCookie` — HTTP-only cookie (`staffRefreshToken`) for staff session renewal.
- `serviceTokenHeader` — `X-Service-Token` header for trusted service-to-service calls.
- `opsTokenHeader` — `X-Platform-Ops-Token` header protecting operator endpoints under `/api/ops/*` and `/api/admin/operations/*`.

---

## Validated Examples

The Commerce contract embeds complete, schema-validated examples for key commerce workflows:

1. **Marketplace COD Checkout**:
   - Schema: `MarketplaceCheckoutRequest` & `MarketplaceCheckoutResponse`
   - Request: Buyer contact info, shipping address (Phnom Penh, Cambodia), items with store and product IDs, flat delivery fee calculation, and `idempotencyKey`.
   - Response: Order status `pending`, payment method `cod`, tracking number, payment status `unpaid`, delivery fee, items subtotal, and total amount.

2. **Storefront COD Checkout**:
   - Schema: `StorefrontCheckoutRequest` & `StorefrontCheckoutResponse`
   - Scoped to `websiteId` with website-level customer identity, stock reservation, and order creation.

3. **Shopping Cart Responses**:
   - Marketplace Cart: Multi-store item aggregation, items count, subtotal, and guest session ID.
   - Storefront Cart: Single-store cart with quick-add variant attributes and website projection.

4. **Catalog & Inventory Availability**:
   - Product details: Title, description, price (`"25.00"`), stock quantity, category association, and omnichannel availability across storefront and central marketplace.

---

## Proven Code Limitations & Discrepancies

During rigorous line-by-line inspection of controllers, models, and middleware, the following runtime constraints and discrepancies were documented:

1. **Unproven CutLuy Payment Provider**:
   - `CUTLUY` is present as an allowed enum value in `modules/payments/paymentConfigEncryption.js`.
   - However, no active CutLuy runtime payment adapter exists in `PaymentController.js` or `BakongKhqrPaymentGateway.js`.
   - The contract explicitly annotates this provider with `x-implementation-status: unproven-provider-adapter` and notes that only Bakong KHQR and COD are functional at runtime.

2. **Checkout Runtime Gating**:
   - Marketplace and storefront checkout routes are gated at runtime by `modules/checkout/marketplaceCheckoutGate.js`.
   - Checkout write operations require `MARKETPLACE_COD_CHECKOUT_ENABLED=true` or `STOREFRONT_COD_CHECKOUT_ENABLED=true` in environment configuration.
   - When disabled, endpoints return HTTP 503 Service Unavailable with `{ "message": "Checkout is temporarily disabled" }`.

3. **Overloaded Express Route Patterns**:
   - `GET /api/categories/:websiteId` (storefront category listing) and `PUT /api/categories/:id` (category update) share the Express pattern `/:param`. In the OpenAPI specification, they are consolidated under `/api/categories/{id}` with parameter documentation explaining the dual usage.
   - `DELETE /api/marketplace/cart/items/:id` and `PATCH /api/marketplace/cart/items/:itemId` are consolidated under `/api/marketplace/cart/items/{itemId}`.
