# 08 — Platform Admin (Angular `admin-frontend`)

Builds on what exists: admin MFA (TOTP), step‑up re‑auth, sessions, seller application/review endpoints, operations overview and
`/api/admin/operations/{resource}` (products, reports, reviews), templates, packages, activity logs. Scope per `docs/admin-operations.md`.
Visual: compact density, dark mode toggle, design‑system tokens (fixes hard‑coded `.ops-pill`, D2).

## 0. Roles (blueprint 5.5 — narrow roles)
| Role | Can |
|---|---|
| Platform admin | everything, role assignment, settings, flags |
| Seller reviewer | seller applications, store profile review |
| Catalog moderator | product moderation, categories |
| Support agent | cases, buyer/store lookup (read), messages, escalations |
| Finance operator | subscriptions, plan payments, reports (no buyer PII beyond need) |
High‑risk actions (permanent suspension, identity change, financial correction, sensitive export) = **maker‑checker**: one requests with reason, a second approves. All mutations: reason + audit + step‑up if older than 15 min.

## 1. Shell
Left sidebar groups: Overview · Sellers · Stores · Products · Cases · Orders · Buyers · Reviews · Catalog (categories) · Storefronts (templates) · Billing (plans, subscriptions, payments) · Audit · Security · Settings.
Top bar: global search (store name/id, order number, buyer phone, product), environment badge (DEV/STAGING/PROD), my queues counter, user menu (MFA status, sessions).

## 2. Overview `/admin/dashboard`
**Queues first:** seller applications waiting (oldest age) · cases near/over SLA · escalated cases · flagged products · reviews to moderate · plan payments to verify · stores in grace / suspended today · outbox/sync failures (Core↔Commerce projection retries).
**Health of the marketplace:** new stores, approved this week, activation rate (approved → first completed order), GMV (COD placed, delivered, recorded paid — separate numbers, never "revenue"), subscription revenue, cancellation & failed‑delivery rates, complaint rate per 100 orders.

## 3. Seller review `/admin/sellers` → `/admin/sellers/:storeId`
**Queue table:** store, owner, path (marketplace‑only / website), primary category, submitted at, age (SLA 1 business day), assigned reviewer, flags (duplicate phone/ID, previously rejected).
**Review screen (split):** left = evidence (owner identity docs viewer — watermarked, no download by default; contact verification status; location; contact method; sample products with photos/prices/stock; store page preview; policies; Telegram/phone); right = **7‑point checklist** (DEC‑007) each Pass / Needs change (note) / Fail, plus restricted‑category check (DEC‑006).
Decisions: **Approve** · **Needs changes** (per‑item notes go to merchant 05 §4) · **Reject** (reason template + free text; maker‑checker if permanent ban). Emits `STORE_APPROVED` etc. and projection to Commerce.
Edge: A‑001…A‑010.

## 4. Stores `/admin/stores/:storeId`
Tabs: Profile (editable with reason) · Status (seller approval, marketplace suspended, platform suspended — separate switches with explicit effect text) · Subscription (plan, trial/grace dates, entitlement usage, manual extend trial with reason) · Website (status, subdomain, custom domain, template) · Products · Orders (read) · Cases & strikes (strike count, history) · Staff (read) · Audit.
Suspension dialog: scope (marketplace only / whole platform), reason, notify merchant text preview, duration or indefinite, maker‑checker for platform‑wide.

## 5. Cases `/admin/complaints` (two‑tier, DEC‑011)
Case = buyer report / dispute / escalation / merchant support request. Columns: id, type, store, order, buyer, opened, **SLA clock**, status, priority, owner.
Case detail: timeline (buyer + merchant messages, evidence, state changes), linked order snapshot & events, store history (prior cases, strikes), actions: assign, message buyer/merchant (templates EN/KM), request info, **record decision** (in favor of buyer / merchant / partial), **issue strike**, suspend store (→ §4 flow), close. Rentify cannot refund COD (DEC‑010) — decision text guides the merchant; refund confirmation still recorded by merchant + buyer confirmation.
Auto‑escalation when merchant misses 48 business hours (GJ4 §4.5).

## 6. Products moderation `/admin/products`
Queue: flagged (reports, keyword/restricted category hits), new from new sellers (optional sampling). Product view as buyer + raw fields + store. Actions: **Hide from marketplace** (reason code → merchant sees 06 §3.3), restore, request edit, escalate to store suspension. Restricted/prohibited list editor (DEC‑006) with category rules.

## 7. Orders lookup `/admin/orders` [new, read‑only]
Search by number/phone/store; shows order snapshot, events, payment records, refunds, linked cases. No mutation in R1 except via case actions (keeps one writer per record type).

## 8. Buyers `/admin/buyers`
Lookup, orders count, cases, flags (abuse: many cancellations/refused COD), block buyer (reason, maker‑checker), anonymize on request (DEC‑025).

## 9. Reviews `/admin/reviews` [R1.x]
Queue (reported, low rating with link/profanity), approve/hide with reason, view merchant reply.

## 10. Catalog `/admin/categories`
Marketplace taxonomy tree (EN/KM names, icon, slug, order, attribute facets per category e.g. Size/Color), merge/move with impact preview (products affected), deactivate (not delete when used).

## 11. Storefront templates `/admin/templates`
Template list (id, category fit, status), screenshots, allowed section types (mirror of Core allowlist), release notes; publish template version (all stores get it — hosting decision 2026‑09‑25) with staged rollout flag [R1.x].

## 12. Billing `/admin/subscriptions`
Packages (Free Pilot / Starter / Business: limits from entitlements), subscriptions list with state filters (trial, active, past_due, suspended), plan payments to verify (manual proof per DEC‑019) with approve/reject, renewal notices log (T‑7/T‑3/T‑0), at‑risk list. Merge current `payments`, `plan-payments`, `transactions` routes here. Hide `payouts` (no payouts in R1).

## 13. Audit & security
Activity logs (actor, action, target, before/after safe fields, correlation id, source case) with filters + export (maker‑checker). Security: MFA enroll/recovery codes, sessions inventory & revoke, step‑up prompts.

## 14. Settings & flags
Platform settings read view; feature flags list (onlinePayments=false, reviews, follow, builder) with environment and owner; changes via deployment config, not UI, in R1.
