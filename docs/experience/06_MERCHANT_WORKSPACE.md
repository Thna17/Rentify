# 06 — Merchant Workspace (React `apps/core/merchant`)

Principles: show the **next action**, not raw data · one inbox for all channels · every risky action has a reason + summary confirm ·
works one‑handed on a 360px phone · staff see only what they're permitted · suspended/grace states degrade gracefully (DEC‑018/020).

---

## 1. Home `/`
Top → bottom:
1. **Account banners** (only when relevant, max 1 visible + "n more"): trial ends in X days · payment due (grace, DEC‑017/018) · suspended (read‑only) · seller application needs changes · Telegram not connected.
2. **Launch checklist** (05 §3) until complete.
3. **Needs your attention** (counts → filtered lists): New orders to confirm · Orders to ship · Delivered but cash not recorded · Problems awaiting your reply (with nearest deadline) · Low stock (≤ reorder point) · Products hidden from marketplace (with reasons).
4. **Today** cards: Orders · Sales (paid) · COD to collect (delivered/out for delivery, unpaid) · Store views (usage events). Compare to yesterday. Tap → reports.
5. **Channel status:** Marketplace (Approved / Pending / Hidden reasons) · Online store (Published, URL) · POS (Open register).
6. **Recent orders** (5, with channel chip + status + next action button).
7. **Top products this week**.
Empty (new store): checklist + "Share your store" + "Add products".

## 2. Orders `/orders` — one inbox (D3)
**Filters:** channel chips **All · Marketplace · Website · POS · Invoice**; tabs by **work state**: *To confirm* · *To ship* · *Out for delivery* · *Delivered – cash due* · *Completed* · *Cancelled* · *Problems*; search (order number, buyer name/phone); date range; payment status.
**Row (mobile card / desktop table):** order number · channel chip · buyer name + masked phone (`012 *** 678`) · items count + first thumbnail · total · status badges (fulfillment + payment, separate — "Delivered · Unpaid") · age ("2h ago") · **primary next action button** inline.
Bulk (desktop): print packing slips, mark shipped (with courier note), export CSV.
Realtime: new order → toast + bell + sound option; list updates without reload (poll 30s or SSE if available).

## 3. Products `/products` (merges "Store catalog")
**List:** image · name · SKU/variants count · price (range) · stock (sum; red if 0, amber ≤ reorder point) · **channels** (icons: Marketplace ✓/⏳/✗, Website ✓/✗, POS ✓) · status (Draft / Active / Out of stock / Archived) · updated.
Filters: status, channel visibility, category, stock state. Search. Bulk: publish, archive, channel on/off, price adjust % [R1.x], CSV export/import [R1.x].
**Entitlement limit (DEC‑014/015):** header shows "18 of 25 products (Free Pilot)"; at limit, "Add product" opens upgrade sheet, never a silent error (versioned‑entitlements audit).

### 3.1 Quick add (default on mobile)
Photos · name · price · stock · category · description → Save as draft / Publish. Asks only the store‑type required extra fields (`quickAddFields` from Commerce config: skincare skin types, fashion sizes, restaurant prep time).

### 3.2 Full editor `/products/:id` (tabs or long form with sticky section nav)
1. **Basics:** name EN (+KM), description (rich text, sanitized), category (marketplace taxonomy, searchable), store collections, tags.
2. **Media:** up to 10 images, reorder, crop, alt text, set per‑variant image. Warn < 3 images ("Products with 3+ photos sell better").
3. **Options & variants:** add options (Size, Color, …) → generated variant grid: SKU (auto/editable), barcode, price, compare‑at, stock, weight, active toggle. Bulk edit column. Max variants per product per contract.
4. **Pricing & stock:** if no variants — price, compare‑at, cost (private), stock, track stock toggle, reorder point.
5. **Channels:** Marketplace switch (default from store setting) · Website switch (if website) · POS switch. **Visibility explainer** (3.4).
6. **SEO** (website): slug, meta title/description, preview.
Save: optimistic concurrency → conflict screen "This product was changed by {staff} at 14:02. Review their changes / Keep mine / Reload".
Delete → **Archive** if any order history (blueprint 5.2); restore from Archived filter.

