# 12 — Page Wireframes (exactly what each page shows)

How to read: each page has a **mobile 360px** frame and (when different) a **desktop 1280px** frame. Numbers ①②③ point to the
element list under the frame — that list is the source of truth for content, order and behavior. Copy text in quotes is the real EN
string (KM in message catalogs). `[Button]` = button, `(chip)` = chip, `▢` = image, `▸` = link/row arrow.
Visual style = 02 (Jade & Saffron). Behavior/states/edge cases = 04–08 + 10. If this file and 04–08 disagree, **this file wins on layout,
04–08 win on rules**. Sample data (names, prices, order numbers like `RM‑261027‑8K2M`) is illustrative — render the real order number format and real data from the API.

---

# PART A — MARKETPLACE (buyer, Angular)

## A1. Product page `/product/:id`

### Mobile 360
```
┌──────────────────────────────────────┐
│ ←  [🔍 Search Rentify Market   ]  🛒2 │ ① header (back replaces logo on PDP)
├──────────────────────────────────────┤
│                                      │
│              ▢ ▢ ▢                   │ ② gallery: swipe, 1:1, pinch zoom
│         (product photo 1/5)          │    dots ● ○ ○ ○ ○ + "1/5" chip top‑right
│                                 ♡  ⇪ │    ♡ wishlist, ⇪ share (top‑right overlay)
├──────────────────────────────────────┤
│ 🏪 Aura Botanicals ✔ Verified        │ ③ store line (tap → store page)
│ Organic Facial Serum 30ml            │ ④ product name (h1, max 3 lines)
│ ★ 4.7 (38 reviews)                   │ ⑤ rating + count (hidden if 0 reviews) [R1.x]
│                                      │
│ $18.00  ̶$̶2̶4̶.̶0̶0̶  −25%                │ ⑥ price (jade mono) + compare‑at + sale badge
│ ≈ ៛73,800                            │    KHR helper (muted)
│                                      │
│ Size                                 │ ⑦ variant picker (one block per option)
│ (30ml) (50ml) (̶1̶0̶0̶m̶l̶)                 │    selected = jade border; sold‑out = strike
│ Scent                                │
│ ● Lavender  ○ Rose  ○ Unscented      │    color/scent swatches with names
│                                      │
│ ● In stock · Only 3 left             │ ⑧ availability line (green/amber/red)
│                                      │
│ Quantity   [ − ] 1 [ + ]             │ ⑨ quantity stepper
├──────────────────────────────────────┤
│ 🚚 Delivery by Aura Botanicals       │ ⑩ delivery & payment box (bordered card)
│    $1.50 per order · Phnom Penh 1–2d │
│ 💵 Pay cash when it arrives          │
│ ↩ Report a problem within 7 days     │
│    if damaged, defective or wrong ▸  │
├──────────────────────────────────────┤
│ ┌─ Store card ─────────────────────┐ │ ⑪ store trust card
│ │ (logo) Aura Botanicals  ✔Verified│ │
│ │ Skincare · Phnom Penh            │ │
│ │ On Rentify since Sep 2026        │ │
│ │ ★ 4.8 (120)  · Replies in ~2h    │ │    (rating/reply time only when data exists)
│ │ [Visit store]   [Contact ▾]      │ │    Contact → Telegram / Call (public only)
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ Description                       ⌄  │ ⑫ accordions: Description (open by default)
│ Details                           ⌄  │    Details = attributes table
│ Store policies                    ⌄  │    Policies = store delivery + return text
│ Reviews (38)                      ⌄  │    Reviews summary + list [R1.x]
├──────────────────────────────────────┤
│ More from Aura Botanicals      See all│ ⑬ rail, 2.5 cards visible
│ ▢  ▢  ▢▸                              │
│ You may also like                     │ ⑭ similar (same category, other stores)
│ ▢  ▢  ▢▸                              │
├══════════════════════════════════════┤
│ $18.00        [   Add to cart    ]   │ ⑮ STICKY BUY BAR — appears when ⑨/main
└──────────────────────────────────────┘    button scrolls off; safe‑area padding
```
**Elements**
1. Header: back arrow, search field, cart with count. Bottom tab bar is **hidden** on PDP (buy bar replaces it).
2. Gallery: up to 10 images of the selected variant first; tap = full‑screen viewer; video slot [Later]. Alt text = name + variant + index.
3. Store line: logo 20px + name + ✔ only if seller approved.
4. Name: h1, 3 lines max then "…".
5. Rating: stars + number + count; tap scrolls to Reviews. Hidden when no reviews.
6. Price: `price-lg`; compare‑at only if higher; "−25%" saffron badge; KHR line from settings rate.
7. Variant picker: options from `ProductVariants`. Changing a value updates ②⑥⑧⑨ and URL `?variant=`. Disabled = impossible combo; strike = sold out (still selectable to see price).
8. Availability: "In stock" (green) · "Only N left" (amber, N ≤ 3) · "Out of stock" (red) · reason copy for non‑purchasable (e.g. "This store isn't taking orders right now").
9. Quantity: max = min(stock, 10). Hidden when out of stock.
10. Delivery box: store flat fee (or "Free delivery"), store's delivery text, COD line, return rule link to Policies.
11. Store card: from RX‑C03 projection; buttons Visit store / Contact (sheet: Telegram, Call). No private data.
12. Accordions: Description (sanitized rich text), Details (attribute rows), Store policies, Reviews.
13. More from this store (≤ 10). 14. Similar items (≤ 10, excludes this store's items already shown).
15. Sticky buy bar: price + primary button. When unavailable → `[Notify me]` (R1.x) or disabled `[Out of stock]`.
**Add to cart result:** toast "Added to cart ✓ · View cart" with thumbnail, cart badge +1. If product has variants and none selected → button text "Choose Size" and scrolls to ⑦.

### Desktop 1280
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Rentify Market  [☰ Categories] [🔍 Search products, stores…        ] Sell  EN|ខ្មែរ 👤 ♡ 🛒 │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Home › Beauty › Skincare › Organic Facial Serum                                 │ breadcrumb
│ ┌──────┬──────────────────────────────┐  ┌───────────────────────────────────┐  │
│ │ ▢    │                              │  │ 🏪 Aura Botanicals ✔               │  │
│ │ ▢    │        MAIN IMAGE            │  │ Organic Facial Serum 30ml (h1)     │  │
│ │ ▢    │        (hover zoom)          │  │ ★ 4.7 (38)                         │  │
│ │ ▢    │                              │  │ $18.00 ̶$̶2̶4̶ −25%  ≈ ៛73,800        │  │
│ │ ▢    │                              │  │ Size  (30ml)(50ml)(̶1̶0̶0̶)            │  │
│ └──────┴──────────────────────────────┘  │ Scent ● Lavender ○ Rose            │  │
│  thumbnails left (vertical)               │ ● In stock · Only 3 left           │  │
│                                           │ [−]1[+]  [   Add to cart   ]  ♡ ⇪  │  │
│                                           │ ┌ Delivery & payment box ────────┐ │  │
│                                           │ └────────────────────────────────┘ │  │
│                                           │ ┌ Store card ───────────────────┐  │  │
│                                           │ └────────────────────────────────┘ │  │
│                                           └──── sticky while scrolling ────────┘  │
│ [Description] [Details] [Store policies] [Reviews (38)]   ← tabs on desktop       │
│ ...tab content (max width 760)...                                                  │
│ More from Aura Botanicals  ▢ ▢ ▢ ▢ ▢   ‹ ›                                          │
│ You may also like          ▢ ▢ ▢ ▢ ▢   ‹ ›                                          │
└──────────────────────────────────────────────────────────────────────────────────┘
```
Grid: gallery 7/12, buy box 5/12 sticky (top 88px). Accordions become tabs ≥ 1024.

---

## A2. Home `/`
```
┌──────────────────────────────────────┐
│ Rentify Market            EN|ខ្មែរ 🛒 │ ① header
│ [🔍 Search products or stores     ]  │ ② big search (tap → search screen)
├──────────────────────────────────────┤
│ (👗)(💄)(📱)(🏺)(🍜)(🏠)(🧸) ▸        │ ③ category circles (scroll)
│ Fashion Beauty Phones Crafts Food…   │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │ ④ hero banner (static, swipe max 3)
│ │ Shop local. Pay cash on delivery.│ │
│ │ ✔ Verified sellers ✔ COD ✔ 7‑day │ │
│ │ [Browse categories]              │ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ ✔ Verified  💵 COD  ↩ 7‑day help  ខ្មែរ│ ⑤ trust strip (4 icons, scroll)
├──────────────────────────────────────┤
│ New arrivals                See all ▸│ ⑥ product rail (cards 2.3 visible)
│ ▢$12 ▢$25 ▢$8 ▸                      │
├──────────────────────────────────────┤
│ Popular stores              See all ▸│ ⑦ store cards (logo, name ✔, category,
│ ┌────────┐ ┌────────┐                │    3 product thumbs, "12 products")
│ │(logo)  │ │(logo)  │ ▸              │
│ └────────┘ └────────┘                │
├──────────────────────────────────────┤
│ Fashion                     See all ▸│ ⑧ top 3 categories × 2×2 grids
│ ▢ ▢ / ▢ ▢                            │
│ Beauty …   Crafts …                  │
├──────────────────────────────────────┤
│ Deals                       See all ▸│ ⑨ only if ≥ 4 discounted products
├──────────────────────────────────────┤
│ Recently viewed                      │ ⑩ only if any
├──────────────────────────────────────┤
│ ┌ Sell on Rentify ─────────────────┐ │ ⑪ merchant CTA band (jade bg)
│ │ Open your shop in 15 minutes     │ │
│ │ [Start selling]                  │ │
│ └──────────────────────────────────┘ │
│ footer                               │ ⑫
├══════════════════════════════════════┤
│ 🏠Home 🗂Categories 📦Orders ♡ 👤     │ ⑬ bottom tab bar
└──────────────────────────────────────┘
```
Desktop: category circles become a 10‑column row; rails show 5 cards with arrows; categories ⑧ as 3 columns side by side.

## A3. Search results / category `/search?q=` , `/categories/:slug`
```
┌──────────────────────────────────────┐
│ ← [🔍 serum                    ✕]   │ ① query field (editable)
├──────────────────────────────────────┤
│ 128 results                          │ ② count
│ [⚙ Filters (2)] [Sort: Relevance ▾]  │ ③ sticky toolbar
│ (In stock ✕)(Under $20 ✕) Clear all  │ ④ active filter chips
├──────────────────────────────────────┤
│ ┌───────┐ ┌───────┐                  │ ⑤ product grid 2 columns
│ │ ▢   ♡ │ │ ▢   ♡ │                  │   card: image, ♡, −20% badge,
│ │Aura ✔ │ │Mekong✔│                  │   store name ✔, name 2 lines,
│ │Serum… │ │Mask … │                  │   price + compare, ★4.7(38),
│ │$18 ̶$̶2̶4̶│ │$9.50  │                  │   "Only 2 left" / "Free delivery"
│ │★4.7   │ │Free 🚚│                  │
│ │[Add]  │ │       │  ← Add only for single‑SKU items
│ └───────┘ └───────┘                  │
│ … 24 items …                         │
│ Showing 24 of 128                    │ ⑥ progress text
│ [        Load more         ]         │ ⑦ load more
└──────────────────────────────────────┘
Filters sheet (bottom sheet, full height):
│ Filters                          ✕   │
│ Category ▸ (tree)                    │
│ Price  [$min]—[$max]  ●━━━━━●        │
│ ☑ In stock only                      │
│ ☐ On sale                            │
│ Province ▸                           │
│ Size: (S)(M)(L)  Color: ●●●          │ ← facets from category attributes
│ [Clear]            [Show 42 results] │ ← live count on button
```
Zero results frame: illustration · "No results for 'serrum'" · "Did you mean **serum**?" · [Clear filters] · Popular categories circles · Trending products rail.
Desktop: filters as left column 264px always visible; grid 4–5 columns.

## A4. Store page `/stores/:id`
```
┌──────────────────────────────────────┐
│ ←                          ⇪   🛒    │
│ ▢▢▢▢▢▢ cover image (optional) ▢▢▢▢▢ │ ① cover 16:6 (fallback: jade pattern)
│   (LOGO)                             │ ② logo overlapping cover
│ Aura Botanicals  ✔ Verified seller   │ ③ name + badge (tap badge → "What we checked")
│ Skincare · Phnom Penh · Since Sep 26 │ ④ meta
│ ★ 4.8 (120) · Replies in ~2h         │ ⑤ [R1.x]
│ [Contact ▾] [♡ Follow] [Visit website↗]│ ⑥ actions (Follow R1.x; website only if exists)
├──────────────────────────────────────┤
│ Products (24) | About & policies | Reviews │ ⑦ tabs
├──────────────────────────────────────┤
│ [🔍 Search in this store]            │ ⑧ (Products tab)
│ (All)(Serums)(Masks)(Cleansers)      │   categories from its products
│ grid 2 columns + Load more           │
└──────────────────────────────────────┘
About & policies tab: description · 🚚 Delivery: "$1.50 per order · Phnom Penh 1–2 days, provinces via J&T 2–3 days" ·
💵 "Cash on delivery" · ↩ Return policy text (+ "Rentify minimum: 7 days for damaged, defective or wrong items") · 🕘 Opening hours ·
📍 Location text + map link · Contact methods.
```

## A5. Cart `/cart`
```
┌──────────────────────────────────────┐
│ ←  Cart (5 items)                    │
├──────────────────────────────────────┤
│ ⓘ Each store delivers separately, so │ ① explainer (dismissible)
│   you'll check out one store at a    │
│   time. Other items stay in the cart.│
├──────────────────────────────────────┤
│ ┌ 🏪 Aura Botanicals ✔ ────────────┐ │ ② STORE GROUP CARD
│ │ ▢ Organic Serum · 30ml, Lavender │ │ ③ line: image, name, variant
│ │   $18.00       [−] 1 [+]   🗑     │ │    price, stepper, remove
│ │ ⚠ Price changed $20 → $18        │ │ ④ inline warning (from quote)
│ │ ▢ Clay Mask                      │ │
│ │   $12.00       [−] 2 [+]   🗑     │ │
│ │ ───────────────────────────────  │ │
│ │ Subtotal                 $42.00  │ │ ⑤ group summary
│ │ Delivery                  $1.50  │ │
│ │ Pay on delivery          $43.50  │ │
│ │ [ Checkout this store · $43.50 ] │ │ ⑥ primary
│ └──────────────────────────────────┘ │
│ ┌ 🏪 Mekong Crafts ✔ ──────────────┐ │
│ │ ▢ Silk Scarf (̶o̶u̶t̶ ̶o̶f̶ ̶s̶t̶o̶c̶k̶)       │ │ ⑦ unavailable line greyed:
│ │   ✖ Out of stock   [Remove]      │ │   excluded from total, must remove
│ │ ▢ Krama Blue        [−]1[+]  🗑  │ │
│ │ Subtotal $9 · Delivery Free      │ │
│ │ Pay on delivery           $9.00  │ │
│ │ [ Checkout this store · $9.00 ]  │ │   disabled until ✖ removed, with hint
│ └──────────────────────────────────┘ │
│ Saved for later (2) ▸                │ ⑧
└──────────────────────────────────────┘
```
Desktop: store groups in left column (8/12); right column shows "How COD works" card + help link.

## A6. Checkout `/checkout?store=…`
```
┌──────────────────────────────────────┐
│ Rentify  🔒 Secure checkout   Help ▸ │ ① minimal header
├──────────────────────────────────────┤
│ Aura Botanicals · 3 items  $43.50 ⌄  │ ② collapsible order summary
├──────────────────────────────────────┤
│ 1 Sign in                       ✔    │ ③ shown only if signed out:
│   [📱 Continue with phone]           │    phone → OTP inline (6 boxes)
│   [✈ Continue with Telegram]         │
│   Use email instead ▸                │
├──────────────────────────────────────┤
│ 2 Contact                            │ ④
│   Full name  [Sokha Chan         ]   │
│   Phone      [+855│012 345 678   ] ✔ │    verified tick
├──────────────────────────────────────┤
│ 3 Delivery address                   │ ⑤ saved cards (radio) or new
│   ◉ Home — St 271, Toul Kork…  Edit  │
│   ○ + Add new address                │
│   (new: Province▾ Khan▾ Sangkat▾     │
│    House/Street [   ] Landmark [   ] │
│    ☑ Save to my addresses)           │
├──────────────────────────────────────┤
│ 4 Payment                            │ ⑥ single card, selected
│   ◉ 💵 Cash on delivery              │
│     Pay Aura Botanicals $43.50 in    │
│     cash when your order arrives.    │
├──────────────────────────────────────┤
│ 5 Review                             │ ⑦
│   Subtotal $42.00 · Delivery $1.50   │
│   Total to pay on delivery  $43.50   │
│   Return policy: 7 days if damaged…▸ │
│   Note to store (optional) [      ]  │
│   ☐ I understand I pay cash when my  │ ⑧ required COD acknowledgement
│     order arrives.                   │
├══════════════════════════════════════┤
│ [  Place order · $43.50  ]           │ ⑨ sticky; loading "Placing order…"
└──────────────────────────────────────┘
```
Quote changed dialog: title "Your total changed" · table old → new per line + fee · new total · [Place order at $45.00] [Back to cart].

## A7. Order placed `/order-success?order=`
```
│            ✔ (jade circle)           │
│  Order RM‑261027‑8K2M placed!        │ number (mono, copy)
│  Aura Botanicals will contact you.   │
│ ┌ What happens next ───────────────┐ │
│ │ 1 Store confirms your order      │ │
│ │ 2 Store delivers to Toul Kork    │ │
│ │ 3 You pay $43.50 in cash         │ │
│ └──────────────────────────────────┘ │
│ [Track order]                        │
│ [Get updates on Telegram ✈]          │ (only if not linked)
│ You still have 1 store in your cart  │
│ [Checkout Mekong Crafts ▸]           │
│ [Continue shopping]                  │
```

## A8. Order detail `/orders/:id`
```
│ ← Order RM‑261027‑8K2M         ⧉     │
│ Aura Botanicals ✔ · 27 Oct, 14:05    │
│ (Waiting for delivery) (Pay on delivery $43.50) │ two separate badges
│ ┌ Timeline ────────────────────────┐ │ only real events are "done"
│ │ ● Order placed      27 Oct 14:05 │ │
│ │ ● Delivery attempt failed 28 Oct │ │  reason: "No answer"
│ │ ● Delivery rescheduled   28 Oct  │ │
│ │ ○ Delivered                      │ │  upcoming = hollow
│ │ ○ Paid in cash                   │ │
│ └──────────────────────────────────┘ │
│ Items (3)  ▢ ▢ ▢   snapshot prices   │
│ Deliver to: Home — St 271…           │
│ Store contact: [✈ Telegram] [📞 Call]│
│ [Cancel order]   (only before delivered) │
│ [Report a problem] (only 0–7 days after delivered) │
│ [Download receipt PDF]               │
```

## A9. Report a problem `/orders/:id/report` (3 steps)
```
Step 1/3  What's wrong?
  ☐ Organic Serum   ☐ Clay Mask (×2: [1▾])     ← choose items + qty
  ◉ Damaged on arrival ○ Defective ○ Wrong item ○ Missing item ○ Other
Step 2/3  Show us
  [+ Add photos or video] ▢ ▢   (1–6, required for damaged/defective/wrong)
  Describe the problem [                    ]
Step 3/3  What would you like?
  ◉ Return & refund  ○ Replacement  ○ Just tell the store
  [Send report]
After: case page → "Aura Botanicals must reply by Thu 30 Oct, 14:00" (CountdownChip) + status + messages (after RX‑C01)
```

---

# PART B — MERCHANT (React)

## B1. Merchant Home `/`
```
┌──────────────────────────────────────┐
│ (logo) Aura Botanicals ▾     🔔3  👤 │
├──────────────────────────────────────┤
│ ⚠ Trial ends in 3 days · Choose plan▸│ ① one banner max (+ "2 more")
├──────────────────────────────────────┤
│ Set up your store        4 of 7 done │ ② LAUNCH CHECKLIST (collapsible)
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░   │
│ ✔ Verify phone                        │
│ ✔ Store profile                       │
│ ! Verify email          [Verify ▸]   │   ! = needs fix
│ ○ Submit seller application [Start▸] │   expandable: why + button
│ ○ Connect Telegram      [Connect ▸]  │
├──────────────────────────────────────┤
│ Needs your attention                  │ ③ action tiles (2 columns)
│ ┌───────────┐ ┌───────────┐          │
│ │ 4 new     │ │ 2 to ship │          │
│ │ orders  ▸ │ │         ▸ │          │
│ ├───────────┤ ├───────────┤          │
│ │ 3 cash not│ │ 1 problem │          │
│ │ recorded ▸│ │ reply 20h▸│ (amber)  │
│ └───────────┘ └───────────┘          │
├──────────────────────────────────────┤
│ Today        vs yesterday             │ ④ KPIs
│ Orders 7 ↑2 · Sales $186 · COD due $64│
├──────────────────────────────────────┤
│ Sales channels                        │ ⑤
│ 🛍 Marketplace  ✔ Approved   ▸        │
│ 🌐 Website  aura.rentifystore.shop ▸  │
│ 🧾 POS  [Open register ▸]             │
├──────────────────────────────────────┤
│ Recent orders                See all ▸│ ⑥ rows with channel chip + next action
│ #8K2M (Marketplace) $43.50 [Mark delivered]│
├══════════════════════════════════════┤
│ 🏠Home 📦Orders(4) 🏷Products ⇪Share ☰More│
└──────────────────────────────────────┘
```

## B2. Orders inbox `/orders`
```
│ Orders                    [🔍]  [⇩CSV]│
│ (All)(Marketplace)(Website)(POS)(Invoice)│ ① channel chips
│ To confirm 4 | To ship 2 | Delivered–cash due 3 | Completed | Cancelled | Problems 1 │ ② tabs (scroll)
│ ┌──────────────────────────────────┐ │ ③ order card
│ │ #8K2M  (🛍 Marketplace)   12m ago │ │
│ │ Sokha C. · 012 *** 678           │ │
│ │ ▢ 3 items              $43.50    │ │
│ │ (Waiting for delivery)(Cash due) │ │
│ │ [Mark delivered]   ⋯             │ │   primary next action inline
│ └──────────────────────────────────┘ │
```
Desktop = table: checkbox · Order · Channel · Buyer · Items · Total · Fulfillment · Payment · Age · Action.

## B3. Order detail (merchant) `/orders/:id`
```
│ ← #RM‑261027‑8K2M  (🛍 Marketplace)  ⧉│
│ (Waiting for delivery) (Cash due $43.50)│
│ ┌ Buyer ───────────────────────────┐ │
│ │ Sokha Chan  012 345 678 [📞][✈]  │ │ full phone only with permission
│ │ St 271, Toul Kork, PP            │ │
│ │ Landmark: blue gate near café    │ │
│ │ Note: "Please call before"       │ │
│ └──────────────────────────────────┘ │
│ Items  ▢ Serum 30ml ×1  $18.00 …     │
│ Subtotal $42 · Delivery $1.50 · Total $43.50 │
│ Timeline (events with who/when)      │
│ Internal notes [+ Add note]          │
│ [🖨 Packing slip] [🧾 Invoice PDF]    │
├══════════════════════════════════════┤
│ [ Mark delivered ]  [Delivery failed]│ sticky next‑action bar (per 06 §5 table)
```
Record cash sheet: "Cash collected" [$43.50] · Collected on [today 16:20] · By [Me ▾] · (note required if ≠ total) · [Record cash].
Delivery failed sheet: reason ◉No answer ○Wrong address ○Refused ○Other · ◉ Retry delivery ○ Cancel & restock items · [Confirm] with summary "2 items go back to stock".

## B4. Products list `/products`
```
│ Products   18 of 25 (Free Pilot)  [+ Add]│ ① entitlement usage
│ [🔍 Search]  (All)(Active)(Draft)(Out of stock)(Hidden on marketplace)│
│ ┌──────────────────────────────────┐ │
│ │ ▢ Organic Serum      $18–$30     │ │
│ │   3 variants · Stock 12          │ │
│ │   🛍✔ 🌐✔ 🧾✔   (Active)         │ │ ② channel icons: ✔ visible, ⏳ pending, ✖ hidden
│ └──────────────────────────────────┘ │
│ │ ▢ Clay Mask   $12  Stock 0 (Out of stock) 🛍✖ │
```

## B5. Product editor `/products/:id` (long form + sticky section nav)
```
│ ← Organic Serum           [Save] ⋯   │ (⋯ = duplicate, archive, view on marketplace/website)
│ Basics · Media · Variants · Stock · Channels · SEO │ sticky section nav
│ ── Basics ──                          │
│ Name (English) [               ]      │
│ Name (ខ្មែរ)   [               ]      │
│ Category [Beauty › Skincare ▾]        │
│ Description [rich text            ]   │
│ ── Media ──  ▢ ▢ ▢ [+]  (drag or ↑↓)  │  "Products with 3+ photos sell better"
│ ── Options & variants ──              │
│ Size: 30ml, 50ml [+ value]            │
│ Scent: Lavender, Rose [+]             │
│ ┌ Variant ─── Price ─ Stock ─ SKU ─ On ┐│
│ │30ml/Lav  $18  5  OFS-30-L  ●       ││
│ │30ml/Rose $18  0  OFS-30-R  ●       ││
│ └─────────────────────────────────────┘│
│ ── Channels ──                        │
│ 🛍 Rentify Market  [●] Visible        │
│    ⓘ Why? ✔ Approved seller ✔ In stock│ visibility explainer
│ 🌐 Website         [●] Visible        │
│ 🧾 POS             [●]                │
```

## B6. Onboarding wizard (5–6 steps) — Step 1 frame
```
│ ● ○ ○ ○ ○          Step 1 of 5       │
│ How do you want to sell?             │
│ ┌──────────────────────────────────┐ │
│ │ 🛍 Sell on Rentify Market        │ │
│ │ List products in the marketplace.│ │
│ │ No website needed. Free pilot:   │ │
│ │ up to 25 products.               │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ 🌐 Get my own website too        │ │
│ │ yourname.rentifystore.shop +     │ │
│ │ marketplace. 14‑day free trial.  │ │
│ └──────────────────────────────────┘ │
│ You can add a website later.         │
│ [Continue]                           │
```
Step 2 Store (name, category, province, contact) · Step 3 Delivery & policies (fee, area, ETA, return text) · Step 4 Look (website path: template cards with "Best for…", color, font, live mobile preview) · Step 5 First product (camera‑first quick add) · Done screen.

## B7. Marketplace / seller application `/marketplace`
```
│ Rentify Market                        │
│ (Needs changes) Reviewed 27 Oct by Rentify │ status badge + date
│ ┌ What to fix ─────────────────────┐ │
│ │ ✔ Phone verified                 │ │
│ │ ✔ Email verified                 │ │
│ │ ✖ Identity document — "Photo is  │ │ reviewer note per item
│ │   blurry, please re‑upload" [Fix]│ │
│ │ ✔ Store name & category          │ │
│ │ ✔ Pickup location                │ │
│ │ ✔ Contact method                 │ │
│ │ ✔ 1+ product with price & stock  │ │
│ │ ✔ COD & refund responsibility    │ │
│ └──────────────────────────────────┘ │
│ [Resubmit for review]  (enabled when all ✔) │
│ [Preview my store page ↗]             │
│ Marketplace defaults: New products listed on marketplace [●] │
```

## B8. Share kit `/share`
```
│ Share your store                      │
│ Marketplace page  rentifymarket.com/stores/… [Copy][✈][f] │
│ Website           aura.rentifystore.shop     [Copy][✈][f] │
│ ┌ QR poster ───────────┐              │
│ │ (logo) Aura          │ [Download A5 PDF] │
│ │   ▓▓ QR ▓▓           │ [Download A4 PDF] │
│ │ Scan to shop · COD   │ Language: EN|ខ្មែរ │
│ └──────────────────────┘              │
│ Share a product: [Search product ▾] → link + image card │
```

---

# PART C — STOREFRONT, POS, ADMIN

## C1. Storefront product page (template‑styled)
Same element list as A1 ①–⑮ **except**: ③ store line removed (it's their own site) · ⑪ store card replaced by "Why shop with us" (template content) · ⑬ "You may also like" from this store only · header/footer are template brand · cart is a drawer · "Powered by Rentify" in footer.

## C2. POS register (tablet landscape)
```
┌────────────────────────────── dark header: Aura · Register 1 · Sokha (cashier) · ● Online ─┐
│ [🔍 Search or scan barcode            ] │ TICKET                         Clear │
│ (All)(Serums)(Masks)(Cleansers)         │ Organic Serum 30ml   [−]1[+] $18.00 │
│ ┌──────┐┌──────┐┌──────┐┌──────┐       │ Clay Mask            [−]2[+] $24.00 │
│ │ ▢    ││ ▢    ││ ▢    ││ ▢    │       │                                     │
│ │Serum ││Mask  ││Toner ││Soap  │       │ + Customer (phone)   + Note          │
│ │$18 5 ││$12 0 ││$9 12 ││$4 30 │       │ ─────────────────────────────────── │
│ └──────┘└─SOLD─┘└──────┘└──────┘       │ Subtotal                     $42.00 │
│  tiles 56px+, stock count, sold out    │ Discount                      $0.00 │
│                                        │ TOTAL                        $42.00 │
│                                        │ [        Charge $42.00         ]    │
└────────────────────────────────────────┴─────────────────────────────────────┘
Charge sheet: Cash → [Exact][$50][$100][custom] · Change: $8.00 (≈ ៛32,800) · [Complete sale]
```
Phone: tabs **Products | Ticket (2)** with the same content.

## C3. Admin — seller review `/admin/sellers/:storeId`
```
┌ Sellers › Aura Botanicals ────────────── Submitted 26 Oct · waiting 1d 4h (SLA) · Assigned: me ┐
│ EVIDENCE (left 7/12)                         │ CHECKLIST (right 5/12, sticky)                  │
│ Owner: Lina S. · phone ✔ · email ✔           │ 1 Phone verified        (Pass)(Change)(Fail)    │
│ Identity doc [view — watermarked, logged]    │ 2 Email verified        (Pass)(Change)(Fail)    │
│ Store: name, primary category, province      │ 3 Identity / business   ( )   note [        ]   │
│ Pickup location: text + map                  │ 4 Name & category       ( )                     │
│ Contact: Telegram @aura · 012…               │ 5 Pickup location       ( )                     │
│ Policies: delivery $1.50 · returns text      │ 6 Contact method        ( )                     │
│ Sample products ▢ ▢ ▢ (price/stock)          │ 7 Product + COD/refund  ( )                     │
│ Store page preview ↗                         │ Restricted category check ✔                     │
│ Flags: none (dup phone/ID check)             │ [Approve] [Needs changes] [Reject…]             │
└──────────────────────────────────────────────┴─────────────────────────────────────────────────┘
```
Approve disabled until all 7 = Pass (override needs reason + second admin).

---

## D. Global pieces (every page)
- **Skeletons** mirror these frames exactly (grey blocks where images/text go).
- **Empty states**: illustration + 1 sentence + 1 button (e.g., Orders empty: "No orders yet. Share your store to get your first one." [Share your store]).
- **Error state**: "We couldn't load this page." + [Try again] + small Ref id.
- **Blocked state**: lock icon + reason + action (e.g., "Editing is locked while your payment is due." [Pay now]).
- **Toasts** bottom on mobile (above tab bar), top‑right on desktop.
