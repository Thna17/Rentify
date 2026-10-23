# Custom-Domain Boundary Audit (P2-HOST-003)

**Document ID:** AUD-P2-HOST-003  
**Status:** Complete  
**Date:** 2026-10-23  
**Scope:** Core API (`rentify-server`), Commerce API (`ecommerce-server`), Storefront Frontend (`rentify-frontend`), and Host Validator (`tools/host-validator`)  
**Related Documents:** [`docs/decisions/release-1-register.md`](../decisions/release-1-register.md) (DEC-003), [`docs/adr/0002-unified-buyer-identity.md`](../adr/0002-unified-buyer-identity.md), [`docs/deployment-host-validation.md`](../deployment-host-validation.md)

---

## 1. Executive Summary

Under approved Release 1 architectural decisions (**DEC-003**), merchant custom domains (`store.merchantbrand.com`) are strictly **browse-only**. Central buyer authentication, cart mutations, checkout, order placement, order history lookups, and customer account modifications on custom domains are disabled. 

All authenticated buyer flows and checkout transactions occur exclusively on verified hosted storefront subdomains under the platform parent domain:
`https://<store-subdomain>.rentifystore.shop`

This audit verifies that the boundary is fail-closed, deterministic, resistant to open-redirect and SSRF attacks, isolated from central cookies and tokens, and verified across all service tiers.

---

## 2. Threat Model & Security Boundaries

| Risk Category | Attack Vector | Mitigation / Architecture Invariant | Verification Status |
| :--- | :--- | :--- | :--- |
| **Phishing & Credential Theft** | Malicious merchant domain masquerading as platform or stealing buyer passwords/tokens. | Custom domains never receive credentials or buyer cookies. Direct sign-in/up routes on custom domains return `403 Forbidden` (`CUSTOM_DOMAIN_AUTH_DISABLED`). | **Enforced & Tested** |
| **Session Hijacking & Cookie Collision** | Cross-domain cookie leakage or third-party cookie blocking on modern iOS Safari/Android Chrome. | Central cookies are scoped strictly to `rentifystore.shop` (or `rentifymarket.com`). Third-party custom domains cannot read or set platform session cookies. | **Enforced & Tested** |
| **Checkout Tampering** | Client tampering with price, payment parameters, or inventory from untrusted origins. | Cart mutations and checkout endpoints fail closed on custom domains with `403 Forbidden` (`CUSTOM_DOMAIN_CHECKOUT_DISABLED`, `CUSTOM_DOMAIN_CART_DISABLED`). | **Enforced & Tested** |
| **Client-Supplied Host Spoofing** | Attacker submitting `req.body.domain = 'rentifystore.shop'` to bypass custom domain restrictions. | Server host classification inspects only trusted headers (`Origin`, `Referer`, `Host`). Request body parameters are completely ignored during host classification. | **Enforced & Tested** |
| **Open Redirect Vulnerability** | Attacker crafting malicious return URLs (e.g., `?returnUrl=https://attacker.com` or `https://subdomain.rentifystore.shop@attacker.com`) to siphon credentials or traffic. | `returnUrlPolicy.js` validates strictly against allowlisted platform origins. Custom domains, userinfo (`user:pass`), invalid schemes, and nested redirect parameters are rejected. | **Enforced & Tested** |
| **Accidental Production Enablement** | Engineer accidentally setting `CUSTOM_DOMAIN_CHECKOUT_ENABLED=true` in production environment. | `tools/host-validator` (Policy 7) fails closed on startup and pre-deployment if custom domain checkout or auth flags are enabled in `production` or `staging`. | **Enforced & Tested** |

---

## 3. Host Detection Precedence & Classification

Host resolution follows strict priority order from trusted HTTP headers:
1. `Origin` header (normalized lowercase, port stripped for standard 80/443, port preserved for local dev).
2. `Referer` header (parsed via `new URL()`).
3. `Host` / `X-Forwarded-Host` (when behind trusted reverse proxy).
4. Request body parameters (`req.body.domain`, `req.body.host`, `req.body.websiteId`) are **never** used to establish host context.

