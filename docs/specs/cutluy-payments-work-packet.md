# Work packet — CutLuy payments (DEC-029)

Prompt for an agent. Self-contained; read it top to bottom before changing anything.

---

You are working in the Rentify monorepo (`C:\Users\User\rentify`). Read `AGENTS.md` and `CLAUDE.md` first, then
`docs/decisions/release-1-register.md` **DEC-029** (online payment by KHQR through CutLuy; supersedes DEC-026/027).
The target UX is in `docs/experience/wireframes/rentify-ux-redesign.html` — open it in a browser and look at screens
M4b (paid order), M21b (Settings › Payments), K8 (checkout), K8b (Pay with KHQR) and X3b (POS KHQR); their numbered
notes are the acceptance criteria for what the APIs must support.

## Decisions you must follow (DEC-029)

- Buyers pay by **KHQR** or **Cash on Delivery**. KHQR runs through the **merchant's own CutLuy account** (CutLuy
  connects to ABA). Money settles to the merchant; Rentify's CutLuy account is only for subscription billing.
- **CutLuy is the only online payment path.** The marketplace's direct ABA PayWay path is retired.
- **One payment setting per merchant**, saved on the website (`/api/payment-config/:websiteId`). Every merchant signs
  up through onboarding, which creates the online store and lists it on the marketplace automatically (DEC-028), so
  marketplace checkout uses the same setting. Do not build per-Store payment settings.
- An order is **paid only when Commerce confirms it with CutLuy** (webhook or status check). Never from the client.
- **No refunds for now.** A paid order cannot be cancelled from the dashboard.
- **Unpaid orders get a time limit** (this packet builds it).

## Current state (verified 2026-10-31 — re-check before relying on it)

- Payment routes: `ecommerce-server/modules/payments/paymentRoutes.js`, mounted at **`/api/payment`** (singular):
  `GET /payments/public-methods/:websiteId` (returns `paymentMethods: ["COD", "KHQR"?]`, `cutluyEnabled`,
  `businessName`), `GET /payments/:paymentId`, `GET /payments/:paymentId/check-status`,
  `POST /payments/cutluy/webhook`, `POST /orders/:orderId/confirm-payment`, `POST /orders/:orderId/link`.
- Config: `paymentConfigController.js` (`GET/PUT /api/payment-config/:websiteId`), model `PaymentGatewayConfig`
  (`gateway` ENUM khqr/aba/stripe/cutluy, `websiteId`, `storeId`, `enabled`, `config` with encrypted secrets). The
  CutLuy key is validated against CutLuy on save.
- Payment status constants (`ecommerce-server/utils/constants.js`): `pending`, `completed`, `paid`, `failed`,
  `refunded`. Both `paid` and `completed` are treated as paid in places.
- Marketplace checkout (`modules/checkout/marketplaceCheckoutService.js`): `resolvePaymentMethod` already accepts
  `KHQR`/`CUTLUY` and creates a CutLuy payment (`POST {CUTLUY_API_BASE_URL}/v1/payments`), looking up the config by
  the order's `websiteId` or `storeId`. It also accepts `ABA_PAYWAY` when `PAYWAY_ENABLED=true`.
- ABA PayWay: `modules/payments/aba/*`, mounted at `/api/payments/aba-payway`; marketplace frontend
  `checkout.component.ts` (`ABA_OPTION`, `abaEnabled`) and `aba-payment.component.ts` (route `checkout/aba/:orderId`).
- `modules/payments/recoveryWorker.js` re-checks pending payments every 15 minutes; nothing cancels unpaid orders.
- POS (`rentify-frontend/apps/core/pos/src/pages/pos/POS.jsx`, `pollPaymentStatus`) polls
  **`/api/payments/${paymentId}/status`** — no such route exists under the `/api/payment` mount, so POS KHQR likely
  never completes. It also stops polling after 120 s without telling the cashier. `POSOrderStrategy.js` returns
  `khqrData` only if `payment.transactionData.rawQR` is set — confirm something sets it for POS sales.
- Host validator (`tools/host-validator/policies.js`): rejects `CUTLUY_ENABLED=true` (DEC-027) and requires COD
  (DEC-026). Fixtures in `tools/fixtures/config/`, tests in `tools/host-validator/test/validator.test.js`.

## Work, in order (one PR per numbered item is fine; small PRs preferred)

### 1. Production gates follow DEC-029
- Host validator: allow `CUTLUY_ENABLED=true`; reject `PAYWAY_ENABLED=true` in staging/production; keep COD
  mandatory. Rename policy labels to DEC-029. Update fixtures, `.env.*.example` files and tests.
- Replace "DEC-026 keeps Release 1 COD-only" / "test-only" comments in Commerce and the marketplace with DEC-029.

