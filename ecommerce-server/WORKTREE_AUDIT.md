# Worktree audit — 2026-09-23

No files were staged, removed, reset, or merged during this audit. The branch
is `develop` with 72 pre-existing modified/untracked entries.

## Intentional feature/configuration work — review as grouped PRs

- **Commerce and tenant safety:** modified `app.js`, `server.js`, all changed
  product/cart/category/order/invoice/merchant/payment/website routes and
  controllers, `middlewares/{authMiddleware,storeValidationMiddleware}.js`,
  plus untracked `middlewares/{requireWebsiteAccess,requireServiceToken,opsAuth}.js`.
- **Payments and fulfilment:** modified payment core/strategies, Payment model,
  payment configuration controller, stock service, and untracked payment,
  fulfilment, billing, pricing, and verification services/utilities.
- **Usage/operations:** untracked usage/ops controllers, routes, workers,
  billing models, and deployment listener.
- **Database/config:** modified models/index/config and untracked `migrations/**`,
  models, cookie/Redis/service URL config.
- **Quality/docs:** `package.json`, `.env.example`, `API.md`, `SECURITY.md`,
  `TESTING.md`, `docs/**`, `.github/workflows/quality.yml`, `scripts/**`, and `test/**`.

## Generated/local/secrets classification

No untracked build output, local database, Redis dump, or `.env` credential
file was found. Runtime data (`*.db`, `*.sqlite`, `dump.rdb`, `*.rdb`, Redis
folders) is now ignored. `.env.example` is source and must contain names only.
