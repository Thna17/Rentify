# Rentify storefront template starter

Copy this directory to `apps/templates/ecommerce/ecommerce-template-N` when
creating a storefront. Templates import only `@rentify/storefront` and
`@rentify/storefront/api`; they must not import merchant pages, admin routes,
or the dashboard-wide `@rentify/apis` barrel.

## Contract

- `StorefrontWebsite`: tenant website data and theme tokens
- catalog and product hooks: `@rentify/storefront/api`
- cart and checkout routes: `storefrontRoutes`
- customer session: customer API plus host-scoped authentication cookie
- analytics: `trackStorefrontEvent`

Use `StorefrontApp.tsx` as the provider skeleton. Keep visual components in
`src/components` and template-specific routes in `src/routes`; do not fork the
shared contract.
