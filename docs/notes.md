# Platform notes and open questions

**Updated:** 2026-09-24. Keep observations tied to code; move settled choices
into `platform-architecture.md` and remove stale notes.

## Agreed decisions

- Rentify will be the backend for the combined platform. Marketplace code is
  being moved into this repository for migration and UI development.
- Merchants may start with a marketplace-only store or a customizable
  storefront. Storefront products also appear in the shared marketplace.
- Storefront onboarding includes a primary store category.
- One canonical catalog and transaction state serve both channels.
- **Store cardinality decision (2026-09-23):** One merchant account owns one
  Store. A Store has at most one Website; marketplace-only Stores have none.
  An existing marketplace-only Store may add its single Website later.
- **Domain decision (2026-09-23):** Give each Website a Rentify-owned subdomain
  by default. A merchant may optionally connect a domain they own. Domain
  registration for every merchant is not part of the default offering.
- **Category decision (2026-09-23):** A Store has one editable primary category.
  Additional Store categories are derived from its published products. Every
  product has one specific marketplace category, which may differ from the
  Store's primary category. Storefront template suggestions use the primary
  category only as an initial recommendation and never auto-change a chosen
  template. Merchant collections are separate from marketplace taxonomy.
- **Buyer direction (2026-09-23):** The owner wants one Rentify buyer account
  across the marketplace and all merchant storefronts. The proposed technical
  design is recorded in `adr/0002-unified-buyer-identity.md`; its session and
  migration details remain a draft until reviewed.
- **Store authority and approval (2026-09-23):** Core owns Store profiles,
  ownership, and marketplace seller approval. Commerce owns products and
  enforces channel eligibility. Storefront merchants can accept launch COD
  orders after basic account and platform checks; shared marketplace selling
  requires Store-level approval. An “unverified” label alone is insufficient
  for central marketplace selling. Product-level moderation remains possible.
- **Launch payments (2026-09-23):** Both buyer channels accept COD only. Do
  not present the planned bank integrations as launch features. Record actual
  cash collection rather than marking orders paid at creation.
- **Future bank settlement direction (2026-09-23):** Use one order/checkout
  authority with two eventual online routes: merchant-specific bank API keys
  and direct settlement for storefront purchases; bank-managed hold and seller
  payout for central marketplace purchases. The bank quoted $100 for the
  latter facility. The suggested 24-hour hold is not final; release criteria,
  refund/dispute flows, and bank capabilities still need validation.
- **Marketplace visibility (2026-09-23):** New storefront Stores default to
  marketplace visibility on. A merchant can turn that default off and may
  override it per Product. The switch affects marketplace visibility only;
  Product data and stock stay canonical. Marketplace-only Stores list through
  the marketplace channel. Seller approval still gates public marketplace
  purchases. Basic listing access does not require a higher storefront tier.
- **Launch order and COD policy (2026-09-23):** A marketplace order contains
  products from one merchant only. Buyers purchasing from different merchants
  place separate orders. Each merchant fulfills, collects COD cash directly,
  and handles confirmed direct refunds. Rentify does not hold or remit COD
  cash. Launch revenue is subscription fees only, with no per-order
  marketplace commission. Marketplace-only merchants need a subscription
  entitlement independent of Website creation.
- **Hackathon marketplace-only entitlement (2026-09-23):** Use a free pilot
  entitlement for marketplace-only Stores. A Store and seller application can
  exist without a Website subscription. The pilot is a temporary product
  entitlement, not a permanently agreed pricing plan; no launch order
  commission applies. Marketplace selling still requires seller approval.
- **Future marketplace payment model (2026-09-23):** The hackathon release
  keeps marketplace COD. Once the bank-managed online marketplace payment
  flow is ready and validated, retire marketplace COD with notice and make
  central marketplace checkout online-only. Storefronts may continue COD and
  add direct-to-merchant bank payments. A marketplace online commission would
  be deducted from seller payout; storefront sales remain subscription-funded.
  The commission rate, fee basis, refund reversals, and bank contract remain
  undecided. Do not pitch this as an implemented product capability.
- **Seller approval checklist (2026-09-23):** Admin verifies seller phone and
  email, responsible person/business identity, Store details and location,
  buyer contact, a clear sample product with price and stock, and commitment
  to delivery, COD, returns, and direct refunds. Outcomes are approved, needs
  changes, or rejected with reason. Flagged/restricted products may require
  separate review. Specific restricted-product rules remain to be written.
