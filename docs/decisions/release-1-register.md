# Release 1 Decision Register

**Document ID:** P0-001
**Status:** Proposed for approval in this PR
**Effective Target:** Rentify Production Release 1
**Companion Documents:** [`docs/platform-architecture.md`](../platform-architecture.md), [`docs/current-rentify-architecture.md`](../current-rentify-architecture.md), [`docs/master-engineering-blueprint.md`](../master-engineering-blueprint.md), [`docs/ai-implementation-plan.md`](../ai-implementation-plan.md)

---

## Executive Summary

This register records the 27 core business, operational, and architectural decisions required for Rentify Production Release 1. Every decision defines:
1. Verified current codebase behavior.
2. The chosen Release 1 decision.
3. Status: **Proposed for approval in this PR**.
4. Named human approver role.
5. Approval and effective dates.
6. Technical and business rationale.
7. Affected systems, schemas, and contracts.
8. Safe fallback behavior if deferred or unresolved.
9. Review timeline.
10. Concrete evidence links.
11. Downstream implementation work package.

Formal human approval is conferred when the pull request introducing this register is reviewed and merged into `develop`.

---

## Summary of Release 1 Decisions

| ID | Topic | Release 1 Decision | Approver Role | Safe Deferred Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **DEC-001** | Production Marketplace Domain | Canonical `rentifymarket.com` over HTTPS | Lead Infrastructure Architect | Run on `localhost:4200` / test domains |
| **DEC-002** | Hosted Storefront Parent Domain | Canonical `rentifystore.shop` (`<subdomain>.rentifystore.shop`) | Lead Infrastructure Architect | Local wildcard `*.localhost:4900` |
| **DEC-003** | Custom-Domain Browse vs Checkout Scope | Browse-only; checkout redirects to hosted subdomain | Product Security Lead | Custom domains disabled completely |
| **DEC-004** | Marketplace & Storefront Delivery Fee Model | Merchant-configured flat rate per Store order ($1.50 local default) | Product Management Lead | $0 free shipping fallback |
| **DEC-005** | Tax Display & Calculation Scope | Tax calculation disabled (`0.00%`); gross prices shown | Legal & Finance Lead | Tax calculation disabled |
| **DEC-006** | Restricted Products & Moderation Rules | Strict prohibited list; admin moderation with status hidden | Head of Trust & Safety | Manual merchant onboarding only |
| **DEC-007** | Seller Onboarding & Product Moderation | Mandatory admin verification checklist before public listing | Head of Trust & Safety | All seller listings remain pending |
| **DEC-008** | Return Eligibility Window & Criteria | 7 calendar days from delivered; damaged/defective/wrong item | Customer Operations Lead | Returns handled offline by seller |
| **DEC-009** | Return Response Deadlines & Evidence | 48 business hours response; buyer photo/video required | Customer Operations Lead | Escalates to admin immediately |
| **DEC-010** | Refund Confirmation & Financial Responsibility | Seller holds 100% financial liability; direct cash/Bakong refund | Head of Finance & Commerce | Platform disclaims refund handling |
| **DEC-011** | Buyer Complaints & Support Escalation | Two-tier resolution: merchant first, admin escalation after 48h | Head of Customer Support | Support email ticketing only |
| **DEC-012** | Multi-Merchant Cart Behavior | Grouped by Store; separate checkout & orders per Store | Principal UX Designer | Single-merchant cart restriction |
| **DEC-013** | One-Store Order Boundary & Invoices | Strict one-store-per-order invariant; individual Store invoices | Core Commerce Architect | Block cross-store cart additions |
| **DEC-014** | Subscription Plans & Limits | Free Pilot ($0), Starter ($15/mo), Business ($35/mo) | Commercial Lead | Free pilot for all early merchants |
| **DEC-015** | Marketplace-Only Merchant Pilot Plan | Explicit 6-month free pilot ($0/mo, 25 products, 0 websites) | Commercial Lead | Marketplace-only requires manual approval |
| **DEC-016** | Trial Behavior & Duration | 14-day free trial on storefront plans; no credit card required | Growth & Commercial Lead | Instant conversion to free pilot |
| **DEC-017** | Subscription Renewal & Notice Periods | Monthly renewal; notices at T-7 days, T-3 days, T-0 days | Operations & Finance Lead | Manual merchant invoice reminders |
| **DEC-018** | Grace Period Duration & Service Level | 7-day grace period; storefront online, edits locked | Operations & Finance Lead | Immediate read-only dashboard lock |
| **DEC-019** | Failed-Payment Retry Schedule & Notice | Manual payment notice schedule: Day 1, Day 3, Day 6, Day 8 | Finance Operations Lead | Account suspended on Day 14 |
| **DEC-020** | Cancellation, Downgrade & Suspension | Suspension after grace; 90-day read-only dashboard access | Product & Legal Lead | Data preserved indefinitely read-only |
| **DEC-021** | Supported Browsers, OS & Viewports | Mobile Safari 15+, Android Chrome 100+; primary 360px | Frontend Lead | Graceful degradation / desktop-first |
| **DEC-022** | Khmer & English Language Requirements | 100% bilingual; standard Cambodian commerce terms | Localization & UX Lead | English-only fallback |
| **DEC-023** | Accessibility Target Standard | WCAG 2.2 AA target on 5 golden journeys | QA & Accessibility Lead | Basic keyboard accessibility |
| **DEC-024** | Privacy Policy & Data Retention | Orders: 7 years (statutory); sessions: 30 days; logs: 90 days | Legal & Data Protection Officer | Retain until manual deletion |
| **DEC-025** | Account Deletion & Anonymization | Soft-delete with PII scrubbing; preserve financial aggregates | Legal & Data Protection Officer | Manual support database purge |
| **DEC-026** | Release 1 Accepted Payment Methods | Strictly Cash on Delivery (COD) only for online checkout | Executive Platform Sponsor | COD only |
| **DEC-027** | CutLuy QR Rollout Scope (Post-Launch) | Strictly deferred to Phase P9; seller-owned accounts only | Executive Platform Sponsor | CutLuy completely disabled in code |

