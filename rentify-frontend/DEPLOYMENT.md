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
cd rentify-frontend && npm run dev:ecommerce-template-1
```

Template 2 uses `npm run dev:ecommerce-template-2`. Development defaults are Core `http://localhost:3001`, Commerce `http://localhost:4001`, Auth `http://localhost:4300`, Merchant `http://localhost:4400`, Marketing `http://localhost:4200`, Marketplace `http://localhost:4500`, and Template 1 `http://localhost:4700`.

## Staging and production

Copy each service's `.env.example` to its private environment manager and supply all URL values. Do not use localhost outside development. Build a storefront with its public variables set:

```sh
cd rentify-frontend
npx vite build --config apps/templates/ecommerce/ecommerce-template-1/vite.config.ts
npx vite build --config apps/templates/ecommerce/ecommerce-template-2/vite.config.ts
```

Core's Vercel deployment service deploys `Thna17/rentify-client` from `main` (the current `rentify-frontend` Git remote). Configure `VERCEL_GIT_REPOSITORY_ID` from Vercel for that repository. Template ID `1` builds `ecommerce-template-1` into `dist/apps/templates/ecommerce/ecommerce-template-1`; Template ID `2` builds `ecommerce-template-2` into `dist/apps/templates/ecommerce/ecommerce-template-2`. It injects `WEBSITE_ID`, `TEMPLATE_ID`, and the seven public Vite URL variables.
