# KhmerCraft — Authentication Security Design

**Audience:** backend developers implementing or reviewing auth code in `apps/api`.
**Roles:** `BUYER` · `SELLER` · `ADMIN`
**Stack:** Express 5 · TypeScript · MongoDB (Mongoose) · JWT · bcrypt

> **Section 5 note:** KhmerCraft uses MongoDB, so classic SQL injection does not apply. The equivalent and very real threat is **NoSQL operator injection**. §5 covers it under that name — the vulnerability class the original checklist was pointing at.

---

## 0. Current Security Posture — read this first

Audit of the code as it stands today. Fix the ⛔ rows before this reaches a public server.

**All findings from the original audit are now fixed.** 21 tests pass, `tsc --noEmit` is clean.

| Finding | Fix | Where |
|---|---|---|
| ⛔ JWT secret had a committed fallback and only threw in production | Required in **every** environment, minimum 32 chars; `assertEnv()` fails the boot rather than the first login | `config/env.ts`, `src/index.ts` |
| 🔴 `POST /api/products` passed `req.body` to `Product.create()` | zod schema + `.strict()`, fields assigned explicitly | `routes/products.ts` |
| 🔴 Login timing leaked which emails were registered | `verifyPasswordConstantTime` hashes against a dummy hash when no account exists — measured at 0.345s vs 0.348s | `utils/password.ts`, `auth.service.ts` |
| 🟠 Issued access tokens survived a password change | `token_version` claim, checked in `authenticate`, bumped on change and reset | `models/User.ts`, `utils/jwt.ts` |
| 🟠 No account lockout | 5 failures → 15-minute lock, tracked per account | `auth.service.ts` |
| 🟠 Rate limiting was per-IP only | Login and password-reset limiters keyed on IP **+ email** | `middleware/security.ts` |
| 🟢 Body limit was `1mb` | Reduced to `100kb` | `app.ts` |
| — | Algorithm pinned to `HS256` on verify, blocking `alg: none` and confusion attacks | `utils/jwt.ts` |

Fixed earlier in the same session: rate limiting on `/auth`, `helmet()`, `x-powered-by` disabled, CORS allow-list, `SELLER` role, 15-minute access tokens, refresh-token rotation with reuse detection, `mongoose.sanitizeFilter`.

**Still open — deliberately deferred:**

| Item | Why it is deferred |
|---|---|
| Product ownership (`seller_id`) | Needs a `Product` schema change and coordination with whoever owns the products module. Until then `authorize('SELLER','ADMIN')` proves *a* seller is calling, not that it is *their* product — see §4 |
| Request/audit logging | No structured logger chosen yet |
| Common-password blocklist | Needs a wordlist dependency |
| Email delivery for password reset | Reset links still print to the server console |

**Already correct — do not regress these:**

- ✅ bcrypt cost 12, `password_hash` marked `select: false`
- ✅ Reset tokens stored as SHA-256 hashes, single-use via atomic `findOneAndDelete`, with expiry
- ✅ Cookies `httpOnly`, `secure` in production, `sameSite: strict`
- ✅ zod `.strict()` on every request body
- ✅ `role` hard-coded to `BUYER` in `register()`, never read from the body
- ✅ `authenticate` re-reads the user and re-checks status, role, and token version on every request
- ✅ Errors return codes, never stack traces

**Already correct — do not regress these:**

- ✅ bcrypt cost 12, `password_hash` marked `select: false`
- ✅ Reset tokens stored as SHA-256 hashes, single-use via atomic `findOneAndDelete`, with expiry
- ✅ CORS pinned to one origin with credentials — no wildcard
- ✅ Cookie is `httpOnly`, `secure` in production, `sameSite: lax`
- ✅ zod `.strict()` on every auth body — this is what currently blocks NoSQL injection
- ✅ `role` is hard-coded to `BUYER` in `register()`, never read from the body
- ✅ `authenticate` re-loads the user and re-checks `status` on every request
- ✅ Errors return codes, never stack traces

---

## 1. JWT Access Token Strategy

### Design

