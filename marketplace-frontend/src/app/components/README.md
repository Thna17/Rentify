# KhmerCraft reusable components

Reusable UI is grouped first by audience, then by capability.

- [User components](./user/README.md) — storefront, product discovery, search and checkout
- [Seller components](./seller/README.md) — seller-only dashboard UI
- [Shared components](./shared/README.md) — primitives used by more than one role

Platform administration has moved to the standalone `admin-frontend` service on port 4800.

Feature screens belong in `../features`; reusable components used by two or
more screens belong here. API clients and application state remain in
`../core`.