- **COD exceptions (2026-09-23):** Failed deliveries record reasons and may
  be retried by buyer agreement or cancelled unpaid with stock released.
  Delivery and payment status stay separate. Buyers can request returns or
  open order-linked complaints. Merchants perform direct refunds and record
  confirmed amount, method, and date; admins review complaints and can
  suspend marketplace access for serious/repeated failures. Return eligibility,
  response deadlines, and minimum evidence remain policy details.

## Study order

- A code-backed snapshot of Rentify's present service boundaries is now in
  `current-rentify-architecture.md`. Validate it against running services and
  live data during migration Phase 0. The proposed Store ownership and client
  contracts in `platform-architecture.md` remain provisional until then.
- The relocated marketplace project is parked migration input while this
  architecture study happens; relocation itself did not integrate its code.

## Current code observations

- Rentify currently treats `websiteId` as the commerce tenant key. Its
  catalog and access model need a Store that works without a Website.
- Rentify core originally created a trial subscription before its Website,
  omitting the required `websiteId`. Initial commerce sync sent a Core-only
  `customization` status. The Phase 0 repair now creates both records in one
  transaction with the Website first and maps that status to Commerce
  `inactive`. The model and cross-service contract passed a disposable
  database check on 2026-09-23; this does not yet prove the full browser
  onboarding flow or durable recovery from a failed sync.

## Phase 0 implementation record (2026-09-23)

- Reordered Website and trial Subscription creation within one transaction;
  `Subscription.websiteId` is populated before commit, and rollback covers
  failed trial creation. Paid Website subscriptions also now populate the
  required Website foreign key.
- Mapped Core deployment states to Commerce operational states. Commerce stays
  inactive while the Website is being customized or built; the deployment
  completion route updates Commerce when Core marks the site active. For new
  Websites with an outbox row, failed status updates keep the latest status
  queued for retry. Older Websites create a status-only retry row when their
  deployment status next changes.
- Persisted initial Commerce sync payloads in a Core outbox in the Website
  transaction. A background job retries pending rows after temporary failures;
  repeated Commerce sync avoids duplicate template-content rows. Corrected
  the Windows quality scanner so both API `npm run verify` gates execute.
- Verified Core signup, Website/trial creation and linkage, Commerce sync twice, and Product
  creation against separate `rentify_core_test` and `rentify_commerce_test`
  databases. A disposable Core check also verified that a new Website queues
  a sync row, successful delivery marks it synced, and the retry worker
  processes an aged pending row. The outbox migration
  was applied to the running local development Core database. Both API
  `npm run verify` commands passed.
- Still to validate before Phase 0 exit: full browser/API signup and
  storefront purchase flow in a disposable environment. Historical Websites
  created before the outbox migration get a retry row on their next status
  change, but there is no periodic audit yet comparing every Core Website
  with its Commerce projection.
- KhmerCraft's API is Express/TypeScript/Mongoose with its own User, Store,
  Product, Cart, Order, Review, and payment models. Its Angular UI is a useful
  central marketplace starting point; its admin dashboard currently uses
  in-memory sample data.
- KhmerCraft's public catalog can expose draft/archived products when status
  is requested. Its seller order transition changes the whole mixed-seller
  order, and cancellation can label a paid order refunded without executing
  a refund. These behaviors must not be carried into the Rentify target.
- The original KhmerCraft web client and API used separate ports. This is a
  historical observation; normal Angular development routes now use Rentify
  Core and Commerce only.

## Store foundation implementation record (2026-09-23)

- Core now creates one Store UUID per merchant, and each Website optionally
  links to one Store. Database uniqueness enforces one Store per owner and one
  Website per Store. A Store can exist without a Website.
- A new Store defaults to `marketplaceEnabled: true` and seller approval
  `pending`. The merchant may change the Store setting through the authenticated
  `/api/stores/mine` route. The per-product override and actual publication
  filtering belong to the Commerce catalog phase.
- The additive Core migration backfilled five Websites in the isolated test
  database and two in local development. Each mapped to exactly one Store.
  Historical primary categories remain null with `needsCategoryReview: true`;
  the old Website niche is not treated as marketplace taxonomy.
- The initial Core verification gate and disposable marketplace-only Store
  smoke check passed. The later increment below extends that foundation.
- A later Phase 1 increment added Core seller application and admin review
  endpoints, decision audit rows, a retryable versioned Store projection into
  Commerce, nullable Store keys for website-scoped commerce rows, and a free
  pilot entitlement. Commerce's `npm run db:audit-stores` reports zero mapping
  conflicts in the local development database. The isolated test database
  retains two deliberately unmapped legacy fixtures, so that audit does not
  pass there. Both API verification suites and a fresh Core migration run
  passed. Store-keyed commerce operations and taxonomy mapping are still open.