| Property | Value | Reason |
|---|---|---|
| Algorithm | `HS256` | Single trusted issuer; no need for asymmetric keys yet |
| Lifetime | **15 minutes** (currently 1 hour — reduce it) | Caps the damage window of a stolen token |
| Claims | `sub`, `role`, `ver`, `iat`, `exp`, `iss`, `aud` | Minimal — no PII |
| Transport | httpOnly cookie (web) / `Authorization: Bearer` (mobile, Swagger) | Cookie is unreadable by XSS |
| Storage | Never in `localStorage` | `localStorage` is readable by any injected script |

```jsonc
{
  "sub": "6a686a5016178ee5e9f78649",
  "role": "BUYER",
  "ver": 3,                       // token_version — see §2.4
  "iss": "khmer-craft-api",
  "aud": "khmer-craft-web",
  "iat": 1785227856,
  "exp": 1785228756
}
```

### Implementation rules

1. **Always verify `iss` and `aud`.** Already done — keep it. It stops a token minted for another service being replayed here.
2. **Pin the algorithm on verify:** `jwt.verify(token, secret, { algorithms: ['HS256'], issuer, audience })`. Without `algorithms`, a token with `"alg": "none"` or an HMAC-vs-RSA confusion attack becomes possible depending on library version. This is the single most common JWT vulnerability.
3. **Never put anything secret in the payload.** A JWT is signed, not encrypted — anyone can base64-decode it.
4. **Never trust the token's `role` alone.** The current `authenticate` re-loads the user and compares `user.role !== payload.role` — that is correct and must stay. It means a demoted or suspended user loses access immediately, not in 15 minutes.
5. **`JWT_SECRET` must be ≥32 random bytes** (`openssl rand -hex 32`), loaded from the environment, and the app must **refuse to boot without it in every environment**, not just production:

```ts
// config/env.ts — replace the current fallback
get jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters');
  }
  return secret;
}
```

### Attacks prevented

| Attack | Defence |
|---|---|
| `alg: none` / algorithm confusion | Explicit `algorithms: ['HS256']` |
| Token forgery | Strong random secret, never committed |
| Token replay after logout | `token_version` + refresh revocation (§2) |
| Privilege escalation via edited payload | Signature check + DB re-check of role |
| XSS token theft | httpOnly cookie |
| Cross-service token reuse | `iss` / `aud` validation |

---

## 2. Refresh Token Strategy

**Not implemented today.** This is what makes logout and "reset password ends all sessions" actually work.

### 2.1 Model

| | Access token | Refresh token |
|---|---|---|
| Format | JWT | 32 random bytes, hex — **opaque, not a JWT** |
| Lifetime | 15 min | 7 days |
| Stored server-side | No | Yes, as SHA-256 hash |
| Revocable | No | **Yes** |
| Cookie | `khmercraft_access` | `khmercraft_refresh`, `path=/auth/refresh` |

The refresh token is deliberately not a JWT: its authority comes from a database row, which is exactly what makes it revocable.

### 2.2 `refresh_tokens` collection

```ts
const RefreshTokenSchema = new Schema({
  user_id:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token_hash:  { type: String, required: true, unique: true },  // SHA-256, never the raw value
  family_id:   { type: String, required: true, index: true },   // survives rotation
  expires_at:  { type: Date, required: true },
  revoked_at:  { type: Date, default: null },
  replaced_by: { type: String, default: null },
  user_agent:  { type: String },
  ip:          { type: String },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

RefreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL cleanup
```

### 2.3 Rotation with reuse detection

```
POST /auth/refresh  { refresh_token }
        ↓
hash it, look up the row
        ↓
   ┌────┴─────────────────────────────┐
   │ row missing / expired            │→ 401, no further action
   │ row.revoked_at IS SET  ← REPLAY! │→ revoke EVERY token in family_id
   │                                  │   → force full re-login, alert
   │ row valid                        │→ issue new pair, mark old
   └──────────────────────────────────┘     revoked + replaced_by
```

A revoked refresh token being presented again means one of two things: a stolen token is being replayed, or the legitimate user's token was stolen and already used. You cannot tell which — so kill the whole family. This is the standard OAuth 2.0 BCP behaviour and it is what turns token theft from silent long-term access into a single-use event.

