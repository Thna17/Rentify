# Database migrations

E-commerce uses the in-repository Sequelize migration runner. Server startup
never calls `sequelize.sync({ alter: true })` and never changes schema.

## Commands

```sh
npm run db:migrate
npm run db:migrate:verify
```

Run `db:migrate` once during each deployment, before `npm start`; run
`db:migrate:verify` in CI and after deployment. Migrations are recorded in
`SequelizeMeta`. The baseline uses `sync({ alter: false })` only to create
missing model tables, preserving all existing development data. The old SQL
file in `migrations/` is historical; JavaScript migrations are the sole active
workflow.

## Existing local database

Back up first, then run `npm run db:migrate`. The tenant-key migration stops
with a clear error if `WebsiteData.websiteId` is null or duplicated. Backfill
or merge those records deliberately, then retry; it never deletes data.

## Backup and restore

Before any migration, create a MySQL backup such as:

```sh
mysqldump --single-transaction --routines --triggers "$DB_NAME" > rentify-commerce.sql
```

Test restoration to a separate database before production changes:

```sh
mysql "$RECOVERY_DB_NAME" < rentify-commerce.sql
```

## Rollback

Migrations are forward-only. Roll back code only if compatible with the
migrated schema; otherwise use a corrective migration. A data/schema restore
requires the verified backup. Do not delete rows from `SequelizeMeta` or run
schema-altering startup commands.

## Rules for new migrations

Use ordered `YYYYMMDD_NNN_description.js` files with `up({ sequelize,
queryInterface })`. Add indexes for tenant and state queries, make idempotency
keys unique, use transactions for related state changes, and validate existing
data before adding a foreign key, unique constraint, or `NOT NULL` column.
