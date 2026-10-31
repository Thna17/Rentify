# Merchant dashboard — UX map and audit (2026-10-31)

Phase 1 of the merchant UX redesign (ui-ux-design process). It maps every screen a merchant can reach,
says how complete each one is, and lists the problems the redesign must fix. Wireframes come after the
structure in section 6 is agreed.

## 1. Method and coverage

- **Code inventory:** every route in `apps/core/merchant/src/routes/dashboardRoutes.jsx`, every menu entry in
  `config/dashboard-tabs.jsx`, overlays (dialogs, drawers, sheets) and page files no route renders.
- **Walk-through:** headless Chromium at 375×812 on the local Docker stack, all 25 routes, as two seeded
  merchants: **Mekong Brew** (online store + marketplace) and **Cloth Store** (marketplace only). Screenshots and
  page text in the session scratchpad.
- **Read against** `docs/experience` 03 §4 (target merchant sitemap) and 06 (merchant workspace), and the
  decision register.
- **Not covered:** staff accounts (permission-trimmed menus), grace and suspended subscription states beyond the
  banner (Aura Botanicals is suspended locally), the POS app (separate app at :4450), the buyer marketplace and
  storefronts, and a desktop walk-through (desktop checked in earlier phases only).

## 2. Route inventory

Status: **Complete** works end to end · **Partial** works but missing parts a merchant needs · **Incomplete**
key actions disabled or missing · **Duplicate** same job as another screen · **Redirect** · **Dead** not reachable.

| Route | Screen | Status | Notes |
|---|---|---|---|
| `/overview` | Home | Complete | Setup guide, channel cards, money, attention, recent orders (phases B/C). |
| `/orders` | Orders (online store, POS, invoice) | Partial | Website orders only; for marketplace-only stores it renders Marketplace orders. Icon-only export/import, "Create order". |
| `/marketplace-orders` | Marketplace orders | Duplicate | Second inbox for the same job (COD orders from the marketplace), with its own detail rows and actions. |
| `/orders/:id` | Order detail | Complete | Website orders. Marketplace order detail lives inside `/marketplace-orders`. |
| `/products` | Products | Complete | Website stores: table (`ProductManagement`); marketplace-only: list (`StoreCatalogPage`). |
| `/catalog` | Products (catalog) | Duplicate | Same list as `/products`; hidden route. |
| `/products/manage` | Products (bulk) | Duplicate | Bulk price/status modals; same heading "Products". |
| `/products/create`, `/products/edit/:id` | Product form | Complete | Long form with "More options" (sale price, SKU, where it shows). |
| `/products/:id` | Product detail | Complete | |
| `/categories` | Categories | Complete | Website stores: own categories; marketplace-only: Rentify categories (read-only explainer). |
| `/customers` | Customers | Complete | List; empty until first order. |
| `/analytics` | Analytics | Partial | Repeats Home's money cards and top products; no channel, product or COD reports. |
| `/invoices` | Invoice generator | Incomplete | Opens straight into a create form. No list of saved invoices, though Commerce has `GET /api/invoice/websites/:websiteId/invoices`. |
| `/store-management` | Online store ("Storefront Customization") | Partial | Store info, theme, content, collections, delete store in one long page. Shows "Custom Domain (DEC-003)…" to merchants. |
| `/customization` | Store design (templates, page layout) | Incomplete | "Use this template" and "Save layout" disabled: Core contracts missing (`docs/notes.md`, open item). |
| `/share` | Share your store | Complete | Phase B. |
| `/help` | Support & help centre | Complete | Support cases (real), email/Telegram contact, FAQ. |
| `/settings/account` | Account | Complete | Profile, logo, marketplace colour. |
| `/settings/payments` | Payment gateway (CutLuy KHQR) | **Violates DEC-026/027** | Release 1 online checkout is COD only; CutLuy and online-payment UI must not be shown. |
| `/settings/delivery` | Delivery fee | Complete | Phase B. |
| `/settings/staff` | Staff & roles | Complete | |
| `/settings/security` | Security | Complete | |
| `/settings/billing` | Billing & plans | Duplicate | Plans and trial; the menu's "Billing" goes to `/usage` instead. |
| `/settings/preferences` | Preferences | Complete | Language, notification channels. |
| `/usage/dashboard`, `/usage/breakdown`, `/usage/billing` | Usage & billing | Duplicate | Own sub-navigation; "events", "Usage Dashboard". Same job as Settings › Billing. |
| `/settings`, `/support`, `/usage`, `/search`, `/customization/:id`, `/ops/*` (4) | — | Redirect | Keep as redirects. |
| `/__ui` | Component gallery | Dev only | |
| `pages/customization/*` (4 files) | Old customization | Dead | No route renders it. |
| `app/features/ops/*` (15 files) | Ops pages | Dead | All `/ops/*` routes redirect to `/usage`. |
| `pages/overview/MarketplaceStoreOverview.jsx` | Seller application | Dead | Superseded by automatic listing (DEC-028). |

**Overlays found:** product bulk create / price / status modals, invoice customer and item quick-add, order
detail drawer, staff invite dialog, template gallery, collections editor, delivery-fee sheet, POS intro sheet,
menu drawer (phones), notifications dropdown, language switcher, open-store menu, search box.

## 3. Navigation inventory (what a merchant has to understand)

1. **Header (phone):** ☰ · search · "open store" menu · POS · language · notifications — six controls.
2. **Channel switcher:** All channels · Marketplace · Online store. A global mode that changes the menu items
   and page content.
