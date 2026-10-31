# Merchant setup guide — build plan

Status: plan, awaiting approval. Branch `feature/merchant-onboarding-guide`.
Wireframe: [`docs/experience/wireframes/merchant-onboarding-guide.html`](../experience/wireframes/merchant-onboarding-guide.html) (v3).

## Goal

After a merchant creates a Store (with or without a storefront), guide them on
mobile first, desktop second, to the point where a buyer can order: one product,
one delivery fee, and a preview. Marketplace listing happens automatically.

## Decisions (settled in review)

| # | Decision | Notes |
|---|---|---|
| D1 | **Marketplace listing is automatic.** No seller application or review before selling. | Recorded as DEC-028 (supersedes DEC-007); `AGENTS.md` rule 4 updated. Admins keep suspend and product moderation. No "New seller" badge for now. |
| D2 | **Delivery fee stays a guide step** (no default fee). | Marketplace and storefront checkout both refuse orders without a `StoreDeliveryPolicy`. |
| D3 | Guide = **4 counted steps in 2 stages**: Set up (store name and category ✓ from onboarding, first product, delivery fee) → Go live (preview). "On Rentify Market" and "Online store ready" show as automatic statuses, not tasks. | Optional, untracked: share, try POS, invite staff. |
| D4 | **No verification step.** Sign-in already requires a verified account (email code, or phone code sent by Telegram; Google is verified). | |
| D5 | **Telegram order alerts left out** until the Telegram webhook is enabled. | `src/app.js` has it commented out. |
| D6 | **Mobile navigation:** keep the ☰ drawer as the full menu (overlay, no page change) and add a bottom bar Home · Orders · Products · POS · Share. | Desktop sidebar unchanged. |
| D7 | **"Hide" is remembered per device** (localStorage). The guide stays in the ☰ menu. | No backend preference field. |
| D8 | Delivery fee's permanent home: **Settings › Delivery** (moved out of the Products page). | |

## What exists today (reused)

- Core `GET /api/stores/mine/launch-checklist` (`stores/launchChecklistService.js`) — statuses, reasons, next actions; in `docs/openapi/core.openapi.yaml`, not yet in the generated client.
- Commerce `GET/PUT /api/stores/:storeId/marketplace-delivery` with version checks; Commerce launch facts (`store-access/launchFactsService.js`).
- Shared UI: `Checklist`, `ResponsiveDialog`, `ShareSheet`, `EmptyState` (`libs/shared/src/ui/experience*.tsx`).
- Merchant: `useAccess()` permissions, `AppSidebar` sheet drawer, `Overview.tsx`, `StoreCatalogPage.jsx` (current delivery-fee form).
- Store `marketplaceEntitlement` already defaults to `pilot`.

## Phase A — Backend: automatic listing (Core) · 1 PR

| Step | Change | Files |
|---|---|---|
| A1 | Approve automatically, in every environment, when the Store is active, has a primary category with no pending category review, and the owner is verified. Applies on create, update and `ensureForWebsite`. Only moves `pending → approved`; never overrides `suspended`, `needs_changes` or `rejected`. Remove the development-only gate (`DEV_MARKETPLACE_AUTO_APPROVAL` + `NODE_ENV`). | `rentify-server/src/modules/stores/storeService.js` |
| A2 | Backfill existing `pending` Stores that meet the same rule: a script with `--dry-run` that prints a report (store id, before, after), then applies, and records how to roll back (set back to `pending` from the report). Per `AGENTS.md` rule 8. | `rentify-server/scripts/` |
| A3 | Launch checklist v2: `delivery_policy` is complete when Commerce reports a delivery fee (no longer requires a seller application); drop `seller_application`, `return_policy` and `approval` items; `publication_marketplace` = approved + product + fee. Bump `version` to 2. | `stores/launchChecklistService.js`, `docs/openapi/core.openapi.yaml`, generated clients (`npm run generate:clients`) |
| A4 | Tests: automatic approval rule (each condition, never overriding suspended/rejected), checklist v2 states, backfill dry run. | `rentify-server/test/` |
| A5 | Docs: `AGENTS.md` rule 4, `docs/platform-architecture.md`, `docs/current-rentify-architecture.md`, a decision entry in `docs/decisions/`, `docs/notes.md`. Note the seller-application UI (`MarketplaceStoreOverview.jsx`) as unused. | `docs/` |

Verify: `npm run verify:core`, `npm run verify:openapi`, Core route table unchanged.

