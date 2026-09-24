# KhmerCraft feature domains

Feature-owned UI is grouped by the user who uses it. Open a domain below to
see its routes and implementation folders.

- [User](./user/README.md) — buyer account, profile and order history
- [Seller](./seller/README.md) — seller dashboard functionality
- [Authentication](./authentication/README.md) — buyer and seller sign-in flows
- [Admin](./admin/README.md) — administrator-only functionality

Shared infrastructure stays in `../core`, and reusable presentational UI stays
in `../shared`. Storefront pages that are being reorganized separately remain
in `../pages` until their owning feature work is complete.

## Placement rule

New UI should go under the domain that owns the workflow:

```text
features/<domain>/<capability>/<screen>/
```

Do not place reusable API clients, guards, interceptors, or global state here;
those belong in `core`.
