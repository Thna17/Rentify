# Rentify AI implementation plan

**Status:** Proposed execution plan, 2026-10-18
**Companion:** [`master-engineering-blueprint.md`](master-engineering-blueprint.md)
**Goal:** Give AI coding agents a safe, dependency-ordered, testable path from
the current repository to a production-ready Release 1.

This document translates the master blueprint into implementation work. It is
designed for AI-assisted delivery: tasks are bounded, prerequisites are
explicit, human decisions are separated from code work, and every phase ends
with evidence rather than a subjective claim of completion.

The plan does not claim the listed work is already implemented. Current
behavior remains documented in [`current-rentify-architecture.md`](current-rentify-architecture.md),
[`migration-plan.md`](migration-plan.md), and the individual contracts under
`docs/`.

---

## 1. Execution model

### 1.1 Work hierarchy

```text
Release 1
  -> Phase
      -> Workstream
          -> Work package (AI-sized unit)
              -> code + tests + migration + documentation + evidence
```

A work package is the unit assigned to one AI agent or one human/AI pair. It
should normally affect one bounded context, one user outcome, and one primary
repository area. If a task needs multiple migrations, unrelated UI journeys,
or more than one authoritative domain, split it unless the transaction itself
requires an atomic cross-repository change.

### 1.2 AI execution rules

Every AI implementation task must follow this sequence:

1. Read the root `AGENTS.md`, `README.md`, `docs/README.md`, this plan, and the
   task's listed source documents.
2. Inspect `git status`; preserve unrelated and uncommitted work.
3. Inspect the current implementation and tests before proposing changes.
4. Write a short task contract: current behavior, intended behavior, invariants,
   files likely to change, risks, and exact verification commands.
5. Run the smallest useful baseline tests before editing where practical.
6. Implement the narrowest coherent vertical slice. Do not perform an
   opportunistic rewrite or unrelated cleanup.
7. Add or update tests at the same level as the behavior: domain, integration,
   contract, browser, security, accessibility, or migration.
8. Update the relevant architecture/contract/runbook document in the same
   change. Label unimplemented follow-up work accurately.
9. Run affected-project verification and any task-specific checks.
10. Inspect the final diff for secrets, generated files, unrelated changes,
    unsafe migration behavior, and stale documentation.
11. Hand off an evidence summary: outcome, files, tests, migrations, flags,
    risks, rollback, and remaining work.

### 1.3 Actions AI must not invent

An AI agent may research the repository, prepare options, and draft an ADR, but
must wait for a named human decision before implementing any unresolved item
that changes:

- restricted/prohibited products or seller-verification policy;
- tax obligations, invoice legality, data-retention law, or privacy basis;
- delivery promises, return eligibility, deadlines, refund evidence, or buyer
  compensation;
- pricing, plan limits, commission rate, payout timing, or financial custody;
- production domains, CutLuy/provider contracts, credentials, merchant account
  connections, or real customer
  communication;
- irreversible deletion of production data or legacy credentials;
- a production traffic switch, migration execution, or financial correction.

AI may implement an approved decision only when the task links to its accepted
ADR, policy record, or explicit human approval.

### 1.4 Change-size guidance

Prefer work packages that are independently reviewable:

- one schema concern and its migration/backfill/audit;
- one state machine or one API resource;
- one complete UI journey slice backed by an existing contract;
- one operational capability with its dashboard, alert, and runbook;
- usually fewer than 20 materially changed source files.

This is guidance rather than a metric to game. Correct atomic behavior is more
important than a small diff. If a package grows, stop, record the discovered
dependency, and split the remaining work.

### 1.5 Branches and integration

- Use `codex/<work-package-id>-<short-name>` for AI-created branches unless the
  repository owner requests another naming convention.
- Rebase or update from the agreed integration branch before starting; never
  reset or overwrite another contributor's work.
- A migration, API schema change, authorization change, payment change, or
  cross-service event change requires the matching owner and QA review.
- Merge producers before consumers only when compatibility is preserved.
  Otherwise deploy additive server support first, then consumers, then remove
  compatibility in a later package.
- One active writer remains authoritative throughout every rollout.

---

## 2. Required task packet

Every work package placed into an AI queue must include the following fields.
An agent should return the task for clarification if a required human decision
is missing.

```markdown
# <ID>: <Outcome-oriented title>

## Customer outcome
Who benefits and what can they do after this ships?

## Current evidence
Links to code, tests, current architecture, and observed behavior.

## In scope
- Explicit behavior to implement.

## Out of scope
- Adjacent behavior that must not be changed.

## Invariants
- Tenant, money, stock, identity, compatibility, and state rules.

## Accepted decisions
- Links to accepted ADRs/policies. Write `none` when not applicable.

## Likely code areas
- Directories/modules, not assumed exact files.

## Acceptance criteria
- Observable Given/When/Then results.

## Required tests
- Unit, integration, contract, browser, security, migration, accessibility.

## Verification commands
- Exact commands from repository scripts and task-specific smoke checks.

## Rollout and rollback
- Feature flag/cohort, compatibility order, monitoring, and disable path.

## Documentation
- Files that must reflect the final behavior.
```

### Standard handoff format

```markdown
Outcome:
Changed:
Tests/evidence:
Migrations/data impact:
Flags/configuration:
Security/privacy impact:
Rollback:
Remaining risks or blocked decisions:
```

---

## 3. Phase and dependency map

```text
P0 Decisions and baseline
  |
  +--> P1 Contracts and engineering foundation
  |       |
  |       +--> P2 Identity, tenancy, and production host security
  |       |
  |       +--> P3 Canonical catalog, inventory, and transaction core
  |                 |
  |                 +--> P4 Merchant, buyer, storefront, and POS journeys
  |                           |
  |                           +--> P5 Trust, support, and subscriptions
  |                                     |
  +------------------------------------> P6 Production operations and hardening
                                                |
                                                +--> P7 Closed beta
                                                        |
                                                        +--> P8 General availability
                                                                  |
                                                                  +--> P9 CutLuy QR rollout
```

P2 and the early parts of P3 can run in parallel after P1 contracts are stable.
Design-system foundations can begin during P1, but a journey UI must not get
ahead of its accepted API and product policy.

### Recommended parallel lanes

| Lane | Primary scope | May run after |
| --- | --- | --- |
| A — Product/UX | Policies, research, flows, content, design tokens | P0 starts |
| B — Core/Identity | Identity, Store, Website, entitlement, projection | P0 decisions, P1 contract rules |
| C — Commerce | Catalog, inventory, checkout, orders, payments | P1 contract rules |
| D — Experiences | Merchant, buyer, storefront, POS, admin | Relevant B/C contract is additive and tested |
| E — Platform/QA | CI, telemetry, infrastructure, security, browser tests | Immediately after baseline |
| F — Operations | Support playbooks, seller review, release/reconciliation | P0 policies and operational APIs |
| G — Payments | CutLuy adapter, events, subscription migration, seller connection | P3-PAY-002 and stable production operations |

No more than one active schema-changing package should modify the same tables
at a time. No more than one package should change a given state machine at a
time.

---

## 4. Phase P0 — decisions, inventory, and frozen Release 1 contract

**Purpose:** prevent AI from implementing contradictory assumptions.
**Code posture:** read-only analysis and documentation except for safe audit
scripts or tests that characterize existing behavior.

### P0 work packages

#### P0-001 — Release 1 decision register

**Owner:** human product/business lead with AI drafting support
**Depends on:** none

Create `docs/decisions/release-1-register.md` containing owner, status, chosen
option, rationale, effective date, affected contracts, and review date for:

- launch domains and hosted storefront parent domain;
- marketplace/storefront delivery fee model;
- tax display and calculation scope;
- restricted products and moderation rules;
- return eligibility, response deadlines, evidence, and refund confirmation;
- multi-merchant cart and separate-order presentation;
- subscription plans, pilot limits, trial, grace, failed renewal, cancellation;
- custom-domain browse versus checkout scope;
- supported browsers/devices and language requirements;
- privacy retention and account deletion/anonymization.

