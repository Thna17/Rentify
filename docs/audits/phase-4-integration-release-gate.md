# Phase 4 Integration and Release Gate

**Document status:** CODE GATES PASSING / LIVE STAGING GATE PENDING

**Release:** Phase 4 — Complete User Experience

**Updated:** October 27, 2026

**Source branch:** `feature/p4-release-gate-remediation`

## Verdict

Phase 4 is code-complete only when every automated gate below passes. It is release-complete only after the four golden journeys and the manual accessibility matrix pass against the deployed staging environment.

The repository gates currently prove contracts, unit behavior, integration behavior, builds, tenant authorization, and local browser journeys. They do not substitute for a deployed staging run. At the time of this update, the configured `*.staging.rentifymarket.com` hosts do not resolve, so the release verdict remains **pending staging** rather than falsely reporting “complete.”

## Product boundary

Phase 4 launches buyer checkout with **Cash on Delivery (COD) only**:

- Marketplace checkout exposes COD as its only payment option.
- The obsolete marketplace ABA PayWay route is removed; old payment URLs return buyers to checkout.
- Hosted storefronts default to COD only.
- CutLuy and all other online payment methods remain outside Phase 4.

The Store remains the canonical tenant for catalog, price, stock, orders, POS, invoices, and permissions. A Website is an optional storefront channel.

## Automated gates

Run from the repository root after installing package dependencies:

```bash
npm run verify:repository
npm run verify:phase4
npm run verify
npm run verify:e2e
```

`verify:phase4` is a portable contract/integration runner. It deliberately does not call its checks “end-to-end” because its component and service tests do not operate against deployed infrastructure.

`verify:e2e` requires local MySQL and Redis. It builds the Marketplace and Merchant applications, migrates isolated test databases, starts both APIs, runs real Chromium journeys, and cleans up deterministic fixtures. The real-host rehearsal is intentionally separate: `node tools/e2e/runner.js --staging --tag @staging`.

| Gate | Required result | Evidence |
| --- | --- | --- |
| Repository policy | Pass | Secret scan, migrations, OpenAPI, clients, tokens, hosts, authorization |
| Authorization | 294/294 operations classified; 0 unresolved gaps | `npm run verify:authz`; direct POS/invoice actor tests |
| Fresh database | Pass, including safe recovery from partially applied product-import DDL | Commerce migration runner and migration recovery tests |
| Marketplace COD | Pass | Grouped cart, store-specific checkout, idempotency, safe timeout recovery |
| Storefront COD | Pass | All three hosted template contract suites |
| Inventory | Pass | POS/online final-unit competition and invoice single-deduction tests |
| Localization | Pass | English/Khmer catalog parity and locale formatting |
| Automated accessibility | No serious/critical axe findings | Rendered products, cart, and checkout component tests |
| Applications | Lint, typecheck, tests, and builds pass | Full `npm run verify` |
| Local browser journeys | Buyer, merchant, and failure-artifact journeys pass in Chromium | `npm run verify:e2e` |

Automated axe checks intentionally exclude `color-contrast` under jsdom because jsdom does not calculate browser paint and contrast reliably. Real contrast is covered by the token validator and must also be inspected in the browser during the manual staging pass.

## Four golden staging journeys

These journeys must be run using real staging accounts, deployed APIs, and the real staging database. Screenshots, order references, timestamps, and reconciliation output must be attached to the release record.

1. **Merchant launch** — register and verify a merchant; choose marketplace-only or storefront selling; resume interrupted onboarding; create a product with variant, image, price, category, and stock; complete launch and verify the public listing.
2. **Marketplace COD order** — add products from two Stores; check out one Store using COD; retry safely; prove no duplicate order exists; verify the second Store cart remains and tracking works.
3. **Hosted storefront COD order** — complete browse → product → cart → checkout → confirmation on each template and verify the same merchant dashboard receives the orders and stock updates.
4. **POS final-unit competition** — race an online COD order against a POS sale for one unit; prove one succeeds, one gets a useful conflict, stock ends at zero, and invoicing does not deduct twice.

## Accessibility and resilience gate

Automated tests are necessary but not sufficient. Complete [the Phase 4 manual accessibility checklist](./phase-4-manual-accessibility-checklist.md) on staging for English and Khmer at mobile and desktop widths.

The release is blocked by unresolved defects in keyboard navigation, screen-reader behavior, 200% text zoom, 320 CSS-pixel reflow, touch targets, reduced motion, failed images, slow connections, timeout recovery, permissions, conflicts, or critical loading/empty/error states.

## Authorization evidence

The former 14 matrix entries for website-scoped compatibility routes were stale. Those routes resolve the canonical Store and enforce permissions through `requireWebsitePermission`: products (`products` / `manage_products`), POS (`pos`), invoices (`invoice` / `invoices`), and statistics (`analytics` / `manage_analytics`).

The generated matrix now records zero unresolved gaps. Table-driven middleware tests cover owners, permitted staff, unpermitted staff, unrelated merchants, buyers, public callers, suspended actors, and platform administrators.

## Release decision

- **CODE GATES FAILING** — any required automated command fails.
- **CODE GATES PASSING / LIVE STAGING GATE PENDING** — automation passes, but staging or manual evidence is missing.
- **PHASE 4 RELEASE COMPLETE** — automation passes and all four golden staging journeys plus accessibility checks are signed off.

Current status: **CODE GATES PASSING / LIVE STAGING GATE PENDING**.
