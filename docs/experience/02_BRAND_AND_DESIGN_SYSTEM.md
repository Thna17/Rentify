# 02 — Brand & Design System ("Jade & Saffron")

Delivered through the existing package `packages/design-tokens` (`tokens.json` → CSS vars `--rentify-*`, Tailwind preset, contrast
validator). Ship as **v1.0.0** (brand values change; semantic names are kept so existing usages keep working, new tokens are added).

## 1. Brand idea
Warm, trustworthy, local, modern. **Jade** (growth, trust, calm) as the brand color; **Saffron** (Cambodian warmth, deals, highlights)
as a small accent; warm paper backgrounds instead of cold slate. Product photos are the hero; UI chrome stays quiet.

- Logo usage: wordmark "Rentify" + mark. Marketplace lockup "Rentify Market". Merchant app lockup "Rentify for Business".
- Voice: plain, kind, specific. Khmer and English written together (not translated afterward).

## 2. Color tokens (light)

| Semantic token (existing name kept) | New value | Notes |
|---|---|---|
| `color.brand.primary` | `#0E6B5C` (Jade 700) | White text = 6.4:1 ✓ |
| `color.brand.primary-hover` | `#0A5549` (Jade 800) | |
| `color.brand.primary-subtle` *(new)* | `#E3F2EE` | Selected chips, active nav bg |
| `color.brand.accent` *(new)* | `#F2A516` (Saffron 500) | **Background only**, ink text on it (≈ 9:1). Never as text on white |
| `color.brand.accent-subtle` *(new)* | `#FDF3DC` | Deal ribbons bg |
| `color.surface.base` | `#FFFFFF` | Cards |
| `color.surface.canvas` *(new)* | `#FAF8F4` | Page background (warm paper) |
| `color.surface.subtle` | `#F3F0EA` | Image wells, table headers |
| `color.surface.inverse` *(new)* | `#111418` | Footer, POS header |
| `color.text.primary` | `#111418` | |
| `color.text.secondary` | `#4A4F57` | |
| `color.text.muted` | `#666A72` | 5.4:1 white · 5.1:1 canvas · 4.8:1 subtle (checked) |
| `color.text.inverse` | `#FFFFFF` | |
| `color.border.subtle` | `#ECE8E1` | |
| `color.border.default` | `#DDD8CF` | |
| `color.border.strong` | `#C7C1B6` | Decorative dividers on hover |
| `color.border.input` *(new)* | `#8B867D` | Form control boundaries: 3.6:1 white / 3.4:1 canvas (meets WCAG 1.4.11 non‑text 3:1) |
| `color.status.success` / `-subtle` / `-text` | `#15803D` / `#EAF6EE` / `#14532D` | Paid, delivered, approved |
| `color.status.warning` / … | `#B45309` / `#FEF5E7` / `#78350F` | Pending, needs action, deadline soon |
| `color.status.danger` / … | `#C2261C` / `#FDECEA` / `#7F1D1D` | Errors, suspended, rejected |
| `color.status.info` / … | `#1D5FB8` / `#EAF1FB` / `#1E3A8A` | Shipped, in progress |
| `color.status.neutral` *(new)* / … | `#5B616B` / `#F1F0EC` / `#30343A` | Cancelled, draft, archived |
| `color.price.sale` *(new)* | `#C2261C` | Sale price text only |
| `focus.ringColor` | `#0E6B5C` + 2px white inner halo | |

**Dark theme** (admin default option, marketplace/merchant follow `prefers-color-scheme`): surfaces `#0F1215 / #161A1F / #1E232A`,
text `#F2F2EF / #C3C6CB / #8E939B`, borders `#2A3038 / #3A414B`, brand `#2FA58E`, accent `#F5B83D`, status lightened to pass AA.

Rule: the contrast validator (`npm run verify:tokens`) gets every new pair added; CI fails on any AA failure.

## 3. Typography
- **One family for both scripts: Kantumruy Pro** (Google Fonts; Khmer + Latin designed together) weights 400/500/600/700.
  Numbers, SKUs, order numbers, money: **JetBrains Mono** 500 (tabular).
- Load: React via `@fontsource`/Google Fonts with `display=swap`; Angular in `styles.css` `@import`. Subset Khmer + Latin.
- Khmer line‑height: base tokens × 1.15 when `:lang(km)`.

| Token | Size/line (mobile → ≥1024) | Weight | Use |
|---|---|---|---|
| `display` | 32/40 → 48/56 | 700 | Marketplace hero, marketing |
| `h1` | 24/32 → 32/40 | 700 | Page titles |
| `h2` | 20/28 → 24/32 | 600 | Sections |
| `h3` | 17/24 → 18/26 | 600 | Card titles |
| `body` | 15/24 | 400 | Default (Khmer 15/26) |
| `body-sm` | 13/20 | 400 | Meta |
| `label` | 13/18 | 500 | Form labels, chips |
| `caption` | 12/16 | 500 | Badges (min size anywhere) |
| `price-lg` | 24/32 mono | 600 | PDP price |
| `price` | 16/24 mono | 600 | Cards |

## 4. Space, radius, elevation, layout, motion
Keep the existing 4px spacing scale. Radius: `xs 4` badges · `sm 8` inputs/buttons · `md 12` cards · `lg 16` sheets/dialogs · `xl 24` hero tiles · `full`.
Elevation: cards use borders; `shadow.sm` for sticky bars, `shadow.md` popovers, `shadow.lg` dialogs.
Layout: content max 1280; gutters 16/24/32; grid 4/8/12 columns; product grid 2 (360) / 3 (768) / 4 (1024) / 5 (1280, marketplace only).
Breakpoints keep existing tokens; **design at 360 first**.
Motion: 120ms press, 200ms expand, 260ms sheet; ease `cubic-bezier(.2,.8,.2,1)`; reduced‑motion → opacity only (already in package).

