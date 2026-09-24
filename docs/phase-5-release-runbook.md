# Phase 5 Rentify release runbook

**Status (2026-09-24):** Development routing only. The Angular marketplace
uses Rentify Core and Commerce on normal local routes; no production traffic
switch or restore drill has occurred. The KhmerCraft API and MongoDB are not
part of the platform. Existing Rentify Stores and Products are the source.

## Release record

For each staging rehearsal and production cohort, record the commit SHA,
environment, Core/Commerce database names, operator and approvers, start/end
times, SQL and media backup identifiers, baseline and final counts, feature
flag values, evidence links, and a continue or rollback decision. Appoint
Core, Commerce, frontend, data, payments, and operations owners.

## Preflight

1. Inventory existing Rentify Stores, Websites, Products, categories, stock,
   open orders, payments, and marketplace eligibility. Count opted-out Stores,
   pending seller approvals, unreviewed Store categories, Products missing
   marketplace categories, and unpublished Products. Do not invent category or
   approval values for existing merchants.
2. Take restorable Core SQL, Commerce SQL, and media backups. Prove a restore
   in an isolated environment. Existing Rentify IDs and financial references
   must survive unchanged.
3. Run `node scripts/cutover-projection-audit.mjs` from the repository root.
   It compares Core Store/Website rows, Commerce projections, versions,
   ownership, status, and pending outbox IDs. The command exits nonzero on a
   mismatch. Its green result proves projection parity only.
4. Run `docker compose exec -T ecommerce-api npm run db:audit-stores` and
   `docker compose exec -T ecommerce-api npm run db:audit-cod`. Review every
   finding. The COD audit covers new marketplace and hosted storefront buyer
   checkout; reconcile older Website Customer orders against their original
   Commerce ledger separately. Zero audited orders is not a checkout proof.
5. Reconcile published catalog, category, and stock counts against eligible
   marketplace reads. Compare COD due, collected, and refunded amounts by
   channel, and historical gateway totals by provider and period. Resolve
   every unexplained difference.

## Staging and production sequence

1. Complete Phase 3 and 4 gates: browser identity and CORS checks, seller and
   category eligibility, Store and Product opt-outs, hosted storefront buyer
   session, POS/invoice HTTP flows, order/refund operations, and tenant
   isolation. Use an owned HTTPS parent domain for hosted session rehearsal;
   `rentifystore.shop` is only a placeholder.
2. Exercise marketplace-only and storefront onboarding, product lifecycle,
   one-Store COD orders on both channels, retries, fulfillment, cash
   collection, failed delivery, return requests, and confirmed refunds. Test
   concurrent last-unit stock behavior. Confirm all Angular routes and jobs
   call Rentify APIs only.
3. Re-run all preflight audits after each staged cohort. Measure auth errors,
   listing lag, stock drift, order failures, and COD reconciliation. Time the
   deployment, verification, and rollback drill; record observed durations.
4. Promote only after staging evidence is reviewed. Record flags and traffic
   routing before each production cohort. A failed check stops further
   cohorts until the owner resolves it.

## Rollback and retirement

Disable new checkout traffic for the affected channel and preserve existing
Commerce orders for their merchants to fulfill and reconcile. Restore a
previous Angular build only if it uses Rentify APIs; never reactivate the
KhmerCraft API as a product or order writer. Restore SQL/media backups only
under a documented incident plan that accounts for orders created after the
backup. A feature flag cannot transfer an in-flight order or payment.

Remove legacy KhmerCraft server code and credentials after the Angular
routes, background jobs, and operator workflows have no dependency on it and
the Rentify browser, money, stock, rollback, and restore gates pass.

## Current blockers

- Full browser rehearsal of marketplace and hosted storefront checkout is
  incomplete; hosted production domain and cookie scope remain unresolved.
- Existing Rentify product/category eligibility and Core-to-Commerce mappings
  still need staging reconciliation.
- POS/invoice HTTP paths and return/dispute policy need final checks.
- No staging or production backup/restore and timed rollback evidence exists.
