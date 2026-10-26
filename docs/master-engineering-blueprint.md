# Rentify master engineering blueprint

**Status:** Proposed execution blueprint, 2026-10-17  
**Audience:** Product, design, engineering, QA, security, data, operations, and business owners  
**Purpose:** Turn the current Rentify codebase into a dependable, easy-to-use,
production commerce platform for Cambodian SMEs without discarding working
capabilities or creating a second commerce system.

This document is the master plan. It connects the agreed product direction in
[`platform-architecture.md`](platform-architecture.md), the verified current
state in [`current-rentify-architecture.md`](current-rentify-architecture.md),
and the migration gates in [`migration-plan.md`](migration-plan.md). Detailed
contracts and ADRs remain authoritative for their individual subjects.
The dependency-ordered work packages and AI execution protocol are maintained
in [`ai-implementation-plan.md`](ai-implementation-plan.md).

---

## 1. Executive outcome

Rentify should become the simplest way for a Cambodian merchant to start,
operate, and grow a business across three connected sales surfaces:

1. the shared Rentify Marketplace;
2. the merchant's own branded storefront; and
3. the merchant's physical counter through POS.

The customer promise is:

> Add a product once, keep one stock count, sell everywhere, and manage the
> business from one clear workspace.

The buyer promise is:

> Discover trustworthy local merchants, understand the full price before
> ordering, place an order confidently, and always know what happens next.

The platform must optimize for completed merchant and buyer jobs, not for the
number of features or services. The first public release is successful only if
a real merchant can onboard, publish, receive, fulfill, and reconcile a real
order while a real buyer can discover, buy, track, and resolve a problem
without engineering help.

### North-star business outcome

**Merchant activation:** a verified merchant publishes at least one purchasable
product and successfully completes a first order.

Supporting outcomes:

- buyers can find relevant, available products from trustworthy sellers;
- published stock and prices stay correct across every channel;
- merchants can operate from a phone with minimal training;
- Rentify can support, audit, reconcile, and safely recover the platform;
- subscription revenue funds the launch product without depending on custody
  of buyer funds or an unproven marketplace commission.

---

## 2. Product strategy

### 2.1 Customers and jobs to be done

| Customer | Primary job | Rentify outcome |
| --- | --- | --- |
| New/social seller | Start selling professionally without technical knowledge | Create a Store, publish products, receive orders, and share a public link in one guided session |
| Physical retailer | Keep counter and online sales synchronized | POS, marketplace, and storefront use the same product and stock records |
| Growing merchant | Delegate operations and understand performance | Permissioned staff, order workflows, invoices, low-stock alerts, and dependable reports |
| Marketplace buyer | Find and confidently order local products | Fast search, clear seller/product details, transparent totals, COD checkout, and order tracking |
| Storefront buyer | Buy from a merchant's brand without creating another identity | Central Rentify identity with Store-scoped data and a safe cross-domain session flow |
| Rentify operator | Protect buyers and keep commerce running | Seller review, product moderation, support cases, audit history, reconciliation, and incident tools |

### 2.2 Problems Rentify must remove

- fragmented Facebook, messaging, paper, spreadsheet, and counter workflows;
- duplicate product entry and inconsistent stock across sales channels;
- the cost and complexity of building a professional online store;
- weak discovery for small local merchants;
- unclear delivery, COD, return, and refund expectations;
- generic software that is not designed for Khmer language, Cambodian phone
  formats, addresses, CutLuy-powered QR payments, COD, and local operating
  practices;
- tools that show data but do not guide a merchant to the next useful action.

### 2.3 Business model

**Launch:** merchant subscriptions fund the platform. Marketplace-only sellers
may use the explicitly temporary free pilot entitlement. Rentify charges no
order commission and does not hold COD money. Each merchant fulfills the order,
collects COD, and performs any confirmed cash refund.

**Later:** storefront subscriptions remain commission-free. CutLuy is the
preferred QR provider: Rentify subscription payments use Rentify's account,
while seller customer payments require seller-owned CutLuy accounts and settle
directly to those sellers. CutLuy does not provide escrow, split payments,
platform deductions, payouts, or refunds. Marketplace commission or managed
settlement therefore requires a separately verified provider and agreement.
No commission or payout promise should appear before that decision is accepted.

### 2.4 Product principles

1. **One business, one Store identity.** A Website is an optional channel, not
   the merchant or tenant identity.
2. **One catalog and one stock truth.** Marketplace, storefront, POS, invoice,
   and admin never maintain peer product or inventory records.
3. **Progressive disclosure.** A new merchant sees the next three useful tasks,
   not the entire platform configuration.
4. **Mobile and Khmer first.** Every critical journey works at 360 px width,
   with Khmer and English content designed together rather than translated at
   the end.
5. **Totals before commitment.** Buyers see products, delivery fees, discounts,
   tax treatment, and the exact amount due before placing an order.
6. **State must be honest.** Delivered is not paid. Requested is not refunded.
   Queued is not synchronized. Failed integrations never report success.
7. **Safe defaults, visible recovery.** Retryable operations are idempotent;
   blocked work tells the user why and what to do next.
8. **Trust is a product capability.** Seller approval, reviews, reports,
   returns, moderation, privacy, and support are core workflows.
9. **Accessibility is a release requirement.** Aim for WCAG 2.2 AA on all
   critical paths, keyboard support, clear focus, meaningful labels, readable
   contrast, and reduced-motion behavior.
10. **Evidence before scale.** Release by cohort and measured gates, not by a
    single big-bang launch.

---

## 3. Current baseline and gap assessment

### 3.1 What is worth keeping

The repository already contains the right major building blocks:

- Core identity, Store, seller approval, Website, template, subscription,
  media, staff, and deployment capabilities;
- Commerce-owned catalog, inventory, cart, COD checkout, order, invoice, POS,
  payment, usage, and Store-access capabilities;
- merchant, auth, marketing, hosted storefront, marketplace, POS, and admin
  user interfaces;
- Store-keyed products and Website-optional marketplace-only selling;
- shared marketplace/storefront COD transaction paths with idempotency and
  row-locked stock deductions;
- seller operations, buyer complaints/return requests, administrative
  moderation, and reconciliation commands;
- migration discipline, an outbox for Core-to-Commerce projection, Docker
  development, CI checks, tests, secret scans, and release runbooks.

