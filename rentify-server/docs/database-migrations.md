# Database migrations

Rentify Server uses the in-repository Sequelize migration runner. Application
startup does **not** create, alter, or seed schema.

## Commands

```sh
npm run db:migrate          # apply unapplied migrations once
npm run db:migrate:verify   # fail if a migration is pending (CI command)
```

Run `db:migrate` in the deployment job before starting the Core API. The first
baseline migration uses `sync({ alter: false })` only to create missing tables;
it never drops columns, changes existing columns, or deletes local data.
Later migrations are additive and recorded in `SequelizeMeta`.

## Safe release procedure

1. Take and verify a database backup.
2. Deploy code that remains compatible with both old and new schema.
3. Run `npm run db:migrate` once, using the release database credentials.
4. Run `npm run db:migrate:verify` and application health checks.
5. Start or restart the API.

For MySQL, an example backup is `mysqldump --single-transaction --routines
--triggers "$DB_NAME" > rentify-core.sql`. Restore to an empty recovery
database first with `mysql "$DB_NAME" < rentify-core.sql` and validate it
before any production restore.

## Rollback

Migrations are forward-only because destructive automatic rollback can lose
merchant data. If a release fails, roll back application code only when it is
schema-compatible. Otherwise restore the verified pre-migration backup, or add
a new corrective migration. Never edit `SequelizeMeta` manually.

## Adding a migration

Create an ordered `YYYYMMDD_NNN_description.js` file in `src/migrations/` with
an `up({ sequelize, queryInterface })` function. Use explicit names for
indexes and constraints, guard idempotent additions with schema inspection,
and validate/backfill existing rows before adding `NOT NULL` or `UNIQUE`.