- The onboarding increment now uses a controlled primary category list and
  sends merchants without a Store to `/start` after login. Marketplace-only
  Stores have a focused dashboard for Store settings and seller application.
  Existing marketplace-only Stores can begin the storefront plan/template
  path without creating a second Store. The live default subdomain, custom
  domain verification, and full browser journey still need implementation and
  validation. Product management for Website-less Stores begins in Phase 3.

## Catalog increment (2026-09-23)

- Commerce Product now supports a null Website key and a specific marketplace
  category plus nullable per-product marketplace visibility. Store-keyed owner
  routes create/list/update those Products; public marketplace reads apply
  seller approval, active Store, reviewed primary category, pilot entitlement,
  publication, and visibility at query time.
- The merchant Store catalog screen can create Website-less Products and
  manage the shared Product category, stock, publication, and visibility.
  Storefront Product creation accepts a specific marketplace category too.
  Existing storefront products without one need category review before they
  can enter public marketplace discovery.
- Public Website Product reads now exclude drafts and archived products.
  Authenticated Website management reads preserve access to those states.
  This was the Phase 3 state before the designed marketplace UI became the normal
  Angular development route.
- The owner confirmed KhmerCraft has no independent data. Existing Rentify
  Stores and Products supply marketplace listings through the default-on
  Store setting and shared Commerce catalog. Seller approval, reviewed Store
  and Product categories, publication, entitlement, and opt-outs still gate
  public visibility. No KhmerCraft import or MongoDB service is part of the
  platform plan.
- The legacy Website Product edit, bulk edit, inventory, and delete paths now
  use version checks and archive semantics. Stock adjustments preserve draft
  state and reject a negative balance. Order, POS, invoice, and stock-service
  writers still need transactional review before catalog cutover.
- The Phase 4 checkout audit found required Website IDs on Commerce Cart and
  Order, a Core-versus-Commerce Website ID lookup mismatch in order creation,
  non-COD payment paths, cached cart prices in order creation, and multiple
  stock writers. This explains why Angular must not switch to the new catalog
  reader before its checkout moved to Commerce. The marketplace UI now
  uses Commerce for both in development.

## Development seller rule (2026-09-24)

- Core auto-approves only pending active Stores in development when the
  merchant has a verified email or phone and a valid selected primary Store
  category. The rule is enabled by `DEV_MARKETPLACE_AUTO_APPROVAL=true` and
  refuses to run in production. Rejected and suspended sellers stay blocked.
- The local approval check inspected two existing Rentify Stores. Both need
  primary category selection; neither was automatically approved. No category
  was guessed. Website merchants now see a category prompt in the dashboard;
  marketplace-only merchants can edit their Store category. Once they select
  one, Core can approve and project them to Commerce.
- Commerce still checks Store publication eligibility, Product publication,
  valid marketplace Product category, visibility, price, and stock at checkout.
- Normal Angular development routes now use the designed Rentify Marketplace UI; the
  KhmerCraft API remains reference code only. Production domain, browser,
  and operational checks remain open.

## Marketplace mock catalog (2026-09-24)

- The two local seeded Stores are mock data. Aura Botanicals is classified as
  `Beauty & Skincare`; NexTech Electronics as `Electronics`. Both owners have
  verified contacts, so the development rule approved them after category
  selection and projected the approvals to Commerce.
- All six Aura products use marketplace `Skincare`. NexTech's smartwatch uses
  `Phones & Devices`; its other five products use `Electronics Accessories`.
  The demo merchant delivery fees are USD 2.50 for Aura and USD 3.00 for
  NexTech. Merchant-set policies are left intact if already present.
- The repeatable local commands are `docker compose exec -T core-api npm run
  db:seed-marketplace-mocks` followed by `docker compose exec -T
  ecommerce-api npm run db:seed-marketplace-mocks`. They require the existing
  mock Stores, Websites, Products, and Core-to-Commerce projection. The public
  Commerce marketplace endpoint returned 12 eligible products; projection
  and Store mapping audits reported zero mismatches.

## Open product and architecture questions

1. What products are restricted or prohibited in marketplace listings, and
   which require individual review?
2. Set exact COD collection/refund evidence, return eligibility, and complaint
   response deadlines before public launch. The main workflow is agreed.
