# Release 1 Golden Journey Specifications

**Document ID:** P0-004
**Status:** Proposed for approval in this PR
**Target Release:** Rentify Release 1 (COD Commerce)
**Standard Format:** Given / When / Then with Invariants, Edge Cases, Accessibility, and Localization

---

## Specification Overview

These five golden journeys represent the core end-to-end customer, operational, and financial lifecycles that define a successful, trustworthy Release 1. Every future work package in P1–P9 must conform to the invariants and behaviors specified here.

---

## Golden Journey 1: Marketplace-Only Merchant to Completed COD Order

### 1.1 Customer Outcome
An informal or social media seller creates a Store without building a website, receives admin marketplace approval, lists a handcrafted product, and fulfills a real Cash on Delivery order placed by a marketplace buyer.

### 1.2 Preconditions & Fixtures
- Platform services running with database migrations applied.
- Platform admin account exists: `admin@rentify.local` (role: `ADMIN`).
- Buyer account exists: `buyer@local.test` (phone: `+85512345678`).
- Shared marketplace categories seeded (e.g. `Handicrafts`, `Fashion`).
- Standard delivery fee configured: `$1.50` local flat rate.

### 1.3 Given / When / Then Specification

#### Scenario 1.1: Merchant Registration & Store Creation
- **Given** an unauthenticated visitor navigates to the merchant onboarding portal,
- **When** the visitor submits valid registration details (name, email, password, phone `+85598765432`) and chooses the "Marketplace Only" entry path,
- **Then** Core API creates a `User` record (role `MERCHANT`) and an associated `Store` record with `websiteId = NULL`, `sellerApprovalStatus = 'pending'`, and `marketplaceEnabled = true`,
- **And** no `Website` record is created,
- **And** a Core-to-Commerce outbox sync entry is queued for the new Store.

#### Scenario 1.2: Admin Verification & Approval
- **Given** a merchant Store in `pending` approval status,
- **When** a platform admin reviews the 7-point checklist (phone verified, email verified, national ID, pickup location, contact info, sample product, signed COD policy) in `admin-frontend` and clicks "Approve Seller",
- **Then** Core API updates `Store.sellerApprovalStatus = 'approved'`,
- **And** emits an audit log `STORE_APPROVED` with the admin's user ID,
- **And** triggers an outbox projection to Commerce `StoreAccess` with `isApproved = true`.

#### Scenario 1.3: Product Creation & Publication
- **Given** an approved marketplace-only merchant authenticated in `rentify-frontend`,
- **When** the merchant creates a product "Handwoven Silk Scarf", sets price `$25.00`, stock `10`, category `Handicrafts`, uploads an HTTPS image, and saves,
- **Then** Commerce API inserts a canonical `Product` record linked to `storeId`, with `marketplaceStatus = 'active'`,
- **And** the product becomes immediately visible in search and category listings on `rentifymarket.com`.

#### Scenario 1.4: Buyer Checkout & Order Placement
- **Given** a marketplace buyer browsing `rentifymarket.com` on a 360px mobile viewport,
- **When** the buyer adds 2 units of "Handwoven Silk Scarf" to cart, enters delivery address in Phnom Penh, selects "Cash on Delivery", and clicks "Place Order",
- **Then** Commerce API verifies stock availability (`stock >= 2`),
- **And** creates an `Order` record with `status = 'pending'`, `paymentStatus = 'unpaid'`, `paymentMethod = 'cod'`, subtotal `$50.00`, delivery fee `$1.50`, gross total `$51.50`,
- **And** atomically reserves 2 units of stock (`stock` becomes `8`),
- **And** generates an itemized `Invoice` referencing the Store's business name and contact,
- **And** sends an in-app and Telegram notification to the merchant.

#### Scenario 1.5: Merchant Fulfillment & Delivery Confirmation
- **Given** an order in `pending` status,
- **When** the merchant packages the item, dispatches via local courier, and updates order status to `shipped`,
- **Then** order status history records transition `pending -> shipped`,
- **And** the buyer receives an order tracking status update.

