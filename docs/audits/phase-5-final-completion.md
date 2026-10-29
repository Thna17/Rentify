# Phase 5 final integration completion audit

**Date:** 2026-10-29  
**Branch:** `feature/p5-integration-gate`  
**Base:** `a45bda93669b78b3526f2ad32a8d28c45da5223e`  
**Result:** **NOT COMPLETE**

This is the final integration audit for Phase 5. It includes both merged lane
PRs: Core platform PR #26 (`36a5865`) and Commerce operations PR #25
(`a45bda9`). The integration gate, analytics package, shared authorization
artifacts, and browser checks pass. Phase 5 must nevertheless remain **NOT
COMPLETE** because the authoritative subscription lifecycle and several
production-readiness requirements are still missing. A passing repository
gate is not a substitute for those product requirements.

## Integration result by work package

| Work package | Status | Code and contract evidence | Test evidence and remaining gap |
| --- | --- | --- | --- |
| P5-TRUST-001 | Complete | `ecommerce-server/modules/catalog/restrictedProductTaxonomy.js`, `productModerationService.js`, moderation routes and history, publication/cart/checkout gates | `ecommerce-server/test/security/restrictedProductModeration.test.js` proves publication and purchase denial, safe merchant reasons, appeal, tenant isolation, idempotency, audit, and events. |
| P5-SUP-001 | Partial | Core owns `SupportCase`; Commerce owns buyer reports and immutable Commerce facts. `rentify-server/src/modules/support/supportSlaJob.js` adds policy-gated, idempotent overdue escalation. | `buyerReportSupportCaseLinkage.test.js`, `supportCases.test.js`, and `supportSlaJob.test.js` pass. Safe binary upload/scanning/retrieval is not implemented, subresource pagination is incomplete, and automatic SLA operation remains disabled until policy is accepted. |
| P5-SUP-002 | Partial | Admin support queues, filters, case detail, evidence references, deadlines, actions, and bilingual copy exist under `admin-frontend/src/app/pages/support/`. | Component and authorization tests pass. The local browser run covers marketplace and merchant journeys, not a full authenticated support-agent resolution journey. |
| P5-ADM-001 | Partial | Core scoped grants, canonical platform permissions, MFA/recent-auth, approvals, break-glass records, and regenerated 357-operation authorization matrix; Commerce uses explicit aliases for canonical Core permissions. | `platformAdministration.test.js`, `platformOperationsAuth.test.js`, and admin auth tests pass, including maker-not-checker and cross-role denial. Approval consumption and target mutation are not one atomic transaction; break-glass notification/review is absent. |
| P5-NOT-001 | Partial | Core notification inbox, preferences, delivery attempts, retry state, dedupe keys, and Commerce transactional outbox events. | `durableNotifications.test.js` proves recipient isolation, dedupe, visible failure, and safe retry. Production external provider adapters, a buyer Core inbox path, and all event producers are not complete. |
| P5-SUB-001 | **Not complete** | Existing versioned entitlements and provider-neutral payment foundations remain available. The analytics API explicitly returns `lifecycleAuthorityComplete: false`. | Grace, suspension, and historical-read tests pass, but there is no unified audited lifecycle, renewal/charge dedupe, scheduled notices, complete upgrade/downgrade/cancel flow, or safe provider rollback. Pricing/lifecycle decisions DEC-014 through DEC-020 remain proposed. |
| P5-ANA-001 | Complete | `docs/analytics/event-catalog.json`, schema, stable formulas, Core/Commerce metrics services, privacy-safe telemetry, OpenAPI endpoints, and bilingual admin dashboard. | Catalog validator/tests, Core/Commerce analytics tests, and admin dashboard tests pass. COD GMV, COD collected, refunds, cancellations, subscription revenue, provider fees, and defined net platform revenue are separate fields. |

## Required integration proofs

