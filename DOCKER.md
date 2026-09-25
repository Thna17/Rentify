# Rentify local Docker environment

Docker Compose starts the complete local Rentify stack with isolated MySQL and Redis volumes:

- Core API: `http://localhost:3001`
- E-commerce API: `http://localhost:4001`
- Marketing: `http://localhost:4200`
- Auth: `http://localhost:4300`
- Merchant dashboard: `http://localhost:4400`
- Storefront Template 1: `http://localhost:4700`
- Storefront Template 2: `http://localhost:4600`
- Marketplace UI: `http://localhost:4500`
- MySQL (Host): `localhost:3307` (mapped to internal `3306`)
- Redis (Host): `localhost:6379`

## First run

1. Install and start Docker Desktop.
2. From this directory, generate local development secrets and `.env`:

   ```sh
   chmod +x scripts/setup-docker-env.sh
   ./scripts/setup-docker-env.sh
   ```

3. Build and start every service:

   ```sh
   docker compose up -d
   ```

   *(Or use `docker compose up --build -d` when rebuilding images).*

The database migration jobs automatically run to completion before the API services start. Backend code changes reload automatically via Node watch mode, and frontend Vite changes hot-reload in real-time.

## Everyday commands

```sh
# Start in background
docker compose up -d

# Check status of all containers
docker compose ps

# View service logs
docker compose logs -f core-api
docker compose logs -f ecommerce-api

# Run quality gates / tests inside containers
docker compose exec core-api npm test
docker compose exec ecommerce-api npm test
docker compose exec marketing npm run test

# Stop services while keeping database data intact
docker compose down
```

To reset and wipe the local Docker databases and Redis data completely, run `docker compose down -v`.

## Default Seeded Accounts & Data

Running `docker compose up -d` automatically applies all migrations and seeds full demo data:

| Role | Email | Password | Access / Notes |
| :--- | :--- | :--- | :--- |
| **Merchant** | `merchant@rentify.local` | `Merchant@12345` | Store owner for *Aura Botanicals* (preconfigured products, orders, categories) |
| **Admin** | `admin@rentify.local` | `Admin@12345` | Platform Administrator |
| **Staff** | `staff@rentify.local` | `Staff@12345` | Store staff with POS and order management permissions |
| **Customer** | `emily.customer@example.com` | N/A | Sample store customer with active order history |

### What's pre-seeded:
- **Packages**: Free Trial, Growth, and Enterprise subscription tiers.
- **Templates**: Skin Care Template 1 (`:4700`) and Technology Template 2 (`:4600`).
- **Store & Products**: *Aura Botanicals* skincare store with 6 high-definition products, 4 categories, inventory counts, and price tiers.
- **Transactions & Orders**: Sample completed & pending KHQR orders, invoices, and automated usage aggregation events.

To re-run seeding manually at any time:
```sh
./scripts/seed-data.sh
# Or inside containers:
docker compose exec core-api npm run db:seed
docker compose exec ecommerce-api npm run db:seed
```

## Secrets and external integrations

`.env.docker` / `.env` are local-only and contain generated development secrets. They do not contain production Cloudinary, Vercel, Google, SMTP, Telegram, ABA, or Bakong credentials. Add those only when you need to test that specific integration; never commit `.env` or `.env.docker`.

Product image uploads read `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
`CLOUDINARY_API_SECRET` from `rentify-server/.env`. Docker passes that file only
to the Core API container; these values are never injected into frontend builds.
After changing them, recreate Core API with
`docker compose up -d --force-recreate core-api`.

## Troubleshooting

- **Port in use**:
  - MySQL host port defaults to `3307` so it will not collide with native local MySQL running on `3306`. You can customize `MYSQL_HOST_PORT` in `.env`.
  - Redis runs on `6379`. If you have a local Homebrew Redis running, stop it (`brew services stop redis`).
- **Migrations & Seeds**: Database migrations and seeds run automatically during startup via `core-migrate` and `commerce-migrate`.
- **Fast clean rebuild**: `docker compose down && docker compose up -d --build`.
