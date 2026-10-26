# 09 — States, Copy & Notifications

One vocabulary across marketplace, storefronts, merchant, POS and admin (fixes D10). Implement as a shared map:
`packages/design-tokens` (tones) + a status‑label module per framework that reads i18n keys `status.<domain>.<value>`.

> Khmer strings are drafts written alongside English — a native Khmer reviewer must approve `km` catalogs before release (DEC‑022).

## 1. Status map (backend value → label → tone)

### Order (`Order.status`)
| Value | Buyer label EN / KM | Merchant label | Tone |
|---|---|---|---|
| `pending` | Order placed / បានដាក់ការបញ្ជាទិញ | New | warning |
| `confirmed` | Confirmed by store / ហាងបានបញ្ជាក់ | Confirmed | info |
| `processing` | Preparing / កំពុងរៀបចំ | Processing | info |
| `fulfilled` | Delivered / បានដឹកជញ្ជូន | Delivered | success |
| `completed` | Completed / បានបញ្ចប់ | Completed | success |
| `cancelled` | Cancelled / បានលុបចោល | Cancelled | neutral |
| `refunded` | Refunded / បានសងប្រាក់វិញ | Refunded | neutral |
| `preparing`, `ready_for_pickup`, `out_for_delivery` (café/restaurant niche) | Preparing / Ready for pickup / On the way | same | info |

### Delivery (`Order.deliveryStatus`, marketplace COD)
| `pending` Waiting for delivery · warning | `delivered` Delivered · success | `failed` Delivery attempt failed · danger | `retrying` Delivery rescheduled · info |

### Payment (`Payment.status`)
| `pending` Pay on delivery — $x (buyer) / Cash due (merchant) · warning | `paid` Paid in cash · success | `refunded` Refunded · neutral | `failed` Failed · danger |
Rule: **never show "Paid" because an order is delivered** (blueprint principle 6).

### Seller approval (`StoreAccess` approval)
`pending` In review · warning | `approved` Verified seller · success | `needs_changes` Needs changes · warning | `rejected` Not approved · danger | `suspended` Suspended · danger.

### Store operational (`StoreAccess` status) · Website (`WebsiteData.status`) · Subscription
active · suspended · closed | active · inactive · suspended · maintenance | trial · active · past_due · suspended (labels per 06 §13).

### Product (`Product.status`)
`draft` Draft · neutral | `active` Active · success | `out_of_stock` Out of stock · danger | `low_stock` Low stock · warning | `inactive` Hidden · neutral | `archived` Archived · neutral.

### Reviews (`ProductReview.status`) `published` · `hidden` · `flagged`. Invoices: use `invoiceLifecycleService.LEGAL_TRANSITIONS` names.

## 2. Error envelope → copy
API errors follow `docs/api-error-handling.md` (`{ error: { code, message, retryable } }`). UI never prints `message` raw for buyers;
it maps `code` to i18n `error.<code>`:

Generic codes from `docs/api-error-handling.md`, plus domain codes. Domain codes marked † are used by golden journeys
(`OUT_OF_STOCK` in GJ3) or proposed here — confirm each exists in the OpenAPI spec; if not, add it there first (packet RX‑F04),
never parse English messages.

| Code | EN copy | Action |
|---|---|---|
| `OUT_OF_STOCK` † | "This item was just bought by someone else." | Update cart |
| `QUOTE_CHANGED` † (price/fee differs from quoted total) | "Prices or delivery fee changed. Please review your new total." | Show diff, re‑confirm |
| `STORE_UNAVAILABLE` † (unapproved/suspended/paused) | "This store isn't taking orders right now." | Remove group |
| `VALIDATION_FAILED` / `UNPROCESSABLE_ENTITY` | field‑level messages | Focus first field |
| `BAD_REQUEST` | "Something in this request isn't right. Refresh and try again." | Refresh |
| `UNAUTHENTICATED` | "Please sign in to continue." | Inline sign‑in, keep state |
| `PERMISSION_DENIED` | "You don't have access to this." | Back / ask the store owner |
| `NOT_FOUND` | "We couldn't find that." | Search / home |
| `CONFLICT` | "Someone else changed this. Review the latest version." | Reload / compare |
| `ENTITLEMENT_LIMIT` † | "Your plan allows {n} products." | Upgrade |
| `RATE_LIMITED` | "Too many tries. Try again in {s} seconds." | Countdown |
| `SERVICE_UNAVAILABLE`, `BAD_GATEWAY`, `GATEWAY_TIMEOUT`, `INTERNAL_SERVER_ERROR` (retryable) | "Something went wrong on our side. Try again." | Retry with same idempotency key |
Unknown codes → generic copy + correlation ID shown small ("Ref: 7f3a…") for support.

