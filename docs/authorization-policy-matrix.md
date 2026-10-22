# Release 1 Authorization Policy Matrix

**Document ID:** P2-AUTHZ-001  
**Status:** Canonical Release 1 Specification  
**Canonical Machine-Readable Matrix:** [`docs/security/authorization-matrix.json`](security/authorization-matrix.json)  
**Dependencies:** [`docs/identity-subject-model.md`](identity-subject-model.md), [`docs/decisions/release-1-register.md`](decisions/release-1-register.md), [`docs/platform-architecture.md`](platform-architecture.md), [`docs/openapi/`](openapi/README.md)

---

## 1. Executive Summary

This document establishes the canonical, version-controlled **Release 1 Authorization Policy Matrix** across the Rentify Core (`rentify-server`) and Commerce (`ecommerce-server`) platforms. 

The machine-readable matrix at [`docs/security/authorization-matrix.json`](security/authorization-matrix.json) programmatically classifies **100% of the 234 active Release 1 HTTP operations** (96 Core operations and 138 Commerce operations) across 20 distinct resource domains.

The matrix is enforced via continuous repository verification (`npm run verify:authz` integrated into `npm run verify:repository`). Any pull request or commit that introduces an unclassified route or modifies an operation's security boundary without updating the matrix will immediately fail verification.

---

## 2. Core Security & Governance Principles

1. **Deny by Default:**  
   Every endpoint, resource, and action is denied unless an explicit, matching permission rule is defined. If a request presents an unknown route, unmapped actor, or missing claim, access is strictly rejected (`401 Unauthorized` or `403 Forbidden`).

2. **No Reliance on Frontend Hiding:**  
   UI element disabling, hidden buttons, or route guards in `rentify-frontend`, `marketplace-frontend`, or `admin-frontend` are considered presentation conveniences only. All tenant isolation, ownership invariants, role checks, and permission gates are enforced authoritatively in backend Express middleware and service controllers.

3. **Strict Separation of Store vs. Website Authorization:**  
   As established in `AGENTS.md` and `P2-ID-001`, Store ownership governs products, inventory, orders, POS, and fulfillment; Website ownership governs templates, CMS components, and custom domains. Merchants who operate exclusively on the central marketplace interact with Store resources without ever creating a Website.

4. **Contextual Role Derivation & Credential Precedence:**  
   Identity and role context are derived strictly from cryptographically verified tokens and session cookies (`req.user.id`, `req.staff.id`, `req.staff.merchantId`). Mismatched or conflicting credentials (e.g. Bearer token belonging to user A sent with session cookie belonging to user B) are rejected with `401 Unauthorized`.

5. **Integrity Preservation & Gap Tracking:**  
   Per Phase 2 governance, existing route behaviors are not bulk-modified in P2-AUTHZ-001. Instead, existing legacy routes with authorization limitations are explicitly recorded as **gaps** in the matrix and slated for structured remediation slices in `P2-AUTHZ-002`. Existing security restrictions are never weakened.

---

## 3. The 11 Actor Archetypes

The matrix evaluates every resource and action against 11 standardized actor archetypes:

| Actor Archetype | Subject Type | Role / Context | Description & Authority Scope |
| :--- | :--- | :--- | :--- |
| **`storeOwner`** | `user` | `seller` | Authenticated merchant owner who owns the target store resource (`user.id === store.merchantId`). Full management of catalog, orders, staff, settings, websites, and billing. |
| **`permittedStaff`** | `staff` | `staff` | Authenticated store staff member with explicit permission (`products`, `orders`, `settings`) for the target store. Allowed on scoped operational endpoints; denied on owner-only actions. |
| **`unpermittedStaff`** | `staff` | `staff` | Authenticated store staff member lacking the required permission for the requested action. Denied with `403 Forbidden`. |
| **`unrelatedMerchant`** | `user` | `seller` | Authenticated merchant who owns a different store. Denied with `403 Forbidden` or `404 Not Found` when accessing resources belonging to another merchant. |
| **`resourceBuyer`** | `user` / `customer` | `buyer` | Authenticated buyer who created and owns the target cart, order, complaint report, or review (`user.id === order.buyerId`). |
| **`differentBuyer`** | `user` / `customer` | `buyer` | Authenticated buyer attempting to view or alter another buyer's private orders, cart items, or profile. Denied with `403 Forbidden` / `404 Not Found`. |
| **`publicUser`** | `public` | None | Anonymous caller presenting no credentials. Allowed strictly on public read endpoints (`/health`, `/ready`, marketplace catalog, public store profiles); denied with `401 Unauthorized` on all others. |
| **`suspendedActor`** | `user` | `suspended` | Authenticated actor whose account or store has been placed in suspended status. Denied on all mutations (`403 Forbidden`); allowed 90-day read-only dashboard access per DEC-020. |
| **`platformAdmin`** | `user` | `admin` | Authenticated platform operator (`user.role === 'admin'`). Permitted on platform moderation, seller KYC reviews, ops telemetry, and system templates. Restricted from unauthorized buyer impersonation. |
| **`revokedSession`** | `revoked` | None | Caller presenting an expired, rotated, or blacklisted token or session. Denied with `401 Unauthorized` on all protected endpoints. |
| **`ambiguousMultiRole`** | `user` | Multi | Subject presenting mismatched or conflicting credentials across roles. Rejected with `401 Unauthorized: Conflicting credentials provided`. |

---

## 4. Operation Coverage by Resource Domain

All 234 operations are categorized across 20 canonical resource domains:

| Resource Domain | Core Operations | Commerce Operations | Total Operations | Primary Authoritative Middleware |
| :--- | :---: | :---: | :---: | :--- |
| **Identity and sessions** | 16 | 13 | 29 | `auth.js`, `verifyToken`, `authMiddleware.js` |
| **Stores** | 7 | 3 | 10 | `auth.js`, `verifyStoreAccess.js` |
| **Websites** | 15 | 3 | 18 | `auth.js`, `websiteController.js` |
| **Staff** | 13 | 0 | 13 | `auth.js`, `authStaff.js`, `verifyStaffToken.js` |
| **Packages and subscriptions** | 7 | 0 | 7 | `auth.js`, `subscriptionService.js` |
| **Deployments and domains** | 8 | 0 | 8 | `auth.js`, `hostedSubdomainService.js` |
| **Products and variants** | 0 | 25 | 25 | `authStaff.js`, `storeCatalogController.js` |
| **Categories** | 1 | 5 | 6 | Public read / `auth.js` mutation |
| **Inventory** | 0 | 2 | 2 | `authStaff.js`, `productController.js` |
| **Carts** | 0 | 18 | 18 | `verifyCoreBuyer`, `sessionIdCookie` |
| **Orders** | 0 | 27 | 27 | `verifyCoreBuyer`, `authStaff.js` (`orders` permission) |
| **Invoices** | 0 | 2 | 2 | `auth.js`, `invoiceController.js` |
| **POS** | 0 | 6 | 6 | `authStaff.js` (`orders` permission) |
| **Payments and COD** | 0 | 7 | 7 | `verifyCoreBuyer`, `marketplaceCheckoutService.js` |
| **Returns and complaints** | 0 | 2 | 2 | `verifyCoreBuyer` |
| **Media** | 3 | 0 | 3 | `auth.js`, `uploadStoreProductImages` |
| **Notifications** | 4 | 2 | 6 | `serviceTokenHeader`, `auth.js` |
| **Usage** | 0 | 5 | 5 | `auth.js`, `usageController.js` |
| **Admin moderation** | 9 | 6 | 15 | `adminAuth.js`, `verifyCoreAdmin.js` |
| **Operational and reconciliation** | 13 | 19 | 32 | `internalSecretHeader`, `opsTokenHeader` |
| **Total Active Operations** | **96** | **138** | **234** | **100% Classified** |

---

## 5. Recorded Authorization Gaps (Slated for P2-AUTHZ-002)

The audit discovered 14 legacy routes in `ecommerce-server` where access is currently scoped by presentation constructs (`websiteId`) or lacks granular staff permission validation. These are documented directly in the matrix with `currentImplementationStatus: 'gap'` and slated for resolution in `P2-AUTHZ-002`:

1. **Legacy Product Scoping by Website (`/api/product/{websiteId}*` — 10 operations):**  
   - *Operations:* `post_api_product_websiteId`, `put_api_product_websiteId_productId`, `delete_api_product_websiteId_productId`, `patch_api_product_websiteId_productId_inventory`, `post_api_product_websiteId_bulk`, `patch_api_product_websiteId_bulk`, `post_api_product_websiteId_bulk_csv`, `get_api_product_websiteId_manage_config`, `get_api_product_websiteId_manage_products`, `get_api_product_websiteId_manage_products_productId`.  
   - *Gap:* Endpoints authenticate merchant ownership via `userAccessToken` but do not support store staff permission tokens (`authStaff` with `products` permission) and operate on `websiteId` rather than canonical `storeId`.  
   - *Target:* P2-AUTHZ-002 slice for Store-Centric Catalog Authorization.

2. **Legacy POS Orders by Website (`/api/order/websites/{websiteId}/orders/pos` — 2 operations):**  
   - *Operations:* `get_api_order_websites_websiteId_orders_pos`, `post_api_order_websites_websiteId_orders_pos`.  
   - *Gap:* Operates on `websiteId` instead of canonical `storeId`. Store-centric POS endpoints (`/api/stores/{storeId}/orders/pos`) already exist; the website-keyed aliases require deprecation/forwarding.  
   - *Target:* P2-AUTHZ-002 slice for POS Authorization Unification.

3. **Legacy Invoices by Website (`/api/invoice/websites/{websiteId}/invoices` — 1 operation):**  
   - *Operation:* `get_api_invoice_websites_websiteId_invoices`.  
   - *Gap:* Scoped by `websiteId` rather than `storeId`.  
   - *Target:* P2-AUTHZ-002 slice for Invoices and Settlement Authorization.

4. **Website Analytics and Stats Scoping (`/ecommerce/stats/websites/{websiteId}` — 1 operation):**  
   - *Operation:* `get_ecommerce_stats_websites_websiteId`.  
   - *Gap:* Validates token presence but does not verify that the authenticated caller owns the referenced `websiteId`.  
   - *Target:* P2-AUTHZ-002 slice for Store Telemetry and Analytics Scoping.

---

## 6. Verification and Continuous Governance

The matrix is verified deterministically in CI via:

```bash
# Validate matrix format, 100% operation coverage, and run 12 table-driven security suites
npm run verify:authz
```

### Table-Driven Security Test Coverage (`tools/authz/test/authorizationMatrix.test.js`):
- **100% OpenAPI Coverage:** Asserts that every operation in `core.openapi.yaml` and `commerce.openapi.yaml` has an authoritative matrix entry (0 unmapped).
- **Deny by Default:** Verifies that unknown operations, invalid actors, or unmapped routes evaluate to strict denial (`deny_403` or `deny_401`).
- **All 11 Actor Cases:** Programmatically executes matrix decision tables across Store Owners, Permitted Staff, Unpermitted Staff, Unrelated Merchants, Resource Buyers, Different Buyers, Public Users, Suspended Actors, Platform Admins, Revoked Sessions, and Ambiguous Multi-Role Subjects.
- **Gap Tracking:** Verifies that all 14 identified gaps remain cleanly documented and mapped to `P2-AUTHZ-002`.