These are strong foundations. A rewrite would add risk without improving the
customer outcome. The recommended strategy is to harden and simplify the
existing two-domain platform.

### 3.2 What prevents a real production launch today

| Gap | Customer/business risk | Required outcome |
| --- | --- | --- |
| Production domain, HTTPS, cookie, and CORS topology is not proven | Login or checkout may fail outside localhost | Rehearse all hosts on owned HTTPS domains and automate configuration validation |
| Buyer identity ADR is still proposed for custom domains | Duplicate accounts or unsafe cross-domain sessions | Accept and implement the authorization-code handoff or defer custom-domain checkout explicitly |
| Hosted storefront checkout is default-off | The main two-channel promise is incomplete | Prove the full storefront buyer journey before enabling it by cohort |
| Variant checkout lacks end-to-end coverage | Incorrect item, price, or stock can be ordered | Define a canonical SKU/variant model and test every channel against it |
| Delivery, tax, returns, restricted products, and dispute rules are incomplete | Buyers and merchants cannot predict outcomes | Approve product policies and encode them as versioned rules and order snapshots |
| POS and invoice HTTP journeys need full shared-stock validation | Overselling and reconciliation errors | Route every stock mutation through the canonical inventory ledger and test competing writers |
| No staging backup/restore or timed rollback evidence | A bad release may be unrecoverable | Complete restore and rollback game days with recorded recovery times |
| Basic health endpoints but no defined observability/SLO system | Failures will be discovered by users | Add structured telemetry, dashboards, alerting, runbooks, and on-call ownership |
| Frontend experiences use two frameworks and multiple shells | UX drift and duplicated behavior | Share design tokens, content rules, API contracts, and journey tests; do not force a framework rewrite before launch |
| API contracts are spread across code and prose | Client/server drift | Publish versioned OpenAPI contracts and validate generated or typed clients in CI |
| Production support workflow is partial | Complaints can be lost or handled inconsistently | Build durable cases with ownership, service deadlines, notes, evidence, and audit events |
| Production pricing and entitlement rules are not finalized | Revenue and access can diverge | Define plans, trials, grace periods, suspension, renewal, and feature entitlements before GA |

---

## 4. Scope: complete vision versus first production release

### 4.1 Production Release 1: trustworthy COD commerce

Release 1 must include complete, polished versions of these capabilities:

- merchant and buyer registration, verification, sign-in, recovery, and role
  switching;
- marketplace-only and storefront-plus-marketplace merchant onboarding;
- seller application and admin review;
- Store profile, primary category, location, contacts, delivery, return, and
  refund policies;
- product creation with images, categories, variants/SKUs, price, stock,
  draft/active/archive states, and channel visibility;
- Marketplace home, categories, search, product, Store, cart, checkout, order
  confirmation, order history, order detail, return request, and complaint;
- hosted storefront browsing and checkout through the same catalog and stock;
- merchant dashboard home, catalog, inventory, orders, fulfillment, COD
  collection, confirmed direct refund, POS, invoices, staff, storefront, plan,
  and settings;
- admin seller review, catalog/review moderation, order investigation, support
  cases, Store suspension, subscription operations, and audit history;
- notification delivery for security, seller review, order, fulfillment,
  return, refund, and support events, with an in-app source of truth;
- production monitoring, backups, restore, incident response, privacy/export,
  and operational reconciliation.

### 4.2 Explicit Release 1 boundaries

- COD only for marketplace and hosted storefront buyer checkout.
- One Store per merchant account and zero or one Website per Store.
- One merchant per marketplace order. A multi-merchant basket is presented as
  separate Store checkouts with separate delivery fees and confirmations.
- Rentify does not hold COD funds and does not issue a refund it did not make.
- Custom-domain checkout is disabled until the accepted cross-domain identity
  protocol passes staging security tests. Custom domains may remain browse-only.
- No live marketplace commission, wallet balance, escrow, or seller payout.
- KhmerCraft API and MongoDB remain inactive reference code.

These boundaries are deliberate, not signs of an incomplete product. They make
the launch understandable, operable, and financially honest.

### 4.3 Post-launch capabilities

- CutLuy QR payments for Rentify subscriptions and direct-to-merchant seller
  payments, after adapter, webhook, account-ownership, and reconciliation gates;
- marketplace hold/release, commission, refunds, settlement, and payout only
  through a future provider contract that actually supports those capabilities;
- delivery zones, weight rules, carrier integrations, labels, and tracking;
- promotions, vouchers, bundles, loyalty, wishlists, and abandoned-cart flows;
- richer search, recommendations, merchandising, and sponsored placement;
- multi-location inventory, purchase orders, suppliers, transfers, and cycle
  counts;
- multi-Store organizations, advanced staff roles, and approval workflows;
- accounting exports and approved tax integrations;
- native mobile applications only if mobile web usage data justifies them.

---

## 5. Experience blueprint

Every flow below needs a named product owner, UX owner, engineering owner,
analytics events, happy-path tests, failure-path tests, and support guidance.

### 5.1 Merchant activation journey

```text
Sign up -> verify contact -> choose selling path -> create Store
        -> add Store essentials -> add first product -> submit seller review
        -> preview -> approval -> publish -> receive first order
```

Design requirements:

- Ask only for information needed at the current step; save progress after
  every step and resume on any device.
- Show a persistent launch checklist: Store details, delivery policy, first
  product, seller verification, preview, and publication.
- Explain the two entry paths in outcome language: "Sell in the marketplace"
  and "Get my website too."
- A marketplace-only merchant can add a Website later without copying data.
- Use category choice to recommend templates, never to force one.
- Validate Khmer/English Store names, Cambodian phone numbers, image quality,
  price, stock, and policies inline.
- Show seller-review status, missing items, expected next action, and decision
  reasons in the dashboard; never leave a merchant at an unexplained dead end.
- Define activation as a published purchasable product, not account creation.

### 5.2 Catalog and inventory journey

```text
Draft product -> complete content -> create SKUs/variants -> set price/stock
              -> choose channels -> preview -> publish -> monitor/replenish
```

Required product model:

- Product: merchant-facing concept and shared content.
- SKU/Variant: exact purchasable selection with attributes, price, barcode,
  weight if used, and inventory identity.
- InventoryLocation: launch has one default location per Store but the schema
  and ledger should not prevent later multi-location support.
- InventoryLedgerEntry: immutable reasoned changes (`sale`, `cancel`, `return`,
  `restock`, `adjustment`, `transfer`) linked to the originating operation.
