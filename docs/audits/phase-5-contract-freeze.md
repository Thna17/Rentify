# Phase 5 Core contract freeze

**Freeze date:** 2026-10-28
**Base SHA:** `7ae9d9d7ea5e3724f10d2ea9f265fb62a87f6834`
**Applies to:** P5 trust, support, subscriptions, notifications, and scoped administration
**Runtime status:** target contract; no runtime feature is implemented by this document

## 1. Freeze rules and policy boundary

This document freezes names, ownership, API/event shapes, state mechanics,
tenant boundaries, idempotency, audit requirements, and financial
classification for Phase P5. It does not convert proposed business policy into
an accepted decision.

The following values remain **unapproved policy inputs** because their decision
records are proposed: prohibited-product taxonomy and enforcement consequences
(DEC-006); return eligibility/evidence/deadlines/escalation/strike rules
(DEC-008–011); and prices, plan limits, pilot/trial/grace/notice/suspension/
retention timings (DEC-014–020). Implementations must reference a versioned,
accepted policy record. Until one exists, automated enforcement is disabled
and the safe deferred behavior in the decision register applies.

Contract changes after this freeze require an ADR or accepted decision plus
Core, Commerce, frontend, QA, security, and operations review as applicable.

## 2. Canonical platform roles and permissions

### 2.1 Subject and grant model

- Core is the identity and platform-authorization authority.
- Platform roles are grants on a durable Core subject. They are not new user
  identities and are not values in the merchant `Staff.permissions` array.
- A subject may hold multiple roles. Effective permission is the union of
  active grants, constrained by scope and explicit deny/suspension.
- All platform access is deny-by-default. UI visibility never grants access.
- Existing broad `admin` maps temporarily to `platform_admin` only through an
  explicit compatibility grant. New code must not branch on `role === admin`
  except inside that compatibility adapter.

Canonical role slugs:

| Role | Purpose | Default permission set |
| --- | --- | --- |
| `support_agent` | Investigate and resolve support cases | support read/write/assign/escalate/resolve, linked-record safe reads, communication send |
| `seller_reviewer` | Review seller applications and marketplace eligibility | seller application/profile read, seller decision propose/approve, seller review audit read |
| `catalog_moderator` | Moderate Products and appeals | catalog read/hold/reject/restore, evidence and appeal read/decide |
| `finance_reconciliation` | Reconcile subscription payments/revenue | subscription/payment read, reconciliation run/repair, finance audit read; no catalog/order-state mutation |
| `platform_admin` | Manage platform access and emergency operations | all ordinary platform permissions; maker-checker and recent-auth still apply |
| `platform_auditor` | Read audit/support/finance evidence | read-only audit and safe linked-record projections |

Canonical permission names:

```text
support.case.read
support.case.create
support.case.update
support.case.assign
support.case.escalate
support.case.resolve
support.case.reopen
support.note.create
support.attachment.create
support.attachment.read
support.communication.send

seller.application.read
seller.decision.propose
seller.decision.approve
seller.store.suspend.propose
seller.store.suspend.approve
seller.audit.read

catalog.product.read
catalog.product.hold
catalog.product.reject.propose
catalog.product.reject.approve
catalog.product.restore
catalog.appeal.read
catalog.appeal.decide
catalog.audit.read

finance.subscription.read
finance.subscription.transition.propose
finance.subscription.transition.approve
finance.payment.read
finance.reconciliation.run
finance.reconciliation.repair.propose
finance.reconciliation.repair.approve
finance.export.sensitive.propose
finance.export.sensitive.approve
finance.audit.read

platform.identity.read
platform.identity.change.propose
platform.identity.change.approve
platform.role.read
platform.role.manage.propose
platform.role.manage.approve
platform.session.revoke
platform.audit.read
platform.break_glass.use
notification.template.read
notification.template.manage
notification.delivery.read
notification.delivery.retry
notification.preference.read
notification.preference.manage
```

No wildcard permission is stored. `platform_admin` expands to a versioned
permission set in Core.

### 2.2 Scope and tenant rules

Each grant has `scopeType` and `scopeId`:

