# CLAUDE.md — Rentify

Read `AGENTS.md` first; it is authoritative for architecture and repository rules. This file adds the experience rules.

Rentify = Shopify‑style storefronts + Amazon‑style marketplace + POS for Cambodian SMEs. One Store, one catalog, one stock count.

## Before any change
1. `git status` — respect uncommitted work.
2. Read `docs/decisions/release-1-register.md` and `docs/specs/release-1-golden-journeys.md`.
3. For UI work read `docs/experience/00_README.md` and the file for your surface (04 marketplace · 05 onboarding/builder · 06 merchant · 07 storefront/POS · 08 admin · 09 states/copy · 10 edge cases · 11 packets).

## Hard rules
- R1 online checkout is COD only (DEC‑026). Never enable CutLuy or show online‑payment UI (DEC‑027).
- One Store per order; cart grouped by Store (DEC‑012/013). Delivery fee = merchant flat fee per Store order (DEC‑004).
- Never invent backend states, money rules or error codes. Missing contract → note in `docs/notes.md` (Open) + contract packet first.
- Delivered ≠ paid. Requested ≠ refunded. Show only states backed by real events.
- Design tokens only (`packages/design-tokens` v1). No hex values in components. Lucide icons. Kantumruy Pro + JetBrains Mono.
- Every screen: skeleton · empty · error+retry · success · blocked(reason). 360px first. 44px targets. WCAG 2.2 AA.
- All strings EN + KM via message catalogs; buyers never see raw backend messages.
- Stay inside your lane's directories (see 11_TASK_PACKETS.md). Shared packages change only in RX‑F packets.
- No AI features.

## Verify
`npm run verify:tokens` · `npm run verify:frontend` · `npm run verify:marketplace` · `npm run verify:admin` · `npm run verify:core` / `verify:commerce` (backend) · Playwright suites for the packet's edge cases.
