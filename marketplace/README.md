# KhmerCraft — marketplace

Cambodian local-first marketplace: buyer storefront, seller dashboard and the
API behind both.

- `apps/web` — Angular 21 (standalone components, signals), dev server on 4200
- `apps/api` — Express 5 + Mongoose 9 + TypeScript, dev server on 3001

## Setup

```bash
npm install
cd apps/api && npm install
cd ../web && npm install
```

Then create `apps/api/.env.local` from the template:

```bash
cd apps/api && cp .env.example .env.local
```

Fill it in — **ask the project owner for the values**, they are not in git:

| Variable | Notes |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | any 32+ character random string; `openssl rand -hex 32` |
| `SMTP_*`, `MAIL_FROM` | optional. Without them the app skips email entirely and creates accounts already-verified, so registration still works |

## Running

Both servers, from the repo root:

```bash
npm run dev
```

Or separately: `npm run dev:api` and `npm run dev:web`.

The API must be started from `apps/api` — `src/index.ts` loads `.env.local`
relative to the working directory.

## Tests

```bash
cd apps/api && npm test
```

154 tests, `mongodb-memory-server`, no live database needed.

## Layout

```
apps/api/src/modules/<name>/   routes | controller | service | validation
apps/api/models/               Mongoose schemas
apps/web/src/app/pages/        routed pages
apps/web/src/app/features/     seller, admin, authentication
apps/web/src/app/components/   shared UI
apps/web/src/app/admin/        admin area (currently mock data, see below)
```

See `apps/api/AGENTS.md` for the backend conventions — error handling,
validation and where new work belongs.

## Known issues

- **`/api/products` is slow.** Product images are stored as base64 inside the
  documents, and the `thumbnail` field holds a full-size copy because the
  resize step uses Jimp, which cannot decode webp and silently returns its
  input unchanged. A page of 60 products is ~3MB. The fix is to serve images
  as files and store URLs.
- **The admin area under `apps/web/src/app/admin` renders hardcoded data.**
  `admin-data.service.ts` has no HTTP calls at all. The UI is real, the
  numbers are invented, and it needs wiring to live endpoints before anyone
  relies on it.
