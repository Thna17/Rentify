# Marketplace migration plan

**Status:** In progress, 2026-09-23. Product direction is agreed:
Rentify will become the backend for merchant storefronts and the shared
marketplace. Core Store foundation has started; commerce and legacy marketplace
data have not been migrated. Choices under
**Decisions needed** remain open until the product owner answers them.

Read [current Rentify architecture](current-rentify-architecture.md) for the
existing service map and [platform architecture](platform-architecture.md) for
the product model.

## Success criteria

- A merchant signs up once and chooses **marketplace only** or **storefront
  plus marketplace**. Both paths create the merchant's single Store with a
  primary category. Each Store has at most one Website.
- The first marketplace checkout produces one-Store orders. Merchants fulfill
  and collect COD directly; Rentify charges subscriptions, not order fees.
- Marketplace-only merchants can list and sell without a Website, template,
  domain, or storefront subscription.
- Storefront merchants keep their template and website. Eligible products
  appear on both surfaces with one price and one stock balance.
- Merchant dashboards, storefronts, and the Angular marketplace use Rentify
  APIs. One service accepts authoritative product and stock writes.
- New buyer checkout initially accepts COD only on both channels. Future bank
  integrations are outside the initial release.
- Existing accounts, storefront URLs, orders, and financial records remain
  accessible through migration. No payment is silently marked refunded.
- The legacy marketplace API can be stopped without losing a live workflow.

## Proposed service boundary

| Concern | Proposed authority | Integration rule |
| --- | --- | --- |
| Merchant/admin/staff identity, Store ownership and category, website linkage | Core API | Core issues stable Store UUIDs and exposes ownership/permission checks to Commerce. |
| Website template, theme, domain, deployment, subscription | Core API | Website is optional and references Store. |
| Products, marketplace taxonomy, inventory, carts, orders, invoices, POS, payments, reviews, selling fees | Commerce API | All sales channels use canonical records and state transitions. |
| Marketplace UI | Relocated Angular web app | Calls Rentify APIs through a client adapter; no live writes to MongoDB. |
| Merchant dashboard and storefronts | Existing React/Vite apps | Move from website keyed commerce calls to Store keyed calls behind a compatibility period. |

This mapping follows existing Core/Commerce responsibilities. Core owns Store
profiles and marketplace seller approval; Commerce enforces the resulting
channel eligibility through a small Store access projection, updated through
versioned and retryable messages. Buyer identity implementation details still
need confirmation.

## Rules for a safe migration

1. **One writer per record type.** Never dual-write product, stock, order,
   payment, or customer mutations to MongoDB and MySQL. Use an import, a
   controlled final delta, and a write freeze at cutover.
2. **Stable IDs.** Persist `legacy_source + legacy_id -> new_uuid` mappings.
   Keep the old ID for audit and idempotent reruns. Slugs and domains are not
   identity keys.
3. **Compatible reads first.** Add Rentify APIs and adapters before removing
   website based routes or response fields. Existing storefronts keep serving
   during backfill.
4. **Expand, backfill, enforce.** Add nullable Store keys and indexes, backfill
   every legacy row, switch readers and writers, then enforce constraints.
   `websiteId` stays optional for marketplace-only sales.
5. **Fail closed on commerce state.** A delayed service may postpone listing or
   checkout. It must not create an unowned product, oversell, or claim a
   payment/refund succeeded without confirmation.
6. **Reconcile continuously.** Compare store and product counts, stock,
   orders, payments, and access assignments before and after each release.
   Imports and projections need retry and failed-record handling.

## Phase 0 — understand and stabilize Rentify

**Progress (2026-09-23):** The Website/trial foreign-key ordering and initial
Core-to-Commerce status mismatch are repaired. Both API verification gates
pass. A disposable database check covered Website/trial creation, repeated
Commerce sync, Product creation, and the durable sync outbox. Older Websites
gain status-only retry rows when their deployment state changes. Full
signup-to-purchase browser testing and a cross-service projection audit remain
before this phase's exit gate.

**Work**

- Trace current onboarding, website sync, product management, storefront
  reads, checkout, POS, invoices, payments, and refunds. Record API shapes,
  ownership, production dependencies, and tenant rules.
- Inventory live Rentify and KhmerCraft data: account/store counts, active
  orders, payment providers, domains, images, taxonomies, slugs, and retention
  requirements. Take restorable backups and rehearse a restore to an isolated
  environment.
- Repair the existing Core subscription/Website creation ordering, website
  sync status mismatch, and tenant authorization gaps that affect the
  baseline. Give each fix its own migration and behavior record.
