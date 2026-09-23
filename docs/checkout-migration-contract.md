# Phase 4 COD checkout contract

**Status:** Backend foundation implemented, UI and identity cutover pending (2026-09-24).
This contract describes the new Commerce marketplace path. The Angular
marketplace still uses its legacy API and must not be switched to the new
catalog alone.

## Identity and access

- A marketplace buyer signs in with a verified Core `User` account. Commerce
  validates Core's `userAccessToken`/`userRefreshToken` and takes `buyerId`
  from that trusted response, never from the request body. The product owner
  confirmed buyer sign-in is required for hackathon COD checkout.
- Seller order operations use the Commerce Store access projection. Only the
  Store owner or a Website staff member with order permission can read or
  change that Store's marketplace orders. Buyer history is filtered by
  `buyerId`; seller views are filtered by `storeId`.
- Central buyer login on merchant custom domains is **not implemented**.
  ADR 0002 remains Proposed. The host-local callback, one-time code exchange,
  and verified legacy account linking must pass its release gate before
  storefront buyer sessions are switched.

## Commerce API

All paths below are relative to `/api` and use the Core session cookies.

| Method/path | Caller | Purpose |
| --- | --- | --- |
| `GET /marketplace/cart?storeId=...` | buyer | Read one or all Store carts. |
| `PUT /marketplace/cart/:storeId/items/:productId` | buyer | Set absolute integer `quantity` from 0 to 999. Zero removes the line. |
| `POST /marketplace/checkout` | buyer | Place one-Store COD order. |
| `GET /marketplace/my-orders` and `GET /marketplace/my-orders/:orderId` | buyer | Read own marketplace orders. |
| `POST /marketplace/my-orders/:orderId/reports/:type` | buyer | Submit `complaint` or `return_requested`. |
| `GET /stores/:storeId/marketplace-orders` and `GET /stores/:storeId/marketplace-orders/:orderId` | seller | Read own orders. |
| `GET /stores/:storeId/marketplace-orders/:orderId/events` | seller | Read delivery, cash, return, and complaint audit events. |
| `POST /stores/:storeId/marketplace-orders/:orderId/actions/:action` | seller | Record `delivered`, `delivery_failed`, `retry_delivery`, `collect_cod`, or `confirm_refund`. |

Checkout requires `Idempotency-Key: <UUID>` (or `idempotencyKey` in JSON),
`storeId`, `customerInfo: {name, phone}`, and `shippingInfo: {address}`.
The same key from the same buyer returns the first order; reuse with another
buyer or Store is rejected. Cart lines are Store-scoped, so a multi-merchant
basket becomes separate orders. `PUT` cart quantity is absolute, which makes
client retries safe.

The server rechecks Store approval, entitlement, publication, opt-out, Product
status, variant support, stock, and price in a SQL transaction. Product rows
are locked in ID order. It snapshots product name, category, seller Store ID,
price, tax, shipping, and commission on each OrderItem. The current pilot
sets tax, platform commission, and shipping charge to zero; the seller
arranges and absorbs delivery, so the COD amount due equals the shown item
total. This pilot rule needs explicit product and legal review before public
release. Variant checkout is rejected until variant inventory and price
selection have an end-to-end test.

`Payment.status` starts `pending` with `collectedAmount = 0`. Marking delivery
`delivered` changes only fulfillment. `collect_cod` requires delivered status
and the full amount due, and stores collector and timestamp. `confirm_refund`
requires collected cash, a positive amount no greater than the remaining
balance, method, and confirmation. Refund requests alone never change payment
status. A failed delivery records a reason and either waits for a
buyer-agreed retry or cancels and restores stock. Delivery cancellation is
forbidden after collection. Every seller action and buyer report requires an
idempotency key and writes an `OrderEvent`.

## Stock and reconciliation

`sharedStockService.changeStock` now owns order-driven stock increments and
decrements for the new marketplace path, existing niche order strategies, and
the legacy fulfillment/cancellation stock service. It uses Product/variant
row locks, rejects negative stock, increments versions, and does not revive
draft or archived products. The legacy Website online order path rechecks
the Product's Website and current price before order creation. The existing
Website payment, POS, and invoice routes still need full COD-only and buyer
identity cutover rehearsal; they are not yet the launch contract.

Run `DB_NAME=rentify_commerce_test NODE_ENV=test npm run db:smoke-marketplace-checkout`
against an isolated, migrated Commerce database. It checks concurrent last
unit purchases, a storefront stock writer competing with marketplace
checkout, replayed checkout, seller isolation, delivery without payment,
collection, refund, cancellation, and archived Product restoration. Run
`npm run db:audit-marketplace-cod` to compare order totals, line snapshots,
cash status, and collection/refund events. The audit reports every mismatch
and exits nonzero; zero orders only proves the command runs, not financial
parity.

## Cutover work still required

1. Adapt Angular catalog, cart, buyer auth, checkout, order history, and
   seller operations together to these Core/Commerce contracts. Keep one
   active writer. Remove ABA PayWay from launch buyer checkout at that switch.
2. Implement and stage-test ADR 0002's domain-local buyer session callback
   for custom merchant domains. Do not merge existing Customer accounts by
   matching email.
3. Exercise a complete storefront COD order and POS/invoice order against the
   same Product; test cancellation, collection, and reconciliation with live
   HTTP auth and cookies. Complete cross-origin CORS and cookie tests.
4. Set return/complaint response deadlines, acceptable refund evidence,
   restricted-product moderation, tax and delivery policy, and an admin case
   review workflow before public release.