### Host Classification Matrix

| Host Pattern | Classification | Allowed Operations | Auth & Checkout Allowed? |
| :--- | :--- | :--- | :--- |
| `<subdomain>.rentifystore.shop` (one label) | `HOSTED_STOREFRONT` | Full storefront browse, cart, checkout, buyer account, order history. | **YES** |
| `rentifymarket.com` / `admin.rentify...` | `CENTRAL_PLATFORM` | Central marketplace & admin workflows. | **YES** |
| Registered Active Custom Domain (e.g. `boutique.com`) | `CUSTOM_DOMAIN` | Public catalog browsing only (products, categories, store info). | **NO** (Fail-closed 403) |
| Unregistered / Arbitrary Domain | `UNREGISTERED` | Denied by CORS / 403 Forbidden. | **NO** |

---

## 4. Service-by-Service Implementation

### 4.1 Core API (`rentify-server`)

- **Host Boundary Module (`src/utils/hostBoundary.js`):**
  - `extractHostFromRequest(req)`: reliably extracts host from headers.
  - `classifyHost(host, options)`: classifies into `HOSTED_STOREFRONT`, `CUSTOM_DOMAIN`, `CENTRAL_PLATFORM`, or `UNREGISTERED`.
  - `buildSafeHostedRedirectUrl(subdomain, path)`: builds exact, safe URLs to the verified hosted storefront without query or path tampering.
- **Return URL Policy (`src/modules/auth/returnUrlPolicy.js`):**
  - Rejects custom domains, credentials in URLs, and open redirect parameters.
  - Returns `isCustomDomain: false` for return URLs; enforces redirect exclusively to marketplace or verified hosted storefront subdomains.
- **Website Controller (`src/modules/websites/websiteController.js`):**
  - `getWebsiteByDomain` decorates response with `isCustomDomain`, `isHostedStorefront`, and canonical `hostedStorefrontUrl`.
- **CORS Configuration (`src/config/corsConfig.js`):**
  - Permits registered active custom domains to fetch public website data without leaking platform credentials.

### 4.2 Commerce API (`ecommerce-server`)

- **Custom Domain Boundary Middleware (`middlewares/customDomainBoundary.js`):**
  - Evaluates host boundary on protected routes.
  - For custom domains, returns HTTP 403 with machine-readable error codes:
    - `CUSTOM_DOMAIN_AUTH_DISABLED`: Buyer login/register.
    - `CUSTOM_DOMAIN_CHECKOUT_DISABLED`: Checkout initiation and order submission.
    - `CUSTOM_DOMAIN_CART_DISABLED`: Add/update/clear cart items.
    - `CUSTOM_DOMAIN_BROWSE_ONLY`: Buyer account, order history, profile updates.
  - Returns safe metadata (`hostedStorefrontUrl`, `hostedCheckoutUrl`) pointing to the verified hosted storefront so shoppers can safely navigate to complete transactions.
- **Protected Route Mount Points:**
  - `modules/auth/authRoutes.js` (Storefront customer auth)
  - `modules/cart/cartRoutes.js` (Cart mutations)
  - `modules/checkout/storefrontCheckoutRoutes.js` (Storefront checkout & customer orders)
  - `modules/orders/orderRoutes.js` (Order placement & history)
  - `modules/customers/customerRoutes.js` (Customer profile & cancellations)
- **Database Schema Migration:**
  - Migration `20261023_013_website_subdomain.js` adds `subdomain` to `WebsiteData` so Commerce can resolve canonical hosted storefront URLs without cross-service network roundtrips.

### 4.3 Host Validator (`tools/host-validator`)

- **Policy 7 Enforcement:**
  - Validates `CUSTOM_DOMAIN_CHECKOUT_ENABLED` and `CUSTOM_DOMAIN_AUTH_ENABLED`.
  - In `production` and `staging`, both must be `false` or unset. If either is `true`, startup/deployment validation fails with:
    `[Custom Domains] Custom-domain checkout must be disabled in production/staging (DEC-003)`
    `[Custom Domains] Custom-domain auth must be disabled in production/staging (DEC-003)`

