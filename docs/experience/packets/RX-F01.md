# RX-F01: Design tokens v1 "Jade & Saffron"

## Customer outcome
Buyers, merchants, staff and admins see one brand across every app, with
contrast proven by an automated check instead of by eye.

## Current evidence
- Before: `packages/design-tokens` 1.0.0 used indigo/slate values and checked
  14 light-only pairs.
- Spec: [02 §2–4](../02_BRAND_AND_DESIGN_SYSTEM.md); edge case X-002 in
  [10](../10_EDGE_CASES.md).
- Consumers: only `marketplace-frontend/src/styles.css` imports `index.css`.

## In scope
- New values for existing semantic tokens; new tokens `brand.accent*`,
  `surface.canvas`, `surface.inverse`, `text.onAccent`, `border.input`,
  `status.neutral.*`, `price.sale`.
- Opt-in dark theme, type scale, Khmer line-height rule, layout tokens.
- `index.css`, `index.js`, `index.d.ts`, `tailwind-preset.js`, contrast
  validator (light + dark pairs), version, changelog.

## Out of scope
- Component changes, font loading, and app theme wiring (RX-F02, RX-F03).

## Invariants
- Every existing token name and CSS variable keeps working.
- No backend, money, stock, tenant or identity behavior changes.

## Accepted decisions
- DEC-021 (360px first), DEC-022 (EN/KM), DEC-023 (WCAG 2.2 AA).

## Likely code areas
- `packages/design-tokens/`, `docs/design-tokens.md`.

## Acceptance criteria
- Given the token package, when `npm --prefix packages/design-tokens test`
  runs, then all 60 contrast pairs pass and `index.css` matches `tokens.json`.
- Given an element with `lang="km"`, line-height tokens are 1.15× larger.
- Given no `data-theme`, the light palette applies whatever the OS setting.

## Required tests
- X-002: `verify:tokens` fails on any contrast regression (unit).
- CSS/JSON sync, dark-theme opt-in, typography, radius/motion, version tests.
- Playwright at 360/1280 EN/KM: not applicable, since this packet changes no
  screen; RX-F02/RX-F03 add them with the components.

## Verification commands
- `npm run verify:tokens`
- `npm --prefix packages/design-tokens test`

## Rollout and rollback
- No flag. Roll back by reverting the commit; names are unchanged, so no
  consumer code depends on the new values.

## Documentation
- `docs/design-tokens.md` (audit table, theming rules, roadmap),
  `packages/design-tokens/CHANGELOG.md`, `docs/notes.md` (Open items).
