# Rentify Core OpenAPI Baseline Specification

This directory maintains the machine-readable OpenAPI 3.0.3 contract for the active Release 1 routes in `rentify-server` (Core API).

The contract reflects the actual runtime implementation in code and avoids describing planned or unverified behavior as implemented.

## Specification File

- **Contract location**: [`docs/openapi/core.openapi.yaml`](core.openapi.yaml)
- **Specification format**: OpenAPI 3.0.3 (YAML)
- **Service authority**: `rentify-server` (Core API)

---

## Developer Commands

### 1. Specification Validation
To lint and validate the OpenAPI contract against Redocly standards, verify complete Express route coverage, and ensure zero leaked secrets:

```bash
# From repository root
npm run verify:openapi

# Or from rentify-server directory
npm run openapi:verify
```

### 2. Breaking Change & Compatibility Detection
To check whether working copy changes introduce breaking contract changes compared to git `develop` or another baseline:

```bash
# Compare working copy against develop branch
node tools/openapi-diff.mjs develop

# Compare two specification files
node tools/openapi-diff.mjs path/to/baseline.yaml path/to/current.yaml

# Or from rentify-server directory
npm run openapi:diff
```

The detector identifies:
- Removed endpoint paths
- Removed HTTP methods
- Removed HTTP response status codes
- Newly required request parameters (query, header, path, cookie)
- Request bodies converted from optional to required

### 3. Automated Test Suite
OpenAPI contract validation and Express route parity tests are executed automatically with unit and security tests:

```bash
# In rentify-server
npm run test:security
# or
npm run test:unit
```

### 4. Full Quality Verification
The contract validation is wired into both Core API and repository-level verification:

```bash
# Repository-wide policy, migration, and contract verification
npm run verify:repository

# Core API full verification (lint, typecheck, tests, build, secret scan, openapi)
npm run verify:core
```

---

## Documented Routes and Domains

The contract covers all 95 active mounted Express routes across 84 paths:

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
| **Billing & Payments** | `/api/payment/*`, `/api/packages/*` | Public package tier listing, merchant package assignment, Bakong KHQR payment link generation, payment status polling, and webhook verification. |
| **Admin Operations** | `/admin/*` | Platform administration, template CRUD, store listing with application status filters, seller application adjudication (approve/reject/suspend), and audit log exports. |
| **Operations Telemetry** | `/ops/*` | Internal operator contracts, reminder telemetry, and cutover milestone status. |
| **Internal Service Comms** | `/api/internal/*` | Service-to-service communication between Core and Commerce APIs (merchant store lookups, website status synchronization, and notification handoffs). |
| **Order Notifications** | `/api/notifications/*` | Telegram order alerts, buyer notification relays, and webhook endpoints. |
| **Health Probe** | `/health` | Container and load-balancer health probe returning minimal `{ "status": "ok" }`. |

---

## Security Schemes and Authentication Model

The contract documents the exact security mechanisms implemented in `rentify-server`:

### Cookie Authentication
- `userAccessTokenCookie` — HTTP-only cookie (`userAccessToken`, 15-minute expiry) for authenticated merchants and platform administrators.
- `userRefreshTokenCookie` — HTTP-only cookie (`userRefreshToken`, 30-day expiry) with cryptographic rotation and grace window.
- `staffAccessTokenCookie` — HTTP-only cookie (`staffAccessToken`) for merchant store staff.
- `staffRefreshTokenCookie` — HTTP-only cookie (`staffRefreshToken`) for staff session renewal.

### Header Authentication
- `bearerAuth` — Standard `Authorization: Bearer <jwt>` accepted on API routes.
- `internalSecretHeader` — `x-internal-secret` required for `/api/internal/*` calls between services.
- `serviceTokenHeader` — `x-service-token` for service-to-service communication.
- `opsTokenHeader` — `x-ops-token` protecting operational endpoints under `/ops/*`.

---

## Proven Code Limitations & Known Discrepancies

During strict code-level inspection of controllers, routes, and services, the following discrepancies and runtime limitations were uncovered and documented in the contract without modifying runtime behavior:

1. **Package CRUD Operations in `subscriptionService.js`**:
   - `POST /api/packages`, `PUT /api/packages/:id`, and `DELETE /api/packages/:id` are declared and mounted in `src/modules/billing/packageRoutes.js`, routing to `subscriptionService.createPackage`, `updatePackage`, and `deletePackage`.
   - Inspection of `src/modules/billing/subscriptionService.js` confirmed that these three methods are **not implemented** in the service class.
   - Invoking these endpoints results in an unhandled error or 400 Bad Request at runtime.
   - The contract explicitly annotates these endpoints with `x-implementation-status: unhandled-in-service` and documents their theoretical inputs while noting the runtime error.

2. **Routes Present in Legacy Documentation but Not Mounted**:
   - `DELETE /api/staff/:id` — Listed in legacy capability inventory but has no route definition or controller handler in `staffRoutes.js`.
   - `GET /api/deployments/resolve` — Referenced in older notes; the actual implemented route is `GET /api/websites/getWebsiteByDomain?domain=...`.
   - `GET /ops/sellers/pending` — Listed in older capability outlines; actual implemented adjudication routes are mounted under `/admin/operations/stores?applicationStatus=pending`, `/admin/stores/:storeId/seller-application`, and `/admin/stores/:storeId/seller-review`.
   - `POST /api/internal/sync-ack` — Referenced in legacy design sketches; not mounted in `internalRoutes.js`.

3. **Multi-Path Route Aliases**:
   - In `src/modules/auth/authRoutes.js`, the session retrieval handler is mounted on both `['/session', '/me']`. Both paths are documented in the specification for complete accuracy.