3. Confirm the proposed buyer sign-in handoff, storefront callback hosting,
   and legacy customer account-linking process before implementation.
4. Define post-pilot marketplace-only package pricing and the transition from
   the free pilot entitlement without introducing a launch order commission.
5. Before the later online-payment phase, confirm the bank's per-order hold,
   release, commission split/deduction, refund, callback, fee, and
   reconciliation contracts. Define the final payout trigger and commission
   rate from those capabilities.

## Documentation practice

Record a dated decision and its reason when an open question is resolved.
Link code and tests when an implementation lands. Do not mark a phase complete
solely because documentation or source relocation is complete.

## 2026-09-24 buyer checkout decision

For the hackathon, buyer checkout on merchant storefronts launches only on
Rentify-hosted subdomains. Custom merchant domains wait for the one-time-code
handoff and host-local session in ADR 0002. `rentifystore.shop` is the
provisional parent domain to configure; it is not yet owned or deployed.
Auth, Core API, Commerce API, marketplace, and storefront hosts must be
deployed under a compatible owned site for shared Core buyer cookies, and
real-browser cookie/CORS tests must precede activation.

For the hackathon marketplace COD checkout, buyers must sign in with a
verified Rentify buyer account. Guest COD checkout is deferred. Commerce's
new marketplace route uses the verified Core user ID as `buyerId` and never
accepts a client-supplied buyer ID. This does not yet switch Angular login or
merchant custom-domain sessions; see the Phase 4 checkout contract.

## 2026-09-24 marketplace delivery fee decision

For the hackathon marketplace COD checkout, the buyer pays a merchant-set
delivery fee that is posted before order placement. Commerce stores one flat
USD fee per Store for the pilot, including zero for posted free delivery. The
cart displays the current fee and full COD total; checkout requires that
quoted total and rejects a changed price or fee. The fee and policy version
are snapshotted on the order. Merchants deliver and collect the entire COD
amount directly. Zone/weight rates and tax treatment remain later decisions.

## Telegram sign-in (2026-09-24)

- Core exposes `GET /api/auth/telegram-login-config` (public bot id from
  `TELEGRAM_BOT_TOKEN`) and `POST /api/auth/login/telegram`, which verifies the
  Telegram Login Widget hash and signs in an existing verified `User` matched by
  `telegramUserId` (set when the user shares their phone with the bot).
- Platform accounts only; storefront customer and staff Telegram sign-in are not
  implemented. The bot's domain must be set with BotFather `/setdomain` for the
  widget popup to work.

## 2026-09-24 POS store-level tenant migration decision

Point of Sale (POS) is established as an in-person physical sales channel of the Store, operating independently of whether a merchant maintains an online storefront Website.
- Commerce order routes support both `POST/GET /api/order/stores/:storeId/orders/pos` and the backward-compatible `/websites/:websiteId/orders/pos`.
- POS orders, invoices, stock deduction, and payment gateway configurations resolve `storeId` directly when `websiteId` is absent.
- The merchant POS interface and product catalog query by `storeId` for marketplace-only merchants, deriving categories from loaded store inventory if storefront collections are not defined.

## 2026-09-26 POS variant selection

Current: selecting a product with active variants opens a picker before adding it to a POS sale. The cart keeps each product and variant combination on its own line, uses variant price and stock, and sends the variant ID and option values in POS order requests. Products without variants still add directly.

## 2026-09-25 storefront Template 2 content and theme findings

Template 2 (`rentify-frontend/apps/templates/ecommerce/ecommerce-template-2`)
now shares Template 1's customer-only storefront foundation with its own
editorial layout. Its home sections are driven by optional `WebsiteContents`
fields listed in `TEMPLATE_2_FIELDS`
([storeContent.js](../rentify-frontend/apps/templates/ecommerce/ecommerce-template-2/src/storeContent.js));
each section stays hidden until the merchant fills it in, so a new store shows
no placeholder claims. `rentify-server/scripts/seed.js` seeds the same fields
as empty Template 2 `TemplateContents`. Websites created before this change do
not receive the new fields automatically; the merchant design editor only
edits content rows the website already has.

Product badges use product data only: a discount when `compareAtPrice` is
higher than `price`, otherwise "New" for products created in the last 30 days.
There is no sales data, so the second home product row shows a category the
merchant names in `Featured Category`, under a merchant-written title.

`resolveStorefrontTheme` now derives readable text, surface and border colours
from a merchant `background` when the palette sets no text colour and the
template text would be unreadable on it (for example the seeded dark navy
Template 2 palette). Colours the merchant sets explicitly are never replaced.

