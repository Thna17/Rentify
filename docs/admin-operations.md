# Platform admin operations

**Status: Current implementation with live administrative workflows (2026-09-25).**
The Angkoro Admin PRD was used as a product and UX reference. Rentify's
marketplace and payment rules take precedence over that storefront-only model.

## Current

- One protected Angular admin surface replaces the earlier mock-only routed
  pages. Core verifies admin identity; Commerce validates that Core identity
  before serving its admin reads and handling administrative actions. The admin
  browser client sends the shared session cookie to both APIs; an old bearer
  token in browser storage does not override that session.
- The overview shows live operational counts from each authority, with
  unavailable values hidden if either API fails. COD order totals are not
  platform revenue.
- The overview dashboard includes a 3-tab Priority Action Queue (Pending Sellers,
  Flagged Reviews, and Buyer Reports) allowing instant 1-click inspection and
  triage directly from the overview console.
- Core lists Stores, owner contact and verification, optional Websites,
  seller applications, users, templates, plans, subscriptions, and plan
  payment records. Admin can inspect a Store, follow its products and orders,
  approve, request changes, reject, or suspend a submitted seller
  application using Core's required checklist and audit record, toggle
  marketplace listing entitlement (`marketplaceEnabled`), and toggle store
  status (`active`/`suspended`). Changes immediately synchronize to Commerce
  via `storeSyncService`.
- Commerce lists canonical products, orders across sales channels, customer
  payment records, product reviews, buyer order complaints and return
  requests, and usage billing statements. Admin can directly moderate
  products (marketplace listing hold/override, catalog active/archive status,
  and quick restock), moderate product reviews (publish, flag, hide, or delete),
  and triage buyer order reports (open, investigating, resolved, dismissed)
  with recorded resolution notes and reviewer metadata. Orders expose status,
  delivery, payment facts and line items for investigation.
- All lists are paginated and search is server-side for fields supported by
  their respective resource. Responses select operational fields and exclude
  password hashes, tokens, payment credentials, and provider payloads.

## Boundaries

- **Core owns:** identity, Store profiles, seller approval and review trail,
  Store status/marketplace toggle, Website and subscription lifecycle. A Store may have no Website.
- **Commerce owns:** catalog, order, delivery, payment, review moderation, buyer report
  triage, and usage billing records.
- **Launch payments:** Marketplace and storefront checkout use COD. The
  merchant collects and refunds cash. Plan subscriptions are Rentify's launch
  revenue. Commission, custody, payout, and bank payment access remain future
  capabilities and have no live admin controls.
- **Seller approval:** Core's verified-contact and primary-category checks
  must pass. Admin records the full existing checklist. Product publication,
  category, Store opt-out, and seller approval remain separate eligibility
  gates in Commerce.

## Next workflow gates

The reference PRD includes several capabilities that Rentify does not yet
have as an authoritative backend workflow. Do not add client-only controls
for them:

1. Durable support cases with assignment, notes, event history, and links to
   users, Stores, orders, and buyer reports beyond the current order event triage.
2. Unified admin audit view beyond Core seller reviews, permission tiers
   beyond the current single Core `admin` role, and session/account
   moderation with independently enforced policy.
3. Merchant order exception actions with authority, state transitions, and
   audit rules. Fulfillment and cash collection remain with the merchant.
4. Financial analytics with agreed measures, currency segmentation, and
   reconciled subscription revenue. Do not derive platform income from COD
   order value or invent marketplace commission.
5. Bank credentials, online payment investigation, refunds, custody,
   settlement, and seller payout workflows after the payment design and
   provider contracts are settled. Never expose raw credentials.

## Verification

Build and unit suites for all affected projects, plus an authenticated
end-to-end pass against a migrated local stack, are the release gate. A
missing Commerce migration must surface as an API error; it must not crash
the server process or be replaced by fabricated admin data.