- `platform/*`: all tenants, only for platform-wide duties;
- `store/<storeId>`: exactly one Store and its linked records;
- `case/<caseId>`: exactly one assigned or explicitly shared case;
- `queue/<queueKey>`: cases in a named operational queue; and
- `finance/subscriptions`: subscription/payment records only, excluding buyer
  COD details unless a linked case and separate permission permit the safe
  projection.

Rules:

1. Store scope is resolved from authoritative records, never from a browser
   supplied Store/Website/domain claim.
2. `websiteId` is channel context and never platform-operator tenant identity.
3. Case assignment does not grant mutation rights on the linked Store,
   Product, Order, payment, seller decision, or subscription.
4. Cross-service reads use allowlisted safe projections from the owning
   service. Core does not copy mutable Commerce facts into a case.
5. Search/list APIs apply permission scope before pagination and counts.
6. Direct ID guessing outside scope returns a non-enumerating `NOT_FOUND` or
   the established policy-safe denial.
7. Suspended/revoked grants fail closed immediately and revoke affected
   privileged sessions.

## 3. Maker-checker and break-glass

### 3.1 Maker-checker

A high-risk operation creates an immutable `ApprovalRequest`; it does not
perform the target mutation. Required fields:

```text
approvalRequestId, action, targetType, targetId, tenantScope,
proposedBySubjectId, proposedAt, reasonCode, reasonText,
caseId?, beforeVersion, requestedChange, expiresAt,
status(pending|approved|rejected|expired|cancelled|executed),
decidedBySubjectId?, decidedAt?, decisionReason?, executedAt?,
correlationId, policyVersion
```

Rules:

- proposer and approver must be distinct durable subjects;
- both must hold the required permission at proposal and execution time;
- the approver must have a scope at least as narrow as the target;
- approval is single-use, expires, and binds target version plus the exact
  normalized change hash;
- target drift produces `APPROVAL_STALE`; a new request is required;
- execution is idempotent and records before/after safe fields;
- rejection, expiry, cancellation, and execution are immutable audit events;
- recent authentication is required for proposal, approval, and execution.

Frozen high-risk classes:

- permanent or platform-wide seller suspension/closure;
- permanent cross-channel Product rejection;
- privileged identity/contact changes;
- platform role or grant changes;
- manual subscription entitlement correction or financial reconciliation
  repair;
- sensitive data export; and
- deletion/anonymization that affects protected records.

Whether additional actions are high-risk is policy-extensible. No action may
be removed from this minimum list without an accepted security decision.

### 3.2 Break-glass

Break-glass is not a bypass role. It is a time-bound elevation record requiring
`platform.break_glass.use`, recent MFA, an incident/case reference, reason,
requested scope, requested permissions, and an expiry. Production maximum
duration remains a human security-policy input and the feature stays disabled
until that value and approver/on-call procedure are accepted.

When enabled:

- elevation cannot grant credential/secret viewing or disable audit;
- it is limited to the declared scope and permissions;
- use emits immediate security notifications to independent recipients;
- all reads and writes are tagged `breakGlassGrantId`;
- expiry revokes sessions/tokens carrying the elevation;
- a post-incident review is mandatory; and
- maker-checker remains required unless the accepted incident policy
  explicitly names an emergency action. Any emergency execution is queued for
  independent retrospective approval and cannot erase its audit trail.

## 4. Support-case contract

### 4.1 Identity and ownership

- Core owns `SupportCase`, assignment, notes, attachments metadata,
  communications metadata, case events, deadline calculations, resolution,
  and case audit.
- `caseId` is an immutable UUID exposed at service boundaries.
- `caseNumber` is an immutable, opaque, human-readable reference generated by
  Core. Clients must not parse sequence/date semantics from it.
- A source record such as a Commerce buyer report links by typed subject ID;
  it is not copied. `(sourceSystem, sourceType, sourceId, caseType)` is unique
  where one source must create at most one active case.

### 4.2 Required fields