Open finding: `GET /api/product/:websiteId?sort=featured` returns HTTP 500 and
includes a server stack trace, because `ProductService.buildOrder` orders by a
`feature` column that the Product model does not have. Both storefront
templates no longer offer that sort.

## 2026-09-25 storefront hosting decision

Storefronts are no longer built per merchant on Vercel. One deployment of the
storefront app (`rentify-frontend/apps/storefront`) serves every Rentify-hosted
store: it resolves the Website from the browser host and loads Template 1 or 2
on demand. Publishing assigns a permanent `Websites.subdomain` (migration
`20260925_010_website_subdomain`) and marks the Website active; nothing is
built, so content edits and template releases reach every store at once. This
implements the 2026-09-23 domain decision for Rentify-owned subdomains.

Reasons: the per-merchant Vercel flow could not work as configured (missing
repository id, stale `rentify-client` repository, localhost API URLs baked
into builds, `*.vercel.app` origins rejected by CORS, a new Vercel project per
publish, Node 18), and every build of a template was identical because the
template already resolved its store at runtime.

Related hardening: the public website lookup serves hosted subdomains only for
`active` Websites; the deployment status endpoint no longer lets merchants set
`active` or other Rentify-controlled statuses, or overwrite `Website.domain`
from the browser.

Local development: both APIs default to `HOSTED_STOREFRONT_DOMAIN=localhost`
and `HOSTED_STOREFRONT_DEV_PORT=4900` in Docker, so stores open at
`http://<subdomain>.localhost:4900`. The dev port is ignored in production.

Still open: connecting and verifying a merchant's own domain (the old Vercel
client was removed; Vercel's domain API is the likely path), a production
store domain and public API hosting, and removing merchant email, phone and
staff details from the public website lookup response.

## 2026-09-25 storefront owner tools and session refresh grace

Store owners edit their storefront from the live store again. Templates wrap
their layout in `StorefrontOwnerProvider`
([StorefrontOwner.jsx](../rentify-frontend/libs/storefront/src/owner/StorefrontOwner.jsx)),
which asks Core `GET /api/websites/:websiteId/owner-access` with the visitor's
session. Only the owner (or an admin) gets a positive answer; only then is the
editor chunk (`OwnerToolbar`) downloaded, so shoppers never load owner code.
The editor lists the template's section fields (`TEMPLATE_2_FIELDS`,
`TEMPLATE_1_FIELDS`) and saves through
`PUT /api/websites/:websiteId/storefront-content`, which re-checks ownership,
accepts only the labels in
[storefrontContentFields.js](../rentify-server/src/modules/websites/storefrontContentFields.js),
validates each value (plain text with length limits, https image URLs), creates
missing content rows in one transaction and clears the public website cache.
Images upload through the existing owner-only `/uploadImage/:websiteId`.
The owner panel also adds products and categories through Commerce's existing
`POST /api/product/:websiteId` (product permission required) and
`POST /api/categories/:websiteId`. Commerce's product form config now returns
`quickAddFields`: the extra fields each store type's validation requires
(skincare: skin types and ingredients; fashion: fabric and sizes; restaurant:
preparation time), so the quick form asks for exactly those. Category creation
now requires a trimmed name (up to 80 characters) and accepts an optional https
photo.
Hosted stores need `COOKIE_DOMAIN` to cover the store subdomains so the
merchant session reaches Core.

Refresh-token rotation now has a 60-second grace window
([refreshTokenGrace.js](../rentify-server/src/utils/refreshTokenGrace.js)):
requests that race a rotation with the just-replaced token receive an access
token instead of signing the person out. Only a SHA-256 fingerprint of the
replaced token is kept in Redis; without Redis the previous behaviour applies.

The public `getWebsiteByDomain` lookup no longer returns the owner's email or
phone, or staff contacts and permissions.

## 2026-09-26 horizontal scaling blockers (deferred)

**Open.** Neither API can safely run more than one instance today. The
backend modularization below improves maintainability, not runtime capacity,
so these items are recorded here and scheduled after it:

1. **In-memory sessions.** Both `sessionConfig.js` files
   ([Core](../rentify-server/src/config/sessionConfig.js),
   [Commerce](../ecommerce-server/config/sessionConfig.js)) create
   `express-session` without a `store`, so the process-local MemoryStore is
   used. Core's Passport OAuth handshake depends on it: a login that starts on
   one instance and finishes on another fails, and every restart drops
   sessions. Target: a Redis-backed session store.