- ChannelListing: derived visibility and moderation state for marketplace and
  storefront; it is not a duplicate Product.
- MediaAsset: ordered reusable images with owner, transformation metadata,
  accessibility text, and safe deletion rules.

UX requirements:

- quick add for simple products and an advanced editor for variants;
- bulk CSV import/export with a preview, validation report, and reversible job;
- low-stock and out-of-stock guidance;
- a visibility explanation showing exactly why an item is or is not visible
  on each channel;
- optimistic concurrency with a friendly conflict screen instead of silent
  overwrite;
- archive instead of destructive delete when records have history.

### 5.3 Buyer discovery and purchase journey

```text
Discover/search -> evaluate Product and seller -> select SKU -> cart grouped by Store
                -> review exact total and policy -> sign in -> address/contact
                -> place idempotent COD order -> track -> receive -> resolve if needed
```

UX requirements:

- fast mobile pages with useful loading skeletons, empty states, and retry;
- search by Khmer and English names, category, Store, price, availability, and
  location as data quality allows;
- never show unavailable variants as purchasable;
- display seller approval, contact, fulfillment expectations, return policy,
  product price, delivery fee, and total before commitment;
- clearly group a multi-merchant cart and explain that each Store becomes a
  separate order; allow checkout Store by Store without losing other carts;
- require final review when price, stock, fee, or policy changed;
- return an order confirmation page that is safe to refresh and includes a
  human-readable reference, Store contact, amount due, address, and next step;
- expose an order timeline derived from auditable events rather than guessing
  from a single status field.

### 5.4 Merchant fulfillment journey

```text
New order -> acknowledge -> prepare -> out for delivery -> delivered
          -> collect COD -> reconcile
                    \-> failed delivery -> retry by agreement OR cancel/release stock
                    \-> return request -> decide -> receive item -> direct refund -> confirm
```

Required behavior:

- fulfillment, payment, return, refund, and support are separate state
  machines linked by validated transitions;
- every consequential action is idempotent, attributed to an actor, timestamped,
  and appended to the order event history;
- stock is allocated/deducted once and restored once where policy permits;
- a merchant cannot change another Store's order or see unrelated buyer data;
- risky actions require a reason and a clear confirmation summary;
- order screens prioritize the next action and exception, not raw fields;
- printable receipts/invoices and phone-friendly picking/packing views use the
  same order snapshot.

### 5.5 Admin and support journey

```text
Signal/report -> support case -> assign -> investigate linked evidence
              -> act within policy -> communicate -> resolve -> audit/review trend
```

Required behavior:

- durable support cases link users, Stores, Products, Orders, reviews, and prior
  reports without copying authoritative commerce data;
- case priority, owner, service deadline, notes, attachments, communications,
  resolution, and complete audit history;
- narrowly scoped roles such as support agent, seller reviewer, catalog
  moderator, finance operator, and platform administrator;
- maker-checker approval for high-risk actions such as permanent suspension,
  identity changes, financial corrections, or export of sensitive data;
- every admin mutation records actor, reason, before/after safe fields,
  correlation ID, and source case;
- dashboards separate gross merchandise value, COD due/collected/refunded,
  subscription revenue, and future commission revenue.

### 5.6 Design system and content

Maintain one Rentify design language across React and Angular without making a
framework migration a launch dependency:

- a versioned package of design tokens for color, typography, spacing, radius,
  elevation, breakpoints, motion, and semantic states;
- matching accessible component contracts for both frameworks;
- a shared icon and illustration policy;
- English and Khmer message catalogs with stable keys, interpolation tests,
  date/number/currency formatting, and no customer-facing hard-coded strings;
- a content standard for plain-language errors, confirmations, destructive
  actions, seller-review reasons, and policy text;
- automated accessibility checks plus manual keyboard, screen-reader, zoom,
  and low-bandwidth testing for every critical journey;
- continuous usability sessions with real Cambodian merchants and buyers.

---

## 6. Target system architecture

### 6.1 Architectural decision

Keep two authoritative backend domains and harden them as modular services:

- **Core** owns people, roles, Stores, seller approval, Websites, templates,
  domains, plans, subscriptions, media authorization, and deployment.
- **Commerce** owns products/SKUs, stock, carts, checkout, orders, fulfillment,
  payments, refunds, POS, invoices, reviews, delivery rules, and usage records.

Do not split these into more network services before operational evidence shows
a clear scaling or ownership need. Internal module boundaries, contracts,
queues, and observability provide most of the benefit without multiplying
deployment and consistency failure modes.

### 6.2 Logical topology

```text
                         +----------------------+
                         |  CDN / WAF / Edge    |
                         | routing, TLS, limits |
                         +----------+-----------+
                                    |
       +---------------+------------+-------------+----------------+
       |               |                          |                |
 Marketing/Auth   Marketplace UI          Merchant/POS/Admin   Storefronts
       |               |                          |                |
       +---------------+------------+-------------+----------------+
                                    |
                         Public API routing layer
                     (stable hosts, versioned contracts)
                                    |
                    +---------------+----------------+
                    |                                |
             +------v------+                  +------v-------+
             | Core API    |  durable outbox  | Commerce API |
             | identity,   +----------------->| catalog and  |
             | Store, web  |  versioned sync  | transactions |
             +------+------+                  +------+-------+
                    |                                |
             +------v------+                  +------v-------+
             | Core MySQL  |                  | Commerce SQL |
             +-------------+                  +--------------+
                    |                                |
                    +----------+----------+----------+
                               |          |
                         +-----v----+ +---v----------------+
                         | Redis    | | Object media + CDN |
                         | cache/   | | safe transformations|
                         | sessions| +----------------------+
                         +----------+

         Telemetry, audit export, backups, alerting, and analytics surround all layers.
```

The "public API routing layer" can initially be edge routing to the two APIs;
it does not require a new business-logic service. Its purpose is consistent TLS,
hostnames, WAF/rate limits, request IDs, version routing, and safe CORS policy.

### 6.3 Bounded contexts and ownership

