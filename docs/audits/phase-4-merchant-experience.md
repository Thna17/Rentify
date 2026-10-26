# Phase 4 merchant experience audit and implementation map

**Status:** Current-state audit, implementation map, and P4-MER-002 contract note, 2026-10-26
**Workstream:** `P4-MER-000` through `P4-MER-005`
**Scope:** Merchant onboarding and the React merchant workspace only. This
document began as the P4-MER-000 audit; implementation notes are added only
when the corresponding package is complete.

## P4-MER-002 implementation note

The launch checklist is now designed as a server-composed read model rather
than a browser calculation. Core owns the response and combines authoritative
identity, Store, seller-review, and optional Website state with a read-only,
service-authenticated Commerce facts endpoint for delivery-policy, Product,
SKU, marketplace visibility, and projection version. Responses expose only
stable statuses, safe reason codes, exact next-action codes, aggregate counts,
channel applicability, an observation time, and stale state.

Marketplace-only Stores omit storefront readiness and publication items, so a
missing Website cannot block marketplace activation. A Store linked to a
Website receives separate marketplace and storefront publication checks.
Commerce timeout, unavailability, or an older Store projection blocks the
dependent checks and returns a retry action; Core never infers a positive fact
from missing data. The merchant Overview maps those codes to reviewed English
and Khmer explanations, uses completed-item counts rather than percentages,
and emits identifier-free activation events.

## Guardrails

- Store is the merchant tenant and product owner. Website is optional channel
  context and must not gate marketplace-only catalog or order operations.
- Commerce remains authoritative for Product/SKU, stock, orders, COD, returns,
  and refunds. Core remains authoritative for identity, Store, seller review,
  Website, subscription, and entitlements.
- Phase 4 launch payment behavior is the approved COD flow. This workstream
  does not implement CutLuy or make a redirect, delivery, or request imply a
  paid/refunded state.
- `admin-frontend/` is a read-only design reference. The merchant dashboard
  will share the Admin dashboard's design language—visual hierarchy, grouped
  sidebar, compact header, cards, tables, filters, drawers, status badges,
  feedback states, and responsive patterns—but it will not expose admin
  controls, cross-tenant data, moderation powers, or copy admin-specific
  workflows.

## Audit summary

| Package | Current evidence | Assessment |
| --- | --- | --- |
| P4-MER-000 dashboard foundation | Grouped merchant sidebar, responsive sheet, overview cards, shared UI primitives, and a merchant CSS layer exist. The Admin app demonstrates a denser operational hierarchy, action queue, toolbars, horizontal tables, drawers, and semantic badges. | Partial. The merchant shell and pages use a different token layer, many hard-coded strings/colors, duplicated page patterns, and inconsistent Store/Website behavior. |
| P4-MER-001 onboarding | `/start` creates a Store and first product and saves Store name/category in `sessionStorage`; `/onboarding/:packageId` saves a separate Website flow in `localStorage`. | Partial. Progress is browser-local, not server-owned or cross-device; the two flows use different state models; no explicit durable path selection or honest resumable completion contract exists. |
| P4-MER-002 launch checklist | Overview has a two-item “growth checklist” for Website/POS; seller application, Store category, delivery fee, product creation, visibility, and approval are distributed across other pages. | Missing as a launch checklist. There is no API-composed checklist with blocked reason/next action, activation events, or one action-oriented home. |
| P4-MER-003 Product/SKU editor | Website merchants have a large product manager, form, detail editor, optimistic versions, media upload, SKU fields, and variant editing. Marketplace-only merchants get the separate Store catalog quick-add/list. Commerce models variants and variant stock. | Partial and split. Marketplace-only edit/detail paths still depend on Website queries, Store routes expose only a smaller Product shape, variant/SKU parity is incomplete, image alt text is absent, and archive/visibility/conflict handling is inconsistent. |
| P4-MER-004 bulk import/export | Website routes expose synchronous bulk JSON and CSV import. The UI parses CSV by splitting lines, previews rows, and submits bulk products. The selected-product “export” only shows a success toast. | Prototype only. It is Website-keyed, not asynchronous, not robust CSV parsing, has no job/idempotency/status/history/result report, can partially import rows, and provides no real export artifact. |
| P4-MER-005 unified order operations | Store-scoped COD endpoints already list marketplace and hosted-storefront orders together, enforce actor permissions, accept idempotency keys, expose events, and support delivery failure/retry, COD collection, and confirmed refund. A separate Website order UI covers legacy/POS/invoice-style orders. | Partial and duplicated. `/orders` and `/marketplace-orders` use different APIs, state vocabularies, layouts, actions, and detail screens; the Store-scoped list excludes POS/invoice orders and has no pagination/filter contract. |