**Acceptance:** every P0 decision is either `Accepted` with a named approver or
`Deferred` with an explicit Release 1 behavior that safely disables dependent
functionality.

#### P0-002 — Current capability and route inventory

**Owner:** architecture/QA
**AI-safe:** yes
**Depends on:** none

Generate and review an inventory of:

- Core and Commerce routes, auth method, actor, tenant key, controller, domain
  service, response schema, and tests;
- frontend routes and the APIs they call;
- database models/migrations and authoritative owner;
- stock, order, payment, refund, subscription, media, and projection writers;
- feature flags and environment variables;
- background jobs, schedules, retry rules, and reconciliation commands.

Store machine-generated reports outside committed source unless stable and
reviewed. Commit a concise discrepancy report under `docs/audits/`.

**Acceptance:** no active endpoint or writer has unknown ownership; every
Release 1 journey maps from UI to API to authoritative tables.

#### P0-003 — Baseline evidence run

**Owner:** QA/platform
**AI-safe:** yes
**Depends on:** P0-002

Run and record:

- `npm run verify`;
- empty-database and existing-database migration verification;
- projection, Store mapping, catalog, and COD audit commands;
- current Docker journey rehearsal;
- known skipped, flaky, environment-dependent, or missing checks.

Do not “fix while auditing.” Create separate work packages for every failure.

**Acceptance:** `docs/audits/release-1-baseline.md` records commit SHA,
environment, commands, results, failures, and owners.

#### P0-004 — Five golden-journey specifications

**Owner:** product/design/QA
**AI-safe:** draft only; human accepts
**Depends on:** P0-001, P0-002

Write Given/When/Then specifications for:

1. marketplace-only merchant to completed COD order;
2. storefront merchant selling one SKU on marketplace and storefront;
3. POS and online buyers competing for the final unit;
4. buyer return/complaint through direct refund and support closure;
5. subscription trial through renewal/grace/suspension with historical access.

Include happy path, validation, retry, conflict, unauthorized, provider failure,
offline/timeout, and recovery behavior in English and Khmer.

**Exit gate P0**

- decision register accepted or safely deferred;
- capability inventory reviewed by Core, Commerce, frontend, data, and QA;
- baseline evidence reproducible;
- golden-journey specifications approved;
- no implementation package depends on an unresolved silent assumption.

---

## 5. Phase P1 — contracts, test harness, and platform foundation

**Purpose:** give every later AI task stable interfaces and observable results.

### P1 work packages

#### P1-API-001 — Core OpenAPI baseline

**Scope:** document active Core Release 1 routes, common schemas, cookies,
errors, pagination, versions, and examples. Add schema validation/compatibility
checking to CI without changing runtime behavior first.

**Likely areas:** `rentify-server/`, `tools/`, `.github/workflows/`, `docs/`
**Depends on:** P0-002
**Acceptance:** spec matches characterized routes; CI detects an undocumented
breaking response/request change; secret fields are absent.

#### P1-API-002 — Commerce OpenAPI baseline

Same contract standard as P1-API-001 for catalog, cart, checkout, order, POS,
invoice, payment, admin, and reconciliation-facing Release 1 routes.

**Depends on:** P0-002
**Acceptance:** marketplace and storefront COD examples validate; money,
timestamps, IDs, versions, and idempotency requirements are explicit.

#### P1-API-003 — Standard API error envelope

Introduce a backward-compatible error envelope:

```json
{
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Safe fallback message",
    "fieldErrors": [],
    "retryable": false,
    "correlationId": "..."
  }
}
```

Migrate one module per follow-up package rather than rewriting all controllers
in one diff. Preserve old fields until every consumer changes.

**Depends on:** P1-API-001, P1-API-002
**Acceptance:** centralized safe error mapping, production stack traces hidden,
frontend compatibility tests, and documented retirement point for legacy
fields.

#### P1-API-004 — Typed frontend clients

Create or consolidate typed clients from accepted contracts for React and
Angular. Generated code, if used, must be deterministic and separated from
handwritten domain adapters.

**Depends on:** P1-API-001, P1-API-002
**Acceptance:** all new Release 1 UI work imports approved clients; CI compiles
clients against both specs; credentials and origins are configured centrally.

#### P1-OBS-001 — Correlation IDs and structured logging

Add incoming/generation rules for correlation IDs, safe propagation between
Core and Commerce, JSON production logs, route templates, duration, status,
service version, and redaction tests.

**Depends on:** P0-002
**Acceptance:** one signup-to-projection and one checkout request can be traced
across services by correlation ID; tokens, cookies, passwords, addresses, and
payment credentials never appear in test-captured logs.

#### P1-OBS-002 — Readiness and dependency health

Keep `/health` as a liveness probe. Add safe readiness checks for database,
required migrations, Redis where required, and worker readiness without
exposing configuration.

**Depends on:** P1-OBS-001
**Acceptance:** orchestrator can distinguish process alive from service ready;
dependency loss changes readiness predictably; tests cover degraded states.

#### P1-QA-001 — Shared integration fixture builder

Create deterministic test builders for two Stores, Websites, owner/staff/buyer
roles, categories, simple and variant Products, carts, orders, COD, returns,
subscriptions, and projections. Builders must work only in test databases.

**Depends on:** P0-003
**Acceptance:** Core and Commerce integration tests reuse stable fixtures;
tenant IDs are clearly distinct; cleanup is deterministic.

#### P1-QA-002 — Contract and browser test shell

Create a production-like E2E harness capable of starting migrated APIs and UIs,
seeding via supported test interfaces, retaining screenshots/traces on failure,
and running tagged golden journeys.

**Depends on:** P1-QA-001, P1-API-001, P1-API-002
**Acceptance:** one read-only buyer browse test and one authenticated merchant
read test run in CI; production credentials/hosts are rejected.

#### P1-UX-001 — Shared design tokens and quality baseline

Inventory React/Angular colors, type, spacing, radius, status, breakpoints, and
focus styles. Publish framework-neutral tokens and implement adapters without a
component rewrite.

**Depends on:** P0-004
**Acceptance:** one representative React and Angular page render from the same
semantic tokens; accessibility/contrast tests pass; legacy screens remain
visually stable unless an approved change exists.

**Exit gate P1**

- Core and Commerce API contracts validate in CI;
- typed clients can compile;
- trace/correlation evidence crosses services;
- test fixtures and browser harness run safely;
- design tokens are usable in both frontend frameworks;
- affected root and project verification commands pass.

---

## 6. Phase P2 — identity, tenancy, entitlements, and host security

**Purpose:** prove who the user is, what Store they act for, and which host may
receive a session before enabling production transactions.

### P2 work packages

#### P2-ID-001 — Identity and role model audit

Characterize merchant, staff, buyer, admin, and legacy Customer identities,
session types, refresh/revocation, contact verification, and role collisions.
Add tests for one person with multiple legitimate roles.

**Depends on:** P1-QA-001
**Acceptance:** one documented subject model; no request selects identity from
untrusted body/query data; ambiguous-cookie behavior is deterministic.

#### P2-AUTHZ-001 — Authorization policy matrix

Create a version-controlled matrix for every Release 1 resource/action and
actor. Convert it into table-driven security tests for both APIs.

**Depends on:** P0-002, P2-ID-001
**Acceptance:** owner, permitted staff, unpermitted staff, unrelated merchant,
buyer owner, other buyer, public, suspended actor, and admin cases are covered.

#### P2-AUTHZ-002 — Store-first tenant enforcement

Remove remaining authorization decisions that infer merchant ownership solely
from Website or domain. Keep `websiteId` as channel context and compatibility
where required.

Split by module: catalog, cart/order, POS/invoice, media, staff, admin.

**Depends on:** P2-AUTHZ-001
**Acceptance:** every mutable commerce record resolves to exactly one Store;
direct identifier guessing fails; Store audit reports zero unexplained rows.

#### P2-ENT-001 — Versioned entitlements