- Resolve the product choices below. Publish API contracts and ownership
  diagrams before persistent schema work.

**Exit gate:** existing Rentify merchant signup → website → product → purchase
flow works in a disposable environment. Every source dataset has an owner,
record count, and import destination. Architecture and decisions are recorded.

## Phase 1 — Store foundation and safe schema expansion

**Progress (2026-09-23):** Core Store UUID, one-owner uniqueness, optional
Website linkage, and enabled-by-default marketplace preference are in place.
Core has a seller application and audited admin review API. A versioned,
retryable Core outbox projects Store access and the free pilot entitlement to
Commerce. Nullable Store keys, canonical assignment on website-scoped writes,
and an audit command cover existing commerce records. The local development
audit reports zero unmapped or conflicting rows. Historical Store categories
remain flagged for review; a controlled primary-category list, broader data
reconciliation, taxonomy mapping, and complete Store-keyed commerce routes remain before the
phase exit gate.

**Work**

- Add Core Store with UUID, merchant owner, primary category, slug, status,
  verification state, and audit fields. Link Website to Store without making
  Website mandatory. Enforce one Store per merchant and at most one Website
  per Store with database uniqueness and idempotent creation. Define staff
  access by Store and permitted Website where narrower access is needed.
- Add a seller application review with verified account contact, responsible
  identity, Store and operating details, a sample product description, and COD/fulfillment
  commitment. Record approved, needs changes, or rejected with reasons and
  admin audit history. Marketplace publication waits for approval.
- Add a Commerce Store reference or projection and Store keyed authorization.
  Add `storeId` to Product, Category, Cart, Order, Invoice, Payment, and usage
  records where applicable; retain `websiteId` as optional sales-channel
  context. Inspect each association and query individually.
- Keep marketplace taxonomy, Store primary category, merchant-managed
  categories, and Product category as distinct concepts with explicit maps.
- Change subscription and billing rules so a Store can exist without a
  Website. Use a free pilot entitlement for marketplace-only merchants in the
  hackathon release; define paid pricing later.
  storefront entitlements continue where relevant. No launch transaction
  commission is charged.
- Backfill each Rentify Website to one Store and each related commerce row to
  that Store. Make the mapping idempotent and auditable. Classify missing or
  ambiguous legacy categories before making primary category required for
  imported Stores.

**Exit gate:** existing storefronts still work; every old commerce row maps
to exactly one Store; marketplace-only Store creation succeeds without a
Website; Store keyed routes enforce owner and staff permissions.

## Phase 2 — unified merchant onboarding

**Progress (2026-09-23):** Login now checks Core Store ownership rather than
Website count. A marketing entry offers marketplace-only Store creation with
a free pilot entitlement or the existing template/storefront path. Both paths
collect a controlled primary Store category. Marketplace-only merchants reach
a Store dashboard for visibility, seller application, and adding a Website
later. Website creation reuses an existing Store and retry requests reuse the
existing Website and trial. Development builds of auth, marketing, and
merchant apps pass. Domain assignment/verification and a complete browser
journey remain before this phase's exit gate. Marketplace-only product tools
depend on Phase 3 Store-keyed catalog APIs.

**Work**

- Change Core auth's `hasStore` meaning and post-login routing: it currently
  counts Websites. A marketplace-only merchant must reach a usable dashboard.
- Build one onboarding entry with two paths. Both collect Store name and
  primary category. The storefront path additionally chooses a template,
  creates the Website, and handles customization, subscription, and deployment.
- Assign the Website a Rentify subdomain by default. Let merchants optionally
  verify and connect their own domain; record domain ownership and avoid
  registering a new domain for each Store.
- Let an existing marketplace-only Store add a Website later while preserving
  product IDs and inventory. Make retries of partially completed creation
  safe and observable.
- Adapt the merchant dashboard to select Store and show website controls only
  when a Website exists.

**Exit gate:** both paths work end to end; retries create no duplicate Stores,
subscriptions, or Websites; existing merchants retain dashboard access.

## Phase 3 — one catalog on both surfaces

**Progress (2026-09-23):** Commerce now has additive Product channel fields,
nullable `websiteId` for Website-less Store products, Store-keyed merchant
create/list/update routes, and public marketplace category/list/detail routes.
Public marketplace reads require active publication, an approved active Store,
pilot entitlement, reviewed primary category, and Store or Product visibility.
The merchant dashboard can manage Website-less Store products. The existing
storefront Product form collects a specific marketplace category, while its
Website reader still uses the same Commerce Product record. Authenticated
Website management reads keep drafts available to merchants; public Website
reads exclude drafts and archived products. The isolated SQL catalog smoke,
Commerce verification suite, and merchant development build pass.
Website management updates now check Product versions; inventory changes
cannot publish a draft or overdraw stock, and delete actions archive products.
The SQL smoke covers a Website-less Product and a Website-linked Product
crossing from draft to both public surfaces and back to archived.