| Context | Authority | Key invariants |
| --- | --- | --- |
| Identity and access | Core | One durable subject; role and tenant grants are explicit; sessions are revocable |
| Store and seller trust | Core | One Store per merchant in Release 1; approval and operational status are auditable |
| Website and domain | Core | Website is optional, belongs to one Store, and has verified host ownership |
| Plans and entitlements | Core | Access derives from versioned entitlements, not UI checks or plan-name strings |
| Catalog | Commerce | Every Product and SKU belongs to one Store; publication and channel visibility are explicit |
| Inventory | Commerce | Every stock change is atomic, reasoned, attributable, and reconcilable |
| Checkout and order | Commerce | Server recalculates eligibility and totals; retries cannot duplicate effects |
| Payment and refund | Commerce | Financial state follows confirmed evidence; amounts use minor units or exact decimals |
| Fulfillment and returns | Commerce | Only legal state transitions occur; order events provide the timeline |
| Reviews and buyer reports | Commerce | Ownership is verified; moderation never rewrites transaction facts |
| Support case | Core or a dedicated Core operations module | Cases coordinate work and link authoritative records; they do not duplicate them |
| Analytics | Derived read models | Analytics never becomes a transactional writer |

### 6.4 Identity and authorization

Use one identity authority and separate identity from authorization:

- one person may be a buyer, merchant, staff member, and administrator, but
  each role has explicit grants;
- Store membership includes role, permissions, status, and optional narrower
  Website/location scope;
- Commerce trusts signed/validated Core identity and its versioned Store-access
  projection, never a `storeId`, `buyerId`, or role supplied by the browser;
- authorization policy is deny-by-default and tested at route and service
  boundaries;
- hosted subdomains may share a carefully scoped parent session only after
  arbitrary merchant script injection is impossible;
- unrelated custom domains use short-lived, one-time authorization codes,
  exact redirect URIs, PKCE, state binding, rotation, and host-only sessions;
- account recovery, contact changes, role elevation, API keys, and global
  logout revoke affected sessions;
- sensitive admin and merchant actions can require recent authentication.

Accept or replace ADR 0002 before implementing custom-domain checkout. Never
merge legacy users by matching email text alone.

### 6.5 Data model and invariants

Use stable UUIDs at service boundaries. Internal numeric keys may remain for
database efficiency but must never leak as ambiguous cross-service identity.

Core relationships:

```text
User --< StoreMembership >-- Store --0..1--> Website
                              |               |
                              |               +--> DomainBinding
                              +--> SellerApplication / SellerDecision
                              +--> Subscription / Entitlement
```

Commerce relationships:

```text
StoreAccessProjection --1..*--> Product --1..*--> SKU
                                  |                 |
                                  |                 +--> InventoryLedgerEntry
                                  +--> ChannelListing / Media reference

Buyer --< Cart(Store, channel) --< CartLine(SKU)
Buyer --< Order(Store, channel) --< OrderLine(snapshot)
                                  |--> Fulfillment
                                  |--> Payment --< Refund
                                  |--> OrderEvent
                                  +--> Return / Complaint
```

Critical invariants:

- Product, SKU, Cart, Order, Invoice, Payment, and inventory changes always
  resolve to exactly one Store.
- `websiteId` is nullable channel context, never the only ownership key.
- money stores currency plus integer minor units or an exact fixed decimal;
  JavaScript floating-point arithmetic is not used for financial totals.
- an OrderLine snapshots name, SKU attributes, unit price, discount, tax,
  commission, and seller identity used at purchase time.
- Store delivery and return policy version is snapshotted on the Order.
- inventory availability is derived from a ledger/reservation invariant and
  cannot become negative.
- mutable aggregates carry a version; concurrent updates require the expected
  version or a domain-specific idempotency key.
- deletion is prohibited for records needed by orders, money, access audit,
  tax, or dispute history; retention and anonymization are explicit.

### 6.6 Transaction and state-machine design

Model separate state machines instead of one overloaded order status.

**Order:** `draft -> placed -> accepted -> completed | cancelled`  
**Fulfillment:** `unfulfilled -> preparing -> out_for_delivery -> delivered`
with `delivery_failed -> retry_scheduled | cancelled`  
**Payment:** `pending -> collected -> partially_refunded | refunded`, with
`failed` only for a real collection attempt  
**Return:** `requested -> reviewing -> approved | rejected -> received -> closed`  
**Seller:** `draft -> submitted -> needs_changes | approved | rejected`, plus
an independently auditable `suspended` operational state.

Each transition must define:

- allowed source states;
- actor and permission;
- required inputs and evidence;
- database changes and stock effect;
- idempotency behavior;
- emitted event and notification;
- audit fields;
- allowed reversal or compensating action.

Do not allow controllers or clients to assign status fields directly.

### 6.7 API contract standard

Adopt versioned OpenAPI 3.1 contracts for Core and Commerce and enforce them in
CI. Every endpoint must have:

- stable resource naming and an explicit version policy;
- request/response schemas, examples, authentication, authorization, and
  error codes;
- a standard error envelope containing machine code, localized-safe message,
  field errors, correlation ID, and retryability;
- cursor pagination for large or changing collections;
- ISO 8601 UTC timestamps and explicit currency;
- `Idempotency-Key` for creation or consequential actions;
- `expectedVersion`/ETag for conflicting edits;
- consistent filtering and sort allowlists;
- no secrets, password material, provider payloads, or cross-tenant fields;
- contract tests for every consumer and backward-compatibility checks on pull
  requests.

Frontend applications should use generated or centrally maintained typed API
clients. No UI should reconstruct business rules that belong to an API.

### 6.8 Asynchronous work and service synchronization

Continue the transactional outbox pattern. Standardize it for every durable
cross-service or external side effect:

1. commit domain change and outbox event in one local transaction;
2. deliver at least once with event ID, aggregate ID, aggregate version,
   occurred time, schema version, and trace ID;
3. consumer stores processed event IDs and ignores duplicates;
4. reject or park out-of-order versions safely;
5. retry with bounded exponential backoff and jitter;
6. move poison events to a visible dead-letter state with replay tooling;
7. reconcile projections continuously, not only during release.

Use asynchronous events for projections, search, analytics, notifications, and
media processing. Keep checkout eligibility, price, and stock validation
synchronous and local to Commerce.

### 6.9 Cache and search

- MySQL remains the source of truth; Redis and search indexes are disposable
  derived data.
- Every cache entry has owner, key format, TTL, invalidation event, and stale
  behavior documented.
- Seller suspension, product archive, and out-of-stock changes must disappear
  from public purchase paths immediately even if discovery caches lag.