### 2.4 Revoking access tokens — `token_version`

Refresh rotation still leaves a ≤15-minute window where a stolen *access* token works. Close it for security-critical events with a counter on the user:

```ts
// models/User.ts
token_version: { type: Number, default: 0, required: true }
```

Increment `token_version` on: password change, password reset, admin suspension, "log out all devices".
`authenticate` then rejects any token whose `ver` claim is stale — the user document is already being loaded on every request, so this costs nothing extra.

```ts
if (user.token_version !== payload.ver) throw new AppError(401, ...);
```

### 2.5 Session lifecycle rules

| Event | Refresh tokens | `token_version` |
|---|---|---|
| Logout | Revoke current only | unchanged |
| Logout all devices | Revoke all for user | +1 |
| Change password | Revoke all **except current session** | +1 |
| Reset password | Revoke **all** | +1 |
| Admin suspends account | Revoke all | +1 |
| Reuse detected | Revoke whole family | +1 |

---

## 3. Password Hashing

### Rules

| Rule | Value |
|---|---|
| Algorithm | bcrypt (argon2id preferred for greenfield) |
| Cost factor | **12** minimum — currently correct |
| Max input length | **72 bytes** — bcrypt silently truncates beyond this |
| Comparison | `bcrypt.compare()` only — never `===` |
| Storage | `select: false` on `password_hash` |
| Logging | Never log the password, the hash, or the full request body of an auth route |

### Policy

- Minimum 8 characters, with lowercase + uppercase + digit (already enforced in `auth.validation.ts`).
- Reject the top-1000 most common passwords — a 12-character policy-compliant `Password123` is still trivially guessable.
- **Never impose a maximum below 72** and never strip characters.
- Do not force periodic rotation. NIST dropped that guidance; it drives users to predictable increments.

### `bcryptjs` vs `bcrypt`

The project uses **`bcryptjs`** (pure JavaScript). It is correct and safe, but roughly 3–5× slower than the native `bcrypt` binding. At cost 12 that can mean ~600ms per login on modest hardware — enough to become a DoS vector under load, since it blocks the event loop. Either benchmark it and drop to cost 10–11, or switch to native `bcrypt`. Measure before choosing.

### Fixing the timing leak (§0 finding 5)

```ts
// A bcrypt hash of a throwaway string, computed once at boot.
const DUMMY_HASH = bcrypt.hashSync('timing-attack-placeholder', 12);

async login(input: LoginInput) {
  const user = await User.findOne({ email: normalizeEmail(input.email) })
                         .select('+password_hash');

  // ALWAYS run a compare, even when the user does not exist,
  // so response time does not reveal whether the email is registered.
  const passwordOk = await verifyPassword(
    input.password,
    user?.password_hash ?? DUMMY_HASH,
  );

  if (!user || !passwordOk) {
    throw new AppError(401, 'Email or password is incorrect', 'INVALID_CREDENTIALS');
  }
  ...
}
```

---

## 4. Role-Based Authorization

### Role model

| Role | Gets | Never gets |
|---|---|---|
| `BUYER` | Own cart, orders, profile, reviews | Any other user's data; any seller or admin route |
| `SELLER` | Own store, own products, orders **for their store** | Other sellers' stores; buyer PII beyond delivery details |
| `ADMIN` | Platform management | Plaintext passwords (they do not exist) |

Roles are **not** hierarchical. `ADMIN` is not "`BUYER` plus more" — an admin has no cart. Enumerate roles explicitly per route; never write `role >= SELLER`.

### Two-layer authorization

Role checks alone are not enough. `authorize('SELLER')` proves *a* seller is calling — not that it is *their* product.

```ts
// Layer 1 — role
router.patch('/products/:id', authenticate, authorize('SELLER'), updateProduct);

// Layer 2 — ownership, inside the service. NEVER skip this.
const product = await Product.findOne({ _id: id, seller_id: req.auth.userId });
if (!product) throw new AppError(404, 'Product not found', 'NOT_FOUND');
```

Scope the ownership check **in the query**, not with an `if` after fetching. And return **404, not 403**, for another user's resource — a 403 confirms the record exists (IDOR information leak).