## 3. Notification matrix

| Event | Buyer (Telegram if linked, else in‑app/email) | Merchant (Telegram + in‑app) | Admin |
|---|---|---|---|
| Order placed | ✓ "Order {no} placed with {store}. Pay ${total} cash on delivery." | ✓ "🛒 New order {no} · ${total} · {items}" [Open order] | — |
| Store confirmed (storefront) | ✓ | — | — |
| Delivery failed / rescheduled | ✓ with reason | — | — |
| Delivered | ✓ "Delivered. Problem? Report within 7 days." | ✓ reminder "Record cash for {no}" if unpaid after 24h | — |
| Cash recorded | ✓ receipt link | — | — |
| Order cancelled | ✓ reason | ✓ if buyer cancelled | — |
| Problem reported | ✓ "We sent your report to {store}. They reply by {deadline}." | ✓ "⚠️ Problem on {no}: {reason}. Reply by {deadline}" | — |
| Deadline in 12h / missed | — | ✓ / ✓ | ✓ escalation queue |
| Refund confirmed by merchant | ✓ "Confirm you received ${x}" | — | — |
| Seller application decision | — | ✓ approved / needs changes (items) / rejected | — |
| Subscription T‑7/T‑3/T‑0, grace, suspended | — | ✓ (+email) | finance queue |
| Product hidden by moderation | — | ✓ reason | — |
| Low stock | — | ✓ daily digest | — |

Telegram rules: messages come only from the official bot; buyer messages contain **URL buttons only** (Track, Report). Merchant
messages may have safe inline actions mirroring existing callback handling (e.g. "Open order"); state‑changing inline actions require
the Telegram user to be linked to a staff/owner with permission and are idempotent (event keys).

## 4. Microcopy essentials (EN / KM draft)

| Key | EN | KM |
|---|---|---|
| `cod.badge` | Cash on delivery | បង់ប្រាក់ពេលទទួលទំនិញ |
| `cod.prepare` | Please prepare {amount} in cash. | សូមរៀបចំប្រាក់សុទ្ធ {amount}។ |
| `cod.ack` | I understand I pay cash when my order arrives. | ខ្ញុំយល់ថាខ្ញុំបង់ប្រាក់សុទ្ធពេលទំនិញមកដល់។ |
| `cart.storeGroupsNote` | Each store delivers separately, so you'll check out one store at a time. | ហាងនីមួយៗដឹកជញ្ជូនដាច់ដោយឡែក ដូច្នេះអ្នកនឹងទូទាត់ម្តងមួយហាង។ |
| `cart.checkoutStore` | Checkout this store | ទូទាត់ហាងនេះ |
| `seller.verified` | Verified seller | អ្នកលក់ដែលបានផ្ទៀងផ្ទាត់ |
| `delivery.fee` | Delivery {amount} per order | ថ្លៃដឹកជញ្ជូន {amount} ក្នុងមួយការបញ្ជាទិញ |
| `delivery.free` | Free delivery | ដឹកជញ្ជូនឥតគិតថ្លៃ |
| `report.cta` | Report a problem | រាយការណ៍បញ្ហា |
| `report.deadline` | Store replies by {date} | ហាងនឹងឆ្លើយតបមុន {date} |
| `merchant.recordCash` | Record cash | កត់ត្រាប្រាក់សុទ្ធ |
| `merchant.launchChecklist` | Set up your store | រៀបចំហាងរបស់អ្នក |
| `merchant.sharekit` | Share your store | ចែករំលែកហាងរបស់អ្នក |
| `plan.graceBanner` | Payment due. Your store stays online until {date}; editing is locked. | ដល់ពេលបង់ប្រាក់។ ហាងនៅតែដំណើរការដល់ {date} ប៉ុន្តែការកែប្រែត្រូវបានចាក់សោ។ |
| `safety.neverPayOutside` | Rentify never asks you to transfer money outside your order. | Rentify មិនដែលស្នើឱ្យអ្នកផ្ទេរប្រាក់ក្រៅការបញ្ជាទិញទេ។ |

Writing rules: say what happened + what to do next · no blame · numbers exact · no "Oops" · confirmation dialogs list consequences ·
destructive buttons named by action ("Cancel order", not "OK").
