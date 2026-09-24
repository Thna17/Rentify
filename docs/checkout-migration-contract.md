# Phase 4 COD checkout contract

**Status:** Shared marketplace and hosted storefront COD paths implemented
(2026-09-24). Local Compose enables marketplace COD and normal Angular routes
use Rentify Core and Commerce. Hosted storefront COD remains default-off;
hosted-domain rehearsal and operations policy remain open. The KhmerCraft API
is inactive reference code.

## Identity and access

- A marketplace buyer signs in with a verified Core `User` account. Commerce
  validates Core's `userAccessToken`/`userRefreshToken` and takes `buyerId`
  from that trusted response, never from the request body. The product owner
  confirmed buyer sign-in is required for hackathon COD checkout.
  Marketplace buyer routes explicitly validate Core cookies even if the
  browser also carries a legacy storefront Customer or staff cookie. An
  invalid Core session cannot fall back to a legacy Customer identity.
- Seller order operations use the Commerce Store access projection. Only the
  Store owner or a Website staff member with order permission can read or
  change that Store's marketplace orders. Buyer history is filtered by
  `buyerId`; seller views are filtered by `storeId`.
  Store catalog and marketplace order routes now choose valid staff credentials
  or a Core merchant account before considering any legacy Customer cookie.
- Hosted storefronts use Core buyer identity when the frontend build enables
  `VITE_HOSTED_STOREFRONT_BUYER_ENABLED` for a single-label subdomain of
  `VITE_HOSTED_STOREFRONT_DOMAIN`. The provisional parent is
  `rentifystore.shop`; it has not been acquired or deployed. The Core and
  Commerce APIs require the matching `HOSTED_STOREFRONT_DOMAIN` for HTTPS
  return URLs and credentialed CORS. Core's `COOKIE_DOMAIN` must cover the
  auth, API, marketplace, and hosted storefront names under an owned parent.
  The hosted browser flow still needs a real-domain cookie/CORS rehearsal.
  Review storefront content and CSP before enabling shared parent cookies:
  credentialed API CORS accepts the configured hosted subdomains, so merchant
  content must not be able to run arbitrary scripts there.
- Custom-domain buyer login is **not implemented**. ADR 0002 remains Proposed
  for its host-local callback, one-time code exchange, and verified legacy
  account linking. Keep custom-domain buyer checkout on hold.

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
| `GET /storefront/:websiteId/cart` | Core buyer | Read the hosted Website's Store cart and live COD quote. |
| `PUT /storefront/:websiteId/cart/items/:productId` | Core buyer | Set absolute quantity for a Website Product. |
| `POST /storefront/:websiteId/checkout` | Core buyer | Place a one-Store storefront COD order. |
| `GET /storefront/:websiteId/my-orders` and `GET /storefront/:websiteId/my-orders/:orderId` | Core buyer | Read own orders for that Website's Store. |
| `POST /storefront/:websiteId/my-orders/:orderId/reports/:type` | Core buyer | Submit own order complaint or return request. |

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

The storefront path uses the same canonical Product, stock deduction, COD
payment state, posted Store delivery fee, event ledger, and merchant actions.
It requires an active Website projection and an active Product linked to that
Website. Direct storefront COD sales do not require marketplace seller
approval; marketplace checkout still does. The shared buyer cart is keyed by
buyer and Store, so adding items from both channels for one Store can produce
an ineligible cart on one channel. Its quote reports that issue and refuses
checkout. A separate per-channel cart is deferred.

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

Rentify's merchant dashboard now offers a Store-scoped COD order panel
for both marketplace-only and storefront merchants. It shows the posted COD
amount, delivery and payment state, reports and event history. The merchant
can record delivery, failure, buyer-approved retry, cash collection, and a
confirmed direct refund for either channel. This is an operator UI over
Commerce; it does not switch Angular buyers to the new checkout yet.

Both React storefront templates now have a default-off hosted buyer mode that
uses Core login, the Store cart quote, storefront COD checkout, and Website
scoped order history. The old Website online buyer checkout accepts COD/USD
only and no longer displays KHQR. When the hosted mode is enabled, the new
checkout uses the Commerce quote (including the posted delivery fee), a
request idempotency key, and the central buyer cookie. It is not yet proven on
the provisional domain. `STOREFRONT_COD_CHECKOUT_ENABLED=true` is required for
new storefront cart writes and checkout; it defaults off.

Angular's designed development routes use Rentify Core identity and Commerce
products, per-Store carts, COD checkout, and order history. The obsolete
product-only preview route has been removed. The committed public config
provides API origins; blank origins use localhost fallbacks. Supply real public Core,
Commerce, Auth, and merchant dashboard URLs outside localhost. Local Compose
sets `MARKETPLACE_COD_CHECKOUT_ENABLED=true`. This does not satisfy the
hosted-domain or production release gate. Core exposes
only approved public Store profile fields through `GET /api/stores/public?ids=...`
and a safe `GET /api/auth/session` for the buyer UI.
The local checks are in
[the development rehearsal](marketplace-cutover-rehearsal.md).

## Stock and reconciliation

`sharedStockService.changeStock` now owns order-driven stock increments and
decrements for the new marketplace path, existing niche order strategies, and
the legacy fulfillment/cancellation stock service. It uses Product/variant
row locks, rejects negative stock, increments versions, and does not revive
draft or archived products. The legacy Website online order path rechecks
the Product's Website and current price before order creation. The existing
Website payment, POS, and invoice routes still need full HTTP journey and buyer
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

1. Rehearse Angular catalog, cart, buyer auth, checkout, order history, and
   seller operations together to these Core/Commerce contracts. Keep one
   active writer. Remove ABA PayWay from launch buyer checkout at that switch.
2. Acquire or choose the launch parent domain, deploy HTTPS names under that
   same site, set `COOKIE_DOMAIN` and the hosted domain flags, then exercise
   login, cart, checkout, and order history in a browser. Custom domains wait
   for ADR 0002's domain-local callback and verified account linking.
3. Exercise storefront COD and POS/invoice HTTP orders against the same Product;
   test cancellation, collection, reconciliation, and cross-origin cookies.
4. Set return/complaint response deadlines, acceptable refund evidence,
   restricted-product moderation, tax and delivery policy, and an admin case
   review workflow before public release. Decide whether a flat delivery fee
   is sufficient beyond the pilot or whether zones and weights are needed.
