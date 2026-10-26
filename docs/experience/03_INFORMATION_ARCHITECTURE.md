# 03 — Information Architecture

Principle: **keep current URLs unless a change is listed here** (avoids churn and broken links). Every renamed route gets a 301/redirect.

## 1. Apps & hosts

| App | Framework / path | Host (DEC / proposal) | Who |
|---|---|---|---|
| Marketplace | Angular `marketplace-frontend` | `rentifymarket.com` (DEC‑001) | Buyers, visitors, "Sell on Rentify" marketing |
| Hosted storefronts | React `rentify-frontend/apps/storefront` + templates 1–3 | `<sub>.rentifystore.shop` (DEC‑002); custom domains browse‑only (DEC‑003) | Store buyers |
| Auth | React `apps/core/auth` | central sign‑in host per `deployment-host-validation.md` | Everyone (merchant, staff, buyer via handoff — ADR 0002) |
| Merchant workspace | React `apps/core/merchant` | proposal: `business.rentifymarket.com` (record in notes if adopted) | Merchants, staff |
| POS | React `apps/core/pos` | proposal: `pos.rentifymarket.com` | Cashiers |
| Marketing (merchant acquisition) | React `apps/core/marketing` | proposal: `rentifymarket.com/sell` served by marketplace, or `business.` root | Prospective merchants |
| Admin | Angular `admin-frontend` | private host, IP/MFA protected | Rentify staff |

> Decision needed (record in `docs/notes.md`): whether merchant marketing lives in the Angular marketplace (`/sell/*`, already has `become-a-seller/*`) or the React marketing app. **Recommendation:** marketplace `/sell/*` for SEO + one brand; React marketing app becomes the onboarding wizard only.

## 2. Marketplace sitemap (target)

```
/                               Home
/search?q=&filters              Search results (today: /products?q=)
/categories                     All categories
/categories/:slug               Category listing
/product/:id                    Product detail (keep; add ?variant=)
/stores                         Store directory
/stores/:id                     Store page (tabs: Products · About & policies · Reviews)
/cart                           Store‑grouped cart
/checkout?store=:storeId        One‑page COD checkout for ONE store group (replaces checkout/shipping|delivery|review|payment)
/order-success?order=:number    Confirmation (refresh‑safe)
/orders                         My orders (merge /my-orders → /orders)
/orders/:id                     Order detail + timeline
/orders/:id/report              Report a problem / request return
/wishlist                       Saved products
/following            [R1.x]    Followed stores
/account                        Profile · addresses · security · notifications · language (today /profile, /account/change-password)
/login /signup /verify-code /forgot-password /reset-password
/help /help/:topic              Buying, delivery, COD, returns, safety, contact
/sell                           Sell on Rentify (today /become-a-seller)
/sell/pricing /sell/faq /sell/explore
/about /terms /privacy /contact
/**                             404 with search
```
**Removed/redirected:** `/seller/*` → merchant workspace (D4) · `/admin` → admin app · `/become-seller`, `/become-a-seller/*` → `/sell/*` ·
`/my-orders` → `/orders` · `/checkout/shipping|delivery|review` → `/checkout` · `/checkout/payment`, `/checkout/pay/:orderNumber`, PayWay page → **not routed in R1** (DEC‑026); keep code behind `feature.onlinePayments=false`.

### Marketplace navigation
- **Mobile header (56px):** logo · search field (tap → full‑screen search) · cart (badge = item count across stores).
- **Mobile bottom bar:** Home · Categories · Orders · Wishlist · Account (hidden in checkout and PDP buy bar).
- **Desktop header (64px):** logo · category menu button · big search · "Sell on Rentify" · language EN/ខ្មែរ · account · wishlist · cart.
- **Footer:** Shop (categories, stores) · Help (COD, delivery, returns, safety, contact) · Sell (sell, pricing, FAQ, merchant sign‑in) · About · legal · language · social.
- Checkout uses **minimal chrome** (logo, "Secure checkout", help link).