#### Scenario 1.6: Courier Cash Collection & Order Completion
- **Given** a dispatched COD order,
- **When** the courier delivers the package to the buyer, collects `$51.50` in cash, and the merchant confirms receipt in their dashboard by marking the order `delivered`,
- **Then** the merchant clicks "Record Cash Payment",
- **And** Commerce API transitions `Order.status = 'delivered'` and `Order.paymentStatus = 'paid'`,
- **And** inserts a `Payment` record with `amount = 51.50`, `currency = 'USD'`, `method = 'cod'`,
- **And** records a `UsageEvent` for order completion,
- **And** the reserved stock deduction is permanently finalized in the inventory ledger.

### 1.4 Financial & Inventory Invariants
- **Financial State:** Order gross total must equal `subtotal + delivery_fee - discounts`. Delivery fee belongs entirely to merchant. Zero platform commission or escrow deduction in Release 1. Order remains `unpaid` until cash collection is explicitly recorded.
- **Stock State:** Stock is atomically reserved at order submission using database row locks (`SELECT ... FOR UPDATE`). Stock deduction is finalized upon delivery. If the order is cancelled prior to delivery, reserved stock is restored.

### 1.5 Localization & Accessibility (360px Viewport)
- **Khmer / English:** All order states rendered in both languages (e.g. `ទំនិញត្រូវបានបញ្ជូន` / `Shipped`, `រង់ចាំការទូទាត់` / `Pending Payment`).
- **Mobile & A11y:** Order details readable on 360px width without horizontal scroll; minimum 44x44px touch targets for action buttons; screen-reader accessible status badges (`role="status"`).

### 1.6 Edge Cases & Failure Modes
- **Unauthorized Tenant Access:** Merchant B attempts to view or update Merchant A's order (`PATCH /api/order/:id/status`). Server responds `403 FORBIDDEN` and logs security audit event.
- **Duplicate Checkout Submission:** Buyer double-taps "Place Order". Client generates a unique UUID `Idempotency-Key` header; server processes first request and safely returns existing order on duplicate replay.
- **Stock Depletion Race:** Stock drops to 1 before buyer submits order for 2 units. Server rolls back transaction, returns `409 CONFLICT` with message "Insufficient stock available", and prompts buyer to adjust quantity.

---

## Golden Journey 2: Storefront Merchant Selling One SKU Across Both Channels

### 2.1 Customer Outcome
A brand merchant creates a Store, selects a modern storefront template, receives a hosted subdomain (`aura.rentifystore.shop`), and publishes one SKU with shared inventory that sells simultaneously on both their private storefront and the central marketplace.

### 2.2 Preconditions & Fixtures
- Merchant account created with Starter Storefront plan (14-day trial).
- Store created with linked `Website` (`templateId = 'template-1'`, `subdomain = 'aura'`).
- Merchant is approved for marketplace selling (`sellerApprovalStatus = 'approved'`).
- Product "Organic Facial Serum" published with SKU `OFS-001`, price `$18.00`, initial stock `5`.
- Product marketplace visibility switch enabled (`marketplaceStatus = 'active'`).

### 2.3 Given / When / Then Specification

#### Scenario 2.1: Omnichannel Stock Synchronization
- **Given** a product "Organic Facial Serum" with stock `5`,
- **When** a buyer purchases 2 units via the hosted storefront `aura.rentifystore.shop`,
- **Then** Storefront checkout atomically deducts 2 units from `Products.stock`, leaving `3` units,
- **And** an inquiry to the central marketplace API (`GET /api/product/:id`) immediately reports `stock = 3`,
- **And** both channels reflect the exact same inventory count without delay.

#### Scenario 2.2: Channel Visibility Override
- **Given** a product listed on both channels,
- **When** the merchant toggles off the "List on Marketplace" switch in their dashboard,
- **Then** Commerce API updates `Product.marketplaceStatus = 'hidden'`,
- **And** the product is immediately delisted from search and category pages on `rentifymarket.com`,
- **And** the product remains 100% active and purchasable on `aura.rentifystore.shop`.

### 2.4 Financial & Inventory Invariants
- Single canonical stock row in `rentify_ecommerce.Products` represents the total physical inventory across all channels.
- Subdomain requests resolve to `Website.id` and map to `Store.id`; marketplace requests resolve directly via `Product.storeId`.

### 2.5 Localization & Accessibility
- Storefront template renders semantic HTML with responsive fluid typography down to 360px.
- Language switcher toggles full store content between Khmer and English.