2. **Scheduled work runs in every API process without a lock.** Core starts
   `websiteSyncJob` (every minute); Commerce starts `billingWorker` (daily) and
   `recoveryWorker` (every 15 minutes). Core's `raasReminderJob` defines a
   15-minute schedule but is never started today; if it is wired up it needs
   the same protection. With N instances each job runs N times, which would
   duplicate billing statements and reminders. Target: a Redis lock per job run, or a
   separate worker process.
3. **Process-local caches.** For example `opsInvoiceFactsService` keeps its
   cache in a module-level `Map`; each instance would hold its own stale copy.
4. **Core rate limiting is disabled.** `app.use(rateLimiter)` is commented out
   in Core's `app.js`.
5. **Request-time aggregation.** Commerce's `ecommerceStatsController`
   aggregates Cart, Order, OrderItem, Payment and Product on every request;
   the database, not Node, will be the first capacity limit as data grows.

## 2026-09-26 backend modularization (in progress)

**Decision.** Reorganize both APIs from technical layers (`controllers/`,
`services/`, `routes/`, …) into a modular monolith: one folder per business
domain under `modules/`, each owning its routes, controllers, services and
domain helpers, while cross-cutting infrastructure (`config/`, `middlewares/`,
`utils/`, `models/`) stays at the package root. The work proceeds one API at a
time (Core first, then Commerce), each file move in its own commit, with the
full test suite green and the route table unchanged after each step.

Constraints for this work:

- **Behavior-preserving.** HTTP paths, responses, the database schema and
  `migrations/` do not change. Frontends are unaffected.
- **Models stay in one registry.** Sequelize associations span domains (38 in
  Core, 32 in Commerce), so `models/index.js` remains the single place that
  defines models and associations.
- **First pass is a file move.** Oversized, multi-domain files (Core
  `authService`, `websiteService`; Commerce `ProductService`,
  `marketplaceCheckoutService`) move intact and are split later.
- **Boundaries come second.** After the move, modules should call each other
  only through a module's `index.js`, and direct cross-domain model access
  from controllers should move behind the owning module's service.

Progress:

- **Core — file move done (2026-09-26).** `routes/`, `controllers/`,
  `services/` and `jobs/` are replaced by 14 modules under
  `rentify-server/src/modules/` (layout in the
  [Core README](../rentify-server/README.md)). The mounted route table is
  identical before and after (94 routes) and `npm run verify` passes.
  Findings kept as-is for later: `modules/notifications/telegramService.js`
  lazily requires a `models/Customer` file that Core does not have;
  `modules/ops/raasReminderJob.js` is never started; `commerce-sync/syncService.js`,
  `utils/limitCalculator.js`, `utils/passwordUtils.js` and `utils/cookieUtils.js`
  are not imported anywhere.
- **Commerce — file move done (2026-09-26).** `controllers/`, `routes/`,
  `services/`, `workers/` and `core/` are replaced by 17 modules under
  `ecommerce-server/modules/` (layout in the
  [Commerce contributing guide](../ecommerce-server/CONTRIBUTING.md)); the niche
  strategy classes from `core/` now live in each owning module's `core/`
  folder. The mounted route table is identical before and after (138 routes)
  and `npm run verify` passes. Two edits beyond path rewriting keep behavior
  the same: `updateDeploymentUrls.js` resolves `.env` one level further up, and
  `apiMountScope.test.js` reads router paths from `app.js` instead of assuming
  a `routes/` folder. Findings kept as-is for later: relative requires that did
  not resolve before the move still do not (`telegramService` requires
  `models/User`; base methods of `OrderStrategy` and `EcommerceOrderStrategy`/
  `EcommerceNicheStrategy` require `models` paths that do not exist and would
  throw if a subclass does not override them); `MerchantController.js`,
  `OrderService.js`, `productValidation.js`, `invoiceUtils.js`,
  `utils/orderHelpers.js`, `utils/sanitizeData.js` and `config/rateLimiter.js`
  are not imported anywhere.
- **Tooling.** `tools/move-modules.js` performs a move from a JSON map
  (`git mv` plus relative-path rewriting in code, Markdown links and
  CODEOWNERS); `tools/maps/commerce.json` is the Commerce map.
  `tools/route-table.js` lists an app's mounted routes so the before/after
  comparison can be repeated.
- **Next: boundaries.** Route cross-module calls through each module's
  `index.js` and move direct cross-domain model access out of controllers.
