# Phase 5 Core platform lane audit

**Status: incomplete; not ready for release.** This report covers the Codex
lane based on `origin/develop` at `7ae9d9d7ea5e3724f10d2ea9f265fb62a87f6834`.
The contract freeze is a design target, not proof of implementation. No
production cutover or data retirement is part of this work.

## Packages and API audit

| Package | Implemented evidence | Remaining acceptance gaps |
| --- | --- | --- |
| Administration | Scoped roles and permissions, legacy admin compatibility, approvals, MFA and recent-auth checks, break-glass records, audit fields; `test/security/platformAdministration.test.js`. This audit binds MFA sessions to the requesting user and restricts direct Store updates. | Maker-checker consumption and target mutations are not one atomic transaction; optional before-version permits stale approvals. Audit persistence can fail without aborting a mutation. Operator session revocation and recent-auth need end-to-end verification for non-legacy admins. Break-glass on-call notification and retrospective review are not implemented. |
| Support | Core-owned cases, links, metadata, events, optimistic concurrency and creation idempotency; `test/security/supportCases.test.js`. Merchant case list/detail and responses use the owning Store. | Notes, attachments and events are not paginated. Attachment records validate metadata; safe upload, scanning and retrieval integration are not established. Automatic SLA enforcement is not established. |
| Notifications | Durable source-event deduplication, scoped recipients, inbox, preferences, delivery state, adapter boundary, retry and English/Khmer templates; `test/security/durableNotifications.test.js`. | Buyer recipients have no authenticated Core inbox path. Commerce event authentication uses a shared service token and recipient assertions require integration assurance. Provider adapters are not registered here, so external delivery is not production-ready. Actual seller, security and subscription event producers are incomplete; generic translations need product review. Delivery attempts are unpaginated and notification mutations do not provide the frozen audit trail. |
| Subscriptions and merchant experience | Merchant can view the existing Core entitlement result and recent plan payments; policy calculator requires explicit configuration. Merchant support and notification screens provide partial bilingual interactions. | P5-SUB-001 is **not complete**: no unified audited lifecycle, renewal event/charge deduplication, safe provider rollout/rollback, scheduled notices, full historical-read enforcement, or upgrade/downgrade/cancel flow. Existing P2 entitlement policy contains hard-coded proposed rules. Payment history is limited to 50 legacy package payments and is not a complete subscription ledger. See `docs/subscription-policy-status.md`. |

The following are implementation observations, not acceptance of each
contract requirement:

| API group | Authorization and tenant scope | Idempotency, pagination, audit and errors |
| --- | --- | --- |
| `/admin/access`, `/admin/approvals`, `/admin/role-grants`, `/admin/break-glass` and changed admin operations | Platform permission checks use grants and scopes; high-risk routes require recent auth and MFA. Store suspension requires the suspension capability; other direct updates require platform administration, and rejection uses the review workflow. | Approval use has a single-use guard but is not atomic with execution. Lists use existing page/limit conventions, not the frozen cursor contract. Audit is best-effort and some pre-existing middleware returns legacy error shapes. |
| `/api/support/cases` and `/mine` | Platform grants are checked per case/store/queue; merchant routes resolve the authenticated owner Store. Internal notes are omitted from merchant detail. | Creation and mutations support idempotency and optimistic version checks; case lists use signed cursors. Subresource lists lack pagination. Case events are recorded transactionally; inspect freeze for requirements not yet met. New handlers use the common error helper, while authentication can return legacy envelopes. |
| `/api/notifications/events`, `/inbox`, `/preferences`, deliveries and attempts | Event ingestion requires service authentication; inbox/preferences are bound to the authenticated subject. Buyer access and service-to-recipient trust remain open. | Source event IDs dedupe visible notifications and delivery retries use a provider idempotency key. Inbox uses signed cursors; attempts are unpaginated. Preference/read/retry audit is missing. Authentication retains legacy error envelopes. |
| `/api/payment/history` and existing entitlement read | Payment history filters by authenticated user; entitlement read remains the existing Core authority. | Payment history is read-only and limited, without pagination; conversion returns null for unsupported or inexact amounts. It is not a new financial ledger. Existing error-envelope and entitlement-policy limitations remain. |

The Core OpenAPI gate maps active Express routes, but mapping does not prove
the response schemas or failure contracts are complete. Merchant billing,
support, preferences and inbox contain English and Khmer copy and some loading,
empty, failure, retry and conflict handling. They have not received exhaustive
browser, mobile, keyboard, locale and timeout-state coverage. In particular,
only support has focused merchant component tests. Do not infer completion
from the presence of those strings or from a production build.

## Decisions and assumptions

DEC-006, DEC-008 through DEC-011 and DEC-014 through DEC-020 remain
**proposed** in the Release 1 register. Their owners must approve policy
before operational enforcement. Subscription policy configuration does not
itself approve or implement the policy. Commerce remains authoritative for
orders, returns, payments and buyer reports; Core retains references only.
Legacy package payments are not COD GMV.

## Migrations and rollback

Core additive migrations `20261028_016_platform_admin_controls.js`,
`20261028_017_support_cases.js` and
`20261029_018_durable_notifications.js` introduce the Phase 5 tables and
audit columns. No existing migration is edited. Disable new traffic and
workers before rollback; preserve and reconcile support, audit and delivery
records before any destructive down migration. Rollback of a release with
live data requires an explicit operational plan and is not performed here.

## Verification

- `rentify-server: npm run verify`: passed; includes Core OpenAPI route
  coverage and migration checks.
- `rentify-frontend: npm run verify`: passed with non-production public
  example URLs; deployed storefront smoke was not enabled.
- `rentify-frontend: npm run test:merchant`: passed, 19 tests.
- Root `npm run verify:repository`: **failed** at `verify:clients`:
  Core generated clients are stale in merchant shared code, admin and
  marketplace. The latter two applications are outside the authorized lane;
  their owners must regenerate and review the clients together.
- `git diff --check`: passed.
- The branch diff against `origin/develop` contains no changes under
  `ecommerce-server/`, `admin-frontend/`, `marketplace-frontend/`,
  generated authorization matrices, or production cutover scripts.

## Gemini integration contracts

Use `docs/audits/phase-5-contract-freeze.md` and
`docs/openapi/core.openapi.yaml` as the current design and route references,
subject to the gaps above. Commerce emits the frozen versioned event names
with stable source identifiers, correlation ID and Store ID; Core resolves
recipients and deduplicates by source event. Support references Commerce IDs
without copying mutable Commerce facts. Coordinate generated client updates
with the admin and marketplace owners. Do not treat proposed financial,
support or moderation policy as approved.
