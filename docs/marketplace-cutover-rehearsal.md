# Marketplace buyer cutover rehearsal

**Status:** Staging procedure only. No live traffic or legacy data has been
cut over. The Rentify Angular buyer route is `/rentify-preview`; normal routes
still use KhmerCraft's Mongo API.

## Before the freeze

1. Use an isolated staging environment with a restorable Mongo snapshot and a
   separate migrated Commerce database. Record both backup identifiers and
   database counts. Do not run the SQL smoke scripts against a shared database.
2. Ensure there are no new PayWay checkouts and identify every in-flight
   payment. The legacy API will continue to accept **existing** PayWay
   callbacks after the freeze; its callback handler verifies transaction
   status with PayWay and must remain online
   until those payments have settled or been manually resolved.
3. Inventory all Mongo writers, including API instances, background jobs,
   scripts, and direct database access. Stop external writers before declaring
   the freeze effective. The HTTP guard only protects requests through the
   legacy Express API.
4. Record catalog, cart, open-order, payment, and stock counts. Since the
   owner reports no KhmerCraft data to import for the hackathon release,
   rehearsal fixtures must be disposable and clearly identified.

## Freeze and exercise the Rentify path

1. Restart every legacy API instance with
   `LEGACY_MARKETPLACE_WRITES_FROZEN=true`. A non-GET/HEAD/OPTIONS legacy
   request must return `503` and `LEGACY_WRITES_FROZEN`. Read routes and
   `/api/payments/aba-payway/callback` remain available.
2. Reconcile the final Mongo counts and any PayWay callbacks that settled
   during the freeze. Do not enable a second product or order writer while
   unresolved mutations are still arriving.
3. Configure the Angular preview's public Core, Commerce, and Auth URLs and
   set `enabled: true` in `rentify-preview-config.js` for staging. Confirm
   cross-origin credentials and a Core buyer sign-in return to the preview.
4. Enable `MARKETPLACE_COD_CHECKOUT_ENABLED=true` on Commerce only after the
   freeze is verified. Create an approved Store, posted delivery fee, and a
   published Commerce Product in staging. Exercise listing, Store-scoped cart,
   one-Store COD order, retry with the same idempotency key, merchant delivery,
   cash collection, and the buyer's order view. Try a second Store and confirm
   it creates a separate order with its own delivery fee.
5. Run `npm run db:audit-marketplace-cod` in Commerce. Review every mismatch;
   zero orders is not proof of reconciliation. Check stock and order counts
   against the pre-freeze snapshot and new Commerce activity separately.

## Rollback boundary

Disable the Angular preview and set
`MARKETPLACE_COD_CHECKOUT_ENABLED=false` to stop **new** Commerce cart writes
and checkouts. Existing Commerce COD orders stay in Commerce for fulfillment
and cash reconciliation. Do not transfer them into Mongo or replay checkout.
Keep the legacy API frozen until the active writer's changes and stock are
reconciled; re-enabling Mongo writes without a reviewed data plan would create
two authorities. Record the decision, operator, time, counts, and open orders.

The normal Angular buyer routes, custom-domain buyer session exchange,
storefront COD-only switch, admin dispute flow, and full HTTP checkout tests
remain release gates in [the migration plan](migration-plan.md).
