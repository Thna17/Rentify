# Phase 5 analytics metric definitions

**Catalog version:** `1.0.0`  
**Effective date:** 2026-10-29  
**Owner:** Platform operations  
**Status:** implemented definitions; rollout evidence remains subject to the Phase 5 completion report

The machine-readable event contract is
[`event-catalog.json`](event-catalog.json). Metric labels are bounded and must
not contain personal data, search text, addresses, credentials, or arbitrary
free-form values.

## Stable calculation rules

| Metric | Formula | Authoritative source |
| --- | --- | --- |
| Merchant activation rate | completed activations / started activations | Core User, Store, Website and seller state |
| Search zero-result rate | searches with `resultCount = 0` / searches performed | privacy-safe Commerce product telemetry |
| Search latency | p50/p95 `durationMs` for search events | privacy-safe Commerce product telemetry |
| Cart-to-checkout progression rate | checkout starts / item-added events | Commerce telemetry; deduplicated event IDs; an operational progression ratio, not a unique-person conversion rate |
| Checkout completion rate | completed checkouts / checkout starts | Commerce telemetry plus authoritative Orders |
| Fulfillment success rate | delivered Orders / Orders created in the window | Commerce Order state |
| COD GMV | gross value of non-cancelled COD Orders | Commerce Orders; grouped by currency |
| COD collected | cash explicitly recorded as collected | Commerce Payments; grouped by currency |
| Refund amount | sum of confirmed refunded amounts | Commerce Payments; grouped by currency |
| Cancellation amount | gross value of cancelled Orders | Commerce Orders; grouped by currency |
| Return requests | reports whose subject or category is a return | authoritative Commerce BuyerReport |
| Complaints | non-return buyer reports | authoritative Commerce BuyerReport |
| Core case-link rate | reports linked to Core / buyer reports created | Commerce BuyerReport linkage state |
| Support SLA attainment | resolved before deadline / cases resolved with a deadline | Core SupportCase |
| Overdue support cases | unresolved cases past their configured deadline | Core SupportCase |
| Moderation decisions | count by stable moderation action and reason code | Commerce ProductModerationHistory |
| Notification delivery rate | sent deliveries / terminal and sent deliveries | Core NotificationDelivery |
| Notification failures | retryable plus terminal failed deliveries | Core NotificationDelivery |
| Subscription lifecycle state | count by stable subscription status | Core Subscription; lifecycle authority is explicitly marked incomplete until P5-SUB-001 closes |
| Subscription revenue collected | completed Rentify plan payments | Core Payment; grouped by currency |
| Provider fees | authenticated fee facts only | null/undefined until a provider fee fact exists |
| Net recognized platform revenue | accepted recognized subscription revenue minus authenticated provider fees | undefined until both accounting inputs exist |

## Financial separation invariant

`COD GMV` and `COD collected` are merchant-commerce measures. They are never
Rentify revenue. Rentify revenue is reported only from authenticated Core
subscription payment facts. Refunds, cancellations, provider fees, and net
recognized platform revenue remain separate fields. An unavailable accounting
input is returned as `defined: false` with a `null` value, never as a fabricated
zero.

All money is returned as integer minor units with an ISO currency dimension.
Mixed currencies are never added together.