## Current merchant information architecture

### Entry and onboarding surfaces

- Marketing `/start`: registration handoff, Store creation, first simple
  product, marketplace link, then Website/POS upsell.
- Marketing `/onboarding/:packageId`: Website template, brand, plan/payment,
  creation, and deployment flow.
- Auth routes are separate (`/login`, `/register`, verification and recovery)
  and return to marketing through `returnUrl`.
- POS is a separate application; the merchant dashboard opens it externally.

### Merchant workspace routes

| Area | Routes and current behavior |
| --- | --- |
| Home | `/overview`; KPIs, recent orders, channel pills, Website/POS growth checklist. |
| Products | `/products`; Website users receive the full manager, marketplace-only users receive `StoreCatalogPage`. `/catalog` is a hidden duplicate Store catalog. `/products/create`, `/products/edit/:id`, and `/products/:id` are separate form/detail paths. |
| Orders | `/orders` is Website-keyed legacy order management. `/marketplace-orders` is Store-keyed marketplace + hosted-storefront COD operations. `/orders/:id` is another Website-era detail view. |
| Sales channels | `/store-management` is available only with a Website; `/customization` aliases redirect there. Marketplace is represented by the separate order route rather than channel settings. POS is external. |
| Customers and insights | `/customers` and `/analytics`. |
| Finance | `/invoices`; `/usage` redirects to usage dashboard, with breakdown and billing children. |
| Settings and help | Account, security, staff, payments, billing, preferences; `/support` redirects to `/help`. |
| Compatibility aliases | `/ops/*` redirects into usage pages and `/search` redirects to overview. Unknown routes redirect to overview. |

Navigation is filtered client-side by role, staff permissions, package features,
and channel availability. APIs also enforce Store or Website authorization; UI
filtering is presentation only and must remain so.

### Route-level audit

`Merchant` below means an owner/user; `staff:<permission>` means the sidebar
and API are expected to enforce that permission. “Mixed” language coverage
means some shared catalog keys exist but the page still contains hard-coded
English. All routes inherit the responsive shell; the page column calls out
the current content behavior.

