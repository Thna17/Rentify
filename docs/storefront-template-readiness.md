# Storefront template readiness

Current audit: 2026-11-02. All ten registered storefront IDs have loaders in
`apps/storefront/src/templates.js` and are accepted by Core's publish service.
The existing template selection API is used during store creation. Products,
stock, categories, cart and orders continue to use the canonical Commerce APIs.

## Merchant setup

- Store design → Branding: upload a logo, replace the main banner and save
  custom colors through the existing owner-authorized Core endpoints.
- The live storefront's owner editor changes hero copy and images. Templates
  2 and 3 additionally expose their own extra section fields. Templates 4–10
  reuse Template 1's hero and announcement editor fields.
- Add product/category actions are owner-only. Products use Commerce's
  store-specific product form configuration and invalidate the catalog query
  after creation. Categories refresh the category query after creation.
- Existing product and category management remains in the merchant dashboard.
- Empty catalogs show empty states and owner actions, not invented products.

## Fixes from this audit

Atelier (ID 4) now displays the saved merchant hero description. New websites
retain onboarding phone, email and location even when their selected template
has no starter content. Existing contact aliases are personalized without
creating duplicate fields. This changes new website creation; it does not
rewrite existing merchant website content.

## Verification and limits

The storefront suite passes 130 tests. Its shopping matrix now runs under all
ten template identities: pricing/detail links, out-of-stock restrictions,
variant selection and quantity bounds, cart totals, custom-domain checkout
gating, COD validation, receipt recovery and suspended-store handling.
Templates 4–10 intentionally reuse Template 1's commerce components; the matrix
checks those shared components under each identity, not ten separate commerce
implementations. Distinct homepage tests check merchant images, copy and
category links for IDs 5–10; Atelier has its own content regression test.

Template-specific suites for IDs 1, 2 and 3 pass 106, 126 and 138 tests.
Core's creation/personalization tests pass 24 tests, including fixture-based
website provisioning for IDs 1–10 with Store linkage, subscription, contact
content and Commerce projection. The shared storefront production build passes.
These tests use mocks/isolated fixtures; no customer orders or payment charges
were created by this audit.

A live signup → upload → product/category creation → purchase journey has not
been executed for each of the ten templates. Real payment-provider completion
and production hosting are not certified by this audit. Switching an existing
website to another template and persisting arbitrary homepage section ordering
remain unavailable in the current API; preview controls keep that distinction
visible. Store review APIs are also unavailable, and new templates show an
explicit unavailable state rather than fabricated ratings.
