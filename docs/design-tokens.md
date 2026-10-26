# Rentify Semantic Design Tokens

This document defines Rentify's framework-neutral design token architecture, accessibility baseline, and multi-framework integration model.

## 1. Overview and Strategy

Rentify operates across two modern frontend ecosystems:
- **React/Vite (`rentify-frontend/`)**: Merchant portal, auth, marketing, POS, and customizable merchant storefronts.
- **Angular 21 (`marketplace-frontend/`, `admin-frontend/`)**: Shared central marketplace and platform administration operations.

To guarantee visual cohesion, WCAG 2.2 AA accessibility, and predictable theme governance without coupling either framework to the other or forcing a disruptive frontend rewrite, Rentify uses a centralized, framework-neutral design tokens package located at:

```
packages/design-tokens/
├── tokens.json              # Canonical W3C DTCG design token dictionary
├── index.css                # Pure CSS custom properties (--rentify-*) and accessible utilities
├── index.js                 # Programmatic token exports and WCAG luminance/contrast helpers
├── index.d.ts               # Full TypeScript definitions for token paths and helpers
├── tailwind-preset.js       # Tailwind CSS preset mapping utility classes to semantic variables
├── contrast-validator.js    # Automated WCAG 2.1 contrast ratio verification engine
├── test/
│   └── tokens.test.js       # Node.js test suite for schema integrity and accessibility criteria
└── package.json             # @rentify/design-tokens package definition
```

---

## 2. Token Architecture and Domains

The canonical token schema (`tokens.json`) defines 12 core visual domains:

| Domain | Description | Semantic Token Examples | CSS Custom Property |
| :--- | :--- | :--- | :--- |
| **Brand & Surfaces** | Jade brand, saffron accent (background only), warm paper surfaces and an inverse surface | `color.brand.primary`, `color.brand.accent`, `color.surface.canvas`, `color.surface.inverse` | `--rentify-color-brand-primary`, `--rentify-color-surface-base` |
| **Text Colors** | Ink hierarchy for readability and visual priority | `color.text.primary`, `color.text.secondary`, `color.text.muted` | `--rentify-color-text-primary`, `--rentify-color-text-muted` |
| **Borders** | Structural outlines, card separators and 3:1 form-control boundaries | `color.border.default`, `color.border.subtle`, `color.border.input` | `--rentify-color-border-default`, `--rentify-color-border-strong` |
| **Status & Price** | Feedback tones (success, warning, danger, info, neutral) and sale price text | `color.status.success`, `color.status['warning-subtle']` | `--rentify-color-success-text`, `--rentify-color-warning-subtle` |
| **Typography** | Font stacks, scale, weights, and leading | `typography.fontFamily.primary`, `typography.fontSize.base` | `--rentify-font-primary`, `--rentify-font-size-base` |
| **Spacing** | 4px-aligned geometric spacing scale | `spacing.xs` (4px) through `spacing['4xl']` (64px) | `--rentify-spacing-xs`, `--rentify-spacing-md` |
| **Radius** | Consistent corner radii from tight to pill | `radius.xs` (4px) through `radius.full` (9999px) | `--rentify-radius-md`, `--rentify-radius-full` |
| **Shadows** | Elevation layers for cards, popovers, and focus | `shadow.xs` through `shadow.lg`, `shadow.focus` | `--rentify-shadow-sm`, `--rentify-shadow-focus` |
| **Breakpoints** | Responsive grid viewport triggers | `breakpoint.sm` (640px) to `breakpoint['2xl']` (1536px) | Programmatic & media queries |
| **Focus States** | High-contrast visible keyboard navigation indicators | `focus.ringColor` (`#0e6b5c`), `focus.ringWidth` (`2px`) | `--rentify-focus-ring-color`, `--rentify-focus-ring-width` |
| **Disabled States** | Non-interactive visual indicators | `disabled.opacity` (`0.5`), `disabled.cursor` (`not-allowed`) | `--rentify-disabled-opacity` |
| **Motion** | Physics-aligned durations and easing curves | `motion.duration.base` (`200ms`), `motion.easing.standard` | `--rentify-motion-duration-base`, `--rentify-motion-ease-standard` |

---

## 3. Multi-Framework Adapters

### 3.1 CSS Custom Properties (`index.css`)
Exposes all semantic tokens as root CSS custom properties prefixed with `--rentify-*`. It includes:
- Global `:root` declarations for all 12 domains.
- Accessible keyboard focus ring helper: `.rentify-focus-ring:focus-visible`.
- Universal `@media (prefers-reduced-motion: reduce)` override setting animation and transition durations to 1ms to support assistive user motion preferences.

### 3.2 Programmatic JavaScript & TypeScript API (`index.js`, `index.d.ts`)
Allows components, build tools, and test suites to import token definitions directly:
```javascript
const { tokens, cssVariables, getContrastRatio, isAccessible } = require('@rentify/design-tokens');

// Verify contrast ratio programmatically:
const ratio = getContrastRatio('#0f172a', '#ffffff'); // 17.85:1
```

