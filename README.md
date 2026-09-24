# Rentify

Rentify is a SaaS commerce platform for Cambodian SMEs. It combines a merchant dashboard, customizable storefront templates, POS, invoicing, staff management, KHQR-ready checkout, and the platform services that support them.

The platform is expanding into a shared marketplace. Merchants will be able to
sell directly in the marketplace without a storefront, or create a storefront
whose products also appear in the marketplace. The integration architecture is
planned in [docs/](docs/README.md). Core now has an initial Store identity and
Website linkage and Commerce has Store-keyed catalog and COD checkout APIs.
Existing Rentify Stores and Products are the marketplace data source; there is
no independent KhmerCraft catalog to import for launch. Store listings default
on but public visibility still requires seller approval and valid categories.
The marketplace buyer UI has a disabled Rentify preview; normal Angular routes
still use the legacy API. Migration and release gates remain in progress.

## Repository layout

- `rentify-frontend` — React/Vite applications: marketing, authentication, merchant workspace, and storefront templates.
- `rentify-server` — Core API for identity, merchants, websites, packages, subscriptions, and deployment orchestration.
- `ecommerce-server` — Commerce API for catalog, carts, checkout, orders, inventory, invoices, POS, and payments.
- `marketplace` — relocated KhmerCraft Angular marketplace and legacy API,
  retained for UI development and migration into Rentify's backend.
- `docs` — architecture decisions, migration plan, and shared implementation notes.
- `compose.yaml` — local Docker development stack.

## Quick start

For Docker setup, required environment variables, local commands, and troubleshooting, see [DOCKER.md](DOCKER.md).

Copy each service's `.env.example` to a local `.env` and supply your own development credentials. Never commit `.env` files or production credentials.

## Git workflow

`main` is the release branch. Create feature work from `develop` using `feature/<name>` or `fix/<name>`, open a pull request, and run the documented verification commands before review.
