# 11 — Renovation Task Packets

Format follows `docs/ai-implementation-plan.md` §2 (outcome · evidence · scope · out of scope · invariants · decisions · code areas ·
acceptance · tests · verification · rollout/rollback · docs). Compressed here; expand each into a full packet file under
`docs/experience/packets/RX-xxx.md` when you start it.

**Global invariants for every packet:** decision register DEC‑001…027 unchanged · no CutLuy / online checkout · tenant checks unchanged ·
no new authoritative record types without a contract packet · every string EN+KM · tokens only (no hex in components) · 5 states per screen ·
360px first · WCAG 2.2 AA.

**Every UI packet also reads `12_PAGE_WIREFRAMES.md`** for its pages (B01–B09 → Part A, M01–M09 → Part B, S01/P01/A02 → Part C).

**Global verification:** `npm run verify:tokens` · `npm run verify:frontend` · `npm run verify:marketplace` · `npm run verify:admin` ·
`npm run verify:core` / `verify:commerce` when backend touched · Playwright suites in `tests-playwright/` + `tools/e2e/` for listed cases.

## Order & lanes

```
Foundation:  F01 → F02 ┬→ (all React packets)
                 F01 → F03 ┴→ (all Angular packets)
                 F04 (any time after F01)
Contracts:   C01 C02 C03 C04 C05 (backend, need human approval of the contract PR first)
Buyer lane (Gemini, Angular + storefront + POS):  B01 → B02 → B03 → B04 → B05 → B06 → B07 → B08 → B09 ; S01 ; P01
Merchant lane (Codex, React merchant):           M01 → M02 → M03 → M04 → M05 → M06 → M08 → M09 → M11 ; M07 (after C01) ; M10 (after C04, R1.x)
Admin lane (Codex, Angular admin):               A01 → A02 → A04 → A05 → A06 ; A03 (after C01)
```
Lanes never edit each other's directories (phase‑4 boundary). Shared packages (`packages/*`) change only in F packets.

---

## Foundation

### RX‑F01 — Design tokens v1.0 "Jade & Saffron"
- **Outcome:** one brand across all apps; contrast proven.
- **Scope:** update `packages/design-tokens/tokens.json` values per 02 §2–4; add new tokens (`brand.primary-subtle`, `brand.accent*`, `surface.canvas`, `surface.inverse`, `border.input`, `status.neutral*`, `price.sale`); dark theme set; typography (Kantumruy Pro, JetBrains Mono, km line‑height rule); regenerate `index.css`, `index.js`, `index.d.ts`, `tailwind-preset.js`; add every new pair to `contrast-validator.js`; bump to 1.0.0; changelog.
- **Out:** component changes.
- **Accept:** `npm --prefix packages/design-tokens test` passes; all pairs in 02 pass AA; existing apps build unchanged (semantic names preserved).
- **Tests:** X‑002. **Docs:** update `docs/design-tokens.md` audit table.

### RX‑F02 — React component kit (`rentify-frontend/libs/shared/src/ui`)
- **Scope:** implement/upgrade components in 02 §6 (Button…ShareSheet) on tokens; Lucide icons; `ResponsiveDialog`; `Checklist`; `CountdownChip`; `PhoneField`; `AddressFields` with shared Cambodia location data (move `libs/checkout/src/data/locations.js` into a shared package incl. khan/sangkat); a dev gallery route.
- **Accept:** every component has states + unit + axe test; EN/KM fit at 360px; used by at least one screen.
- **Tests:** X‑001, X‑003, X‑005.

### RX‑F03 — Angular component kit (shared by marketplace + admin)
- **Scope:** create `packages/ui-angular` (standalone components, signals) mirroring F02 contracts; wire into both apps; replace `.ops-pill` and other hard‑coded colors in `admin-frontend/src/styles.css`.
- **Accept:** same as F02 for Angular; `verify:marketplace`, `verify:admin` pass.

