# Phase 4 COD checkout contract

**Status:** Backend foundation, merchant-posted delivery fee, merchant order
operations UI, and a disabled Angular buyer preview implemented; live buyer
cutover pending (2026-09-24).
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
| `GET /stores/:storeId/marketplace-delivery` | seller | Read the posted delivery fee and version. |
| `PUT /stores/:storeId/marketplace-delivery` | seller | Set a flat USD fee, using `expectedVersion` on updates. Zero means posted free delivery. |
| `GET /stores/:storeId/marketplace-orders` and `GET /stores/:storeId/marketplace-orders/:orderId` | seller | Read own orders. |
| `GET /stores/:storeId/marketplace-orders/:orderId/events` | seller | Read delivery, cash, return, and complaint audit events. |
| `POST /stores/:storeId/marketplace-orders/:orderId/actions/:action` | seller | Record `delivered`, `delivery_failed`, `retry_delivery`, `collect_cod`, or `confirm_refund`. |

Checkout requires `Idempotency-Key: <UUID>` (or `idempotencyKey` in JSON),
`storeId`, `expectedTotalAmount` from the cart quote,
`customerInfo: {name, phone}`, and `shippingInfo: {address}`.
The same key from the same buyer returns the first order; reuse with another
buyer or Store is rejected. Cart lines are Store-scoped, so a multi-merchant
basket becomes separate orders. `PUT` cart quantity is absolute, which makes
client retries safe. `GET /marketplace/cart` returns each Store's current
item subtotal, posted delivery fee, total, and checkout readiness. A changed
price or fee rejects checkout so the buyer can review the updated total.

The server rechecks Store approval, entitlement, publication, opt-out, Product
status, variant support, stock, and price in a SQL transaction. Product rows
are locked in ID order. It snapshots product name, category, seller Store ID,
price, tax, and commission on each OrderItem, with the delivery fee and policy
version on the Order. Marketplace discovery
requires a posted Store delivery policy. For the pilot, the merchant sets a
flat USD delivery fee per order, including `0.00` for free delivery. The buyer
pays the shown item subtotal plus that fee directly to the merchant by COD.
Commerce snapshots the fee and policy version on the order; later changes do
not affect placed orders. Platform commission and modeled tax remain zero for
this pilot. Tax and delivery scope need review before public release. Variant
checkout is rejected until variant inventory and price selection have an
end-to-end test.

`Payment.status` starts `pending` with `collectedAmount = 0` and amount due
equal to the item subtotal plus posted delivery fee. Marking delivery
`delivered` changes only fulfillment. `collect_cod` requires delivered status
and the full amount due, and stores collector and timestamp. `confirm_refund`
requires collected cash, a positive amount no greater than the remaining
balance, method, and confirmation. Refund requests alone never change payment
status. A failed delivery records a reason and either waits for a
buyer-agreed retry or cancels and restores stock. Delivery cancellation is
forbidden after collection. Every seller action and buyer report requires an
idempotency key and writes an `OrderEvent`.

Rentify's merchant dashboard now offers a Store-scoped marketplace order panel
for both marketplace-only and storefront merchants. It shows the posted COD
amount, delivery and payment state, reports and event history. The merchant
can record delivery, failure, buyer-approved retry, cash collection, and a
confirmed direct refund. This is an operator UI over Commerce; it does not
switch Angular buyers to the new checkout yet.

Angular now has an isolated `/rentify-preview` route for staging the complete
buyer path against Core identity and Commerce products, per-Store carts, COD
checkout, and order history. `rentify-preview-config.js` disables it by default.
Enable it only in an isolated rehearsal environment after freezing legacy
marketplace writes, using public Core, Commerce, and Auth URLs. Commerce also
requires `MARKETPLACE_COD_CHECKOUT_ENABLED=true` for cart writes and order
placement; it defaults off. The normal
Angular routes continue using the legacy API until the combined cutover gate
passes. No production buyer traffic is switched by this preview. Core exposes
only approved public Store profile fields through `GET /api/stores/public?ids=...`
and a safe `GET /api/auth/session` for the buyer shell.
The opt-in legacy HTTP write freeze and staging order of operations are in
[the cutover rehearsal](marketplace-cutover-rehearsal.md). The freeze cannot
stop scripts or direct Mongo writes, which require an operations check.

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
   review workflow before public release. Decide whether a flat delivery fee
   is sufficient beyond the pilot or whether zones and weights are needed.
