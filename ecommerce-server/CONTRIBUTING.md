# Contributing

`main` is protected release code; create `feature/<scope>-<summary>` or
`fix/<scope>-<summary>` branches from `develop`. Keep tenant authorization,
payment, and order-state changes isolated from unrelated refactors.

Run `npm run verify` before review. For model changes also run
`npm run db:migrate:verify` against `rentify_commerce_test`. PRs must state
tenant impact, request/response changes, migration/rollback notes, and tests.
Obtain the relevant owner and QA review listed in `OWNERSHIP.md`.

Never commit `.env`, payment credentials, customer data, databases, Redis
dumps, or generated build files. Add a new migration rather than modifying an
applied migration. Never discard or merge another teammate's work without their
explicit approval.