```text
caseId, caseNumber, caseType, priority, status, queueKey,
requesterSubjectId?, requesterKind, storeId?, assigneeSubjectId?,
sourceSystem?, sourceType?, sourceId?,
summary, descriptionClassification, language,
policyVersion, openedAt, triagedAt?, serviceDeadlineAt?,
deadlinePausedAt?, deadlinePauseReason?, escalatedAt?,
resolvedAt?, closedAt?, resolutionCode?, resolutionSummary?,
version, createdAt, updatedAt
```

Linked subjects use a separate table with `subjectType` in
`user | store | product | order | buyer_report | review | subscription |
payment_attempt | approval_request`, `subjectId`, owning service, relationship,
and snapshot-free display metadata limited to an immutable reference.

Notes require author, visibility (`internal | requester | merchant`), safe
body, created time, and immutable edit history. Attachments require an owned
MediaAsset ID, uploader, visibility, media classification, hash, scan status,
and retention policy version; raw provider credentials/URLs are not identity.

### 4.3 Deadlines

- Deadline calculation uses a versioned `SupportPolicy` selected by case type,
  priority, locale/time zone, and opened/escalated event.
- Store `serviceDeadlineAt` as UTC plus the policy version and calculation
  inputs. Display in the user's locale.
- Pauses/resumes are explicit events and require a permitted reason; elapsed
  time is never rewritten.
- Breach is derived from time and case state, emits one deduped event, and does
  not silently mutate authoritative Order/payment/refund facts.
- DEC-008–011 durations/evidence/escalation are not active until accepted.
  Before then, automatic deadline enforcement and automatic seller strikes or
  suspension are disabled; agents may triage manually with audit.

### 4.4 State transitions

Canonical states:

```text
open -> triaged -> in_progress
in_progress -> waiting_on_requester | waiting_on_merchant | escalated | resolved
waiting_on_requester | waiting_on_merchant -> in_progress | escalated | resolved
escalated -> in_progress | resolved
resolved -> closed | reopened
closed -> reopened
reopened -> triaged | in_progress
```

Every transition requires expected version, actor/permission, reason code,
timestamp, case event, audit event, and notification event. Invalid transitions
return `CASE_TRANSITION_INVALID`. Resolution never implies that a refund,
seller suspension, Product rejection, or identity change occurred; those are
linked actions executed by their owner and permission contract.

## 5. Notification contract

### 5.1 Durable envelope

P3-EVT-001 is the transport/source-event foundation. A notification command
uses:

```json
{
  "eventId": "uuid",
  "eventName": "support.case.assigned.v1",
  "schemaVersion": "1.0.0",
  "aggregateType": "SupportCase",
  "aggregateId": "uuid",
  "aggregateVersion": 3,
  "occurredAt": "ISO-8601 UTC",
  "producer": "rentify-server",
  "correlationId": "uuid-or-approved-id",
  "causationId": "uuid-or-null",
  "storeId": "uuid-or-null",
  "policyVersion": "string-or-null",
  "templateKey": "support.case.assigned",
  "templateVersion": 1,
  "recipientRule": "case.assignee",
  "data": {}
}
```

`data` contains stable IDs, state/reason codes, exact money only when needed,
and safe template facts. It excludes free-form evidence, credentials, tokens,
addresses, raw provider payloads, and cross-tenant data.

### 5.2 Canonical event names

```text
seller.review.submitted.v1
seller.review.needs_changes.v1
seller.review.approved.v1
seller.review.rejected.v1
seller.marketplace_suspended.v1
catalog.product.held.v1
catalog.product.rejected.v1
catalog.appeal.updated.v1
order.placed.v1
order.accepted.v1
delivery.out_for_delivery.v1
delivery.delivered.v1
delivery.failed.v1
return.requested.v1
return.updated.v1
refund.confirmed.v1
support.case.opened.v1
support.case.assigned.v1
support.case.deadline_approaching.v1
support.case.deadline_breached.v1
support.case.escalated.v1
support.case.resolved.v1
support.case.reopened.v1
subscription.trial_started.v1
subscription.renewal_due.v1
subscription.payment_failed.v1
subscription.grace_started.v1
subscription.suspended.v1
subscription.cancelled.v1
security.new_session.v1
security.mfa_changed.v1
security.contact_changed.v1
security.role_changed.v1
security.break_glass_started.v1
security.break_glass_ended.v1
```