| Active route | Label/component and authority/API | Actor | Mobile and language | Disposition |
| --- | --- | --- | --- | --- |
| `/`, `/overview` | Home / `Overview`; Commerce stats plus Core Store/channel context | Merchant; staff | Responsive cards; Mixed | Keep; replace growth card with launch/action queue |
| `/analytics` | Analytics / `PlatformAnalytics`; Website Commerce stats | Merchant; `staff:manage_analytics` | Responsive grid; Mixed | Keep; migrate to Store-first metrics |
| `/store-management` | Storefront / `StoreManagement`; Core Website/theme/content | Merchant; staff currently has no explicit permission | Responsive sections; Mixed | Redirect to `/channels/storefront` after parity |
| `/customization` | Redirect to `/store-management` | Same as target | N/A | Preserve redirect to new channel route |
| `/customization/:id` | Redirect to `/store-management`; discards `id` | Same as target | N/A | Preserve or explicitly retire ID with telemetry |
| `/products` | Products / `ProductManagement` when Website exists, otherwise `StoreCatalogPage`; Commerce | Merchant; `staff:manage_products` | Cards on mobile/table on desktop versus separate simple page; Mixed | Keep and merge on Store-first manager |
| `/catalog` | Hidden Store catalog / `StoreCatalogPage`; Store Commerce API | Merchant; staff, no declared permission | Responsive form/list; English | Redirect to `/products` |
| `/products/:id` | Product detail / `ProductDetailView`; Website Commerce manage API | Merchant; `staff:manage_products` | Large responsive detail; Mixed | Keep URL; migrate adapter to Store API |
| `/products/create` | Product create / `ProductForm`; Website or Store write | Merchant; `staff:manage_products` | Responsive long form; English-heavy | Redirect to `/products/new` |
| `/products/edit/:id` | Product edit / `ProductForm`; read is Website-only today | Merchant; `staff:manage_products` | Responsive long form; English-heavy | Redirect to `/products/:id/edit` after Store read parity |
| `/orders` | Orders / `OrderManagement`; Website Commerce history | Merchant; `staff:manage_orders` | Cards mobile/table desktop; Mixed | Keep and replace with Store-first all-channel queue |
| `/marketplace-orders` | Marketplace nav / `MarketplaceOrders`; Store Commerce marketplace + storefront COD APIs | Merchant; `staff:manage_orders` | Two-column becomes stacked; English | Redirect to `/orders?channel=marketplace` |
| `/orders/:id` | Order detail / `OrderDetailView`; Website Commerce order API | Merchant; `staff:manage_orders` | Large responsive detail; Mixed | Keep URL; migrate to all-channel detail |
| `/customers` | Customers / `Customers`; Commerce order-derived customer data | Merchant; `staff:manage_orders` | Responsive intent not browser-tested; Mixed | Keep; make Store-scoped contract explicit |
| `/invoices` | Invoices / `InvoiceManual`; Website Commerce invoice/PDF APIs | Merchant; `staff:manage_invoices` | Multi-panel form/preview; Mixed | Keep; preserve P4 invoice ownership boundary |
| `/help` | Support / `SupportPage`; primarily static/client workflow | Merchant; staff | Responsive; English-heavy | Keep |
| `/support` | Redirect to `/help` | Same as target | N/A | Preserve alias |
| `/settings` | Redirect to `/settings/account` | Merchant; `staff:settings` at parent nav | N/A | Preserve alias |
| `/settings/account` | `AccountSettings`; Core user/Store profile | Merchant; current child-route guard inherits broad Settings match | Responsive sections; Mixed | Keep; add explicit child permission metadata |
| `/settings/security` | `SecuritySetting`; Core auth/session APIs | Merchant; current child-route guard inherits broad Settings match | Responsive sections; Mixed | Keep; require recent-auth contract where applicable |
| `/settings/staff` | `StaffSetting`; Core Store membership/staff APIs | Merchant; current child-route guard inherits broad Settings match | Responsive table/forms; Mixed | Keep; explicit staff-management permission |
| `/settings/payments` | `PaymentSetting`; legacy provider configuration | Merchant; current child-route guard inherits broad Settings match | Large form; English-heavy | Hide/retire for COD launch unless an approved contract requires it |
| `/settings/billing` | `BillingSetting`; Core Store entitlements/subscription | Merchant; current child-route guard inherits broad Settings match | Responsive sections; Mixed | Redirect/consolidate under `/billing` |
| `/settings/preferences` | `PreferencesSetting`; client/profile preferences | Merchant; current child-route guard inherits broad Settings match | Responsive sections; Mixed | Keep |
| `/usage` | Redirect to `/usage/dashboard` | Merchant; `staff:manage_analytics` | N/A | Redirect to `/billing` |
| `/usage/dashboard` | Usage dashboard; Commerce usage API | Merchant; permission inferred from parent only | Responsive cards; English-heavy | Consolidate under `/billing` |
| `/usage/breakdown` | Usage breakdown; Commerce usage API | Merchant; permission inferred from parent only | Responsive table/chart; English-heavy | Consolidate under `/billing` |
| `/usage/billing` | Usage statements; Commerce usage API | Merchant; permission inferred from parent only | Responsive table; English-heavy | Consolidate under `/billing` |
| `/ops/dashboard` | Redirect to `/usage/dashboard` | Same as target | N/A | Retire after compatibility window |
| `/ops/at-risk`, `/ops/reminders` | Redirect to `/usage/breakdown` | Same as target | N/A | Retire after compatibility window |
| `/ops/contract` | Redirect to `/usage/billing` | Same as target | N/A | Retire after compatibility window |
| `/search` | Redirect to `/overview`; header searches navigation only | All authenticated actors | Header responsive; English | Retire route; keep accessible command/navigation search |
| `*` | Redirect to `/overview` | All authenticated actors | N/A | Keep safe fallback but test known deep links explicitly |

