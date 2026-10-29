# Phase 5 Core readiness audit

**Audit date:** 2026-10-28
**Base SHA:** `7ae9d9d7ea5e3724f10d2ea9f265fb62a87f6834`
**Branch:** `feature/p5-core-platform`
**Scope:** P5-ADM-001, P5-NOT-001, P5-SUB-001, and P5-SUP-001 prerequisites only
**Runtime changes:** none

## 1. Decision

Phase P5 Core implementation is **technically ready in three prerequisite
lanes and not ready in two contract/policy lanes**.

| P5 package | Required prerequisite | Result | Evidence summary |
| --- | --- | --- | --- |
| P5-ADM-001 | P2-SEC-001 | **Proven** | Administrator TOTP, encrypted seeds, recovery codes, recent-auth, session inventory/revocation, role-change revocation, and privileged audit events exist and their 12 focused tests pass. |
| P5-NOT-001 | P3-EVT-001 | **Proven** | Core and Commerce have the same versioned event envelope, transactional outbox, idempotent inbox, monotonic aggregate version checks, dead letters, privileged replay, and redacted inspection. All 26 focused event tests pass. |
| P5-SUB-001 | P2-ENT-001 | **Technically proven; policy not accepted** | Versioned capability evaluation and Core-to-Commerce enforcement exist. All 11 focused entitlement tests pass. The values implement DEC-014 through DEC-020 even though those decisions remain proposed. |
| P5-SUB-001 | P3-PAY-002 | **Proven as a provider-neutral foundation** | Payment attempts, provider events, creation/event dedupe, signed raw-body webhook verification, account/amount/currency/reference matching, replay, redaction, and reconciliation exist. All 16 focused tests pass. This is not approval to enable a provider or change launch payment scope. |
| P5-SUP-001 | Core API foundation | **Proven** | Core has correlation IDs, a safe standard error envelope, OpenAPI schemas, authenticated routes, audit logging, and page/limit pagination in current admin operations. |
| P5-SUP-001 | Request idempotency foundation | **Missing** | Core has domain-specific idempotency for Store creation, events, and payment attempts, but no reusable `Idempotency-Key` middleware/store for an authenticated case-creation request. The Core OpenAPI contains no `Idempotency-Key` header contract. |

P5 runtime work must not begin from this audit alone. P5-SUP-001 needs the
small repair package in section 6, and policy-dependent packages need named
human confirmation recorded in the decision register.

## 2. Audit method

The audit read the required repository and architecture documents completely,
then inspected implementation, migrations, OpenAPI, and tests rather than
relying on completion claims in prior audits. The archived KhmerCraft API was
not run and is not a candidate owner for any P5 entity.

Primary evidence inspected:

- P2 security: `rentify-server/src/middlewares/recentAuth.js`,
  `rentify-server/src/utils/totp.js`,
  `rentify-server/src/utils/mfaEncryption.js`,
  `rentify-server/src/modules/admin/adminSecurityController.js`,
  `rentify-server/src/modules/admin/adminRoute.js`, and
  `rentify-server/test/security/privilegedAuthAndSessions.test.js`.
- P3 events: both services' `modules/events/`, EventOutbox/EventInbox/
  EventReplayAudit models, migrations
  `rentify-server/src/migrations/20261025_014_standard_events.js` and
  `ecommerce-server/migrations/20261025_016_standard_events.js`, and both
  `test/security/standardEvents.test.js` suites.
- P2 entitlements: Core capability configuration and entitlement service,
  Core projection, Commerce StoreAccess enforcement, and both services'
  `test/security/versionedEntitlements.test.js` suites.
- P3 payments: Core PaymentAttempt/provider-event migration and models,
  CutLuy adapter/payment/webhook/replay/reconciliation modules, and
  `rentify-server/test/security/cutluyPaymentFoundation.test.js`.
- Core API: `rentify-server/src/middlewares/correlation.js`,
  `rentify-server/src/middlewares/errorHandler.js`,
  `rentify-server/src/utils/errors.js`, Core OpenAPI common schemas, and the
  current operations pagination implementation.
- Current gaps: existing Core/Commerce notification services, the current
  Subscription model/service, User/Staff roles, admin routes, and a repository
  search for reusable request-idempotency artifacts.

## 3. Prerequisites proven

### 3.1 P2-SEC-001 for P5-ADM-001

The prerequisite is present and usable:

- Core `User.role` is still only `user | admin`; scoped platform roles have not
  been implemented, which is correctly P5-ADM-001 work.
- Administrators can enroll and verify RFC 6238 TOTP. Seeds are encrypted with
  AES-256-GCM, recovery codes are hashed and single-use, and same-time-step
  replay is rejected.
- `requireRecentAuth` reads trusted token/session state and rejects missing or
  expired step-up authentication.
- high-risk current admin routes use recent-auth for Store changes, seller
  review, MFA disable/recovery regeneration, session revocation, contact
  changes, and role changes.
- role removal revokes active sessions; privileged actions emit structured
  audit events.