Adding an event is additive and versioned. Renaming/reusing a name for changed
semantics is forbidden.

### 5.3 Recipients, preferences, and dedupe

Recipient resolution runs server-side from authoritative relationships:

- seller/catalog events: Store owner plus eligible Store staff for the
  applicable action; proposing/acting moderator receives only operational
  confirmation;
- order/delivery/return/refund: order buyer plus Store owner/permitted order
  staff, filtered by event relevance;
- support: requester, assigned agent, and Store owner/permitted staff according
  to note/communication visibility;
- subscription: Store owner and explicitly permitted billing contacts;
- security: affected subject plus independent platform security recipients for
  privileged/break-glass events.

In-app notification is the durable source of truth. Email/Telegram/SMS/push are
provider delivery attempts referencing the in-app notification, not the
authoritative state.

Security, payment/refund confirmation, active-order transactional, support
deadline/resolution, and subscription access-change classes are mandatory and
cannot be disabled. Marketing/product education is preference-controlled.
Provider/channel opt-out never suppresses the in-app record.

The unique delivery dedupe key is:

```text
eventId + templateKey + templateVersion + recipientSubjectId + channel
```

Recipient resolution itself is deduped by `eventId + recipientSubjectId`.
Delivery states are `pending | sending | sent | delivered | failed_retryable |
failed_terminal | suppressed`, with attempt count, next attempt, safe provider
reference, last safe error code, and timestamps. Provider failure never changes
the originating domain fact.

## 6. Subscription and entitlement contract

### 6.1 Ownership and records

Core owns Plan, Subscription, SubscriptionPaymentAttempt, lifecycle events,
and entitlement transitions. Commerce owns no subscription state; it consumes
a versioned Store entitlement projection.

Canonical lifecycle states:

```text
pending_activation
trialing
active
past_due
grace_period
cancel_at_period_end
cancelled
suspended
expired
```

Canonical transitions:

```text
pending_activation -> trialing | active | expired
trialing -> active | grace_period | cancelled
active -> past_due | cancel_at_period_end | cancelled
past_due -> active | grace_period | cancelled
grace_period -> active | suspended | cancelled
cancel_at_period_end -> active | cancelled
cancelled -> active (new paid period/reactivation only)
suspended -> active (accepted remedy only) | cancelled
```

Invalid transitions return `SUBSCRIPTION_TRANSITION_INVALID`. Provider status
does not directly set Subscription status; an authenticated, matched, deduped
payment fact is an input to the audited lifecycle service.

### 6.2 Entitlement transitions

Each lifecycle transition writes, in one Core transaction:

1. the locked Subscription version/state and effective dates;
2. one immutable lifecycle event with actor/source/reason/idempotency key;
3. a new `CAPABILITIES_VERSION` snapshot or a reference to an unchanged one;
4. an outbox event for Commerce/notification consumers; and
5. an audit event with safe before/after fields.

Rules:

- `trialing` and `active`: accepted plan capabilities enabled.
- `past_due`: no access change unless accepted policy explicitly says so;
  payment is unresolved and notices may be emitted.
- `grace_period`: selling/read behavior and mutation locks come only from the
  accepted policy version.
- `cancel_at_period_end`: current paid-period capabilities continue until the
  effective cancellation boundary.
- `cancelled`, `suspended`, `expired`: new selling/mutations fail closed;
  historical read follows the accepted retention policy.
- downgrade is an explicit scheduled or immediate transition with a quota
  conflict report. It never deletes Products, staff, orders, or history.
- marketplace-only entitlement is Store-scoped and never requires a Website.
- replay of payment/callback/lifecycle events has one effect.

Prices, product/staff limits, pilot/trial/grace/retention durations, renewal
notice schedule, and downgrade target remain policy inputs from DEC-014–020.
Current hard-coded/tested values are not promoted to accepted by this freeze.

## 7. API contract

### 7.1 Errors

