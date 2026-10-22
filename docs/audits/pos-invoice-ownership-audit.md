# POS and Invoice Store Ownership Audit (P2-AUTHZ-002)

**Status**: Verified & Enforced  
**Slice**: P2-AUTHZ-002 (POS and Invoices)  
**Authority**: `ecommerce-server`  
**Date**: October 23, 2026  
**Target Invariant**: Strict Store-Scoping, Role & Permission Enforcement, Zero Direct-ID Guessing, Safe Public Access Boundaries  

---

## 1. Executive Summary

This audit establishes authoritative ownership rules and runtime access control enforcement for Point-of-Sale (POS) operations, order receipts, customer invoices, and POS/invoice-related store sales summaries in Rentify's commerce platform.

In accordance with Phase 2 requirements (P2-AUTHZ-002: POS and Invoice Slice):
- **Store-Partitioned Invariant**: Every POS order, invoice record, receipt, and sales analytics query resolves strictly to exactly one canonical Store (`storeId`).
- **Channel Decoupling**: Websites serve as optional channel context, never as merchant identity or ownership authority.
- **Explicit Staff Permissions**: Staff members require explicit permissions (`pos`, `manage_pos` for POS actions; `invoice`, `invoices`, `manage_invoices` for invoices; `analytics`, `manage_analytics` for sales summaries). Staff lacking explicit permission receive `403 Store access denied`.
- **Anti-Enumeration & Direct-ID Guessing Prevention**: Invoice PDFs and receipt endpoints reject cross-store or cross-buyer lookups with `404 Not Found` (rather than 403) to eliminate identifier guessing and enumeration vulnerabilities.
- **Public Invoice Access Control**: Public access to invoice PDFs requires an approved unguessable token; in Release 1, public sharing tokens remain disabled, and unauthenticated requests return `401 Authentication required`.
- **Request Body Tamper Resistance**: Body-supplied parameters (`storeId`, `merchantId`, `ownerId`) cannot select or override the target Store; attempts to override the authorized Store yield `403 Cross-store body selection prohibited`.
- **Platform Admin Audit Events**: Platform administrators retain operational access following the Release 1 policy matrix; all admin override and operation executions automatically generate structured `ADMIN_OVERRIDE` or `ADMIN_OPERATION` audit events.
- **Preserved Transaction Logic**: Transactional stock deductions, status updates, and KHQR counter payments remain intact without preempting Phase 3 money and inventory redesigns.

---

## 2. Entity & Operation Inventory

| Resource / Endpoint | Method | Primary Model | Tenant Scoping Anchor | Required Actor / Role | Required Permission | Denial Code |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Store POS Checkout** (`/api/stores/:storeId/orders/pos`) | `POST` | `Order`, `Payment`, `Invoice` | `storeId` | Store Owner / Staff | `pos`, `manage_pos` | `403` / `404` |
| **Store POS Orders List** (`/api/stores/:storeId/orders/pos`) | `GET` | `Order` | `storeId` | Store Owner / Staff | `pos`, `manage_pos` | `403` / `404` |
| **Website POS Checkout** (`/api/order/websites/:websiteId/orders/pos`) | `POST` | `Order`, `Payment`, `Invoice` | `WebsiteData.storeId` | Store Owner / Staff | `pos`, `manage_pos` | `403` / `404` |
| **Website POS Orders List** (`/api/order/websites/:websiteId/orders/pos`) | `GET` | `Order` | `WebsiteData.storeId` | Store Owner / Staff | `pos`, `manage_pos` | `403` / `404` |
| **Create Invoice** (`/api/order/websites/:websiteId/orders/invoice`) | `POST` | `Order`, `Invoice` | `WebsiteData.storeId` | Store Owner / Staff | `invoice`, `invoices` | `403` / `404` |
| **List Invoices** (`/api/invoice/websites/:websiteId/invoices`) | `GET` | `Invoice` | `WebsiteData.storeId` | Store Owner / Staff | `invoice`, `invoices` | `403` / `404` |
| **Download Invoice PDF** (`/api/invoice/invoices/:invoiceId/pdf`) | `GET` | `Invoice` | `Invoice.storeId` | Owner / Staff / Buyer | `invoice`, `invoices` | `404` / `401` |
| **Store Sales Summaries** (`/ecommerce/stats/websites/:websiteId`) | `GET` | `Order` | `WebsiteData.storeId` | Store Owner / Staff | `analytics`, `manage_analytics` | `403` / `404` |
| **Platform Sales Admin** (`/ecommerce/stats/admin`) | `GET` | Aggregated Orders | Global | Platform Admin | Admin Role | `403` |

---

## 3. POS & Invoice Store Scoping Architecture

