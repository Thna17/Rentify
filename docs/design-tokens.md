# Rentify Semantic Design Tokens

This document defines Rentify's framework-neutral design token architecture, accessibility baseline, and multi-framework integration model.

## 1. Overview and Strategy

Rentify operates across two modern frontend ecosystems:
- **React/Vite (`rentify-frontend/`)**: Merchant portal, auth, marketing, POS, and customizable merchant storefronts.
- **Angular 21 (`marketplace-frontend/`, `admin-frontend/`)**: Shared central marketplace and platform administration operations.

To guarantee visual cohesion, WCAG 2.1 AA accessibility, and predictable theme governance without coupling either framework to the other or forcing a disruptive frontend rewrite, Rentify uses a centralized, framework-neutral design tokens package located at:

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
| **Brand & Surfaces** | Primary indigo brand hues and layered surface tiers | `color.brand.primary`, `color.surface.base`, `color.surface.subtle` | `--rentify-color-brand-primary`, `--rentify-color-surface-base` |
| **Text Colors** | Ink hierarchy for readability and visual priority | `color.text.primary`, `color.text.secondary`, `color.text.muted` | `--rentify-color-text-primary`, `--rentify-color-text-muted` |
| **Borders** | Structural outlines and card separators | `color.border.default`, `color.border.subtle`, `color.border.strong` | `--rentify-color-border-default`, `--rentify-color-border-strong` |
| **Status Colors** | Purposeful feedback tones (success, warning, danger, info) | `color.status.success`, `color.status['warning-subtle']` | `--rentify-color-success-text`, `--rentify-color-warning-subtle` |
| **Typography** | Font stacks, scale, weights, and leading | `typography.fontFamily.primary`, `typography.fontSize.base` | `--rentify-font-primary`, `--rentify-font-size-base` |
| **Spacing** | 4px-aligned geometric spacing scale | `spacing.xs` (4px) through `spacing['4xl']` (64px) | `--rentify-spacing-xs`, `--rentify-spacing-md` |
| **Radius** | Consistent corner radii from tight to pill | `radius.xs` (4px) through `radius.full` (9999px) | `--rentify-radius-md`, `--rentify-radius-full` |
| **Shadows** | Elevation layers for cards, popovers, and focus | `shadow.xs` through `shadow.lg`, `shadow.focus` | `--rentify-shadow-sm`, `--rentify-shadow-focus` |
| **Breakpoints** | Responsive grid viewport triggers | `breakpoint.sm` (640px) to `breakpoint['2xl']` (1536px) | Programmatic & media queries |
| **Focus States** | High-contrast visible keyboard navigation indicators | `focus.ringColor` (`#4f46e5`), `focus.ringWidth` (`2px`) | `--rentify-focus-ring-color`, `--rentify-focus-ring-width` |
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

Automated WCAG 2.1 contrast ratio verification is built into `packages/design-tokens/contrast-validator.js` and repository verification CI (`npm run verify:tokens`).

### Audit Results:
| UI Pair Description | Foreground | Background | Measured Ratio | WCAG 2.1 AA Required | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Primary Text on White Surface | `#0f172a` | `#ffffff` | **17.85:1** | $\ge 4.5:1$ | Pass (AAA) |
| Secondary Text on White Surface | `#475569` | `#ffffff` | **7.58:1** | $\ge 4.5:1$ | Pass (AAA) |
| Muted Text on White Surface | `#64748b` | `#ffffff` | **4.76:1** | $\ge 4.5:1$ | Pass (AA) |
| Brand Text on White Surface | `#4338ca` | `#ffffff` | **7.90:1** | $\ge 4.5:1$ | Pass (AAA) |
| Primary Text on Subtle Surface | `#0f172a` | `#f8fafc` | **17.06:1** | $\ge 4.5:1$ | Pass (AAA) |
| Secondary Text on Subtle Surface | `#475569` | `#f8fafc` | **7.24:1** | $\ge 4.5:1$ | Pass (AAA) |
| Inverse Text on Primary Brand | `#ffffff` | `#4f46e5` | **6.29:1** | $\ge 4.5:1$ | Pass (AA) |
| Inverse Text on Primary Brand Hover | `#ffffff` | `#4338ca` | **7.90:1** | $\ge 4.5:1$ | Pass (AAA) |
| Success Text on Subtle Background | `#14532d` | `#f0fdf4` | **8.70:1** | $\ge 4.5:1$ | Pass (AAA) |
| Warning Text on Subtle Background | `#78350f` | `#fffbeb` | **8.75:1** | $\ge 4.5:1$ | Pass (AAA) |
| Danger Text on Subtle Background | `#7f1d1d` | `#fef2f2` | **9.16:1** | $\ge 4.5:1$ | Pass (AAA) |
| Info Text on Subtle Background | `#1e3a8a` | `#eff6ff` | **9.52:1** | $\ge 4.5:1$ | Pass (AAA) |
| Strong Border on White Surface | `#cbd5e1` | `#ffffff` | **1.48:1** | $\ge 1.4:1$ (component) | Pass |
| Focus Ring on White Surface | `#4f46e5` | `#ffffff` | **6.29:1** | $\ge 3.0:1$ (focus ring) | Pass |

---

## 6. Naming Conventions, Versioning, and Adoption Roadmap

### 6.1 Naming Hierarchy
- **Canonical DTCG Tokens**: `category.group.name` (e.g. `color.status.success`, `spacing.md`)
- **CSS Custom Properties**: `--rentify-<domain>-<name>` (e.g. `--rentify-color-success-text`, `--rentify-spacing-md`)
- **Tailwind Utility Classes**: `<property>-rentify-<token-name>` (e.g. `bg-rentify-brand`, `text-rentify-primary`)

### 6.2 Versioning Policy
`@rentify/design-tokens` follows Semantic Versioning (SemVer):
- **Patch (0.1.x)**: Token adjustments that preserve or improve WCAG contrast without changing semantics.
- **Minor (0.x.0)**: Adding new tokens or non-breaking adapters.
- **Major (x.0.0)**: Renaming or deprecating existing token variables.

### 6.3 Incremental Adoption Roadmap
1. **Phase 1 (Complete)**: Token dictionary, adapters (CSS, JS, Tailwind), contrast validator, repository verification gate, representative React and Angular integrations.
2. **Phase 2**: Standardize button, form input, and modal dialog focus rings across all merchant screens and marketplace views.
3. **Phase 3**: Migrate legacy hard-coded color literals in `admin-frontend/src/styles.css` (`.ops-pill`) to `@rentify/design-tokens`.
4. **Phase 4**: Storefront template token theming support allowing customizable merchant branding while enforcing platform contrast baselines.