Every new P5 API error uses:

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

Stable P5 codes:

```text
UNAUTHENTICATED
PERMISSION_DENIED
RECENT_AUTH_REQUIRED
MFA_REQUIRED
NOT_FOUND
VALIDATION_FAILED
CONFLICT
EXPECTED_VERSION_REQUIRED
VERSION_CONFLICT
IDEMPOTENCY_KEY_REQUIRED
IDEMPOTENCY_CONFLICT
IDEMPOTENCY_IN_PROGRESS
APPROVAL_REQUIRED
APPROVAL_SELF_REVIEW_FORBIDDEN
APPROVAL_STALE
BREAK_GLASS_DISABLED
BREAK_GLASS_EXPIRED
CASE_TRANSITION_INVALID
CASE_DEADLINE_POLICY_UNAVAILABLE
NOTIFICATION_RECIPIENT_UNRESOLVED
NOTIFICATION_TEMPLATE_UNAVAILABLE
NOTIFICATION_DELIVERY_FAILED
SUBSCRIPTION_TRANSITION_INVALID
SUBSCRIPTION_POLICY_UNAVAILABLE
ENTITLEMENT_DENIED
PAYMENT_EVIDENCE_REQUIRED
MONEY_CURRENCY_MISMATCH
RATE_LIMITED
SERVICE_UNAVAILABLE
```

Unknown errors map to `INTERNAL_SERVER_ERROR`; production responses never
include stacks, SQL, secrets, provider payloads, or sensitive evidence.

### 7.2 Pagination and concurrency

New changing collections (cases, events, audit, notifications, approvals,
payment attempts) use cursor pagination:

```text
request:  ?limit=50&after=<opaque>&sort=-createdAt
response: { data: [...], page: { limit, nextCursor, hasMore } }
```

- default limit 25, maximum 100;
- cursors are opaque, signed/validated, scope-bound, and based on stable
  `(sortValue,id)` ordering;
- filters/sorts are allowlisted and authorization is applied before counts;
- existing page/limit endpoints remain backward compatible but are not copied
  into new P5 resources; and
- mutations require `expectedVersion` or `If-Match` where state may conflict.

### 7.3 Idempotency

`Idempotency-Key` is required for create, transition, notification retry,
approval execution, reconciliation repair, and every consequential P5 action.

- key scope is authenticated subject + normalized operation + tenant scope;
- server stores a normalized request hash and original safe result;
- same key/same hash returns the original result and resource ID;
- same key/different hash returns `IDEMPOTENCY_CONFLICT` (409);
- concurrent processing returns `IDEMPOTENCY_IN_PROGRESS` with retry guidance;
- domain unique constraints remain the final race barrier; and
- idempotency retention covers all supported client/provider retry windows and
  any pending outbox effect. The exact purge duration follows accepted data
  retention policy rather than an invented value.

### 7.4 Audit

Every consequential read/export and mutation records:

```text
auditEventId, occurredAt, actorSubjectId, actorRoles, effectivePermissions,
grantId?, breakGlassGrantId?, action, targetType, targetId, tenantScope,
caseId?, approvalRequestId?, reasonCode, reasonText?,
beforeVersion?, afterVersion?, safeBefore?, safeAfter?,
idempotencyKeyHash?, correlationId, sourceIpClass?, userAgentClass?, outcome
```

Audit records are append-only, secret-free, tenant/scope protected, and owned
by the service that owns the mutation. Cross-service correlation uses IDs; one
service does not rewrite the other's audit.

## 8. Money and revenue classification

Technical money contract:

- amount is currency plus exact integer minor units or validated fixed decimal;
- USD uses two minor digits; KHR uses zero;
- no floating-point calculation or silent currency conversion;
- every committed Order/payment/subscription amount snapshots its currency and
  policy/price version; and
- reconciliation compares amount, currency, account owner, business reference,
  and immutable provider evidence.

Canonical classifications:

