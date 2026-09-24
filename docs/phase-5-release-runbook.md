# Phase 5 release and retirement runbook

**Status (2026-09-24):** Preparation only. No production cutover, historical
import, traffic switch, or legacy API retirement has occurred. The owner
confirmed KhmerCraft has no independent data: existing Rentify Stores and
Products are the launch source. Verify the deployed source counts before
cutover and reconcile Rentify's Core and Commerce records.

## Release record

For each staging rehearsal and production cohort, record the environment,
commit SHA, Core/Commerce/legacy database names, named operator and approvers,
start/end times, backup identifiers and restore location, baseline and final
counts, failed-record queue, feature flag values, evidence links, and the
continue or rollback decision. Appoint Core, Commerce, frontend, data,
payments, and operations owners before a traffic switch.

## Preflight and evidence

1. Inventory existing Rentify Stores, Websites, Products, categories, active
   orders, payments, stock, and marketplace eligibility. Record how many
   storefront Stores default to marketplace enabled, how many opted out, and
   how many Products are blocked by seller approval or category review.
   Record zero counts for independent Mongo users, Stores, products, reviews,
   orders, payments, and images. If nonzero records appear, stop and scope a
   separate idempotent import and account-linking rehearsal.
2. Take restorable Core SQL, Commerce SQL, and media backups and prove a
   restore in an isolated environment. Preserve any deployed legacy database
   snapshot until its zero-record inventory is verified. Never replay a charge.
3. Run `node scripts/cutover-projection-audit.mjs` at the repository root while
   the local Compose stack is running. It compares Core Store/Website rows,
   Commerce projections, versions, ownership, status, and pending outbox IDs.
   The command exits nonzero on a difference. It also accepts Core and Commerce
   snapshot JSON paths for a captured staging pair. Its green result means
   **projection parity only**, not release readiness.
4. Run `docker compose exec -T ecommerce-api npm run db:audit-stores`
   and `docker compose exec -T ecommerce-api npm run db:audit-cod`. Both must
   exit zero, with every finding reviewed. The COD audit covers new
   marketplace and hosted storefront buyer checkouts; it excludes legacy
   Website Customer orders. Reconcile those older orders and payment methods
   against their original ledger separately. Zero audited orders is not a
   checkout proof.
5. Reconcile eligible published catalog and category counts, stock on hand
   versus orders and returns, new COD due/collected/refunded totals by channel,
   and historical gateway totals by provider and period. Record the exact
   discrepancies and their owners; no unexplained difference can pass.

## Staging sequence

1. Complete Phase 3 and 4 gates first: one writer, both public product readers,
   merchant/admin policies, Angular normal routes, hosted-domain buyer session,
   POS/invoice HTTP flows, browser isolation, and order/refund operations. Use
   an owned HTTPS parent domain for the hosted session rehearsal. The provisional
   `rentifystore.shop` is a placeholder, not an owned deployment domain.
2. Exercise marketplace-only onboarding and storefront onboarding, then
   create/edit/archive products, toggle marketplace visibility, place one-Store
   COD orders on both channels, retry checkout, fulfill, collect cash, report a
   failed delivery, request a return, and record a confirmed refund. Verify
   tenant isolation and concurrent last-unit stock behavior.
3. Follow [the buyer cutover rehearsal](marketplace-cutover-rehearsal.md) to
   freeze every legacy writer, settle or identify in-flight PayWay callbacks,
   capture final deltas, and switch one staging cohort. Re-run all preflight
   audits and compare the before/after ledgers. Measure auth errors, listing
   lag, stock drift, callback age, order failures, and COD reconciliation.
4. Time the freeze, Rentify reconciliation, verification, switch, and rollback
   drill. Write down the observed duration, not an estimate. A failed check
   stops further cohorts until the data owner resolves it.

## Production cohorts and rollback

Promote only after the staging evidence is reviewed. Record flags and traffic
routing before each cohort: Store/onboarding, catalog read, catalog write,
marketplace checkout, hosted storefront checkout, then operations. At each
step, repeat the relevant audits and owner/buyer journeys, compare counters to
the baseline, and record a continue or rollback decision. Do not enable both
Mongo and Commerce product/order writers.

For rollback, disable **new** Commerce checkout traffic for the affected
channel and preserve existing Commerce orders for their original merchant to
fulfill and reconcile. Restore a prior reader only after an audited delta from
the active catalog writer. Keep legacy writes frozen until ownership and data
are reconciled. Existing PayWay callbacks retain their original handler until
all in-flight transactions are settled or manually resolved. A feature flag
does not move an order or payment between databases.

Keep the legacy API read only through an agreed observation period. Retire it
only after all normal Angular routes, jobs, callbacks, and operators use Rentify;
the zero-record source inventory and Rentify mappings are preserved; financial
and stock ledgers match; restore and rollback drills have succeeded; and legacy
credentials have been removed. Record the retirement approval and retain
backups according to the agreed retention policy.

## Current blockers

- Phase 3 reader and Phase 4 checkout switches have not passed their gates.
- Hosted HTTPS domain/session and browser rehearsal are incomplete.
- Full POS/invoice and return/dispute policy checks are incomplete.
- Existing Rentify product/category eligibility and Core-to-Commerce mappings
  still need staging reconciliation. A nonempty KhmerCraft source inventory
  would require a separate import plan.
- No staging or production backup/restore and timed cutover evidence exists.