### 3.1 Store Identity Resolution
1. **Direct Store POS Routes**: The `:storeId` parameter maps to `StoreAccess`. The middleware `createRequireStoreAccess` validates that the caller owns the store (`store.ownerUserId === req.user.id`) or is a member of the store staff (`req.user.merchantId === store.ownerUserId`).
2. **Channel Website POS & Invoice Routes**: When `:websiteId` is supplied, `WebsiteData.findOne` extracts `website.storeId`. The middleware verifies that the store exists and is active (`store.status === 'active'`).
3. **Decoupling Rule**: A website identifier never grants merchant permissions by itself; ownership must resolve to the backing `StoreAccess` record.

### 3.2 Request Body Override Resistance
In `OrderController.createPOSOrder` and `OrderController.createInvoice`:
```javascript
// Guard against body-parameter cross-store / cross-merchant spoofing
const bodyStoreId = req.body?.storeId;
if (bodyStoreId && effectiveStoreId && bodyStoreId !== effectiveStoreId) {
  return res.status(403).json({ error: "Cross-store body selection prohibited" });
}
const bodyMerchantId = req.body?.merchantId || req.body?.ownerId;
if (bodyMerchantId && store && bodyMerchantId !== store.ownerUserId) {
  return res.status(403).json({ error: "Cross-merchant body selection prohibited" });
}
```
Attackers cannot redirect order or invoice attribution to another store by injecting `storeId` or `merchantId` in request payloads.

---

## 4. Invoice Access Control & Anti-Guessing Defense

### 4.1 Direct-ID Guessing Prevention (`404 Not Found`)
In `requireInvoiceAccess`:
1. When a merchant or staff member queries an `invoiceId`:
   - If the invoice belongs to Store B and Merchant A accesses it, the middleware returns `404 Not Found` (`Invoice not found`) rather than 403.
   - This eliminates cross-store invoice enumeration: an attacker scanning UUIDs cannot differentiate between non-existent invoices and invoices belonging to other merchants.
2. If the user is a staff member of the *same* Store but lacks invoice permissions, the middleware returns `403 Store access denied`.
3. If the user is a customer/buyer, access is granted if and only if the buyer owns the associated order (`order.buyerId === user.id || order.userId === user.id`). Any other buyer receives `404 Not Found`.

### 4.2 Public Token Enforcement
In accordance with Release 1 security requirements:
- Public invoice access requires an approved, unguessable cryptographic token (`?token=...`).
- Because unguessable public invoice sharing tokens are not yet deployed in Release 1, all unauthenticated requests return `401 Authentication required`.
- Guessed tokens return `401 Public invoice access is not enabled`.

---

## 5. Platform Admin Audit Trail

When platform administrators access store resources or operational routes:
1. Access is granted in compliance with the Release 1 Authorization Policy Matrix (`adminOverridePolicy: "allow"`).
2. Every administrative override logs a structured event with the operator's ID, resource ID, route, and method:
   ```json
   {
     "level": "info",
     "message": "AUDIT: Platform admin override access to store",
     "auditEvent": "ADMIN_OVERRIDE",
     "adminUserId": "admin-super",
     "storeId": "11111111-1111-4111-8111-111111111111",
     "timestamp": "2026-10-23T00:27:02.000Z"
   }
   ```
3. Non-administrative users attempting admin operations receive `403 Platform admin access required`.

---

## 6. Verification and Test Results

All security controls and ownership invariants are verified by automated tests:

| Test Suite | Spec File | Coverage | Status |
| :--- | :--- | :--- | :--- |
| **POS Actor Matrix** | `test/security/posInvoiceStoreOwnership.test.js` | Owner, permitted staff, unpermitted staff, unrelated merchant, suspended actor, suspended store, buyer, public, admin | **PASS** (100%) |
| **Invoice Actor Matrix** | `test/security/posInvoiceStoreOwnership.test.js` | Store owner, permitted staff, unpermitted staff, unrelated merchant, suspended actor, buyer, public, admin | **PASS** (100%) |
| **Invoice PDF Anti-Guessing** | `test/security/posInvoiceStoreOwnership.test.js` | Direct-ID guessing rejection (404), unauthenticated (401), token defense, buyer ownership | **PASS** (100%) |
| **Body Override Resistance** | `test/security/posInvoiceStoreOwnership.test.js` | Cross-store & cross-merchant body injection rejection (403) | **PASS** (100%) |
| **Admin Audit Logging** | `test/security/posInvoiceStoreOwnership.test.js` | Audit log event emission on admin override | **PASS** (100%) |
| **Commerce Full Verification** | `npm run verify:commerce` | Lint, typecheck, 90 unit tests, 16 integration tests, OpenAPI verification & diff | **PASS** (100%) |
| **Repository Policy** | `npm run verify:repository` | Secret scanning, migrations, contracts, tokens, host validation, authz matrix | **PASS** (100%) |