The current route guard looks up top-level tab metadata. Nested Settings and
Usage children therefore inherit a broad parent match rather than declaring
their own permission/feature contract. P4 route metadata should make every
child explicit and keep API authorization as the final authority.

## Proposed merchant information architecture

The target keeps stable top-level concepts and progressively reveals optional
channels. It does not create separate dashboards for marketplace-only and
storefront merchants.

| Target area | Primary route | Contents |
| --- | --- | --- |
| Home | `/overview` | Launch checklist until activated; then next actions, operational exceptions, KPIs, recent activity, and channel health. |
| Products | `/products` | One Store-first catalog list, filters, inventory state, visibility explanation, and bulk jobs. |
| Product editor | `/products/new`, `/products/:productId/edit` | Quick simple product plus progressive SKU/variant, media/alt text, category, price, stock, channel, preview, conflict, and archive sections. |
| Import/export | `/products/imports` | Template/export actions, import preview, validation, job history, correction report, and safe retry. |
| Orders | `/orders`, `/orders/:orderId` | One Store-scoped queue and detail for marketplace, storefront, POS, and invoice channels; filters expose channel without creating separate workflows. |
| Sales channels | `/channels/marketplace`, `/channels/storefront` | Store listing/default visibility/delivery/readiness and optional Website management. POS remains an external app entry. |
| Customers | `/customers` | Store-scoped customers and transaction-safe contact access. |
| Insights | `/analytics` | Defined merchant metrics only. |
| Finance | `/invoices`, `/billing` | Invoice operations and Rentify subscription/usage billing, clearly separated from buyer COD. |
| Team and settings | `/settings/staff`, `/settings/account`, `/settings/security`, `/settings/preferences` | Membership, profile, security, and preferences. Payment configuration stays hidden until an approved launch contract needs it. |
| Help | `/help` | Merchant support and recovery guidance. |

## Reusable components and consolidation plan

### Reuse

- `@rentify/shared/ui`: Button, Card, Badge, Alert, Input, Label, Textarea,
  Select, Checkbox, Switch, Tabs, Dialog, Sheet, Drawer, Table, Skeleton,
  Tooltip, Progress, and toast primitives.
- Shared management patterns: `FilterBar`, `BulkActionsBar`, `DetailDrawer`,
  `ReusableTable`, `StatusTabs`, `InventoryDialog`, `ConfirmDeleteDialog`,
  `useResponsive`, `useRowExpansion`, and `useSnackbar`.
- Merchant shell: `Layout`, `AppSidebar`, `NavMain`, `SiteHeader`,
  `PageHeader`, authorization fallbacks, and `ChannelContext`, after their
  Store-first and token contracts are consolidated.
- Shared typed `coreClient`/`commerceClient`, generated contracts, standard
  errors/correlation IDs, media upload validation, auth and translation hooks.
- Admin design patterns only: grouped navigation, compact page headings,
  stat/action cards, filter toolbars, scroll-safe tables, detail drawers,
  semantic status treatments, and explicit loading/empty/error feedback.

### Add or consolidate

