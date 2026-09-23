# Contributing

Use `main` only for released, protected code. Branch daily work from `develop`:
`feature/<scope>-<summary>` for product work and `fix/<scope>-<summary>` for
defects. Keep one concern per pull request.

Before requesting review, run `npm run verify` with the documented public URL
variables. Describe UI/API contract changes, screenshots for visual changes,
and any follow-up migration/API dependency. Request review from every affected
area in `OWNERSHIP.md`; do not self-merge.

Never commit `.env` files, credentials, production exports, databases, Redis
dumps, or build output. Use `.env.example` for variable names only. Do not edit
migrations after another environment has applied them; create a new migration.