### 3.3 Product moderation state
If admin hides/flags a product: red banner on product with reason code copy + "Edit and request review" — product stays on website if moderation is marketplace‑only.

### 3.4 Visibility explainer (per product, per channel)
A small panel answering "Why is this (not) visible?" from the publication eligibility engine reason codes:
"Marketplace: ✗ Hidden — your seller application is pending" · "✗ Out of stock" · "✗ Turned off by you" · "✗ Hidden by Rentify: {reason}" · "✗ Store subscription suspended" · "✓ Visible".
Each reason has a fix link.

## 4. Inventory [R1.x] `/inventory`
Stock per SKU (on hand), low‑stock list, **ledger viewer** (immutable entries: sale, cancel, return, restock, adjustment — actor, channel, order link), adjust stock (reason required: restock, damaged, correction, lost), receive stock (bulk add). In R1 the adjust action lives in the product editor; this page is read‑mostly.

## 5. Order detail `/orders/:id`
**Header:** number (copy), channel chip, placed time, fulfillment badge + payment badge, **next‑action bar** (sticky bottom on mobile).
**Next actions by state** — map strictly to today's contracts; never invent states:
- Storefront/online orders: `/api/merchant/orders/:id/{confirm|process|complete|cancel}` (order `status`: pending → confirmed → processing → completed/fulfilled; cancelled).
- Marketplace COD orders: `/api/stores/:storeId/marketplace-orders/:id/actions/{delivered|delivery_failed|retry_delivery|collect_cod|confirm_refund}`
  (`deliveryStatus`: pending → delivered | failed → retrying → delivered; failed + cancel → order cancelled & stock restored; payment pending → paid → refunded).

| Buyer‑visible step | Storefront order: primary action | Marketplace order: primary action | Secondary |
|---|---|---|---|
| New | **Confirm order** (`confirm`) | *(no confirm step in contract)* → **Mark delivered** when done | Cancel (reason) · Call buyer · Print packing slip |
| Preparing / on the way | **Start processing** (`process`) | **[Open]** a `shipped/out_for_delivery` marketplace action does not exist — record in notes before adding; until then show "Preparing" from order age only | Record failed delivery |
| Delivery attempt failed | — | **Retry delivery** (`retry_delivery`) or **Cancel & restock** (`delivery_failed` with cancel) — reason required (no answer, wrong address, refused, other) | Contact buyer |
| Delivered, unpaid | **Complete** (`complete`) after cash | **Record cash** (`collect_cod`: amount prefilled = total, collected at, by whom; mismatch needs note) | — |
| Paid | completed | completed | Refund only via a case (`confirm_refund` with amount, method, reference) |
| Cancelled | — | — | Shows reason, actor, time, "stock restored ✓" |
**Body:** items (snapshot), buyer name + phone (full only to permitted staff, tap to call/Telegram), address + landmark + map link, buyer note, delivery fee, totals, **Timeline** (events with actor), internal notes (staff only), invoice/receipt PDF, linked case(s).
**Confirmations:** cancel & failed‑delivery dialogs summarise effects ("Stock for 2 items will be restored. Buyer will be notified.").
Edge: W‑030…W‑049.

## 6. Returns & problems `/returns`
Case list with **CountdownChip** (48 business hours, DEC‑009), status, order, reason, evidence thumbnails.
Case detail: buyer evidence (photos/video viewer), messages thread, actions: **Accept return** (with return instructions: drop‑off/pickup text) · **Offer replacement** · **Decline** (reason required; buyer may escalate) · after item received: **Inspect** (restock? yes/no — DEC: defective stock not auto‑restocked) → **Record refund** (amount ≤ paid, method cash/Bakong/other, reference, date, proof image optional) → buyer confirms receipt → Resolved.
Escalated cases show "Rentify is reviewing" + admin messages. Overdue cases show red banner on Home.