Model capabilities independently of plan display names: marketplace listing,
Website, product/staff limits, POS, invoices, and future capabilities. Define
trial, active, grace, suspended, cancelled, and historical-read behavior from
P0-001.

**Depends on:** accepted subscription decisions, P1 API contracts
**Acceptance:** APIs enforce entitlements server-side; UI explains disabled
actions; historical orders remain readable according to accepted policy.

#### P2-HOST-001 — Production host and configuration validator

Implement a startup/deployment validation command for public origins, owned
hosted parent, cookie domain/flags, exact CORS origins, auth return allowlist,
reserved subdomains, HTTPS, and incompatible feature-flag combinations.

**Depends on:** accepted launch-domain decision
**Acceptance:** unsafe wildcard/HTTP production configuration fails before
traffic; staging configuration passes and is captured as evidence.

#### P2-HOST-002 — Hosted-subdomain login and logout rehearsal

Automate buyer login, return URL, session rotation, cart, checkout-readiness,
order history, logout, and cross-Store isolation on the real staging hostname
pattern.

**Depends on:** P2-HOST-001, P1-QA-002
**Acceptance:** supported browsers pass; cookie/CORS attributes are asserted;
arbitrary sibling/subdomain access is not possible.

#### P2-HOST-003 — Custom-domain boundary

If Release 1 custom domains are browse-only, enforce and explain that boundary.
If checkout is accepted, implement ADR 0002 as separate packages: registered
redirects, authorization transaction, one-time code, PKCE/state, domain-local
callback, host session, revocation/logout, and legacy linking.

**Depends on:** accepted ADR and hosting decision
**Acceptance:** custom-domain checkout is either securely proven or impossible
to enable accidentally.

#### P2-SEC-001 — Privileged authentication and session controls

Implement MFA for administrators, recent-auth requirements for high-risk
actions, session inventory/revocation, secure recovery/contact change, and
privileged audit events.

**Depends on:** P2-ID-001
**Acceptance:** recovery cannot bypass verification; role elevation and session
revocation are tested; admin login meets the accepted security policy.

**Exit gate P2**

- authorization matrix green for all Release 1 resources;
- zero unexplained Store/Website ownership mappings;
- entitlements enforced by APIs;
- real staging host login/logout/CORS/cookie journey passes;
- custom-domain transaction boundary is enforced;
- privileged access is auditable and revocable.

---

## 7. Phase P3 — canonical catalog, inventory, order, and COD core

**Purpose:** guarantee product, stock, order, and money correctness under retry,
concurrency, and every sales channel.

### P3 work packages

#### P3-CAT-001 — Canonical Product/SKU contract

Define Product versus SKU/variant identity, attributes, price, barcode, status,
and channel eligibility. Backfill simple Products to one default SKU without
breaking current API consumers.

**Depends on:** P1-API-002, P0 policies
**Acceptance:** simple and variant Products have stable purchasable IDs; old
Product routes remain compatible during migration; duplicate SKU identifiers
within a Store are rejected.

#### P3-CAT-002 — Product publication and visibility explanation

Centralize the effective marketplace/storefront eligibility decision and
return safe reason codes to merchant/admin clients.

**Depends on:** P3-CAT-001, P2-ENT-001
**Acceptance:** one function/policy evaluates Store status, seller approval,
entitlement, categories, Product state, moderation, visibility, Website state,
stock, and delivery readiness; public reads fail closed.

#### P3-INV-001 — Inventory ledger and balance invariant

Add immutable reasoned inventory entries and a balance/reservation invariant.
Map `sale`, `cancel`, `return`, `restock`, `adjustment`, and POS/invoice reasons.

**Depends on:** P3-CAT-001
**Acceptance:** every change is attributed and linked; balance cannot be
negative; replay cannot apply twice; audit reconstructs expected balance.

#### P3-INV-002 — Migrate all stock writers

Inventory and migrate writers in small packages:

1. marketplace checkout/cancel;
2. hosted storefront checkout/cancel;
3. legacy Website order compatibility;
4. POS;
5. invoice fulfillment;
6. return/restock and admin adjustment.

**Depends on:** P3-INV-001
**Acceptance:** no route/model hook mutates stock outside the canonical service;
static ownership check and integration tests enforce the rule.

#### P3-INV-003 — Reservation and concurrency tests

Add database-backed tests for last unit across marketplace, storefront, POS,
invoice, retry, cancellation, timeout, deadlock retry, and variant selections.

**Depends on:** each P3-INV-002 slice
**Acceptance:** one winner for the last unit, no negative balance, no duplicate
deduction/restoration, and deterministic conflict response.

#### P3-ORD-001 — Explicit order and fulfillment state machines

Move legal transitions into domain services. Preserve compatible response
fields while clients migrate. Record actor/reason/idempotency and append events.

**Depends on:** accepted delivery/return decisions, P3-INV-001
**Acceptance:** controllers cannot assign protected states directly; invalid
transitions fail with stable codes; cancellation has one stock effect.

#### P3-MNY-001 — Money representation and order snapshots

Audit floating-point use and normalize transaction calculations to currency
plus exact minor units/fixed decimals. Snapshot product/SKU, price, discounts,
tax, commission, delivery, Store, and policy versions on order lines/order.

**Depends on:** accepted tax/delivery decisions, P1-API-002
**Acceptance:** server recalculates totals; changed totals require buyer review;
rounding tests cover USD/KHR policy; historical orders do not change when the
catalog or policy changes.

#### P3-COD-001 — COD payment/refund state machine

Centralize `pending -> collected -> partially_refunded/refunded` transitions,
collection evidence, refund limits, actor, time, method, and reconciliation.

**Depends on:** P3-ORD-001, P3-MNY-001, accepted refund policy
**Acceptance:** delivery never implies payment; request never implies refund;
collected/refunded amounts reconcile to event history; replay is safe.

#### P3-PAY-002 — Provider-neutral CutLuy payment foundation

Implement the payment-attempt and immutable provider-event model, provider
adapter boundary, CutLuy adapter, signed raw-body webhook verification,
idempotent creation, status mapping, reconciliation, replay, and operator-safe
diagnostics defined by [ADR 0003](adr/0003-cutluy-qr-payments.md). This package
does not enable buyer checkout or replace the live subscription flow.

Use synthetic/test credentials only. Model the provider account reference
explicitly so a Rentify-owned subscription account cannot be confused with a
seller-owned account. Never expose API keys, webhook secrets, QR payloads, or
prohibited metadata in logs or clients.

**Depends on:** P1-API-002, P1-OBS-001, P3-MNY-001, P3-EVT-001, accepted ADR
0003
**Acceptance:** duplicate creation and duplicate/out-of-order events have one
effect; HMAC verification uses the raw body, timestamp freshness, and
constant-time comparison; paid/expired/failed/invalid-signature/quota/outage
tests pass; amount, USD currency, reference, and account ownership reconcile;
adapter contract tests do not require a production credential.

#### P3-CART-001 — Channel-safe Store carts

Resolve the current shared Store cart/channel eligibility ambiguity. Implement
the accepted model—prefer separate carts by Store and channel unless P0 chooses
a different explicit rule.

**Depends on:** P3-CAT-002, accepted cart UX
**Acceptance:** marketplace and storefront additions cannot create a confusing
ineligible checkout; multi-Store carts remain independently recoverable.

#### P3-EVT-001 — Standard outbox/inbox and replay operations

Standardize schema version, aggregate version, event ID, trace ID, retries,
processed-event inbox, dead-letter state, operator inspection, and safe replay.

**Depends on:** P1-OBS-001
**Acceptance:** duplicate/out-of-order/delayed events are tested; poison events
are visible; replay cannot duplicate authoritative effects.

#### P3-REC-001 — Continuous reconciliation suite

Unify or orchestrate audits for Store projections, Website mapping, published
catalog, SKU balances, carts/orders, COD, refunds, and subscriptions. Produce
machine-readable and human summaries.

**Depends on:** relevant P3 packages
**Acceptance:** command exits nonzero for unexplained differences, distinguishes
zero-data from proven behavior, and never mutates production records.

**Exit gate P3**

