# Prompt — wire ABA PayWay into Rentify checkout

Paste everything below into a Claude Code session opened on
`/Users/seouldorito/Desktop/Project /Rentify`.

---

Work in `ecommerce-server` (Express + Sequelize + MySQL).

## Do not rebuild the gateway — it already exists

`modules/payments/aba/paywayGateway.js` is a complete, correct ABA PayWay
client, ported from the KhmerCraft project. Read it first. It exports:

- `isEnabled()`
- `generateTranId()` — 20 chars max, fresh per attempt, `RF` prefix
- `createTransaction({ tranId, amount, items, firstName, phone, returnParams, successUrl, cancelUrl, shipping })`
  → `{ qrImage, qrString, deeplink, expiresAt, ... }`
- `checkTransaction(tranId)` → `'PAID' | 'FAILED' | 'PENDING' | 'REFUNDED'`

Do not change its signing logic. The 24-field `HASH_FIELD_ORDER`, the
HMAC-SHA512/base64, the UTC `YYYYMMDDHHmmss` `req_time`, and the base64
encoding of `items` and the three URLs are all verified against ABA's
sandbox. Empty fields must keep their slot in the hash.

## The actual task

The gateway is inert. Its own header says:

> TEST-ONLY in Release 1: DEC-026 keeps buyer checkout COD-only, so this
> whole module is inert unless PAYWAY_ENABLED=true.

**Before writing any code, find DEC-026** (search `docs/`, `AGENTS.md`,
`OWNERSHIP.md`, `modules/payments/OWNERSHIP.md`) and report what it says.
If that decision still stands, stop and say so rather than enabling a
payment path a project decision deliberately closed. Do not silently
reverse it.

If it is cleared to proceed, wire buyer checkout to PayWay as a payment
method alongside COD:

1. Read `modules/payments/core/factory/PaymentFactory.js` and
   `core/strategies/*.js`. There is an existing `KHQRPaymentStrategy` —
   determine whether PayWay should be a new strategy or whether that one
   should delegate to `paywayGateway`. Do not duplicate a strategy.
2. Read `modules/checkout` and `modules/orders` to find where
   `paymentMethod` is chosen and where order state is written.
3. Persist the `tran_id` on the order so the callback can match it back.
   Mint a new one per attempt and overwrite, so an abandoned QR stops
   being what the order settles against.
4. Expose a status endpoint the payment page can poll while the QR is on
   screen, and a callback route for ABA's webhook (no auth on the
   callback — ABA sends no cookie).

## The one rule that must not be broken

**Payment status is never read from the webhook payload, and never from
the browser returning from the ABA app.** Both paths must call
`checkTransaction(tranId)` and write only what ABA reports. Treat the
webhook as "go check now", not as a receipt. Route both the webhook and
the polling endpoint through a single resolve function so they cannot
disagree. Always return 2xx to the webhook, even for an unknown tran_id,
or ABA retries forever.

Also: paying must not advance fulfilment state. A paid order stays in
whatever pending state a COD order would be in — payment and fulfilment
are separate tracks.

## Gotchas already paid for — do not rediscover these

- `check-transaction-2` returns lookup `status.code` **6** for about 1.5
  seconds after a transaction is created, because ABA does not know the
  tran_id yet. The payment page's first poll lands in that window. Treat
  it as PENDING, not an error.
- The outcome is in **`data.payment_status_code`**, not the top-level
  `status` object — that one only reports whether the lookup succeeded.
  `0=APPROVED 2=PENDING 3=DECLINED 4=REFUNDED 7=CANCELLED`
- An unrecognised response must hold at PENDING and log. Never default to
  "not paid, that's fine".
- `status.code` is the string `"00"` on success but a **number** on
  failure. Compare with `String()`.
- This merchant account is **USD only**. `currency=KHR` is rejected with
  code 12.
- The account is provisioned for KHQR, so `purchase` answers with JSON
  (`qrString`, `qrImage`, `abapay_deeplink`) — there is no hosted
  checkout page to redirect to.
- ABA cannot reach `localhost`, so the webhook never fires in local
  development. Polling is what makes local testing possible. Keep it.

## Known blocker — verify before you start

As of 2026-10-26 the configured sandbox credentials are dead. Every
request answers:

```
{"status":{"code":21,"message":"End of API lifetime.","version":"v3"}}
```

This was probed with `lifetime=30`, `lifetime=5`, lifetime omitted, and a
v2 endpoint path — identical rejection each time. It is not the payload
and not the code; the credentials or the sandbox merchant account have
expired. Confirm whether fresh credentials have been issued before
spending time debugging. If they have not, build against
`checkTransaction` stubbed and say clearly in your summary that no real
payment was exercised.

## Environment

```
PAYWAY_ENABLED=true
PAYWAY_MERCHANT_ID=...
PAYWAY_API_KEY=...
PAYWAY_BASE_URL=https://checkout-sandbox.payway.com.kh
PAYWAY_CALLBACK_URL=https://<public-host>/api/payments/aba-payway/callback
```

Keep the sandbox default. Pointing at live PayWay must stay an explicit
opt-in. Never commit the key; never print it in output.

## Definition of done

- DEC-026 checked and reported
- Existing tests still pass
- New tests: hash field order is stable, `checkTransaction` maps every
  status code, the webhook ignores a claimed status and calls ABA, an
  unknown tran_id still gets a 2xx
- A written summary stating plainly whether a real payment was exercised
  end to end or only stubbed
