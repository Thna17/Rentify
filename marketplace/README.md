# KhmerCraft — marketplace

The Angular buyer UI is being reused for Rentify's shared marketplace. Core
and Commerce in the parent repository are its only active APIs. MongoDB and
`apps/api` are not part of the development or launch runtime.

- `apps/web` — Angular 21, local dev server on 4201
- `apps/api` — inactive KhmerCraft reference implementation

## Current development setup

Start the parent repository's Core and Commerce services with its Docker
instructions, then install dependencies under `apps/web` and run `npm start`
there. The committed runtime config uses Rentify on normal Angular routes and
localhost Core/Commerce/Auth fallbacks. Supply real public origins in
`apps/web/public/rentify-preview-config.js` for any remote environment.

## Legacy reference

The old `apps/api` and Mongo-specific design notes document KhmerCraft's
previous implementation. They do not describe the active Rentify backend.

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