| # | Required proof | Result | Evidence |
| --- | --- | --- | --- |
| 1 | A prohibited product cannot become purchasable. | Pass | Restricted-product tests block publication, stale cart, direct checkout, and all channels. |
| 2 | A merchant receives a reason and can appeal. | Pass | Restricted-product tests 4–6 cover required moderator reason, safe guidance, and appeal lifecycle. |
| 3 | A buyer creates one idempotent complaint with evidence. | Pass | Buyer-report tests 3–4 cover HTTPS-only bounded evidence and duplicate prevention. |
| 4 | The linked Core support case is created exactly once. | Pass | Buyer-report test 5 and Core support idempotency tests use deterministic linkage/idempotency keys. |
| 5 | An overdue case escalates once. | Pass when policy-enabled | `supportSlaJob.test.js` proves the disabled safe default and one escalation/event after an accepted deadline is overdue. |
| 6 | Unauthorized roles cannot execute other teams' operations. | Pass | Core scoped-grant, Commerce operation-auth, and generated authorization-matrix tests deny missing and cross-scope permissions. |
| 7 | A high-risk action cannot be approved by its initiator. | Pass | `platformAdministration.test.js` rejects self-approval and validates expiry, exact change binding, and single use. |
| 8 | Notification failures are visible and retryable without duplicate delivery. | Pass | `durableNotifications.test.js` preserves a failed delivery, reuses its provider dedupe key, and does not repeat a successful delivery. |
| 9 | Subscription grace, suspension, downgrade and historical reads work. | **Not complete** | Grace, suspension, and 90-day historical reads pass in Core/Commerce entitlement tests. An authoritative audited downgrade lifecycle does not exist, so this criterion is not proven. |
| 10 | Dashboards distinguish COD GMV from Rentify subscription revenue. | Pass | Core and Commerce analytics tests plus the admin dashboard test prove separate money cards and classifications. COD GMV is merchant commerce and is never Rentify revenue. |

## P5-ANA-001 definitions and privacy

The versioned catalog contains 18 bounded events across activation, discovery,
search, cart, checkout, fulfillment, COD, refund, support, moderation,
notification reliability, and subscription lifecycle/revenue. Browser telemetry
rejects contact data, addresses, free-form search text, credentials, subject
identifiers, and arbitrary properties. Search records only locale, result
presence, query length, filter count, result count, and duration. All financial
values use integer minor units and stable ISO currency dimensions.

Financial reporting follows these independent definitions:

- COD GMV: non-cancelled Orders that have an authoritative COD Payment.
- COD collected: cash explicitly recorded as collected for COD Payments.
- Refunds and cancellations: independent Commerce measures, never netted into
  subscription revenue.
- Subscription revenue: completed Core plan payments only.
- Provider fees: undefined until authenticated fee facts exist.
- Net recognized platform revenue: undefined until accepted recognition rules
  and provider-fee facts both exist.

An unavailable accounting input is returned as `defined: false` and `null`, not
as a fabricated zero.

## Verification evidence

| Command or suite | Result |
| --- | --- |
| `npm run verify:repository` | Pass: secret scan, 18 Core migrations, 28 Commerce migrations, 150 Core and 207 Commerce OpenAPI operations, generated clients, tokens, hosts, 357-operation authorization matrix, 18-event analytics catalog, reconciliation, and repository policy. |
| `npm run verify` | Pass after the marketplace accessibility scan received an explicit 10-second test timeout; all Core, Commerce, frontend, marketplace, and admin checks passed. Marketplace: 160/160. Admin: 77/77. |
| `npm run verify:e2e` | Pass against isolated local databases. Buyer, merchant, contract, safety, and artifact journeys passed. |
| English/Khmer responsive browser matrix | Pass for marketplace desktop 1440x900 and mobile 390x844 in both `en` and `km`; language application, visible navigation, and no horizontal page overflow were asserted and screenshots captured. |
| `git diff --check` | Pass. |

The browser evidence does not claim full admin support/moderation workflow
coverage. The merchant frontend verification also contains one pre-existing,
explicitly skipped deployed-storefront smoke test; it is not counted as Phase 5
browser proof.

## Blocking work before Phase 5 can be marked complete

1. Implement P5-SUB-001 through one audited lifecycle service, including
   activation, renewal and callback/charge dedupe, grace, cancellation,
   suspension, downgrade, scheduled notices, historical-read enforcement, and
   provider rollout/rollback. Accept or explicitly defer DEC-014 through
   DEC-020 first.
2. Make approval consumption and high-risk mutation atomic, and finish
   break-glass notification and review.
3. Finish production notification adapters/producers and authenticated buyer
   notification access.
4. Finish safe support attachment storage/scanning/retrieval and execute a real
   authenticated support-agent browser journey through resolution.

Until those blockers are closed and their required tests pass without skips,
the Phase 5 exit gate remains **NOT COMPLETE**.