## 7. Customers `/customers`
Buyers who ordered from this Store only (privacy): name, masked phone, orders count, total spent, last order, channel(s). Detail: their orders with this store, notes. No export of phone numbers in R1 (privacy — DEC‑024) except for staff with permission [Open].

## 8. Invoices & quotes `/invoices`
Follows `docs/invoice-workflow-policy.md`: create quote → send (link/PDF/Telegram share) → convert to invoice → record payment → stock deducted via ledger. Status badges per policy. Reminder actions (existing ops reminders) surface here as "Follow up" buttons.

## 9. Reports `/reports`
Tabs: **Sales** (by day, channel split, top products, AOV) · **COD reconciliation** (delivered unpaid list with age, cash recorded by staff/day, totals to hand over) · **Products** (views → add‑to‑cart → orders where data exists) · **Collections** (invoice follow‑ups; old ops dashboard) · **Usage & plan** (store views, usage events). Date range, export CSV. All times Asia/Phnom_Penh.

## 10. Discounts [R1.x] `/discounts`
Store‑scoped codes: % or fixed, min subtotal, dates, usage limit, channel (website/marketplace/both). Applied inside that store's order only. Needs Commerce contract — record as Open before building.

## 11. Share kit `/share`
Store link (marketplace store page + website URL) with copy/Telegram/Facebook buttons · **QR poster** generator (A5/A4 PDF: logo, store name, QR, "Scan to shop · Cash on delivery") · product share links with OG image · Telegram channel post text template (EN/KM) for new products. Event `share_kit_use`.

## 12. Settings `/settings`
- **Store profile:** name, logo, cover, description EN/KM, primary category (change requests re‑review if approved? → record Open), contact, location, opening hours.
- **Delivery & policies:** flat delivery fee per order (marketplace‑delivery endpoint), free delivery toggle, area text, ETA text, return policy text, COD note. Changing fee shows "Applies to new orders; open carts will see the new fee at checkout."
- **Notifications:** connect Telegram (bot deeplink), choose events (new order, problem opened, deadline in 12h, low stock), email on/off.
- **Staff & permissions:** invite by phone/email (single‑use expiring invitation), roles/permissions checklist (products, orders, pos, invoices, payments config, analytics — non‑escalation: can't grant more than you have), resend/revoke invite, deactivate (immediate session revoke), multi‑store membership display.
- **Plan & billing:** current plan, trial/grace dates, entitlements usage bars (products, staff, websites), upgrade/downgrade (effects explained), plan payment history and invoices. Manual plan payment flow per DEC‑019 (instructions + upload proof / pay link when available).
- **Account & security:** password, sessions list + revoke, 2FA [R1.x for merchants], language, delete account (DEC‑025).
- **Payments config:** R1 shows "Cash on delivery is enabled. Online payments are coming later." — no KHQR/CutLuy setup UI until P9.

## 13. Subscription states (DEC‑016…020) — global behavior
| State | Banner | What's locked |
|---|---|---|
| Trial (≥ 4 days left) | subtle info "Trial · 9 days left · Choose plan" | nothing |
| Trial (≤ 3 days) | warning | nothing |
| Past due / grace (7 days) | warning, persistent: "Payment due · storefront stays online until {date} · edits locked" | product/template edits, new staff (DEC‑018 edits locked) — order handling stays open |
| Suspended | danger, persistent | read‑only: orders/invoices/reports viewable 90 days; storefront offline; marketplace listings hidden |
| Reactivated | success toast | unlocks |
Locked buttons show lock icon + tooltip/BlockedState "Locked while payment is due — Pay now".

## 14. Help & support `/help`
Searchable help (setup, COD, delivery, returns, approval, plans) + contact Rentify (case form with category, links to order/product) + system status. Same location in header on all pages.

## 15. Mobile specifics
Bottom bar: Home · Orders (badge) · Products · Share · More. Order detail next‑action bar sticky. Product quick add from camera. Pull to refresh lists. Phone call / Telegram buttons on buyer info. Works at 360px without horizontal scroll (tables become cards).
