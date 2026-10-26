# Platform documentation

This directory is the shared source of truth for Rentify's platform direction.
It separates decisions and planned architecture from the behavior of today's
code so implementation work can proceed without relying on chat history.

- [Platform architecture](platform-architecture.md) — product model, service
  boundaries, data ownership, and main user flows.
- [Current Rentify architecture](current-rentify-architecture.md) — verified
  service map and existing flows that migration must preserve.
- [Migration plan](migration-plan.md) — staged work for absorbing KhmerCraft's
  marketplace into Rentify, with release gates and rollback paths.
- [Shared catalog contract](catalog-migration-contract.md) — Rentify Product
  ownership, marketplace eligibility, and data checks.
- [OpenAPI baseline contracts](openapi/README.md) — active Release 1 Core and
  Commerce routes, schemas, security definitions, and breaking-change verification.
- [Generated typed API clients](api-clients.md) — deterministic typed SDK
  generation from OpenAPI contracts, React and Angular adapters, correlation ID
  injection, and error envelope handling.
- [Cross-service observability](observability.md) — correlation IDs, structured
  JSON logging, redaction policy, and cross-service request tracing.
- [Standard API error handling](api-error-handling.md) — unified error envelope,
  stable machine codes, retryable semantics, and legacy retirement criteria.
- [Shared platform test fixtures](fixtures.md) — deterministic scenario builders,
  safety guards against production databases, and multi-tenant test fixtures.
- [Shared design tokens](design-tokens.md) — framework-neutral semantic tokens,
  accessibility contrast baselines, and multi-framework adapters for React and Angular.
- [End-to-end contract & browser testing](e2e-testing.md) — CI-capable browser
  test harness, golden buyer and merchant journeys, and OpenAPI contract validation.
- [Phase 1 verification report](audits/phase-1-verification.md) — complete
  verification evidence, package checklist, test results, security audit, and
  exit gate decision.
- [Phase 2 verification report](audits/phase-2-verification.md) — complete
  verification evidence, package checklist, test results, security audit, and
  exit gate decision.
- [Phase 4 customer journeys implementation map](audits/phase-4-customer-journeys-map.md) —
  Gemini workstream implementation map, ownership boundaries, cross-channel stock
  risks, accessibility, localization audit, and test plan.
- [Identity and authoritative subject model](identity-subject-model.md) —
  authoritative subject definition, token & session models, role coexistence,
  ambiguous-credential precedence, and security boundaries.
- [Host & configuration validation](deployment-host-validation.md) —
  deterministic pre-deployment and startup validator for Release 1 domains,
  hosted storefront parent, HTTPS, CORS, cookie isolation, and feature flags.
- [Authorization policy matrix](authorization-policy-matrix.md) —
  machine-readable matrix classifying all 234 Core and Commerce operations
  across 11 actor archetypes, deny-by-default rules, and gap remediation roadmap.
- [Cart and order ownership audit](audits/cart-order-ownership-audit.md) —
  enforced Store ownership invariants, session-derived buyer identity, direct-ID
  guessing rejection, and safe public tracking projections for carts and orders.
- [POS and invoice ownership audit](audits/pos-invoice-ownership-audit.md) —
  Store-scoped POS access and checkout, explicit staff permissions, direct-ID
  guessing prevention for invoice PDFs, public token barriers, and admin audit events.
- [Media ownership audit](audits/media-ownership-audit.md) —
  Pre-upload authentication gates, Store-isolated namespaces, magic byte validation,
  path traversal defenses, cross-Store reference guessing prevention, and safe media deletions.
- [Staff ownership and permission audit](audits/staff-ownership-audit.md) —
  Store-bound staff membership, non-escalation permission delegation, single-use
  expiring invitations, recipient contact verification, immediate session revocation,
  cross-Store anti-enumeration (404), and multi-Store membership support.
- [Versioned entitlements audit](audits/versioned-entitlements-audit.md) —
  versioned capability keys (`CAPABILITIES_VERSION = 1`), tier resolution,
  race-safe row-locked catalog and staff quotas, 7-day grace period mutation lock,
  90-day post-suspension historical read retention, and explanatory UI degradation.
- [Custom-domain boundary audit](audits/custom-domain-boundary-audit.md) —
  browse-only enforcement on merchant custom domains, checkout and auth containment
  to verified hosted storefront subdomains (`rentifystore.shop`), fail-closed 403
  boundaries, and open redirect prevention.
- [Privileged authentication and session audit](audits/privileged-auth-sessions-audit.md) —
  administrator standards-based TOTP (RFC 6238), encrypted secrets at rest (AES-256-GCM),
  recent-authentication enforcement, session inventory and revocation, safe recovery,
  and privileged audit trail.
- [COD checkout contract](checkout-migration-contract.md) — Phase 4 Commerce
  API, stock and cash state, and remaining client cutover gates.
- [Marketplace development rehearsal](marketplace-cutover-rehearsal.md) —
  Rentify-only local setup, seller approval check, and buyer journey.
- [Phase 5 release runbook](phase-5-release-runbook.md) — inventory, parity
  audits, staged release evidence, and retirement gates.
- [Notes and open questions](notes.md) — verified observations, unresolved
  choices, and items requiring product decisions.
- [Platform admin operations](admin-operations.md) — live admin scope,
  authority boundaries, and workflow gates adapted from the reference PRD.
- [Legacy KhmerCraft reference API](reference/legacy-khmercraft-api/README.md) —
  archived Express/Mongoose API and legacy design notes for reference only.

When a decision changes, update these documents in the same change as the
implementation or record the decision in `notes.md` while work is pending.
Use **Current**, **Target**, and **Open** labels to avoid mistaking plans for
completed features.