Focused result: **12/12 P2-SEC-001 tests passed** on this base.

This proves authentication/session controls, not scoped roles, maker-checker,
or break-glass. Those remain the intended P5-ADM-001 runtime work.

### 3.2 P3-EVT-001 for P5-NOT-001

Both services implement:

- immutable envelope fields `eventId`, `eventType`, `schemaVersion`,
  `aggregateType`, `aggregateId`, `aggregateVersion`, `occurredAt`, `producer`,
  `correlationId`, optional `causationId`/`storeId`, and sanitized `payload`;
- transactional outbox records with retry/backoff and dead-letter state;
- inbox dedupe by event ID and stale aggregate-version rejection;
- operator inspection with secret/address redaction;
- privileged replay with actor, reason, correlation ID, and replay audit; and
- a rule that replay of an already processed inbox item cannot repeat its
  authoritative effect.

Focused result: **13/13 Core plus 13/13 Commerce event tests passed**.

Existing email/Telegram notification code is not the P5 model. It sends
imperative messages, has no durable in-app source of truth, recipient resolver,
preferences, template version, delivery ledger, or event-derived dedupe. It
must be adapted behind the frozen contract, not declared complete.

### 3.3 P2-ENT-001 for P5-SUB-001

The technical entitlement rail is present:

- `CAPABILITIES_VERSION = 1` and capability keys are independent of display
  plan names;
- Core evaluates lifecycle and quotas and projects a versioned snapshot;
- Commerce consumes that snapshot, locks Product mutation/quota checks, and
  gates POS, invoices, and historical reads;
- grace locks mutation while retaining selected selling/read capabilities;
  suspended/cancelled evaluation removes selling capabilities and limits
  historical access.

Focused result: **6/6 Core plus 5/5 Commerce entitlement tests passed**.

Important qualification: the configured 6-month pilot, 14-day trial, plan
limits, 7-day grace, and 90-day historical window come from DEC-014 through
DEC-020, whose register status is still proposed. Passing tests prove code
consistency, not business approval.

### 3.4 P3-PAY-002 for P5-SUB-001

The provider-neutral payment foundation is present for Core subscription
payments:

- creation requires a stable business reference and idempotency key;
- a reused key with different immutable facts returns a conflict;
- attempts distinguish account type/reference, exact amount, currency,
  provider ID, canonical status, and expiry;
- raw-body HMAC verification checks timestamp freshness and uses constant-time
  comparison;
- provider events are persisted/deduped and cannot downgrade terminal paid
  state;
- account, amount, USD currency, and reference mismatches fail closed;
- reconciliation can report or repair a missed event under the same checks;
- replay and diagnostics redact secrets and QR material.

Focused result: **16/16 payment-foundation tests passed** (the file contains
17 named scenarios, with paid/expired/failed grouped in one test).

This proves a foundation only. It does not approve live CutLuy use, pricing,
renewal policy, or buyer online payments.

### 3.5 Core API foundation for P5-SUP-001

Core supplies the reusable API basics:

- request correlation and response `X-Correlation-ID`;
- standard error detail `{code,message,fieldErrors,retryable,correlationId}`
  with legacy compatibility fields;
- production-safe message/stack handling and structured logs;
- OpenAPI common schemas and authenticated admin routing;
- current bounded `page`/`limit` operations pagination.

The P5 contract freezes cursor pagination for new case/event collections while
allowing current page/limit endpoints to remain compatible until separately
migrated.

## 4. Missing prerequisites and exact evidence

### 4.1 Generic Core request idempotency is missing

Evidence:

- no Core source or test filename contains a request idempotency middleware or
  generic idempotency repository;
- the only Core `idempotencyKey` persistence is `PaymentAttempt`;
- Store creation is idempotent by its owner uniqueness rule rather than a
  reusable request-key contract;
- event dedupe is by `eventId`, not by HTTP request identity; and
- `docs/openapi/core.openapi.yaml` defines no `Idempotency-Key` request header.

Impact: P5-SUP-001 cannot prove that a buyer-report retry, double click, or
timeout creates one support case and one opening event.

### 4.2 Subscription persistence does not yet express the frozen lifecycle

This is P5-SUB-001 work rather than a missing named prerequisite, but it is a
material readiness gap:

- `Subscription.status` persists only `active`, `pending`, `expired`,
  `suspended`, and `trial`;
- it cannot persist `past_due`, `grace_period`, or `cancelled`, even though the
  entitlement evaluator models those concepts;
- the current service creates Website-required trials and paid subscriptions,
  but it is not one audited lifecycle transition service for activation,
  renewal, failure, grace, cancellation, suspension, or downgrade; and
- marketplace-only entitlement still is not a Website-independent
  Subscription row.

Impact: entitlement evaluation is ahead of the authoritative subscription
record. P5-SUB-001 must close this without treating proposed timing/pricing as
accepted.

### 4.3 Scoped admin grants do not exist yet