## 3. Storefront sitemap (each hosted store; templates share these routes)
```
/                     Home (template sections)
/shop                 All products (+ ?collection=, filters)
/collections/:slug    Merchant collections (not marketplace taxonomy)
/products/:slug       Product detail
/cart  /checkout      Store cart + COD checkout (hosted subdomain only)
/account /orders /orders/:id /orders/:id/report
/pages/:slug          About, Contact, Policies (generated from Store policies)
/search
```
Custom domain: browsing only; "Checkout" opens `<sub>.rentifystore.shop/checkout` with the cart transferred (DEC‑003).

## 4. Merchant workspace sitemap (target — job‑based, D3)

```
/                         Home (next actions, launch checklist, today's numbers)
/orders                   ONE inbox (chips: All · Marketplace · Website · POS · Invoice; tabs by state)
/orders/:id               Order detail (merge marketplace-orders/:id here)
/returns                  Returns & problems (cases with SLA)
/products                 ONE list (merge "Store catalog"); /products/new, /products/:id
/inventory     [R1.x]     Stock levels, ledger, adjustments
/customers                Buyers who ordered from this Store
/invoices                 Quotes & invoices (manual sales)
/discounts     [R1.x]
/reports                  Sales, products, channels, COD reconciliation (merge analytics)
/online-store             Website: status, template, customize, domain, pages (only if Website exists; else "Add a website")
/online-store/editor      Section builder (full screen)
/marketplace              Seller status, approval checklist, marketplace defaults, store page preview
/share                    Share kit (links, QR poster)
/settings                 Store profile · delivery & policies · notifications (Telegram) · staff & permissions · plan & billing · account & security · preferences
/help                     Help center + contact Rentify
/pos                      → opens POS app
```
Redirects: `catalog`→`products`, `marketplace-orders`→`orders?channel=marketplace`, `store-management`→`online-store`, `customization*`→`online-store/editor`,
`analytics`→`reports`, `usage/*`→`settings/billing`, `ops/*`→`reports/collections` (COD/invoice follow‑ups) — keep pages, move entry points.

### Merchant navigation
- **Desktop sidebar (240px):** Home · Orders (badge = needs action) · Products · Customers · Reports · *Sales channels:* Marketplace · Online store · POS · *More:* Invoices · Returns (badge) · Share kit · Settings · Help.
- **Mobile:** top bar (store switcher placeholder — one store in R1, logo, notifications bell) + bottom bar: Home · Orders · Products · Share · More.
- Staff see only items their permissions allow (no disabled clutter); hidden pages return a BlockedState if deep‑linked.

## 5. POS sitemap
`/` register · `/orders` today's sales & reprints · `/shift` open/close drawer (R1.x) · `/settings` printer, scanner, language.

## 6. Admin sitemap (Angular)
```
/admin/dashboard        Overview + queues
/admin/sellers          Seller applications queue → /admin/sellers/:storeId review
/admin/stores           All stores → /admin/stores/:storeId (profile, status, subscription, products, orders, cases, audit)
/admin/products         Moderation queue + search → product detail
/admin/complaints       Cases (reports, disputes, escalations) → case detail
/admin/orders  [new]    Read-only order lookup across stores (support)
/admin/buyers           Buyer accounts
/admin/reviews          Review moderation
/admin/categories       Marketplace taxonomy
/admin/templates        Storefront templates
/admin/subscriptions    Plans, subscriptions, plan payments (merge payments/plan-payments/transactions)
/admin/notifications    Broadcasts to merchants (R1.x)
/admin/activity-logs    Audit
/admin/security         MFA, sessions
/admin/settings         Platform settings, feature flags (read‑only list in R1)
```
`payouts` route: hide in R1 (no payouts — platform holds no funds, DEC‑010).

## 7. Cross‑app rules
- Language order: `?lang` → saved account preference → cookie → browser language (`km*` → Khmer, otherwise English). Switch always visible in header/footer. No IP‑based guessing.
- Every app shows the same help link location (WCAG 3.2.6).
- Deep links from Telegram/email always land on the exact object (order, case) and survive sign‑in redirects (validated return URL policy already in Core).
- Breadcrumbs on marketplace category/product and merchant detail pages.