### 3.3 Tailwind CSS Preset (`tailwind-preset.js`)
Enables zero-friction adoption in React or Angular Tailwind workflows by extending the theme:
- Colors: `bg-rentify-brand`, `text-rentify-primary`, `border-rentify-subtle`, `bg-rentify-success-subtle`
- Radius: `rounded-rentify-md`, `rounded-rentify-full`
- Shadow: `shadow-rentify-sm`, `shadow-rentify-focus`

---

## 4. Representative Integrations

### 4.1 React Integration: `Badge` Component (`rentify-frontend`)
Location: `rentify-frontend/libs/shared/src/ui/badge.tsx`
- Added semantic status variants: `success`, `warning`, `danger`, `info`.
- Backed by `--rentify-color-*-subtle`, `--rentify-color-*-text`, and `--rentify-color-*-border` with WCAG-compliant fallback values.
- High-contrast keyboard focus visibility (`focus-visible:ring-[var(--rentify-focus-ring-color,#4f46e5)]`).
- Verified by unit tests in `rentify-frontend/libs/shared/src/ui/badge.test.tsx`.

### 4.2 Angular Integration: `OrderStatusBadgeComponent` (`marketplace-frontend`)
Location: `marketplace-frontend/src/app/components/shared/orders/order-status-badge/order-status-badge.component.ts`
- Applied semantic status tones (`neutral`, `info`, `warn`, `good`, `bad`) utilizing Rentify semantic tokens.
- Global stylesheet `marketplace-frontend/src/styles.css` imports `@import '../../packages/design-tokens/index.css'`.
- Verified by unit tests in `marketplace-frontend/src/app/components/shared/orders/order-status-badge/order-status-badge.component.spec.ts`.

---

## 5. Accessibility and Contrast Audit

**Current (v1.1.0, RX-F01, 2026-10-27).** The "Jade & Saffron" values from
[the brand spec](experience/02_BRAND_AND_DESIGN_SYSTEM.md) §2 are verified by
`packages/design-tokens/contrast-validator.js` and `npm run verify:tokens`; CI
fails on any pair below its minimum. The validator checks the same 30 pairs
for the light palette and for every theme in `tokens.theme` (60 in total).
Text pairs need 4.5:1 (WCAG 1.4.3); form-control boundaries and focus rings
need 3:1 (WCAG 1.4.11). `text.disabled` is exempt from contrast minimums.

### Light palette
| UI Pair Description | Foreground | Background | Measured Ratio | Required | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Primary Text on Base Surface | `#111418` | `#ffffff` | **18.47:1** | ≥ 4.5:1 | Pass |
| Secondary Text on Base Surface | `#4a4f57` | `#ffffff` | **8.24:1** | ≥ 4.5:1 | Pass |
| Muted Text on Base Surface | `#666a72` | `#ffffff` | **5.43:1** | ≥ 4.5:1 | Pass |
| Brand Text on Base Surface | `#0e6b5c` | `#ffffff` | **6.41:1** | ≥ 4.5:1 | Pass |
| Primary Text on Canvas | `#111418` | `#faf8f4` | **17.41:1** | ≥ 4.5:1 | Pass |
| Secondary Text on Canvas | `#4a4f57` | `#faf8f4` | **7.77:1** | ≥ 4.5:1 | Pass |
| Muted Text on Canvas | `#666a72` | `#faf8f4` | **5.12:1** | ≥ 4.5:1 | Pass |
| Brand Text on Canvas | `#0e6b5c` | `#faf8f4` | **6.04:1** | ≥ 4.5:1 | Pass |
| Primary Text on Subtle Surface | `#111418` | `#f3f0ea` | **16.24:1** | ≥ 4.5:1 | Pass |
| Secondary Text on Subtle Surface | `#4a4f57` | `#f3f0ea` | **7.25:1** | ≥ 4.5:1 | Pass |
| Muted Text on Subtle Surface | `#666a72` | `#f3f0ea` | **4.77:1** | ≥ 4.5:1 | Pass |
| Brand Text on Brand Subtle | `#0e6b5c` | `#e3f2ee` | **5.56:1** | ≥ 4.5:1 | Pass |
| Primary Text on Brand Subtle | `#111418` | `#e3f2ee` | **16.01:1** | ≥ 4.5:1 | Pass |
| Sale Price on Base Surface | `#c2261c` | `#ffffff` | **5.85:1** | ≥ 4.5:1 | Pass |
| Sale Price on Canvas | `#c2261c` | `#faf8f4` | **5.52:1** | ≥ 4.5:1 | Pass |
| Inverse Text on Primary Brand | `#ffffff` | `#0e6b5c` | **6.41:1** | ≥ 4.5:1 | Pass |
| Inverse Text on Primary Brand Hover | `#ffffff` | `#0a5549` | **8.72:1** | ≥ 4.5:1 | Pass |
| Inverse Text on Primary Brand Active | `#ffffff` | `#08443b` | **11.05:1** | ≥ 4.5:1 | Pass |
| Inverse Text on Inverse Surface | `#ffffff` | `#111418` | **18.47:1** | ≥ 4.5:1 | Pass |
| On-Accent Text on Accent | `#111418` | `#f2a516` | **8.94:1** | ≥ 4.5:1 | Pass |
| Primary Text on Accent Subtle | `#111418` | `#fdf3dc` | **16.74:1** | ≥ 4.5:1 | Pass |
| Success Text on success Subtle | `#14532d` | `#eaf6ee` | **8.21:1** | ≥ 4.5:1 | Pass |
| Warning Text on warning Subtle | `#78350f` | `#fef5e7` | **8.39:1** | ≥ 4.5:1 | Pass |
| Danger Text on danger Subtle | `#7f1d1d` | `#fdecea` | **8.76:1** | ≥ 4.5:1 | Pass |
| Info Text on info Subtle | `#1e3a8a` | `#eaf1fb` | **9.11:1** | ≥ 4.5:1 | Pass |
| Neutral Text on neutral Subtle | `#30343a` | `#f1f0ec` | **10.97:1** | ≥ 4.5:1 | Pass |
| Input Border on Base Surface | `#8b867d` | `#ffffff` | **3.62:1** | ≥ 3:1 (non-text) | Pass |
| Input Border on Canvas | `#8b867d` | `#faf8f4` | **3.41:1** | ≥ 3:1 (non-text) | Pass |
| Focus Ring on Base Surface | `#0e6b5c` | `#ffffff` | **6.41:1** | ≥ 3:1 (non-text) | Pass |
| Focus Ring on Canvas | `#0e6b5c` | `#faf8f4` | **6.04:1** | ≥ 3:1 (non-text) | Pass |

