# Work packet — UX redesign (merchant dashboard, buyer marketplace, POS)

Prompt for an agent (or three agents, one per lane). Self-contained; read it top to bottom before changing anything.

---

You are working in the Rentify monorepo (`C:\Users\User\rentify`). You are implementing an agreed UX redesign from
grayscale wireframes. Structure and wording are decided; your job is to build them faithfully in small, verified PRs.

## Read first (in this order)

1. `AGENTS.md`, `CLAUDE.md` (hard rules: tokens only, EN+KM, 360 px first, 44 px targets, WCAG 2.2 AA, every screen
   has skeleton · empty · error+retry · success · blocked states, stay in your lane).
2. `docs/audits/2026-10-31-merchant-dashboard-ux-audit.md` — the problems (P1–P16) this redesign fixes.
3. **The wireframe:** `docs/experience/wireframes/rentify-ux-redesign.html`. Open it in a browser (any static server,
   e.g. `python -m http.server` in that folder). Use the top bar to switch **Mobile / Desktop-Tablet** and **Notes**.
   - The **Overview** screen has the sitemap: every current route → its new screen, the change, and what needs
     backend. That table is your checklist; nothing in it may be dropped silently.
   - Every screen has numbered notes. **The notes are the acceptance criteria.**
4. `docs/decisions/release-1-register.md` — especially DEC-004 (flat delivery fee), DEC-008/009 (returns),
   DEC-012/013 (one Store per order), DEC-028 (automatic listing), DEC-029 (KHQR via CutLuy or COD; no refunds).
5. `docs/experience/00_README.md`, `02_BRAND_AND_DESIGN_SYSTEM.md`, and the file for your surface
   (04 marketplace · 06 merchant · 07 POS · 09 states/copy · 10 edge cases · 11 task packets/lanes).

## How to read the wireframe

- It is **grayscale on purpose**. Build the structure, hierarchy, labels and flows; take colours, type, radius and
  components from `packages/design-tokens` v1 and the existing component kits (`rentify-frontend/libs/shared/src/ui`,
  the Angular kit for the marketplace). Do not copy the wireframe's gray boxes, and do not invent new colours — a
  separate visual-direction pass comes later.
- Gray bars (`ph()`) are placeholders for real data. Real names in the wireframe come from seed data
  (Mekong Brew, Emily Watson); in the product, everything comes from the API.
- Dashed **"Needs backend"** chips mark features whose API does not exist yet. In the product they are **never**
  built with fake data. For each one: if the contract exists (check — some may have landed), build it; if not,
  leave the feature out (or show the screen's *blocked* state with a reason where the wireframe shows the place in
  navigation), add/keep an Open item in `docs/notes.md`, and say so in the PR.
- Desktop is a layout of the same screens, not different screens: phone list rows become tables, the phone
  bottom bar becomes the sidebar.

## Rules for every PR

- **Rename labels, not URLs.** Every old route keeps working through a redirect (listed in the sitemap), with the
  right filter/tab pre-selected (e.g. `/marketplace-orders` → `/orders?channel=marketplace`). Add a test per redirect.
- Show only states backed by real events. Delivered ≠ paid; "Paid" only after Commerce confirms with CutLuy.
- Buyers and merchants never see raw backend messages; map error codes to EN+KM copy (`09_STATES_COPY_NOTIFICATIONS`).
- Every action has a text label (no icon-only buttons); one primary action per screen, at thumb height on phones.
- Stay in your lane's directories (`11_TASK_PACKETS.md`). Shared packages change only in RX-F packets — if you need a
  shared component change, stop and write it up instead.
- Branch from `develop`, one PR per numbered step below, PRs into `develop`, never merge. Commit trailer and PR
  footer per repo rules. Attach 360 px and 1280 px before/after screenshots and list which wireframe notes the PR
  satisfies.
- Verify: `npm run verify:tokens`, `verify:frontend` (merchant/POS), `verify:marketplace`, unit tests, Playwright for
  the touched journeys, axe 0 critical. Run the app (local Docker stack: merchant :4400, auth :4300, marketplace
  :4500, POS :4450, Core :3001, Commerce :4001) and check each screen at 360 px yourself. Seed accounts are in
  `rentify-server/scripts/seed.js`.
- No AI features.

## Dependencies on other packets (do not build their backends here)

- `docs/specs/cutluy-payments-work-packet.md` — payment method/status fields, marketplace KHQR, POS KHQR fix.
  UI steps that show payment state (MR2, MR4, KR3, XR2) wait for its item 3 contract, or ship COD-only labels first and
  add KHQR when the contract lands.
- `docs/specs/store-design-work-packet.md` — template switch and saved layout (MR5).

---

## Merchant lane (React, `rentify-frontend/apps/core/merchant`)

Key files: `src/routes/dashboardRoutes.jsx`, `src/config/dashboard-tabs.jsx`, `src/layouts/dashboard/*`
(`SiteHeader.jsx`, `AppSidebar.jsx`, `MobileBottomBar.tsx`, `DashboardBreadcrumb.jsx`, `PageHeader.tsx`),
`src/components/ChannelViewSwitcher.tsx`, `src/layouts/setting/*`.

