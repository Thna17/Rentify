# Worktree audit — 2026-09-23

No files were staged, removed, reset, or merged during this audit. The branch
is `hotfix/1.1.8` with 159 pre-existing modified/untracked entries.

## Intentional feature/configuration work — review as grouped PRs

- **Identity and UI:** `apps/core/auth/**`, `apps/core/marketing/**`,
  `apps/core/merchant/**`, including the untracked merchant `src/app/features/{ops,usage}/`
  and `src/services/{opsApi,usageApi}.ts`.
- **Storefront platform:** both `apps/templates/ecommerce/ecommerce-template-{1,2}/**`,
  `apps/templates/ecommerce/template-starter/**`, `libs/storefront/**`, and
  `libs/{cart,checkout,customer-order,order-confirmation,profile}/**`.
- **Shared API/platform:** `libs/apis/**`, `libs/shared/**`, `libs/utils/**`,
  `tools/**`, `src/runtime-globals.d.ts`, `tsconfig.base.json`, and `package.json`.
- **Release/quality documentation:** `.env.example`, `.nvmrc`, `DEPLOYMENT.md`,
  `TESTING.md`, `.github/workflows/quality.yml`, `e2e/smoke.test.mjs`, and
  `libs/shared/src/ui/button.test.tsx`.

## Needs an explicit owner decision before staging

- `apps/templates/ecommerce/ecommerce-template-1/src/storefront-{api,store,utils}.js`:
  local compatibility scaffolding; the shared `libs/storefront/` contract may
  make it redundant. Do not stage both approaches without platform review.
- `package-lock.json`: a 1.1 MB dependency lockfile. It is source-controlled
  material, not runtime output, but must be staged only with the dependency
  change it represents.

## Generated/local/secrets classification

No untracked build output, database, Redis dump, or `.env` credential file was
found. `dist/`, caches, databases, dumps, and `.env` local variants are ignored.
Do not force-add ignored runtime files.
