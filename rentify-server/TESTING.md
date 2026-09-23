# Quality gate

Run `npm run verify` before opening a pull request. It syntax-checks the API,
runs unit and tenant-isolation integration tests, verifies migrations, builds
the server entry point, and scans tracked source for common credential formats.

Integration tests use in-memory fixtures and never point at a developer or
production database. For manual API smoke testing, create a dedicated MySQL
database named `rentify_core_test`, set `NODE_ENV=test`, and run migrations
before starting the service. Use disposable merchant email addresses and test
KHQR values only; never copy production credentials into test data.
