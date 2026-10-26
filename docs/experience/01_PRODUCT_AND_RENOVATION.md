# 01 — Product & Renovation Proposal

## 1. Positioning (say it the same way everywhere)

**Merchant promise:** *Add a product once. Sell on Rentify Marketplace, your own website and your counter — one stock count, one workspace, from your phone.*
**Buyer promise:** *Find trusted Cambodian shops, see the full price before you order, pay cash on delivery, always know what happens next.*

| We are like… | …for this part | …but different because |
|---|---|---|
| Shopify | Store builder, templates, merchant admin, POS | Free/cheap plans for SMEs, Khmer‑first, COD‑native, Telegram‑native, one‑tap marketplace listing |
| Amazon / Shopee | Marketplace discovery, store pages, reviews, order tracking | Local sellers only, verified by humans, seller‑direct delivery and refunds, no platform custody of money (R1) |
| Facebook/Telegram selling | Where merchants are today | Real catalog + stock + order tracking instead of chat screenshots — and share links back into those channels |

## 2. Diagnosis — why it "looks bad" today (evidence from `develop`)

| # | Problem | Evidence | Fix (file) |
|---|---|---|---|
| D1 | **Generic look.** Brand = default Tailwind indigo `#4f46e5` + slate; nothing feels Cambodian or premium. | `docs/design-tokens.md` audit table | New brand + tokens v1 (02) |
| D2 | **Two frameworks, two looks.** React merchant/storefront/POS vs Angular marketplace/admin share tokens only partially (`.ops-pill` hard‑coded colors in admin). | design‑tokens §6.3 roadmap | One component contract (02 §6) |
| D3 | **Merchant nav mirrors the code, not the job.** "Products" vs "Store Catalog", "Orders" vs "Marketplace" (COD orders), "Billing" vs "Usage", hidden "ops/*" pages. Merchants must know which channel an order came from to find it. | `merchant/src/config/dashboard-tabs.jsx`, routes `ops/*`, `usage/*`, `marketplace-orders` | One Orders inbox, one Products list, channel as a filter (06) |
| D4 | **Two seller centers.** Angular has `seller/dashboard`, `seller/orders`, `seller/onboarding`; React has the merchant app. | marketplace routes | Marketplace "Sell" pages become marketing + hand‑off to the one merchant app (03 §4) |
| D5 | **Marketplace home is hard‑coded.** Sections like "Flash deals" and "Smartphones" exist without backend concepts behind them. | `home.component.ts` lines ~102, ~180 | Data‑driven home (04 S1); no fake sections |
| D6 | **Gaps listed by the P4 audit:** no variant picker, out‑of‑stock still shows Add to Cart, blank zero‑results page, no SEO meta, no skeletons. | `docs/audits/phase-4-customer-journeys-map.md` §3.1 | 04 S3–S5 |
| D7 | **No guided activation.** Activation = first purchasable product + first order (blueprint), but there's no persistent launch checklist or seller‑review status UI telling merchants what's missing. | blueprint §5.1 | Launch checklist (05 §3) |
| D8 | **Trust is invisible to buyers.** Seller approval exists in Core but buyers don't see "Verified seller", response time, policies, or ratings in one place. | platform‑architecture approval checklist | Store trust card (04 S6) |
| D9 | **Storefront editing split** between dashboard customizer and on‑site owner toolbar, both field‑list editors with no sections model. | notes 2026‑09‑25 owner tools | One section‑based builder with live preview (05 §6) |
| D10 | **Status words differ per screen** (pending/processing/fulfilled/completed). | Order enum + walkthrough fixes | One status vocabulary EN/KM (09) |

## 3. Personas

| Persona | Context | Must be easy |
|---|---|---|
| **Srey Neang, 26, social seller** (clothes, Facebook + Telegram) | Phone only, Khmer UI, no website, COD with her own rider | Sign up with phone/Telegram, add products with phone camera, get approved, share links, see new orders on Telegram |
| **Vuthy, 34, shop owner** (cosmetics shop + Facebook page) | Counter + online, 2 staff | One stock across POS/website/marketplace, staff permissions, daily cash reconciliation |
| **Lina, 29, brand founder** (skincare) | Wants a beautiful branded website | Template, brand colors/fonts, sections, custom domain, marketplace reach |
| **Dara, 22, buyer** (Phnom Penh, mobile) | Shops on TikTok/Facebook; scared of scams | Trustworthy shops, exact total incl. delivery, COD, tracking, easy report |
| **Mrs. Kosal, 50, buyer** (province) | Khmer only, first time online | Big clear Khmer UI, phone sign‑in, clear "you pay cash when it arrives" |
| **Rentify ops (Sokun)** | Reviews sellers, handles complaints | Queue with checklist, evidence, SLA timers, audit trail |

