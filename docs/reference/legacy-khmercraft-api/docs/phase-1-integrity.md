# Phase 1 — Integrity

Scope agreed with the user out of the full 21-section backend spec: resolve
the Seller/Store naming conflict, remove dead models, extend the seller
application lifecycle, and add a real review write path with Verified
Purchase eligibility. This is phase 1 of 6 in that spec — see "Deferred to
later phases" below for what's intentionally not here yet.

## What changed

### 1. Dead model removed: `SellerProfile`

`models/SellerProfile.ts` had zero references anywhere in `src/` — it was
fully superseded by `Seller` (now `Store`, see below) via
`scripts/migrate-sellers.ts`, which already ran. Verified via a read-only
audit against the live database before deleting anything: the
`seller_profiles` collection does not exist. `migrate-sellers.ts` itself was
also removed — it only existed to perform that one-time migration and no
longer compiles once its target model is gone.

### 2. Naming conflict resolved: `Seller` → `Store`

`models/Seller.ts` was never actually a "seller" record — seller *identity*
(who can log in, what role they have) lives on `User`; `Seller` held the
storefront that identity owns. Renamed to `models/Store.ts` /
`mongoose.model('Store', ...)`. The collection name (`sellers`) is pinned
explicitly in the new schema, so **this was a code-only change — no data
migration, no downtime, no collection rename.**

Updated every `ref: 'Seller'` to `ref: 'Store'` in `Product`, `Order`, and
`Review`, and every import across `sellers.service.ts` and the backfill
script that still references it.

### 3. Store slugs (new, required)

Added `Store.slug` — unique, human-readable, generated from `storeName` with
a numeric suffix on collision (same pattern as `Product.slug`). `GET
/api/sellers/stores/:storeId` now accepts either a Mongo id or a slug, same
as the product detail route already did.

**Migration required and already run against the live database**
(`scripts/backfill-store-slugs.ts`, idempotent): all 5 existing stores were
missing a slug, which would have made the new unique index fail to build.
Ran once via `npx ts-node scripts/backfill-store-slugs.ts`; all 5 stores now
have one. Re-running it is safe — it only touches stores still missing a
slug.

### 4. Store verification wiring

Added `Store.verifiedAt`. `toPublicStore` now returns `isVerified`,
`verifiedAt`, and a fixed, honest `verificationExplanation` string when
verified — never a claim of government verification, and never the
application's admin notes.

Also backfilled `verifiedAt` for the 5 existing stores that were already
`verificationStatus: 'VERIFIED'` from the original backfill (which predates
this field), using their `createdAt` as the closest known approximation,
since the actual historical verification moment was never recorded.

### 5. Seller application lifecycle extended

`SellerApplication.status` went from 3 states (PENDING/APPROVED/REJECTED) to
6: `DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, SUSPENDED`. Added
`submittedAt`, `reviewedBy`, `reviewedAt`, `rejectionReason`, `adminNotes`
(the last never returned to anyone but the admin queue, and not even there —
see the endpoint below). **No data migration needed**: the live
`sellerapplications` collection has 0 documents.

New endpoint: `PATCH /api/sellers/apply/:applicationId` (ADMIN only) —
`{ decision: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED', rejectionReason?, adminNotes? }`.
Illegal transitions (e.g. approving an already-approved application) return
409. Rejecting without a reason returns 422.

Approving an application verifies the applicant's Store immediately if one
already exists; if they apply before finishing onboarding, `createStore`
checks for an approved application on that user and verifies the new store
right away — so the order the two steps happen in doesn't matter. Suspending
an already-approved seller removes the verified badge
(`verificationStatus` → `UNVERIFIED`) but does **not** yet unpublish their
products or block sign-in — see "Deferred to later phases."

### 6. Product → Store linking fixed

`catalog.service.ts#createProduct` never set `Product.sellerId` — every
product ever created through the API had it `null`, and a free-text
`storeName` field meant nothing stopped a seller from publishing under a
name that wasn't actually their store. Fixed: the seller's real Store is
looked up at creation time and both `sellerId` and `storeName` are taken
from it, ignoring the client-supplied `storeName` when a store exists.

