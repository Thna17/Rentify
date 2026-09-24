# Legacy KhmerCraft API (Archived Reference)

This directory contains the inactive reference implementation of KhmerCraft's Express/Mongoose API and legacy architecture documentation.

> **Important:** This is reference code only. Do not run this service as part of the Rentify platform, and do not add MongoDB to Rentify. Active marketplace APIs are hosted within `rentify-server` (Core) and `ecommerce-server` (Commerce). The active marketplace frontend is located at `marketplace-frontend/`.

## Contents

- `src/` — Express 5 routes, controllers, services, and validation
- `models/` — Mongoose schemas (User, Store, Product, Cart, Order, Review, etc.)
- `lib/` — database connection and shared utilities
- `tests/` — reference test suite
- `docs/` — archived KhmerCraft architecture designs and feature specifications
  - `docs/architecture/` — authentication and security designs
  - `docs/features/` — feature specifications and CSV map
  - `docs/category-image-prompts.md` — category prompt reference
  - `docs/phase-1-integrity.md` — initial data integrity documentation

## Historical Context & Conventions

See [AGENTS.md](AGENTS.md) for the legacy API conventions, error handling shapes, and service architecture.