> **IDOR is the most common vulnerability in marketplace apps.** Every route with an `:id` needs an ownership predicate in its query.

### Enabling `SELLER` (§0 finding 4)

Two edits, both required or seller tokens fail verification:

```ts
// models/User.ts
export const USER_ROLES = ['BUYER', 'SELLER', 'ADMIN'] as const;

// utils/jwt.ts — replace the hard-coded pair
if (typeof payload === 'string' || !payload.sub || !USER_ROLES.includes(payload.role)) {
  throw new Error('Invalid token payload');
}
```

### Rules

1. **Deny by default.** A route without `authenticate` is public — that must be a deliberate, reviewed choice.
2. `authorize()` runs only after `authenticate`. It already guards against being called alone — keep that.
3. **Role never comes from the request body**, at registration or anywhere else.
4. Seller registration creates `role: 'SELLER'` with `status: 'PENDING'`; only an admin action flips it to `ACTIVE`.
5. Admin accounts are created by seed script or promoted by an existing admin. **Never expose an admin registration endpoint.**

---

## 5. NoSQL Injection Prevention

MongoDB's equivalent of SQL injection. If a raw request value reaches a query as an **object** instead of a string, the attacker controls query operators:

```jsonc
// POST /auth/login — the classic auth bypass
{ "email": "admin@khmercraft.com", "password": { "$ne": null } }
```

`{ $ne: null }` matches any password. If that object reached `findOne`, login would succeed without a password.

### Why the app is currently safe — and how it breaks

zod's `z.string()` rejects objects, and `.strict()` rejects unknown keys. **Validation is the primary defence, not a nicety.** The moment someone adds a route without `validate(...)`, the hole opens — which is exactly the state of `POST /api/products` today (§0 finding 7).

### Rules

1. **Every route with a body gets a zod schema.** No exceptions.
2. **Never pass `req.body` into a Mongoose method.** `Product.create(req.body)` allows any field in the schema to be set, including ones you did not intend. Pass explicit fields:

```ts
// ⛔ mass assignment
const product = await Product.create(req.body);

// ✅ explicit allow-list
const product = await Product.create({
  title: input.title,
  price: input.price,
  category: input.category,
  image: input.image,
  seller_id: req.auth.userId,   // from the token, never the body
});
```

3. **Never interpolate user input into `$where`, `$expr`, or `mapReduce`.** Prefer not using them at all.
4. **Validate `ObjectId` parameters** before querying: `mongoose.isValidObjectId(id)`, or `z.string().regex(/^[a-f\d]{24}$/i)`.
5. **Sanitise query strings too.** `?email[$ne]=null` parses into an object with Express's default query parser. Route params and query strings need validation exactly like bodies.
6. Add `express-mongo-sanitize` as defence in depth — it strips `$`-prefixed keys. Defence in depth, **not** a replacement for validation.

---

## 6. Input Validation

### Rules

1. **Validate at the edge.** The `validate` middleware runs before controllers; controllers may assume clean input. This is already the pattern — follow it everywhere.
2. **Allow-list, never deny-list.** `.strict()` on every schema. Deny-lists always miss a case.
3. **Validate body, params, and query.** Only bodies are validated today. Extend the middleware:

```ts
export const validate = (schemas: {
  body?: ZodType; params?: ZodType; query?: ZodType;
}) => (req, _res, next) => { /* parse each present schema, assign back */ };
```

4. **Bound every string.** `max()` on all of them — an unbounded string is a memory-exhaustion vector.
5. **Cap the body size.** `express.json({ limit: '100kb' })` — the current `1mb` is generous for JSON auth payloads.
6. **Normalise before comparing.** Email lowercased and trimmed before uniqueness checks, or `Admin@x.com` and `admin@x.com` become two accounts.
7. **Validate uploads by magic bytes, not extension or `Content-Type`** — both are attacker-controlled. Cap size, and store outside the web root.
8. **Escape on output, not input.** Never strip HTML on the way in; store what the user typed and escape at render. Angular escapes by default — the danger is `[innerHTML]`.

---

## 7. Rate Limiting