### Dark theme
The 30 dark-theme pairs pass; the lowest is a form-control border at
3.6:1. Dark brand surfaces carry dark ink (`text.inverse` is `#0f1215` in
dark), because white on the lighter dark-theme jade `#2fa58e` is below 4.5:1.
Saffron always carries `text.onAccent` (`#111418`) in both themes.

### Theming rules
- **Current:** the dark theme is opt-in. `data-theme="dark"` forces it and
  `data-theme="system"` follows `prefers-color-scheme`. The package never
  darkens `:root` by itself, so apps that still hard-code light colors are not
  half-darkened.
- **Current:** under `:lang(km)` every line-height token is multiplied by
  `--rentify-line-height-km-multiplier` (1.15).
- **Current:** font stacks name Kantumruy Pro and JetBrains Mono first, with
  system fallbacks. The package does not load font files.
- **Target (RX-F02/RX-F03):** React and Angular apps load the fonts, set
  `data-theme`, and replace hard-coded colors with these tokens.

## 6. Naming Conventions, Versioning, and Adoption Roadmap

### 6.1 Naming Hierarchy
- **Canonical DTCG Tokens**: `category.group.name` (e.g. `color.status.success`, `spacing.md`)
- **CSS Custom Properties**: `--rentify-<domain>-<name>` (e.g. `--rentify-color-success-text`, `--rentify-spacing-md`)
- **Tailwind Utility Classes**: `<property>-rentify-<token-name>` (e.g. `bg-rentify-brand`, `text-rentify-primary`)

### 6.2 Versioning Policy
Current version: **1.1.0** (see `packages/design-tokens/CHANGELOG.md`).
`@rentify/design-tokens` follows Semantic Versioning (SemVer):
- **Patch (0.1.x)**: Token adjustments that preserve or improve WCAG contrast without changing semantics.
- **Minor (0.x.0)**: Adding new tokens or non-breaking adapters.
- **Major (x.0.0)**: Renaming or deprecating existing token variables.

### 6.3 Incremental Adoption Roadmap
1. **Phase 1 (Complete)**: Token dictionary, adapters (CSS, JS, Tailwind), contrast validator, repository verification gate, representative React and Angular integrations.
2. **RX-F01 (Complete, 2026-10-27)**: Jade & Saffron values, new tokens, opt-in dark theme, type scale and Khmer line-height rule, 60-pair contrast gate.
3. **Phase 2 (Target, RX-F02/RX-F03)**: Standardize button, form input, and modal dialog focus rings across all merchant screens and marketplace views.
4. **Phase 3 (Target, RX-F03)**: Migrate legacy hard-coded color literals in `admin-frontend/src/styles.css` (`.ops-pill`) to `@rentify/design-tokens`.
5. **Phase 4 (Target)**: Storefront template token theming support allowing customizable merchant branding while enforcing platform contrast baselines.