---

## Detailed Decision Records

### DEC-001: Production Marketplace Domain
- **Topic:** Canonical production domain for the shared Rentify marketplace.
- **Current Verified Repository Behavior:** Marketplace is developed on `localhost:4200` (`marketplace-frontend/`) and local docker Compose mounts `marketplace.localhost`. Core and Commerce CORS configs accept configured origins from `CORS_ORIGINS`.
- **Release 1 Decision:** The canonical production marketplace domain is `https://rentifymarket.com` (with `https://www.rentifymarket.com` permanently redirecting to apex). All cookies set for marketplace buyers use `Secure; HttpOnly; SameSite=Lax`.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Lead Infrastructure Architect & Product Lead.
- **Approval / Effective Date:** Effective upon PR merge; active for Release 1 staging and production deployments.
- **Rationale:** Separating the shared marketplace brand (`rentifymarket.com`) from hosted merchant stores (`rentifystore.shop`) prevents cookie collision, isolates CORS scopes, and clearly brands the marketplace destination for Cambodian consumers.
- **Affected Systems / Schemas / Contracts:** Core `rentify-server/src/config/corsConfig.js`, Commerce `ecommerce-server/config/corsConfig.js`, `marketplace-frontend/src/environments/`.
- **Safe Behavior When Deferred:** Continue using `localhost:4200` in development and designated test domains (`staging.rentifymarket.com`) in CI/staging.
- **Review Date:** 2026-12-01.
- **Evidence Links:** [`docs/platform-architecture.md#service-ownership`](../platform-architecture.md#service-ownership), [`rentify-server/src/config/corsConfig.js`](../../rentify-server/src/config/corsConfig.js).
- **Follow-up Work Package ID:** `P1-OBS-001`, `P2-HOST-001`.

---

### DEC-002: Hosted Storefront Parent Domain
- **Topic:** Canonical domain and subdomain schema for hosted merchant storefronts.
- **Current Verified Repository Behavior:** `rentify-server/src/modules/deployments/hostedSubdomainService.js` and `rentify-frontend/libs/storefront/src/website.tsx` resolve subdomains against `HOSTED_STOREFRONT_DOMAIN`, defaulting to `rentifystore.shop`.
- **Release 1 Decision:** Standardize on `rentifystore.shop`. Each published merchant storefront is assigned `<subdomain>.rentifystore.shop`. Subdomains are sanitized: lowercase alphanumeric and hyphens, 3–32 characters, reserving system names (`admin`, `api`, `auth`, `billing`, `checkout`, `mail`, `marketplace`, `support`).
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Lead Infrastructure Architect.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** A dedicated parent domain for storefronts prevents cross-store cookie leakage, isolates Cloudflare Worker cache rules, and enables wild-card SSL certificates (`*.rentifystore.shop`).
- **Affected Systems / Schemas / Contracts:** `rentify-server/src/modules/deployments/hostedSubdomainService.js`, `rentify-frontend/apps/storefront/src/StorefrontShell.jsx`.
- **Safe Behavior When Deferred:** Development falls back to `*.localhost:4900` via local DNS.
- **Review Date:** 2026-12-01.
- **Evidence Links:** [`rentify-server/src/modules/deployments/hostedSubdomainService.js`](../../rentify-server/src/modules/deployments/hostedSubdomainService.js).
- **Follow-up Work Package ID:** `P2-HOST-001`.

---

### DEC-003: Custom-Domain Browse vs Checkout Scope
- **Topic:** Scope of merchant custom domains (`store.merchantbrand.com`) in Release 1.
- **Current Verified Repository Behavior:** Core `Website` model supports `domain`. Custom domains are strictly browse-only per P2-HOST-003. Unified buyer authentication across third-party origins is drafted in ADR 0002 but remains unimplemented until separately approved.
- **Release 1 Decision:** In Release 1, custom domains are **Browse-Only**. Direct authentication, cart mutations, checkout, order history, and account management on custom domains are disabled. Public catalog browsing (products, categories, store details) is allowed. All checkout actions and buyer account sessions occur exclusively on verified hosted storefront subdomains under `rentifystore.shop` (`<subdomain>.rentifystore.shop`). Custom domain requests attempting sensitive or state-mutating actions fail closed with safe denial codes (`CUSTOM_DOMAIN_BROWSE_ONLY`, `CUSTOM_DOMAIN_AUTH_DISABLED`, `CUSTOM_DOMAIN_CHECKOUT_DISABLED`, `CUSTOM_DOMAIN_CART_DISABLED`) and canonical hosted storefront links. Open redirect vectors, central cookie leakage, and cross-domain token handoffs are strictly prevented.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Product Security Lead.
- **Approval / Effective Date:** Effective upon PR merge; enforced in P2-HOST-003.
- **Rationale:** Enforcing checkout on the verified `rentifystore.shop` domain eliminates phishing risks, avoids third-party cookie blocking on modern iOS Safari/Android browsers, prevents session hijacking, and protects buyer credentials from arbitrary third-party merchant DNS origins.
- **Affected Systems / Schemas / Contracts:** `docs/adr/0002-unified-buyer-identity.md`, `rentify-frontend/apps/storefront/`, `rentify-frontend/apps/templates/ecommerce/`, `rentify-frontend/apps/core/merchant/`, Core `rentify-server/src/utils/hostBoundary.js`, Core `rentify-server/src/modules/auth/returnUrlPolicy.js`, Commerce `ecommerce-server/middlewares/customDomainBoundary.js`, `tools/host-validator/policies.js`.
- **Safe Behavior When Deferred:** Custom domain linking is disabled in the merchant dashboard; merchants only publish via `*.rentifystore.shop`.
- **Review Date:** 2026-11-15.
- **Evidence Links:** [`docs/adr/0002-unified-buyer-identity.md`](../adr/0002-unified-buyer-identity.md), [`docs/platform-architecture.md#buyer-identity-target`](../platform-architecture.md#buyer-identity-target), [`docs/audits/custom-domain-boundary-audit.md`](../audits/custom-domain-boundary-audit.md).
- **Follow-up Work Package ID:** `P2-HOST-003` (implemented), `P3-CHK-001` (future phase).

---

### DEC-004: Marketplace and Storefront Delivery Fee Model
- **Topic:** Delivery fee ownership, pricing structure, and settlement for buyer orders.
- **Current Verified Repository Behavior:** Commerce checkout supports order-level shipping fee calculations (defaults in test fixtures to $0 or $1.50).
- **Release 1 Decision:** Delivery fees belong 100% to the merchant. For Release 1, each merchant configures a flat delivery fee per order in their Store profile (defaulting to $1.50 for standard local delivery in Phnom Penh, with an optional free delivery threshold e.g. orders over $50). In multi-merchant cart checkouts, each Store order assesses its own independent delivery fee. The delivery fee is collected in cash by the courier directly for the seller upon delivery.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Product Management Lead.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Small merchants in Cambodia use diverse on-demand local couriers (Grab Express, Foodpanda, local moto couriers, or provincial buses). Rentify holds no logistics contracts in Release 1, so merchants must set and receive their exact delivery recovery fees.
- **Affected Systems / Schemas / Contracts:** `ecommerce-server/modules/checkout/marketplaceCheckoutRoutes.js`, `ecommerce-server/models/Order.js`, `rentify-server/src/models/Store.js`.
- **Safe Behavior When Deferred:** Default flat rate of $1.50 applied across all orders, or $0 promotional shipping.
- **Review Date:** 2026-12-01.
- **Evidence Links:** [`ecommerce-server/modules/checkout/marketplaceCheckoutRoutes.js`](../../ecommerce-server/modules/checkout/marketplaceCheckoutRoutes.js).
- **Follow-up Work Package ID:** `P3-CHK-001`.

---

### DEC-005: Tax Display and Calculation Scope
- **Topic:** Value-Added Tax (VAT) and commercial tax calculation and display.
- **Current Verified Repository Behavior:** No tax calculation exists in Core or Commerce database models; total amounts equal subtotal + shipping - discount.
- **Release 1 Decision:** Tax calculation is explicitly **disabled** for Release 1 (`tax_rate = 0.00`). All listed product prices are treated as gross prices (inclusive of any merchant tax obligations under Cambodian small-taxpayer regimes). Platform invoices issued by merchants to buyers display "Prices inclusive of applicable taxes". Rentify acts strictly as software provider and does not withhold or calculate VAT.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Legal & Finance Lead.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Small Cambodian sole proprietorships and informal social commerce sellers do not require complex tax engine integrations. Attempting automatic tax withholding without formal General Department of Taxation (GDT) e-commerce registration would introduce severe legal compliance risks.
- **Affected Systems / Schemas / Contracts:** `ecommerce-server/models/Invoice.js`, `ecommerce-server/models/Order.js`.
- **Safe Behavior When Deferred:** Tax rate remains strictly 0.00; tax fields omitted from UI.
- **Review Date:** 2027-01-15.
- **Evidence Links:** [`docs/checkout-migration-contract.md`](../checkout-migration-contract.md).
- **Follow-up Work Package ID:** `P3-CHK-002`.

---

### DEC-006: Restricted Products and Moderation Rules
- **Topic:** Prohibited goods, restricted categories, and product moderation policy.
- **Current Verified Repository Behavior:** Commerce `Product` has `marketplaceStatus` (`active`, `hidden`, `rejected`), but automated content filters are absent.
- **Release 1 Decision:** Rentify enforces a strict prohibited products list: weapons, firearms, explosives, ammunition, illegal narcotics and drug paraphernalia, counterfeit goods, protected wildlife and flora, human remains, adult sexual services/pornography, toxic chemicals, and unlicensed prescription medications. Admin moderation tooling allows platform operators to flag, reject, and permanently delist violating items. A rejected product cannot be published to either the marketplace or storefronts.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Head of Trust & Safety.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Protecting buyers and complying with Kingdom of Cambodia laws governing digital commerce and prohibited trade.
- **Affected Systems / Schemas / Contracts:** `ecommerce-server/models/Product.js`, `ecommerce-server/modules/admin/platformOperationsRoutes.js`, `admin-frontend/src/app/pages/operations.component.ts`.
- **Safe Behavior When Deferred:** Merchant onboarding restricted to manual white-list review.
- **Review Date:** 2026-11-30.
- **Evidence Links:** [`ecommerce-server/modules/admin/platformOperationsRoutes.js`](../../ecommerce-server/modules/admin/platformOperationsRoutes.js).
- **Follow-up Work Package ID:** `P5-MOD-001`.

---

### DEC-007: Seller Onboarding and Product Moderation Workflows
- **Topic:** Requirements for approving merchants to sell on the shared marketplace.
- **Current Verified Repository Behavior:** Core `Store` tracks `sellerApprovalStatus` (`pending`, `approved`, `rejected`, `suspended`). Development mode supports auto-approval via `DEV_MARKETPLACE_AUTO_APPROVAL=true`.
- **Release 1 Decision:** Before any Store's products appear publicly on `rentifymarket.com`, a Rentify admin must complete the 7-point seller verification checklist: (1) Verified phone number via OTP; (2) Verified merchant email; (3) Business owner national ID or patent tax document; (4) Physical store location / pickup address; (5) Public customer contact info; (6) At least one valid product listing with price and stock; (7) Signed agreement to COD delivery, return, and refund standards. In local development, `DEV_MARKETPLACE_AUTO_APPROVAL=true` remains supported for test automation.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Head of Trust & Safety.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Marketplace integrity depends on vetting sellers to prevent ghost merchants, counterfeit listings, and delivery abandonment.
- **Affected Systems / Schemas / Contracts:** `rentify-server/src/models/Store.js`, `rentify-server/src/modules/stores/storeService.js`, `admin-frontend/`.
- **Safe Behavior When Deferred:** All marketplace listings remain in `pending` status; sellers may only sell via private storefront links.
- **Review Date:** 2026-12-01.
- **Evidence Links:** [`rentify-server/src/modules/stores/storeService.js`](../../rentify-server/src/modules/stores/storeService.js), [`docs/platform-architecture.md#marketplace-approval-checklist-for-launch`](../platform-architecture.md#marketplace-approval-checklist-for-launch).
- **Follow-up Work Package ID:** `P2-ID-002`.

---

### DEC-008: Return Eligibility Window and Criteria
- **Topic:** Customer return eligibility duration and acceptable criteria.
- **Current Verified Repository Behavior:** Commerce records `BuyerReport` and order statuses (`delivered`, `return_requested`, `returned`), but does not enforce temporal cutoffs.
- **Release 1 Decision:** Standard return window is **7 calendar days** from the timestamp the order was marked `delivered`. Permitted return reasons: (a) Damaged on arrival; (b) Defective / non-functional; (c) Incorrect item or size received; (d) Material discrepancy from listing description. Change-of-mind returns are permitted only at the individual merchant's published discretion. Perishable foodstuffs and custom/personalized products are non-returnable unless defective.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Customer Operations Lead.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** 7 days aligns with Cambodian market norms for retail commerce while providing adequate protection against delayed dispute claims.
- **Affected Systems / Schemas / Contracts:** `ecommerce-server/models/BuyerReport.js`, `ecommerce-server/models/Order.js`, `marketplace-frontend/`.
- **Safe Behavior When Deferred:** Buyers must resolve all returns directly with merchants offline via phone or Telegram.
- **Review Date:** 2026-12-15.
- **Evidence Links:** [`ecommerce-server/models/BuyerReport.js`](../../ecommerce-server/models/BuyerReport.js).
- **Follow-up Work Package ID:** `P5-SUP-001`.

---

### DEC-009: Return Response Deadlines and Evidence Requirements
- **Topic:** Timeframes for merchant dispute responses and mandatory buyer evidence.
- **Current Verified Repository Behavior:** Buyer reports can be created, but there are no time-based alerts or escalation triggers.
- **Release 1 Decision:** Buyers filing a return or damage claim must submit photographic or video evidence showing: (1) The damaged or defective item; (2) The external packaging; (3) The courier shipping label. The seller is given **48 business hours** to accept the return, offer a replacement, or contest the claim. If the seller fails to respond within 48 business hours, the case automatically escalates to platform support for mediation.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Customer Operations Lead.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Clear evidentiary requirements eliminate frivolous claims, and a 48-hour response limit prevents merchants from ignoring dissatisfied customers.
- **Affected Systems / Schemas / Contracts:** `ecommerce-server/models/BuyerReport.js`, background SLA monitoring cron.
- **Safe Behavior When Deferred:** Cases require manual triage by support staff with no automated escalation.
- **Review Date:** 2026-12-15.
- **Evidence Links:** [`ecommerce-server/models/BuyerReport.js`](../../ecommerce-server/models/BuyerReport.js).
- **Follow-up Work Package ID:** `P5-SUP-001`.

---

### DEC-010: Refund Confirmation and Seller Financial Responsibility
- **Topic:** Financial liability and execution mechanism for buyer refunds on COD orders.
- **Current Verified Repository Behavior:** Commerce `Refund` records manual refunds against orders. Platform holds no funds.
- **Release 1 Decision:** Because all Release 1 orders are Cash on Delivery collected by the merchant or their courier, **the merchant bears 100% financial liability** for issuing refunds. Rentify holds zero customer escrow funds. Upon physical receipt and inspection of the returned merchandise, the merchant issues the refund directly to the buyer via Bakong or cash, and records the refund transaction ID in Rentify. The order status is transitioned to `refunded` only after confirmed payout execution.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Head of Finance & Commerce.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Rentify does not hold a National Bank of Cambodia (NBC) payment intermediary license for escrow or funds custody in Release 1. Merchants collect the cash, so merchants must execute the refund.
- **Affected Systems / Schemas / Contracts:** `ecommerce-server/models/Refund.js`, `ecommerce-server/models/Order.js`.
- **Safe Behavior When Deferred:** Platform disclaims refund handling; dispute UI directs buyer to contact seller directly.
- **Review Date:** 2027-01-15.
- **Evidence Links:** [`docs/platform-architecture.md#purchase-and-fulfillment`](../platform-architecture.md#purchase-and-fulfillment).
- **Follow-up Work Package ID:** `P3-ORD-002`.

---

### DEC-011: Buyer Complaints, Disputes, and Support Escalation
- **Topic:** Two-tier dispute resolution and administrative intervention policy.
- **Current Verified Repository Behavior:** Admin platform operations routes (`ecommerce-server/modules/admin/platformOperationsRoutes.js`) provide status updates and resolution notes on `BuyerReport`.
- **Release 1 Decision:** Two-tier model:
  1. *Tier 1 (Direct Resolution):* Buyer submits claim via marketplace order history; seller has 48 hours to negotiate return, exchange, or refund.
  2. *Tier 2 (Platform Mediation):* If unresolved after 48 hours, buyer or seller escalates to Rentify Support. Rentify support examines evidence and makes a binding determination. Non-compliant sellers receive strikes; three strikes result in marketplace seller suspension.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Head of Customer Support.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Empowers merchants to handle their own customer service while maintaining platform credibility through administrative enforcement.
- **Affected Systems / Schemas / Contracts:** `ecommerce-server/models/BuyerReport.js`, `admin-frontend/src/app/pages/operations.component.ts`.
- **Safe Behavior When Deferred:** Support handles issues via incoming email/Telegram manual inbox.
- **Review Date:** 2026-12-15.
- **Evidence Links:** [`ecommerce-server/modules/admin/platformOperationsRoutes.js`](../../ecommerce-server/modules/admin/platformOperationsRoutes.js).
- **Follow-up Work Package ID:** `P5-SUP-002`.

---

### DEC-012: Multi-Merchant Cart Behavior and Presentation
- **Topic:** Cart management and checkout flow when a buyer selects items from multiple sellers.
- **Current Verified Repository Behavior:** Marketplace cart routes support multi-merchant items, but Commerce order checkout enforces single-store boundaries (`marketplaceCheckoutRoutes.js`).
- **Release 1 Decision:** The marketplace shopping cart presents a unified interface where items are visually grouped by Store. When proceeding to checkout, the buyer reviews individual Store order summaries (subtotal, Store delivery fee, total). The checkout action generates **independent, atomic orders per Store**. If a buyer checks out a cart with 2 merchants, 2 separate orders are placed, with separate order IDs and separate COD deliveries.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Principal UX Designer & Commerce Architect.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** In a decentralized COD model, a courier from Merchant A cannot collect cash for Merchant B. Independent orders ensure clean courier dispatch, distinct fulfillment tracking, and isolated delivery fees.
- **Affected Systems / Schemas / Contracts:** `marketplace-frontend/src/app/core/cart/`, `ecommerce-server/modules/checkout/marketplaceCheckoutRoutes.js`.
- **Safe Behavior When Deferred:** Cart restricts the buyer to adding products from only one Store at a time (clears cart or prompts if adding from another Store).
- **Review Date:** 2026-11-30.
- **Evidence Links:** [`ecommerce-server/modules/checkout/marketplaceCheckoutRoutes.js`](../../ecommerce-server/modules/checkout/marketplaceCheckoutRoutes.js).
- **Follow-up Work Package ID:** `P3-CHK-001`.

---

### DEC-013: One-Store Order Boundary and Invoice Structure
- **Topic:** Structural database invariant for Orders and Invoices.
- **Current Verified Repository Behavior:** Commerce `Order` model enforces `storeId` and `websiteId`. Invoices map 1:1 with Orders.
- **Release 1 Decision:** The invariant is strictly maintained: **Every Order belongs to exactly one Store (`storeId`)**. An Invoice is generated per Order and represents the merchant's commercial bill to the buyer. Rentify platform software subscription invoices are completely separate records issued by Rentify Core to the merchant.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Core Commerce Architect.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Preserves clean multi-tenant isolation, prevents cross-store accounting leakage, and simplifies order state machines.
- **Affected Systems / Schemas / Contracts:** `ecommerce-server/models/Order.js`, `ecommerce-server/models/Invoice.js`.
- **Safe Behavior When Deferred:** Any attempt to check out multi-store items in a single order payload is rejected with `400 BAD_REQUEST`.
- **Review Date:** 2026-11-30.
- **Evidence Links:** [`ecommerce-server/models/Order.js`](../../ecommerce-server/models/Order.js).
- **Follow-up Work Package ID:** `P3-ORD-001`.

---

### DEC-014: Subscription Plans and Limits
- **Topic:** Tier structure, resource quotas, and pricing for merchant subscriptions.
- **Current Verified Repository Behavior:** Core `SubscriptionPlan` model supports quota attributes (`maxProducts`, `maxStaff`, `customDomainAllowed`, `posAllowed`).
- **Release 1 Decision:** Three official plans for Release 1:
  1. *Free Pilot / Marketplace-Only:* $0/month. 25 products, 1 staff user, 0 websites, marketplace listing enabled, manual POS enabled.
  2. *Starter Storefront:* $15/month. 100 products, 2 staff users, 1 hosted website (`*.rentifystore.shop`), marketplace listing enabled, manual POS enabled.
  3. *Business Storefront:* $35/month. 500 products, 5 staff users, 1 hosted website, custom-domain browse support, marketplace listing enabled, full POS enabled, priority support.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Commercial Lead.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Simple, accessible pricing designed to onboard Cambodian micro-businesses while monetizing growing stores that need dedicated branding.
- **Affected Systems / Schemas / Contracts:** `rentify-server/src/models/SubscriptionPlan.js`, `rentify-server/src/modules/billing/`.
- **Safe Behavior When Deferred:** All registered merchants placed on the Free Pilot plan.
- **Review Date:** 2026-12-15.
- **Evidence Links:** [`rentify-server/src/models/SubscriptionPlan.js`](../../rentify-server/src/models/SubscriptionPlan.js).
- **Follow-up Work Package ID:** `P5-SUB-001`.

---

### DEC-015: Marketplace-Only Merchant Pilot Plan and Entitlements
- **Topic:** Dedicated entitlement for merchants who only sell through the shared marketplace without a website.
- **Current Verified Repository Behavior:** Core Store foundation allows a Store without a Website (`websiteId: null`).
- **Release 1 Decision:** Marketplace-only merchants receive an explicit 6-month Free Pilot entitlement. They are never forced to select a template or create a website. They can add up to 25 products, manage stock, receive COD orders, and use POS for counter sales.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Commercial Lead.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Lowers onboarding friction to zero for informal social sellers who do not need a personal storefront but want to reach marketplace buyers.
- **Affected Systems / Schemas / Contracts:** `rentify-server/src/modules/stores/storeService.js`, `rentify-server/src/modules/billing/subscriptionService.js`.
- **Safe Behavior When Deferred:** Marketplace-only registration remains open with manual admin activation.
- **Review Date:** 2027-04-01.
- **Evidence Links:** [`docs/platform-architecture.md#product-model`](../platform-architecture.md#product-model).
- **Follow-up Work Package ID:** `P5-SUB-001`.

---

### DEC-016: Trial Behavior and Duration
- **Topic:** Duration and terms of free trials for storefront plans.
- **Current Verified Repository Behavior:** Core `websiteService.js` creates a 14-day trial `Subscription` when a Website is created.
- **Release 1 Decision:** All Storefront subscriptions receive a **14-day free trial** upon initial website creation. No payment method or credit card is required to begin the trial. Full Starter or Business features are accessible during the trial window.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Growth & Commercial Lead.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Enables merchants to set up their brand, test templates, and upload products without upfront payment friction.
- **Affected Systems / Schemas / Contracts:** `rentify-server/src/modules/websites/websiteService.js`, `rentify-server/src/modules/billing/subscriptionService.js`.
- **Safe Behavior When Deferred:** Trials default to 14 days as currently coded.
- **Review Date:** 2026-12-01.
- **Evidence Links:** [`rentify-server/src/modules/websites/websiteService.js`](../../rentify-server/src/modules/websites/websiteService.js).
- **Follow-up Work Package ID:** `P5-SUB-002`.

---

### DEC-017: Subscription Renewal Behavior and Notice Periods
- **Topic:** Renewal notifications and invoice presentation.
- **Current Verified Repository Behavior:** Core `Subscription` records renewal dates; automated scheduling is manual.
- **Release 1 Decision:** Billing cycles are calendar monthly. The platform issues automated notification reminders:
  - T - 7 days: Upcoming renewal notification with payable invoice link.
  - T - 3 days: Second reminder notice.
  - T - 0 days: Due date notification with direct Bakong payment QR.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Operations & Finance Lead.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Advance notification respects merchants and gives them adequate time to process manual Bakong subscription payments.
- **Affected Systems / Schemas / Contracts:** `rentify-server/src/modules/billing/`, `rentify-server/src/modules/notifications/`.
- **Safe Behavior When Deferred:** Automated notifications disabled; operations team sends manual email/Telegram reminders.
- **Review Date:** 2026-12-15.
- **Evidence Links:** [`rentify-server/src/models/Subscription.js`](../../rentify-server/src/models/Subscription.js).
- **Follow-up Work Package ID:** `P5-SUB-002`.

---

### DEC-018: Grace Period Duration and Service Level
- **Topic:** Grace period policy upon subscription expiration or non-payment.
- **Current Verified Repository Behavior:** Core `Subscription` supports `status: 'past_due'`.
- **Release 1 Decision:** A **7 calendar day** grace period begins immediately following an unpaid renewal date or expired trial. During the grace period:
  - Hosted storefront and marketplace listings remain live and fully purchasable.
  - Merchant dashboard displays a persistent grace period banner with payment link.
  - New product creation, template modifications, and staff additions are locked.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Operations & Finance Lead.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Prevents abrupt disruption of merchant commerce due to brief banking delays or holidays while incentivizing prompt settlement.
- **Affected Systems / Schemas / Contracts:** `rentify-server/src/models/Subscription.js`, `rentify-frontend/apps/core/merchant/`.
- **Safe Behavior When Deferred:** Grace period set to 7 days as standard.
- **Review Date:** 2026-12-15.
- **Evidence Links:** [`rentify-server/src/modules/billing/subscriptionService.js`](../../rentify-server/src/modules/billing/subscriptionService.js).
- **Follow-up Work Package ID:** `P5-SUB-002`.

---

### DEC-019: Failed-Payment Retry Schedule and Communication
- **Topic:** Communication schedule for past-due subscription payments.
- **Current Verified Repository Behavior:** Subscriptions are settled manually via admin in Release 1.
- **Release 1 Decision:** For manual subscription invoices in Release 1, communications are scheduled at:
  - Day 1: Grace period commencement notice.
  - Day 3: Mid-grace reminder.
  - Day 6: Final 24-hour warning before storefront suspension.
  - Day 8: Suspension notice.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Finance Operations Lead.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Predictable schedule ensures fair warning before any public service degradation.
- **Affected Systems / Schemas / Contracts:** `rentify-server/src/modules/notifications/`.
- **Safe Behavior When Deferred:** Manual outreach by support team.
- **Review Date:** 2026-12-15.
- **Evidence Links:** [`rentify-server/src/modules/billing/subscriptionService.js`](../../rentify-server/src/modules/billing/subscriptionService.js).
- **Follow-up Work Package ID:** `P5-SUB-002`.

---

### DEC-020: Cancellation, Downgrade, and Suspension Behavior
- **Topic:** System state when a subscription ends or is suspended.
- **Current Verified Repository Behavior:** `Subscription` model supports `status: 'suspended'` and `'cancelled'`.
- **Release 1 Decision:**
  - *Cancellation:* Takes effect at the end of the prepaid period. Merchant may downgrade to the Free Pilot (Marketplace-only) plan without losing catalog data.
  - *Suspension:* If grace period expires without payment, website status transitions to `suspended` (public requests receive a polite "Store Temporarily Unavailable" notice); marketplace listings are marked `hidden`.
  - *Data Retention:* Merchant retains read-only dashboard access to historical orders, invoices, and accounting reports for **90 days** post-suspension.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Product & Legal Lead.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Protects merchant historical business records while preventing unauthorized free use of hosted infrastructure.
- **Affected Systems / Schemas / Contracts:** `rentify-server/src/modules/deployments/hostedSubdomainService.js`, `rentify-server/src/models/Website.js`.
- **Safe Behavior When Deferred:** Stores retain suspended status with data preserved indefinitely.
- **Review Date:** 2027-01-15.
- **Evidence Links:** [`rentify-server/src/modules/websites/websiteService.js`](../../rentify-server/src/modules/websites/websiteService.js).
- **Follow-up Work Package ID:** `P5-SUB-002`.

---

### DEC-021: Supported Browsers, Operating Systems, and Viewport Breakpoints
- **Topic:** Frontend client compatibility standards.
- **Current Verified Repository Behavior:** React/Vite and Angular applications target modern ECMAScript standards.
- **Release 1 Decision:**
  - *Supported Browsers:* iOS Safari (v15+), Android Chrome (v100+), Desktop Chrome/Edge (v100+), Firefox (v100+), macOS Safari (v15+).
  - *Primary Reference Viewport:* **360px** mobile width (accommodates common budget smartphones across Cambodia).
  - *Standard Breakpoints:* Mobile (360px – 639px), Tablet (640px – 1023px), Desktop (1024px+).
  - All critical journeys must be 100% operational on a 360px screen without horizontal scroll.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Frontend Lead.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Over 85% of Cambodian digital commerce interactions occur on mobile devices.
- **Affected Systems / Schemas / Contracts:** `marketplace-frontend/`, `rentify-frontend/`, shared design tokens.
- **Safe Behavior When Deferred:** Existing responsive CSS maintained; desktop-centric flows flagged.
- **Review Date:** 2026-11-30.
- **Evidence Links:** [`marketplace-frontend/src/styles.scss`](../../marketplace-frontend/src/styles.scss).
- **Follow-up Work Package ID:** `P1-UX-001`.

---

### DEC-022: Khmer and English Language Requirements
- **Topic:** Localization scope and terminology standards.
- **Current Verified Repository Behavior:** Partial i18n support in `rentify-frontend` (marketing/auth) and `marketplace-frontend`.
- **Release 1 Decision:** 100% bilingual capability across all customer-facing surfaces (marketplace, hosted storefronts, auth, merchant dashboard). A persistent language selector toggles between Khmer (`km`) and English (`en`). Khmer translations must use standard Cambodian commerce vocabulary (e.g. "ទូទាត់ពេលទទួលទំនិញ" for COD, "កន្ត្រកទំនិញ" for Shopping Cart, "ស្ថានភាពការបញ្ជាទិញ" for Order Status). No raw translation keys (`ERR_...` or `trans.key`) may ever be visible to users.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Localization & UX Lead.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Essential for broad Cambodian adoption; ensures trust among local buyers and small merchants.
- **Affected Systems / Schemas / Contracts:** `marketplace-frontend/src/assets/i18n/`, `rentify-frontend/apps/core/auth/src/locales/`.
- **Safe Behavior When Deferred:** English language default with incomplete Khmer strings falling back gracefully to English.
- **Review Date:** 2026-12-01.
- **Evidence Links:** [`marketplace-frontend/src/assets/i18n/km.json`](../../marketplace-frontend/src/assets/i18n/km.json).
- **Follow-up Work Package ID:** `P4-UX-001`.

---

### DEC-023: Accessibility Target Standard (WCAG 2.2 AA)
- **Topic:** Platform accessibility compliance target.
- **Current Verified Repository Behavior:** Basic semantic HTML markup; partial ARIA attributes.
- **Release 1 Decision:** Release 1 commits to **WCAG 2.2 Level AA** compliance across the 5 Golden Journeys. Standards include:
  - Minimum 4.5:1 color contrast for normal text (3:1 for large text).
  - Minimum 44x44 CSS pixel interactive touch targets on mobile.
  - Complete keyboard navigability without focus traps.
  - Descriptive `aria-label` and `role` attributes on all icon buttons and modals.
  - Respect for `prefers-reduced-motion`.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** QA & Accessibility Lead.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Ensures legal usability, mobile ease of use under bright outdoor sunlight, and inclusivity for users with disabilities.
- **Affected Systems / Schemas / Contracts:** All frontend templates and component libraries.
- **Safe Behavior When Deferred:** Best-effort semantic markup; contrast audit recorded for follow-up.
- **Review Date:** 2026-12-15.
- **Evidence Links:** [`docs/master-engineering-blueprint.md#product-principles`](../master-engineering-blueprint.md#product-principles).
- **Follow-up Work Package ID:** `P1-UX-001`.

---

### DEC-024: Privacy Policy, Data Retention, and Storage Periods
- **Topic:** Data retention lifecycle for customer personal and financial data.
- **Current Verified Repository Behavior:** Records are retained indefinitely in MySQL.
- **Release 1 Decision:**
  - *Order & Financial Records:* Retained for **7 years** to comply with Cambodian commercial and accounting statutory standards.
  - *Buyer Session Tokens:* Expire after **30 days** of inactivity.
  - *Server Access & Audit Logs:* Retained for **90 days**, then automatically rotated and purged.
  - *Database Backups:* Retained for **30 days** rolling.
  - Sensitive plaintext credentials (passwords, payment API secrets) are never logged or stored unencrypted.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Legal & Data Protection Officer.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Compliance with Kingdom of Cambodia e-Commerce Law and international data protection best practices.
- **Affected Systems / Schemas / Contracts:** Database archiving policies, logging configurations (`winston`).
- **Safe Behavior When Deferred:** Data retained in database without automated pruning.
- **Review Date:** 2027-01-15.
- **Evidence Links:** [`ecommerce-server/config/logger.js`](../../ecommerce-server/config/logger.js).
- **Follow-up Work Package ID:** `P2-SEC-001`.

---

### DEC-025: Account Deletion and Data Anonymization Procedure
- **Topic:** Handling user requests for account deletion and data scrubbing.
- **Current Verified Repository Behavior:** No automated account deletion endpoint; manual database modifications.
- **Release 1 Decision:** Users may request account deletion via settings or customer support. Procedure:
  1. If user has no order or financial history: Account is permanently deleted within 30 days.
  2. If user has completed orders: In compliance with the 7-year accounting statutory requirement, personal identifying information (full name, phone number, delivery address, email, IP addresses) is **scrubbed and replaced with anonymized placeholders** (`deleted_user_<hash>`). Financial figures, order items, and aggregate sales totals are preserved in anonymized form.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Legal & Data Protection Officer.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Balances the individual's right to privacy with legal audit requirements for commercial transactions.
- **Affected Systems / Schemas / Contracts:** `rentify-server/src/models/User.js`, `ecommerce-server/models/Customer.js`, `ecommerce-server/models/Order.js`.
- **Safe Behavior When Deferred:** Deletion requests handled manually by data administrator.
- **Review Date:** 2027-01-15.
- **Evidence Links:** [`rentify-server/src/modules/users/`](../../rentify-server/src/modules/users/).
- **Follow-up Work Package ID:** `P2-SEC-001`.

---

### DEC-026: Release 1 Accepted Payment Methods (COD Only)
- **Topic:** Scope of accepted payment methods for Release 1 buyer checkout.
- **Current Verified Repository Behavior:** Verified in `checkout-migration-contract.md` and `platform-architecture.md`: buyer online checkout is Cash on Delivery (COD) only.
- **Release 1 Decision:** **Cash on Delivery (COD) is the SOLE accepted buyer payment method** for both marketplace and hosted storefront online checkouts in Release 1. No online card or bank gateway is enabled for buyer checkout. Physical POS supports Cash and offline manual KHQR recording. Rentify does not hold buyer cash.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Executive Platform Sponsor & Product Lead.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** COD eliminates payment gateway failure points, requires no escrow licensing, and matches Cambodian consumer purchasing habits (over 70% of retail transactions).
- **Affected Systems / Schemas / Contracts:** `ecommerce-server/modules/checkout/marketplaceCheckoutRoutes.js`, `ecommerce-server/modules/checkout/storefrontCheckoutRoutes.js`.
- **Safe Behavior When Deferred:** COD is the default and only active payment method.
- **Review Date:** 2026-12-01.
- **Evidence Links:** [`docs/checkout-migration-contract.md`](../checkout-migration-contract.md), [`docs/platform-architecture.md#launch-payment-scope`](../platform-architecture.md#launch-payment-scope).
- **Follow-up Work Package ID:** `P3-CHK-001`.

---

### DEC-027: Post-Launch Phase P9 CutLuy QR Rollout Scope and Prerequisites
- **Topic:** Integration scope and prerequisite gates for CutLuy QR payments.
- **Current Verified Repository Behavior:** Recorded in ADR 0003 and P9 documents: CutLuy QR integration is planned for Phase P9.
- **Release 1 Decision:** CutLuy QR payments are **strictly deferred to Phase P9** post-launch. Release 1 shall not activate or expose CutLuy checkout routes. When delivered in Phase P9, CutLuy shall operate under strict two-account separation: Rentify's account handles merchant subscription billing; seller-owned CutLuy accounts handle buyer checkout with 100% direct settlement to sellers. CutLuy will never be used for platform escrow or fund commingling.
- **Status:** Proposed for approval in this PR.
- **Named Human Approver:** Executive Platform Sponsor.
- **Approval / Effective Date:** Effective upon PR merge.
- **Rationale:** Prevents launch scope creep and preserves clean architectural boundaries until COD operations are hardened.
- **Affected Systems / Schemas / Contracts:** `docs/adr/0003-cutluy-qr-payments.md`, future Phase P9 modules.
- **Safe Behavior When Deferred:** CutLuy remains disabled (`CUTLUY_ENABLED=false`); no provider API calls are made.
- **Review Date:** 2027-02-01.
- **Evidence Links:** [`docs/adr/0003-cutluy-qr-payments.md`](../adr/0003-cutluy-qr-payments.md), [`docs/ai-implementation-plan.md#phase-p9`](../ai-implementation-plan.md#phase-p9).
- **Follow-up Work Package ID:** `P9-000`, `P9-ADP-001`.

---

## Conclusion & Approval Gate

All 27 decisions are fully documented with explicit rationale, affected contracts, and safe fallback behaviors. Merging this PR constitutes human executive approval of the Release 1 Decision Register.