This is the intended P5-ADM-001 work, not a failed prerequisite. Current
evidence is `User.role = user | admin`, `requireAdmin`, and broad admin route
access. Merchant Staff permissions are Store-scoped and must not be reused as
platform-operator grants.

## 5. Proposed decisions requiring confirmation

`docs/decisions/release-1-register.md` has document status **Proposed for
approval in this PR**, and every detailed record says **Proposed for approval
in this PR**. There is no accepted marker, approver identity, approval date, or
later accepted decision record for the requested decisions.

| Decisions | P5 dependency | Result until confirmed |
| --- | --- | --- |
| DEC-006 | P5-TRUST-001 and catalog moderation permissions/events | Do not encode the prohibited taxonomy, cross-channel rejection, evidence, appeal, or strike consequences as accepted policy. |
| DEC-008 through DEC-011 | P5-SUP-001/002 deadlines, evidence, escalation, binding resolution, and strike/suspension rules | Freeze extensible fields/state machine only. Do not start automatic 7-day/48-business-hour enforcement or three-strike suspension. |
| DEC-014 through DEC-020 | P5-SUB-001 pricing, quotas, pilot/trial duration, notices, grace, retry, cancellation/downgrade/suspension, and retention | Freeze lifecycle/capability mechanics only. Do not market, bill, notify, or suspend from these values until accepted. |

Code that already embeds proposed values is evidence of implementation drift,
not evidence of approval. The smallest safe correction is to confirm the
decisions or place policy values behind explicitly non-production configuration
with safe disabled behavior before P5 rollout.

## 6. Smallest repair packages

### P5-FOUND-001 — Core request idempotency foundation

Smallest coherent repair before P5-SUP-001:

1. Add a Core `IdempotencyRecord` owned by Core with a unique tuple of
   authenticated subject, normalized route/operation, and key.
2. Persist request hash, lifecycle (`processing | completed | failed_safe`),
   response status/body hash or safe replay body, resource type/ID, correlation
   ID, and expiry/retention metadata.
3. Add middleware/service requiring `Idempotency-Key` for selected mutations;
   equal replay returns the original result, unequal request hash returns
   `IDEMPOTENCY_CONFLICT`, and a concurrent in-flight request returns a stable
   retryable response.
4. Write case creation and its opening event in one database transaction; a
   source buyer-report link also has a uniqueness constraint.
5. Document the header/error contract in Core OpenAPI and add database-backed
   duplicate, conflict, concurrent, crash/retry, tenant, and retention tests.

No support policy, UI, or runtime case behavior belongs in this repair.

### P5-POL-001 — Record human decisions

Record accepted/deferred status, named approver, actual approval date, and
effective policy version for DEC-006, DEC-008–011, and DEC-014–020. A deferred
decision must state the safe Release 1 behavior. This is documentation/policy
work, not an AI-invented default.

### P5-SUB-000 — Align authoritative subscription persistence

After P5-POL-001, add the lifecycle columns/state/events needed by the accepted
policy and migrate existing rows additively. Do not overwrite historical
payment or entitlement facts. Then P5-SUB-001 can make the lifecycle service
the only writer.

## 7. Verification evidence

Commands run from this worktree:

```text
Core focused prerequisites:
node --test --test-force-exit \
  test/security/privilegedAuthAndSessions.test.js \
  test/security/versionedEntitlements.test.js \
  test/security/standardEvents.test.js \
  test/security/cutluyPaymentFoundation.test.js
Result: PASS, 47/47 tests.

Commerce focused prerequisites:
node --test --test-force-exit \
  test/security/versionedEntitlements.test.js \
  test/security/standardEvents.test.js
Result: PASS, 18/18 tests.
```

The first attempt failed before loading tests because the new worktree had no
installed service dependencies (`Cannot find module 'sequelize'`). `npm ci`
was run from each API using its lockfile, and the focused suites then passed.
Dependencies remain ignored and are not part of this audit commit.

Final documentation verification:

- `npm run verify:repository` — **PASS**: secret scan; 15 Core and 25 Commerce
  migrations; 118 Core and 192 Commerce OpenAPI operations; generated clients;
  tokens; host policy; 310-operation authorization matrix; reconciliation; and
  repository policy all passed.
- `git diff --check` — **PASS**.

## 8. Exact next-prompt readiness

Ready now, without inventing policy:

- **P5-FOUND-001** using the frozen idempotency/error/audit contract.
- **P5-ADM-001 technical foundation** for role/grant schema, deny-by-default
  middleware, tests, and audit wiring, provided production break-glass duration
  and the final high-risk action list remain disabled/configuration-blocked
  until confirmed.
- **P5-NOT-001 technical foundation** for durable in-app notifications,
  event/recipient/dedupe contracts, delivery state, adapters, and mandatory
  class mechanics; customer wording and policy-timed events require approval.

Not ready:

- P5-SUP-001 until P5-FOUND-001 and DEC-008–011 confirmation/deferment.
- P5-SUB-001 until DEC-014–020 confirmation/deferment and P5-SUB-000.
- P5-TRUST-001 until DEC-006 is accepted or safely deferred.
