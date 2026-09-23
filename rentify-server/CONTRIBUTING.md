# Contributing

`main` is protected release code; start all work from `develop`. Name branches
`feature/<scope>-<summary>` or `fix/<scope>-<summary>`. Keep each pull request
small, reviewable, and limited to one concern.

Run `npm run verify` before review and `npm run db:migrate:verify` against a
dedicated migrated test database when changing schema. Include migration order,
rollback notes, API contract changes, and test evidence in the PR. Require the
relevant owner from `OWNERSHIP.md` plus QA approval.

Never commit `.env`, tokens, passwords, customer exports, local databases,
Redis dumps, or build output. Add migrations; never alter an applied one. Do
not merge, rebase shared history, or discard another contributor's work without
their explicit approval.