### 2.6 Edge Cases & Failure Modes
- **Storefront Offline / Suspended:** If merchant subscription expires past grace period, storefront displays maintenance screen; marketplace listing automatically transitions to `hidden`.

---

## Golden Journey 3: POS and Online Buyers Competing for the Final Unit

### 3.1 Customer Outcome
A retail merchant operates a physical counter with the Rentify POS terminal while online buyers browse the marketplace. When only 1 unit remains, the system prevents overselling, awarding the item to the first completed checkout and immediately locking out the runner-up.

### 3.2 Preconditions & Fixtures
- Store has exactly 1 unit of "Handcrafted Ceramic Mug" (SKU `HCM-001`, stock = `1`).
- Cashier logged into `rentify-frontend` POS interface on counter tablet.
- Online buyer has "Handcrafted Ceramic Mug" in their marketplace cart on mobile.

### 3.3 Given / When / Then Specification

#### Scenario 3.1: Concurrent Checkout Race
- **Given** stock is `1`,
- **When** the counter cashier scans the barcode and taps "Charge Cash $12.00" at `T0`,
- **And** the online buyer taps "Place Order (COD)" at `T0 + 50ms`,
- **Then** POS transaction obtains database row lock (`SELECT stock FROM Products WHERE id = ... FOR UPDATE`),
- **And** POS order completes successfully, deducting stock from `1` to `0`,
- **And** order status is immediately marked `delivered` and `paid` (`salesChannel = 'pos'`),
- **And** when the online buyer's transaction evaluates, stock is `0`,
- **Then** online checkout transaction safely rolls back,
- **And** returns `409 CONFLICT` with standard error envelope:
```json
{
  "error": {
    "code": "OUT_OF_STOCK",
    "message": "This item was just purchased by another customer.",
    "retryable": false
  }
}
```
- **And** the product automatically transitions to `out_of_stock` across all public catalogs.

### 3.4 Financial & Inventory Invariants
- Total inventory can never drop below `0`.
- POS cash orders record immediate full payment and zero shipping fee (`shippingFee = 0.00`).
- Inventory transactions log both operations with accurate timestamps and actor identities.

### 3.5 Offline POS Operation & Recovery
- **Given** physical store network disconnects during a counter transaction,
- **When** cashier records an offline cash sale,
- **Then** POS client stores transaction in local IndexedDB queue,
- **And** when network reconnects, POS synchronizes queued sales in strict chronological sequence,
- **And** if an online order took the stock while POS was offline, a reconciliation discrepancy event `STOCK_OVERDRAFT_ALERT` is raised for store manager review.

---

## Golden Journey 4: Buyer Return / Complaint Through Direct Refund and Support Closure

### 4.1 Customer Outcome
A buyer receives a defective item, opens a dispute within 7 days with photos, the merchant agrees to take the item back, issues a direct cash/Bakong refund upon receipt, and the case is resolved transparently.

### 4.2 Preconditions & Fixtures
- Completed order exists: Order `#ORD-8891`, status `delivered`, payment status `paid`.
- Order delivery timestamp is 3 days ago (within the 7-day eligibility window).

### 4.3 Given / When / Then Specification

#### Scenario 4.1: Dispute Filing
- **Given** an eligible delivered order,
- **When** buyer navigates to order history, clicks "Report an Issue", uploads 2 photos of damage, selects reason `DAMAGED_ON_ARRIVAL`, and submits,
- **Then** Commerce API creates a `BuyerReport` record (status `open`),
- **And** transitions `Order.status = 'disputed'`,
- **And** notifies merchant with a 48-business-hour response deadline.

#### Scenario 4.2: Merchant Acceptance & Item Return
- **Given** an open dispute,
- **When** merchant reviews buyer photos, clicks "Accept Return", and provides courier pickup instructions,
- **Then** `BuyerReport.status` transitions to `return_approved`,
- **And** courier collects defective item and returns it to merchant warehouse.

