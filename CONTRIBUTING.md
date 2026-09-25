# Contributing to Rentify

Rentify is a unified repository. Read `AGENTS.md`, `README.md` and
`docs/README.md` before changing cross-service behaviour.

## Branches and pull requests

- `main` contains reviewed releases.
- `develop` is the integration branch.
- Create `feature/<scope>-<summary>` or `fix/<scope>-<summary>` from `develop`.
- Keep one concern per pull request. Do not mix formatting or generated output
  into a product change.
- Do not merge, rebase shared history, discard, or overwrite another
  contributor's uncommitted work without explicit approval.
- Request the reviewers selected by `.github/CODEOWNERS` and the role owners in
  `OWNERSHIP.md`. Authentication, payment, schema and deployment changes also
  require QA/security review.

## Local verification

Use Node 22 and npm 10 or newer. From a clean clone:

```sh
npm run install:all
npm run verify
```

Individual applications can be checked with `verify:core`, `verify:commerce`,
`verify:frontend`, `verify:marketplace` and `verify:admin`. Run
`npm run baseline:inventory` before preparing commits in a dirty worktree.

Schema changes require a new immutable migration. Run the service migration on
an isolated database and then run `db:migrate:verify`. Never edit an applied
migration or use production/customer data in tests.

## Pull-request evidence

Describe the problem, affected services and trust boundaries. Include test and
build output, API contract changes, screenshots for visual changes, migration
and rollback steps, and any deployment/configuration changes. Update the
relevant architecture document in the same pull request.

## Secrets and generated files

- Never commit `.env` files, passwords, tokens, payment credentials, customer
  exports, Cloudflare tunnel credentials, private keys, databases, Redis dumps,
  logs, dependencies, coverage or build output.
- Examples contain variable names only. Do not put usable values in them.
- Run `npm run secrets:scan` before review.
- Do not print credentials, auth bodies, personal information or payment
  configuration in logs, fixtures, screenshots or PR descriptions.

## Releases

Deploy only a clean reviewed commit. Record the Git SHA and image identifiers,
run migrations separately from seeding, verify health and smoke checks, and
keep a tested rollback and database restore path.