## 4. Proposals (prioritized)

### 4.1 Must for Release 1 quality **[R1]**
1. **New brand & design system** (jade + saffron, Kantumruy Pro for EN+KM) shipped as `@rentify/design-tokens` 1.0 with React + Angular component kits. (02)
2. **Marketplace rebuild of the 5 buyer screens that matter:** home (data‑driven), search/category with filters & zero‑results recovery, product page with variant picker + store trust card + total‑before‑commitment, store‑grouped cart, one‑page COD checkout with inline sign‑in. (04)
3. **Store pages that sell trust:** Verified seller badge, member since, location, delivery fee & area, return policy, response time, rating, "Visit website" link if storefront exists. (04 S6)
4. **Unified merchant workspace:** one Orders inbox with channel chips (Marketplace / Website / POS / Invoice), one Products list with per‑channel visibility explainer, next‑action home with launch checklist. (06)
5. **Seller application & review status UI** — merchant sees each checklist item, what's missing, reviewer notes; admin has the matching review screen. (05 §4, 08 §3)
6. **Order timeline & COD flow UI** that never lies: Delivered ≠ Paid; "Record cash" step; failed delivery; cancel with reason. (06 §5, 09)
7. **Returns/complaints ("Report a problem")** with photo upload, 48‑business‑hour countdown visible to both sides, escalation to Rentify. (04 S11, 06 §6, 08 §5)
8. **Telegram as the notification spine** — merchants link Telegram, get new‑order alerts with safe inline actions; buyers get order updates. (09)
9. **Share kit** for merchants: product/store link, QR poster (A5 PDF), Telegram/Facebook share — closes the loop with where Cambodian sellers already sell. (06 §11)
10. **Subscription states UI** (trial, past due, grace, suspended read‑only) with banners and the right locks. (06 §13)
11. **Platform admin rebuilt on the design system** with case queues and SLAs. (08)

### 4.2 Fast follow **[R1.x]**
- Section‑based storefront builder (drag sections, live mobile/desktop preview, undo, publish/draft). (05 §6)
- Buyer reviews with photos + seller replies; store rating aggregate. (04 S9)
- Follow a store + "new from stores you follow" feed. (04 S1)
- Bulk CSV import/export with preview & error report (blueprint 5.2). (06 §3)
- Merchant discount codes per Store (applied inside that Store's order only). (06 §10)
- Product Q&A (buyer asks, seller answers publicly, moderated).
- Low‑stock alerts + reorder point; inventory ledger viewer. (06 §4)
- Saved addresses with map pin; delivery note templates.
- Installable PWA for merchant workspace + POS (home‑screen icon, push via Telegram fallback).

### 4.3 Later (needs decisions; do not show in UI before)
- Online payments: CutLuy seller‑owned QR on storefront/marketplace (DEC‑027, P9).
- Marketplace commission / managed settlement (open question 5 in notes).
- Zone/weight delivery rates and courier integrations (DEC‑004 says flat for R1).
- Guest checkout (notes 2026‑09‑24: sign‑in required for R1).
- Custom‑domain checkout (DEC‑003).
- Multi‑location inventory, marketplace ads/sponsored listings, loyalty, gift cards.

## 5. Success metrics (aligned with blueprint north star)
| Metric | Target at closed beta |
|---|---|
| Sign‑up → first purchasable product (median) | ≤ 15 min on phone |
| Sign‑up → seller approval submitted | ≥ 70 % within 24 h |
| Activation (first completed order) within 14 days | ≥ 40 % of approved sellers |
| Marketplace PDP → add to cart | ≥ 8 % |
| Cart → order placed (per Store group) | ≥ 45 % |
| Orders with "Record cash" within 48 h of delivered | ≥ 90 % |
| Complaints answered by seller within 48 business h | ≥ 85 % |
| Lighthouse mobile (marketplace home/PDP, storefront home) | ≥ 90 |
| Axe critical violations on golden journeys | 0 |
