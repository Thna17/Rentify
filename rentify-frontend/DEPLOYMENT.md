# Environment and deployment guide

## Public URL contract

All browser applications use these Vite variables: `VITE_RENTIFY_API_URL`, `VITE_ECOMMERCE_API_URL`, `VITE_AUTH_URL`, `VITE_MERCHANT_DASHBOARD_URL`, `VITE_MARKETING_URL`, `VITE_MARKETPLACE_URL`, and `VITE_STOREFRONT_ORIGIN`.

Server services use the same names without the `VITE_` prefix: `RENTIFY_API_URL`, `ECOMMERCE_API_URL`, `AUTH_URL`, `MERCHANT_DASHBOARD_URL`, `MARKETING_URL`, `MARKETPLACE_URL`, and `STOREFRONT_ORIGIN`.

`STOREFRONT_ORIGIN` must be the allowed production storefront origin (normally the custom storefront domain). Add it to both APIs' `CORS_ALLOWED_ORIGINS` when more than one storefront domain is used.

## Local development

In separate terminals:

```sh
cd rentify-server && npm run dev
cd ecommerce-server && npm run dev
cd rentify-frontend && npm run dev:auth
cd rentify-frontend && npm run dev:merchant
cd rentify-frontend && npm run dev:marketing
cd rentify-frontend && npm run dev:storefront
```

`dev:storefront` is the single storefront app. With `HOSTED_STOREFRONT_DOMAIN=localhost` and `HOSTED_STOREFRONT_DEV_PORT=4900` on both APIs (the Docker defaults), a published store opens at `http://<subdomain>.localhost:4900`, for example `http://aura-botanicals.localhost:4900`. Each template can still run alone for template work: `npm run dev:ecommerce-template-1` (`http://localhost:4700`) and `npm run dev:ecommerce-template-2` (`http://localhost:4600`). Development defaults are Core `http://localhost:3001`, Commerce `http://localhost:4001`, Auth `http://localhost:4300`, Merchant `http://localhost:4400`, Marketing `http://localhost:4200`, Marketplace `http://localhost:4500`, and Template 1 `http://localhost:4700`.

## Staging and production

Copy each service's `.env.example` to its private environment manager and supply all URL values. Do not use localhost outside development.

### Storefront hosting

Every published store is served by one deployment of the storefront app (`apps/storefront`). It reads the address the shopper opened, asks Core which Website that is, and loads that Website's template (Template 1 or Template 2, each its own chunk and stylesheet). Publishing in onboarding or the dashboard does not build anything: Core gives the Website a permanent subdomain from its name (`aura-botanicals`, then `aura-botanicals-2` if taken, `store-<id>` for names without Latin letters or reserved words), marks it live, and the store is reachable at once. Content and theme edits appear immediately because they load at runtime.

One-time setup:

1. Own a domain for stores, e.g. `rentifystore.shop`.
2. Create one Vercel project from this repository with **Root Directory** `rentify-frontend`, **Build Command** `npx vite build --config apps/storefront/vite.config.ts`, **Output Directory** `dist/apps/storefront`, Node.js 22, and the public `VITE_*` variables above. `rentify-frontend/vercel.json` already rewrites every path to `index.html`.
3. Add the wildcard domain `*.rentifystore.shop` to that project and create the DNS records Vercel shows.
4. Set `HOSTED_STOREFRONT_DOMAIN=rentifystore.shop` on Core and Commerce (and leave `HOSTED_STOREFRONT_DEV_PORT` unset). This enables subdomain lookup, publishing and credentialed CORS for `https://<store>.rentifystore.shop`.
5. Core and Commerce must be reachable on public HTTPS URLs; production refuses localhost URLs.

Redeploying the storefront project updates every store. Merchants' own domains are not connected automatically yet; see `docs/notes.md`.

Template builds on their own are still available for template development:

```sh
cd rentify-frontend
npx vite build --config apps/templates/ecommerce/ecommerce-template-1/vite.config.ts
npx vite build --config apps/templates/ecommerce/ecommerce-template-2/vite.config.ts
```
