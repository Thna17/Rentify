# Changelog — @rentify/design-tokens

## 1.1.0 — 2026-10-27 (RX-F01 "Jade & Saffron")

Brand values change; every existing token name and CSS variable is kept, so
existing usages keep working and pick up the new values.

### Changed
- Brand: indigo → jade (`brand.primary` `#0e6b5c`, hover `#0a5549`, active
  `#08443b`, subtle `#e3f2ee`). `brand.secondary*` now aliases the jade brand.
- Surfaces, text and borders move from cold slate to warm paper/ink values.
- Status success/warning/danger/info use the 02 §2 values.
- Focus ring is jade (`#0e6b5c`) with a white inner halo.
- Radius scale: sm 8, md 12, lg 16, xl 24 (was 6, 8, 12, 16).
- Motion: fast 120ms (press), slow 260ms (sheet).
- Fonts: Kantumruy Pro (body/heading), JetBrains Mono (mono), with system fallbacks.

### Added
- `brand.accent`, `brand.accentSubtle`, `surface.canvas`, `surface.inverse`,
  `text.onAccent`, `border.input`, `status.neutral.*`, `price.sale`.
- Type scale (`display`…`price`) with mobile and ≥1024px values, and the
  Khmer line-height rule (`:lang(km)` × 1.15).
- `layout` tokens (content max 1280, gutters 16/24/32, 44px target).
- Opt-in dark theme (`tokens.theme.dark`; `data-theme="dark"` or `"system"`).
- Contrast gate covers 60 pairs (light + dark), including 3:1 non-text pairs.
- Tests that keep `index.css` in sync with `tokens.json`.

## 1.0.0
- Initial semantic tokens, CSS/JS/Tailwind adapters and contrast validator.