### RX‑F04 — Status vocabulary, error mapping, i18n gate
- **Scope:** status label maps per 09 §1 (React + Angular), error‑code → copy maps per 09 §2, ensure domain error codes exist in `docs/openapi/*.yaml` (add via OpenAPI PR if missing — `OUT_OF_STOCK`, `QUOTE_CHANGED`, `STORE_UNAVAILABLE`, `ENTITLEMENT_LIMIT`), missing‑key CI gate covers merchant + admin too (P4‑UX‑002 covers marketplace/POS).
- **Accept:** no component prints backend `message` to buyers; all statuses render from the map.

---

## Contract packets (backend; approve contract PR before UI)

### RX‑C01 — Buyer report → support case model (GJ4)
Today: order events `return_requested` / `complaint` with reason + evidence. Target: case record linked to order with status (`open`, `return_approved`, `declined`, `item_received`, `refund_recorded`, `resolved`, `escalated`, `closed`), messages, SLA deadline (48 business hours, Phnom Penh calendar), escalation, merchant decisions, buyer refund confirmation, admin decisions/strikes. Owner: Commerce (case) + Core (strikes/suspension). Include OpenAPI, authz matrix rows, migrations, tests. **Blocks:** B08 (beyond submit), M07, A03.

### RX‑C02 — Marketplace "out for delivery" step (Open → decide)
Proposal: add `dispatched` action/`deliveryStatus` (`pending → dispatched → delivered|failed`), optional courier note; buyer notification. Needs product approval (record in notes). If rejected, UI keeps current steps.

### RX‑C03 — Public store trust projection
Endpoint returning store public card: name, logo, cover, verified (approval approved), primary category, province, member since, public contact (Telegram/phone chosen by merchant), delivery fee + policy text, return policy, opening hours, website URL if active. No owner email/phone. Used by B04/B05/S01.

### RX‑C04 — Storefront sections model (R1.x)
Core: draft vs published content, section list per page with type + order + visibility, allowlist per template, publish endpoint (clears cache), version for conflicts. Backwards compatible with current `storefront-content` fields.

### RX‑C05 — Store discount codes (R1.x)
Commerce: store‑scoped codes applied inside one‑store order quote; snapshot on order; refunds prorate.

---

## Buyer lane

| ID | Title | Read | Code areas | Accept (cases) |
|---|---|---|---|---|
| RX‑B01 | Marketplace shell, nav & route consolidation | 03 §2 | `marketplace-frontend/src/app/app.routes*`, layout | Redirects in 03 work; bottom bar; minimal checkout chrome; PayWay/online routes not reachable (M‑082) |
| RX‑B02 | Data‑driven home | 04 S1 | `pages/home.component.ts` | No hard‑coded sections (D5); M‑001…M‑006 |
| RX‑B03 | Search & listing | 04 S2 | `products`, `categories`, `category-detail`, `core/catalog` | Filters/sort/URL state, zero results; M‑010…M‑019 |
| RX‑B04 | Product page + variant picker + trust card | 04 S3 | `product-detail`, new `variant-picker`, `seo.service` | Eligibility reasons, no live Add when unavailable, JSON‑LD; M‑020…M‑034 (needs C03 for full trust card; fallback: name+verified only) |
| RX‑B05 | Store page & directory | 04 S4–S5 | `stores`, `store-detail` | M‑040…M‑044 |
| RX‑B06 | Store‑grouped cart | 04 S6 | `cart.component` | M‑050…M‑062 |
| RX‑B07 | One‑page COD checkout + inline sign‑in + confirmation | 04 S7–S8 | `checkout*`, `order-success` | Replaces multi‑step pages; M‑070…M‑089 |
| RX‑B08 | Orders, timeline, report a problem | 04 S10–S11 | `order-detail`, orders list | Timeline from events only; report submit + status (full case after C01); M‑090…M‑099 |
| RX‑B09 | Account, auth, Sell pages, help, system pages | 04 S12–S16 | auth pages, `become-a-seller` → `/sell`, `info` | Seller pages hand off to merchant app; S16 states |
| RX‑S01 | Storefront shared journey & template quality bar | 07 A | `apps/storefront`, `libs/*`, templates 1–3 | Locked checkout theme, states table, theme contrast auto‑adjust; S‑001…S‑007 |
| RX‑P01 | POS redesign | 07 B | `apps/core/pos` | 56px targets, tablet/phone layouts, race + offline UI; P‑001…P‑018, P‑020 |