- simple and variant Products purchase correctly;
- every stock writer uses the canonical inventory path;
- order/fulfillment/COD/refund state machines enforce legal transitions;
- exact totals and snapshots are stable;
- concurrency and replay tests pass;
- reconciliation reports zero unexplained differences.

---

## 8. Phase P4 — complete customer-facing golden journeys

**Purpose:** turn correct domain behavior into simple, coherent user outcomes.

Each package must include mobile, desktop, English, Khmer, loading, empty,
validation, forbidden, conflict, timeout, and recovery states. Use shared API
clients and design tokens; do not duplicate backend rules in the UI.

### Merchant experience packages

#### P4-MER-000 — Merchant dashboard information architecture and UX foundation

Audit and define the merchant workspace before redesigning individual journeys.
Use the Admin dashboard as a visual-language reference for hierarchy, grouped
navigation, page headers, action queues, cards, tables, filters, drawers,
semantic status badges, feedback states, and responsive behavior. The merchant
workspace must remain role-appropriate: it must not expose platform-admin
controls, moderation powers, cross-tenant data, or admin-specific workflows.

**Depends on:** P1-UX-001, P1-API-004, relevant P2 authorization packages
**Acceptance:**

- a reviewed audit maps every active merchant route to its navigation label,
  owner, actor/permission, API dependency, responsive state, English/Khmer
  coverage, and target disposition (`keep`, `merge`, `redirect`, or `retire`);
- one approved target information architecture covers Home/launch, Products,
  Orders, sales channels, Customers, Insights, Finance, Team/Settings, and
  Help without separate Website-only and marketplace-only workspaces;
- the component inventory identifies which shared React primitives will be
  reused and which merchant shell, page-header, data-view, status, feedback,
  and action components must be added or consolidated;
- UI gaps and API/contract gaps are recorded separately for P4-MER-001 through
  P4-MER-005, with Store-first ownership and typed-client migration called out;
- route compatibility preserves documented bookmarks and redirects, with
  automated checks for old product, catalog, order, marketplace-order,
  storefront, settings, usage, support, and ops aliases;
- the implementation plan names the exact expected code and test areas, covers
  360 px and desktop layouts, keyboard/focus/zoom/reduced-motion needs, and
  requires reviewed English and Khmer copy for every critical state;
- `git diff --check` and `npm run verify:repository` pass for the audit package,
  and no merchant page redesign or runtime behavior change is included.

#### P4-MER-001 — Resumable onboarding and path selection

Implement Store-first onboarding with marketplace-only and storefront paths,
saved progress, contact verification, primary category, Store details, and an
honest final status.

**Depends on:** P2 identity/entitlements, P0 decisions
**Acceptance:** retries create no duplicate Store/Website/subscription; a
marketplace-only merchant reaches a useful workspace without a Website.

#### P4-MER-002 — Merchant launch checklist

Drive Store details, delivery/return policy, first product, seller application,
preview, approval, and publish from one action-oriented home.

**Depends on:** P4-MER-001, P3-CAT-002
**Acceptance:** every blocked item states reason and next action; activation
events measure progression and completion.

#### P4-MER-003 — Product/SKU editor and media

Build quick simple-product creation and advanced variants, images/alt text,
category, price, stock, visibility, preview, conflict handling, and archive.

**Depends on:** P3-CAT-001, P3-INV-001
**Acceptance:** one published Product appears with the same ID/price/stock on
eligible marketplace and storefront surfaces.

#### P4-MER-004 — Bulk import/export

Add asynchronous CSV template, preview, per-row validation, idempotent job,
result report, and safe retry. Do not let import bypass authorization,
categories, SKU uniqueness, or publication rules.

**Depends on:** P4-MER-003
**Acceptance:** partial invalid data does not silently publish; job history and
correction report are available.

#### P4-MER-005 — Unified order operations

Present marketplace, storefront, POS, and invoice orders with channel label,
next action, buyer-safe contact, amount due, fulfillment, COD, returns, reports,
and event timeline.

**Depends on:** P3-ORD-001, P3-COD-001
**Acceptance:** permitted merchant/staff completes every legal action; high-risk
actions summarize consequences and require reason/evidence.

### Buyer experience packages

#### P4-BUY-001 — Marketplace discovery

Implement responsive home, category, search, filter/sort, Store, product, empty,
error, and unavailable states with public-safe data and SEO metadata.

**Depends on:** P3-CAT-002, P1-UX-001
**Acceptance:** only eligible products appear; search zero-result recovery and
latency telemetry exist; product selection resolves an available SKU.

#### P4-BUY-002 — Store-grouped cart

Show separate Store/channel groups, stock changes, delivery fee, exact subtotal,
readiness reasons, preserved unselected carts, and clear separate-order copy.

**Depends on:** P3-CART-001, accepted multi-merchant UX
**Acceptance:** buyer can check out one Store without losing another; totals
come from Commerce; stale quote requires review.

#### P4-BUY-003 — COD checkout and confirmation

Implement verified sign-in return, contact/address, policy acknowledgement,
exact review, idempotent place-order, safe retry, and refresh-safe confirmation.

**Depends on:** P2-HOST-002, P3-MNY-001, P3-COD-001, P4-BUY-002
**Acceptance:** double click/reload/network retry creates one order; confirmation
shows order reference, Store, items, address, amount due, and next step.

#### P4-BUY-004 — Order history, tracking, return, and complaint

Render an event-derived timeline and policy-valid actions with evidence upload
where accepted.

**Depends on:** P3-ORD-001, P5 support contract can be additive
**Acceptance:** buyer sees only own orders; request status and service deadline
are visible; a request does not change payment/refund facts.

### Storefront and physical commerce packages

#### P4-SF-001 — Hosted storefront full journey

Make each template use shared catalog/SKU/cart/checkout/order adapters and the
same failure semantics. Remove template-specific transaction logic.

**Depends on:** P2-HOST-002, P4-BUY-002/003
**Acceptance:** all templates pass the same contract/browser suite; Website and
Store suspension behavior is consistent; hosted flag is cohort-controlled.

#### P4-POS-001 — POS shared-stock journey

Implement SKU selection/barcode where supported, cart, exact totals, sale,
receipt, offline/timeout guidance, cancellation/return boundaries, and staff
permission checks.

**Depends on:** P3-INV-002 POS slice, P3-ORD-001
**Acceptance:** POS and online final-unit competition passes; retry creates one
sale; unauthorized staff cannot transact.

#### P4-INV-001 — Invoice shared-stock journey

Clarify quote/invoice/order semantics and when stock changes. Implement legal
state transitions, exact totals, receipt/payment evidence, and cancellation.

**Depends on:** accepted invoice policy, P3 inventory/order/money packages
**Acceptance:** invoice never silently double-deducts stock; financial and stock
effects reconcile and are documented.

### Cross-experience packages

#### P4-UX-002 — Internationalization and content enforcement

Move Release 1 customer text into stable English/Khmer catalogs, add missing-key
CI checks, locale formatting, long-text layout tests, and plain-language error
mapping.

**Depends on:** P1-UX-001, P1-API-003
**Acceptance:** critical journeys contain no unintended hard-coded customer
strings; both locales pass browser tests.

#### P4-UX-003 — Accessibility and weak-network pass

Add automated accessibility gates and manually verify keyboard, screen reader,
200% zoom, reduced motion, slow network, image failure, and touch targets.

**Depends on:** P4 journey pages
**Acceptance:** no critical/serious automated issues on golden journeys; manual
findings are resolved or accepted with owner/date.

**Exit gate P4**

- four customer journeys—merchant activation, marketplace COD, hosted
  storefront COD, and POS final-unit—pass end to end on staging;
- React and Angular use shared contracts/tokens and consistent state language;
- English/Khmer and mobile/desktop critical paths pass;
- no P0/P1 usability, accessibility, authorization, money, or stock defect.

---

## 9. Phase P5 — trust, support, subscriptions, and administration

**Purpose:** ensure real customers can be protected and supported after an order
or account stops following the happy path.

