# Rentify Platform Administration (`admin-frontend`)

Dedicated standalone Angular 21 frontend application providing the unified Rentify Platform Administration dashboard on port 4800 (`http://localhost:4800`).

## Architecture & Responsibilities

- **Unified Platform Administration**:
  - **Platform & Storefront Operations**: Websites hosting management, storefront templates catalog, merchant subscription packages, and platform user administration.
  - **Marketplace Operations**: Sellers verification & approval workflows, product catalog & moderation, marketplace departments/categories, orders tracking, customer reviews, disputes & complaints, and reports.
  - **Finance**: Payment collections, platform ledger & commission breakdown, seller settlement payouts.
- **Port**: Serves on port `4800` (`http://localhost:4800`).
- **Authentication**: Protected by `adminGuard` requiring the `ADMIN` role. Unauthenticated requests are redirected cleanly to Rentify Auth (`http://localhost:4300/?returnUrl=http://localhost:4800`).
- **Styling**: Tailwind CSS + Rentify Admin design system tokens.

## Development

```sh
# Run locally on port 4800
npm start

# Run unit tests
npm test

# Build production bundle
npm run build

# Type check
npm run typecheck
```

## Docker

Runs in Docker Compose as the `admin` service on port 4800.