- `MerchantShell` and route metadata as the single source for navigation,
  breadcrumbs, titles, permissions, aliases, and mobile behavior.
- `MerchantPageHeader`, `ActionQueue`, `MetricCard`, `StatusBadge`,
  `FeedbackState`, `ResponsiveDataView`, and `ConfirmActionDialog` using the
  shared semantic tokens and consistent accessibility contracts.
- `LaunchChecklist` driven by server facts/reason codes rather than browser
  guesses.
- one Store-first `ProductEditor` with `SimpleProductFields`, `SkuEditor`,
  `MediaEditor`, `ChannelVisibility`, `ProductPreview`, and conflict recovery.
- `ImportJobWizard`, `ImportValidationTable`, `ImportJobHistory`, and
  `ExportAction` backed by durable Commerce jobs.
- one `OrderQueue`, `OrderDetailDrawer/Page`, `OrderNextAction`, COD/return
  action forms, and `OrderTimeline` for all channels.
- one frontend domain-adapter layer over generated clients. New P4 code must
  not add raw `fetch`, Axios, or direct Website-only endpoint use.

## API and contract gaps

These are server/contract prerequisites, not problems to solve with UI rules.

### Core

- No durable onboarding-progress resource exists. Store and Website creation
  are durable, but step, selected path, completed requirements, draft values,
  and resume version are not.
- No merchant launch-checklist response composes verified contact, Store
  details, delivery/return policy, first eligible product, seller application,
  preview readiness, approval, publication, reason code, and next action.
- Seller application endpoints exist, but the client needs stable status and
  reason schemas suitable for the checklist and both locales.

### Commerce

- Store-scoped catalog supports list/create/update, but lacks full parity with
  Website-scoped manage/detail/delete/bulk/config operations and their typed
  Product/SKU contract. The Store-first contract must be authoritative before
  replacing the fallback UI.
- Product media has URL records but no merchant-editable alt-text contract.
- Existing bulk JSON/CSV imports are synchronous, Website-keyed, and do not
  expose idempotent jobs, validation-only preview, per-row results, history,
  retry, or export.
- Store-scoped COD order operations combine marketplace and hosted storefront,
  but do not include POS/invoice orders, pagination, server-side filters/search,
  normalized next-action reason codes, or a single all-channel detail/timeline
  contract.
- Return/complaint events exist, but merchant response actions and evidence
  need a stable contract before they are presented as complete operations.

### Shared contracts

- Generated clients already include the current OpenAPI surface, but much of
  the merchant application bypasses them with raw `fetch`, Axios, or RTK Query
  Website adapters. P4 additions require additive OpenAPI updates, regenerated
  clients, and handwritten Store-first adapters.
- Eligibility, entitlements, authorization, totals, state transitions, and
  next-action rules must remain server-derived. UI reason mapping may explain
  a code but must not recalculate the rule.

## UI gaps

- Marketplace-only and Website merchants receive materially different product
  and order experiences for the same canonical Store data.
- Home calls Website/POS upsell a launch/growth checklist and can state “live”
  while seller approval is still pending; it does not prioritize blockers.
- Product screens duplicate quick add, full form, detail editing, and catalog
  controls. Variant editing exists only in the Website-era detail flow.
- Bulk export is a toast without a file; CSV parsing does not handle quoting,
  commas, encodings, durable jobs, or per-row server validation.
- Order screens duplicate legacy and COD states; some actions are placeholders,
  and one flow uses browser `prompt()` instead of an accessible confirmation.
- Loading, empty, retry, conflict, forbidden, timeout, and weak-network states
  are inconsistent across pages.
- The Admin reference is compact and action-oriented, while merchant screens
  mix dense legacy tables, large marketing cards, gradients, and one-off page
  headers. Shared design tokens are not consistently imported or used.

## Route migration and compatibility risks

