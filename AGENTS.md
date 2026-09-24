# Rentify repository guide

This repository is becoming one platform with two ways for a merchant to sell:
directly in the shared marketplace, or through a customizable storefront that
also lists its products in the marketplace. Read `README.md` and `docs/README.md`
before changing cross-service behavior.

## Current code and target direction

- `rentify-server/` is the current core API for identity, websites, templates,
  packages, subscriptions, staff, and deployment.
- `ecommerce-server/` is the current commerce API for catalog, inventory, carts,
  checkout, orders, invoices, POS, payments, and usage billing.
- `rentify-frontend/` contains the React/Vite merchant, auth, marketing, and
  storefront applications.
- `marketplace-frontend/` is the active Angular web app for Rentify's shared
  marketplace UI.
- `docs/reference/legacy-khmercraft-api/` contains the archived KhmerCraft
  Express/Mongoose API and legacy documentation as reference code only; do not
  run it or add MongoDB to the Rentify platform.
- `docs/current-rentify-architecture.md` records the present service map and
  migration constraints backed by the code.
- `docs/platform-architecture.md` describes the product direction and labels
  technical boundaries that still need validation.
- `docs/migration-plan.md` tracks the work needed to reach that target.
- `docs/notes.md` records open questions and investigation findings.

## Architecture rules for new work

1. Rentify is the backend authority. Move marketplace capabilities into the
   appropriate Rentify API; do not create a second authoritative product,
   inventory, order, payment, or merchant database in `docs/reference/legacy-khmercraft-api`.
2. A merchant/store exists independently of a website. Marketplace-only
   merchants must be able to list and sell without creating a storefront.
3. A storefront is an optional channel linked to a store. Products belong to
   the store; both the merchant storefront and central marketplace show the
   same canonical product, price, and stock state.
4. Store onboarding collects a primary store category. Product categories are
   separate and may be more specific. Storefront onboarding additionally
   chooses a template and creates a website linked to the store.
   Marketplace listing is enabled by default for storefront Stores, with a
   merchant Store-level opt-out and later per-product override. Seller
   approval still gates public marketplace selling. In local development,
   Core may approve pending sellers automatically after verified contact and
   primary category checks when `DEV_MARKETPLACE_AUTO_APPROVAL=true`.
5. Keep one identity and tenant authorization model across both onboarding
   paths. Do not equate `websiteId` with merchant or store identity.
6. Treat checkout, stock reservation, refunds, and seller settlement as one
   shared transaction domain. Document any temporary adapter explicitly.
7. Do not describe a planned capability as implemented. When a decision is
   settled or code changes behavior, update the relevant file under `docs/`.
8. Follow the migration plan's phase gates when changing ownership or moving
   live data. Keep one active writer per record type and preserve ID mappings,
   reconciliation reports, and rollback steps.

## Working in this repository

- Respect existing uncommitted work. Inspect `git status` before edits and do
  not overwrite unrelated changes.
- The archived `docs/reference/legacy-khmercraft-api/AGENTS.md` applies when reading or
  changing that legacy API. Its local conventions describe the existing
  Express/Mongoose code and do not override the target architecture above.
- Run the affected project's documented tests/builds for code changes. Root
  Docker setup is in `DOCKER.md`; service-specific verification is in each
  service's `TESTING.md`.
- Keep secrets and local `.env` files out of Git. Keep generated dependencies
  and build output out of commits.
