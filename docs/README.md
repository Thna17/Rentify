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
- [Catalog migration contract](catalog-migration-contract.md) — Phase 3 data
  mapping, read/write boundaries, and checks before a marketplace cohort moves.
- [COD checkout contract](checkout-migration-contract.md) — Phase 4 Commerce
  API, stock and cash state, and remaining client cutover gates.
- [Notes and open questions](notes.md) — verified observations, unresolved
  choices, and items requiring product decisions.

When a decision changes, update these documents in the same change as the
implementation or record the decision in `notes.md` while work is pending.
Use **Current**, **Target**, and **Open** labels to avoid mistaking plans for
completed features.