## 5. Iconography, imagery, illustration
- Icons: **Lucide** in both frameworks (`lucide-react`, `lucide-angular`), stroke 1.75, size 20 (16 dense tables).
- Product images: square, on `surface.subtle` well, object‑fit contain; never stretched. Store logos circular 1:1.
- Empty‑state illustrations: simple line art, `text.muted` stroke + one jade accent; Cambodian everyday motifs (tuk‑tuk, market stall, kroma pattern as a subtle band) — avoid temple imagery for UI decoration.

## 6. Component contract (same API/behavior in React `libs/shared/src/ui` and Angular `src/app/components/ui`)

Each component: documented props/inputs, states (default, hover, focus‑visible, active, disabled, loading, error), EN/KM text fit at 360px, unit test + axe test.

| Component | Contract |
|---|---|
| `Button` | variants `primary` (jade), `secondary` (white + border), `ghost`, `accent` (saffron, deals only), `danger`, `link`; sizes 36/44/52; `loading` keeps width; icon left/right |
| `IconButton` | 44×44 hit area, required aria‑label |
| `TextField`, `TextArea`, `Select`, `Combobox`, `NumberField`, `MoneyField` (USD, cents internally) | label above, helper, error with icon, `aria-describedby` |
| `PhoneField` | fixed `+855`, accepts `0xx`/`xx`, E.164 out, display `012 345 678` |
| `AddressFields` | province → khan/district → sangkat/commune (Cambodia data shared package), street/house, landmark |
| `Checkbox`, `Radio`, `Switch`, `RadioCard` | 44px targets |
| `Chip`, `FilterChip`, `ChannelChip` | ChannelChip = Marketplace / Website / POS / Invoice with icon + color‑independent label |
| `Badge`, `StatusBadge` | tone from 09 status map; always text, `role="status"` when live |
| `Price` | `amountMinor`, `compareAtMinor?`, `currency`; formats `$12.50`; KHR optional line `≈ ៛51,300` (display only, rate from settings, rounded ៛100) |
| `QuantityStepper` | min/max with reason tooltip |
| `Rating` | stars + "4.8 (126)"; never stars without count |
| `Avatar`, `StoreLogo` | initials fallback |
| `Card`, `ListRow`, `DataTable` (admin + merchant), `DescriptionList` | |
| `Tabs`, `SegmentedControl`, `Accordion`, `Stepper`, `Timeline` | Timeline renders order events (actor, time, note) |
| `Dialog` / `BottomSheet` (`ResponsiveDialog` switches at 768) | focus trap, return focus |
| `Drawer` | right side 420px |
| `Toast` | max 3, 4s, optional action |
| `Banner` | info/warn/danger/success; dismissible or persistent (subscription, suspension, approval) |
| `Skeleton` | matches final layout (no CLS) |
| `EmptyState`, `ErrorState`, `BlockedState` | illustration + title + body + 1 primary action; BlockedState shows reason code copy (09) |
| `Checklist` | Shopify‑style setup guide: progress "2 of 6", expandable steps with action, dismiss/restore |
| `ImageUploader` | drag/camera, reorder, crop 1:1, alt text, upload progress, retry, magic‑byte errors mapped to copy |
| `CountdownChip` | SLA deadlines ("Reply within 31h"), switches to warning < 12h, danger when overdue |
| `ShareSheet` | copy link, Telegram, Facebook, QR download |

## 7. Surface personalities (same system, different density)
| Surface | Density | Notes |
|---|---|---|
| Marketplace (Angular) | Comfortable, image‑led, canvas background | Saffron allowed for deals |
| Storefronts (React templates) | Merchant brand via theme tokens | Rentify brand nearly invisible except "Powered by Rentify" + checkout chrome |
| Merchant workspace (React) | Comfortable on mobile, compact tables on desktop | Jade nav, white cards |
| POS (React) | Large targets (56px), high contrast, dark header | Works on 768+ tablets and 360 phones |
| Admin (Angular) | Compact, data‑dense, dark mode toggle | No saffron |

## 8. Storefront theming (merchant brand inside templates)
Templates consume **theme tokens** derived from the merchant's choices, never raw values:
`--sf-brand`, `--sf-brand-ink`, `--sf-bg`, `--sf-surface`, `--sf-text`, `--sf-muted`, `--sf-border`, `--sf-radius`, `--sf-font-heading`, `--sf-font-body`.
- Merchant picks: brand color, background (light/dark/custom), font pair (6 curated pairs incl. Khmer‑capable), corner style (sharp/soft/round).
- Extend existing `resolveStorefrontTheme`: compute `-ink` and text colors automatically; if a merchant choice fails AA, show a warning in the editor and auto‑adjust on the live store ("We darkened your text slightly so customers can read it").
- Checkout, cart, account and order pages use a **locked neutral checkout theme** with only the merchant brand color on primary buttons — consistent trust across all stores.

## 9. Accessibility (WCAG 2.2 AA, DEC‑023)
Focus visible everywhere · target size ≥ 24px min, 44px for primary actions · no info by color alone · form errors announced · `lang`
switches `en`/`km` · reduced motion · 200 % zoom without horizontal scroll · drag‑and‑drop always has a button alternative
(2.5.7) · consistent help location (3.2.6: help link in same place on every page) · accessible authentication: allow paste/OTP autofill (3.3.8).
