# Phase 4 Manual Accessibility and Resilience Checklist

**Status:** NOT EXECUTED ON LIVE STAGING

**Required before:** Phase 4 release sign-off

Record tester, date, browser/assistive technology, staging build SHA, result, evidence link, and defect link for every row. Test both English and Khmer unless the row is language-independent.

| Surface | Viewports | Checks | Result |
| --- | --- | --- | --- |
| Merchant onboarding and launch checklist | 390×844, 1440×900 | Keyboard-only completion, focus order, error summary, resume flow, 200% text zoom | Pending |
| Merchant products and CSV import | 390×844, 1440×900 | Labels, validation, upload errors, conflict recovery, large text, failed images | Pending |
| Merchant orders, POS, invoices | 390×844, 1440×900 | Permission denial, final-unit conflict, dialogs, receipts, timeout retry, no duplicate action | Pending |
| Marketplace browse/product | 320×568, 390×844, 1440×900 | Search/filter keyboard flow, variant announcement, image fallback, touch targets | Pending |
| Marketplace grouped cart/COD checkout | 320×568, 390×844, 1440×900 | Store grouping, totals, form errors, focus after error, 200% zoom, safe retry | Pending |
| Buyer orders/returns/complaints | 390×844, 1440×900 | Timeline semantics, evidence upload, status announcements, permission and empty states | Pending |
| Storefront templates 1–3 | 320×568, 390×844, 1440×900 | Full COD journey, keyboard, screen reader, zoom/reflow, reduced motion | Pending |

## Assistive technology matrix

- macOS: Safari + VoiceOver.
- Windows: Chrome or Edge + NVDA.
- Mobile: iOS VoiceOver or Android TalkBack.
- Keyboard only: no mouse or touch input.
- Browser zoom: 200%; also verify reflow at 320 CSS pixels.
- OS reduced-motion preference enabled.
- Network throttling: Slow 3G plus one forced request timeout.

## Pass criteria

- Every interactive control has a meaningful accessible name and visible focus.
- Reading and focus order match the visual task order.
- Validation identifies the field, explains correction, and moves focus predictably.
- No content or action is lost at 200% text zoom or 320 CSS pixels.
- Repeated submission after timeout never creates a duplicate order or stock deduction.
- English and Khmer remain understandable without clipping critical actions or totals.
- Serious or critical defects block release; lesser defects require an owner and agreed release disposition.