| Current route | Target/disposition | Compatibility requirement |
| --- | --- | --- |
| `/products/create` | `/products/new` | Keep a redirect through at least the Phase 4 observation window. |
| `/products/edit/:id` | `/products/:id/edit` | Preserve ID and query parameters; test deep links and staff permission denial. |
| `/products/:id` | `/products/:id` | Keep as canonical read/detail route. |
| `/catalog` | `/products` | Redirect; do not retain a second marketplace-only catalog implementation. |
| `/marketplace-orders` | `/orders?channel=marketplace` | Redirect while preserving selected order/filter where possible. |
| `/orders/:id` | `/orders/:id` | Keep URL; replace data adapter only after additive all-channel contract lands. |
| `/store-management`, `/customization*` | `/channels/storefront` | Redirect only when equivalent Website editing is available; marketplace-only users see an add-Website action, not unauthorized. |
| `/usage/*`, `/settings/billing` | `/billing` plus compatible children | Avoid confusing Rentify subscription/usage with customer COD. |
| `/support` | `/help` | Existing redirect remains. |
| `/ops/*`, `/search` | retire after telemetry confirms no active links | Keep explicit redirects until then; wildcard redirect must not hide broken links during tests. |

Changing route order is risky because `/products/:id` currently appears before
literal create/edit routes. React Router ranks routes today, but route tests
must prove literals and compatibility aliases after consolidation. Bookmarks,
notification targets, onboarding links, and external POS/marketing URLs must
be included in the migration test matrix.

## English and Khmer coverage

- Shared merchant locale catalogs exist in English and Khmer and contain many
  dashboard keys. The Website onboarding flow uses the translation context.
- `/start`, marketplace-only catalog/order pages, shell banners/search/upsell,
  and substantial parts of product/order management remain hard-coded English.
  A source scan finds hundreds of likely hard-coded customer strings, so
  translation coverage cannot be inferred from catalog presence.
- Date, number, and USD formatting frequently call `toLocale*` without the
  selected locale or render `$` strings directly. P4 must use locale-aware
  formatters while preserving the approved USD-only COD contract.
- Khmer expansion, wrapping, form labels, validation, status/reason messages,
  CSV reports, and 360 px layouts need explicit tests. Missing keys must fail
  CI rather than silently displaying English or the key.

## Accessibility and mobile gaps

- Strengths: the merchant shell uses a mobile Sheet, lists switch to mobile
  cards, several controls have labels/status roles, shared primitives provide
  keyboard foundations, and reduced-motion CSS exists.
- Gaps: clickable onboarding step `<li>` and cards are not keyboard controls;
  some icon/image alternatives are decorative or generated rather than editable;
  status feedback often shares one visual treatment for success and error;
  browser `prompt()` is used for cancellation; focus restoration and initial
  focus are not proven for drawers/dialogs; tables rely on horizontal scroll;
  touch targets and 200% zoom have no journey evidence.
- The Admin reference collapses to an icon-only 60 px sidebar below 900 px and
  keeps wide tables scrollable. Merchant Phase 4 should retain its Sheet-based
  mobile navigation, add labels/accessible names to every icon action, prefer
  cards or prioritized columns on narrow screens, and avoid copying Admin's
  desktop operations density onto merchant phones.
- There are no authenticated browser tests for onboarding, product/SKU, bulk
  jobs, or unified order operations. Existing merchant tests mainly inspect
  route/tab source and one optional storefront smoke URL.

## Exact files expected to change during implementation

This is the anticipated boundary; each package should narrow its own diff and
update this map when discovery changes it.

### P4-MER-000 foundation

- `rentify-frontend/apps/core/merchant/src/routes/dashboardRoutes.jsx`
- `rentify-frontend/apps/core/merchant/src/config/dashboard-tabs.jsx`
- `rentify-frontend/apps/core/merchant/src/layouts/dashboard/{Layout.jsx,AppSidebar.jsx,NavMain.jsx,SiteHeader.jsx,PageHeader.tsx}`
- `rentify-frontend/apps/core/merchant/src/styles.css`
- shared shell/data components under `rentify-frontend/libs/shared/src/ui/`
  and `rentify-frontend/libs/shared/src/layouts/dashboard/`
