# Quality gate

Run `npm run verify` before opening a pull request. This replaces the former
placeholder test command with syntax, unit, tenant-isolation integration,
migration, build, and secret-scan checks.

Tests must use a dedicated database such as `rentify_commerce_test` and
`NODE_ENV=test`; migrations create its schema. Seed two merchants, two
websites, one staff member with POS permission, one without it, a catalog,
and a customer. Use test-only KHQR configuration values. Never use a shared
development or production database for automated tests.