### P5 work packages

#### P5-TRUST-001 — Restricted-product enforcement

Encode the accepted restricted-product taxonomy, seller guidance, product hold,
moderator reason/evidence, appeal state, and audit event. Rules must be
versioned and explainable.

**Depends on:** accepted P0 policy, P3-CAT-002
**Acceptance:** prohibited items cannot become purchasable; moderator action is
tenant-safe and auditable; merchant sees safe actionable reasons.

#### P5-SUP-001 — Durable support case domain

Create cases with type, priority, status, assignee, service deadline, linked
subject IDs, safe notes, attachments, events, and resolution. Cases reference
authoritative records instead of copying their mutable facts.

**Depends on:** accepted response deadlines, P1 API rules
**Acceptance:** buyer report can open/link a case idempotently; assignment,
notes, escalation, resolution, and audit are tested.

#### P5-SUP-002 — Admin case workspace

Build queues, filters, case detail, linked Store/Product/Order evidence,
communications, actions, deadlines, and audit history using server-enforced
permissions.

**Depends on:** P5-SUP-001
**Acceptance:** support agent cannot perform seller-review/finance actions
without permission; actions link back to the case and reason.

#### P5-ADM-001 — Scoped admin roles and maker-checker

Replace the single broad admin authority for Release 1 operations with support,
seller reviewer, catalog moderator, finance/reconciliation, and platform admin
permissions. Add dual approval for accepted high-risk actions.

**Depends on:** P2-SEC-001
**Acceptance:** privilege matrix tests pass; high-risk action cannot be approved
by its initiator; break-glass use is time-bound and audited.

#### P5-NOT-001 — Notification event and preference model

Define in-app source-of-truth notifications, templates, recipient resolution,
provider adapters, retry/delivery state, dedupe, preferences, and mandatory
security/transaction exceptions.

**Depends on:** P3-EVT-001, approved content
**Acceptance:** seller review, order, delivery, return, refund, support, and
security events notify correct recipients once; provider failure is visible and
retryable.

#### P5-SUB-001 — Subscription lifecycle

Implement the accepted trial, plan payment, activation, renewal, grace, failed
payment, cancellation, suspension, downgrade, and historical-read behavior.
Entitlements change through one audited service.

**Depends on:** P2-ENT-001, P3-PAY-002, accepted P0 pricing/lifecycle
**Acceptance:** retry and callback dedupe are safe; plan display and enforcement
match; subscription revenue reconciles independently of COD GMV; CutLuy rollout
is feature-flagged and can return to the prior provider without corrupting
payment or entitlement state.

#### P5-ANA-001 — Defined operational and product metrics

Instrument activation, search, cart, checkout, fulfillment, COD, return,
support, reliability, and subscription events using a reviewed event catalog.

**Depends on:** P1-OBS-001 and relevant journeys
**Acceptance:** event names/properties are versioned; personal data is excluded
or minimized; dashboards distinguish GMV, COD, refunds, and Rentify revenue.

**Exit gate P5**

- a real support team can resolve the golden return/complaint journey;
- seller/product enforcement has reason, appeal, and audit;
- least-privilege admin roles are enforced;
- notification failures are visible;
- subscription access and revenue reconcile;
- business dashboards use agreed definitions.

---

## 10. Phase P6 — production infrastructure, security, reliability, and release

**Purpose:** make the product deployable, recoverable, observable, and safe for
closed-beta traffic.

### P6 work packages

#### P6-INF-001 — Infrastructure as code

Provision staging and production definitions for networking, services, SQL,
Redis, media/CDN, DNS/TLS, WAF/rate limits, secrets, telemetry, backups, and
alerts. Select the smallest managed platform the team can operate reliably.

**Human input:** provider/account/budget/region
**Acceptance:** clean staging can be created reproducibly; drift and secret
handling are documented; production changes require review.

#### P6-CICD-001 — Release pipeline

Extend CI/CD with immutable images, SBOM, vulnerability policy, migration
checks from empty and prior schema, contract compatibility, browser journeys,
accessibility, staging smoke, deployment approval, and post-deploy probes.

**Depends on:** P1-QA-002, P6-INF-001
**Acceptance:** failed required gate cannot deploy; artifact and commit are
traceable; rollback uses a known prior compatible artifact.

#### P6-OBS-001 — Metrics, tracing, dashboards, and alerts

Implement the blueprint SLO indicators for APIs, browser errors, SQL, Redis,
outbox, auth, catalog, checkout, stock, COD, support, and subscriptions.

**Depends on:** P1-OBS packages, journey instrumentation
**Acceptance:** alerts are symptom-based, tested, owned, and linked to runbooks;
no personal data is used as a metric label.

#### P6-DR-001 — Backup, restore, and reconciliation drill

Automate encrypted backups and perform isolated Core, Commerce, and media
restore. Run P3-REC-001 after restore and record observed RPO/RTO.

**Depends on:** P6-INF-001, P3-REC-001
**Acceptance:** restored identities, Stores, Products, stock, orders, COD, and
subscriptions reconcile; evidence identifies backup and restored environment.

#### P6-REL-001 — Deployment and rollback drill

Test additive migration, API/UI deployment order, feature flag cohort, smoke,
intentional failure, rollback, and preservation of in-flight orders.

**Depends on:** P6-CICD-001
**Acceptance:** timed runbook succeeds; rollback never reactivates KhmerCraft or
transfers an in-flight transaction to another authority.

#### P6-SEC-001 — Release threat model and remediation

Review identity, tenant access, media, checkout, admin, exports, callbacks,
secrets, dependencies, and infrastructure. Add automated negative tests and
close critical/high findings.

**Depends on:** P2, P3, P5, P6-INF-001
**Acceptance:** no unresolved critical/high issue; accepted medium risks have
owner/date/mitigation; incident contacts and evidence preservation exist.

#### P6-PERF-001 — Capacity and resilience test

Use production-like data volumes to test browse/search, login, checkout bursts,
last-unit contention, admin queues, imports, outbox backlog recovery, Redis
loss, dependency timeout, and database pool saturation.

**Depends on:** stable golden journeys, P6-OBS-001
**Acceptance:** SLO targets pass at agreed beta load with headroom; overload
fails safely; scaling thresholds and bottlenecks are documented.

#### P6-OPS-001 — Operational handbook

Finalize on-call, incident levels, communication templates, seller review,
restricted products, returns/refunds, support cases, reconciliation, privacy
requests, deploy, rollback, restore, and emergency suspension runbooks.

**Depends on:** accepted policies and implemented admin capabilities
**Acceptance:** tabletop exercises are completed by the humans who will operate
the product; every alert/action has a named owner.

**Exit gate P6**

- production-like staging passes all golden journeys and reconciliation;
- no unresolved critical/high security or data risk;
- restore and rollback drills meet accepted targets;
- SLO dashboards and actionable alerts are live;
- operators complete incident and customer-support exercises;
- production flags default to safe/off states.

---

## 11. Phase P7 — closed beta

**Purpose:** prove product value and operations with a deliberately small real
cohort before public scale.

### P7 work packages

#### P7-001 — Beta cohort and data readiness

Select a diverse, supportable cohort: marketplace-only, storefront, physical
POS, simple Product, and variant Product merchants. Complete verification,
category, policy, product, delivery, and support readiness before enabling
transactions.

#### P7-002 — Internal transaction rehearsal

Run controlled real-device orders through marketplace, hosted storefront, POS,
delivery failure, retry, cancellation, collection, return, refund confirmation,
support, and reconciliation.

#### P7-003 — Invited buyer beta

Enable buyers by cohort. Monitor sessions, support every incident, and hold
daily review of activation, checkout, stock, COD, returns, latency, and errors.

#### P7-004 — Usability and defect closure

Observe at least five merchants and five buyers completing their target jobs.
Fix every P0/P1 issue and retest. Do not explain around a confusing workflow;
improve the product or documentation.

#### P7-005 — Two-cycle operational proof

Complete at least two full operating/reconciliation cycles without unexplained
money, stock, identity, or access discrepancies.