3. **Menu (drawer on phones, sidebar on desktop):** about 20 entries in Sell, Grow, Money, Settings; labels
   change with the channel mode.
4. **Bottom bar (phones):** Home · Orders · Products · POS · Share (phase C).
5. **Settings sub-navigation:** its own shell ("Back to dashboard", hero, 7 chips).
6. **Usage sub-navigation:** Dashboard · Breakdown · Invoices & Billing.
7. **Breadcrumbs** on many pages, including phones.

## 4. Problem register

| # | Problem | Evidence | Principle |
|---|---|---|---|
| P1 | Two order inboxes for one job; where an order lives depends on its channel. | `/orders` vs `/marketplace-orders`; marketplace-only stores see the second under the first's URL. | Consistency (Nielsen 4); spec D3 "one inbox" |
| P2 | Three product routes with the same heading. | `/products`, `/catalog`, `/products/manage` | Recognition, one place per job |
| P3 | Online store split across two pages with overlapping names; a "Delete store" button sits among theme settings. | `/store-management` "Storefront Customization", `/customization` "Store design" | Match the user's model (Nielsen 2); error prevention (5) |
| P4 | Billing in two places with different words. | Menu "Billing" → `/usage/*` ("events", "Usage Dashboard"); Settings › Billing → plans | Consistency; user's language |
| P5 | A global channel mode silently changes menu and pages. | Channel switcher row on every page | Visibility of state (1); Hick's law |
| P6 | Phone screens spend ~230 px of 812 on chrome before content. | Header (6 controls) + channel row + breadcrumb + page icon + subtitle (screenshots) | Content first; Fitts |
| P7 | Internal and technical words shown to merchants. | "Custom Domain (DEC-003)…", "Invoice Generator", "Payment Gateway Settings", "Usage events" | User's language (Nielsen 2) |
| P8 | Online-payment UI shown although Release 1 is COD only. | `/settings/payments` CutLuy KHQR | Product rule DEC-026/027 |
| P9 | Invoices: no way to find a past invoice. | `/invoices` is a create form only | Recognition; dead end |
| P10 | Icon-only actions and stacked full-width secondary buttons. | Orders export/import (screenshot) | Labels (WCAG 2.5.3, 1.1.1) |
| P11 | Settings use a different page shell from the rest. | "Back to dashboard", hero, chip row | Consistency (Mandel 3) |
| P12 | Analytics repeats Home and answers few questions. | `/analytics` = Home money + top products | Minimalist design (8) |
| P13 | Template switch and layout save are visibly disabled. | `/customization` | Honest, but incomplete (open Core contract) |
| P14 | Spec pages missing: one Returns & problems queue, Reports, Marketplace listing page, Notification settings (Telegram). | `docs/experience` 03 §4, 06 §6/§9 | Spec gap |
| P15 | Dead code kept in the app. | Section 2 | Maintainability |
| P16 | Khmer UI still shows English labels in the menu ("Customize store", "Staff & roles") and page bodies. | Earlier walk-through in Khmer | Language policy (EN+KM) |

## 5. Gaps against the target spec (`docs/experience` 03 §4, 06)

| Spec place | Today | Gap |
|---|---|---|
| `/orders` one inbox with channel chips and work-state tabs | Two inboxes | Merge (P1) |
| `/returns` returns & problems with deadlines | Inside marketplace order rows | New list screen |
| `/products` one list | Three routes | Merge (P2) |
| `/reports` | `/analytics` (thin) | Rebuild as Reports: sales, products, channels, COD to collect |
| `/marketplace` | Channel card on Home | Small page: listed or not, products shown/hidden on the marketplace and why, store page link |
| `/online-store` (+ editor) | Two pages | One page: status, design, content, domain; editor full screen |
| `/settings` one shell | Two shells, billing split | One Settings with Billing merged |
| `/invoices` quotes & invoices | Create form only | List + create |
| `/inventory`, `/discounts` | — | Release 1.x; not in this redesign |

## 6. Proposed structure (to confirm before wireframing)

Job-based, following `docs/experience` 03 §4, adjusted to what was decided since: automatic listing (DEC-028),
the ☰ drawer kept as the full menu and the phone bottom bar (phases B/C).

**Places (menu):**
- **Home**
- **Orders**: one inbox; channel chips (All · Marketplace · Online store · POS · Invoice); tabs by work
  state (To confirm · To deliver · Cash to collect · Done · Cancelled · Problems). `/marketplace-orders` →
  redirect.
- **Products**: one list; Categories as a tab inside Products. `/catalog`, `/products/manage` → redirect.
- **Customers**
- **Reports**: replaces Analytics.
- **Invoices**: list + create.
- **Sales channels:** Marketplace · Online store · POS (opens the app).
- **Share**
- **Settings**: Store profile · Delivery & returns · Staff · Plan & billing (merges `/usage`) · Notifications ·
  Account & security · Language.
- **Help**

**Tools (header, same on phone and desktop):** ☰ · store name · search · notifications · account.
Language moves into Settings and the account menu; "open store" moves to Share and the channel pages; POS is in
the bottom bar.

**Remove the global channel switcher (P5):** channels become filters inside Home, Orders and Reports.

**Phone bottom bar:** unchanged: Home · Orders · Products · POS · Share.

**Wireframe screens:** about 35 (all places above, their detail and form screens, empty/loading/error/blocked
states, overlays, staff view), mobile first with desktop for each.
