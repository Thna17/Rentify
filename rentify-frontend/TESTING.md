# Quality gate

Run `npm run verify` with the six public URL variables from `.env.example`.
It runs linting, TypeScript validation, shared UI tests, smoke tests, all
production builds, and a source secret scan.

`npm run test:integration` is safe by default: the HTTP storefront smoke test
is skipped unless `STOREFRONT_SMOKE_URL` is provided. Point it only to an
ephemeral local/staging store seeded with a test merchant, product, customer,
cart, and KHQR test configuration. Do not provide production credentials.