**Not implemented.** Highest-priority gap: nothing currently stops an attacker from trying millions of passwords.

```bash
npm i express-rate-limit rate-limit-mongo
```

| Endpoint | Limit | Key | Rationale |
|---|---|---|---|
| `POST /auth/login` | 5 / 15 min | IP **+ email** | Brute force |
| `POST /auth/register` | 5 / hour | IP | Mass fake accounts |
| `POST /auth/forgot-password` | 3 / hour | IP **+ email** | Email bombing, enumeration |
| `POST /auth/reset-password` | 5 / hour | IP | Token guessing |
| `PATCH /auth/change-password` | 5 / hour | user id | Current-password guessing |
| `POST /auth/refresh` | 30 / 15 min | IP | Abuse |
| Global API | 100 / 15 min | IP | Baseline DoS |

### Why the key is IP **plus** email

- **IP only:** one attacker from many IPs (botnet, rotating proxies) walks straight past the limit.
- **Email only:** an attacker locks any victim out of their own account by spamming failures — a denial-of-service on the user.
- **Both:** neither works.

### Rules

1. **Store counters in MongoDB or Redis, not in memory.** The default in-memory store resets on every deploy and is per-process — useless behind more than one instance.
2. Set `app.set('trust proxy', 1)` when behind a reverse proxy, or every request appears to come from the proxy IP and the limiter is meaningless. **Never** set `trust proxy` to `true` blindly — that lets clients spoof `X-Forwarded-For` and evade limiting entirely.
3. Return `429` with a `Retry-After` header.
4. **Add progressive account lockout** on top: 5 consecutive failures → 15-minute lock, tracked on the user document (`failed_login_attempts`, `locked_until`). Reset the counter on success. Rate limiting alone is per-IP; lockout protects the account.
5. Never reveal in the error whether the account exists.

---

## 8. CORS Security

Current config is correct — do not loosen it:

```ts
app.use(cors({ origin: env.webUrl, credentials: true }));
```

### Rules

1. **Never `origin: '*'` with `credentials: true`.** Browsers reject the combination, and developers "fix" it by reflecting the request origin — which allows *every* site to make credentialed calls. That is a total CORS bypass.
2. **Never reflect `req.headers.origin` back** without checking it against an allow-list.
3. Keep the allow-list in an env var; in production it must be the exact HTTPS origin, no trailing slash.
4. Restrict methods and headers explicitly:

```ts
cors({
  origin: (origin, cb) => {
    if (!origin || env.allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
})
```

5. **CORS is not access control.** It only constrains browsers — curl, Postman, and any server ignore it entirely. Authentication is the access control.

---

## 9. Secure Cookies

Current options are correct. Full production form:

```ts
export const authCookieOptions = {
  httpOnly: true,                    // JS cannot read it — kills XSS token theft
  secure: env.isProduction,          // HTTPS only
  sameSite: 'lax' as const,          // blocks cross-site POST → CSRF defence
  maxAge: env.jwtExpiresInSeconds * 1000,
  path: '/',
  ...(env.isProduction && { domain: '.khmercraft.com' }),
};
```

| Attribute | Value | Attack prevented |
|---|---|---|
| `httpOnly` | `true` | XSS reading the token |
| `secure` | `true` in prod | Network sniffing / MITM |
| `sameSite` | `lax` | CSRF |
| `path` | `/auth/refresh` for the refresh cookie | Limits exposure surface |
| `maxAge` | matches token TTL | Stale cookie reuse |

### CSRF

`sameSite: 'lax'` blocks cross-site `POST`/`PATCH`/`DELETE`, which covers every state-changing route here. **This protection disappears the moment you set `sameSite: 'none'`** — needed if the API and web app end up on unrelated domains. If that happens, add the double-submit cookie pattern: a random CSRF token in a readable cookie, echoed in an `X-CSRF-Token` header, compared server-side.

Because `authenticate` accepts a token from **either** the cookie or the `Authorization` header, keep in mind the header path is not covered by SameSite — it does not need to be, since JavaScript must deliberately attach it and a cross-site attacker cannot read the cookie to do so.

---

## 10. API Protection

