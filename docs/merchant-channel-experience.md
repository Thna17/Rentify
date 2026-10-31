# Marketplace and storefront merchant experiences

## Settled product direction — 29 October 2026

The merchant experiences are distinct. A marketplace seller is not a simplified
storefront owner waiting to create a website. The shared Rentify platform must
support both paths as complete experiences.

| Area | Marketplace seller | Storefront merchant |
| --- | --- | --- |
| Reference | KhmerCraft seller dashboard | Angkoro storefront and its merchant dashboard |
| Start | Account, verified contact, Store details and primary category | Same Store identity, then template and website/domain setup |
| Primary task | Create products; published, eligible listings appear in the shared marketplace automatically | Manage a branded website plus the business behind it |
| Navigation | Marketplace overview, products, orders, inventory and relevant seller/account tools | Products, orders, customization, template, domain/publishing, customers, staff/roles and supported business tools |
| Website | Not required | Optional Store channel, created for this path |
| Page arrangement | Platform controls marketplace catalog layout and discovery | Merchant customizes the storefront within supported templates |

Seller approval, product publication and stock still gate public marketplace
selling. “Automatically listed” must not bypass those checks. Storefront Stores
also list in the marketplace by default, subject to the existing opt-out rules.
Staff, inventory and order permissions must continue to be enforced by the APIs.

## Implementation boundaries

- Copy and adapt the reference UI and workflows into Rentify, connecting them to
  Core and Commerce contracts. Do not copy a reference application's independent
  identity, database, inventory writer or payment authority into the platform.
- Store remains the merchant identity. Website and domain configuration belong
  to the optional storefront channel, not marketplace onboarding.
- A merchant using both channels can switch between their distinct workspaces.
  A combined dashboard must not replace either channel's complete experience.
- Do not call an unconnected reference screen or placeholder an implemented
  feature. Check each action against a working Rentify endpoint and permissions.

## Current observations, not completion claims

- Rentify already has channel-aware sidebar definitions in
  `rentify-frontend/apps/core/merchant/src/config/dashboard-tabs.jsx`, filtering in
  `layouts/dashboard/Layout.jsx`, and a `context/ChannelContext.tsx`. The default now opens storefront for a merchant with a website, otherwise
  marketplace when enabled. Explicit saved choices are preserved. This is partial
  channel support, not evidence of parity with either reference.
- The original marketing Home page has been restored in the current checkout;
  the earlier full-page redesign was rejected. The user's earlier requested
  visual alignment concerned the footer.
- Reference seller UI located at
  `/Users/seouldorito/Desktop/Project /Project-IC-Internship/khmer-craft/apps/web/src/app/pages/seller-dashboard/seller-dashboard.ts`,
  alongside `apps/web/src/app/features/seller/`.
- Another older Next.js KhmerCraft checkout exists at
  `/Users/seouldorito/Desktop/Project /KhmerCraft`; do not silently substitute its
  admin UI for the fuller Angular seller reference.
- `/Users/seouldorito/Desktop/Project /Angkoro` currently contains
  `Angkoro-Backend`. No storefront frontend source was found in
  that folder. The frontend folder or reference URL is required to reproduce
  Angkoro accurately. Its backend is reference material, not a new Rentify API.

## Remaining work

Locate the intended Angkoro frontend; inventory both references screen by screen;
map each action to existing Rentify routes, APIs and capabilities; implement the
two experiences in bounded changes; verify onboarding, product publication,
domain/customization, staff permissions and mobile layouts with suitable test
data. Preserve current uncommitted work in these areas and the migration plan's
ownership gates. No reference import or data migration has been completed by
this document.

## Folder inspection: feature references

Angkoro's `src/tenants/store-feature-flags/constants/feature-catalog.ts` and
controller modules provide a usable feature inventory without its frontend.
These inform information architecture; they do not establish Rentify parity.

| Angkoro area (under Angkoro-Backend/src) | Rentify mapping |
| --- | --- |
| tenants/commerce/products (variants, media, import/export) | Existing Products screens; import/export needs separate verification |
| tenants/commerce/categories and inventory | Existing catalog/product capabilities; no standalone route assumed |
| tenants/commerce/orders | Existing Orders and Marketplace Orders |
| tenants/commerce/slides | Storefront content reference; no new Rentify slideshow capability claimed |
| tenants/store-settings | Existing Store management/customization |
| tenants/store-members, store-invitations, store-member-roles, store-member-permissions | Existing Staff & roles, with owner/API permission checks |
| billing/payments, plans, subscriptions | Existing Payments/Billing screens; gateways need independent verification |
| billing/wallet and payouts | No matching Rentify feature claimed; settlement requires separate validated work |

Custom domains, custom themes, marketing campaigns and several integrations are
commented out in Angkoro's feature catalog. Their labels do not establish active
features. Rentify's domain and theme behavior has its own release constraints.

The default merchant workspace now opens storefront when a website exists,
otherwise marketplace when enabled, rather than automatically combining both.
An explicit saved channel selection remains respected. Four policy regression
tests cover defaults, explicit choices and unavailable channels. Existing dirty
sidebar and onboarding work is preserved. No complete reference UI copy or
backend/data migration has been performed.

### Marketplace appearance (implemented October 29, 2026)

Marketplace stores use one shared public layout. Owners choose a curated accent color in Settings → Account → Marketplace color; Core persists `Stores.marketplaceColor`, validates its palette on `PATCH /api/stores/mine`, and exposes it through public store reads. The marketplace applies the color to store-page accents and buttons, without changing typography or layout. This setting works for marketplace-only stores and does not update Website templates or storefront themes. Storefronts retain their existing full customization. Apply Core migration `20261029_019_marketplace_store_color.js` before deploying the model change.

### Merchant categories and channel publication — confirmed product requirement

Confirmed October 29, 2026. This section records intended behavior, not completed implementation.

- Merchant-created categories belong to the Store and are unique within that merchant's catalog; different merchants may use the same category names. They remain separate from the platform's marketplace classification taxonomy and the onboarding primary Store category.
- Merchants can create and manage catalog categories from All channels. Category creation must not require a storefront Website.
- Merchants independently select which categories to publish and display on their marketplace Store page and on their storefront. Creating a category does not automatically publish it on every channel.
- Visitors see only the categories published for the channel they are visiting. For example, publishing three marketplace categories shows those three on the marketplace Store page; the storefront can display a different selection.
- Category display selection does not grant product publication, bypass seller approval, or change canonical product price/stock. Product visibility and purchase eligibility remain governed by shared channel publication rules.
- Marketplace customization remains limited to its shared layout, accent color, and supported content/category visibility controls. Storefronts retain full template/theme customization.

Implementation gap: the existing Commerce Category model still requires `websiteId` and does not define independent category publication flags for these two channels. Store-owned category migration and channel-specific public reads need implementation under the migration phase gates; this requirement must not be described as already working.
