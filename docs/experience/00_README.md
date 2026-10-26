# Rentify Experience Renovation Pack

> **Status:** Proposed · 2026-10-27 · Owner: Dorito (product + UX lead)
> **Place in repo:** `docs/experience/` (all files) and `CLAUDE.md` at repo root.
> **Audience:** Claude Code / Codex / Gemini workstreams and human reviewers.

Rentify = **Shopify + Amazon for Cambodian SMEs.** A merchant creates one Store and sells in up to three places:
1. **Rentify Marketplace** (`rentifymarket.com`) — Amazon‑style shared marketplace.
2. **Their own storefront** (`<store>.rentifystore.shop`, optional custom domain) — Shopify‑style, built from templates.
3. **Their counter** — POS.
One catalog, one stock count, one workspace.

The backend direction is already decided and documented (`docs/platform-architecture.md`, `docs/master-engineering-blueprint.md`,
`docs/decisions/release-1-register.md`, `docs/specs/release-1-golden-journeys.md`). What is missing — and why the product
"looks bad" — is a single **experience and design spec**: one brand, one component language across React and Angular, and an
exact definition of every screen, state and edge case for buyers, merchants, staff and Rentify admins. That is this pack.

---

## 1. Files

| # | File | Decides |
|---|---|---|
| 00 | `00_README.md` | How to use the pack, rules, master prompt |
| 01 | `01_PRODUCT_AND_RENOVATION.md` | Diagnosis of today's UX, personas, prioritized proposals (R1 / R1.x / Later) |
| 02 | `02_BRAND_AND_DESIGN_SYSTEM.md` | New visual language → `@rentify/design-tokens` v1, components for React + Angular, storefront theming |
| 03 | `03_INFORMATION_ARCHITECTURE.md` | Every app, host, route (current → target), navigation |
| 04 | `04_MARKETPLACE_BUYER.md` | Marketplace + buyer account: every screen, state, edge case |
| 05 | `05_MERCHANT_ONBOARDING_AND_STORE_BUILDER.md` | Sign‑up → path choice → launch checklist → seller application → template → customizer → publish → domain |
| 06 | `06_MERCHANT_WORKSPACE.md` | Merchant dashboard: home, products, inventory, orders, returns, customers, invoices, reports, staff, settings, billing |
| 07 | `07_STOREFRONT_AND_POS.md` | Hosted storefront buyer journey across templates + POS counter flow |
| 08 | `08_PLATFORM_ADMIN.md` | `admin-frontend`: seller review, moderation, cases, stores, buyers, templates, plans, security |
| 09 | `09_STATES_COPY_NOTIFICATIONS.md` | Status vocabulary EN/KM, badge tones, error envelope → copy, Telegram/email/in‑app templates |
| 10 | `10_EDGE_CASES.md` | ~180 numbered cases mapped to golden journeys → tests |
| 11 | `11_TASK_PACKETS.md` | Renovation work packages in the repo's task‑packet format, lanes, order, acceptance |
| — | `CLAUDE.md` | Short rules for Claude Code at repo root |

---

## 2. Rules (read before building anything)

1. **The decision register wins.** DEC‑001…DEC‑027 are not reopened by this pack. Notable ones for UX:
   COD only for online checkout (DEC‑026) · CutLuy stays disabled until P9 (DEC‑027) · one Store per order, cart grouped by Store (DEC‑012/013) ·
   merchant‑set flat delivery fee per Store order (DEC‑004) · gross prices, tax off (DEC‑005) · returns 7 days for damaged/defective/wrong
   item with photo/video, 48 business‑hour seller response, then admin escalation (DEC‑008/009/011) · seller refunds directly (DEC‑010) ·
   custom domains browse‑only, checkout on hosted subdomain (DEC‑003) · plans Free Pilot / Starter $15 / Business $35, 14‑day trial,
   7‑day grace, 90‑day read‑only (DEC‑014…020) · 360px primary viewport, Safari 15+/Chrome 100+ (DEC‑021) · 100 % EN/KM (DEC‑022) ·
   WCAG 2.2 AA (DEC‑023).
2. **Never invent backend states or money rules.** Every buyer‑facing label in this pack maps to an existing state from the Phase 3
   contracts (`docs/openapi/commerce.openapi.yaml`). If a screen needs something the contract lacks, write it in `docs/notes.md`
   under *Open* and build the UI behind a flag — don't fake it.
3. **Labels.** Every proposal here is tagged **[R1]** (needed for Release 1 quality), **[R1.x]** (fast follow), or **[Later]**.
   Do not describe Later items as implemented anywhere (AGENTS.md rule 7).
4. **Respect workstream ownership.** Merchant dashboard (`apps/core/merchant`) and `admin-frontend` are the Codex lane;
   marketplace, storefront, templates, POS are the Gemini lane (see `docs/audits/phase-4-customer-journeys-map.md`). Task packets in 11 are
   split by lane so they can run in parallel without conflicts.
5. **One design language, two frameworks.** All visual decisions go through `packages/design-tokens`. No hard‑coded hex values in
   components. React and Angular implement the same component contract (02 §6).
6. **Every screen ships 5 states:** loading skeleton · empty (with next action) · error (plain words + retry) · success · *blocked*
   (permission, suspension, approval pending, entitlement limit — each with reason and what to do).
7. **Mobile first at 360px**, touch targets ≥ 44px, Khmer and English designed together (Khmer line height +15 %).
8. **No AI features** are added by this pack.

---

## 3. Master prompt for Claude Code

```
You are working in the Rentify monorepo. Read in order: AGENTS.md, CLAUDE.md, docs/README.md,
docs/decisions/release-1-register.md, docs/specs/release-1-golden-journeys.md, then docs/experience/00_README.md
and docs/experience/11_TASK_PACKETS.md.

Execute the task packets in 11 in the listed order for the lane I name (LANE=<buyer|merchant|admin|foundation>).
For each packet:
1. Read every experience file the packet lists and the code areas it names. Check `git status` first.
2. Implement only what the packet scopes. Never contradict the decision register; never enable CutLuy.
3. Map every UI state to existing API contract states. Missing contract → record in docs/notes.md (Open) and stop that sub-part.
4. Add/extend tests named in the packet (unit + Playwright at 360px and 1280px, EN and KM).
5. Run the packet's verification commands. Update docs (Current/Target/Open labels) in the same change.
6. Commit as "<packet-id>: <title>" and write the standard handoff from docs/ai-implementation-plan.md §2.
Start with packet RX-F01.
```

---

## 4. Sources used
- Repo: `develop` @ 2026‑10‑26 (PR #19 merged) — architecture, golden journeys, decision register, design tokens, phase‑4 map,
  route inventory of `marketplace-frontend`, `admin-frontend`, `rentify-frontend` (merchant, pos, storefront, templates 1–3).
- KhmerCraft (`SeoulDoriot/Marketplace`) feature database — buyer/seller/admin split now absorbed into Rentify.
- External UX research: Baymard Institute checkout/product‑page/mobile guidelines (checkout ≈ 12 form elements is achievable;
  avoid auto‑rotating mobile carousels; 3–5+ images; rating + count; "Load more"); Shopify setup‑guide pattern (checklist with
  progress, expandable steps, dismissible); multivendor cart guidance (group by seller, explain separate orders, keep steps short);
  Cambodia market data (QR ≈ 47 % and COD ≈ 27 % of e‑commerce payments; Facebook/TikTok/Telegram as discovery channels;
  same/next‑day Phnom Penh delivery expectation).