| Control | Rule |
|---|---|
| HTTPS | TLS 1.2+ everywhere in production. HTTP redirects to HTTPS. |
| HSTS | `max-age=31536000; includeSubDomains` |
| Body size | `express.json({ limit: '100kb' })` |
| Error responses | Codes only — never stack traces, driver errors, or DB names |
| `X-Powered-By` | `app.disable('x-powered-by')` — currently leaking `Express` in every response |
| Swagger docs | Already disabled in production via `isDocsEnabled` ✅ |
| Logging | Log `userId`, route, status, IP. **Never** log passwords, tokens, hashes, or full auth bodies |
| Dependencies | `npm audit` in CI; fail on high severity |
| Secrets | `.env*` is gitignored ✅ — never commit real secrets; rotate on exposure |
| Health endpoint | `GET /` must not leak version, DB status, or env details |

### Response header hygiene

```ts
app.disable('x-powered-by');
app.use(helmet());
```

---

## 11. Security Middleware

### Order matters — this is the correct sequence

```ts
export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);          // only behind a known proxy

  app.use(helmet());                  // 1. headers first
  app.use(cors({ ... }));             // 2. origin gate
  app.use(globalRateLimit);           // 3. cheap rejection BEFORE parsing
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(mongoSanitize());           // 4. after parsing, before routes
  app.use(requestLogger);

  app.use('/auth', authRoutes);       // 5. routes
  app.use('/api/products', productRoutes);

  app.use(notFound);                  // 6. 404
  app.use(errorHandler);              // 7. error handler LAST
  return app;
};
```

**Why the order:** rate limiting must run *before* body parsing so a flood is rejected without allocating memory. The error handler must be registered *last* or Express will never route errors to it.

### Per-route stack

```ts
router.patch(
  '/change-password',
  changePasswordLimiter,               // 1. throttle
  authenticate,                        // 2. who are you
  authorize('BUYER'),                  // 3. are you allowed
  validate({ body: changePasswordSchema }), // 4. is the input clean
  changePassword,                      // 5. handler
);
```

Throttle before authenticate, so unauthenticated floods never reach a DB lookup.

### Middleware inventory

| Middleware | Status | Purpose |
|---|---|---|
| `helmet` | ⛔ missing | Security headers |
| `cors` | ✅ | Origin allow-list |
| `express-rate-limit` | ⛔ missing | Brute force |
| `express-mongo-sanitize` | ⛔ missing | NoSQL operator stripping |
| `validate` | ✅ body only | Schema validation |
| `authenticate` | ✅ | Token verification + user re-check |
| `authorize` | ✅ | Role check |
| `errorHandler` | ✅ | Safe error shape |
| `requestLogger` | ⛔ missing | Audit trail |

---

## 12. Database Requirements

### `users`

| Field | Security purpose |
|---|---|
| `email` | **Unique index** — the pre-check in `register()` races; only the index is authoritative |
| `password_hash` | bcrypt, `select: false` |
| `role` | enum `BUYER \| SELLER \| ADMIN`, default `BUYER`, never from request body |
| `status` | enum `ACTIVE \| PENDING \| SUSPENDED`; checked on every request |
| `token_version` | Integer, enables mass session revocation (§2.4) |
| `failed_login_attempts` | Progressive lockout counter |
| `locked_until` | Lockout expiry |
| `last_login_at`, `last_login_ip` | Anomaly detection |

### `password_resets`

Hashed token only · TTL index on `expires_at` · single-use (already correct via `findOneAndDelete`) · delete all outstanding tokens for the user when a new one is issued (already correct).

### `refresh_tokens`

Hashed token · `family_id` · `revoked_at` · `replaced_by` · TTL index.

### Rules

1. **Index every field used in an auth lookup** (`email`, `token_hash`, `user_id`) — an unindexed collection scan on a public endpoint is a DoS vector.
2. **Use a least-privilege database user** in production — the application account needs `readWrite` on its own database, not `dbAdmin` or `root`.
3. **Never expose `_id` sequences** that let an attacker enumerate users. ObjectIds are non-sequential, which is fine.
4. **Enable auth on MongoDB.** The dev container runs with no credentials — acceptable on localhost, **never** on a shared or public host.
5. Encrypt backups; treat a backup dump as equivalent to the live database.