## Phase B — Setup guide (frontend) · 1 PR

| Step | Change | Files (planned) |
|---|---|---|
| B1 | `useLaunchChecklist()` hook on the generated Core client, plus a pure `toSetupSteps(checklist, access)` that maps backend items to the 4 steps, automatic statuses and staff-only steps. Unit tests for the mapping (new store, in progress, done, stale Commerce facts, staff). | `apps/core/merchant/src/features/setup-guide/` |
| B2 | Setup guide card at the top of Home for owners (wireframe screens 2, 3, 9); finished steps collapse; Hide per device; hidden once all 4 are done. Zero KPIs and charts hidden until the first order. Staff variant from permissions (screen 10). | `pages/overview/Overview.tsx`, `features/setup-guide/` |
| B3 | Delivery fee: shared `DeliveryFeeForm` used by the bottom sheet on Home (screen 4) and a new **Settings › Delivery** page; remove the form from `StoreCatalogPage`. | `features/delivery-fee/`, `pages/setting/DeliverySetting.tsx`, `routes/dashboardRoutes.jsx`, settings nav |
| B4 | Empty states for Products and Orders (screens 5, 6); new `/share` page using `ShareSheet` (screen 7); "Setup guide · n of 4" entry at the top of the ☰ drawer (screen 8). | `pages/product-management/`, `pages/order-management/`, `pages/share/`, `layouts/dashboard/AppSidebar.jsx`, `config/dashboard-tabs.jsx` |
| B5 | Onboarding finish screen: next steps from the checklist and "Add your first product" as the main button; "Listed on Rentify Market" shown as done (screen 1). Both paths (marketplace-only and storefront). | `apps/core/marketing/src/pages/Onboarding/StartSelling.jsx`, `startSellingCopy.js`, storefront finish step |
| B6 | All new text in English and Khmer. | `libs/utils/src/locales/en.json`, `kh.json` (`i18nEnforcement.test.js`) |

Verify: `npm run verify:frontend` (lint, typecheck, unit tests, build); `e2e/dashboard-feature-integrity.test.mjs` updated for the new routes; screenshots at 375px and 1280px compared with the wireframe; run through the flow locally with a fresh store.

**Built differently from the plan (recorded during the build):**
- The counted Go-live step is **"You're live"** (`publication_marketplace`, or `publication_storefront` when the marketplace is off), with Preview as its button. The backend `preview` item only means a preview is available, so it cannot show whether the merchant looked.
- Code lives in `apps/core/merchant/src/app/features/setup-guide/` and `.../delivery-fee/`, next to the existing `app/features/usage`. The checklist is fetched once by a `SetupGuideProvider` in the dashboard layout and shared by the Home card, the ☰ menu entry and the delivery-fee sheet.
- Hand-off: `StartSelling.jsx` is no longer routed; every merchant finishes in the unified onboarding, so the next steps were added to its completion screen (`DeploymentStep/DeploymentStates/CompletedState.jsx`).
- A Store whose products have no SKU sees "Add a product code (SKU)" instead of "Add your first product" (open question in `docs/notes.md`).
- Merchant unit tests (`npm run test:merchant`) now run as part of `npm test`.

## Phase C — Mobile bottom bar · 1 PR

| Step | Change |
|---|---|
| C1 | Bottom bar under 900px: Home · Orders (new-order badge) · Products · POS · Share. Hidden on full-screen tasks (product editor, camera). The ☰ drawer and desktop sidebar are unchanged. |
| C2 | POS tab: first-time sheet explaining the register app (opening cash float and PIN), then opens the POS app directly (screen 11). |
| C3 | Toasts and sticky action bars sit above the bottom bar. |

Verify: the same checks as phase B, plus every merchant page at 360px with no horizontal scroll.

## Order and size

A → B → C, one PR each into `develop`. B can start in parallel with A using a local
mock of checklist v2, but merges after A. C is independent of A.

## Risks and open items

- **No pre-moderation.** With automatic listing, anything published is public at once. Existing safeguards: admin suspend, restricted-product moderation (Commerce migration 025). Worth confirming that is enough for launch.
- **Existing pending Stores** in any shared environment get listed by the backfill; review the dry-run report first.
- **Commerce facts unavailable or stale:** the checklist marks steps blocked; the guide shows "We couldn't check this right now" with a retry, never a wrong tick.
- The unused seller-application UI and endpoints stay for now; removing them is a separate cleanup.