#### Scenario 4.3: Direct Refund Execution
- **Given** merchant has physically received the returned merchandise,
- **When** merchant transfers `$25.00` directly to buyer's Bakong account and enters transaction reference `REF-BK-9912` in Rentify dashboard,
- **Then** Commerce API creates a `Refund` record with `amount = 25.00`, `method = 'bakong_manual'`, `reference = 'REF-BK-9912'`,
- **And** transitions `Order.status = 'refunded'`, `Order.paymentStatus = 'refunded'`, `BuyerReport.status = 'resolved'`,
- **And** closes the dispute case with full audit trail.

### 4.4 Financial & Support Invariants
- Platform holds zero funds; merchant executes payout directly.
- Refund amount cannot exceed original order payment total.
- Defective stock is not returned to active inventory without explicit merchant inspection.

### 4.5 Support Escalation (Tier 2)
- If merchant does not respond within 48 hours, case escalates to platform admin. Platform admin can issue seller strikes or suspend delinquent sellers from the marketplace.

---

## Golden Journey 5: Subscription Trial Through Renewal, Grace, Suspension, and Historical Access

### 5.1 Customer Outcome
A merchant signs up for a storefront, utilizes the 14-day trial, enters a 7-day grace period upon non-payment, experiences graceful public storefront suspension, and retains read-only access to historical invoices and sales records.

### 5.2 Preconditions & Fixtures
- Merchant account created on Starter Storefront plan.
- Trial subscription active: `Subscription.status = 'trial'`, `trialEndsAt = T0 + 14 days`.

### 5.3 Given / When / Then Specification

#### Scenario 5.1: Trial Expiration to Grace Period
- **Given** a trial subscription reaching `trialEndsAt` without a settled payment,
- **When** the daily subscription lifecycle cron executes,
- **Then** Core API transitions `Subscription.status = 'past_due'`,
- **And** sets `gracePeriodEndsAt = NOW() + 7 days`,
- **And** sends grace period warning notice via email and dashboard banner,
- **And** storefront and marketplace listings remain 100% active and purchasable.

#### Scenario 5.2: Grace Period Expiration to Suspension
- **Given** a subscription in `past_due` status exceeding `gracePeriodEndsAt`,
- **When** subscription cron executes,
- **Then** Core API transitions `Subscription.status = 'suspended'`,
- **And** transitions `Website.status = 'suspended'`,
- **And** queued outbox updates Commerce `StoreAccess.isSuspended = true`,
- **And** public visits to `<subdomain>.rentifystore.shop` display a polite "Store Temporarily Offline" message,
- **And** marketplace listings for the store are marked `hidden`.

#### Scenario 5.3: Read-Only Historical Dashboard Access
- **Given** a suspended merchant account,
- **When** merchant logs into `rentify-frontend` merchant dashboard,
- **Then** dashboard permits read-only access to `/orders`, `/invoices`, and `/reports`,
- **And** locks creation of new products, template edits, and staff additions,
- **And** displays an active "Reactivate Subscription" payment modal,
- **And** preserves all historical business data for a minimum of 90 days.

### 5.4 Financial & Entitlement Invariants
- Subscription transitions are idempotent and recorded in `SubscriptionAuditLogs`.
- Historical orders, invoices, and customer transaction records are immutable and preserved even during store suspension.

---

## Summary of Release 1 Contract Conformance

| Journey | Invariant Enforced | Key State Transitions | Fallback Behavior |
| :--- | :--- | :--- | :--- |
| **J1: Marketplace COD** | One-store order boundary; COD cash collection verified | `pending` -> `shipped` -> `delivered` -> `paid` | Cash uncollected -> Order stays unpaid |
| **J2: Omnichannel SKU** | Single stock truth across channels; channel override | Stock deduction shared across storefront & marketplace | Toggle marketplace off -> Storefront unaffected |
| **J3: Stock Competition** | Row-locked atomic stock deduction; zero overselling | `stock: 1` -> `stock: 0`; Runner-up `409 CONFLICT` | Offline POS -> Local queue, chronologic sync |
| **J4: Returns & Refunds**| 100% merchant financial liability; 7-day window | `delivered` -> `disputed` -> `return_approved` -> `refunded` | Unresponsive merchant -> Support escalation |
| **J5: Subscription Lifecycle**| Graceful degradation; 90-day read-only data access | `trial` -> `past_due` -> `suspended` -> `read_only` | Unpaid past grace -> Store offline, records safe |