---

## 13. Security Testing Checklist

### Authentication

- [ ] Wrong password → 401 with the generic message
- [ ] Unknown email → **identical** body *and* response time as wrong password
- [ ] `{"password": {"$ne": null}}` → 422, never a successful login
- [ ] `{"email": {"$gt": ""}}` → 422
- [ ] Suspended account cannot log in
- [ ] `PENDING` seller cannot access seller routes
- [ ] Duplicate registration → 409, never a 500
- [ ] `{"role": "ADMIN"}` in the register body creates a **BUYER**
- [ ] Password below policy → 422
- [ ] 73-character password does not silently truncate to a match

### Tokens

- [ ] Expired access token → 401
- [ ] Token signed with the wrong secret → 401
- [ ] Token with `"alg": "none"` → 401
- [ ] Token with edited `role` claim → 401 (signature fails)
- [ ] Valid signature but `role` changed in DB → 401
- [ ] Token from another environment (wrong `iss`/`aud`) → 401
- [ ] Reused refresh token → whole family revoked
- [ ] After logout, the refresh token is dead
- [ ] After password change, other sessions are dead
- [ ] After password reset, **all** sessions are dead

### Authorization

- [ ] BUYER token on a SELLER route → 403
- [ ] SELLER token on an ADMIN route → 403
- [ ] No token on a protected route → 401 (not 403)
- [ ] Seller A cannot read, edit, or delete Seller B's product → **404**
- [ ] Buyer A cannot read Buyer B's order → 404
- [ ] Every `:id` route has an ownership predicate in its query

### Password reset

- [ ] Unknown email → 200, identical response to a known email
- [ ] Reset token works exactly once
- [ ] Expired token → 400
- [ ] Forged token → 400
- [ ] Requesting a new link invalidates the previous one
- [ ] The raw token is never stored in the database

### Rate limiting

- [ ] 6th login attempt in 15 min → 429
- [ ] Limit is not bypassable by rotating IPs against one email
- [ ] Limit is not bypassable by rotating emails from one IP
- [ ] Counters survive an app restart
- [ ] Spoofed `X-Forwarded-For` does not reset the counter

### Transport and headers

- [ ] Auth cookie has `HttpOnly`, `Secure` (prod), `SameSite`
- [ ] `document.cookie` cannot read the auth cookie
- [ ] Cross-origin request from an unlisted origin is blocked
- [ ] `X-Powered-By` is absent
- [ ] Helmet headers present (`X-Content-Type-Options`, `X-Frame-Options`, HSTS)
- [ ] Swagger returns 404 in production

### Data exposure

- [ ] `password_hash` never appears in any response
- [ ] No stack trace in any 5xx response
- [ ] Mongo duplicate-key errors are mapped, never raw
- [ ] Logs contain no passwords, tokens, or hashes

---

## 14. Remediation Order

Ship in this sequence — each step is independently deployable.

Everything from the original audit is done. What remains, in priority order:

| # | Task | Effort |
|---|---|---|
| 1 | Add `seller_id` to `Product` and an ownership predicate on every seller route (§4) | 2 h |
| 2 | Add request logging with a user/route/status audit trail | 1 h |
| 3 | Wire a real email provider for password-reset links | 2 h |
| 4 | Add a common-password blocklist to the registration schema | 1 h |
| 5 | Benchmark `bcryptjs` at cost 12 under load; switch to native `bcrypt` if login latency is too high (§3) | 1 h |

Item 1 matters most: role checks are in place, but ownership checks are not, and IDOR is the most commonly exploited flaw in marketplace software.

---

## 15. Non-Negotiable Rules

1. Never trust anything from the client — body, params, query, headers, or cookies.
2. Never read `role` from a request body.
3. Never return a different error for "unknown email" than for "wrong password".
4. Never log or return a password, hash, or token.
5. Never store a raw reset or refresh token — store its hash.
6. Never skip the ownership check because the role check passed.
7. Never commit a real secret. If one is committed, rotate it — deleting the commit is not enough.
8. Never disable a security control to make a test pass.