**Exit gate P7**

- no open P0/P1 defect;
- zero unexplained stock, COD, refund, subscription, or projection difference;
- SLO/error budget targets pass for the observation window;
- seller review and support deadlines are sustainable;
- merchants and buyers complete core jobs without engineering help;
- named product, engineering, QA, security, data, and operations owners sign
  the production release record.

---

## 12. Phase P8 — controlled general availability

**Purpose:** expand public access without losing the ability to stop safely.

### Rollout sequence

1. Public browsing with approved beta sellers.
2. Marketplace checkout for approved seller cohort.
3. Hosted storefront checkout for proven templates/cohort.
4. POS/invoice enablement for trained merchants.
5. Expand categories and merchant cohorts based on error budget and operations.
6. Remove unused compatibility/legacy dependencies only after the observation
   period and a final dependency scan.

### Automatic stop conditions

Pause cohort expansion and disable the affected transaction flag for:

- suspected tenant isolation or personal-data exposure;
- duplicate order/collection/refund effects;
- negative or unexplained stock;
- unexplained financial reconciliation difference;
- authentication/session failure above threshold;
- exhausted checkout SLO error budget;
- support or seller-review backlog beyond accepted safety limits.

Existing orders remain readable and operable during a checkout pause.

### GA completion evidence

- cohort, flags, commit/artifacts, migrations, and owner decision recorded;
- audits and reconciliation green after each expansion;
- customer policies/help/status/support are public;
- legacy KhmerCraft runtime dependencies and credentials removed only after the
  approved retirement gate;
- first post-launch review produces a measured P1/P2 roadmap.

---

## 13. Phase P9 — CutLuy QR payment rollout

**Purpose:** replace new direct Bakong/KHQR integration work with a secure,
observable CutLuy integration without confusing Rentify subscription revenue
with seller customer funds.

**Timing:** begin only after P3-PAY-002, P5-SUB-001, P6 operational readiness,
and the relevant P7/P8 stability gates pass. Subscription migration may be
piloted before seller payments. Seller payments remain separately flagged.

**Authoritative decision:** [ADR 0003](adr/0003-cutluy-qr-payments.md).

### Non-negotiable boundaries

- Core owns Rentify subscription payment attempts and subscription effects.
- Commerce owns order payment attempts and order payment effects.
- Neither service writes the other service's payment records or database.
- A Rentify-owned CutLuy Store is used only for money owed to Rentify.
- A seller-owned CutLuy Store is required for that seller's customer payments.
- The browser never receives an API key or webhook secret.
- A redirect, QR scan, screenshot, frontend callback, or `scanned` event never
  marks a payment paid.
- CutLuy `paid`, authenticated and matched to the stored attempt, is the only
  online success signal; reconciliation may repair a missing event using the
  provider read API under the same validation rules.
- CutLuy supports USD in the verified contract. KHR checkout must stay disabled
  unless the provider contract changes and a new decision is recorded.
- CutLuy is not used to promise refunds, escrow, marketplace commission splits,
  seller payouts, chargebacks, or fund holds.
- Historical Bakong/KHQR and ABA PayWay data is immutable migration input, not
  something to replay or rewrite as CutLuy.

### Required delivery order

Implement packages in order inside each service. An AI may prepare tests or UI
in parallel only after the preceding contract is merged. Do not combine schema,
webhook security, subscription cutover, seller connection, and buyer rollout in
one change.

```text
P9-000 provider/account readiness
  -> P9-DATA-001 additive payment schema
      -> P9-ADP-001 CutLuy adapter
          -> P9-WEB-001 authenticated event ingestion
              -> P9-REC-001 reconciliation and operations
                  -> P9-SUB-001 Rentify subscription pilot
                      -> P9-MER-001 seller-owned connection
                          -> P9-CHK-001 seller QR checkout
                              -> P9-UX-001 customer/merchant/admin UX
                                  -> P9-ROL-001 cohort rollout and legacy retirement
```

### P9 work packages

#### P9-000 — Provider and account readiness record

Create a non-secret readiness document that identifies account owners,
environments, CutLuy Store purpose, webhook endpoints, secret owner/rotation,
rate and transaction quotas, support contact, incident owner, and whether a
non-production provider environment exists. Record unknowns explicitly.

**Human input:** CutLuy accounts, commercial approval, credentials placed in
the approved secret manager, production domain, and authorization for any real
money test. AI must never create accounts, copy live secrets into files, or
invent provider capabilities.
**Verification:** documentation review, secret scan, and an environment-variable
contract test using placeholders.
**Acceptance:** subscription and seller account purposes cannot be confused;
every credential has owner, environment, rotation, and revocation procedure;
unsupported capabilities are recorded.

#### P9-DATA-001 — Additive payment-attempt and provider-event schema

Add provider-neutral records in the owning service. A payment attempt includes
an internal UUID, purpose, owner/account reference, amount as exact decimal or
minor units, currency, stable business reference, provider, provider payment
ID, idempotency key, canonical status, expiry, version, and timestamps. A
provider event includes provider identity, received time, signature result,
event/status type, safe payload or payload hash, processing state, error, retry
count, and linkage to the attempt.

Use additive migrations. Do not rename, delete, reinterpret, or backfill old
KHQR/PayWay records as CutLuy attempts. Add uniqueness for idempotency and
provider identity. Store only the minimum provider payload needed for audit and
replay; document retention.

**Primary areas:** `rentify-server/migrations/`, Core billing models;
`ecommerce-server/migrations/`, Commerce payment models when seller payments
begin.
**Depends on:** P9-000, P3-MNY-001
**Verification:** empty-database migration, prior-schema upgrade, model tests,
uniqueness/race tests, migration policy, rollback/compatibility rehearsal.
**Acceptance:** old code continues to read old payments; duplicate provider IDs
or idempotency keys cannot create two attempts; purpose/account ownership and
currency are mandatory; down/forward strategy is documented.

#### P9-ADP-001 — CutLuy HTTP adapter and contract fixtures

Implement a narrow server-side adapter for create and retrieve operations. Use
an injected HTTP client, configured base URL, bounded timeouts, safe retries,
typed/validated response parsing, and redacted structured errors. Generate the
provider idempotency value from the immutable Rentify attempt ID and use the
stable business reference as `reference_id`.

The adapter returns canonical data and does not update subscriptions, orders,
or entitlements. It rejects non-USD requests and unexpected/malformed provider
responses. Do not log authorization headers, QR strings, checkout URLs with
sensitive parameters, webhook bodies, or metadata containing personal data.

**Primary areas:** a new provider module under Core billing first; a matching
adapter behind the Commerce payment boundary only when P9-MER-001 begins.
**Depends on:** P9-DATA-001
**Verification:** fixture-based contract tests for 201, 400, 401/403, 402, 404,
409/idempotent replay if returned, 422, 429, 5xx, timeout, malformed body, and
connection reset. No test requires a production key.
**Acceptance:** repeated create returns or resolves to one logical attempt;
errors are stable and secret-free; transport retries cannot create a second
business effect.

#### P9-WEB-001 — Signed webhook inbox and state reducer

Add a dedicated public webhook route with the raw body available before JSON
parsing. Parse `X-CutLuy-Signature`, enforce an explicit timestamp tolerance,
sign `<timestamp>.<rawBody>` using HMAC-SHA256, and compare in constant time.
Resolve the configured CutLuy account from trusted route/configuration context,
not from body-supplied tenant or Store IDs.

Persist the event before processing. In one owning-service transaction, lock or
version-check the attempt, validate provider payment ID, account, amount,
currency, reference, and legal transition, then append the domain event. Valid
duplicates return success without repeating effects. Invalid signatures,
unknown attempts, mismatches, and poison events remain inspectable without
revealing secrets to the caller.

Canonical mapping is `pending -> pending`, `scanned -> customer_action`,
`paid -> paid`, `expired -> expired`, and `failed -> failed`. A late `paid`
event may change an expired attempt only through an explicitly tested provider
truth rule; never guess this behavior.