## Merchant lane

| ID | Title | Read | Code areas | Accept |
|---|---|---|---|---|
| RX‑M01 | Workspace shell, job‑based nav, redirects, subscription banners & locks | 03 §4, 06 §13 | `layouts/dashboard/*`, `config/dashboard-tabs.jsx`, routes | Old routes redirect; nav by permission; W‑001, W‑048, W‑049 |
| RX‑M02 | Home: needs‑attention, today, channel status, launch checklist | 06 §1, 05 §3 | `pages/overview/*` | Counts link to filtered lists; O‑022 |
| RX‑M03 | Onboarding wizard (6 steps, resumable) | 05 §1–2 | `apps/core/auth`, `apps/core/marketing` hooks (`useDeployment`) | Sign‑up → product ≤ 15 min in usability test; O‑001…O‑018 |
| RX‑M04 | Marketplace page: seller application & status | 05 §4 | new `pages/marketplace` | Mirrors admin checklist; O‑019…O‑021 |
| RX‑M05 | One orders inbox + order detail next actions | 06 §2, §5 | `pages/order-management/*`, marketplace‑orders | Channel chips; actions map to contracts only; W‑030…W‑044 |
| RX‑M06 | Products: list, quick add, editor, variants, channels, visibility explainer | 06 §3 | `pages/product-management`, `product-form`, `libs/product-form` | W‑010…W‑021 |
| RX‑M07 | Returns & problems (after C01) | 06 §6 | new `pages/returns` | W‑045…W‑047 |
| RX‑M08 | Settings: profile, delivery & policies, notifications/Telegram, staff, plan & billing, security | 06 §12 | `pages/setting/*`, `app/features/usage` | W‑002, W‑003; plan states |
| RX‑M09 | Share kit (links, QR poster PDF, OG) | 06 §11 | new `pages/share` | QR scans to correct URL; poster EN/KM |
| RX‑M10 | Online store page + section builder (R1.x, after C04) | 05 §5–6 | `pages/customization`, `pages/store-management`, `libs/storefront/owner` | B‑001…B‑015 |
| RX‑M11 | Reports incl. COD reconciliation & collections | 06 §9 | `pages/overview` charts, `app/features/ops` | Numbers match Commerce; Phnom Penh time |

## Admin lane

| ID | Title | Read | Code areas | Accept |
|---|---|---|---|---|
| RX‑A01 | Admin shell on tokens, nav, global search, queue counters | 08 §1–2 | `admin-frontend/src/app` | Dark mode; no hard‑coded colors |
| RX‑A02 | Seller review screen with 7‑point checklist | 08 §3 | `pages/operations`, seller‑review endpoints | A‑001…A‑005 |
| RX‑A03 | Cases queue & detail (after C01) | 08 §5 | new pages | A‑009, A‑010 |
| RX‑A04 | Store detail & suspension flows (maker‑checker) | 08 §4 | operations stores | A‑006, A‑007, A‑008 |
| RX‑A05 | Product moderation & categories | 08 §6, §10 | operations products, categories | Reasons reach merchant (W‑016) |
| RX‑A06 | Billing merge (packages, subscriptions, plan payments) | 08 §12 | payments, plan‑payments, transactions | `payouts` hidden |

---

## Definition of done (every RX packet)
Scope met · listed edge cases have tests and pass · `verify:*` for touched projects green · Lighthouse mobile ≥ 90 for touched buyer pages ·
axe 0 critical · EN/KM complete · screenshots at 360/1280 attached to the PR · docs updated with Current/Target/Open labels · handoff written.

## Suggested calendar (2 AI lanes + 1 human reviewer)
Week 1: F01–F04, C03 contract · Week 2–3: B01–B07 ‖ M01–M05 · Week 4: B08–B09, S01, P01 ‖ M06, M08, M09, M11 ‖ A01, A02, A04 ·
Week 5: C01 → M07, A03, B08 full; A05, A06 · Week 6: closed‑beta fixes, usability sessions with 5 merchants + 5 buyers (blueprint §12.2) ·
R1.x: C04 → M10, C05, reviews, follow.
