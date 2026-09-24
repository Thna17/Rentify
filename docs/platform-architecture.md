# Rentify platform architecture

**Status:** Product direction agreed; technical boundaries are provisional,
recorded 2026-09-23. Study Rentify's current architecture before adopting the
proposed ownership and integration details below. This is not a claim that the
integration has already been implemented.

## Product model

Rentify combines customizable merchant storefronts with a shared marketplace.
At account onboarding a merchant chooses one of two entry paths:

1. **Marketplace only:** create a store, choose its primary category, and list
   products directly in the central marketplace. No website is required.
2. **Storefront plus marketplace:** create a store, choose its primary category,
   select a prebuilt template, and create a customizable website linked to the
   store. Products may appear on both surfaces according to the merchant's
   marketplace visibility settings and seller approval.

These are entry paths, not permanent account types. A marketplace-only store
may add a storefront later without re-entering its catalog. A merchant may
manage the same store through one account across both channels. For the first
release, each merchant owns exactly one Store, and each Store has zero or one
Website. Marketplace-only Stores have no Website.

## Core domain relationships

```text
Merchant account (identity)
  └── Store (exactly one; seller profile, primary category, operational tenant)
        ├── Product(s) (canonical catalog, product category, price, stock)
        ├── Marketplace listing (channel visibility, not another product)
        └── Website? (zero or one; domain, template, theme, content)
```

`storeId` is the durable seller/tenant key for catalog and commerce. A website
has its own `websiteId` and links to a store, but a product must not require a
website. A store's **primary category** supports its main marketplace placement
and initial storefront template suggestions. Additional Store categories are
derived from the categories of its published products. Each product has one
specific category in the shared marketplace taxonomy; it need not sit under
the Store's primary category. Merchant-defined storefront collections remain
separate from marketplace taxonomy. Template suggestions never change an
existing template automatically, and merchants may choose another compatible
template.
Product publication, moderation, and channel visibility need explicit states.
There is one authoritative product, price, and stock record, even if a search
index or storefront cache holds a read-only projection.

For a Store with a Website, marketplace listing is enabled by default for
newly published products. The merchant may disable the Store default or
override it on each product with a marketplace
visibility switch. Turning the switch off removes only the marketplace
listing, not the Product, storefront listing, or shared stock. Marketplace-only
Stores publish through the marketplace channel. A requested marketplace
listing becomes visible and purchasable only after Store-level seller approval
and any applicable product moderation. Basic marketplace access is not gated
by a higher storefront subscription tier.

Every Website receives a subdomain under a domain Rentify owns by default,
such as `store-name.<rentify-domain>`. A merchant may connect a domain they own as an
optional address. Rentify does not need to register a new domain for each
Store; custom-domain ownership and renewal remain with the merchant unless
a later plan explicitly includes managed domain purchases.

## Service ownership

The table below is an initial mapping to validate against the existing Rentify
services. The present data ownership, API boundaries, and cross-service flows
are documented in [Current Rentify architecture](current-rentify-architecture.md).
The implementation sequence and release gates are in the
[migration plan](migration-plan.md).

| Area | Target owner | Current starting point |
| --- | --- | --- |
| Merchant, admin, staff identity and access | `rentify-server` | Core User/Staff authentication |
| Store profile, seller approval, and optional website linkage | `rentify-server` Core API | Core Store and Website |
| Templates, themes, domain, subscription, deployment | `rentify-server` | Existing core API and React storefronts |
| Catalog, categories, price, stock, carts, orders, payments, POS, invoices | `ecommerce-server` | Existing commerce API and shared marketplace routes |
| Marketplace buyer UI | `marketplace-frontend/` | Angular KhmerCraft app |
| Merchant dashboard and storefront UI | `rentify-frontend` | Existing React/Vite apps |
| KhmerCraft API | Inactive reference code only | `docs/reference/legacy-khmercraft-api/` Express/Mongoose; never run as a platform service |

Core owns the Store profile, owner relation, and marketplace seller approval.
It exposes stable `storeId` and tenant authorization to Commerce, which may
keep a minimal, retryable Store access projection. The marketplace must consume
Rentify APIs, not keep an independently editable MongoDB catalog or checkout
state.

## Buyer identity target

The intended buyer experience is one Rentify account that can shop in the
central marketplace and across merchant storefronts, including custom domains.
The same durable buyer ID identifies that person everywhere. Each browser
host still has its own session; a custom storefront redirects to central
Rentify sign-in and receives a short-lived, one-time authorization-code
handoff. The storefront domain then establishes its own host-only session.
Store-local profiles and preferences may remain separate, but they reference
the common buyer ID. Merchant access to customer data remains limited to
transactions with that merchant. See the
[draft buyer identity decision](adr/0002-unified-buyer-identity.md) for the
session and migration implications.