- Begin with indexed SQL search if it meets measured latency and relevance.
  Add a dedicated search engine only after Khmer/English relevance, filtering,
  typo tolerance, catalog size, or traffic demonstrates the need.
- Search documents include only public fields and carry source version so stale
  updates cannot overwrite newer ones.

### 6.10 Media

- browsers upload through a short-lived authorized flow; provider credentials
  remain server-side;
- validate type by content, size, dimensions, malware policy, owner, and quota;
- strip unsafe metadata, create responsive variants, and serve through CDN;
- keep stable asset IDs instead of embedding provider URLs as identity;
- use accessible alt text, deterministic ordering, placeholder/failure states,
  and reference counts before deletion.

### 6.11 QR payment provider

Use a provider-neutral payment-attempt and provider-event boundary with CutLuy
as the preferred QR adapter. Rentify subscription fees use a Rentify-owned
CutLuy Store. Seller customer payments require seller-owned CutLuy Stores so
funds settle directly to each seller; a shared platform key must never process
independent merchants' sales.

Create payments with stable Rentify idempotency keys and references. Confirm
payment only from a timestamp-checked, constant-time verified CutLuy webhook or
a reconciled provider read. Persist and deduplicate provider events before
applying order or entitlement effects. CutLuy currently supports USD and does
not provide refunds, escrow, commission deductions, or seller payouts. See
[ADR 0003](adr/0003-cutluy-qr-payments.md) for the complete boundary and gates.

---

## 7. Security, privacy, and trust blueprint

### 7.1 Security baseline

- threat-model identity, cross-domain login, tenant isolation, media upload,
  checkout, COD state changes, admin tools, webhooks, and future payments;
- secure, HTTP-only, `SameSite`-appropriate cookies with rotation and short
  access-session lifetime; CSRF protection for credentialed mutations;
- strict origin and exact redirect allowlists—never reflection or wildcard
  credentialed CORS;
- rate limits by IP, account, Store, and action with protections for login,
  recovery, search abuse, cart, checkout, reports, and admin actions;
- password hashing policy, breached-password check where available, MFA for
  admins and strongly recommended MFA for merchants;
- secrets manager, short-lived deployment credentials, key rotation, and no
  secrets in source, images, logs, analytics, or frontend builds;
- parameterized queries/ORM safety, validation allowlists, output encoding,
  content security policy, clickjacking defense, and dependency scanning;
- signed webhooks with timestamp and replay protection;
- quarterly access review and immediate offboarding for privileged roles;
- independent security review before payment custody or payout features.

### 7.2 Tenant isolation tests

For every Store, Website, Product, Order, Customer, Invoice, Payment, staff,
media, export, and admin endpoint, test:

- owner can perform the allowed action;
- permitted staff can perform only granted actions;
- unrelated merchant/staff cannot read or mutate;
- buyer can access only their own Store-scoped transactions;
- public user sees only explicitly public safe fields;
- suspended or deleted access fails closed;
- direct ID guessing and alternate identifier forms do not bypass policy.

### 7.3 Privacy and data governance

- create a data inventory with owner, purpose, legal basis, sensitivity,
  retention, residency, processors, and deletion/anonymization behavior;
- minimize seller verification data to what Rentify can protect and review;
- separate global buyer profile from Store-specific address, preference,
  loyalty, and marketing consent;
- log access to sensitive exports and support views;
- provide account-data export, correction, and deletion/anonymization workflows
  that preserve legally required transaction records;
- define production log redaction for tokens, passwords, addresses, phone
  numbers, emails, payment credentials, and provider payloads;
- publish understandable privacy, marketplace, seller, prohibited-product,
  delivery, return, refund, and complaint policies in Khmer and English.

### 7.4 Fraud and marketplace trust

Release 1 rules can be simple but must be explicit:

- seller identity/contact review and risk-based re-review;
- prohibited/restricted-product taxonomy and moderation playbook;
- buyer and merchant rate/velocity signals for order/report abuse;
- duplicate Store/product and suspicious price/stock signals;
- review eligibility based on a completed order and anti-self-review checks;
- evidence retention and an appeal path for moderation decisions;
- automatic alerts and manual suspension, never opaque irreversible automation
  at launch.

---

## 8. Reliability, observability, and operations

### 8.1 Initial service-level objectives

Measure SLOs over rolling 28-day windows and refine them using beta evidence.

| Journey | Initial target |
| --- | --- |
| Public catalog availability | 99.9% |
| Authenticated merchant workspace availability | 99.9% |
| Checkout/order placement availability | 99.95% during enabled hours |
| Successful non-duplicate order creation for valid attempts | >= 99.5% |
| Public catalog API p95 latency | < 500 ms server-side |
| Checkout API p95 latency excluding external calls | < 1.5 s |
| Core-to-Commerce seller projection lag p95 | < 60 s |
| Unexplained stock or COD reconciliation differences | 0 |
| Critical security/tenant isolation incidents | 0 |

Use error-budget policy: when a critical SLO exhausts its budget, pause feature
rollout and prioritize reliability work.

### 8.2 Telemetry standard

Every request and background job emits:

- correlation/trace ID propagated across Core, Commerce, outbox, and external
  calls;
- structured JSON logs with environment, service, version, route template,
  safe actor/Store identifiers, result, latency, and error code;
- metrics for request rate, errors, latency, saturation, database pools,
  cache, queues/outbox, emails, media, auth, and business transactions;
- distributed traces for signup, login, seller projection, publish, checkout,
  fulfillment, collection, refund, and notification;
- immutable audit events for privileged or consequential actions.

Never use raw email, phone, address, access token, cookie, payment credential,
or unbounded request bodies as log labels or content.

### 8.3 Product and operational dashboards

Minimum dashboards:

- acquisition and onboarding funnel;
- merchant activation and time to first product/order;
- search success, product-view-to-cart, cart-to-order, and checkout failures;
- orders by channel and fulfillment stage;
- COD due, collected, refunded, and mismatches by Store/channel;
- stock deductions, restorations, negative-stock prevention, and drift;
- seller review backlog and age;
- support/return/complaint backlog and service-deadline breaches;
- API/browser errors, latency, availability, database, Redis, outbox, and
  dependency health;
- subscription trial, conversion, renewal, grace, failure, and churn.

### 8.4 Alerts and runbooks

Page a human for symptoms that threaten customers, money, stock, security, or
data. Ticket lower-severity trends. Each alert must link to a runbook containing
impact, dashboards, safe diagnostics, mitigation, rollback, recovery,
communication, and escalation owner.