A seller account can still exist without a Store (pre-existing, unrelated
looseness the current test suite already relies on — see "Known
limitations"), so this stays a soft link rather than a hard requirement in
this phase.

### 7. Review write path (didn't exist before)

There was no `POST /reviews` anywhere in the codebase — sellers could reply
to or flag a review, but nothing could create one. New module:
`src/modules/reviews/`, mounted at `/api/reviews`.

- `POST /api/reviews` — `{ orderId, productId, rating, comment, images? }`.
  Eligible only when: the caller owns the order (404, not 403, on mismatch —
  same privacy pattern as `orders.service.ts`), the order actually contains
  that product, the order is `DELIVERED`, and this buyer hasn't already
  reviewed this product for this order (enforced both by an application
  check and a unique index as the race-condition backstop).
  `verifiedPurchase` is hardcoded `true` server-side and rejected outright
  if a client tries to send it (`.strict()` schema) — every review this
  endpoint can create passed the delivered-order check to exist.
- `GET /api/products/:id/reviews` — public, paginated, approved reviews
  only, with a rating breakdown.

Creating a review recalculates both the Product's and the Store's
`rating`/`reviewCount` from every approved review (full recompute, not an
increment), so a moderation action later won't leave the average drifting.

**No data migration needed**: the live `reviews` collection has 0 documents.

## Environment variables

None added, none changed.

## Tests

New: `tests/commerce/reviews.spec.ts` (5 tests), `tests/commerce/seller-lifecycle.spec.ts` (8 tests) —
store slug generation/collision/lookup, application review authorization and
transition rules, verified-purchase eligibility (undelivered order, someone
else's order, duplicate review), and the rating aggregate recompute.

Full suite: **110 passed**, 0 newly failing. `npm run build` (tsc) and
`npx tsc --noEmit` both clean.

**8 pre-existing failures, unrelated to this work**: `tests/auth/*.spec.ts`
(email verification, password reset, admin login, refresh-token rotation).
These fail against auth code that was already modified and uncommitted
before this phase started — I did not touch any file under
`src/modules/auth/` in this phase. Flagging rather than fixing, since it's
outside the agreed Phase 1 scope; happy to pick it up separately.

## Addendum — `POST /auth/register-seller`

Pulled from `origin/develop`'s `AuthService.registerSeller` (a feature this
branch never had) and adapted to fit what Phase 1 changed underneath it:

- Writes to `Store` (this branch's model) instead of the old `Seller`/
  `SellerProfile` shape `origin/develop` used, including a generated unique
  `slug` — the store is immediately visible through the same
  `/api/sellers/stores` listing and `/api/sellers/stores/:slug` lookup every
  other store (seeded or real) uses.
- Marks the new account `email_verified: true` at creation. `origin/develop`
  never had an email-verification requirement to satisfy in the first place;
  this branch does, and there is still no email provider wired up to deliver
  a code (see the Known Limitations note below on `/auth/register`) — gating
  this path on that would have shipped it broken on arrival. This reproduces
  the working behavior it was ported from rather than adding a new bypass.
- Uses sequential writes with a manual rollback on failure instead of a
  MongoDB transaction — `session.withTransaction` requires a replica set,
  which the standalone in-memory MongoDB this project's tests run against
  cannot provide, and the live Atlas deployment doesn't otherwise depend on
  transactions either (see `orders.service.ts#createOrder`'s reservation/
  rollback pattern for the same constraint, same reasoning).
- Existing-buyer-upgrade path preserved: an existing BUYER account with the
  correct password is promoted to SELLER and gets a store, matching
  `origin/develop`'s behavior and this branch's own self-serve `createStore`.

Tests: `tests/auth/register-seller.spec.ts` (7 tests) — creation, immediate
sign-in, public visibility, duplicate-seller rejection, buyer-upgrade with
correct/incorrect password, and slug collision. Full suite after this change:
**117 passed**, the same 8 pre-existing auth failures noted above, 0 new
regressions. Verified live against the real Atlas database end-to-end
(register → login → visible in `/api/sellers/stores`), then the throwaway
test account was deleted.

## Known limitations / deferred to later phases

- **A seller can still create products without a Store.** The existing test
  suite (`seller-catalog.spec.ts`) relies on this, so Phase 1 didn't force
  the requirement. A review of a product from such a seller currently fails
  with an honest 500 (`STORE_NOT_FOUND`) rather than guessing at
  attribution. Recommend closing this at the source in Phase 6 (seller
  operations) by requiring a Store before a product can be published.
- **Suspending a seller application doesn't cascade.** It flips the Store's
  `verificationStatus` back to `UNVERIFIED` but does not unpublish products,
  block login, or hide the store from listings — there's no store-level
  "active/suspended" status yet. That's Phase 4 (Trust) territory in the
  full spec.
- **Store slugs are immutable after creation** — no personalization/editing
  endpoint yet. That's Phase 6 (store customization).
- Everything else in the 21-section spec not covered above (variants,
  inventory reservation, guest checkout, per-seller shipping, returns,
  wishlist/follow, homepage merchandising, plan entitlements, bilingual
  content) is out of scope for this phase by agreement and untouched.
