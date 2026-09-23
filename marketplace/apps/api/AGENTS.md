# KhmerCraft API

Express 5 + Mongoose 9 + TypeScript. **This is not a Next.js app** — it was
scaffolded from `create-next-app` and later converted, so ignore any leftover
Next.js instincts. There is no `app/` router, no server components, no
`next.config.ts`.

## Running

Run every command from `apps/api` — `src/index.ts` loads `.env.local` relative
to the working directory, so starting the process from the repo root silently
loads no environment and dies on the `JWT_SECRET` assertion.

```
npm run dev        # nodemon + ts-node, port 3001
npm test           # vitest, uses mongodb-memory-server (no live DB needed)
npm run build      # tsc -> dist/
npm run seed:auth  # seed auth test users
```

Swagger UI is mounted at `/api-docs` and the raw document at `/api-docs.json`,
both disabled when `NODE_ENV=production`.

## Layout

```
src/
  index.ts          entry: dotenv -> assertEnv -> dbConnect -> listen
  app.ts            createApp(): middleware chain + route mounting
  config/env.ts     all env access goes through this, via getters
  errors/           AppError
  middleware/       authenticate, authorize, validate, security, error-handler
  modules/<name>/   <name>.routes.ts | .controller.ts | .service.ts | .validation.ts
  routes/           older flat routes (products) — new work goes in modules/
  docs/openapi.ts   hand-maintained OpenAPI document
models/             Mongoose schemas
lib/mongodb.ts      dbConnect()
```

`createApp()` is exported separately from `index.ts` so tests can mount the app
with supertest without opening a port or a real database connection.

## Conventions

**Errors.** Throw `new AppError(status, message, CODE, details?)`. Never call
`response.status(...).json(...)` for an error path — let it reach
`errorHandler`, which owns the response shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }
```

Duplicate-key Mongo errors (11000) are already mapped to 409 `EMAIL_IN_USE`.
Unrecognised errors log server-side and return a generic 500 — do not leak
internals in the message.

**Validation.** Every body-taking route gets `validate(zodSchema)` from
`middleware/validate`. It replaces `request.body` with the parsed result, so
controllers can trust their input. Schemas live in `<module>.validation.ts`.

**Env.** Read through `env` in `config/env.ts`, never `process.env` directly.
Add new settings as getters there, and touch anything required inside
`assertEnv()` so a misconfigured environment fails at boot instead of at first
request. `jwtSecret` deliberately throws rather than falling back to a default.

**Route ordering matters.** In `app.ts`, `notFound` and `errorHandler` must stay
last. Rate limiters (`middleware/security`) are applied per-route for auth
endpoints and globally via `apiRateLimit`.

**Controllers stay thin.** Business logic and all database access belong in
`<module>.service.ts`.