**Gate remains open:** the Angular marketplace still reads and writes the
legacy Mongo API. Switching its catalog reader now would leave cart and
checkout on a different Product authority, so that switch waits for the
Phase 4 checkout adapter. The owner confirmed there is no KhmerCraft data to
import for the hackathon release; historical import is deferred until such
data exists. Cohort shadow comparisons, browser
session/CORS rehearsal, and writer freeze have not occurred. See
[catalog migration contract](catalog-migration-contract.md).
The order, POS, invoice, and stock-service writers still need a shared
transactional stock audit in Phase 4.

**Work**

- Make Commerce the sole Product and inventory writer. Add Store keyed APIs
  for merchant management and marketplace discovery. Keep website keyed APIs
  as adapters until both storefront templates move to the new contract.
- Separate publication from moderation. Public queries and direct product
  lookups never expose drafts or archived products. Marketplace listings are
  purchasable only for Core-approved sellers; storefront COD selling can begin
  after basic account and platform checks. Storefront onboarding sets a
  changeable, enabled-by-default setting for marketplace publication of new products, and each
  Product can override it. Disabling marketplace visibility leaves the
  storefront Product and shared stock intact. Marketplace-only Stores list
  through the marketplace channel. Do not gate basic marketplace access
  behind a higher storefront subscription tier.
- Migrate KhmerCraft Store, taxonomy, Product, image, slug, variant, review,
  and verification data through explicit maps. Convert embedded base64 images
  to managed files and URLs; retain originals until checksums and access
  checks pass.
- Update Angular marketplace and React storefronts to read the same Commerce
  product IDs, prices, and stock. Search indexes and caches are derived
  projections with versioned updates, retries, and reconciliation.
- Align public API URLs, CORS, cookie scopes, and browser credentials for the
  Angular app and both template hosts. Rehearse on localhost and on the
  intended production domain pattern before switching UI traffic.
- Shadow compare listings, categories, prices, images, and search results.
  Move one merchant cohort at a time to the new reader and writer.

**Exit gate:** product create/edit/archive and stock changes appear correctly
on both eligible surfaces; marketplace-only products work without a Website;
draft/archived products remain private; migrated cohorts cannot write to the
legacy catalog. An old reader may be restored only after replaying an audited
delta from the active writer.

## Phase 4 — shared checkout, inventory, and fulfillment

**Progress (2026-09-24):** Commerce has an additive Website-optional
marketplace Cart/Order schema, Core-buyer-linked one-Store COD checkout,
server-side eligibility and price checks, merchant-posted flat delivery fees
shown in cart quotes and snapshotted on orders, transactional row-locked stock
deduction, idempotent checkout keys, seller-scoped delivery/COD/refund actions,
buyer complaint/return events, a Rentify merchant order operations panel, and
a COD reconciliation command. Buyer routes now select Core identity explicitly
when legacy Customer cookies coexist. Existing
order strategies and stock restoration now use a shared stock operation.
Marketplace cart writes and checkout are disabled by default at the Commerce
HTTP boundary until the legacy writer is frozen for an isolated rehearsal or
the combined client cutover.
The legacy Express API now has an opt-in HTTP write freeze that preserves
reads and existing PayWay callbacks. Its staging procedure and limitations
are in [the cutover rehearsal](marketplace-cutover-rehearsal.md).
An isolated SQL smoke passes concurrent last-unit purchases across marketplace
buyers and between storefront and marketplace stock writers, retry behavior,
seller isolation, and COD state transitions. The new Commerce API is described
in [the checkout contract](checkout-migration-contract.md).

**Gate remains open:** Angular's live routes still use the legacy marketplace
API for buyer auth, cart, checkout, and seller operations. An isolated,
disabled Rentify buyer preview is available for staging but is not a live
client cutover. A second default-off flag can serve that buyer shell on normal
Angular paths for a staging route rehearsal after freezing legacy writes.
Core buyer identity is accepted for marketplace
checkout, but custom-domain sessions and legacy account linking in ADR 0002
are not implemented. Variant checkout, full storefront/POS/invoice HTTP
journeys, tax/delivery/return policy, admin dispute workflow, and launch
COD-only UI are still pending. The Phase 3 reader switch waits for this
combined client cutover. No old checkout or payment writer should be retired
yet.

