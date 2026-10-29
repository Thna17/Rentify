# 04 — Marketplace (Buyer) Screens

Angular `marketplace-frontend`. Format per screen: **Purpose · Layout · Content · Interactions · States · Edge cases (→ 10) · Events**.
All money comes from server quotes (integer cents); the UI never computes totals itself except for display formatting.

---

## S1. Home `/`
**Purpose:** show it's alive, local and trustworthy; get the buyer into a category, search, or a store in one tap.

**Layout (360 → desktop)**
1. Header + search (search is the biggest element on mobile).
2. **Category strip** — 8–12 round icons (horizontal scroll mobile, grid desktop) from marketplace taxonomy, ordered by number of purchasable products. Only categories with ≥ 4 purchasable products show.
3. **Hero row** — 1 static banner (admin‑managed in R1.x; R1 = fixed "Shop local. Pay cash on delivery." + 3 trust bullets). Swipeable list of up to 3 banners allowed; **no autoplay**.
4. **Trust strip** — "Verified sellers · Cash on delivery · Report a problem within 7 days · Khmer support".
5. **New arrivals** rail (purchasable products, newest first).
6. **Popular stores** — store cards (logo, name, Verified badge, category, rating when available, 3 product thumbs) → `/stores/:id`.
7. **Shop by category** blocks — for top 3 categories: title + 8 products + "See all".
8. **Deals** rail — only products with `compareAtPrice > price` (data‑driven; hide if < 4). Replaces hard‑coded "Flash deals" (D5).
9. **Recently viewed** (local, only if exists). **From stores you follow** [R1.x].
10. "Sell on Rentify" band → `/sell`.
11. Footer.

**States:** skeleton per section; any section with too little data is hidden (never placeholders or fake items); full API failure → ErrorState with retry and categories from cache.
**Edge:** M‑001…M‑006. **Events:** `home_view`, `category_tile_click`, `rail_item_click{rail,pos}`, `store_card_click`.

---

## S2. Search & listing — `/search?q=`, `/categories/:slug`, `/products`
**Layout:** title + result count · mobile sticky bar `[Filters (n)] [Sort ▾]` + active filter chips · desktop left filter panel · grid 2/3/4/5 · **Load more** (24 per page, URL keeps `page`, back restores scroll).

**Filters:** Category (tree) · Price range · Store location (province) [when data exists] · Rating ≥ 4 [R1.x] · In stock only (default ON) · On sale · Verified sellers only (default ON in R1 = all public sellers are approved; hide filter until "unverified" exists) · attribute facets from variant options (Size, Color…) when category defines them.
**Sort:** Relevance (default) · Newest · Price ↑ · Price ↓ · Best rated [R1.x].

**Product card:** square image · store name (small, with verified tick) · product name (2 lines) · price + compare‑at + "−20%" · rating + count [R1.x] · stock hint "Only 2 left" when ≤ 3 · "Free delivery" chip if store fee = 0. Whole card is a link. Wishlist heart (always visible). **No Add‑to‑cart on cards for products with variants**; single‑SKU products get a compact "Add" button.

**Search behavior:** debounced suggestions (≥ 2 chars): products, categories, stores. Khmer + English names; search on product name, category, store name, SKU. Exact store name → store suggestion first.
**Zero results (D6):** "No results for 'xyz'" + spelling suggestion (if available) + clear filters + popular categories + trending products. Never blank.
**Edge:** M‑010…M‑019. **Events:** `search{q,count,latency_ms}`, `search_zero`, `filter_apply`, `sort_change`, `load_more`.

---

## S3. Product detail `/product/:id`
**Layout mobile:** gallery (swipe, pinch zoom, dots) → title block → variant picker → price block → delivery & policy block → store trust card → description/specs → reviews → more from this store → similar products. **Sticky bottom buy bar** (price + Add to cart) once the main button scrolls away.
**Layout desktop:** gallery left (7/12) · buy box right (5/12, sticky) · details below.

**Buy box (top → bottom)**
1. Store name link (verified tick) · product name (h1) · rating "4.7 (38)" [R1.x].
2. **Variant picker (D6):** option groups from `ProductVariants` (chips; color swatches with name). Unavailable combinations disabled with strike‑through; selecting a sold‑out variant still shows its price + "Out of stock". URL `?variant=<id>`. Price/stock/image update per variant.
3. **Price** `price-lg`; compare‑at struck + "−20%"; KHR helper line optional.
4. **Availability:** "In stock" / "Only 3 left" / "Out of stock" / reason‑coded unavailable (seller paused, store offline) — never a live Add button when not purchasable (uses Phase 3 eligibility reason codes).
5. Quantity stepper (max = min(available, per‑order cap 10)).
6. **Add to cart** (primary). After add: toast with thumbnail + "View cart" + mini line "Delivery from this store: $1.50".
7. **Delivery & payment box:** "Delivery by {store} · ${fee} per order · usually {store eta text}" · "Pay cash on delivery" · "Report a problem within 7 days of delivery if damaged, defective or wrong" (links to policy).
8. Wishlist · Share (Web Share / copy / Telegram / Facebook).