Required runbooks include:

- login/session failure;
- checkout failure or duplicate-order suspicion;
- stock drift/oversell;
- Core-to-Commerce projection backlog;
- database saturation/failover;
- Redis/session failure;
- media/provider outage;
- email/SMS/notification delay;
- seller/product emergency suspension;
- suspected tenant or personal-data exposure;
- failed deploy, migration, restore, and rollback.

### 8.5 Backup and disaster recovery

- encrypted automated Core and Commerce database backups with point-in-time
  recovery where the provider supports it;
- media inventory and recoverability documented separately from SQL;
- restore into an isolated environment at least monthly during beta and
  quarterly after stable operations;
- reconciliation after restore before traffic resumes;
- proposed Release 1 targets: RPO <= 15 minutes for transactional databases
  and RTO <= 2 hours, validated by drills rather than assumed;
- no production migration without a tested forward path, rollback/compensation
  plan, backup identifier, and data owner approval.

---

## 9. Delivery engineering

### 9.1 Environments

Use four clearly isolated environments:

| Environment | Purpose | Data rule |
| --- | --- | --- |
| Local | Fast development and deterministic demos | Seeded synthetic data only |
| CI/preview | Automated tests and per-change review | Ephemeral synthetic databases |
| Staging | Production-like browser, migration, load, security, and operations rehearsal | Synthetic or irreversibly sanitized data |
| Production | Real customers | Least privilege, audited access, protected backups |

Staging must use the production hostname pattern, HTTPS, cookie attributes,
CORS, CDN/edge routing, secrets mechanism, database version, migrations, and
background jobs. A localhost success is not release evidence.

### 9.2 Infrastructure and deployment

- define infrastructure as code for networks, services, SQL, Redis, storage,
  DNS, certificates, WAF, secrets, monitoring, backups, and alerts;
- build immutable, non-root, minimal images with locked dependencies and a
  software bill of materials;
- separate migration jobs from API startup and make them observable;
- use rolling or blue/green deployment with health, readiness, and smoke gates;
- keep schema changes backward-compatible through expand/backfill/switch/
  contract phases;
- release high-risk capabilities behind server-controlled, auditable feature
  flags with owner, expiry, cohort, and rollback behavior;
- never use a frontend flag as authorization or financial control;
- preserve in-flight orders under their original contract through rollback.

No particular cloud runtime is mandated by this blueprint. Choose the smallest
managed platform the team can operate well. Avoid Kubernetes until scale or
organizational constraints clearly justify its operational cost.

### 9.3 CI/CD quality gates

Extend the existing verification pipeline so a production candidate requires:

1. repository policy, secret scan, dependency/license review, and migration
   validation;
2. lint, static/type checks, unit, integration, security, and contract tests;
3. production builds for every application;
4. ephemeral MySQL migration from empty and from a representative prior
   version;
5. API schema compatibility check and generated-client compilation;
6. browser journey tests for merchant, buyer, storefront, POS, and admin;
7. accessibility and visual-regression checks for critical pages;
8. container and dependency vulnerability thresholds;
9. staging smoke, reconciliation, and canary approval;
10. post-deploy probes plus automatic stop/rollback criteria.

Protected branches require relevant CODEOWNERS. Authorization, payments,
tenant boundaries, migrations, infrastructure, and production flags require a
second qualified reviewer.

### 9.4 Testing pyramid

- **Domain unit tests:** state machines, price/tax/fee calculations, entitlement,
  visibility, and authorization policy.
- **Repository integration tests:** actual MySQL constraints, transactions,
  locks, migrations, idempotency, and outbox behavior.
- **Contract tests:** Core-Commerce and frontend-API request/response/event
  compatibility.
- **Browser journey tests:** responsive English/Khmer flows on real HTTPS hosts.
- **Concurrency/property tests:** last-unit purchase, replay, conflicting stock
  adjustment, cancellation, refund limits, and invariant preservation.
- **Security tests:** tenant matrix, CSRF/CORS, redirect URI, session rotation,
  rate limits, upload, authorization, and dependency/container scans.
- **Performance tests:** catalog browse/search, checkout bursts, admin exports,
  and background backlog recovery using production-like data volumes.
- **Resilience tests:** dependency timeouts, Redis loss, delayed projections,
  provider failure, worker restart, dead-letter replay, database restore, and
  application rollback.
- **Usability tests:** moderated sessions with merchants and buyers on ordinary
  phones and Cambodian network conditions.

Tests assert business outcomes and invariants, not only HTTP success codes.

---

## 10. Delivery roadmap

The phases are dependency-ordered. Duration depends on team size and evidence;
no date should override an unmet exit gate.

### Phase A — decisions and production foundation

**Goal:** remove policy and environment ambiguity before expanding features.

Deliverables:

- appoint named product, Core, Commerce, frontend, design, data, security,
  payments, QA, and operations owners;
- approve Release 1 product brief and explicit non-goals;
- decide restricted products, delivery scope, return eligibility, response
  deadlines, refund evidence, tax treatment, and multi-merchant cart UX;
- choose and acquire production domains; document host, cookie, CORS, CSP, and
  custom-domain strategy;
- accept/replace ADR 0002 for hosted and custom-domain buyer identity;
- define production plans, pilot limits, trial, renewal, grace, suspension, and
  cancellation entitlements;
- create data classification, retention, privacy, and incident policies;
- provision staging through infrastructure as code with telemetry and backups;
- baseline current journeys and publish OpenAPI contract skeletons.

Exit gate:

- all Release 1 policies and architecture decisions are accepted;
- staging matches the production domain/security topology;
- backup restore and a simple rollback are timed successfully;
- every critical area has a named accountable owner.

### Phase B — canonical commerce core

**Goal:** make data and state correct before polishing every UI.

Deliverables:

- finish Store-key migration and eliminate ambiguous Website ownership paths;
- implement/normalize SKU variants and a reasoned inventory ledger;
- route marketplace, storefront, POS, invoice, cancellation, and return stock
  mutations through one inventory service;
- formalize order, fulfillment, payment, refund, return, and seller state
  machines;
- standardize money, snapshots, idempotency, concurrency, and audit events;
- standardize outbox/inbox, dead-letter visibility, replay, and reconciliation;
- enforce tenant authorization matrix and API contracts;
- add correlation IDs, structured telemetry, readiness, and dependency health.