| Metric/fact | Definition | Revenue treatment |
| --- | --- | --- |
| `order_gmv` | Buyer order merchandise amount before refunds | Not Rentify revenue |
| `delivery_fee` | Merchant/courier delivery charge | Not Rentify revenue |
| `cod_due` | Cash expected from buyer | Merchant receivable, not Rentify asset/revenue |
| `cod_collected` | Merchant-confirmed cash collection | Merchant cash, not Rentify revenue |
| `merchant_refund_confirmed` | Merchant-confirmed direct refund | Reduces merchant net GMV; not a Rentify disbursement |
| `subscription_billed` | Rentify plan charge invoiced | Rentify receivable, not revenue until the accepted accounting recognition point |
| `subscription_collected` | Authenticated/reconciled payment to Rentify-owned account | Rentify cash receipt and launch revenue input |
| `marketplace_commission` | Future accepted platform fee | Always zero/absent until a separate accepted policy/provider exists |
| `seller_payout` / `funds_held` | Future managed settlement facts | Unsupported; must not be inferred from database balances |

The documented launch direction is subscription-funded and COD does not belong
to Rentify. Because DEC-014–020 and DEC-026 remain proposed, this freeze defines
classification vocabulary and safety invariants, not activation, price, or a
claim of formal accounting/legal approval.

## 9. Entity and mutable-fact ownership

| Entity or mutable fact | Authoritative owner | Notes |
| --- | --- | --- |
| User subject, verified contacts, credentials, MFA, sessions | Core | Commerce validates/projects minimum identity only. |
| Platform role, permission, grant, scope, revocation | Core | Merchant Staff permissions are a separate Store-scoped model. |
| ApprovalRequest and break-glass grant | Core | Approval execution calls the owner of the target mutation. |
| Store profile, owner/membership, seller application/decision, Store status | Core | Commerce holds a retryable access/eligibility projection. |
| Website, domain binding, template, deployment state | Core | Website is optional channel context. |
| Plan, Subscription, lifecycle event, entitlement snapshot | Core | Commerce consumes versioned Store capabilities. |
| Subscription payment attempt/provider event/reconciliation | Core | Must use Rentify-owned account reference; no seller funds. |
| SupportCase, assignment, notes, deadline, resolution, case event | Core operations module | Links authoritative records by typed ID; does not copy mutable facts. |
| Support attachment metadata/access policy | Core | Binary MediaAsset remains with the approved media provider; Core owns authorization/reference. |
| Notification template, preference, in-app notification, delivery attempt | Core notification module | Domain services emit facts; Core resolves recipient and tracks delivery. |
| Product/SKU/category/listing/moderation/appeal | Commerce | Core case/admin records link IDs only. |
| Inventory balance/ledger/reservation | Commerce | No P5 service writes stock directly. |
| Cart, Order, OrderLine snapshot, fulfillment, return, buyer report | Commerce | Support actions cannot assign these states directly. |
| COD payment, collection, refund confirmation | Commerce | Merchant-collected money; support links evidence and authorized actions. |
| POS, Invoice, review moderation, usage billing | Commerce | Admin access uses scoped platform permissions. |
| Outbox/inbox/dead letter/replay audit | Owning producer/consumer service | At-least-once delivery; one authoritative local effect. |
| Search/cache/dashboard/analytics | Derived read models | Never transactional writers; source version required. |
| Audit event | Service owning the action | Cross-service trace by correlation/case/approval IDs. |

The archived KhmerCraft Express/Mongoose API owns no active entity or mutable
fact and must not be started, migrated into a new authority, or used as a P5
writer.

## 10. Freeze acceptance gates

Before a P5 runtime package can claim this contract:

1. OpenAPI and event schemas include the frozen names/shapes and compatibility
   tests.
2. permission matrix covers every role, scope, owner, unrelated tenant,
   suspended/revoked actor, and maker-checker path.
3. database-backed idempotency, concurrency, state transition, audit, and
   replay tests pass.
4. policy-dependent behavior references an accepted decision/policy version or
   remains safely disabled.
5. Core/Commerce ownership tests prove no peer writer was introduced.
6. money/revenue dashboards use the frozen classifications.
7. `npm run verify` plus package-specific security/integration/browser tests
   pass before release.