**Pre-implementation audit (2026-09-23):** Existing Commerce `Cart` and
`Order` require a Website ID, so a Website-less Store cannot check out through
them yet. The Website online order controller looks up Commerce's internal
WebsiteData row ID while clients pass the Core Website ID. Its order strategy
accepts payment methods beyond launch COD and carries cached cart unit prices
into order creation. Several order, POS, invoice, and stock-service paths
mutate Product stock separately; some status helpers can turn an archived or
draft Product active after stock changes. These paths need one order-time
eligibility/price check and one transactional stock operation before Angular
can switch its cart and checkout to Commerce. The Phase 3 catalog reader
must remain behind the existing marketplace API until this gate passes.

**Work**

- Route marketplace carts and checkout to Commerce. At order time validate
  Store, publication state, quantity, price, and availability on the server.
  Reserve or deduct stock atomically, or with a durable reservation and
  idempotency key. Marketplace, storefront, POS, and invoice flows must use
  the same stock ledger.
- Snapshot product, seller, price, tax, fee, and delivery terms on order lines.
  Reject mixed-Store checkout at launch. A buyer purchasing from multiple
  merchants places separate orders, each with one merchant responsible for
  fulfillment and COD collection.
- Implement COD as the only launch buyer payment method on both channels.
  The selling merchant delivers, collects cash directly, and handles direct
  buyer refunds. Record amount due, confirmed collected amount, collector,
  collection time, refund confirmation, and failed/returned delivery. Rentify
  does not hold or remit COD cash. Order placement and delivery alone must not
  mark payment paid; reconcile the merchant's confirmed collection.
  Preserve historical KHQR and ABA PayWay references without replaying
  charges or exposing those methods in the new launch checkout.
- Define shipping, tax, returns, COD collection, and buyer dispute handling.
  Launch revenue comes from merchant subscriptions only; do not charge a
  marketplace order commission. Defer online payment provider, hold, and
  payout implementation to a later phase.
- Record failed-delivery reasons, buyer-agreed retry or cancellation, and
  stock release. Keep fulfillment and cash collection state separate. Support
  order-linked return requests and complaints, merchant-recorded direct
  refunds with amount/method/date/confirmation, and admin review and seller
  suspension for serious or repeated failures. Do not mark COD refunded from
  a request alone.
- Implement one central Rentify buyer identity with domain-local storefront
  sessions. Add a custom-domain callback/proxy capable of exchanging a
  one-time authorization code and setting a host-only cookie; a static Vite
  app alone cannot set that cookie for an unrelated domain. Link existing
  marketplace buyers and storefront Customers only through a verified flow.
  Follow the draft buyer identity decision in
  [ADR 0002](adr/0002-unified-buyer-identity.md).

**Exit gate:** concurrent purchases on both channels cannot oversell;
retries create one order and one COD collection effect; sellers cannot change
other sellers' fulfillment; COD collection records reconcile with completed
orders. Online payment methods are absent from buyer checkout.

## Later phase — bank online payments (outside launch scope)

- Keep the shared checkout and order model. Route storefront online payments
  to each merchant's individual bank payment account for direct settlement;
  storefront COD may remain. Route marketplace online payments through the
  bank-managed hold and seller payout facility. When this flow is ready and
  validated, retire marketplace COD and make marketplace checkout online-only,
  with notice to merchants and buyers. Keep one-Store orders unless a later
  product decision explicitly changes that boundary. The bank's quoted $100
  facility fee is a planning input, not a confirmed integration or operating
  cost.
- Propose a commission on completed marketplace online sales, deducted from
  seller payout through the bank's supported split/deduction flow. Storefront
  sales remain subscription-funded without a transaction commission. Decide
  the rate, taxable fee basis, refund reversal, bank fee responsibility, and
  invoice/tax treatment before launch; no rate is currently agreed.
- Agree release timing based on delivery, returns, disputes, and bank terms;
  do not hard-code a 24-hour payout promise. Verify how refunds and partial
  refunds work for one-Store orders.
- Add idempotent payment attempts, authenticated bank callbacks, payout
  ledgers, reconciliation, failure handling, and provider sandbox tests
  before either online flow is enabled.

## Phase 5 — historical data, release, and retirement

**Work**

- Import historical KhmerCraft users, Stores, products, reviews, orders, and
  payment references with idempotent mapping scripts. Preserve audit trails.
  Treat prior gateway transactions as historical references; do not replay
  charges or invent refunds. Define password migration or secure reset and
  account linking before legacy login cutover.