Exit gate:

- all stock-writing journeys pass concurrent last-unit and compensation tests;
- every order and financial action is idempotent and auditable;
- zero unexplained projection, Store mapping, stock, or COD differences;
- direct API tenant-isolation suite is green.

### Phase C — five golden journeys

**Goal:** deliver complete end-to-end experiences before adding breadth.

Golden journeys:

1. marketplace-only merchant to first fulfilled COD order;
2. storefront merchant to the same product sold through marketplace and hosted
   storefront with one stock count;
3. physical POS sale competing safely with an online last-unit purchase;
4. buyer return/complaint to merchant response, direct refund confirmation,
   and admin support resolution;
5. subscription trial/payment/renewal/grace/suspension without losing access to
   historical orders.

Deliverables:

- unified responsive design tokens/components and Khmer/English content;
- resumable merchant onboarding and launch checklist;
- polished catalog/variant editor, visibility diagnosis, inventory history,
  bulk import validation, and media workflow;
- polished marketplace discovery, Store/product pages, Store-grouped cart,
  transparent checkout, confirmation, history, and timeline;
- enabled hosted storefront buyer journey on staging;
- action-oriented merchant home, unified order operations, POS, invoice, staff,
  subscription, and settings;
- durable admin support cases, scoped roles, and complete audit view;
- in-app notifications with provider adapters and delivery status.

Exit gate:

- each golden journey passes automated browser tests in English and Khmer on
  supported mobile and desktop browsers;
- five moderated merchants and five buyers can complete their target journey
  without engineering assistance, with critical issues resolved;
- accessibility critical paths meet WCAG 2.2 AA acceptance checks;
- all customer-visible failure states offer a useful recovery action.

### Phase D — production readiness and closed beta

**Goal:** prove the system can be operated with real users safely.

Deliverables:

- capacity/load results and scaling thresholds;
- security review, threat-model closure, privileged MFA, access review, and
  incident simulation;
- production backup/restore, data reconciliation, deploy/rollback, and provider
  outage game days;
- support handbook, seller-review playbook, prohibited-product playbook,
  merchant education, and buyer help center;
- analytics dashboards, SLOs, alerts, on-call rotation, and status communication;
- privacy/terms/policies published in Khmer and English;
- cohort and kill switches for marketplace and storefront checkout.

Run a closed beta with a small, intentionally supported merchant cohort. Start
with internal/test orders, then invited buyers, then limited public discovery.

Exit gate:

- at least two complete operating cycles with real beta merchants and no
  unresolved P0/P1 defects;
- orders, stock, COD, refunds, subscriptions, and projections reconcile;
- SLOs meet target through the observation window;
- support and incident drills meet response targets;
- product, engineering, security, data, and operations sign the launch record.

### Phase E — general availability

**Goal:** expand safely and learn from real use.

- roll out by merchant cohort and category rather than all Stores at once;
- monitor activation, discovery, conversion, cancellation, fulfillment, return,
  support, reliability, and churn metrics;
- hold daily launch reviews, then weekly operational reviews;
- stop expansion automatically for security, money, stock, or SLO breaches;
- remove inactive legacy dependencies only after the documented observation
  period and a final dependency scan;
- publish a transparent product-status and support channel.

GA is a controlled expansion, not the end of engineering.

### Phase F — CutLuy QR payments and growth