### 4.4 Storefront Frontend & UI Templates (`rentify-frontend`)

- **Storefront Libs (`libs/storefront/src/website.tsx` & `cart.js`):**
  - Exposes `isCustomDomain` and `hostedStorefrontUrl`.
- **E-Commerce Templates (`ecommerce-template-1`, `2`, `3`):**
  - In `CartView.jsx` and `Checkout.jsx`, detects `isCustomDomain`.
  - Disables direct checkout form and renders explanatory notice:
    > "Checkout is completed on our secure platform domain: [Proceed to Secure Checkout ->]"
  - Directs shopper directly to `<subdomain>.rentifystore.shop/checkout`.
- **Merchant Management (`apps/core/merchant/src/pages/store-management/`):**
  - Informs merchants that registered custom domains are browse-only in Release 1, while orders and payments are secured on `*.rentifystore.shop`.

---

## 5. Automated Test Matrix & Evidence

| Test Suite | Path | Tests Run | Result |
| :--- | :--- | :--- | :--- |
| **Core Security Suite** | `rentify-server/test/security/customDomainBoundary.test.js` | 9 | **PASS** |
| **Commerce Security Suite** | `ecommerce-server/test/security/customDomainBoundary.test.js` | 9 | **PASS** |
| **Host Validator Suite** | `tools/host-validator/test/validator.test.js` | 14 | **PASS** |
| **Storefront Boundary Check** | `rentify-frontend/tools/storefront-boundary.mjs` | 4 apps | **PASS** |
| **Frontend Unit & Integration**| `rentify-frontend` (Vitest suites) | 49+ tests | **PASS** |
| **Frontend Production Builds** | All 8 apps & templates (`build:all`) | 8 packages | **PASS** |

### Key Scenarios Verified
1. **Browse Allowed on Custom Domain:** `GET /catalog/products` and `GET /websites/by-domain` succeed (200 OK).
2. **Cart Add Denied on Custom Domain:** `POST /cart/items` with custom domain `Origin` returns 403 `CUSTOM_DOMAIN_CART_DISABLED`.
3. **Checkout Denied on Custom Domain:** `POST /checkout` with custom domain `Origin` returns 403 `CUSTOM_DOMAIN_CHECKOUT_DISABLED`.
4. **Auth Denied on Custom Domain:** `POST /auth/customer/login` with custom domain `Origin` returns 403 `CUSTOM_DOMAIN_AUTH_DISABLED`.
5. **Customer Orders Denied on Custom Domain:** `GET /checkout/customer/orders` returns 403 `CUSTOM_DOMAIN_BROWSE_ONLY`.
6. **Hosted Storefront Allowed:** Requests with `Origin: https://my-store.rentifystore.shop` proceed normally to cart, checkout, and auth handlers.
7. **Body Spoofing Neutralized:** Request with custom domain `Origin` and `req.body.domain = 'my-store.rentifystore.shop'` is strictly rejected with 403.
8. **Malicious Return URL Rejected:** Auth return URLs targeting custom domains, credentials, or open redirect parameters are rejected by Core policy.
9. **Environment Flag Safety:** Host validator fails if custom-domain checkout flags are enabled in production or staging.

---

## 6. Release 1 vs Post-Release 1 Roadmap

- **Release 1 Status:**
  - Custom-domain browse-only boundary is fully enforced and verified.
  - ADR 0002 status remains **Proposed**.
  - No custom-domain OAuth, PKCE, or domain-local sessions are active.
- **Post-Release 1 (Phase P3 / Beyond):**
  - Implement and prove edge-callback / server-to-server OAuth 2.0 PKCE code exchange for custom domains.
  - Implement secure cart session handoff across domains.
  - Update ADR 0002 to **Accepted** only after full staging verification of domain-local cookies and code exchange.