### 2. Marketplace checkout uses CutLuy only
- Remove `ABA_PAYWAY` from `resolvePaymentMethod`; requests for it fail with the existing
  `PAYMENT_METHOD_UNAVAILABLE`. Unmount `/api/payments/aba-payway` and delete `modules/payments/aba/*` and its test
  once nothing references them (or leave the files with a removal note if another team owns them — say which).
- Make sure a marketplace order always finds the merchant's CutLuy config: if marketplace orders don't carry
  `websiteId`, resolve the Store's website. Add a test.
- The marketplace needs to know, per Store, whether KHQR is offered. Add a public endpoint by Store (for example
  `GET /api/payment/payments/public-methods/store/:storeId`, same response shape as the website one) or document why
  the website one is enough. Never expose secrets.
- If `KHQR` is requested but the Store has no enabled CutLuy config, fail with a clear code instead of silently
  creating a COD order. Check what the code does today and keep existing error codes where they exist; new codes
  go in the contract docs.
- Frontend follow-up (marketplace lane, can be a separate PR): checkout offers "Pay now with KHQR" from the endpoint
  above instead of `ABA_OPTION`; the payment page (`checkout/aba/:orderId` → rename the route to
  `checkout/pay/:orderId` with a redirect) polls the CutLuy status endpoint. Copy and states per wireframe K8/K8b.

### 3. One payment-status contract for every client
- Order list and detail APIs (merchant inbox, buyer orders, POS) return the same two fields:
  `paymentMethod` (`COD` | `KHQR` | `CASH`) and `paymentStatus` (`pending` | `paid` | `failed` | `expired`).
  Map `completed` → `paid` at the API edge (or migrate data — your call, explain it). Merchant "Cash to collect"
  must exclude orders paid by KHQR.
- Status check endpoint and webhook must be idempotent: a second confirmation, or a late webhook for an order that
  was already expired/cancelled, never double-deducts stock or reopens the order. Log the late payment for support.

### 4. Time limit for unpaid KHQR orders
- An order whose KHQR payment stays `pending` past the limit is cancelled automatically, its stock released (if it
  was reserved/deducted — check when KHQR orders deduct stock), and the payment marked `expired`.
- Before cancelling, ask CutLuy once more; if CutLuy says paid, mark paid instead.
- The limit is an env setting (e.g. `KHQR_UNPAID_ORDER_TIMEOUT_MINUTES`). **The value is a product decision — do
  not pick one silently:** use a placeholder in `.env.example`, and add an Open item in `docs/notes.md` asking the
  product owner for the number.
- Reuse or extend `recoveryWorker.js`; make it safe to run on more than one instance. The buyer's order and the
  merchant's inbox must show the cancellation with a reason ("Not paid in time"). Add notification copy keys
  (EN + KM) if the order-cancelled notification needs a new reason.

### 5. No refunds: guard paid orders
- Merchant cancel of an order whose `paymentStatus` is `paid` and method `KHQR` is rejected by Commerce with a
  stable error code (propose one, e.g. `ORDER_PAID_CANCEL_UNAVAILABLE`, and add it to the contract docs). The
  dashboard hides the button (wireframe M4b); the backend rule is what actually protects buyers.

### 6. POS KHQR works end to end
- Fix the POS status poll to call an existing route (or add `GET /api/payment/payments/:paymentId/status` if that is
  cleaner) and confirm POS sales actually get a KHQR (`rawQR`) from CutLuy using the merchant's config.
- After 2 minutes without confirmation the POS must say so and offer "Check again" or "Take cash instead"
  (wireframe X3b). That is a POS frontend change; include it or hand it off with a note.

### 7. Docs
- Update `docs/checkout-migration-contract.md`, `docs/platform-architecture.md` (launch payment scope) and any other
  doc that still says COD only. Close/annotate related items in `docs/notes.md`. Do not edit DEC-026/027 bodies
  beyond the existing "Superseded" lines.

## Out of scope
Refunds. Per-Store payment settings. Card payments or Stripe. Store-wide Reports statistics (separate packet). UI
redesign beyond the screens named above.

## Rules
- Branch from `develop`; PRs into `develop`; never merge. Commit trailer and PR footer per `CLAUDE.md`/repo rules.
- Never fake a paid state; never trust the client for payment status; never log or return secrets.
- Every new buyer- or merchant-facing string in EN and KM message catalogs.
- Verify: `npm run verify:commerce` (and `verify:core` if touched), host-validator tests, the payments security
  tests (`ecommerce-server/test/security/*payment*`, `cutluyPaymentFoundation.test.js`), plus new tests for: KHQR
  marketplace order with/without config, idempotent webhook, late webhook after expiry, timeout cancel releasing
  stock, paid-order cancel rejected, POS KHQR status path.
- If CutLuy's API behaves differently from what the code assumes (status names, webhook signature), stop and write
  it in `docs/notes.md` (Open) instead of guessing.

## Report back
For each numbered item: what changed (files), tests run with results, anything left open and why.