**Depends on:** P9-ADP-001, P3-EVT-001
**Verification:** raw-body mutation, stale/future timestamp, wrong secret,
wrong account, amount/currency/reference mismatch, duplicate, out-of-order,
concurrent delivery, unknown event, and replay tests.
**Acceptance:** only an authenticated and matched `paid` event produces one
financial effect; the endpoint acknowledges safe duplicates quickly; event
processing is recoverable after a crash between receipt and domain handling.

#### P9-REC-001 — Reconciliation, replay, observability, and support tools

Build read-only reconciliation that compares pending/recent Rentify attempts
with CutLuy retrieve results under bounded concurrency and quotas. Add an
authorized replay command for persisted valid events, dead-letter inspection,
and operator views that show safe identifiers, timeline, mismatch reason, and
next action. Manual tools must not allow an operator to type “paid” without
provider evidence.

Measure create latency/error, webhook verification failure, processing lag,
status age, expiry, duplicate rate, mismatch, reconciliation repair, 402/429,
and provider availability. Labels must not contain payment IDs, user IDs,
references, URLs, or other high-cardinality/personal values.

**Depends on:** P9-WEB-001, P6-OBS-001
**Verification:** missing-webhook repair, duplicate replay, provider outage,
quota exhaustion, partial batch failure, authorization, audit, and dry-run
tests.
**Acceptance:** support can locate and explain a payment without secrets;
reconciliation has zero unexplained amount/currency/account differences before
rollout; alerts link to a tested runbook.

#### P9-SUB-001 — Migrate Rentify subscriptions to CutLuy [COMPLETED]

Replace the direct Bakong initiation/polling path in
`rentify-server/src/modules/billing/` behind a server-controlled feature flag.
The package price remains server-owned. Create the Core payment attempt before
calling CutLuy, return the hosted `checkout_url` and safe expiry/status fields,
and activate the subscription exactly once only after the authenticated paid
transition.

Keep the prior route behavior available for rollback during the observation
window, but do not create a payment in both providers. Stop client polling from
being authoritative; status reads expose stored canonical state and may trigger
only bounded reconciliation. Update onboarding copy and recovery for pending,
scanned, expired, failed, already-paid, and provider-unavailable states.

**Depends on:** P9-REC-001, P5-SUB-001
**Verification:** package-price tampering, other-user access, double click,
network timeout, duplicate paid webhook, payment for wrong package/user,
expiry, retry with a new attempt, entitlement idempotency, and rollback tests.
**Acceptance:** one paid attempt activates one intended subscription; unpaid
attempts never grant access; revenue and entitlements reconcile; the cohort can
return to the previous path without changing completed CutLuy facts.
**Status:** Completed with 15/15 migration tests, backward-compatible Bakong rollback,
safe server-owned pricing, idempotency preservation, and dual-language recovery UI.

#### P9-MER-001 — Secure seller-owned CutLuy connection

Add a merchant workflow for connecting a CutLuy Store to exactly one Rentify
Store. Store the API key and webhook secret encrypted at rest, never return them
after submission, mask status in UI, and support validation, rotation,
revocation, and disconnect. Require owner permission and recent authentication;
staff access is deny-by-default. Record actor, time, target Store, and reason.

Do not treat Website identity as Store identity. A merchant must affirm that
the CutLuy Store belongs to the same business and understand that customer
funds settle directly to their configured destination. Disconnect disables new
QR attempts but preserves existing orders, attempts, and event processing.

**Primary areas:** Core owns seller connection/authorization; Commerce receives
only the minimum encrypted/provider-account projection or obtains a narrowly
scoped server-to-server capability. Choose one active writer and document it.
**Depends on:** P9-SUB-001 observation gate, P2-AUTHZ-002, P2-SEC-001
**Verification:** owner/staff/other-tenant/admin matrix, encryption/key rotation,
secret redaction, projection replay, disconnect with pending payments, and
audit tests.
**Acceptance:** one seller cannot use, inspect, replace, or trigger another
seller's account; no credential reaches a frontend, log, export, analytics, or
error response; revoked credentials stop new attempts.
**Status:** Completed with 17/17 security tests, AES-256-GCM encryption at rest,
strict owner recent-auth gating, staff deny-by-default, duplicate store prevention,
safe Commerce projection with zero secrets, and complete immutable audit trail.

#### P9-CHK-001 — Seller QR checkout vertical slice

Add CutLuy as an optional method for one approved Store cohort, initially on
one channel. Revalidate seller approval, product/channel eligibility, inventory,
delivery, exact USD total, connected account, and provider quota before creating
the payment attempt. Keep order, inventory reservation, and payment attempt
state explicit so expiry, failure, cancellation, and retry release or retain
stock exactly once according to the accepted policy.

Use the seller's account reference and provider credentials. Never use the
Rentify subscription key. One-Store order boundaries remain. Do not add
commission, platform fee deduction, escrow, automatic refund, or payout state.
COD remains a separately selectable and reversible fallback while approved.

**Depends on:** P9-MER-001, P3 order/inventory gates, accepted reservation and
expiry policy
**Verification:** wrong Store/account, mixed Store, KHR, last-unit concurrency,
price change, seller disconnect/suspension, provider failure, duplicate create,
expiry/retry, paid-after-cancel race, and COD isolation tests.
**Acceptance:** funds route to the intended seller-owned account; one buyer
commitment creates one order/payment effect; no oversell occurs; disabling the
flag stops new QR attempts without breaking existing orders.

#### P9-UX-001 — Complete payment experience

Build mobile-first Khmer/English states for method choice, hosted checkout,
pending, scanned, paid confirmation, expiry, retry, failure, weak network,
return to Rentify, and support. Explain that QR payment is processed through
CutLuy and settles to the seller. Never tell the user payment succeeded from a
redirect alone.

Merchant UI shows connection health, settlement ownership, supported currency,
last safe verification time, rotation/disconnect, payment timeline, and support
path. Admin UI shows read-only provider evidence, mismatch/replay tools with
least privilege, and complete audit history.

**Depends on:** P9-CHK-001 and stable APIs
**Verification:** 360 px and desktop browsers, Khmer expansion, keyboard/screen
reader, refresh/back/multiple-tab, expired link, delayed webhook, provider
outage, and browser journey tests.
**Acceptance:** users always know whether to pay, wait, retry, use COD, or seek
help; no UI invents financial state; sensitive provider data is absent.

#### P9-ROL-001 — Cohort rollout and direct Bakong retirement

Roll out independently for subscriptions, hosted storefront, and marketplace:
internal test, named merchant cohort, percentage cohort, then wider availability.
Each step records flags, artifact, provider account, start/end time, metrics,
reconciliation report, incidents, and human approval.

Automatic stop conditions include any signature bypass, wrong-account routing,
duplicate effect, unexplained reconciliation difference, secret exposure,
oversell, sustained provider errors/429, or exhausted payment SLO. Rollback
disables new attempts only; it never rewrites completed attempts or abandons
valid pending events.

Remove the direct `bakong-khqr` dependency, Bakong secrets, polling jobs, and
dead UI only after no active cohort or pending attempt needs them, the agreed
observation period passes, dependency/secret scans are clean, and historical
payments remain readable.

**Depends on:** P9-UX-001, security review, runbook drill, human rollout approval
**Verification:** production-like canary, intentional stop, rollback, delayed
event after rollback, restore/reconciliation, dependency scan, and historical
read tests.
**Acceptance:** all enabled cohorts meet payment SLO and reconciliation gates;
support handles a real drill; retirement evidence proves no live Bakong writer
or credential remains while historical records still work.

### Exit gate P9

- subscription and seller funds use different proven account boundaries;
- every paid transition has authenticated provider evidence and one effect;
- payment, subscription, order, stock, and provider reconciliation has zero
  unexplained difference for the observation window;
- no secret or unnecessary payment metadata appears in client code, logs,
  analytics, exports, errors, or source control;
- expiry, duplicate, delay, outage, quota, rollback, and disaster-recovery
  drills pass;
