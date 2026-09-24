# KhmerCraft — Authentication Architecture

**Scope:** Buyer authentication + Admin login.
**Out of scope:** Seller authentication (owned by another developer). This design leaves a clean extension point for it — see [Extending to Seller](#12-extending-to-seller).

**Stack:** Express 5 · TypeScript · MongoDB (Mongoose) · JWT
**Target app:** `apps/api`

---

## 1. Authentication Flows

### 1.1 Buyer Registration

```
Client submits { name, email, phone, password }
        ↓
Validate payload (zod)              → 422 if invalid
        ↓
Normalise email (lowercase + trim)
        ↓
Check email is not taken            → 409 if exists
        ↓
Hash password (bcrypt, cost 12)
        ↓
Create user { role: BUYER, status: ACTIVE }
        ↓
Issue access token + refresh token
        ↓
201 Created + user profile + tokens
```

**Decisions**
- The user is logged in immediately on success — no second round trip.
- `role` is **never** read from the request body. It is hard-coded to `BUYER`. Accepting a client-supplied role is a privilege-escalation hole.
- Email uniqueness is enforced by a **unique index**, not just the pre-check. Two simultaneous registrations would both pass the check; only the index stops the duplicate. Catch the duplicate-key error and map it to 409.

### 1.2 Login (Buyer and Admin)

```
Client submits { email, password }
        ↓
Validate payload
        ↓
Look up user by email             ─┐
        ↓                          │ same generic 401 for both
Compare password with bcrypt      ─┘
        ↓
Check status is ACTIVE             → 403 if SUSPENDED
        ↓
Issue access token (15m) + refresh token (7d)
        ↓
Store hashed refresh token
        ↓
200 OK + user profile + tokens
```

**Decisions**
- Wrong email and wrong password return the **identical** error (`INVALID_CREDENTIALS`). Different messages let an attacker enumerate registered emails.
- When the email is not found, still run a dummy bcrypt compare. Otherwise response timing reveals which emails exist.
- Admin uses `POST /auth/admin/login`, which rejects any non-`ADMIN` account. Same logic, stricter rate limit, separate audit log.

### 1.3 Forgot Password → Reset Password

```
FORGOT                                RESET
Client submits { email }              Client submits { token, new_password }
        ↓                                     ↓
Look up user                          Hash the incoming token (SHA-256)
        ↓                                     ↓
If found: generate 32-byte token      Find reset record by token_hash
        ↓                                     ↓
Store SHA-256(token) + 15m expiry     Reject if used_at set or expired  → 400
        ↓                                     ↓
Email the RAW token as a link         Hash new password
        ↓                                     ↓
ALWAYS return 200                     Update password_hash
                                              ↓
                                      Mark reset record used
                                              ↓
                                      Revoke ALL refresh tokens
```

**Decisions**
- Forgot-password **always** returns 200, even for unknown emails — otherwise it becomes an account-enumeration oracle.
- Only the **hash** of the reset token is stored. A leaked database dump cannot be used to reset accounts.
- Single use (`used_at`) and short expiry (15 minutes).
- Any outstanding reset tokens for that user are invalidated when a new one is issued.
- Resetting the password **kills every existing session**. If an attacker had a session, the legitimate reset must lock them out.

### 1.4 Change Password (authenticated)

```
Authenticated buyer submits { current_password, new_password }
        ↓
requireAuth middleware resolves user from access token
        ↓
Verify current_password with bcrypt   → 401 if wrong
        ↓
Reject if new_password == current_password  → 422
        ↓
Hash and store new password
        ↓
Revoke all refresh tokens EXCEPT the current session
        ↓
200 OK
```

**Decision:** the current password is required even though the user is authenticated — it stops a stolen access token from being used to take over the account permanently.

### 1.5 Logout

```
Client submits { refresh_token }
        ↓
Mark that refresh token revoked
        ↓
204 No Content
```

Logout is always `204`, even if the token was already revoked or invalid — it is idempotent. The access token stays valid until it expires (max 15 minutes); this is the accepted trade-off of stateless JWT.

---

## 2. Database Design

MongoDB, so these are **collections**, not SQL tables. Field names follow the snake_case spec; Mongoose is configured to map its automatic timestamps onto `created_at` / `updated_at`.

### 2.1 `users`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Primary key (`id` in API responses) |
| `name` | String | Required, 2–100 chars |
| `email` | String | Required, **unique index**, lowercase |
| `password_hash` | String | bcrypt hash, `select: false` |
| `phone` | String | Optional, Cambodian format |
| `role` | String | `BUYER` \| `ADMIN`, default `BUYER` |
| `status` | String | `ACTIVE` \| `SUSPENDED`, default `ACTIVE` |
| `created_at` | Date | Auto |
| `updated_at` | Date | Auto |

```ts
// src/modules/auth/models/user.model.ts
import { Schema, model, Document } from 'mongoose';

export type UserRole = 'BUYER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export interface IUser extends Document {
  name: string;
  email: string;
  password_hash: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name:  { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    // select:false keeps the hash out of every query unless explicitly asked for
    password_hash: { type: String, required: true, select: false },
    phone:  { type: String, trim: true },
    role:   { type: String, enum: ['BUYER', 'ADMIN'], default: 'BUYER', required: true },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE', required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default model<IUser>('User', UserSchema);
```

> `select: false` on `password_hash` is the single most valuable line here — it means a careless `res.json(user)` can never leak the hash. To log in you must opt in: `User.findOne({ email }).select('+password_hash')`.

### 2.2 `password_resets`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `user_id` | ObjectId → users | Indexed |
| `token_hash` | String | SHA-256 of the emailed token, unique |
| `expires_at` | Date | now + 15 min, **TTL index** |
| `used_at` | Date \| null | Set on use; enforces single use |
| `created_at` | Date | Auto |

```ts
const PasswordResetSchema = new Schema<IPasswordReset>(
  {
    user_id:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token_hash: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
    used_at:    { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// TTL index — MongoDB deletes expired documents automatically, no cleanup job needed
PasswordResetSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
```

### 2.3 `refresh_tokens`

Not in the original spec, but **required** for the refresh-token strategy in §4.3 — a stateless JWT alone cannot be revoked, so logout and "reset password kills all sessions" are impossible without it.

| Field | Type | Notes |
|---|---|---|
| `user_id` | ObjectId → users | Indexed |
| `token_hash` | String | SHA-256 of the refresh token, unique |
| `expires_at` | Date | now + 7 days, TTL index |
| `revoked_at` | Date \| null | |
| `replaced_by` | String \| null | Token hash that rotated this one — powers reuse detection |
| `user_agent` | String | For an "active sessions" screen later |

---

## 3. API Documentation

Base path: `/auth` · All bodies are `application/json`

| Method | Endpoint | Auth required | Rate limit |
|---|---|---|---|
| POST | `/auth/register` | No | 5 / hour / IP |
| POST | `/auth/login` | No | 5 / 15 min / IP+email |
| POST | `/auth/admin/login` | No | 3 / 15 min / IP |
| POST | `/auth/refresh` | Refresh token | 30 / 15 min / IP |
| POST | `/auth/logout` | No (refresh token in body) | 20 / 15 min / IP |
| POST | `/auth/forgot-password` | No | 3 / hour / IP+email |
| POST | `/auth/reset-password` | Reset token | 5 / hour / IP |
| PATCH | `/auth/change-password` | Access token | 5 / hour / user |

---

### POST `/auth/register`

**Purpose:** Create a buyer account and start a session.
**Auth:** None.

```jsonc
// Request
{
  "name": "Sok Dara",
  "email": "dara@example.com",
  "phone": "+855 12 345 678",   // optional
  "password": "Str0ngPass!"
}
```

```jsonc
// 201 Created
{
  "user": {
    "id": "6a6860525341c413bfbc1606",
    "name": "Sok Dara",
    "email": "dara@example.com",
    "phone": "+855 12 345 678",
    "role": "BUYER",
    "status": "ACTIVE",
    "created_at": "2026-07-28T07:54:58.599Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "8f14e45fceea167a5a36...",
  "expires_in": 900
}
```

**Errors:** `422` validation failed · `409` email already registered · `429` rate limited

---

### POST `/auth/login`

**Purpose:** Authenticate a buyer and issue tokens.
**Auth:** None.

```jsonc
// Request
{ "email": "dara@example.com", "password": "Str0ngPass!" }
```

Response body is identical to register, with `200 OK`.

**Errors:** `401` `INVALID_CREDENTIALS` (wrong email *or* wrong password) · `403` `ACCOUNT_SUSPENDED` · `429`

---

### POST `/auth/admin/login`

**Purpose:** Authenticate an administrator.
**Auth:** None. Rejects any account whose `role !== 'ADMIN'` with the same generic `401`.

There is no admin registration endpoint — admin accounts are created by a seed script or promoted by an existing admin. A public admin-register route would be a critical vulnerability.

---

### POST `/auth/refresh`

**Purpose:** Exchange a valid refresh token for a new access token. Keeps access tokens short-lived without forcing re-login.

```jsonc
// Request
{ "refresh_token": "8f14e45fceea167a5a36..." }

// 200 OK — note the refresh token is rotated
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "c9f0f895fb98ab9159f5...",
  "expires_in": 900
}
```

**Errors:** `401` expired, revoked, or unknown token

---

### POST `/auth/logout`

**Purpose:** Revoke the refresh token and end the session.

```jsonc
// Request
{ "refresh_token": "8f14e45fceea167a5a36..." }
// 204 No Content
```

Idempotent — an already-revoked or unknown token still returns `204`.

---

### POST `/auth/forgot-password`

**Purpose:** Email a password-reset link.

```jsonc
// Request
{ "email": "dara@example.com" }

// 200 OK — ALWAYS this response, even for unknown emails
{ "message": "If that email is registered, a reset link has been sent." }
```

---

### POST `/auth/reset-password`

**Purpose:** Set a new password using the emailed token.

```jsonc
// Request
{ "token": "raw-token-from-email-link", "new_password": "N3wStr0ng!" }

// 200 OK
{ "message": "Password has been reset. Please log in." }
```

**Errors:** `400` `INVALID_OR_EXPIRED_TOKEN` (covers expired, already used, and forged) · `422` weak password

---

### PATCH `/auth/change-password`

**Purpose:** Let a signed-in buyer change their password.
**Auth:** `Authorization: Bearer <access_token>` — required.

```jsonc
// Request
{ "current_password": "Str0ngPass!", "new_password": "Ev3nStr0nger!" }

// 200 OK
{ "message": "Password updated successfully." }
```

**Errors:** `401` missing/invalid token or wrong current password · `422` new password too weak or same as current

---

### Error response format

Every error, from every endpoint, uses one shape:

```jsonc
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "field": "email", "message": "Must be a valid email address" }]
  }
}
```

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Body failed schema validation |
| `INVALID_CREDENTIALS` | 401 | Login failed |
| `UNAUTHENTICATED` | 401 | Missing/expired access token |
| `FORBIDDEN` | 403 | Authenticated but wrong role |
| `ACCOUNT_SUSPENDED` | 403 | `status = SUSPENDED` |
| `EMAIL_TAKEN` | 409 | Duplicate registration |
| `INVALID_OR_EXPIRED_TOKEN` | 400 | Reset/refresh token bad |
| `RATE_LIMITED` | 429 | Too many attempts |
| `INTERNAL_ERROR` | 500 | Unhandled — details never leaked |

---

## 4. Security Design

### 4.1 Password hashing

- **bcrypt, cost factor 12** (~250ms per hash on typical hardware — slow enough to make brute force expensive, fast enough for login UX).
- Never log, return, or store the plaintext password. `select: false` enforces this at the schema level.
- Password policy: min 8 chars, at least one letter and one digit. Reject the top-1000 common passwords.
- Compare with `bcrypt.compare()` — it is constant-time. Never use `===` on hashes.

### 4.2 JWT authentication

| | Access token | Refresh token |
|---|---|---|
| Format | JWT (HS256) | 32 random bytes, hex |
| Lifetime | 15 minutes | 7 days |
| Storage (server) | Not stored | SHA-256 hash in `refresh_tokens` |
| Revocable | No | Yes |

Access token payload — minimal, no PII:

```jsonc
{ "sub": "6a6860525341c413bfbc1606", "role": "BUYER", "iat": 1769580898, "exp": 1769581798 }
```

The refresh token is deliberately **not** a JWT. It is an opaque random string, because its authority comes from the database record, not from a signature.

> `JWT_SECRET` must be a 32+ byte random value from the environment. A hard-coded or committed secret means anyone can mint admin tokens.

### 4.3 Refresh token strategy — rotation with reuse detection

1. Every `/auth/refresh` call issues a **new** refresh token and revokes the old one, setting `replaced_by`.
2. If a **revoked** token is presented again, that means it was stolen and replayed. Response: revoke **the entire token family** for that user, forcing a full re-login.
3. Client storage: refresh token in an `httpOnly; Secure; SameSite=Strict` cookie; access token in memory only. `localStorage` is readable by any XSS payload on the page.

### 4.4 Input validation

Validate at the edge with **zod**, before any handler logic runs. Controllers may assume their input is already well-formed.

```ts
export const registerSchema = z.object({
  name:     z.string().trim().min(2).max(100),
  email:    z.string().trim().toLowerCase().email(),
  phone:    z.string().trim().regex(/^\+?[0-9\s-]{8,15}$/).optional(),
  password: z.string().min(8).max(72)      // bcrypt silently truncates past 72 bytes
            .regex(/[A-Za-z]/, 'Must contain a letter')
            .regex(/[0-9]/,    'Must contain a number'),
});
```

Also: `express.json({ limit: '10kb' })` to cap body size, and use `helmet()` for security headers.

### 4.5 Error handling

- One `AppError` class carrying `statusCode` + `code`; one central error middleware registered **last**.
- Express 5 forwards rejected promises to the error middleware automatically — no `try/catch` wrapper needed in every handler.
- 5xx responses never include stack traces or driver messages in production. Log the detail server-side, return the generic `INTERNAL_ERROR`.
- Never let a Mongoose duplicate-key error (`code: 11000`) reach the client raw — map it to `EMAIL_TAKEN`.

### 4.6 Rate limiting

`express-rate-limit`, per the table in §3. Login and forgot-password are keyed on **IP + email** so one attacker cannot lock out a specific victim by hammering their email from many IPs, and cannot spray many accounts from one IP.

### 4.7 Role-based authorization

Two composable middlewares:

```ts
router.get('/admin/users', requireAuth, requireRole('ADMIN'), listUsers);
```

- `requireAuth` — verifies the access token, loads `req.user`, rejects suspended accounts.
- `requireRole(...roles)` — runs after `requireAuth`, checks `req.user.role`.

**Deny by default.** A route with no `requireAuth` is public; that must be a deliberate choice, reviewed in the PR — not an oversight.

---

## 5. Backend Folder Structure

```
apps/api/
├── src/
│   ├── index.ts                     # app bootstrap only
│   ├── config/
│   │   ├── env.ts                   # validated env vars (fail fast on boot)
│   │   └── database.ts              # mongoose connection
│   ├── modules/
│   │   └── auth/
│   │       ├── auth.routes.ts       # route table → middleware → controller
│   │       ├── auth.controller.ts   # HTTP in/out only, no business logic
│   │       ├── auth.service.ts      # business logic, no req/res
│   │       ├── auth.validation.ts   # zod schemas
│   │       ├── auth.types.ts
│   │       └── models/
│   │           ├── user.model.ts
│   │           ├── password-reset.model.ts
│   │           └── refresh-token.model.ts
│   ├── middleware/
│   │   ├── require-auth.ts
│   │   ├── require-role.ts
│   │   ├── validate.ts              # generic zod-schema runner
│   │   ├── rate-limit.ts
│   │   └── error-handler.ts         # registered LAST
│   ├── utils/
│   │   ├── app-error.ts
│   │   ├── jwt.ts                   # sign / verify access tokens
│   │   ├── password.ts              # hash / compare
│   │   └── mailer.ts                # reset-link email
│   └── docs/
│       └── swagger.ts               # OpenAPI spec + Swagger UI mount
└── tests/
    └── auth/
```

**The one rule that keeps this clean:** controllers never touch Mongoose, services never touch `req`/`res`. Services stay unit-testable and reusable by the Seller module later.

> Note: the current repo has `models/` and `lib/` **outside** `src/`. Moving them under `src/` (and updating `tsconfig.json` `include`) is worth doing as part of this work — coordinate with your teammate first, since it touches shared files.

---

## 6. Dependencies to add

```bash
cd apps/api
npm i bcrypt jsonwebtoken zod express-rate-limit helmet cookie-parser nodemailer
npm i -D @types/bcrypt @types/jsonwebtoken @types/cookie-parser @types/nodemailer
```

## 7. Environment variables

```ini
PORT=3001
MONGODB_URI=mongodb://localhost:27017/khmercraft

JWT_SECRET=<32+ random bytes>          # openssl rand -hex 32
JWT_ACCESS_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=7
BCRYPT_ROUNDS=12

PASSWORD_RESET_EXPIRES_MINUTES=15
APP_URL=http://localhost:4200          # builds the reset link

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM="KhmerCraft <no-reply@khmercraft.com>"
```

Validate these on boot in `config/env.ts` and **crash immediately** if any are missing. A server that starts with no `JWT_SECRET` and fails at the first login is far worse than one that refuses to start.

## 8. Implementation order

1. `config/env.ts`, `utils/app-error.ts`, `middleware/error-handler.ts` — the foundation everything else reports through
2. `user.model.ts` + `utils/password.ts` + `utils/jwt.ts`
3. `POST /auth/register` → `POST /auth/login` (end-to-end vertical slice, test in Swagger)
4. `require-auth.ts` + `require-role.ts` → `PATCH /auth/change-password`
5. `refresh-token.model.ts` → `POST /auth/refresh` + `POST /auth/logout`
6. `password-reset.model.ts` + `utils/mailer.ts` → forgot / reset password
7. `POST /auth/admin/login` + admin seed script
8. Rate limiting and helmet across all routes
9. Swagger annotations on every endpoint

Ship steps 1–3 as one PR. Do not build all nine before testing anything.

## 9. Testing checklist

- [ ] Duplicate email returns 409, not a 500 from the driver
- [ ] `password_hash` never appears in any response body
- [ ] Wrong email and wrong password are indistinguishable (body **and** timing)
- [ ] Suspended account cannot log in
- [ ] Expired access token returns 401
- [ ] Buyer token is rejected by an admin-only route (403)
- [ ] Reset token works once; second attempt fails
- [ ] Expired reset token fails
- [ ] Reset password revokes all existing refresh tokens
- [ ] Reused refresh token revokes the whole family
- [ ] Rate limiter returns 429 after N attempts
- [ ] `role: "ADMIN"` in the register body does **not** create an admin

## 10. Notes for the frontend team

- Access token goes in `Authorization: Bearer <token>` on every protected request.
- On `401`, call `/auth/refresh` once, then retry the original request. If refresh also fails, redirect to login. In Angular, this belongs in a single HTTP interceptor — with a lock so concurrent 401s trigger only one refresh.
- Never store the access token in `localStorage`.

## 11. Open decisions

| Question | Recommendation |
|---|---|
| Email verification at registration? | Not in v1 — adds friction. Add before enabling checkout. |
| Google / Facebook login? | Defer to v2. |
| 2FA for admin? | Recommended before production launch. |
| Cookie or body for refresh token? | Cookie (`httpOnly`) for the web app. Body is documented above so Swagger can be tested without cookie plumbing. |

## 12. Extending to Seller

The seller developer reuses `users` with `role: 'SELLER'` and adds a `seller_profiles` collection keyed by `user_id`. Nothing in this design needs to change — `requireRole('SELLER')` works as-is. Agree on this **before** either of you writes the login handler, so you don't end up with two user collections and two token formats.