Begin only when Release 1 is stable. Follow ADR 0003 and keep provider concerns
behind an internal adapter. Execute the dependency-ordered
[AI implementation Phase P9](ai-implementation-plan.md#13-phase-p9--cutluy-qr-payment-rollout);
do not collapse its data, webhook, subscription, seller-account, checkout, and
rollout packages into one change.

- build a separate payment-attempt and provider-event ledger;
- verify signed callbacks over the raw body, deduplicate, reconcile, and expose
  operator replay and inspection tools;
- migrate Rentify subscription payments first behind a feature flag;
- connect seller-owned CutLuy accounts for direct seller settlement only after
  credential, consent, support, and legal flows pass review;
- test paid, expired, failed, invalid-signature, duplicate, delayed, quota, and
  provider-outage paths;
- keep COD available until QR behavior is proven and product policy changes;
- treat refund, hold/release, commission, and seller payout as unsupported by
  CutLuy; introduce them only through a separate verified provider and terms;
- pilot with a small cohort behind independent subscription, storefront, and
  marketplace flags;
- add growth features based on measured merchant/buyer problems rather than a
  generic feature checklist.

---

## 11. Prioritized program backlog

### P0 — required before public transactions

1. Production product policies and accountable owners.
2. Owned domain and production-like HTTPS/session/CORS/CSP rehearsal.
3. Accepted buyer identity and custom-domain boundary.
4. Complete Store ownership and projection reconciliation.
5. SKU/variant and shared inventory correctness across every writer.
6. Full marketplace and hosted storefront COD browser journeys.
7. Multi-merchant cart separation and delivery total UX.
8. Return, refund, complaint, seller suspension, and durable support cases.
9. Subscription entitlement lifecycle and billing reconciliation.
10. OpenAPI contracts, error model, typed clients, and contract CI.
11. Structured observability, SLO dashboards, alerts, and on-call runbooks.
12. Tenant isolation, threat-model, accessibility, and performance gates.
13. Staging and production infrastructure as code.
14. Backup, restore, migration, rollback, and incident evidence.
15. Khmer/English policy, help, notification, and critical-flow content.

### P1 — required for a strong GA experience

- bulk product import/export with validation and job history;
- inventory adjustment history and low-stock notifications;
- seller/business performance dashboard with defined metrics;
- review eligibility and moderation improvements;
- notification preference center and provider delivery tracking;
- SEO, structured product/Store metadata, sitemap, canonical URLs, and sharing;
- customer address book with explicit privacy scope;
- robust admin search, case queues, saved filters, exports, and maker-checker;
- automated browser compatibility and visual-regression coverage;
- merchant education, contextual guidance, and demo/sandbox mode.

### P2 — scale and differentiation

- advanced delivery rules and carrier integrations;
- promotions, loyalty, wishlists, recommendations, and merchandising;
- multi-location inventory and procurement;
- multi-Store organizations and advanced staff approvals;
- accounting and tax integrations;
- CutLuy QR payments with seller-owned connections and direct settlement;
- commission, managed settlement, refunds, and payouts only after selecting a
  provider that contractually and technically supports them;
- data warehouse and experimentation platform when event volume warrants it.

---

## 12. Metrics and feedback system

### 12.1 Product metrics

| Funnel | Measures |
| --- | --- |
| Merchant acquisition | qualified signup rate, source, acquisition cost when available |
| Activation | verification completion, Store completion, first product, approval time, publication, time to first order |
| Buyer discovery | search success, zero-result rate, result click, product-to-cart, Store trust interaction |
| Checkout | cart-to-checkout, checkout success, changed-total rejection, stock rejection, abandonment reason |
| Fulfillment | acknowledgement time, delivery success, failed delivery, time to delivery, COD collection lag |
| Trust | return/report rate, response time, refund completion, review quality, seller suspension/appeal |
| Retention | active merchants, repeat buyers, orders per active Store, subscription renewal/churn |

Segment by channel, device, language, Store category, merchant cohort, and new
versus returning user. Protect privacy and avoid high-cardinality personal data.

### 12.2 Research cadence

- observe at least two merchant sessions and two buyer sessions per iteration
  during beta;
- review support contacts and failed funnel sessions weekly;
- conduct a monthly merchant advisory review across new, physical, social, and
  growing sellers;
- pair every major quantitative drop with qualitative investigation;
- maintain a public/internal feedback status so users know what was heard and
  what changed.

---

## 13. Team and governance

The repository lists role ownership; production requires actual named people.
At minimum appoint:

- product lead and business/policy owner;
- product designer/research owner;
- Core/identity engineering owner;
- Commerce/transaction engineering owner;
- frontend/design-system owner;
- marketplace/storefront experience owner;
- data/migration reliability owner;
- security/privacy owner;
- QA/release owner;
- infrastructure/SRE owner;
- customer support/marketplace operations owner;
- payments/finance reconciliation owner.

Operating cadence:

- weekly product outcome and risk review;
- twice-weekly delivery review around golden journeys, not repository teams;
- architecture decision record for durable or cross-domain choices;
- release readiness review with evidence links and explicit go/no-go owners;
- blameless incident review with tracked corrective actions;
- quarterly entitlement, access, dependency, backup, and disaster-recovery
  review.

Every roadmap item must have a customer problem, success metric, owner,
dependencies, acceptance criteria, rollout flag, telemetry, support impact,
and rollback behavior before implementation begins.

---

## 14. Definition of done

A capability is not done because its screen exists. It is done only when:

- the customer outcome and policy are documented;
- UX covers loading, empty, success, validation, conflict, offline/timeout,
  unauthorized, forbidden, and unexpected-error states;
- English and Khmer content is reviewed;
- authorization and tenant isolation are enforced server-side;
- API and event contracts are versioned and compatible;
- migrations are reversible or compensatable and tested on representative data;
- idempotency, concurrency, and financial/stock invariants are tested;
- accessibility and responsive behavior pass;
- telemetry measures use, success, failure, and latency without leaking data;
- support/admin can diagnose and safely act;
- documentation and runbooks are updated;
- rollout and rollback are proven in staging;
- the named product, design, engineering, QA, security/data as applicable, and
  operations owners accept the evidence.

---

## 15. Risks and controls

| Risk | Control |
| --- | --- |
| Scope expands faster than quality | Release 1 boundaries, golden journeys, exit gates, and WIP limits |
| Two APIs drift | Explicit ownership, OpenAPI/events, outbox/inbox, contract tests, reconciliation |
| Stock oversell or double restoration | One inventory service/ledger, row locks, idempotency, concurrency tests |
| Incorrect money state | Separate payment/fulfillment states, exact amounts, snapshots, audit ledger, reconciliation |
| Cross-tenant data leak | Deny-by-default policy, trusted context, matrix tests, scoped admin roles, access logs |
| Cross-domain authentication weakness | Accepted ADR, exact redirects, PKCE/state, one-time codes, host-only sessions, staging tests |
| UI fragmentation | Shared tokens/content/contracts and journey tests; framework migration only with measured value |
| Operational overload | Closed beta, cohort limits, queues, service deadlines, dashboards, runbooks, staffing |
| Unrecoverable migration/release | Expand-contract migrations, backups, restore drills, reconciliation, timed rollback |
| Premature platform complexity | Keep two modular services; add infrastructure only for measured need |
| Misleading business analytics | Define GMV, COD, subscription, refund, and future commission separately |
| Policy ambiguity | Versioned approved policies snapshotted on orders and visible to both parties |

---

## 16. Immediate execution sequence

The next ten actions should be completed in this order:

1. Appoint named owners and create the Release 1 decision register.
2. Run a two-day product/policy workshop to settle delivery, returns, refunds,
   restricted products, tax, multi-merchant cart, subscriptions, and launch
   domains.
3. Accept or replace the buyer identity ADR and draw the exact production host,
   cookie, redirect, CORS, and CSP map.
4. Provision production-like staging through infrastructure as code, including
   telemetry, secrets, backups, and owned HTTPS domains.
5. Freeze and publish the Core/Commerce OpenAPI and event-contract baseline.
6. Audit every current Product/variant/stock writer and implement the canonical
   SKU and inventory-ledger gaps.
7. Build automated tests for the five golden journeys against migrated MySQL
   and real staging browser hosts.
8. Complete the merchant/buyer design-system and UX audit, then repair each
   golden journey from start to recovery states in both languages.
9. Add durable support cases, scoped admin roles, and operational dashboards so
   beta users can be supported safely.
10. Run restore, rollback, security, load, and closed-beta rehearsals; launch
    only when the evidence satisfies every Phase D gate.

---

## 17. Final architecture test

Before accepting any new design, ask:

1. Does it make a merchant or buyer job meaningfully easier?
2. Which service owns the truth and who may change it?
3. Can it create duplicate orders, incorrect money, or incorrect stock under
   retry and concurrency?
4. Can one tenant see or change another tenant's data?
5. What does the user see when it is slow, unavailable, rejected, or changed?
6. How will support diagnose it and how will operators reconcile it?
7. How is it measured, deployed gradually, and rolled back safely?
8. Does it work on a normal phone, in Khmer and English, on a weak connection?
9. Is the policy honest and understandable to both sides of the transaction?
10. Is the added complexity justified by measured need?

If those questions have clear, tested answers, Rentify is moving toward the
right platform: not merely feature-rich, but useful, trustworthy, operable, and
ready for real Cambodian businesses.
