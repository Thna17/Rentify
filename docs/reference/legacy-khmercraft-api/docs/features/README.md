# KhmerCraft — Feature Database

Single source of truth for platform features, split by system and domain rather than one mixed list.

**File:** `khmer-craft-features.csv` — 81 features, ready to import into Notion.

## Import into Notion

1. Notion → new page → `/table` → **Table view** → **Import** (or top-right `···` → Merge with CSV).
2. Upload `khmer-craft-features.csv`.
3. Set the column types after import — Notion imports everything as Text by default:

| Column | Notion type | Options |
|---|---|---|
| Feature | Title | — |
| System | Select | Authentication · Buyer Website · Seller System · Admin System · Shared System |
| Module | Select | User Account · Product · Cart · Checkout · Order · Store Management · Payment · Review · Dashboard · Home |
| User Role | Select | Guest · Buyer · Seller · Admin |
| Priority | Select | Very High · High · Medium · Low |
| Status | Select | Not Started · In Progress · Completed |
| Description | Text | — |
| Assigned Team | **Multi-select** | Frontend · Backend · UX/UI · Testing |

`Assigned Team` is comma-separated — set it to Multi-select and Notion splits the values automatically.

## Recommended views

| View | Group by | Filter |
|---|---|---|
| By System | System | — |
| Backend Board | Status | Assigned Team contains Backend |
| Frontend Board | Status | Assigned Team contains Frontend |
| Sprint 1 | Module | Priority = Very High |
| By Role | User Role | — |

## Coverage

| System | Features | Scope |
|---|---:|---|
| Authentication | 14 | Separate buyer, seller and admin auth + tokens and RBAC |
| Buyer Website | 24 | Discover → browse → cart → checkout → orders → profile |
| Seller System | 20 | Onboarding, plan payment, product, order, store, sales |
| Admin System | 11 | Users, seller approval, moderation, reports, disputes |
| Shared System | 12 | Navigation, uploads, payments, notifications, API docs, security |

## User flows

**Buyer** — Login → Homepage → Browse → Product Detail → Cart → Checkout → Order → Profile

**Seller** — Become a Seller → Landing Page → Basic Information → Choose Plan → Payment → Dashboard

**Admin** — Admin Login → Dashboard → Platform Management

## Rules for this database

- Authentication is its own system, never merged into Buyer or Seller.
- Buyer and Seller are separate domains: Buyer = shopping, Seller = business management.
- Admin controls the whole platform; Shared System holds anything used by two or more systems.
- One row = one deliverable feature. Split it if two teams would ship it separately.
