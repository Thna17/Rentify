# Rentify

Rentify is a SaaS commerce platform for Cambodian SMEs. It combines a merchant dashboard, customizable storefront templates, POS, invoicing, staff management, KHQR-ready checkout, and the platform services that support them.

## Repository layout

- `rentify-frontend` — React/Vite applications: marketing, authentication, merchant workspace, and storefront templates.
- `rentify-server` — Core API for identity, merchants, websites, packages, subscriptions, and deployment orchestration.
- `ecommerce-server` — Commerce API for catalog, carts, checkout, orders, inventory, invoices, POS, and payments.
- `compose.yaml` — local Docker development stack.

## Quick start

For Docker setup, required environment variables, local commands, and troubleshooting, see [DOCKER.md](DOCKER.md).

Copy each service's `.env.example` to a local `.env` and supply your own development credentials. Never commit `.env` files or production credentials.

## Git workflow

`main` is the release branch. Create feature work from `develop` using `feature/<name>` or `fix/<name>`, open a pull request, and run the documented verification commands before review.
