# Worktree audit — 2026-09-23

No files were staged, removed, reset, or merged during this audit. The branch
is `feature/deployment` with 59 pre-existing modified/untracked entries.

## Intentional feature/configuration work — review as grouped PRs

- **Core identity/security:** modified `src/app.js`, `src/config/{corsConfig,sessionConfig}.js`,
  `src/middlewares/{auth,verifyStaffToken}.js`, `src/routes/{adminRoute,authRoutes,packageRoutes,websiteRoutes}.js`,
  `src/services/authService.js`, and untracked `src/config/{cookieConfig,runtimeUrls}.js`,
  `src/middlewares/{authorization,opsAccess,requireServiceToken}.js`, and `src/utils/{refreshTokenHash,returnUrlPolicy,timezone}.js`.
- **Website/deployment/payments:** modified website, deployment, dashboard,
  notification, payment, staff controllers/services/models and untracked
  operations controllers, routes, jobs, services, and models.
- **Database:** modified `src/config/initDB.js`, `src/models/index.js`, and all
  untracked `src/migrations/**`, `OutcomeContract.js`, and `ReminderLog.js`.
- **Quality/docs:** `README.md`, `package.json`, `.env.example`, `SECURITY.md`,
  `TESTING.md`, `docs/**`, `.github/workflows/quality.yml`, `scripts/**`, and `test/**`.

## Generated/local/secrets classification

- `dump.rdb` is a Redis runtime dump: **generated/local; do not stage**. It is
  ignored explicitly.
- No untracked `.env` file, database file, or build output was found. `.env`
  examples contain names only and are reviewable source.