- Khmer/English mobile payment journeys and support recovery are usable;
- COD remains available until an explicit later product decision changes it;
- no product copy claims unsupported refund, escrow, commission, or payout;
- direct Bakong runtime code is retired only if P9-ROL-001 evidence passes.

### Recommended first CutLuy AI prompt

```text
Implement P9-000 from docs/ai-implementation-plan.md. Read AGENTS.md,
docs/adr/0003-cutluy-qr-payments.md, docs/master-engineering-blueprint.md,
docs/current-rentify-architecture.md, and the current Core and Commerce payment
code before acting. Inspect git status and preserve existing work.

Create only the non-secret CutLuy provider/account readiness record and an
environment-variable contract test using placeholders. Do not change runtime
payment behavior, create a CutLuy account, request or print credentials, call a
live payment endpoint, or edit historical payment data. Clearly separate the
Rentify subscription account from seller-owned accounts, record unknowns, and
define credential rotation/revocation, webhook endpoint ownership, quotas,
support, incident ownership, and real-money-test approval requirements.

Run git diff --check and npm run verify:repository. Report changed files,
evidence, unresolved human inputs, risks, and the exact rollback (documentation
revert only). Stop after P9-000; do not begin P9-DATA-001 in the same task.
```

---

## 14. AI work queue order

After P0 human decisions start, queue AI work in these batches. A batch may run
in parallel only where its dependencies and file ownership do not overlap.

### Batch 1 — characterize and constrain

1. P0-002 route/writer inventory
2. P0-003 baseline evidence
3. P1-API-001 Core OpenAPI baseline
4. P1-API-002 Commerce OpenAPI baseline
5. P1-OBS-001 correlation/logging design and first slice
6. P1-QA-001 fixture builder
7. P1-UX-001 token inventory

### Batch 2 — build the rails

1. P1-API-003 error envelope first slice
2. P1-API-004 typed clients
3. P1-OBS-002 readiness
4. P1-QA-002 browser shell
5. P2-ID-001 identity audit/tests
6. P2-HOST-001 configuration validator

### Batch 3 — secure identity and transactions

1. P2-AUTHZ-001 policy matrix/tests
2. P2-AUTHZ-002 module slices
3. P2-ENT-001 entitlements
4. P2-HOST-002 real-host rehearsal
5. P3-CAT-001 Product/SKU contract
6. P3-MNY-001 money/snapshot audit and first slice
7. P3-EVT-001 outbox/inbox standard
8. P3-PAY-002 provider-neutral CutLuy foundation after its dependencies pass

### Batch 4 — canonical commerce

1. P3-INV-001 inventory ledger
2. P3-INV-002 stock-writer slices
3. P3-INV-003 concurrency tests after each slice
4. P3-ORD-001 state machines
5. P3-COD-001 COD/refund state machine
6. P3-CAT-002 eligibility reasons
7. P3-CART-001 channel-safe carts
8. P3-REC-001 reconciliations

### Batch 5 — user journeys

1. P4-MER-001/002 onboarding and launch checklist
2. P4-MER-003 Product/SKU editor
3. P4-BUY-001 discovery
4. P4-BUY-002/003 cart and checkout
5. P4-SF-001 hosted storefront
6. P4-MER-005 merchant order operations
7. P4-POS-001 and P4-INV-001
8. P4-BUY-004 returns/complaints
9. P4-UX-002/003 language and accessibility

### Batch 6 — operate and release

1. P5 trust/support/admin/notification/subscription packages
2. P6 infrastructure, pipeline, telemetry, and security packages
3. P6 restore, rollback, resilience, and operations drills
4. P7 closed beta evidence
5. P8 cohort rollout

### Batch 7 — CutLuy QR payments after stable Release 1

1. P9-000 provider/account readiness
2. P9-DATA-001 additive payment schema
3. P9-ADP-001 adapter and contract fixtures
4. P9-WEB-001 signed event ingestion
5. P9-REC-001 reconciliation and operations
6. P9-SUB-001 subscription pilot and observation gate
7. P9-MER-001 seller-owned connection
8. P9-CHK-001 seller checkout vertical slice
9. P9-UX-001 complete payment experience
10. P9-ROL-001 rollout and direct Bakong retirement

---

## 15. Verification matrix

| Change type | Minimum required verification |
| --- | --- |
| Core API only | `npm run verify:core`, migration verify when applicable, affected integration/security tests |
| Commerce API only | `npm run verify:commerce`, migration verify when applicable, affected smoke/audit commands |
| React frontend | `npm run verify:frontend`, journey test for changed flow |
| Marketplace Angular | `npm run verify:marketplace`, journey/accessibility test |
| Admin Angular | `npm run verify:admin`, permission and action journey test |
| Cross-service contract | both API verifies, contract compatibility, producer/consumer integration, projection replay |
| Stock/order/money | database-backed concurrency, idempotency, reconciliation, tenant isolation |
| Identity/session/CORS | security matrix and real HTTPS browser tests across supported hosts |
| Migration/backfill | empty and prior-version migration, idempotent rerun, audit, rollback/compensation evidence |
| Infrastructure/release | plan/diff review, staging deploy, smoke, security scan, rollback and restore where applicable |
| Documentation only | `git diff --check`, links/commands review, `npm run verify:repository` |

Before a Release 1 candidate, run the root `npm run verify` plus every database
smoke, audit, browser, security, accessibility, performance, restore, and
rollback gate defined by the release record.

---

## 16. AI review checklist

The reviewing AI or human should reject a change if any answer is unclear:

### Product and UX

- Does the diff complete the stated customer outcome?
- Are both successful and failed/recovery states usable?
- Are Khmer/English, mobile, accessibility, and weak-network needs addressed?
- Is any business rule invented rather than linked to an accepted decision?

### Architecture and data

- Is there exactly one authoritative writer for each changed record?
- Is Store identity used for tenancy and Website only for channel context?
- Are compatibility, migration, replay, and rollback explicit?
- Can a retry, race, delayed event, or stale client violate an invariant?

### Security and privacy

- Is actor identity derived only from trusted authentication?
- Are owner/staff/other-tenant/buyer/public/admin negative cases tested?
- Are logs, errors, analytics, exports, and responses free of unnecessary
  secrets and personal data?
- Are high-risk admin or financial actions attributed and reasoned?

### Money and stock

- Are values exact and currency-explicit?
- Does the server recalculate and snapshot the committed terms?
- Is each stock/payment/refund effect idempotent and reconcilable?
- Does failure leave an honest state and a recoverable next action?

### Operations

- Can support diagnose the result using a correlation ID and audit timeline?
- Is the feature observable and alertable?
- Can it be disabled without corrupting existing orders?
- Are runbooks and documentation consistent with code?

---

## 17. Suggested first implementation task

Do not start with a large UI rewrite. Start with **P0-002: Current capability
and route inventory** because it creates the evidence required to divide later
work safely.

Recommended first AI prompt:

```text
Implement work package P0-002 from docs/ai-implementation-plan.md.

Read AGENTS.md, README.md, docs/README.md, docs/current-rentify-architecture.md,
docs/platform-architecture.md, docs/migration-plan.md, and
docs/ai-implementation-plan.md completely before acting. Inspect git status and
preserve all existing work.

Inventory active Core and Commerce routes, their authentication/actor and
tenant key, frontend routes and API calls, database ownership, all writers of
Store/Product/SKU-or-variant/stock/order/payment/refund/subscription/media and
projection state, feature flags, environment variables, and background jobs.
Do not modify runtime behavior. Add reproducible read-only tooling only if it
materially improves accuracy. Commit a concise discrepancy and risk report to
docs/audits/release-1-capability-inventory.md. Clearly distinguish current,
planned, and unknown behavior. Do not inspect or activate the archived
KhmerCraft API except where existing documentation explicitly requires a
reference comparison.

Run git diff --check and npm run verify:repository. Report evidence, unknowns,
and recommended follow-up work packages; do not fix discovered issues in the
same task.
```

This first package provides the trustworthy map an AI system needs before
changing identity, inventory, money, or customer journeys.