**Step MR1 · Navigation shell** (screens M1, M26–M29; audit P5, P6, P11)
- Header, same on phone and desktop: ☰ (phone) · store name · search · notifications · account. Language moves to
  Settings and the account menu; "open store" moves to Share and the channel pages.
- Remove the global channel switcher; channels become chips inside Home, Orders and Reports.
- Menu groups exactly as the wireframe sidebar. Phone bottom bar unchanged (Home · Orders · Products · POS · Share).
- No breadcrumbs, page icons or subtitles on phones. Settings uses the dashboard shell (no "Back to dashboard" hero).
- Staff (cashier) sees a permission-trimmed menu (screen M29).

**Step MR2 · Orders — one inbox** (screens M3, M4, M4b, M5; P1, P10)
- Merge `/marketplace-orders` into `/orders`: channel chips (All · Marketplace · Online store · POS · Invoice), work
  tabs (To confirm · To deliver · Cash to collect · Done · Cancelled · Problems), search, labelled Export.
- One order detail for every channel with the "What happens next" steps, sticky main action, record-cash sheet.
  Paid-by-KHQR variant: no cash step, no cancel button (DEC-029, no refunds). KHQR orders never in Cash to collect.

**Step MR3 · Products — one list** (screens M8–M10; P2)
- One list; `/catalog` and `/products/manage` redirect; Categories becomes a tab; bulk actions inside the list;
  product form "quick add first" with More options.

**Step MR4 · Settings — one shell** (screens M21–M24; P4, P7, P8, P11)
- Settings list as in the wireframe. Payments page renamed and restructured (status first; CutLuy key; advanced
  webhook secret; "Used for your online store and your Rentify Market page").
- Plan & billing merges `/settings/billing` and `/usage/*` (redirect `/usage/*`). Plain words only — no "events",
  "Usage Dashboard", "DEC-003", "Payment Gateway Settings".

**Step MR5 · Online store + Store design** (screens M17, M18; P3) — after the store-design packet
- One Online store page (status, design, content, domain); "Delete store" moves to Settings › Store profile behind a
  confirmation. Store design is full screen; "Publish changes" saves template and layout.

**Step MR6 · Invoices** (screens M14, M15; P9) — list of saved invoices (`GET /api/invoice/websites/:websiteId/invoices`) + create.

**Step MR7 · Marketplace page and Share** (screens M16, M20) — listing status, products shown/hidden and why, store page link;
Share links as full 44 px buttons.

**Step MR8 · Home, Customers, Reports, Returns & problems, Help** (screens M1, M2, M6, M7, M11–M13, M25)
- Home: attention tiles, today, where you sell, recent orders — no channel switcher.
- Reports replaces Analytics (`/analytics` redirects). Store-wide statistics and the buyer-reports list are marked
  Needs backend — follow the rule above.

**Step MR9 · States everywhere** (screen M30) — apply the pattern to every page.

**Step MR10 · Remove dead code** (separate PR): `pages/customization/*`, `app/features/ops/*`,
`pages/overview/MarketplaceStoreOverview.jsx` (audit §2) — confirm unreferenced first.

---

## Marketplace lane (Angular, `marketplace-frontend/src/app`)

**Step KR1 · Navigation** (screens K1–K3, K13) — header search first; bottom bar Home · Categories · Orders · Saved · Account; Wishlist renamed
"Saved" (URL kept).
**Step KR2 · Product and store pages** (screens K4–K6) — no SKU shown to buyers; delivery fee and payment options next to the price;
store trust card (ratings only if real reviews exist).
**Step KR3 · Cart and one-page checkout** (screens K7, K8, K8b, K9; audit K2) — `/checkout/shipping`, `/payment`, `/review`,
`/delivery` collapse into one page (redirect the old routes); payment choice KHQR / COD per DEC-029; KHQR payment
page per wireframe K8b (after the payments packet replaces ABA PayWay); order-placed screen says exactly what happens
next.
**Step KR4 · My orders, order detail, report a problem** (screens K10–K12) — buyer status words; 3-step report.
**Step KR5 · Account, sign-in, help, Sell on Rentify** (screens K14–K17) — as wireframed; auth stays in the shared sign-in app.

---

## POS lane (React, `rentify-frontend/apps/core/pos`)

**Step XR1 · Phone layout** (screen X2) — product grid full width (2 columns), cart as a bottom bar opening the payment sheet; tablet
keeps a side cart (today the grid is squeezed to ~50 px on phones — audit X1).
**Step XR2 · Payment** (screens X3, X3b) — Cash tab with keypad and large change; KHQR tab with large QR and the 2-minute message
("Check again" / "Take cash instead"), after the payments packet fixes the status check.
**Step XR3 · Open shift, sale complete, held sales, returns, cash drawer, lock** (screens X1, X4–X8) — plain words ("Held sales", not "Tickets").

---

## Report back (per PR)

Wireframe screens and notes covered · redirects added · Needs-backend items left out and where they are recorded ·
tests and verify results · 360/1280 screenshots · anything that didn't match the wireframe and why.