## Main flows

### Onboarding

The merchant signs up once, creates a Store, and selects a primary store
category. The storefront path additionally chooses a template and creates a
Website linked to that Store. Subscription and deployment rules apply to the
website where relevant; marketplace-only selling must not require a Website.

### Product publication

The merchant creates or edits a Product against `storeId`. The commerce API
owns its data and stock. The marketplace and the optional storefront read that
same product through channel-aware queries. A product change updates any
search index or cache through a reliable event/outbox or equivalent retryable
projection mechanism. The UI must never write two peer product records and
hope they remain synchronized.

### Purchase and fulfillment

Both channels must use one authority for stock reservation and order/payment
state. At launch, each marketplace order contains products from exactly one
Store; buyers purchasing from multiple Stores place separate orders. Each
merchant owns fulfillment, COD cash collection, and direct buyer refunds for
their orders. Refund status must follow a recorded, confirmed manual refund
action. POS and invoices must consume the same stock rules.

**Launch payment scope:** Online purchases on both storefronts and the central
marketplace use cash on delivery (COD) only. An order remains unpaid until
cash collection is recorded and reconciled; placing or delivering an order
must not mark it paid automatically. COD collection, cancellation,
and return rules need explicit order and seller-level records. Existing online
payment integrations are not part of the new buyer checkout at launch.
Rentify does not collect or remit COD cash for buyer orders. Launch revenue is
merchant subscription fees only, with no per-order marketplace commission.
Marketplace-only merchants need a subscription entitlement that does not
require a Website.

**Future payment and revenue direction (outside launch scope):** Keep one
checkout/order authority, but select a settlement route by purchase channel.
Storefronts may retain COD and add online payments through each merchant's
individual bank payment account, settling directly to that merchant. Once the
bank-managed marketplace payment flow is ready, marketplace checkout becomes
online-only; marketplace COD is retired with merchant and buyer notice.
Marketplace online payments use the bank's managed hold and release facility.
The proposed marketplace commission is deducted from the seller's payout;
storefront sales remain subscription-funded without a sales commission. The
commission rate is not decided. The suggested 24-hour release is not an
agreed buyer-protection rule; release timing and refund/dispute terms depend
on fulfillment policy and the bank agreement. Do not represent platform
database balances as funds held by Rentify. Confirm the bank's per-order
hold, split/deduction, refund, fee, and reconciliation capabilities before
implementing online payments.

**Seller access by channel:** A merchant may publish a storefront and accept
COD orders after basic account and platform checks. Marketplace products may
be prepared while seller approval is pending, but cannot be publicly
purchasable there until Core approves the Store for marketplace selling.
Approval is per Store, with product-level moderation for restricted or flagged
items. A marketplace suspension removes marketplace selling; a platform-wide
safety suspension can stop both channels. An “unverified” badge does not
replace marketplace approval.

**Marketplace approval checklist for launch:** An admin checks verified seller
phone and email, responsible person or business identity, Store name and
primary category, operating or pickup location, customer contact method, at
least one clear product listing with price and stock, and the seller's stated
delivery, COD, return, and refund responsibility. Collect only identity data
the team can protect and review. The admin records approved, needs changes,
or rejected with a reason. Product-level review is reserved for flagged or
restricted listings; the restricted-product policy still needs definition.

**COD exceptions for launch:** Keep fulfillment and payment statuses separate.
A failed delivery records a reason and may be retried by agreement with the
buyer; cancellation leaves the order unpaid and releases reserved stock.
After delivery, the merchant records cash collection amount and time. A buyer
may request a return or open an order-linked complaint. The merchant records
return decisions and performs direct refunds; Commerce records a refund only
after amount, method, date, and confirmation are supplied. Admins review
complaint history and evidence and may suspend marketplace selling for
serious or repeated failures. Rentify cannot directly refund COD cash it
never held. Exact response deadlines and return eligibility remain policy
details to set before public launch.

## Integration principles

- Use stable IDs and explicit mappings during migration; do not infer a store
  from a domain or use website ID as the only merchant key.
- Migrate buyer, seller, and admin roles deliberately into one identity model.
  Existing cookies and customer accounts cannot be assumed interchangeable.
- Keep a compatibility layer only while old clients are being migrated. Mark
  its owner and retirement condition in `docs/migration-plan.md`.
- Maintain tenant checks on every read and mutation, including public product
  status filters and seller-specific order transitions.
- Preserve marketplace UX and reusable tests where useful; migrate behavior
  and data, not a second production backend.