- Rehearse backfill and shadow reads in staging. Record counts, checksums,
  failed-record queues, and a timed cutover and rollback runbook.
- Release by feature flag and merchant cohort: Store foundation, onboarding,
  catalog reads, catalog writes, marketplace checkout, then operations.
  Monitor auth failures, listing lag, stock drift, callback age, order
  failures, and financial reconciliation at each step.
- Freeze legacy writes, replay the final delta, reconcile, switch traffic,
  and keep the legacy API read only for an agreed observation period. Retire
  it after all clients and jobs use Rentify and data parity holds.
- Update root README, Docker Compose, deployment configuration, runbooks,
  and public API documentation for the final layout.

**Exit gate:** both merchant choices and sales channels operate through
Rentify APIs; imported records are accessible to the correct owner; money and
stock reconcile; rollback and restore drills succeed; legacy API credentials
are removed after observation.

## Data and compatibility inventory

| KhmerCraft source | Rentify destination | Required handling |
| --- | --- | --- |
| `User` (BUYER/SELLER/ADMIN) | Core merchant/admin identity; Commerce customer identity pending decision | Map role and status; prevent duplicate accounts; require verified linking/reset where passwords or sessions differ. |
| `Store`, `SellerApplication` | Core Store and verification workflow | Map owner, slug, primary category, status, badge, and application history. |
| `Product`, `StoreCategory`, reviews, embedded images | Commerce catalog, taxonomy, reviews, image storage | Map Store ownership, publication, slugs, categories, variants, stock, and moderation; preserve legacy IDs. |
| `Cart` | Commerce Cart | Migrate sessions only if identity and price can be revalidated; otherwise expire old carts with clear user messaging. |
| `Order`, PayWay transaction references | Commerce historical Order/Payment | Preserve snapshots and IDs; import as read only until lifecycle mapping is proven. Never replay payment requests. |

Existing Rentify Website, Product, Category, Cart, Order, Customer, Invoice,
Payment, and UsageEvent records also need Website-to-Store backfills. Migration
scripts must report unmapped rows and stop before enforcing new constraints.

## Rollback boundaries

| Stage | Switch | Data rule |
| --- | --- | --- |
| Schema expansion/backfill | Restore website keyed application reader | Keep old columns compatible; do not drop data yet. |
| Catalog read switch | Route UI reads to old or new API | One active writer; replay an audited delta before old reads resume. |
| Catalog write switch | Disable new writer per cohort | Never activate old and new writers together; reconcile first. |
| Checkout switch | Disable new checkout for new purchases | Existing orders and payments stay with their original authority through completion. Feature flags never transfer an in-flight payment. |
| Final retirement | Restore from backup/runbook if required | Retain verified historical exports and ID mappings for the agreed retention period. |

Every gate needs named Core, Commerce, frontend, data, payments, and
operations owners; measurable pass/fail criteria; and a recorded continue or
rollback decision. The existing `OWNERSHIP.md` files identify code areas but
do not appoint people.

### Minimum cutover checks

- Zero unmapped active Stores, published Products, Websites, or open Orders.
- Zero unexplained stock differences for published Products. Reconcile
  reserved, available, and sold quantities separately.
- Historical payment and payout totals match the source ledger to the
  smallest currency unit by provider and settlement period. Reconcile new
  COD collection records separately; investigate every difference.
- Public reads return only eligible published products; a Store or Website
  suspension removes them from both surfaces within the agreed cache delay.
- A merchant, staff member, and buyer can see only their own permitted data
  through both UIs and direct APIs.
- New purchases, payment callbacks, cancellation, and refund requests have
  an identified processing owner. No in-flight transaction is silently
  transferred between systems during rollback.
- Runbooks specify backup location, final-delta procedure, feature flag
  values, traffic switch, rollback owner, and the observation period.

## Decisions needed before dependent work

1. Define the restricted-product list and review rules before public
   marketplace publication. The basic seller approval checklist is agreed.
2. Define how a buyer's multi-merchant cart is separated into one-Store
   orders, including delivery charges and order confirmation UX.
3. Confirm the domain-local callback and verified legacy account-linking
   design for the agreed one-buyer-account direction.
4. Set response deadlines, return eligibility, and minimum evidence for COD
   collection and refunds before public launch. The main failed-delivery,
   return, and buyer complaint flow is agreed. Bank online payment, hold,
   marketplace commission, and payout terms belong to the later phase.

Record answers in [notes](notes.md) and update contracts before implementing
the affected phase.