**Store trust card (D8):** logo · name · **Verified seller** badge (tooltip: what Rentify checked — phone, email, identity, pickup location; DEC‑007) · province/city · member since · rating + count [R1.x] · response time "Usually replies within X h" [R1.x when data exists] · buttons **Visit store** and **Contact** (opens store's public contact: Telegram/phone per store settings; marketplace never shows private owner data).

**Sections:** Description (rich text sanitized) · Details/specs (attributes) · Policies (store return/delivery text) · Reviews [R1.x] · More from this store · Similar items (same category).

**States:** skeleton matches layout; product not found/unpublished → "This product isn't available" + similar items (HTTP 404 meta); store suspended → product hidden (404).
**Edge:** M‑020…M‑034. **Events:** `pdp_view`, `variant_select`, `add_to_cart{store,product,variant,qty}`, `share`, `wishlist_add`, `store_contact_click`.

---

## S4. Store page `/stores/:id`
Header: cover image (optional) · logo · name · Verified badge · category · province · member since · rating [R1.x] · Follow [R1.x] · Share · Contact · "Visit website" (if storefront exists, opens hosted store).
Tabs: **Products** (search within store, categories from its products, sort, grid) · **About & policies** (description, delivery fee & areas text, COD note, return policy, opening hours, location text/map link) · **Reviews** [R1.x].
States: new store with < 4 products still shows; suspended store → "This store is currently unavailable" (no products).
Edge: M‑040…M‑044.

## S5. Store directory `/stores`
Search stores, filter by category and province, sort (newest, most products, rating [R1.x]). Cards as on home.

---

## S6. Cart `/cart` (store‑grouped, DEC‑012/013)
**Explain once at top:** "Each store delivers separately, so you'll check out one store at a time. Your other items stay in your cart."
**One card per store:** store header (logo, name, verified) · lines (image, name, variant, unit price, stepper, remove with Undo, save to wishlist) · **store summary:** subtotal, delivery fee (store flat fee or "Free"), **Total due on delivery** · button **Checkout this store (n items · $xx.xx)**.
**Line warnings (from server quote):** price changed (old → new), quantity reduced to available, out of stock (greyed, excluded, must remove), seller unavailable/suspended (group disabled with reason).
**Guest cart:** allowed (local/session), merges on sign‑in (existing `/api/marketplace/cart/merge`).
**Empty:** illustration + "Your cart is empty" + Continue shopping + recently viewed.
**Edge:** M‑050…M‑062. **Events:** `cart_view{stores,items}`, `cart_update`, `checkout_start{store}`.

---

## S7. Checkout `/checkout?store=:storeId` (one page, one store, COD only)
Minimal chrome. Mobile: collapsible summary on top. Desktop: form left, summary right.

**Step 0 — Sign in (if signed out), inline, not a page jump:** Phone + OTP (default) · Telegram login · Email. After sign‑in the page continues with typed data kept. (Guest checkout deferred — notes 2026‑09‑24.)
**① Contact:** full name, phone (prefilled from account; must be verified), optional second phone.
**② Delivery address:** saved address cards or new (`AddressFields`: province, district/khan, commune/sangkat, street/house, landmark/note for rider). "Save to my addresses".
   Store delivery area note shown if store limits areas (store policy text in R1; enforcement Later).
**③ Payment:** single selected card **Cash on delivery** — "Pay {store} in cash when your order arrives. Please prepare **$xx.xx**." (no other methods in R1; do not show disabled "coming soon" payment logos in checkout — they create doubt; keep them off).
**④ Review:** items, delivery fee, **Total to pay on delivery**, store return policy summary, checkbox **"I understand I pay cash on delivery"** (COD acknowledgement), optional note to store (300 chars).
**Place order** button with exact amount. Sends `Idempotency-Key` (`crypto.randomUUID()` generated when page loads; reused on retry) + the quoted total.

**Server responses → UI:**
- `QUOTE_CHANGED` (price or fee changed) → dialog showing old vs new lines and new total; "Place order at new total" re‑submits with new quote.
- `OUT_OF_STOCK` (409) → message naming the item(s), button "Update cart".
- `STORE_UNAVAILABLE` → store group can't be ordered now.
- network timeout → "Checking your order…" then GET by idempotency key; never ask user to click twice blindly.
**Success → `/order-success?order=`**.
**Edge:** M‑070…M‑089. **Events:** `checkout_view`, `signin_inline_success`, `address_saved`, `place_order{store,total,items}`, `place_order_error{code}`.

## S8. Order confirmation `/order-success?order=`
Refresh‑safe. ✓ "Order {number} placed with {store}". What happens next (3 steps: store confirms → delivers → you pay ${total} cash). Delivery address, store contact, items, total.
Buttons: **Track order** · **Continue shopping** · **Get updates on Telegram** (if not linked) · **Checkout your other stores (n)** if cart still has groups.

## S9. Reviews [R1.x]
Write review from delivered order lines only: stars, text (20–1000), up to 4 photos. Shows "Verified purchase". Seller can reply once publicly. Report review. Moderation in admin (08).

## S10. Orders `/orders`, `/orders/:id`
**List:** tabs All · Active · Delivered · Cancelled · Problems. Card: store, order number, date, thumbnails, total, status badge, next action (Track / Report a problem / Review [R1.x] / Buy again).
**Detail:** header (number copy, date, status) · **Timeline** rendered only from real `OrderEvent`s (today: placed → delivered | delivery_failed → retry_delivery → delivered → collect_cod "Paid in cash" → confirm_refund; cancellations with reason). Steps without an event are shown as upcoming, never as done. A "Preparing / out for delivery" step appears only once a contract event exists (Open — see 06 §5) · items (snapshot prices) · delivery address · payment "Cash on delivery — $xx.xx (unpaid/paid)" · store contact · actions:
- **Cancel order** while store hasn't shipped (reason select) — uses `cancel-by-customer`.
- **Report a problem** (S11) within 7 days after delivered.
- Download invoice/receipt PDF (store invoice, DEC‑013).
States: not your order → 404. Edge: M‑090…M‑099.

## S11. Report a problem `/orders/:id/report` (returns & complaints, DEC‑008/009/011)
Step 1 choose items + reason: Damaged on arrival · Defective · Wrong item · Missing item · Not delivered but marked delivered · Other complaint.
Step 2 evidence: photo/video required for damaged/defective/wrong (1–6 files; magic‑byte checked; progress; retry) + description.
Step 3 what you want: Return & refund · Replacement · Just let the store know.
> **Contract status:** today the backend records buyer reports as order events of type `return_requested` or `complaint`
> (`/api/marketplace/my-orders/:id/reports/:type`) with reason + evidence. The full case model below (messages, accept/decline,
> escalation, buyer refund confirmation) is **Target** per GJ4 — build packet RX‑C01 (contract first) before the UI beyond submit + status.

Submit → case page with **CountdownChip "Store must reply by {date time}"** (48 business hours), messages thread (buyer ↔ store), status (Open → Store accepted / Store declined → Return in progress → Refunded / Resolved / Escalated to Rentify). "Ask Rentify to help" button appears when deadline passes or store declines. Refund shows method + reference entered by store (Bakong/cash) + "Confirm I received it".
Out of window → disabled with date and "Contact the store" option.

## S12. Account `/account`
Profile (name, phone verified, email, language) · Addresses (max 10, default) · Security (password, sessions, sign out everywhere) · Notifications (Telegram link, email on/off) · Delete account (DEC‑025 flow: confirm, explain what's kept for orders).

## S13. Auth screens
Login: tabs Phone | Email, Telegram button. Signup: name, phone (OTP), optional email/password. OTP: 6 boxes, autofill/paste, resend timer. Forgot/reset: no enumeration. Return URL validated (Core policy).

## S14. Sell on Rentify `/sell`, `/sell/pricing`, `/sell/faq`
Hero: "Sell on Rentify Market — free while we're in pilot" (only if DEC‑015 pilot active) · 2 paths explained as outcomes: **Sell in the marketplace** / **Get my own website too** · how approval works (checklist) · pricing table from packages API (Free Pilot / Starter $15 / Business $35; trial 14 days) · merchant stories [Later] · FAQ (COD responsibility, delivery, refunds, fees: "no commission in Release 1") · CTA → onboarding wizard.

## S15. Help center `/help/*`
Topics: How COD works · Delivery fees · Returns & problems · Staying safe (never pay outside the order; Rentify never asks for transfers) · Account & sign‑in · Contact Rentify. Search FAQ.

## S16. System pages
404 with search + categories · 500 friendly retry · maintenance banner · offline banner · cookie/analytics consent (analytics only after consent).
