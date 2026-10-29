# 07 — Hosted Storefronts & POS

## A. Storefront buyer journey (React `apps/storefront` + templates 1–3)

Templates differ in look and home sections; **everything from cart onward is shared** (`libs/cart`, `libs/checkout`,
`libs/order-confirmation`, `libs/customer-order`) and uses the locked neutral checkout theme (02 §8).

### A1. Home (template‑specific sections)
Rule (already in notes for T2): sections stay hidden until the merchant fills them — no placeholder claims. Every template must have:
announcement bar (optional) · header (logo, nav, search, account, cart) · hero · featured products · collections · trust row (COD, delivery fee, returns) · about/visit · footer (policies, contact, socials, "Powered by Rentify", language).

### A2. Shop / collection / search
Grid with filters (collection, price, availability, variant options), sort (newest, price ↑↓), Load more. Zero results recovery as marketplace.

### A3. Product page
Same rules as marketplace PDP (variant picker, availability reason codes, no live Add when unavailable, delivery & COD box, share), styled by template. Template 3 (café): items with variants open item page; menu rows have quick add for single‑SKU.

### A4. Cart (single store) & checkout
- Cart drawer + `/cart`. Server quote on every open; same line warnings as marketplace.
- Checkout on **hosted subdomain only**; from a custom domain, "Checkout" navigates to `<sub>.rentifystore.shop/checkout` with cart handoff (DEC‑003) and a one‑line note "Secure checkout by Rentify".
- Sign‑in: central Rentify buyer identity via one‑time code handoff (ADR 0002) — inline step like marketplace; same COD acknowledgement, idempotency key, quote re‑check, error mapping.
- Confirmation + order pages + "Report a problem" are the same components as marketplace, themed.

### A5. Storefront states
| State | Buyer sees |
|---|---|
| Website draft (never published) | 404 "Store not found" (no leak) — owner sees preview banner |
| Published | normal |
| Grace period | normal (DEC‑018) |
| Suspended | "This store is temporarily offline" page with marketplace link if store still listed elsewhere (it won't be — DEC: listings hidden) → link to Rentify Market home |
| Product out of stock | Out of stock state, Notify me [R1.x] |
| Store paused by owner [R1.x] | "Not taking orders right now" banner; browsing allowed, checkout disabled |

### A6. Template quality bar (every template, every release)
360px layout without horizontal scroll · Lighthouse mobile ≥ 90 · AA contrast with merchant theme (auto‑adjust) · EN/KM toggle · SEO meta + JSON‑LD Product/Offer/LocalBusiness · OG image per product · skeletons · 404/500 themed.

---

## B. POS (React `apps/core/pos`)

### B1. Sign in & register
Staff sign‑in (staff auth, OTP) → choose register (one in R1) → optional **Open shift** with opening cash [R1.x].
Layout tablet landscape: left = product grid/search (categories as tabs, big tiles 56px), right = ticket. Phone: tabs Products | Ticket.

### B2. Selling
- Add by tap, search (name/SKU), or **barcode scan** (keyboard‑wedge scanner; camera scan on phone [R1.x]).
- Variant products open a variant sheet (POS variant selection exists — notes 2026‑09‑26).
- Ticket: lines with qty stepper, line discount (permission), remove; ticket note; attach customer by phone (optional).
- Live stock shown on tiles ("3 left"); 0 = disabled tile with "Sold out".
- **Charge:** method sheet — **Cash** (amount tendered quick buttons $5/$10/$20/$50/exact, change calc USD; KHR tendered helper with ៛100 rounding display) · other methods shown only if enabled by existing config and allowed by DEC‑026/027 (record in notes; CutLuy stays off).
- Complete → server POS order (row‑locked stock; immediate `delivered` + `paid`, shipping 0 — GJ3) → receipt screen: print (80mm), share link/Telegram, new sale.

### B3. Final‑unit race (GJ3)
If server returns `OUT_OF_STOCK` 409: modal "This item was just sold online. Remove it from the ticket?" → ticket updates; cash not taken yet.

### B4. Offline (GJ3 §3.5)
Banner "Offline — cash sales are saved on this device and will sync". Queue in IndexedDB, chronological sync, per‑sale sync status, `STOCK_OVERDRAFT_ALERT` shown to manager on Home + POS when a synced sale conflicts. Non‑cash methods disabled offline.

### B5. Orders & reprints `/orders`
Today's POS sales, search, reprint receipt, **refund/return at counter** (requires permission; records refund; restock choice), void within N minutes [Open].

### B6. Shift close [R1.x]
Expected cash vs counted (denominations USD + KHR), over/short with reason, Z‑report printable, appears in Reports.

### B7. POS edge cases → 10 (P‑001…P‑020).