- `packages/design-tokens/{tokens.json,index.css,tailwind-preset.js}` only if a
  missing semantic token is proven; do not fork Admin-only token names.
- merchant route, component, accessibility, and browser tests under
  `rentify-frontend/e2e/` and colocated `*.test.*` files.

### P4-MER-001 and P4-MER-002

- `rentify-frontend/apps/core/marketing/src/pages/Onboarding/StartSelling.jsx`
- `rentify-frontend/apps/core/marketing/src/pages/Onboarding/AdvancedOnboarding.jsx`
  and relevant `components/`
- `rentify-frontend/apps/core/merchant/src/pages/overview/Overview.tsx`
- replace/consolidate
  `rentify-frontend/apps/core/merchant/src/pages/overview/MarketplaceStoreOverview.jsx`
- new onboarding/checklist adapters and components under the marketing and
  merchant apps.
- `rentify-server/src/modules/stores/{storeRoutes.js,storeController.js}` plus
  a bounded onboarding/checklist service/model/migration if the accepted
  contract requires persisted draft state.
- `docs/openapi/core.openapi.yaml`, generated clients, locale catalogs, Core
  integration/security tests, and merchant browser tests.

### P4-MER-003 and P4-MER-004

- consolidate `rentify-frontend/apps/core/merchant/src/pages/product-form/`
  and `pages/product-management/`, including `StoreCatalogPage.jsx`,
  `ProductManagement.tsx`, `ProductDetailView.tsx`, related hooks, modals, and
  `services/productImages.js`.
- Store-first adapters in `rentify-frontend/libs/shared/src/api/`.
- `ecommerce-server/modules/store-catalog/` for the authoritative Store API;
  selected reusable catalog/variant logic under
  `ecommerce-server/modules/catalog/`.
- new bounded import/export job model, migration, worker/service, and routes
  under `ecommerce-server/modules/` rather than client-only CSV behavior.
- `docs/openapi/commerce.openapi.yaml`, generated clients, catalog/import
  integration and tenant tests, frontend unit/a11y/browser tests, and locale
  catalogs.

### P4-MER-005

- consolidate `rentify-frontend/apps/core/merchant/src/pages/order-management/`
  and `hooks/useOrderManagement.js` / `hooks/useOrderProcessing.js`.
- `ecommerce-server/modules/checkout/{marketplaceCheckoutRoutes.js,marketplaceCheckoutController.js,marketplaceOrderService.js}`
  and order-domain modules only through additive, shared state-machine APIs.
- `docs/openapi/commerce.openapi.yaml`, generated clients, order/COD/return
  integration and tenant tests, frontend unit/a11y/browser tests, and locale
  catalogs.

### Documentation maintained with implementation

- `docs/ai-implementation-plan.md`
- this audit as discoveries are resolved
- `docs/platform-architecture.md`, relevant contracts, and migration notes only
  when behavior or an accepted boundary changes.

## Recommended delivery order and gates

1. P4-MER-000: approve target IA, token/component contracts, route aliases,
   content keys, and test shell. No page redesign before this gate.
2. P4-MER-001: add an additive durable onboarding contract, then migrate both
   entry paths without duplicate Store/Website/subscription effects.
3. P4-MER-002: compose server facts into the launch checklist and action queue.
4. P4-MER-003: complete Store-first Product/SKU/media parity and migrate one
   editor/list for both merchant types.
5. P4-MER-004: land durable import/export jobs and then the UI wizard/history.
6. P4-MER-005: add all-channel order reads/actions, then retire duplicate order
   views behind compatibility redirects.

Each slice must pass its affected service verification, React verification,
contract/client checks, Store/staff tenant tests, English/Khmer checks, 360 px
and desktop browser tests, keyboard/accessibility tests, and a route-compatibility
test before the next duplicate implementation is removed.
